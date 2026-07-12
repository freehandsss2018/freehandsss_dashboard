"""
FHS 3D shou jiao mo dayin zidonghua Pipeline v0 - Phase 1 (jiao, Amen-leftleg)
方案書: .fhs/reports/planning/3d-print-pipeline-v0_2026-07-10.md

本 script 有兩個模式 (共用同一套 P3/P5/P6/P7/P8/P9 函式庫):

  FULL 模式 (原有, 不變): P1 -> P2(+P2b跳過) -> P3 -> P4(併入P1的姿態對齊) -> P7 -> P5 -> P6 -> P8 -> P9
    用法: 在 Blender (MCP addon, port 9876) 已連線狀態下 (PIPELINE_ENTRY_MODE 預設 "FULL"):
      exec(open(r"D:/SynologyDrive/Free_handsss/freehandsss_dashboard/3d/scripts/pipeline_v0_phase1_foot.py", encoding="utf-8").read())

  MASTER 模式 (師傅版, 2026-07-12 Fat Mo 裁決新增): 紋理繼續由師傅手工做,
  AI pipeline 只做機械部分。輸入 = 師傅已修好紋理、已裁切、已擺姿嘅 mesh
  (即已有平切面; 偵測唔到平切面會直接 raise, 唔會自己亂切):
    P1(純匯入, 預設不做PCA對齊/不做P3裁切) -> [detect_flat_cut_face 驗證關卡]
    -> P7 -> P5 -> P6 -> P8 -> P9 (跳過 P2 紋理誇張化; P3/P4 做成可選開關,
    由 MASTER_DO_BISECT / MASTER_DO_ALIGN 控制, 預設皆 False)
    用法 (唔想觸發底部 __main__ 自動跑, 用自訂 globals):
      g = {"__name__": "fhs_pipeline_lib"}
      exec(open(r"D:/SynologyDrive/Free_handsss/freehandsss_dashboard/3d/scripts/pipeline_v0_phase1_foot.py", encoding="utf-8").read(), g)
      g["run_pipeline_master"]()
    或者直接改低本檔 PIPELINE_ENTRY_MODE = "MASTER" 再正常 exec 一次。

驗證環境: Blender 5.1.1 / 2026-07-11 (FULL) / 2026-07-12 (MASTER 模式新增)
"""
import bpy, bmesh, numpy as np, struct, os, math
import mathutils

# ---------------------------------------------------------------------------
# 參數 (v0: 人手指定值)
# ---------------------------------------------------------------------------
INPUT_OBJ = "D:/SynologyDrive/Free_handsss/freehandsss_dashboard/3d/input/Level0(Orginal)/2026-34/Amen/Amen-leftleg/Amen-leftleg.obj"
RING_OBJ = "D:/SynologyDrive/Free_handsss/freehandsss_dashboard/3d/input/Ring-24545.obj"
REF_STL = "D:/SynologyDrive/Free_handsss/freehandsss_dashboard/3d/input/Level3(printing)/keychain-2026-34/Amen-leftleg-30.5mm-x1.stl"
OUT_DIR = "D:/SynologyDrive/Free_handsss/freehandsss_dashboard/3d/output/pipeline-v0-phase1"
os.makedirs(OUT_DIR, exist_ok=True)

TARGET_MM = 30.5          # P7 目標最長軸 (Y)
CUT_Y = 14.0               # P3 切割高度 (PCA對齊後、縮放前的座標系, 人手指定值)
EXAG_K = 2.5                # P2 頻帶分離誇張化係數
TEXT_BODY = "KKH 0213"      # P5 刻字內容
ENGRAVE_DEPTH = 0.4          # P5 刻字深度 mm (實物固定值, P7縮放後才做)
TEXT_SAFETY = 0.85           # P5 文字fit切面橢圓的安全係數

CUSTOMER = "Amen"
PART = "leftleg"
QTY = 1

# ---------------------------------------------------------------------------
# 師傅版模式參數 (MASTER_MESH_MODE) — Fat Mo 2026-07-12 裁決:
# 紋理繼續由師傅做, AI pipeline 只做機械部分 (縮放+刻字+加環+QC+出檔)。
# 呢個模式假設輸入 mesh 已經係師傅修好紋理、已裁切、已擺姿 (已有平切面)。
# ---------------------------------------------------------------------------
MASTER_INPUT_OBJ = os.path.join(OUT_DIR, "master-mode", "_sim_master_input_Amen-leftleg.obj")
MASTER_TARGET_MM = TARGET_MM
MASTER_TEXT_BODY = TEXT_BODY
MASTER_OUT_DIR = os.path.join(OUT_DIR, "master-mode")
MASTER_DO_ALIGN = False    # 預設輸入已經擺好姿, 唔再做PCA對齊
MASTER_DO_BISECT = False   # 預設輸入已經裁切好, 唔再自動裁切
MASTER_CUT_Y = CUT_Y       # 若 MASTER_DO_BISECT=True 先會用到
MASTER_REF_STL = REF_STL
PIPELINE_ENTRY_MODE = "FULL"  # "FULL"(預設, 與原行為一致) | "MASTER" | "NONE"(只定義function不自動跑)


def log(msg):
    print("[pipeline] " + str(msg))


# ---------------------------------------------------------------------------
# 工具函式
# ---------------------------------------------------------------------------
def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)


