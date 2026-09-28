#!/usr/bin/env python3
"""
canva-auto Stage2 素材本地加工工具

複製兩個 Canva App 效果，全程本機執行：
  1. 去背（Magic Grab 替代）— rembg / u2net
  2. Parakeet 色譜（ColourMix > Parakeet 替代）— 反推出嚟嘅線性色相漸變公式

用法：
    python local_prep.py --color 彩色圖.png --bw 黑白圖.png --out-dir 輸出資料夾/

背景與已知限制（2026-07-13 更新, S171續III 0800802 案）：
  - v2 公式（本版）改用正規化座標 u=x/寬, v=y/高（0-1，闊高各自獨立正規化），
    捨棄咗 v1「拉伸貼合 1563x1563 參考 canvas」嘅假設——v1 未驗證過非正方形
    輸入圖；本版係用 Fat Mo 喺 Canva 原生 ColourMix 面板套用 **Parakeet 預設，
    Hue offset=0.8／Saturation=0.3／Rainbow amount=0.2／Rainbow offset=0**
    嘅實際輸出（0800802 黑白圖.png 1872x2048，非正方形）反推，用相位差分法
    （見 sample_gradient_fit.py）擬合，Saturation 擬合中位數 0.3064 同 Fat Mo
    嗰邊嘅滑桿讀數 0.3 幾乎完全吻合，交叉驗證通過。
  - 呢組 A/B/C 淨係啱返 **呢一組**滑桿數值；Rainbow amount/Hue offset/Rainbow
    offset 呢 3 個滑桿點樣個別影響公式仲未拆解（只用單一樣本，冇做參數掃描），
    如果 Fat Mo 之後改用第二組滑桿數值，要攞新樣本重新跑 sample_gradient_fit.py。
  - 擬合樣本用嘅係 Canva 縮圖 API 提供嘅 182x199 縮圖（冇搵到全解像度直接下載
    途徑），非全解像度原圖。漸變係平滑低頻信號，理論上縮圖唔會影響斜率擬合，
    但未用全解像度樣本交叉驗證過，如果套出嚟色帶方向明顯唔啱，呢個係第一個要
    重新檢視嘅地方。
  - Canva App 冇 API，如果 Canva 側嘅 Parakeet 滑桿數值之後再改，呢條公式會
    過時，需要重新攞新樣本反推（見 sample_gradient_fit.py）。

2026-09-21 改良（0600108 Ctungdear 案，以 Fat Mo Canva 版逐像素對比為尺，見
placement_memory.json CV-54／CV-55）：
  - 黑白圖去背：rembg 對線稿會保留兩人之間嘅封閉空位（Canva 會去）。改為用彩色圖
    去背 mask（彩色 rembg 準確）做前置：affine 對位到黑白圖（兩邊先填洞，只比外輪廓）
    → 將黑白圖近白像素分連通區 → 大部分被彩色 mask 判為背景嘅區整塊剔走。同 Fat Mo
    Canva 版 IoU 0.860 → 0.981，對位 IoU 0.978。對位失敗（IoU 低於 FIT_MIN_IOU）
    自動退回純 rembg 並提示。
  - 彩色圖去背：rembg 半透明 alpha 重映射（alpha>=0.3 即全不透明），白衫邊少切
    （IoU 0.980 → 0.986，over-cut 1.8% → 1.1%）。
  - Parakeet：飽和度預設 0.30 → 0.207（Canva 版紙面實測），黑位抬高 0.20
    （V = 0.20 + 0.80×明度；Canva 版線條唔係純黑）。Canva-kept 像素平均 RGB 誤差
    0.159 → 0.122。線條真正嘅 Canva 上色仍未完全重現（最暗像素偏紫、飽和度高），
    餘下誤差屬未解。
  - 仍未做：外圍淺灰光暈（約 9px）、底部白衫沿用彩色去背嘅 over-cut。

2026-09-22 改良（0600512 Small Chan 案，Fat Mo 對成品唔滿意主動 Canva 重做後逐像素
對比發現，見 placement_memory.json CV-56）：
  - 根源查明：上面 CV-54／CV-55 嘅「彩色 mask 前置」只係治標，白衫 over-cut 嘅真正
    根源係 rembg **預設 `u2net` 模型**本身對大片低對比白色（白衫近似米白紙底背景）
    saliency 信心唔夠。0600512 白衫延伸到圖邊，over-cut 達 24×（彩色）／14.7×（黑白）
    under-cut，對位 IoU 只得 0.846（<FIT_MIN_IOU 0.90），前置 mask 冇觸發、黑白圖
    退回純 rembg，即係話 CV-54 嘅修法對呢單完全冇作用。
  - 換 `u2net_human_seg`（人像專用模型，同 session 兩張圖共用）後，同 Fat Mo Canva
    版 IoU：彩色 0.882→**0.969**，黑白 0.784→**0.945**（原始 rembg 輸出，未過
    Parakeet／對位管線）。`alpha_matting=True` 再加返少少（彩色 0.973）但黑白冇提升
    仲慢 3×（9.3s vs 3.5s／兩圖），暫不用。`isnet-general-use` 對彩色更勁（0.989）
    但對線稿災難性失敗（0.364——線稿線條太疏，唔似「顯著物件」，大片被當背景），
    唔可用於黑白圖。
  - 上面 CV-54 嘅「彩色 mask 前置＋affine 對位」機制**保留**（唔刪）：換咗模型後
    對位 IoU 理應會過 0.90 門檻，前置邏輯可以繼續生效補埋殘餘封閉空位；即使對位
    仍然失敗，退回嘅純 rembg（而家已經係 human_seg）本身都已經夠好。
  - 仍未做：外圍淺灰光暈、髮絲邊緣軟化程度同 Canva 版仲有少量差異（未量化）。

2026-09-25 改良（06001007 meiyan_cmyy＋0600512 Small Chan 兩單 Canva 黑白版，見
placement_memory.json CV-60）：
  - 線條上色：Canva Parakeet 唔係固定飽和度——按原圖明度逐級統計，飽和度由紙面 ≈0.21
    隨明度下降急升到墨線核心 ≈0.87（原固定 0.207 令線條偏灰：本地墨線 RGB≈(64,58,66)，
    Canva≈(66–72,40–44,63–64) 偏紫）。改為明度色調曲線 S(L)、V(L)（見 CURVE_*），預設啟用；
    傳 --saturation／--black-lift 即退回舊固定值模式。
  - 驗證（Canva 版下載檔白底壓平，flood-fill 取前景，逐像素 RGB 平均絕對誤差 MAE，
    墨線區＝原圖明度＜0.35）：最終合併參數兩單 06001007 墨線區 0.072→0.043、整體
    0.043→0.034；0600512 Small Chan 墨線區 0.087→0.062、整體 0.048→0.042；紙面區不變
    （0.022–0.025）。獨立性註記：只用 06001007 單樣本擬合時，Small Chan（未參與擬合）
    已由 0.087→0.062，即曲線可跨單泛化；最終參數係兩單合併擬合，故上面兩單都唔算純
    hold-out。Small Chan 有 Canva 版嘅資料夾只得 06001007／0600512 兩單，其餘單冇獨立
    Canva 黑白圖檔可驗（0600108 只有彩色版同整頁匯出）。
  - 仍有殘差：墨線平均仍略暗（R 約低 6–8），hue 仍用位置漸變場（未逐單校 Rainbow 滑桿）。

2026-09-28 修復（0601124 Saaallyyyc，Fat Mo 指出黑白圖紅圈區變透明，見 placement_memory.json
CV-63）：
  - 根源：`u2net_human_seg` 只認人像，非人道具（本單：兩隻黃仔公仔）被當背景切走；彩色圖
    公仔位 alpha＝0，而黑白圖去背又用彩色前景 mask 做前置，公仔內部白區被判為背景整塊剔走
    → Parakeet 輸出公仔只剩線條（alpha 0.15），Fat Mo Canva 版係整隻公仔連底色。
  - 修法：新增 `_bgdist_foreground()`——平滑淺色底（本單灰底）用四邊擬合嘅二次曲面當背景模型，
    以 Lab 色距離＞BGDIST_THR 且非「同邊界連通嘅背景」＝前景；彩色圖去背 alpha＝
    max(人像 alpha, 色距離前景)，前置 mask＝兩者聯集。兩個人物之間嘅封閉灰底空位（面積
    ≥BGDIST_POCKET_FRAC）仍剔走。底色唔平滑／擬合殘差過大／補回面積過大時自動退回純
    人像模型並提示。
"""

