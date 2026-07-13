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

詳見方案書：.fhs/reports/planning/canva-auto-sop-v2_2026-07-10.md；
呢次重新反推嘅記錄見 canva_auto/placement_memory.json order 0800802。
"""

import argparse
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import remove

# 主公式：正規化座標 u=x/寬, v=y/高（0-1）；由 0800802 訂單 Canva 原生
# ColourMix Parakeet 輸出（Hue offset=0.8/Saturation=0.3/Rainbow amount=0.2/
# Rainbow offset=0）反推，見 sample_gradient_fit.py
HUE_A_DEG = -198.55       # 每單位 u（闊度 0->1）度數
HUE_B_DEG = 213.21        # 每單位 v（高度 0->1）度數
HUE_C_DEG = 313.79        # 截距
DEFAULT_SATURATION = 0.30


def remove_background(image_path: Path) -> Image.Image:
    """去背（Magic Grab 替代）。回傳 RGBA。"""
    data = image_path.read_bytes()
    cut = remove(data)
    return Image.open(BytesIO(cut)).convert("RGBA")


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


def apply_parakeet(rgba: Image.Image, saturation: float = DEFAULT_SATURATION) -> Image.Image:
    """Parakeet 色譜（ColourMix 替代）。以原圖明暗度做 lightness，位置決定 hue。"""
    w, h = rgba.size
    arr = np.array(rgba).astype(float)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

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


def process_order(color_path: Path, bw_path: Path, out_dir: Path, saturation: float = DEFAULT_SATURATION):
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/3] 去背彩色圖：{color_path.name}")
    color_cut = remove_background(color_path)
    color_out = out_dir / f"{color_path.stem}_cutout.png"
    color_cut.save(color_out)
    print(f"      -> {color_out}")

    print(f"[2/3] 去背黑白圖：{bw_path.name}")
    bw_cut = remove_background(bw_path)

    print("[3/3] 套用 Parakeet 色譜")
    bw_parakeet = apply_parakeet(bw_cut, saturation=saturation)
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
    args = ap.parse_args()

    process_order(args.color, args.bw, args.out_dir, args.saturation)


if __name__ == "__main__":
    main()
