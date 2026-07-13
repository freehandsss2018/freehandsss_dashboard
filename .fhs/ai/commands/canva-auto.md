# /canva-auto — 記念短片新單全流程（SOP v3 + diff-learning）

**用途**：接到 Fat Mo 一句「canva-auto 新單」+ 訂單資料，走完 Canva 記念短片開殼→加工→換料→學習→出貨全流程。內建 diff-learning 校正回饋迴圈（同 3D pipeline 樣本庫同一原理）。
**觸發指令**：`/canva-auto` 或對話講「canva-auto 新單」
**版本**：v1.0.0（2026-07-11，S164 新建；經 /8d 自我迭代後落盤）
**依賴**：Canva MCP（Claude Code 端配置；Antigravity 環境無此 MCP，本指令不可攜）、本地 python + rembg（`canva_auto/local_prep.py`）
**數值唯一真理來源**：`canva_auto/placement_memory.json`——本檔與記憶檔只放流程，**不放任何座標/尺寸數值**；錨點一律開單時從 JSON 讀。

---

## 輸入參數（Fat Mo 提供）

客人名 / 字句 / 款式（全幅=5頁、純音樂=4頁）/ 訂單編號 / 素材 folder 路徑（`Free_recorder/已登記/...`）。
素材檔名慣例（永久規則，勿問）：`WhatsApp Video *.mp4`=客人原始片；`Video 1.mp4`=Lovart 動畫；`彩色圖.png`/`黑白圖.png`=Lovart 圖對。

---

## Step 0 — 補課檢查（開單前強制）

讀 `canva_auto/placement_memory.json`：若最後一個 case 的 `learned` ≠ true，先對該單 design 開唯讀 transaction 讀取 Fat Mo 最終幾何，diff 落庫（`learned: true` + convergence_log 補記），**先補課、後開新單**。學習不依賴上一單收尾時有沒有講「改好了」。

## Stage ① — AI 開殼

1. `search-designs` 按款式搵最新母片（**Fat Mo 人手正版**優先，排除 PILOT_/測試前綴/自動化次品）
2. `copy-design` → **一氣呵成**開 transaction：`update_title` 改名 `{客人名} 全幅AI短片({DDMM}/26)`（copy-design 的 title 參數不生效）+ `replace_text` 換 page2/3/4 字句（拆行決策表見記憶檔）→ 即刻 commit，**不得中途停等**
3. `move-item-to-folder` 歸檔 `Free_recorder (MM/26)`
4. 本地 `python canva_auto/local_prep.py --color 彩色圖.png --bw 黑白圖.png --out-dir {folder}/local_prep_out/`（勿漏——S164 曾漏做）
5. 交編輯連結俾 Fat Mo

## Stage ② — Fat Mo 人手

片去背（page3 背景層 + **page4 須另出方形去背成品**，非原始直片）＋上載（圖 upload 即可；片必須拖落 design 任一頁先見到 asset id）。
⚠️**純音樂款額外必做**：上載客人真實音訊（`Free_recorder/已登記/{客人}/WhatsApp Audio *`）落設計音軌，取代母片繼承嘅預設音樂（S171續III 0800802 血訓：AI 全程冇問過音軌，Fat Mo 都冇上傳，出咗貨先發現）。
完成後話 AI 知。

## Stage ③ — AI 換料＋比例校正

1. 開 transaction 讀 fills 搵新 asset id → `get-assets` 查**檔名+原始 WxH**（勿靠估邊張係邊張）
2. 查 `placement_memory.json` 相似長寬比案例，計出各格目標 box（無案例時用最近似案例等比推算）
3. **一氣呵成**：`update_fill` 換入四類格（page2 圖對/page3 細圖對+直片/page4 動畫）→ **逐格 `resize_element(preserve_aspect_ratio=true)` + `position_element` 校正**（⚠️ update_fill 繼承舊格裁法，繼承座標 ≠ 繼承正確比例，S164 血訓）→ `delete_element` 清 Fat Mo 臨時元素+上客殘留 → commit
4. 縮圖眼證交 Fat Mo（draft 縮圖攞唔到就用 perform 回傳嘅 thumbnails url 或 commit 後 `get-design-pages`）

### Stage③ 人手補完提醒（AI 做唔到，靠 Fat Mo 記得）

- page2 圖對建議加「進場動畫」（例：黑白圖=墨水/汙漬，彩色圖=模糊類）——`perform-editing-operations` 冇 animation operation type，AI 完全掂唔到，純文字提示。
- 音軌／過場／頁面時長：同上，MCP 掂唔到，全部人手。

## Stage ④ — 學習＋出貨

- Fat Mo 有改 → 佢改完後讀 diff 落 `placement_memory.json`（case + convergence_log + `learned: true`）；規律 **≥3 單收斂**先升格寫入記憶檔規則層
- Fat Mo OK → `get-export-formats` → `export-design` MP4 `horizontal_1080p` + 封面 JPG（page2、1280×720、**`quality` 必填**）→ 交連結（提醒有效期約 4 小時）→ 本 case 記 `learned: true`

---

## Known failure modes（追加區，見 05 §1 權限）

- editing transaction TTL 極短（分鐘級）：中途等用戶回覆即過期報 `not found`，全部 operations 重做——所有等待位必須在 transaction 之外
- `get-design-thumbnail` 在 transaction 內報 `Not allowed`（本帳號系統性）：改用 get-assets 縮圖或 commit 後 get-design-pages
- 縮圖 URL 帶 `fallbackstale=T` = 過時快取不可信，重攞或直接出 export
- page 根 video 元素（背景模糊層）`update_fill` 報 invalid duration，屬人手位
- export jpg 的 `quality` 為必填（報 `'quality' must not be null`）；mp4 用字串 `horizontal_1080p`
- 本地檔案 MCP 上載不到（只收公開 URL）；上載區列不出 video
- `resize_element` 嘅 `preserve_aspect_ratio=true` 保留嘅係**目前 element container 現有比例**，唔係 asset 原生像素比例！Fat Mo 拖入新素材時 Canva 預設 container 形狀（例：864x864 方形）可能同新 asset 原生比例（例：960x1920 直向）完全唔同，淨傳 height 靠 preserve_aspect_ratio 推算會保留錯咗嘅 container 舊比例，導致變形/重疊（S171續III 0800802 首見）。**凡新素材原生比例明顯異於現有 container 比例時，必須明確傳 width+height（preserve_aspect_ratio=false），唔可以淨靠 preserve_aspect_ratio 自動推算。**

## 執行規則

- 不派 subagent（Canva MCP 在主 session，派工斷 context）
- 不用 loop/cron（訂單為 Fat Mo 事件驅動）
- 業務背景/母版政策/字句拆行決策表住在記憶檔 `project_canva_video_automation.md`；本檔只管流程順序與鐵律

## 版本更新日誌

- v1.0.0（2026-07-11，S164）：初版。SOP v3 + diff-learning 迴圈 + /8d 迭代三修正（開單補課制、transaction 一氣呵成鐵律、數值唯一真理來源歸 JSON）