import argparse
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage as ndi

# 主公式：正規化座標 u=x/寬, v=y/高（0-1）；由 0800802 訂單 Canva 原生
# ColourMix Parakeet 輸出（Hue offset=0.8/Saturation=0.3/Rainbow amount=0.2/
# Rainbow offset=0）反推，見 sample_gradient_fit.py
HUE_A_DEG = -198.55       # 每單位 u（闊度 0->1）度數
HUE_B_DEG = 213.21        # 每單位 v（高度 0->1）度數
HUE_C_DEG = 313.79        # 截距
DEFAULT_SATURATION = 0.207   # 0600108 Canva 版紙面實測（原 0.30 對 0800802 滑桿讀數）
DEFAULT_BLACK_LIFT = 0.20    # V = lift + (1-lift)*明度；0 = 舊行為（純黑線）
# 2026-09-25 色調曲線（預設）：Canva Parakeet 唔係固定飽和度——越暗越飽和（紙面 S≈0.21、
# 墨線核心 S≈0.87）。用 06001007＋0600512 兩單 Canva 版逐明度分級統計合併擬合：
#   S(L) = S_PAPER + (S_INK - S_PAPER) * (1-L)^S_POWER      L＝原圖明度 0-1
#   V(L) = V_BLACK + (1 - V_BLACK) * L^V_POWER
CURVE_S_PAPER = 0.2145
CURVE_S_INK = 0.8687
CURVE_S_POWER = 2.70
CURVE_V_BLACK = 0.2387
CURVE_V_POWER = 1.03

