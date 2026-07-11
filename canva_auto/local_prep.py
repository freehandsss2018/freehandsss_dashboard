#!/usr/bin/env python3
"""
canva-auto Stage2 素材本地加工工具

複製兩個 Canva App 效果，全程本機執行：
  1. 去背（Magic Grab 替代）— rembg / u2net
  2. Parakeet 色譜（ColourMix > Parakeet 替代）— 反推出嚟嘅線性色相漸變公式

用法：
    python local_prep.py --color 彩色圖.png --bw 黑白圖.png --out-dir 輸出資料夾/

背景與已知限制（2026-07-10, canva-auto SOP v2.1 P2 pilot）：
  - Parakeet 公式係由兩張 Canva ColourMix 匯出樣本（皆為 1563x1563 canvas）反推，
    交叉驗證平均色相誤差 ~11-17 度。肉眼睇令人信服，但唔係逐像素同 Canva 一致。
  - 假設任意尺寸輸入圖會「拉伸貼合」去返 1563x1563 參考 canvas 嘅座標系；
    呢個假設只喺兩張同尺寸（1563x1563）樣本上驗證過，未測試過非正方形輸入圖，
    如果套出嚟嘅漸變方向明顯歪咗，呢個假設係第一個要重新檢視嘅地方。
  - 飽和度固定 0.32（樣本觀察平均值），原版有更多飽和度變化，成因未查。
  - Canva App 冇 API，如果 Canva 側嘅 Parakeet preset 之後改版，呢條公式會過時，
    需要重新用兩張新樣本反推（見 sample_gradient_fit.py）。

詳見方案書：.fhs/reports/planning/canva-auto-sop-v2_2026-07-10.md
"""

import argparse
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import remove

# 主公式：喺 1563x1563 參考 canvas 上反推（Pangonyi 0600907 訂單 + 0526/0529 兩張舊樣本交叉驗證）
REF_CANVAS = 1563.0
HUE_A = -0.144686001       # 每 px（x 方向，參考 canvas）度數
HUE_B = 0.0994223125       # 每 px（y 方向，參考 canvas）度數
HUE_C = 0.0000372391224
DEFAULT_SATURATION = 0.32


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
    x_ref = xx / w * REF_CANVAS
    y_ref = yy / h * REF_CANVAS
    hue = (HUE_A * x_ref + HUE_B * y_ref + HUE_C) % 360 / 360.0
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
