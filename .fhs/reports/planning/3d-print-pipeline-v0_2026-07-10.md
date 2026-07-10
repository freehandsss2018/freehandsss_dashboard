# 3D 手腳模打印自動化 Pipeline v0 方案書（鎖匙扣線）

> 2026-07-10 產出（Fable 5 設計，執行交 sonnet）。背景與樣本分析證據見 memory `project_3d_print_pipeline.md` 及 `3d/output/analysis-2026-07-10/`。

## 目標

輸入 = 原掃描 OBJ + 訂單參數，輸出 = 可直接交廠嘅打印 STL。師傅只剩「指甲/特殊紋理」一項人手工序（或完全跳過，視乎 Fat Mo 目測驗收）。

## 分期（Fat Mo 2026-07-10 裁決：先腳後手，任務難度高不可一步到位）

- **Phase 1（=本方案書 P1–P9 全部內容）：只做腳**。樣本=Amen-leftleg，規格已全部實證（30.5mm/腳趾向下/腳踝平切/切面刻字/頂加環）。Phase 1 未經 Fat Mo 驗收前，禁開 Phase 2。
- **Phase 2：手**。⚠️ 手規格≠腳，且大部分未驗證（裁切位置、唔同姿態〔握拳/張開〕嘅吊向、環位、刻字位係咪都喺切面——全部未知）。**Phase 2 第一步唔係寫 code，係樣本分析**：render 對比 Level3 全部 7 個手 STL（Amen/AngieYeung/Shirley/TszYuCheung/Wing430/WoodCheung/Dede-Parent），歸納「手規格表」（裁切/擺姿/環位/刻字位/姿態點影響尺寸），交 Fat Mo 確認後先動工。禁跳過此步直接套用腳嘅規則。

## 輸入參數（每單）

| 參數 | 來源 | 例 |
|---|---|---|
| OBJ 路徑 | Level0 資料夾 | `Level0(Orginal)/2026-34/Amen/Amen-leftleg/Amen-leftleg.obj` |
| 目標尺寸 mm | **腳=30.5 固定（Fat Mo 2026-07-10 確認）；手=隨姿態變化無公式，由 Fat Mo 逐單標籤喺輸入檔名，pipeline 讀檔名取值**（建議輸入命名慣例：`<客名>-<部位>-<mm>mm.obj`，如 `Amen-lefthand-27.5mm.obj`；檔名冇 mm 標籤而部位=腳→預設 30.5，部位=手→報錯要求補標籤，禁猜） | 30.5 |
| 刻字內容 | 訂單（縮寫+日期） | `KKH 0213` |
| 數量 | 訂單 | x1 |
| 切面位置 | 預設規則（見 P3），特殊單人手指定 | auto |

## Pipeline 步驟（P1–P9）

- **P1 匯入**：`bpy.ops.wm.obj_import`，座標值直接當 mm，讀 bbox 核對。
- **P2 紋理誇張化（頻帶分離，已 PoC 驗證）**：
  - S1 = Smooth modifier factor0.5 iter8（去噪底版）；S2 = iter120（無摺痕版）
  - 結果 = S1 + k×(S1−S2)，**k=2.5 起步**（k=4 會出鱗片 artifact）
  - 後處理：輕平滑 2–3 iter 去殘餘斑點
  - ⚠️ 禁單頻 unsharp（原版−平滑版直接放大 = 噪聲災難，PoC 圖 12/13 為證）
  - 指甲方針（Fat Mo 2026-07-10 拍板）：**創作可接受，唔係還原**——石膏實物本身都冇 crisp 指甲（照片實證），師傅係對相腦補畫出嚟；AI 同樣用「參數化指甲模板 stamp」創作：趾尖極點定位、大細=趾寬比例、方向=局部法向，boolean 上去；有照片就 render 並排校準，冇照片照創作。列 **P2b（v0 內嘗試項）**：主流程 P1–P9 跑通後先試，驗收=同師傅版並排 render Fat Mo 目測