COLOR_ALPHA_FULL = 0.3    # 彩色圖 rembg alpha >= 呢個值即當全不透明
PRIOR_ALPHA = 0.1         # 彩色圖 alpha 高過呢個值先當前景（前置 mask）
WHITE_LUM = 0.94          # 黑白圖近白像素門檻（0.90–0.97 結果差唔多）
BG_COVER_FRAC = 0.5       # 連通區被前置 mask 判背景嘅比例超過即剔走（0.4–0.7 差唔多）
MIN_BG_REGION_PX = 200    # 太細嘅白區（線條縫隙）唔理
FIT_MIN_IOU = 0.90        # 對位 IoU 低過呢個值就唔信前置 mask
BGDIST_THR = 10.0         # 色距離前景：Lab 距離背景模型高過呢個值先當前景
BGDIST_POCKET_FRAC = 0.005  # 封閉且同底色一樣嘅區塊面積（佔全圖）超過即當背景（人物之間空位）
BGDIST_MAX_BORDER_RESID = 6.0   # 邊界擬合殘差中位數超過即唔信（底色唔平滑）
BGDIST_MAX_ADD_FRAC = 0.25      # 補回前景面積超過全圖呢個比例即唔信

REMBG_MODEL = "u2net_human_seg"   # 0600512：人像專用模型，白衫 over-cut 大幅改善（CV-56）
_session_cache = {}


def _rembg_session():
    if REMBG_MODEL not in _session_cache:
        _session_cache[REMBG_MODEL] = new_session(REMBG_MODEL)
    return _session_cache[REMBG_MODEL]


def _rembg_rgba(image_path: Path) -> Image.Image:
    data = image_path.read_bytes()
    return Image.open(BytesIO(remove(data, session=_rembg_session()))).convert("RGBA")


