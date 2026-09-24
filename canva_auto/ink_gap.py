#!/usr/bin/env python3
"""
canva-auto 交付前檢查：字句墨水頂 vs 圖／片底邊間隙（CV-58）

手寫體字句上伸筆畫高過 box top 約 9px（63.47px 字），所以圖／片底邊唔可以貼字句 box
top，要留墨水間隙。本腳本讀 `export-design` 出嘅真圖，喺圖／片底邊之下掃字句墨水，
報第一行墨水位置同間隙，交付前用（唔好用縮圖／draft 判斷）。

用法（page2／page4，深底淺字，1920×1080 匯出，scale=1）：
    python ink_gap.py page2.jpg --image-bottom 771.725 --x 546 1374 --text light
用法（Stage⑤ 存檔頁，白底深字，1000×1000 匯出＝2× 500 設計座標）：
    python ink_gap.py archive.png --image-bottom 319.16 --x 122 378 --text dark --scale 2

--image-bottom 用設計座標（CDF 的 top+height），--x 係字句 box 左右邊（設計座標），
--scale＝匯出像素／設計座標。預設最小間隙 5（設計座標 px），可用 --min-gap 改。
exit 0＝間隙足夠；exit 1＝間隙不足（壓字或太貼）；exit 2＝掃唔到字句墨水（參數／匯出有問題）。

背景：06001007 實測（本腳本，≥3 墨水像素／行）page2 墨水頂 782.0 對 box top 789.87（−7.9px）；
Fat Mo 最終圖底離墨水頂：page2 10.27、page4 11.62；存檔頁（17px 字）5.34（Fat Mo 幾何零修改接受）。
注意：掃描由圖底邊之下開始——若圖底邊本身已壓入字句，首行墨水可能喺底邊之後，仍會因間隙
細而報不足（1.28 例：AI 原版 page2 底邊 788.72）；--image-bottom 要用 CDF 嘅 top+height。
"""
import argparse
import sys

import numpy as np
from PIL import Image

LIGHT_MIN = 232   # 淺字：三通道皆 >= 此值
DARK_MAX = 90     # 深字：三通道皆 <= 此值
MIN_INK_PX = 3    # 一行至少幾多墨水像素先算字句（避開孤立雜點）


def find_ink_top(img: np.ndarray, y_start: int, x0: int, x1: int, text: str):
    region = img[y_start:, x0:x1]
    if text == "light":
        ink = region.min(axis=2) >= LIGHT_MIN
    else:
        ink = region.max(axis=2) <= DARK_MAX
    rows = np.where(ink.sum(axis=1) >= MIN_INK_PX)[0]
    return None if len(rows) == 0 else int(rows[0]) + y_start


def main():
    if hasattr(sys.stdout, "reconfigure"):   # Windows cp950 控制台印 emoji 會崩潰
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="量度字句墨水頂同圖／片底邊間隙（CV-58）")
    ap.add_argument("image", help="export-design 匯出嘅真圖（jpg／png）")
    ap.add_argument("--image-bottom", type=float, required=True, help="圖／片底邊（設計座標 top+height）")
    ap.add_argument("--x", type=float, nargs=2, required=True, metavar=("X0", "X1"), help="字句 box 左右邊（設計座標）")
    ap.add_argument("--text", choices=["light", "dark"], required=True, help="字句色：light＝深底淺字，dark＝淺底深字")
    ap.add_argument("--scale", type=float, default=1.0, help="匯出像素／設計座標（存檔頁 1000px 匯出＝2）")
    ap.add_argument("--min-gap", type=float, default=5.0, help="最小間隙（設計座標 px，預設 5）")
    args = ap.parse_args()

    img = np.array(Image.open(args.image).convert("RGB"))
    s = args.scale
    y_start = int(np.ceil(args.image_bottom * s)) + 1
    top = find_ink_top(img, y_start, int(args.x[0] * s), int(args.x[1] * s), args.text)
    if top is None:
        print("❌ 掃唔到字句墨水：檢查 --x／--text／--scale 或匯出頁碼", file=sys.stderr)
        sys.exit(2)
    ink_top = top / s
    gap = ink_top - args.image_bottom
    print(f"圖／片底邊 {args.image_bottom:.2f}｜字句墨水頂 {ink_top:.2f}｜間隙 {gap:.2f}（設計座標 px，最小 {args.min_gap}）")
    if gap < args.min_gap:
        print("🔴 間隙不足：圖／片壓住或太貼字句，縮細再交（底邊＝字句 box top −0.29×字號）")
        sys.exit(1)
    print("✅ 間隙足夠")


if __name__ == "__main__":
    main()
