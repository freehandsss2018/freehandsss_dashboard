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
"""

import argparse
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import remove
from scipy import ndimage as ndi

# 主公式：正規化座標 u=x/寬, v=y/高（0-1）；由 0800802 訂單 Canva 原生
# ColourMix Parakeet 輸出（Hue offset=0.8/Saturation=0.3/Rainbow amount=0.2/
# Rainbow offset=0）反推，見 sample_gradient_fit.py
HUE_A_DEG = -198.55       # 每單位 u（闊度 0->1）度數
HUE_B_DEG = 213.21        # 每單位 v（高度 0->1）度數
HUE_C_DEG = 313.79        # 截距
DEFAULT_SATURATION = 0.207   # 0600108 Canva 版紙面實測（原 0.30 對 0800802 滑桿讀數）
DEFAULT_BLACK_LIFT = 0.20    # V = lift + (1-lift)*明度；0 = 舊行為（純黑線）

COLOR_ALPHA_FULL = 0.3    # 彩色圖 rembg alpha >= 呢個值即當全不透明
PRIOR_ALPHA = 0.1         # 彩色圖 alpha 高過呢個值先當前景（前置 mask）
WHITE_LUM = 0.94          # 黑白圖近白像素門檻（0.90–0.97 結果差唔多）
BG_COVER_FRAC = 0.5       # 連通區被前置 mask 判背景嘅比例超過即剔走（0.4–0.7 差唔多）
MIN_BG_REGION_PX = 200    # 太細嘅白區（線條縫隙）唔理
FIT_MIN_IOU = 0.90        # 對位 IoU 低過呢個值就唔信前置 mask


def _rembg_rgba(image_path: Path) -> Image.Image:
    data = image_path.read_bytes()
    return Image.open(BytesIO(remove(data))).convert("RGBA")


def remove_background(image_path: Path):
    """去背（Magic Grab 替代）。回傳 (RGBA, 前景 mask)。

    RGBA 嘅 alpha 已重映射令白衫邊唔會半透明；前景 mask（rembg 原 alpha > PRIOR_ALPHA）
    留畀線稿去背做前置。
    """
    cut = _rembg_rgba(image_path)
    arr = np.array(cut)
    a = arr[:, :, 3] / 255.0
    arr[:, :, 3] = np.round(np.clip(a / COLOR_ALPHA_FULL, 0.0, 1.0) * 255).astype(np.uint8)
    return Image.fromarray(arr, "RGBA"), a > PRIOR_ALPHA


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


def apply_parakeet(rgba: Image.Image, saturation: float = DEFAULT_SATURATION,
                   black_lift: float = DEFAULT_BLACK_LIFT) -> Image.Image:
    """Parakeet 色譜（ColourMix 替代）。以原圖明暗度做 lightness，位置決定 hue。"""
    w, h = rgba.size
    arr = np.array(rgba).astype(float)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
    lum = black_lift + (1.0 - black_lift) * lum

    yy, xx = np.mgrid[0:h, 0:w]
    u = xx / w
    v = yy / h
    hue = (HUE_A_DEG * u + HUE_B_DEG * v + HUE_C_DEG) % 360 / 360.0
    sat = np.full_like(hue, saturation)

    ro, go, bo = _hsv_to_rgb_vec(hue, sat, lum)
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, 0] = np.clip(ro * 255, 0, 255)
    out[:, :, 1] = np.clip(go * 255, 0, 255)
    out[:, :, 2] = np.clip(bo * 255, 0, 255)
    out[:, :, 3] = a
    return Image.fromarray(out, "RGBA")


def process_order(color_path: Path, bw_path: Path, out_dir: Path,
                  saturation: float = DEFAULT_SATURATION, black_lift: float = DEFAULT_BLACK_LIFT):
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
    ap.add_argument("--saturation", type=float, default=DEFAULT_SATURATION, help=f"Parakeet 飽和度（預設 {DEFAULT_SATURATION}）")
    ap.add_argument("--black-lift", type=float, default=DEFAULT_BLACK_LIFT, help=f"Parakeet 黑位抬高（預設 {DEFAULT_BLACK_LIFT}；0 = 純黑線）")
    args = ap.parse_args()

    process_order(args.color, args.bw, args.out_dir, args.saturation, args.black_lift)


if __name__ == "__main__":
    main()