def isolate_select(obj):
    """確保 EDIT 模式操作只影響單一 object。
    教訓 (2026-07-11 P2 debug): Blender 2.8+ 多重選取下進入 EDIT 模式會同時
    影響全部已選取的 mesh object (multi-object editing)。若呼叫前冇先
    deselect_all + 只選目標物件，bpy.ops.mesh.* (remove_doubles 等) 會
    連原始/其他物件一齊改埋，導致頂點數非預期變動。凡係 EDIT 模式的
    bmesh operator 呼叫前必須先 isolate_select()。"""
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def get_world_coords(obj):
    me = obj.data
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    mw = np.array(obj.matrix_world)
    co_h = np.hstack([co, np.ones((n, 1))])
    return (mw @ co_h.T).T[:, :3]


def set_local_coords(obj, coords):
    obj.data.vertices.foreach_set("co", coords.astype(np.float64).ravel())
    obj.data.update()


def bake_world_to_identity(obj, new_world_coords):
    obj.matrix_world = mathutils.Matrix.Identity(4)
    set_local_coords(obj, new_world_coords)


def bake_current_transform(obj):
    """將 obj 現有嘅 matrix_world 烘焙入 local coordinates, 令 matrix_world 變返 Identity。
    純粹坐標系正規化 (唔係姿態/擺位決策): 教訓 (2026-07-12 MASTER模式debug) - OBJ
    importer 有時會將檔案嘅 axis convention 轉換寫入 matrix_world (旋轉), 而唔係直接
    改 vertex 座標, 令 local coords 同 world coords 唔一致。本 pipeline 大量函式
    (mesh_direct_bbox/set_local_coords/detect_flat_cut_face 等) 假設 local coords ==
    world coords (matrix_world=Identity), 所以每次匯入之後、任何幾何運算之前都必須
    確保呢個假設成立, 唔理輸入檔案本身用緊邊種 axis convention。呢個操作本身喺
    world-space 完全唔改變物件實際形狀/方向, 淨係將 transform 記帳方式改變。"""
    world_co = get_world_coords(obj)
    bake_world_to_identity(obj, world_co)
    return obj


def mesh_direct_bbox(obj):
    me = obj.data
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float64)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    return co


