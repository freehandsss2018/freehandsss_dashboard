#!/usr/bin/env python3
"""
反推 Canva ColourMix > Parakeet 嘅色相漸變公式（單一已知參數組合）。

用法：
    python sample_gradient_fit.py <canva原生輸出樣本.png>

原理：Parakeet 效果係一個線性色相平面 hue(u,v) = A*u + B*v + C（mod 1 cycle），
u/v 係圖片內嘅正規化座標（0-1，闊/高各自獨立正規化，非舊版「拉伸貼合1563正方
參考canvas」假設）。因為漸變會喺畫布內 wrap 幾轉（形成重複彩虹帶），唔可以直接
對 hue 數值做普通線性回歸（wrap 處會斷裂），改用相位差分法（phase-unwrapping
via local finite differences）：
    1. 逐像素攞 output 嘅 hue（cycle 0-1）
    2. 水平/垂直方向嘅「wrapped 差分」估計局部斜率 A（每單位闊度）/ B（每單位高度）
    3. 用 circular mean 反推截距 C

輸出嘅 A/B/C 只啱呢個樣本對應嘅 ColourMix 參數組合（Hue offset/Saturation/
Rainbow amount/Rainbow offset），换咗參數組合就要用新樣本重新跑呢個 script。
"""

import argparse
import colorsys
from pathlib import Path

import numpy as np
from PIL import Image


def _wrap(delta: np.ndarray) -> np.ndarray:
    """帶入 (-0.5, 0.5] cycle 範圍。"""
    return (delta + 0.5) % 1.0 - 0.5


def fit_gradient(img_path: Path):
    im = Image.open(img_path).convert("RGBA")
    arr = np.array(im).astype(float) / 255.0
    h, w = arr.shape[:2]
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    hue = np.zeros((h, w))
    sat = np.zeros((h, w))
    val = np.zeros((h, w))
    for yy in range(h):
        for xx in range(w):
            hh, ss, vv = colorsys.rgb_to_hsv(r[yy, xx], g[yy, xx], b[yy, xx])
            hue[yy, xx] = hh
            sat[yy, xx] = ss
            val[yy, xx] = vv

    # 有效像素：唔透明 + 唔近乎無彩度(灰/黑/白, hue 讀數唔穩) + 唔近乎全黑/全白
    valid = (a > 0.5) & (sat > 0.08) & (val > 0.05) & (val < 0.98)

    # 水平方向差分 -> A（cycle per unit width，u=x/w）
    dh_x = _wrap(hue[:, 1:] - hue[:, :-1])
    valid_x = valid[:, 1:] & valid[:, :-1]
    A_per_px = np.median(dh_x[valid_x])
    A = A_per_px * w  # cycle per full width traversal (u: 0->1)

    # 垂直方向差分 -> B（cycle per unit height，v=y/h）
    dh_y = _wrap(hue[1:, :] - hue[:-1, :])
    valid_y = valid[1:, :] & valid[:-1, :]
    B_per_px = np.median(dh_y[valid_y])
    B = B_per_px * h  # cycle per full height traversal (v: 0->1)

    # 截距 C：circular mean of (hue - A*u - B*v)
    yy_idx, xx_idx = np.mgrid[0:h, 0:w]
    u = xx_idx / w
    v = yy_idx / h
    residual_cycles = hue - (A * u + B * v)
    ang = residual_cycles[valid] * 2 * np.pi
    C = (np.angle(np.mean(np.exp(1j * ang))) / (2 * np.pi)) % 1.0

    sat_mean = float(np.mean(sat[valid]))
    sat_median = float(np.median(sat[valid]))
    n_valid = int(valid.sum())

    return {
        "A_cycle_per_width": float(A),
        "B_cycle_per_height": float(B),
        "C_cycle": float(C),
        "A_deg_per_width": float(A * 360),
        "B_deg_per_height": float(B * 360),
        "C_deg": float(C * 360),
        "saturation_mean": sat_mean,
        "saturation_median": sat_median,
        "n_valid_px": n_valid,
        "sample_size": (w, h),
    }


def main():
    ap = argparse.ArgumentParser(description="反推 Canva ColourMix Parakeet 色相漸變公式（正規化座標版）")
    ap.add_argument("sample", type=Path, help="Canva 原生 ColourMix 輸出樣本 PNG")
    args = ap.parse_args()

    result = fit_gradient(args.sample)
    print(f"樣本尺寸: {result['sample_size']}　有效像素: {result['n_valid_px']}")
    print(f"A (cycle/寬度, u方向) = {result['A_cycle_per_width']:.6f}  ({result['A_deg_per_width']:.2f}°)")
    print(f"B (cycle/高度, v方向) = {result['B_cycle_per_height']:.6f}  ({result['B_deg_per_height']:.2f}°)")
    print(f"C (cycle, 截距)      = {result['C_cycle']:.6f}  ({result['C_deg']:.2f}°)")
    print(f"Saturation 平均={result['saturation_mean']:.4f}  中位數={result['saturation_median']:.4f}")


if __name__ == "__main__":
    main()
