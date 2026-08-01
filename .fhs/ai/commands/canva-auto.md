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

## 🏆 黃金參考案例：HoKaSin 0601100（2026-08-01 Fat Mo 判定「完美完成」，日後照呢個做）

母片 olibbvia `DAHQL6lGRIE` → 成品 `DAHRBN0H_cg`。**全程只用 4 種 operation，零 `resize_element`／零 `position_element`（媒體）／零 `delete_element`**：

| 步 | operation | 目標 |
|---|---|---|
| 1 | `copy-design` | 由母片複製，元素連動畫一齊繼承 |
| 2 | `update_title` | `{客人} {款式} ({DDMM}/26) {音長}sec` |
| 3 | `replace_text` ×2 | page2／page3 字句 |
| 4 | `update_fill` ×4 | **母片原有元素**換媒體（絕不刪、絕不 resize） |
| 5 | `crop_media` ×4 | imageBox 設成**媒體原生 aspect** 嘅 cover box（Canva 會自動 clamp） |
| 6 | `position_element` ×2 | **只限字句**，對齊花環中心 960（見下） |

成果：大小 ✅／元素顯示時間 ✅／動畫 ✅ 全部由母片完整繼承，Fat Mo 零重設。

**點解成功**：母片元素一個都冇刪 → 動畫連住元素繼承；container 幾何一律唔郁 → 動畫唔會被重算；只調 imageBox（crop_media 已證實安全）令媒體零變形。

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

1. 開 transaction 讀 fills 搵新 asset id → `get-assets` 查**檔名**（勿靠估邊張係邊張）。⚠️ **但 `get-assets` 報嘅 video WxH 會錯**（HoKaSin 0601100：本地原檔 1440×1440 正方，Canva 報 1080×2160 直片）——尺寸一律以**本地原檔**為準：`python` 讀 mp4 `tkhd` atom 尾 8 bytes（32.16 定點）即得真值，唔使 ffprobe。次選核對法：同一回應內**縮圖 aspect vs metadata aspect 唔一致＝metadata 錯，信縮圖**。
2. 查 `placement_memory.json` 相似長寬比案例，計出各格目標 box（無案例時用最近似案例等比推算）
3. **一氣呵成**：`update_fill` 換入四類格（page2 圖對/page3 細圖對+直片/page4 動畫）→ **逐格校正**（見下方「零裁切鐵律」，2026-07-27 起取代舊嘅 preserve_aspect_ratio 做法）→ `delete_element` **只准刪 Fat Mo 拖入嘅臨時元素**（見下方「元素保命鐵律」）→ commit

### 🔴 元素保命鐵律（2026-07-31 HoKaSin 0601100 血訓，優先級高於下面任何一條）

**動畫／元素顯示時間／頁面時長係附喺「元素」身上，唔係附喺「圖片素材」身上。** 母片 `copy-design` 落嚟嗰陣，連元素連動畫一齊繼承；一旦 `delete_element` 刪走母片元素，動畫就永久消失，而 **MCP 完全冇 API 補得返**（27 個 operation 冇一個掂到動畫／時長）。

**鐵律：母片帶落嚟嘅素材元素，任何情況下都唔准刪。** 換料一律用 `update_fill` 喺原元素上換媒體。Fat Mo 拖入嘅新元素係「臨時件」——刪嗰啲，唔係刪母片嗰啲。

判斷方法：`copy-design` 之後即刻 `read-design` 記低母片元素 locator_id（例 Meika 系：`LBxgyF0fd0WZbT7J`／`LB0wWsLNwJJf9lvB`／`LBcmP2V1RC2HlLDp`／`LBDXmPZS466VsHHW`）。Stage③ 再讀時，**ID 對得上嘅＝母片元素（保）；ID 對唔上嘅＝Fat Mo 臨時拖入（刪）**。

血訓實錄：HoKaSin 連錯 3 次，每次都係保留咗 Fat Mo 新拖入嘅乾淨元素、刪走母片載住動畫嘅元素，令 Fat Mo 每次都要重新設動畫。Fat Mo 第一次已明示「**用代替的方法去取代新舊版，而不是先刪除舊片或圖，這樣能保留設定**」，AI 連續兩次再犯。對照組 Meika 0600904 全程 `update_fill` 母片元素、只刪臨時件 → Fat Mo 零人手、一次過完美。

**兩級破壞力（2026-08-01 HoKaSin 對照實驗更正，⚠️ 推翻 2026-07-31 舊結論）**：
- `delete_element`＝**永久性破壞**，動畫連元素一齊消失，MCP 補唔返（見上）
- `resize_element`／`position_element`＝**會改動動畫同元素顯示時間**（未確定係重設定定重算，但實測必變）

### 🔴 幾何凍結鐵律（2026-08-01 HoKaSin 0601100 對照實驗）

**動畫一經設定（無論係 Fat Mo 人手設，定係由母片繼承），該元素就唔准再做 `resize_element` 或 `position_element`。**

對照證據（同一個 design、同一次作業）：

