# /canva-auto — 記念短片新單全流程（SOP v3 + diff-learning）

**用途**：接到 Fat Mo 一句「canva-auto 新單」+ 訂單資料，走完 Canva 記念短片開殼→加工→換料→學習→出貨全流程。內建 diff-learning 校正回饋迴圈（同 3D pipeline 樣本庫同一原理）。
**觸發指令**：`/canva-auto` 或對話講「canva-auto 新單」
**版本**：v1.0.0（2026-07-11，S164 新建；經 /8d 自我迭代後落盤）
**依賴**：Canva MCP（Claude Code 端配置；Antigravity 環境無此 MCP，本指令不可攜）、本地 python + rembg（`canva_auto/local_prep.py`）
**數值唯一真理來源**：`canva_auto/placement_memory.json`——本檔與記憶檔只放流程，**不放任何座標/尺寸數值**；錨點一律開單時從 JSON 讀。

⚠️**2026-07-27 Canva MCP API 大改版（Meika 0600904 首次撞到）**：`start-editing-transaction`/`perform-editing-operations`/`commit-editing-transaction`/`cancel-editing-transaction`/`get-design-thumbnail`/`get-design-pages`/`get-design`/`get-export-formats` 呢批舊工具已經全部消失，換咗兩個新工具：
- `read-design`（`design_id`+`open_transaction:true`）——攞 `transaction_id`＋成份 design content（markdown，每個元素帶 `[locator_id]`，即element_id）＋thumbnail
- `edit-design`（`transaction_id`+`page_index`+`operations`+`finalize`）——**一個 call 只可以改一個 page**（同舊API可以夾雜多頁唔同，操作前必須逐頁分開call），`finalize` 三選一：`keep_open`(預設，做完仲開住)／`commit`(永久儲存，operations必須留空)／`cancel`(捨棄，operations必須留空)。**commit/cancel 唔可以同operations一齊傳**。
- 每次 `keep_open` 都會逼你「STOP」先比對 before/after thumbnail 先可以再編輯（工具回應內建驗證提示，唔係我自己加嘅規矩）。
- `search-designs`／`copy-design`／`move-item-to-folder`／`get-assets`／`export-design` 呢批冇改，維持原名同用法。
- 舊嘅「transaction TTL 好短」教訓喺呢個新API底下仲未驗證是否仍然存在，下次撞到再補充。

---

## 輸入參數（Fat Mo 提供）

客人名 / 字句 / 款式（全幅=5頁、純音樂=4頁）/ 訂單編號 / 素材 folder 路徑（`Free_recorder/已登記/...`）。
素材檔名慣例（永久規則，勿問）：`WhatsApp Video *.mp4`=客人原始片；`Video 1.mp4`=Lovart 動畫；`彩色圖.png`/`黑白圖.png`=Lovart 圖對。

---

## Step 0 — 補課檢查（開單前強制）

讀 `canva_auto/placement_memory.json`：若最後一個 case 的 `learned` ≠ true，先對該單 design 開唯讀 transaction 讀取 Fat Mo 最終幾何，diff 落庫（`learned: true` + convergence_log 補記），**先補課、後開新單**。學習不依賴上一單收尾時有沒有講「改好了」。

## Stage ① — AI 開殼