def count_islands(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    visited, islands = set(), []
    for sv in bm.verts:
        if sv.index in visited:
            continue
        isl, q = set(), [sv]
        while q:
            v = q.pop()
            if v.index in visited:
                continue
            visited.add(v.index)
            isl.add(v.index)
            for e in v.link_edges:
                ov = e.other_vert(v)
                if ov.index not in visited:
                    q.append(ov)
        islands.append(isl)
    n_islands = len(islands)
    bm.free()
    return n_islands


def manifold_check(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    nm = [e for e in bm.edges if not e.is_manifold]
    boundary = [e for e in bm.edges if len(e.link_faces) == 1]
    n_nm, n_bd = len(nm), len(boundary)
    bm.free()
    return n_nm, n_bd


def import_binary_stl_numpy(filepath, name):
    """自訂 binary STL parser: Level3 樣本檔含非標準 COLOR/MATERIAL header,
    Blender 內建 wm.stl_import 會靜默失敗(0 verts)。此 parser 用 numpy 直接解析
    triangle soup (80-byte header + 4-byte ntri + 50-byte/facet)，忽略檔尾多餘資料。
    僅用於「參考樣本」讀取比對，不用於主流程輸出。"""
    with open(filepath, 'rb') as f:
        data = f.read()
    ntri = struct.unpack('<I', data[80:84])[0]
    dt = np.dtype([('normal', '<f4', 3), ('v1', '<f4', 3), ('v2', '<f4', 3),
                    ('v3', '<f4', 3), ('attr', '<u2')])
    arr = np.frombuffer(data, dtype=dt, count=ntri, offset=84)
    verts = np.concatenate([arr['v1'], arr['v2'], arr['v3']], axis=1).reshape(-1, 3)
    nverts = verts.shape[0]
    me = bpy.data.meshes.new(name)
    me.vertices.add(nverts)
    me.vertices.foreach_set("co", verts.astype(np.float64).ravel())
    me.loops.add(nverts)
    me.polygons.add(ntri)
    me.polygons.foreach_set("loop_start", np.arange(0, nverts, 3, dtype=np.int64))
    me.polygons.foreach_set("loop_total", np.full(ntri, 3, dtype=np.int64))
    me.loops.foreach_set("vertex_index", np.arange(nverts, dtype=np.int64))
    me.update(calc_edges=True)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def fhs_boolean(target, cutter, operation, mod_name="Bool_FHS"):
    """K1 配方: MANIFOLD solver, normals 先修正兩端。"""
    for obj in [cutter, target]:
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')

    for m in list(target.modifiers):
        if m.name.startswith(mod_name):
            target.modifiers.remove(m)

    mod = target.modifiers.new(name=mod_name, type='BOOLEAN')
    mod.operation = operation
    mod.object = cutter
    mod.solver = 'MANIFOLD'

    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')


# ---------------------------------------------------------------------------
# P1 匯入 + PCA 姿態對齊 (=P4 提前做, 見方案書執行次序備註)
# ---------------------------------------------------------------------------
def import_obj_track(filepath, name):
    """匯入 OBJ 並自動抓出新增嘅 object (適用於場景已有其他 object 嘅情況,
    唔靠"scene 第一個 MESH"呢個假設)。供 FULL 模式與 MASTER 模式共用。"""
    before = set(bpy.data.objects.keys())
    bpy.ops.wm.obj_import(filepath=filepath)
    after = set(bpy.data.objects.keys())
    new_names = list(after - before)
    assert len(new_names) >= 1, "import_obj_track: no new object created by import, filepath=" + filepath
    obj = bpy.data.objects[new_names[0]]
    obj.name = name
    return obj


def pca_align(obj):
    """PCA 姿態對齊: 令最長軸=Y, toe-end/ankle-end 方向以斷面半徑判斷 (細=toe)。
    抽取自原 step_p1_import_and_align, 供 FULL 模式(必做)與 MASTER 模式
    (MASTER_DO_ALIGN=True 時可選)共用。"""
    world_co = get_world_coords(obj)
    centroid = world_co.mean(axis=0)
    centered = world_co - centroid
    cov = np.cov(centered.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    order = np.argsort(-eigvals)
    eigvecs = eigvecs[:, order]
    e1 = eigvecs[:, 0]

    t = centered @ e1
    e2, e3 = eigvecs[:, 1], eigvecs[:, 2]
    lo_mask = t < t.min() + 2
    hi_mask = t > t.max() - 2
    r_lo = np.sqrt((centered[lo_mask] @ e2) ** 2 + (centered[lo_mask] @ e3) ** 2).mean()
    r_hi = np.sqrt((centered[hi_mask] @ e2) ** 2 + (centered[hi_mask] @ e3) ** 2).mean()
    if r_lo < r_hi:
        e1 = -e1
    log("  toe-end radius=" + str(r_lo) + " ankle-end radius=" + str(r_hi))

    Y_ax = e1 / np.linalg.norm(e1)
    globalZ = np.array([0.0, 0.0, 1.0])
    Z_ax = globalZ - np.dot(globalZ, Y_ax) * Y_ax
    Z_ax = Z_ax / np.linalg.norm(Z_ax)
    X_ax = np.cross(Y_ax, Z_ax)
    X_ax = X_ax / np.linalg.norm(X_ax)

    M = np.vstack([X_ax, Y_ax, Z_ax])
    assert abs(np.linalg.det(M) - 1.0) < 1e-6, "rotation matrix must be right-handed (det=1)"

    new_co = (M @ (world_co - centroid).T).T
    bake_world_to_identity(obj, new_co)

    ext = new_co.max(axis=0) - new_co.min(axis=0)
    log("  align bbox X=" + str(ext[0]) + " Y=" + str(ext[1]) + " Z=" + str(ext[2]))
    return obj


def step_p1_import_and_align():
    log("P1: 匯入 OBJ")
    obj = import_obj_track(INPUT_OBJ, "Amen-leftleg")
    return pca_align(obj)


# ---------------------------------------------------------------------------
# P2 紋理誇張化 (頻帶分離)
# ---------------------------------------------------------------------------
# 教訓 (2026-07-11 debug session, Fat Mo 目測「唔似師傅版」後定位):
#
# 問題1 (腳踝出現規律粗條紋): 原懷疑係 S2 iterations=120 嘅 Laplacian smooth
# overshoot/ringing。實測用同一機位近拍逐格對比 iterations=120/80/60/40/20，
# 條紋強度幾乎冇分別 -> 假設不成立。追查後發現：呢個條紋喺「完全未經 P2
# 處理」嘅原始掃描已經存在 (腳踝真實摺痕/皮膚紋，同一機位 render 原始 mesh
# 可見一模一樣嘅環狀摺紋，只係對比度較低) -> P2 只係如實放大咗一個真實存在
# 嘅解剖特徵，唔係演算法製造出嚟嘅 artifact。k=2.5→1.8→1.5 嘅測試顯示降低
# k 對呢個部位嘅視覺強度只有輕微影響 (陰影感主要由 cavity shading 造成)。
# 呢個唔再嘗試用 iterations 修，如果 Fat Mo 覺得腳踝紋太誇張，下一步係
# k 值全域降低或者對切面附近做遮罩排除，屬於美學決策，唔喺呢次自動修復範圍。
#
# 問題2 (原本清晰嘅趾甲喺P2後被磨走/變花): 根因唔係平滑 iterations，而係
# 原始掃描 mesh 本身有 4226 條 <0.01mm 嘅退化微三角形 (掃描重建雜訊，
# remove_doubles 驗證)。呢啲近乎重複嘅頂點喺 S1(輕平滑)同 S2(重平滑) 之間
# 產生唔成比例嘅局部差值，被 k 倍放大後就變成全表面嘅麻點噪聲，喺趾甲槽
# 呢種細凹陷更會令差值方向出錯、槽型破碎。修法 = 喺 P2 頻帶分離之前，
# 先用 bmesh.ops.remove_doubles(threshold=0.03mm) 清走呢啲退化微三角形。
# 修復後同一機位近拍 render 確認：麻點噪聲消失、趾甲槽保留清晰形狀。
#
# ⚠️ EDIT 模式陷阱: remove_doubles 等 bmesh operator 一定要先
# isolate_select(obj) 先可以進入 EDIT 模式，否則 Blender 多重選取下的
# multi-object editing 會連場景入面其他仲揀緊嘅 mesh 一齊改到 (已實測踩過:
# 原始 mesh 頂點數被意外改變)。
def fill_small_boundary_loops(obj):
    """通用: 追蹤所有 boundary edge loop 並手動起 face 填補。
    教訓: dissolve_degenerate 喺極細 (近乎零面積) 嘅 pinhole 會令
    bmesh.ops.holes_fill 回傳空 face list (因為個 loop 幾何上太退化,
    filler 演算法拒收)。要手動 trace edge loop 再直接 bm.faces.new()。"""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    bm.edges.ensure_lookup_table()
    filled = 0
    remaining_bd = set(e for e in bm.edges if len(e.link_faces) == 1)
    while remaining_bd:
        e0 = next(iter(remaining_bd))
        remaining_bd.discard(e0)
        loop_verts = [e0.verts[0], e0.verts[1]]
        cur = e0.verts[1]
        start = e0.verts[0]
        safety = 0
        while cur != start and safety < 1000:
            safety += 1
            next_e = None
            for e in cur.link_edges:
                if e in remaining_bd:
                    next_e = e
                    break
            if next_e is None:
                break
            remaining_bd.discard(next_e)
            nv = next_e.other_vert(cur)
            loop_verts.append(nv)
            cur = nv
        if cur == start and len(loop_verts) >= 4:
            verts_ordered = loop_verts[:-1]
            try:
                bm.faces.new(verts_ordered)
                filled += 1
            except Exception:
                pass
    bm.normal_update()
    bm.to_mesh(obj.data)
    obj.data.update()
    bm.free()
    return filled


def clean_scan_slivers(obj, dissolve_thresh=0.005):
    """清走掃描重建產生嘅退化微三角形 (近乎零長度邊)，P2 誇張化前必做。
    教訓 (2026-07-11): 原本用 bpy.ops.mesh.remove_doubles(threshold=0.03mm)
    做「合併相近頂點」，會意外「焊埋」腳踝深摺紋等真實幾何本身就好近但
    唔連通嘅兩塊表面 (spatial-proximity merge 唔理topology)，令 P3 bisect
    後出現 45+ 條 non-manifold/boundary edge，watertight assert 直接炸；
    改用 bpy.ops.mesh.dissolve_degenerate(threshold=0.005mm) —— 呢個只溶解
    真正零面積/零長度嘅退化三角形，唔會跨表面亂焊，安全好多。殘留嘅極少數
    (通常 0-1 個) pinhole 用 fill_small_boundary_loops() 手動補。"""
    n_before = len(obj.data.vertices)
    isolate_select(obj)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.dissolve_degenerate(threshold=dissolve_thresh)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    n_filled = fill_small_boundary_loops(obj)
    n_after = len(obj.data.vertices)
    n_nm, n_bd = manifold_check(obj)
    log("  clean_scan_slivers: " + str(n_before) + " -> " + str(n_after) +
        " verts, filled " + str(n_filled) + " residual pinhole(s), " +
        "post-clean manifold check nm=" + str(n_nm) + " bd=" + str(n_bd))
    assert n_nm == 0 and n_bd == 0, "clean_scan_slivers must stay watertight, stop on failure"


def step_p2_texture_exaggeration(obj):
    log("P2: texture exaggeration (freq separation k=" + str(EXAG_K) + ")")

    clean_scan_slivers(obj, dissolve_thresh=0.005)

    def make_dup(name):
        d = obj.copy()
        d.data = obj.data.copy()
        d.name = name
        bpy.context.scene.collection.objects.link(d)
        return d

    def apply_smooth(o, factor, iterations):
        mod = o.modifiers.new(name="Smooth_tmp", type='SMOOTH')
        mod.factor = factor
        mod.iterations = iterations
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)

    dup_s1 = make_dup("_tmp_S1")
    apply_smooth(dup_s1, 0.5, 8)
    S1 = mesh_direct_bbox(dup_s1)

    dup_s2 = make_dup("_tmp_S2")
    apply_smooth(dup_s2, 0.5, 120)
    S2 = mesh_direct_bbox(dup_s2)

    combined = S1 + EXAG_K * (S1 - S2)
    set_local_coords(obj, combined)

    for d in [dup_s1, dup_s2]:
        me = d.data
        bpy.data.objects.remove(d, do_unlink=True)
        if me.users == 0:
            bpy.data.meshes.remove(me)

    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new(name="PostSmooth", type='SMOOTH')
    mod.factor = 0.3
    mod.iterations = 3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    log("  P2 done (P2b nail template: skipped this run, see report)")


# ---------------------------------------------------------------------------
# P3 裁切 (bisect + fill)
# ---------------------------------------------------------------------------
def step_p3_bisect(obj, cut_y):
    log("P3: bisect at Y=" + str(cut_y))
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.bisect(
        plane_co=(0, cut_y, 0),
        plane_no=(0, 1, 0),
        use_fill=True,
        clear_inner=False,
        clear_outer=True,
        threshold=0.0001,
    )
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')

    n_nm, n_bd = manifold_check(obj)
    co = mesh_direct_bbox(obj)
    log("  after bisect y range: " + str(co[:,1].min()) + " ~ " + str(co[:,1].max()) +
        " non-manifold=" + str(n_nm) + " boundary=" + str(n_bd))
    assert n_nm == 0 and n_bd == 0, "P3 bisect must be watertight, stop on failure"


# ---------------------------------------------------------------------------
# P7 縮放
# ---------------------------------------------------------------------------
def step_p7_scale(obj, target_mm):
    log("P7: uniform scale to longest axis=" + str(target_mm) + "mm")
    co = mesh_direct_bbox(obj)
    ranges = co.max(axis=0) - co.min(axis=0)
    longest_axis = int(np.argmax(ranges))
    scale_factor = target_mm / ranges[longest_axis]
    co_scaled = co * scale_factor
    set_local_coords(obj, co_scaled)
    log("  scale_factor=" + str(scale_factor) + " longest_axis=" + "XYZ"[longest_axis])
    return scale_factor


# ---------------------------------------------------------------------------
# P5 刻字 (切面平面 boolean 凹刻) -- 必須在 P7 縮放之後執行
# ---------------------------------------------------------------------------
def step_p5_engrave_text(obj, text_body=TEXT_BODY, depth=ENGRAVE_DEPTH):
    log("P5: engrave text '" + text_body + "' depth=" + str(depth) + "mm")
    co = mesh_direct_bbox(obj)
    ymax = co[:, 1].max()
    face_mask = co[:, 1] > ymax - 0.05
    face = co[face_mask]
    xc = (face[:, 0].min() + face[:, 0].max()) / 2
    zc = (face[:, 2].min() + face[:, 2].max()) / 2
    xw = face[:, 0].max() - face[:, 0].min()
    zh = face[:, 2].max() - face[:, 2].min()
    log("  cut face: width=" + str(xw) + " height=" + str(zh) + " center=(" + str(xc) + "," + str(zc) + ") ymax=" + str(ymax))

    txt_data = bpy.data.curves.new(name="EngraveText", type='FONT')
    txt_data.body = text_body
    txt_data.align_x = 'CENTER'
    txt_data.align_y = 'CENTER'
    txt_data.extrude = 0.0
    txt_data.bevel_depth = 0.0
    txt_obj = bpy.data.objects.new("EngraveText", txt_data)
    bpy.context.scene.collection.objects.link(txt_obj)
    bpy.context.view_layer.objects.active = txt_obj
    bpy.ops.object.select_all(action='DESELECT')
    txt_obj.select_set(True)
    bpy.ops.object.convert(target='MESH')

    total_span = depth + 2.0
    half = total_span / 2
    mod = txt_obj.modifiers.new(name="Solid", type='SOLIDIFY')
    mod.thickness = total_span
    mod.offset = 0.0
    bpy.ops.object.modifier_apply(modifier=mod.name)

    n_nm, _ = manifold_check(txt_obj)
    assert n_nm == 0, "engrave cutter must be watertight (Solidify not curve-extrude walls)"

    tco = mesh_direct_bbox(txt_obj)
    w0 = tco[:, 0].max() - tco[:, 0].min()
    h0 = tco[:, 1].max() - tco[:, 1].min()

    ratio_w = w0 / xw
    ratio_h = h0 / zh
    s_max = 1.0 / math.sqrt(ratio_w ** 2 + ratio_h ** 2)
    s = s_max * TEXT_SAFETY
    log("  text raw w0=" + str(w0) + " h0=" + str(h0) + " fit scale s=" + str(s) +
        " final_w=" + str(s * w0) + " final_h=" + str(s * h0))

    tco2 = tco.copy()
    tco2[:, 0] *= s
    tco2[:, 0] *= -1.0  # 實測 Rx(+90) 令文字左右鏡像, 需額外翻轉復原可讀方向
    tco2[:, 1] *= s

    rot = np.empty_like(tco2)
    rot[:, 0] = tco2[:, 0]
    rot[:, 1] = -tco2[:, 2]
    rot[:, 2] = tco2[:, 1]

    offset_y = ymax - depth + half
    rot[:, 0] += xc
    rot[:, 1] += offset_y
    rot[:, 2] += zc
    set_local_coords(txt_obj, rot)

    fhs_boolean(obj, txt_obj, 'DIFFERENCE', mod_name="Bool_Text")

    me = txt_obj.data
    bpy.data.objects.remove(txt_obj, do_unlink=True)
    if me.users == 0:
        bpy.data.meshes.remove(me)
    if txt_data.users == 0:
        bpy.data.curves.remove(txt_data)

    n_nm, n_bd = manifold_check(obj)
    log("  after engrave non-manifold=" + str(n_nm) + " boundary=" + str(n_bd))
    assert n_nm == 0 and n_bd == 0, "P5 engrave must be watertight, stop on failure"


# ---------------------------------------------------------------------------
# P6 掛環 (現成標準件 import, 一體成型)
# ---------------------------------------------------------------------------
def step_p6_ring(obj):
    log("P6: ring (standard part Ring-24545.obj)")
    before = set(bpy.data.objects.keys())
    bpy.ops.wm.obj_import(filepath=RING_OBJ)
    after = set(bpy.data.objects.keys())
    ring = bpy.data.objects[list(after - before)[0]]

    ring_world = get_world_coords(ring)
    ring_dims = ring_world.max(axis=0) - ring_world.min(axis=0)
    log("  ring raw dims: " + str(ring_dims) + " (expect ~2.0 x 4.5 x 4.5mm)")

    ring_center = ring_world.mean(axis=0)
    ring_local = ring_world - ring_center

    co = mesh_direct_bbox(obj)
    ymax = co[:, 1].max()
    face_mask = co[:, 1] > ymax - 0.05
    face = co[face_mask]
    xc = (face[:, 0].min() + face[:, 0].max()) / 2
    z_top = face[:, 2].max()

    ring_radius = ring_dims[1] / 2  # 4.5mm loop diameter / 2 (NOT ring_dims[0]=2.0mm thickness)
    # 環是繞 X 軸(hole-axis)旋轉對稱的torus, 在 Y-Z 平面呈完整4.5mm圓形。
    # 為避免環伸出切面令Y軸bbox超出30.5mm容差, center_y需設在 ymax-ring_radius,
    # 使環的Y方向最大值剛好=ymax (不外凸), 環改為往+Z(向上)伸出可見。
    target = ring_local.copy()
    target[:, 0] += xc
    target[:, 1] += ymax - ring_radius
    target[:, 2] += z_top - 1.5 + ring_radius
    set_local_coords(ring, target)
    ring.matrix_world = mathutils.Matrix.Identity(4)

    fhs_boolean(obj, ring, 'UNION', mod_name="Bool_Ring")

    n_nm, n_bd = manifold_check(obj)
    log("  after ring union non-manifold=" + str(n_nm) + " boundary=" + str(n_bd))
    assert n_nm == 0 and n_bd == 0, "P6 ring union must be watertight, stop on failure"


# ---------------------------------------------------------------------------
# K2 浮空碎片清除 (boolean偶爾產生的細小離散孤島, 只保留最大連通元件)
# ---------------------------------------------------------------------------
def step_remove_floating_fragments(obj):
    log("K2: remove floating fragments (keep largest island)")
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(obj.data)
    bm.verts.ensure_lookup_table()

    visited, islands = set(), []
    for sv in bm.verts:
        if sv.index in visited:
            continue
        isl, q = set(), [sv]
        while q:
            v = q.pop()
            if v.index in visited:
                continue
            visited.add(v.index)
            isl.add(v.index)
            for e in v.link_edges:
                ov = e.other_vert(v)
                if ov.index not in visited:
                    q.append(ov)
        islands.append(isl)

    n_before = len(islands)
    if n_before > 1:
        largest = max(islands, key=len)
        to_del = [v for v in bm.verts if v.index not in largest]
        bmesh.ops.delete(bm, geom=to_del, context='VERTS')
        bmesh.update_edit_mesh(obj.data)
        log("  removed " + str(n_before - 1) + " fragment islands, " + str(len(to_del)) + " verts")
    else:
        log("  no fragments found (1 island)")
    bpy.ops.object.mode_set(mode='OBJECT')


# ---------------------------------------------------------------------------
# P8 QC
# ---------------------------------------------------------------------------
def step_p8_qc(obj, target_mm):
    log("P8: QC check")
    co = mesh_direct_bbox(obj)
    ranges = co.max(axis=0) - co.min(axis=0)
    longest = ranges.max()
    n_nm, n_bd = manifold_check(obj)
    n_isl = count_islands(obj)

    result = {
        "longest_axis_mm": float(longest),
        "target_mm": target_mm,
        "dim_pass": abs(longest - target_mm) <= 0.05,
        "non_manifold_edges": n_nm,
        "boundary_edges": n_bd,
        "watertight_pass": (n_nm == 0 and n_bd == 0),
        "islands": n_isl,
        "island_pass": n_isl == 1,
    }
    result["overall_pass"] = result["dim_pass"] and result["watertight_pass"] and result["island_pass"]
    for k, v in result.items():
        log("  " + k + ": " + str(v))
    return result


# ---------------------------------------------------------------------------
# P9 出檔 + Render
# ---------------------------------------------------------------------------
def setup_render_common():
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 1000
    scene.render.image_settings.file_format = 'PNG'
    shading = scene.display.shading
    shading.light = 'STUDIO'
    shading.color_type = 'SINGLE'
    shading.single_color = (0.75, 0.75, 0.78)
    shading.show_cavity = True


def render_view(cam_obj, filepath):
    bpy.context.scene.camera = cam_obj
    bpy.context.scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)


def frame_camera_ortho(cam_obj, targets, view='FRONT', margin=1.3):
    all_co = np.concatenate([get_world_coords(o) for o in targets], axis=0)
    center = (all_co.max(axis=0) + all_co.min(axis=0)) / 2
    extents = all_co.max(axis=0) - all_co.min(axis=0)

    cam_obj.data.type = 'ORTHO'
    dist = 300
    if view == 'FRONT':
        cam_obj.location = (center[0], center[1] - dist, center[2])
        cam_obj.rotation_euler = (math.radians(90), 0, 0)
        ortho_scale = max(extents[0], extents[2]) * margin
    elif view == 'BACK':
        cam_obj.location = (center[0], center[1] + dist, center[2])
        cam_obj.rotation_euler = (math.radians(90), 0, math.radians(180))
        ortho_scale = max(extents[0], extents[2]) * margin
    elif view == 'RIGHT':
        cam_obj.location = (center[0] + dist, center[1], center[2])
        cam_obj.rotation_euler = (math.radians(90), 0, math.radians(90))
        ortho_scale = max(extents[1], extents[2]) * margin
    elif view == 'TOP':
        cam_obj.location = (center[0], center[1], center[2] + dist)
        cam_obj.rotation_euler = (0, 0, 0)
        ortho_scale = max(extents[0], extents[1]) * margin
    cam_obj.data.ortho_scale = ortho_scale


def step_p9_export_and_render(obj, qc_result):
    log("P9: export STL + render")
    stl_name = CUSTOMER + "-" + PART + "-" + str(TARGET_MM) + "mm-x" + str(QTY) + ".stl"
    stl_path = os.path.join(OUT_DIR, stl_name)

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.wm.stl_export(filepath=stl_path, export_selected_objects=True)
    log("  STL exported: " + stl_path)

    setup_render_common()
    cam_data = bpy.data.cameras.new("QC_Cam")
    cam_obj = bpy.data.objects.new("QC_Cam", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)

    sun_data = bpy.data.lights.new("Sun", type='SUN')
    sun_obj = bpy.data.objects.new("Sun", sun_data)
    bpy.context.scene.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(45), 0, math.radians(45))

    frame_camera_ortho(cam_obj, [obj], view='RIGHT')
    render_view(cam_obj, os.path.join(OUT_DIR, "qc_front_ortho_RIGHT.png"))

    ref_obj = None
    if os.path.exists(REF_STL):
        ref_obj = import_binary_stl_numpy(REF_STL, "Level3_Reference")
        ref_co = get_world_coords(ref_obj)
        our_co = get_world_coords(obj)
        gap = 20.0
        shifted = ref_co.copy()
        shifted[:, 0] += (our_co[:, 0].max() + gap - ref_co[:, 0].min())
        bake_world_to_identity(ref_obj, shifted)

        for view in ['RIGHT', 'FRONT', 'BACK']:
            frame_camera_ortho(cam_obj, [obj, ref_obj], view=view)
            render_view(cam_obj, os.path.join(OUT_DIR, "compare_" + view + "_ours_vs_reference.png"))
        log("  side-by-side compare renders done (RIGHT/FRONT/BACK), pending Fat Mo review")
    else:
        log("  WARNING: reference STL not found: " + REF_STL)

    return stl_path