| | page2（Fat Mo 驗收三項全對 ✅） | page3（顯示時間+動畫全錯 ❌） |
|---|---|---|
| `update_fill` | 做咗 | 做咗 |
| `crop_media` | 做咗 | 做咗 |
| `resize_element` | **冇做** | 做咗 |
| `position_element` | **冇做** | 做咗 |

page2 因為母片幾何本身已啱、唔使 resize/position，三項指標全部保住。page3 做咗就爛。時序更確診：Fat Mo 已驗收「動畫全部正常」**之後**，AI 再做多一次 Video 3 嘅 resize/position/crop，動畫即刻由「矇糊」變「湧出」。

**（`crop_media` 未定罪）**——兩頁都做過 crop_media，page2 完好，所以 crop_media 大機會安全。真兇範圍鎖定喺 `resize_element`／`position_element`。

**正確次序（唯一安全路徑）**：
1. AI **一次過**做齊所有幾何（update_fill → resize → position → crop）
2. Fat Mo 驗收幾何 OK
3. Fat Mo 先設動畫／顯示時間
4. **之後任何人都唔准再郁該元素嘅幾何**——真係要改就預咗動畫要重設

反面教材：今次 AI 喺 Fat Mo 確認動畫正常之後先再改幾何，直接摧毀咗已驗收嘅成果。

### ⚠️ 零裁切鐵律（2026-07-27 Fat Mo 明文，Meika 0600904 定案，取代舊法）

**任何圖片/影片一律不准因遷就格仔大小而裁走任何部分。** 母版舊格嘅寬高比係上一個客素材嘅裁法，唔係規格，唔可以直接沿用。每次換料必須：
1. `get-assets` 查新素材原生 width/height，算出精確長寬比
2. `resize_element(preserve_aspect_ratio=false)`，**width/height 都按新素材長寬比明確計算傳入**（唔准淨傳一個值靠 preserve_aspect_ratio 推算——見下面 Known failure modes 解釋點解會出事）
3. `position_element` 置位（可沿用案例庫錨點嘅中心點，但闊高改晒）
4. **`crop_media` 重設裁切**——⚠️ **2026-08-01 重大更正：舊寫法 `crop_media(0,0,W,H)`（令 imageBox＝container）係錯嘅**，只喺 container 啱好等於媒體 aspect 時先啱。container 唔係媒體 aspect 時，強制 imageBox＝container 會**親手拉扁媒體**（HoKaSin Video 3 變窄嘅真兇）。
   **正確理解**：`imageBox` 係「媒體喺 container 座標系入面嘅矩形」，媒體會被**拉伸**填滿呢個矩形。所以 **imageBox 嘅長寬比必須永遠等於媒體原生長寬比**，先至零變形。container 可以唔係同一個比例（多出／少咗嘅部分自然被裁或留白）——**Fat Mo 人手母片正正就係咁做**（例：olibbvia container 581.13×569.68 但 imageBox 581.13×581.13 正方）。
   **實測行為**：`crop_media` 傳細過 cover 下限嘅值會被 Canva 自動 clamp 到 cover（contain 做唔到）。所以正確做法＝傳「維持媒體 aspect 嘅 cover box」，或者索性傳一個細值等 Canva 自己 clamp。
   計法（正方媒體、container W×H）：`box = max(W,H)`，`left = (W-box)/2`，`top = (H-box)/2`（會係負數）。
5. 縮圖眼證時檢查 imageBox 係咪 `(0,0 W×H)`——唔係就即係仲有裁切，要再 crop_media 一次
4. 縮圖眼證交 Fat Mo（draft 縮圖攞唔到就用 perform 回傳嘅 thumbnails url 或 commit 後 `get-design-pages`）

### Stage③ 人手補完提醒（AI 做唔到，靠 Fat Mo 記得）

- **片去背**：MCP 掂唔到。上載前必須自己去背。HoKaSin 0601100 就係 `Video 1.mp4` 未去背，出來一個灰色紙紋方框遮晒下層——**上載前用 get-assets 縮圖自查：見到硬邊方形底色＝未去背**。
- page2 圖對建議加「進場動畫」（例：黑白圖=墨水/汙漬，彩色圖=模糊類）——`edit-design` 冇 animation operation type，AI 完全掂唔到，純文字提示。
- 音軌／過場／頁面時長：同上，MCP 掂唔到，全部人手。
- ⚠️ **但如果母片元素冇被刪**（見「元素保命鐵律」），以上動畫／時長全部由母片繼承，Fat Mo **唔使重做**——Meika 0600904 就係咁做到零人手。人手補做只係「母片本身未設過」或者「今次要改效果」先需要。

### 📐 字句水平置中＝對齊「花環」中心，唔係對齊「家庭圖」中心（2026-08-01 HoKaSin 定案）

Fat Mo 原話：「**正中的意思是左右草框之間**」。

- ❌ 錯：對齊家庭圖 container 中心（HoKaSin 犯過——字句中心 951.46 啱好＝家庭圖中心 `663.695+575.53/2`）
- ✅ 啱：對齊**花環左右草框嘅視覺中心**