def _bgdist_foreground(rgb: np.ndarray):
    """平滑底色圖嘅「色距離前景」（補人像模型切走嘅非人道具，CV-63）。

    背景模型＝四邊 12px 框做穩健二次曲面擬合（Lab）；離背景模型夠遠、且唔係「同圖邊連通
    嘅背景」＝前景。回傳 (前景 bool mask, 擬合殘差中位數, 被剔走嘅封閉底色區 mask)；
    圖唔適用（底色唔平滑）由呼叫方按殘差判斷。
    """
    from skimage import color

    lab = color.rgb2lab(rgb / 255.0)
    h, w, _ = lab.shape
    border = np.zeros((h, w), bool)
    border[:12, :] = border[-12:, :] = border[:, :12] = border[:, -12:] = True
    yy, xx = np.mgrid[0:h, 0:w]
    basis = lambda x, y: np.stack([np.ones(x.size), x, y, x * y, x ** 2, y ** 2], 1)
    a_b = basis(xx[border].astype(float), yy[border].astype(float))
    a_all = basis(xx.ravel().astype(float), yy.ravel().astype(float))
    bg = np.zeros_like(lab)
    resid_med = 0.0
    for c in range(3):
        sel = np.ones(a_b.shape[0], bool)
        y_b = lab[..., c][border]
        for _ in range(3):   # 穩健：逐輪剔走離群（人物碰到圖邊嘅像素）
            coef, *_ = np.linalg.lstsq(a_b[sel], y_b[sel], rcond=None)
            res = np.abs(a_b @ coef - y_b)
            sel = res < max(3.0, np.percentile(res, 80))
        bg[..., c] = (a_all @ coef).reshape(h, w)
        resid_med = max(resid_med, float(np.median(res[sel])))
    dist = ndi.gaussian_filter(np.sqrt(((lab - bg) ** 2).sum(-1)), 1.5)

    bglike = dist < BGDIST_THR
    cc, n = ndi.label(bglike)
    edge_ids = np.unique(np.concatenate([cc[0], cc[-1], cc[:, 0], cc[:, -1]]))
    edge_ids = edge_ids[edge_ids > 0]
    fg = ~np.isin(cc, edge_ids)
    fg = ndi.binary_fill_holes(ndi.binary_opening(fg, iterations=2))
    pocket = np.zeros((h, w), bool)
    sizes = ndi.sum(bglike, cc, np.arange(1, n + 1))
    for i, s in enumerate(sizes, 1):
        if i not in edge_ids and s >= BGDIST_POCKET_FRAC * h * w:
            pocket |= cc == i
    pocket = ndi.binary_dilation(pocket, iterations=3)
    return fg & ~pocket, resid_med, pocket


def remove_background(image_path: Path):
    """去背（Magic Grab 替代）。回傳 (RGBA, 前景 mask)。

    RGBA 嘅 alpha 已重映射令白衫邊唔會半透明；前景 mask（rembg 原 alpha > PRIOR_ALPHA）
    留畀線稿去背做前置。人像模型切走嘅非人道具用色距離前景補返（CV-63）。
    """
    cut = _rembg_rgba(image_path)
    arr = np.array(cut)
    # rembg 輸出喺被切走嘅位置 RGB＝0（補返 alpha 都會係黑），一律用原圖 RGB
    src_rgb = np.array(Image.open(image_path).convert("RGB").resize(cut.size))
    arr[:, :, :3] = src_rgb
    a = arr[:, :, 3] / 255.0
    a_out = np.clip(a / COLOR_ALPHA_FULL, 0.0, 1.0)
    fg_mask = a > PRIOR_ALPHA

    fg_bd, resid, pocket = _bgdist_foreground(src_rgb.astype(float))
    added = fg_bd & ~fg_mask
    if resid > BGDIST_MAX_BORDER_RESID:
        print(f"      [警告] 底色唔夠平滑（邊界擬合殘差 {resid:.1f}），略過色距離補回，只用人像模型")
    elif added.mean() > BGDIST_MAX_ADD_FRAC:
        print(f"      [警告] 色距離前景補回面積 {added.mean():.0%} 過大，略過，只用人像模型")
    else:
        soft = ndi.gaussian_filter(ndi.binary_erosion(fg_bd, iterations=2).astype(float), 1.2)
        a_out = np.maximum(np.where(pocket, 0.0, a_out), soft)
        fg_mask = (fg_mask | fg_bd) & ~pocket
        print(f"      色距離補回非人像前景 {added.mean():.1%}（人像模型切走嘅道具／公仔）")
    arr[:, :, 3] = np.round(a_out * 255).astype(np.uint8)
    return Image.fromarray(arr, "RGBA"), fg_mask


def _bbox(mask: np.ndarray):
    ys, xs = np.where(mask)
    return xs.min(), xs.max(), ys.min(), ys.max()