# ---------------------------------------------------------------------------
# 師傅版模式 (MASTER_MESH_MODE) - Fat Mo 2026-07-12 裁決新增
# 輸入 = 師傅已修好紋理、已裁切、已擺姿嘅 mesh。流程跳過 P2 紋理誇張化;
# P3(裁切)/P4(擺姿) 視輸入而定, 做成可選開關 (MASTER_DO_BISECT/MASTER_DO_ALIGN),
# 預設皆 False (假設輸入已經處理好)。
# ---------------------------------------------------------------------------
def detect_flat_cut_face(obj, min_coverage=0.3, flatness_ratio=0.6):
    """驗證師傅版輸入 mesh 已經有平切面 (已裁切), 偵測唔到就直接 raise,
    唔會自己嘗試裁切。做法 (全部向量化, 唔用逐點 loop, 1.1M面mesh都食得住):
      1) 沿 bbox 最長軸搵去到極值嘅一個薄 band (band = 最長軸range * 1%)
      2) coverage 檢查: band 內嘅頂點喺另外兩軸嘅覆蓋範圍要夠闊, 唔係得
         一個尖角/單點
      3) 平坦度檢查: band 內沿最長軸嘅座標標準差要遠細過 band 本身
    任何一項唔過 -> raise RuntimeError, 停手, 唔嘗試自動修復。"""
    co = mesh_direct_bbox(obj)
    ranges = co.max(axis=0) - co.min(axis=0)
    axis = int(np.argmax(ranges))
    vals = co[:, axis]
    vmax = float(vals.max())
    band = float(ranges[axis] * 0.01)
    mask = vals > (vmax - band)
    n_hit = int(mask.sum())
    if n_hit < 20:
        raise RuntimeError(
            "detect_flat_cut_face: axis-" + "XYZ"[axis] + " extreme band only has " +
            str(n_hit) + " verts, does not look like a cut plane (maybe a curved tip). " +
            "MASTER mode assumes input is already cut, will NOT auto-bisect. " +
            "Confirm input mesh, or set MASTER_DO_BISECT=True explicitly.")

    face = co[mask]
    other = [i for i in range(3) if i != axis]
    span0 = float(face[:, other[0]].max() - face[:, other[0]].min())
    span1 = float(face[:, other[1]].max() - face[:, other[1]].min())
    total0 = float(ranges[other[0]]) if ranges[other[0]] > 0 else 1e-9
    total1 = float(ranges[other[1]]) if ranges[other[1]] > 0 else 1e-9
    coverage = min(span0 / total0, span1 / total1)
    if coverage < min_coverage:
        raise RuntimeError(
            "detect_flat_cut_face: coverage too low (coverage=" + str(round(coverage, 3)) +
            " < " + str(min_coverage) + "), looks like a small tip not a wide cut face. " +
            "MASTER mode will NOT auto-bisect, confirm input mesh manually.")

    std_val = float(vals[mask].std())
    if std_val > band * flatness_ratio:
        raise RuntimeError(
            "detect_flat_cut_face: std along axis-" + "XYZ"[axis] + "=" +
            str(round(std_val, 5)) + " (band=" + str(round(band, 5)) + ") too large, " +
            "not flat enough - maybe uncut. MASTER mode will NOT auto-bisect.")

    log("  detect_flat_cut_face PASS: axis=" + "XYZ"[axis] + " vmax=" + str(round(vmax, 4)) +
        " coverage=" + str(round(coverage, 3)) + " flat_std=" + str(round(std_val, 5)) +
        " (band=" + str(round(band, 5)) + ")")
    return axis, vmax, band