實測（export JPG 像素分析，非估算）：花環墨水**左右完全對稱**——左草框 design x `294.0→697.5`，右草框 `1179.0→1626.0`，外緣中點 `(294+1626)/2 =` **`960.0`**，同花環 container 中心完全吻合。

**所以規則好簡單：字句中心 = 960（頁面正中）**，即 `left = 960 - 字句box闊/2`。字句 box 闊 649.7629 時 → `left = 635.1185`。

⚠️ 呢個要用 `position_element`＝受「幾何凍結鐵律」管，所以**要改就趁 Fat Mo 未設動畫之前改**。

### ✅ Fat Mo 驗收三項指標（2026-08-01 明文，日後一律照呢三項逐頁報告）

每一頁（page2 圖／page3 片）都要逐項確認，唔可以籠統講「睇落 OK」：

| # | 指標 | AI 做唔做到 |
|---|---|---|
| 1 | **元素大小**（比例正確、零裁切） | ✅ AI 可做可驗（CDF `size` + `imageBox`） |
| 2 | **元素顯示時間** | ❌ AI 睇唔到亦改唔到（CDF 冇呢個欄位）→ 只能靠母片繼承或 Fat Mo 人手 |
| 3 | **動畫效果** | ❌ 同上 |

AI 交付時要主動講明：第 1 項我驗過（附數值），第 2、3 項我**睇唔到**，要 Fat Mo 眼證。唔准講「應該冇問題」。

## Stage ④ — 學習＋出貨

- Fat Mo 有改 → 佢改完後讀 diff 落 `placement_memory.json`（case + convergence_log + `learned: true`）；規律 **≥3 單收斂**先升格寫入記憶檔規則層
- Fat Mo OK → `get-export-formats` → `export-design` MP4 `horizontal_1080p` + 封面 JPG（page2、1280×720、**`quality` 必填**）→ 交連結（提醒有效期約 4 小時）→ 本 case 記 `learned: true`

---

## Known failure modes（追加區，見 05 §1 權限）

- editing transaction TTL 極短（分鐘級）：中途等用戶回覆即過期報 `not found`，全部 operations 重做——所有等待位必須在 transaction 之外
- `get-design-thumbnail` 在 transaction 內報 `Not allowed`（本帳號系統性）：改用 get-assets 縮圖或 commit 後 get-design-pages
- 縮圖 URL 帶 `fallbackstale=T` = 過時快取不可信，重攞或直接出 export
- **`edit-design` 回傳嘅 draft 縮圖係 1:1 正方、而頁面係 16:9 → 水平壓縮咗，唔可以用嚟判斷比例**（HoKaSin 曾因此誤判「已改正嘅正方片仲係窄」）。驗比例一律 `export-design` 出真 JPG 1280×720。
- **`get-assets` 嘅 video `metadata.width/height` 可以係錯**（HoKaSin `Video 3.mp4` 本地 1440×1440，Canva 報 1080×2160）。破綻＝同一回應內縮圖 aspect 同 metadata aspect 唔一致。尺寸真理源＝本地原檔 mp4 `tkhd` atom。
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
- v1.4.0（2026-08-01，HoKaSin 0601100 完工）：新增**黃金參考案例**（Fat Mo 判定「完美完成」嘅 6 步做法，日後照跑）；新增**字句置中規則**＝對齊花環中心 960（唔係對齊家庭圖中心，實測花環墨水左右完全對稱 294→697.5 / 1179→1626，外緣中點正好 960）；更正 `crop_media` 用法（imageBox 跟媒體 aspect 唔跟 container）
- v1.3.0（2026-08-01，HoKaSin 0601100 續）：⚠️**更正 v1.2.0 錯誤結論**——`resize_element`／`position_element` **會**改動動畫同元素顯示時間（v1.2.0 誤寫「唔會」）。新增**幾何凍結鐵律**（動畫設定後禁郁幾何）+ 正確次序（幾何做齊→驗收→設動畫→永久凍結）+ **Fat Mo 驗收三項指標**（大小/顯示時間/動畫，逐頁逐項報告，AI 要主動聲明第2、3項自己睇唔到）。對照證據：同一 design 內 page2 冇 resize/position＝三項全對，page3 做咗＝時間+動畫全爛。
- v1.2.0（2026-07-31，HoKaSin 0601100）：新增**元素保命鐵律**（母片元素永不可刪，動畫/時長附喺元素身上，刪咗 MCP 補唔返）——連錯 3 次先揪出，優先級最高；澄清 resize/position/crop 唔會清動畫（曾誤疑）；Stage② 補「片去背自查」（get-assets 縮圖見硬邊方底＝未去背）；澄清母片元素保住嘅話動畫/時長由母片繼承、Fat Mo 唔使重做
- v1.1.0（2026-07-27，Meika 0600904）：Canva MCP API 大改版適配（edit-design/read-design 取代舊transaction工具）；新增零裁切鐵律（resize_element唔夠，必須加 crop_media 明確歸零）；母片搜尋優先序改為「音長最接近→建立日期最接近」取代純「最新單」政策；設計標題新增音長標記（`{DDMM}/26) {音長}sec`）