- **P3 裁切**：bisect plane 切走腳踝以上 + fill 成平面。預設規則待定（建議：垂直最長軸、保留腳掌全長 + 少量腳踝，參考 Level3 樣本比例）；v0 可先做成參數人手俾一個高度值。
- **P4 擺姿**：腳趾向下、切面向上（Level3 慣例），切面法向對齊 +Y。
- **P5 刻字**：Text object → 切面平面 boolean 凹刻，深度 0.4mm 起（廠家規格待確認），字高自動 fit 切面橢圓內。
- ⚠️ **執行次序**：P5 刻字同 P6 掛環都係實物固定尺寸（mm 常數），必須喺 P7 縮放**之後**先做，否則會跟模型一齊縮細。實際執行順序 = P1 → P2(+P2b) → P3 → P4 → **P7 縮放** → P5 刻字 → P6 掛環 → P8 → P9。
- **P6 掛環**：**環=固定標準件，直接 import Fat Mo 指定檔案**（2026-07-10 提供）：`3d/input/Ring-24545.obj`（實測 2.0×4.5×4.5mm，檔名即尺寸，watertight，131k verts）。**禁自行造 torus、禁縮放個環**。注意原檔座標有偏移（bbox 唔喺原點）→ import 後先重置中再擺位：切面上方置中、環面垂直於切面、boolean union 一體成型。次序：喺 P7 縮放之後先加。
- **P7 縮放**：均勻縮放至最長軸 = 目標尺寸（pilot 已驗證 30.50mm 精確）。
- **P8 QC**：watertight 檢查（自產出應 0 boundary/0 non-manifold，好過師傅版嘅 8/13）+ 尺寸讀回 + 島嶼數=1。
- **P9 出檔**：STL 命名 `<客名>-<部位>-<尺寸>mm-x<數量>.stl` 到 `3d/output/`。

## 驗收條件（機械可判 + 一項目測）

1. Amen-leftleg 全流程一 script 跑通，無人手介入（P3 切面高度參數除外）。
2. STL 讀回：最長軸 30.50±0.05mm；boundary edges=0；non-manifold=0；島嶼數=1。
3. 刻字 render 可讀（正交前視圖 PNG）。
4. 與師傅版 `Amen-leftleg-30.5mm-x1.stl` 同角度並排 render ≥3 視圖，交 Fat Mo 目測裁決（唯一非機械項）。

## T6 降級交接膠囊 → 交接俾 sonnet

**【已裁決事項】**（接手者不得重開）
- 誇張化用頻帶分離 k=2.5 起步；禁單頻 unsharp（證據：`3d/output/analysis-2026-07-10/` 圖 12/13 vs 14/15）
- 禁做 Level0↔Level3 全域 ICP 對齊（Level3 有裁切，數學上無解，agent 已試敗）
- 刻字刻喺平切面（唔係曲面），boolean 凹刻
- 掛環一體成型（唔係留俾廠家）

**【已驗證事實】**（不必重查）
- 13/13 Level3 STL 最長軸=檔名 mm 值（Y 軸）；腳統一 30.5mm
- 原掃描已 watertight；廠家容忍小缺陷
- pilot 縮放出檔已 PASS（`PILOT_Amen-leftleg-auto-30.5mm.stl` = 30.50mm）
- Blender MCP addon port 9876，Blender 要開住先連到；1.1M 面 mesh 用 foreach_get/set + numpy，禁 Python 逐點 loop

**【剩餘步驟】**：P3 裁切 → P4 擺姿 → P5 刻字 → P6 掛環（先量 Level3 樣本環尺寸）→ 串成單一 script → 跑驗收 1–4。

**【禁區】**：`3d/input/` 唯讀；不碰 Dashboard/n8n/Supabase 任何嘢。

**【卡關升級條件】**：同一子任務錯兩次（如 boolean 失敗、bisect 爛面）→ 停手回報，升 opus/fable，附完整失敗軌跡。

## 已裁決補充（Fat Mo 2026-07-10 四條規則）

1. ✅ 掛環=固定尺寸標準件，pipeline 只負責擺位（原未決事項#1 結案）
2. ✅ 腳=30.5mm 固定
3. ✅ 手=隨姿態變化無公式，Fat Mo 逐單標籤喺檔名，pipeline 讀檔名（原未決事項#3 結案，禁自行推算）
4. ✅ 925 銀線唔做住，v0 範圍=鎖匙扣手+腳（原未決事項#4 結案）

## 未決事項（唔阻 v0 開工）

1. 刻字深度/字型廠家有無規格？（v0 用 0.4mm + 無襯線體）