def step_p9_export_and_render_generic(obj, out_dir, stl_name, ref_stl=None, ref_gap=20.0,
                                        engrave_view='BACK'):
    # 教訓 (2026-07-12 MASTER模式驗證): 刻字/環都擺喺 +Y max 切面, BACK 機位
    # (location=+Y方向望向-Y) 先影得到平面正面, RIGHT 機位望到嘅係腳板側面
    # (見唔到刻字)。engrave_view 預設must係 'BACK', 唔係 FULL模式舊有嘅 'RIGHT'。
    """通用出檔+render, 供師傅版模式使用 (可自訂 out_dir/檔名, 唔綁死 module-level
    OUT_DIR/CUSTOMER/PART/QTY)。渲染輸出: 1張刻字可讀正交視圖(較貼近) +
    FRONT/RIGHT/TOP 三視圖 + (若有 ref_stl) 對比參考樣本圖。"""
    os.makedirs(out_dir, exist_ok=True)
    stl_path = os.path.join(out_dir, stl_name)

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.wm.stl_export(filepath=stl_path, export_selected_objects=True)
    log("  STL exported: " + stl_path)

    setup_render_common()
    cam_data = bpy.data.cameras.new("QC_Cam")
    cam_obj = bpy.data.objects.new("QC_Cam", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)

    sun_data = bpy.data.lights.new("Sun", type='SUN')
    sun_obj = bpy.data.objects.new("Sun", sun_data)
    bpy.context.scene.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(45), 0, math.radians(45))

    frame_camera_ortho(cam_obj, [obj], view=engrave_view, margin=1.15)
    render_view(cam_obj, os.path.join(out_dir, "qc_engrave_readable_" + engrave_view + ".png"))

    for view in ['FRONT', 'RIGHT', 'TOP']:
        frame_camera_ortho(cam_obj, [obj], view=view, margin=1.3)
        render_view(cam_obj, os.path.join(out_dir, "qc_threeview_" + view + ".png"))

    if ref_stl and os.path.exists(ref_stl):
        ref_obj = import_binary_stl_numpy(ref_stl, "Level3_Reference")
        ref_co = get_world_coords(ref_obj)
        our_co = get_world_coords(obj)
        shifted = ref_co.copy()
        shifted[:, 0] += (our_co[:, 0].max() + ref_gap - ref_co[:, 0].min())
        bake_world_to_identity(ref_obj, shifted)
        frame_camera_ortho(cam_obj, [obj, ref_obj], view='RIGHT', margin=1.3)
        render_view(cam_obj, os.path.join(out_dir, "qc_compare_vs_reference_RIGHT.png"))
        log("  compare-vs-reference render done")
    elif ref_stl:
        log("  WARNING: reference STL not found: " + ref_stl)

    return stl_path


