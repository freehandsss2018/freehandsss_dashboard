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

見 `local_prep.py` 檔頭 docstring。v2（2026-07-13, 0800802 案）改用正規化座標
（u=x/寬, v=y/高）反推，已捨棄舊版「拉伸貼合 1563×1563 參考 canvas」假設；
新公式淨係啱返反推嗰刻用嘅一組 Canva ColourMix 滑桿數值，換咗滑桿數值需要
用 `sample_gradient_fit.py` 攞新樣本重新擬合。

## 反推工具

`sample_gradient_fit.py` — 從 Canva 原生 ColourMix 輸出樣本，用相位差分法反推
`local_prep.py` 嘅 HUE_A_DEG/HUE_B_DEG/HUE_C_DEG/DEFAULT_SATURATION 常數：

```
python sample_gradient_fit.py <canva原生輸出樣本.png>
```

## 方案書

`.fhs/reports/planning/canva-auto-sop-v2_2026-07-10.md`；v2 公式重擬合記錄見
`placement_memory.json` order 0800802。
