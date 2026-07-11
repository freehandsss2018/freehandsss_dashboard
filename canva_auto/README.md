# canva_auto

`canva-auto` 產品線嘅本地加工工具（SOP v2.1 Stage② P2 pilot）。

替代兩個 Canva App 手動步驟，全程本機執行，唔使開 Canva UI：

| Canva App | 本地替代 |
|---|---|
| 魔法抓取（Magic Grab）去背 | rembg / u2net |
| ColourMix → Parakeet 色譜 | 反推嘅線性色相漸變公式 |

## 安裝

```
pip install rembg[cpu] pillow numpy
```

## 用法

```
python local_prep.py --color 彩色圖.png --bw 黑白圖.png --out-dir 輸出資料夾/
```

輸出：
- `{彩色圖}_cutout.png` — 去背完嘅彩色圖，直接可以擺 page2/3
- `{黑白圖}_parakeet.png` — 去背 + Parakeet 色譜完嘅黑白圖，直接可以擺 page2/3

片去背（page4 動畫、page3 背景層）**未包含**——見方案書「唔搬」原因（本地質素風險大）。

## 已知限制

見 `local_prep.py` 檔頭 docstring。核心風險：Parakeet 公式假設任意輸入圖會拉伸貼合去
返 1563×1563 參考 canvas 座標系，呢個假設只喺兩張同為 1563×1563 嘅樣本上驗證過。

## 方案書

`.fhs/reports/planning/canva-auto-sop-v2_2026-07-10.md`
