# canva_auto

`canva-auto` 產品線嘅本地加工工具（SOP v2.1 Stage② P2 pilot）。

替代兩個 Canva App 手動步驟，全程本機執行，唔使開 Canva UI：

| Canva App | 本地替代 |
|---|---|
| 魔法抓取（Magic Grab）去背 | rembg / u2net；黑白圖另用彩色圖 mask 前置去封閉空位 |
| ColourMix → Parakeet 色譜 | 反推嘅線性色相漸變公式 |

## 安裝

```
pip install rembg[cpu] pillow numpy scipy
```

## 用法

```
python local_prep.py --color 彩色圖.png --bw 黑白圖.png --out-dir 輸出資料夾/
```

輸出：
- `{彩色圖}_cutout.png` — 去背完嘅彩色圖，直接可以擺 page2/3
- `{黑白圖}_parakeet.png` — 去背 + Parakeet 色譜完嘅黑白圖，直接可以擺 page2/3

片去背（page4 動畫、page3 背景層）**未包含**——見方案書「唔搬」原因（本地質素風險大）。

## 2026-09-21 改良（0600108 對比 Fat Mo Canva 版）

- 黑白圖去背：以彩色圖去背 mask 做前置（affine 對位＋白色連通區判斷），去到兩人之間封閉空位；IoU 對 Canva 版 0.860 → 0.981。兩張圖唔係同一構圖（對位 IoU < 0.90）會自動退回純 rembg 並印警告。
- 彩色圖去背：半透明 alpha 重映射，白衫邊少切（IoU 0.980 → 0.986）。
- Parakeet：飽和度預設 0.30 → 0.207、黑位抬高 0.20（`--black-lift 0` 還原舊行為）。
- 仍未做：外圍淺灰光暈、底部白衫沿用彩色去背 over-cut、Parakeet 線條上色未完全重現。
- 每單交付後請繼續同 Fat Mo Canva 版對比（CV-55），數據落 `placement_memory.json`。

## 2026-09-22 改良（0600512 Small Chan 對比 Fat Mo Canva 版，CV-56）

- **根源查明**：CV-54/55 嘅「彩色 mask 前置」只治標。白衫 over-cut 嘅真正根源係 rembg **預設 `u2net` 模型**對大片低對比白色（白衫近似米白紙底）saliency 信心唔夠——已改用 `REMBG_MODEL = "u2net_human_seg"`（人像專用模型，兩張圖共用同一 session）。
- 效果（同 Fat Mo Canva 版 IoU，原始 rembg 輸出）：彩色 0.882→0.969，黑白 0.784→0.945；全管線（含對位＋Parakeet）最終 IoU：彩色 0.968、黑白 0.945。
- 換模型後「彩色 mask 前置」對位 IoU 亦由 0.846（< FIT_MIN_IOU，冇觸發）回升到 0.964（正常觸發），CV-54 機制**保留唔刪**，作為補漏。
- 試過但唔採用：`alpha_matting=True`（彩色再加少少但慢 3 倍、黑白冇提升）；`isnet-general-use`（彩色最勁 0.989 但線稿災難性失敗 0.364，唔可用於黑白圖）。
- 仍未做：外圍淺灰光暈、髮絲邊緣軟化程度同 Canva 版仲有少量差異（未量化）。

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