def build_simulated_master_input(out_path=None):
    """驗證專用 (非正式流程一部分): 模擬師傅版已修好紋理、已裁切、已擺姿嘅
    中間檔, 因為手上暫時冇真實嘅師傅版無環無字中間檔。

    做法: 用原掃描行 P1(匯入+PCA對齊) -> clean_scan_slivers(退化幾何清理,
    呢步淨係mesh衛生, 唔屬於P2紋理誇張化演算法) -> P3(bisect裁切), 然後
    刻意跳過 P2 紋理誇張化, export做 OBJ 代表師傅完成紋理但未加環未刻字
    嘅mesh, 拎嚟餵俾 run_pipeline_master() 做端對端驗證。"""
    out_path = out_path or MASTER_INPUT_OBJ
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    clear_scene()
    obj = step_p1_import_and_align()
    clean_scan_slivers(obj, dissolve_thresh=0.005)
    step_p3_bisect(obj, CUT_Y)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.wm.obj_export(filepath=out_path, export_selected_objects=True)
    log("  simulated master input exported (P2 skipped): " + out_path)
    return out_path


def run_pipeline_master(input_obj=None, target_mm=None, text_body=None, out_dir=None,
                          do_align=None, do_bisect=None, cut_y=None, ref_stl=None, clear=True):
    """師傅版模式入口: P1(匯入) -> [可選P4擺姿] -> [可選P3裁切]
    -> detect_flat_cut_face(驗證關卡, 唔通過即raise停手) -> P7 -> P5 -> P6
    -> K2 -> P8 -> P9。跳過 P2 紋理誇張化。"""
    input_obj = MASTER_INPUT_OBJ if input_obj is None else input_obj
    target_mm = MASTER_TARGET_MM if target_mm is None else target_mm
    text_body = MASTER_TEXT_BODY if text_body is None else text_body
    out_dir = MASTER_OUT_DIR if out_dir is None else out_dir
    do_align = MASTER_DO_ALIGN if do_align is None else do_align
    do_bisect = MASTER_DO_BISECT if do_bisect is None else do_bisect
    cut_y = MASTER_CUT_Y if cut_y is None else cut_y
    ref_stl = MASTER_REF_STL if ref_stl is None else ref_stl

    log("=== master mode start ===")
    log("  input=" + str(input_obj) + " target_mm=" + str(target_mm) + " text=" + str(text_body))
    if clear:
        clear_scene()

    obj = import_obj_track(input_obj, "MasterMesh")
    obj = bake_current_transform(obj)
    log("  bake_current_transform done (normalize matrix_world -> Identity, 修正OBJ" +
        " importer可能將axis convention轉換寫入matrix_world而非vertex data嘅情況)")

    if do_align:
        log("  MASTER_DO_ALIGN=True: run PCA align")
        obj = pca_align(obj)
    else:
        log("  MASTER_DO_ALIGN=False: assume already posed, skip")

    if do_bisect:
        log("  MASTER_DO_BISECT=True: run P3 bisect Y=" + str(cut_y))
        step_p3_bisect(obj, cut_y)
    else:
        log("  MASTER_DO_BISECT=False: assume already cut, skip")

    detect_flat_cut_face(obj)

    step_p7_scale(obj, target_mm)
    step_p5_engrave_text(obj, text_body)
    step_p6_ring(obj)
    step_remove_floating_fragments(obj)
    qc = step_p8_qc(obj, target_mm)

    stl_name = CUSTOMER + "-" + PART + "-master-" + str(target_mm) + "mm-x" + str(QTY) + ".stl"
    stl_path = step_p9_export_and_render_generic(obj, out_dir, stl_name, ref_stl=ref_stl)

    log("=== master mode done ===")
    log("STL: " + stl_path)
    log("QC: " + str(qc))
    return obj, qc, stl_path


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def run_pipeline():
    clear_scene()
    obj = step_p1_import_and_align()
    step_p2_texture_exaggeration(obj)
    step_p3_bisect(obj, CUT_Y)
    step_p7_scale(obj, TARGET_MM)
    step_p5_engrave_text(obj)
    step_p6_ring(obj)
    step_remove_floating_fragments(obj)
    qc = step_p8_qc(obj, TARGET_MM)
    stl_path = step_p9_export_and_render(obj, qc)
    log("=== Pipeline done ===")
    log("STL: " + stl_path)
    log("QC: " + str(qc))
    return obj, qc, stl_path


if __name__ == "__main__":
    if PIPELINE_ENTRY_MODE == "FULL":
        run_pipeline()
    elif PIPELINE_ENTRY_MODE == "MASTER":
        run_pipeline_master()
    else:
        log("PIPELINE_ENTRY_MODE=" + str(PIPELINE_ENTRY_MODE) + ": functions defined only, no auto-run")