1. **搵母片（2026-07-27 起優先序改變，Meika 0600904 定案）**：先用 `mutagen`（`from mutagen.mp3 import MP3; MP3(path).info.length`）讀本單 `WhatsApp Audio *` 音長（秒，1位小數）。`search-designs` 攞同款式全部母片後，**優先揀音長最接近嘅**；音長打平手先睇建立日期，揀**最接近**（唔係最新）嗰個——因為建立時間相近代表版式演進階段接近，比純粹「最新」更適合做母片。**排除 PILOT_/測試前綴/自動化次品**，優先 Fat Mo 人手正版。
2. `copy-design` → **一氣呵成**開 transaction：`update_title` 改名 `{客人名} 全幅AI短片({DDMM}/26) {音長}sec`（例：`Meika 純音樂 (2707/26) 35.0sec`；copy-design 的 title 參數不生效）+ `replace_text` 換 page2/3/4 字句（拆行決策表見記憶檔）→ 即刻 commit，**不得中途停等**
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
3. **一氣呵成**：`update_fill` 換入四類格（page2 圖對/page3 細圖對+直片/page4 動畫）→ **逐格校正**（見下方「零裁切鐵律」，2026-07-27 起取代舊嘅 preserve_aspect_ratio 做法）→ `delete_element` 清 Fat Mo 臨時元素+上客殘留 → commit

### ⚠️ 零裁切鐵律（2026-07-27 Fat Mo 明文，Meika 0600904 定案，取代舊法）

**任何圖片/影片一律不准因遷就格仔大小而裁走任何部分。** 母版舊格嘅寬高比係上一個客素材嘅裁法，唔係規格，唔可以直接沿用。每次換料必須：
1. `get-assets` 查新素材原生 width/height，算出精確長寬比
2. `resize_element(preserve_aspect_ratio=false)`，**width/height 都按新素材長寬比明確計算傳入**（唔准淨傳一個值靠 preserve_aspect_ratio 推算——見下面 Known failure modes 解釋點解會出事）
3. `position_element` 置位（可沿用案例庫錨點嘅中心點，但闊高改晒）
4. **`crop_media(top=0, left=0, width=<新寬>, height=<新高>)` 明確重設裁切**——實測證實純粹 resize 唔會自動清走舊 crop offset（母版本身殘留住舊素材嘅裁切變換，換咗新 asset 都唔會歸零），必須明確 crop_media 先至令 imageBox 變返 `(0,0 寬×高)` 即完全冇裁切
5. 縮圖眼證時檢查 imageBox 係咪 `(0,0 W×H)`——唔係就即係仲有裁切，要再 crop_media 一次
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
- **即使 resize_element 傳咗同 asset 完全吻合嘅長寬比，元素仍可能保留裁切**（Meika 0600904 實測）：呢個 container 之前畀 update_fill 換過好幾手唔同 asset，每手都可能經過人手 crop 調校，呢啲 crop 參數（imageBox offset）唔會因為外層 resize_element 而重設——即使新 container 比例同新 asset 完全一致，imageBox 都可能仲係舊嘅 offset+放大版本（例：577×577 container 但 imageBox 顯示 603.81×603.81 帶負 offset）。**必須額外顯式 call `crop_media(top=0,left=0,width=<container寬>,height=<container高>)`** 先會真正歸零裁切，resize_element 本身唔夠。
- 新 API（`edit-design`/`read-design`）下，`operations` 陣列**一個 call 只可以改一頁**（`page_index` 對應嗰一頁），跨頁操作要分開幾個 call，唔似舊 API 可以夾雜多頁。

## 執行規則

- 不派 subagent（Canva MCP 在主 session，派工斷 context）
- 不用 loop/cron（訂單為 Fat Mo 事件驅動）
- 業務背景/母版政策/字句拆行決策表住在記憶檔 `project_canva_video_automation.md`；本檔只管流程順序與鐵律

## 版本更新日誌

- v1.0.0（2026-07-11，S164）：初版。SOP v3 + diff-learning 迴圈 + /8d 迭代三修正（開單補課制、transaction 一氣呵成鐵律、數值唯一真理來源歸 JSON）
- v1.1.0（2026-07-27，Meika 0600904）：Canva MCP API 大改版適配（edit-design/read-design 取代舊transaction工具）；新增零裁切鐵律（resize_element唔夠，必須加 crop_media 明確歸零）；母片搜尋優先序改為「音長最接近→建立日期最接近」取代純「最新單」政策；設計標題新增音長標記（`{DDMM}/26) {音長}sec`）