def _warp(src: np.ndarray, p, shape) -> np.ndarray:
    """dst(x,y) = src((x-tx)/sx, (y-ty)/sy)；p = (sx, sy, tx, ty)。"""
    sx, sy, tx, ty = p
    m = np.array([[1.0 / sy, 0.0], [0.0, 1.0 / sx]])
    off = np.array([-ty / sy, -tx / sx])
    return ndi.affine_transform(src.astype(float), m, offset=off, output_shape=shape, order=1, mode="constant", cval=0.0)


def fit_affine(src_mask: np.ndarray, tgt_mask: np.ndarray, factor: int = 4):
    """將 src_mask 對位到 tgt_mask（scale x/y 獨立＋平移，IoU 最大化）。回傳 (params, IoU)。

    彩色同黑白圖闊高比唔同（0600108：sx 1.221 對 sy 1.170），唔可以用均勻縮放。
    """
    s = src_mask[::factor, ::factor]
    t = tgt_mask[::factor, ::factor]
    bs, bt = _bbox(s), _bbox(t)
    sx = (bt[1] - bt[0]) / max(bs[1] - bs[0], 1)
    sy = (bt[3] - bt[2]) / max(bs[3] - bs[2], 1)
    cur = [sx, sy, bt[0] - bs[0] * sx, bt[2] - bs[2] * sy]
    step = [0.02, 0.02, 3.0, 3.0]

    def iou(p):
        w = _warp(s, p, t.shape) > 0.5
        return (w & t).sum() / max((w | t).sum(), 1)

    best = iou(cur)
    for _ in range(80):
        improved = False
        for i in range(4):
            for d in (-1, 1):
                p = list(cur)
                p[i] += d * step[i]
                v = iou(p)
                if v > best:
                    cur, best, improved = p, v, True
        if not improved:
            step = [x / 2 for x in step]
            if step[0] < 0.0004:
                break
    # 平移由縮細圖座標換返原圖座標
    return (cur[0], cur[1], cur[2] * factor, cur[3] * factor), best


def remove_background_line_art(bw_path: Path, color_fg: np.ndarray) -> Image.Image:
    """線稿（黑白圖）去背：彩色圖前景 mask 做前置，逐個白色連通區判斷。回傳 RGBA。"""
    base = _rembg_rgba(bw_path)
    base_alpha = np.array(base)[:, :, 3] / 255.0

    # 對位只比外輪廓：兩邊先填洞（rembg 黑白 mask 保留咗封閉空位，直接比會拖歪參數）
    params, iou = fit_affine(ndi.binary_fill_holes(color_fg), ndi.binary_fill_holes(base_alpha > 0.5))
    print(f"      彩色→黑白圖對位 IoU {iou:.3f}（sx {params[0]:.4f} sy {params[1]:.4f} tx {params[2]:.1f} ty {params[3]:.1f}）")
    if iou < FIT_MIN_IOU:
        print(f"      [警告] 對位 IoU < {FIT_MIN_IOU}（兩張圖可能唔係同一構圖），退回純 rembg 去背，封閉空位要人手處理")
        return base

    prior_bg = _warp(color_fg, params, base_alpha.shape) <= 0.5
    src = np.array(Image.open(bw_path).convert("RGB"))
    lum = (0.299 * src[:, :, 0] + 0.587 * src[:, :, 1] + 0.114 * src[:, :, 2]) / 255.0

    lab, n = ndi.label(lum >= WHITE_LUM)          # 4-連通：白區被線條圍住
    idx = np.arange(1, n + 1)
    sizes = ndi.sum(np.ones_like(lab), lab, idx)
    bg_frac = ndi.sum(prior_bg, lab, idx) / np.maximum(sizes, 1)
    is_bg = np.zeros(n + 1, bool)
    is_bg[1:] = (bg_frac > BG_COVER_FRAC) & (sizes > MIN_BG_REGION_PX)
    # 唔可以用「同圖邊連通嘅白區＝背景」：人物被圖邊裁切，白衫內部會經圖邊漏出去（over-cut 37%）
    keep = ~is_bg[lab]

    out = np.zeros(src.shape[:2] + (4,), np.uint8)
    out[:, :, :3] = src
    out[:, :, 3] = np.round(np.clip(ndi.gaussian_filter(keep.astype(float), 0.7), 0.0, 1.0) * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def _hsv_to_rgb_vec(h: np.ndarray, s: np.ndarray, v: np.ndarray):
    i = np.floor(h * 6.0)
    f = h * 6.0 - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    i = i.astype(int) % 6
    r = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [v, q, p, p, t, v])
    g = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [t, v, v, q, p, p])
    b = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [p, p, t, v, v, q])
    return r, g, b


def apply_parakeet(rgba: Image.Image, saturation: float | None = None,
                   black_lift: float | None = None) -> Image.Image:
    """Parakeet 色譜（ColourMix 替代）。以原圖明暗度做 lightness，位置決定 hue。

    預設用色調曲線（S、V 都按原圖明度變化，見 CURVE_*）；只要傳咗 saturation 或 black_lift
    其中一個，就退回舊固定值模式（S 固定、V＝lift＋(1-lift)×明度）供手動微調／對照。"""
    w, h = rgba.size
    arr = np.array(rgba).astype(float)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    lum0 = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

    yy, xx = np.mgrid[0:h, 0:w]
    u = xx / w
    v = yy / h
    hue = (HUE_A_DEG * u + HUE_B_DEG * v + HUE_C_DEG) % 360 / 360.0
    if saturation is None and black_lift is None:
        sat = CURVE_S_PAPER + (CURVE_S_INK - CURVE_S_PAPER) * (1.0 - lum0) ** CURVE_S_POWER
        lum = CURVE_V_BLACK + (1.0 - CURVE_V_BLACK) * lum0 ** CURVE_V_POWER
    else:
        s_flat = DEFAULT_SATURATION if saturation is None else saturation
        lift = DEFAULT_BLACK_LIFT if black_lift is None else black_lift
        sat = np.full_like(hue, s_flat)
        lum = lift + (1.0 - lift) * lum0

    ro, go, bo = _hsv_to_rgb_vec(hue, sat, np.clip(lum, 0.0, 1.0))
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, 0] = np.clip(ro * 255, 0, 255)
    out[:, :, 1] = np.clip(go * 255, 0, 255)
    out[:, :, 2] = np.clip(bo * 255, 0, 255)
    out[:, :, 3] = a
    return Image.fromarray(out, "RGBA")


def process_order(color_path: Path, bw_path: Path, out_dir: Path,
                  saturation: float | None = None, black_lift: float | None = None):
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/3] 去背彩色圖：{color_path.name}")
    color_cut, color_fg = remove_background(color_path)
    color_out = out_dir / f"{color_path.stem}_cutout.png"
    color_cut.save(color_out)
    print(f"      -> {color_out}")

    print(f"[2/3] 去背黑白圖（彩色 mask 前置）：{bw_path.name}")
    bw_cut = remove_background_line_art(bw_path, color_fg)

    print("[3/3] 套用 Parakeet 色譜")
    bw_parakeet = apply_parakeet(bw_cut, saturation=saturation, black_lift=black_lift)
    bw_out = out_dir / f"{bw_path.stem}_parakeet.png"
    bw_parakeet.save(bw_out)
    print(f"      -> {bw_out}")

    return color_out, bw_out


def main():
    ap = argparse.ArgumentParser(description="canva-auto Stage2 本地素材加工：rembg 去背 + Parakeet 色譜重現")
    ap.add_argument("--color", required=True, type=Path, help="彩色圖路徑")
    ap.add_argument("--bw", required=True, type=Path, help="黑白圖路徑")
    ap.add_argument("--out-dir", type=Path, default=Path("."), help="輸出資料夾")
    ap.add_argument("--saturation", type=float, default=None,
                    help=f"Parakeet 固定飽和度（不傳＝用明度色調曲線；傳咗即退回舊固定值模式，配合 --black-lift，舊預設 {DEFAULT_SATURATION}）")
    ap.add_argument("--black-lift", type=float, default=None,
                    help=f"Parakeet 黑位抬高（不傳＝用明度色調曲線；傳咗即退回舊固定值模式，舊預設 {DEFAULT_BLACK_LIFT}；0 = 純黑線）")
    args = ap.parse_args()

    process_order(args.color, args.bw, args.out_dir, args.saturation, args.black_lift)


if __name__ == "__main__":
    main()
