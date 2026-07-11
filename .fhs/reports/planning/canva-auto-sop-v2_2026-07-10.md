# canva-auto SOP v2.1 — 三段式人機接力方案書

- **日期**：2026-07-10（S163）
- **狀態**：Fat Mo 已批「正式落盤」；三段式流程即刻生效，pilot 項待下單驗證
- **上游**：S155 YouTube+NFC 工作流（本 SOP 係佢嘅內容生產段）
- **實戰基準**：Pangonyi 訂單 0600907
  - 自動化次品（保留對照）：`DAHO-PAbfUk` Pangonyi 全幅AI短片(1007/26)
  - Fat Mo 人手正版教材：`DAHO-t6d-Eo`（shortlink g9frzbf4madef2z）
- **關聯記憶**：`project_canva_video_automation.md`（canva-auto 召喚詞，已同步 v2 內容）

---

## 一、點解要改版（舊方案核心假設錯誤）

舊方案（S157 pilot）假設：**換料 = 拎 raw 上載直接塞入母版格**。

Pangonyi 首單實戰證明錯：素材上頁前必須先加工，而加工三步全部係 Canva Apps（編輯器 UI 專屬），Connect API / MCP 完全冇入口（Canva 官方 help 已確認）：

1. **魔法抓取（Magic Grab）**：黑白圖 + Lovart 彩色圖都要抽主體、刪背景，唔准白底方圖直接擺
2. **ColourMix App**：去背後嘅黑白圖轉 **Parakeet** 色
3. **背景移除（video）**：page4 Lovart 短片去背；擺位不得遮蓋下方字句

另外兩個工序事實：
- page2 嘅黑白（Parakeet）+彩色圖對加工完成後要**人手調較對齊一齊擺位**（貼合母版紫色 blob）
- page3 右下小圖 = **page2 成品嘅縮小版**（繼承全部加工，唔係獨立素材）

結論：自動化形態由「全自動換料」降級為「**三段式人機接力**」。

---

## 二、SOP v2.1 三段式流程（生效版）

| 段 | 負責 | 步驟 |
|---|---|---|
| **① 開單準備** | AI | 1. `search-designs` 按款式搵最新母片（動態最新單政策，排除 PILOT_/測試前綴）<br>2. `copy-design` 複製<br>3. 事務內 `update_title` 改名 `{客人名} 全幅AI短片({DDMM}/26)`（⚠️ copy-design 嘅 title 參數唔生效，必須補呢步）<br>4. `move-item-to-folder` 歸檔 `Free_recorder (MM/26)`（按當月）<br>5. `replace_text` 換 page2/3/4 字句（page4 = 同一主字句；排位規則見記憶檔決策表）<br>6. 交編輯連結俾 Fat Mo |
| **② 素材加工** | Fat Mo | 1. 開複本，上載 raw 素材（本地檔案 MCP 上載唔到，人手拖）<br>2. 黑白圖：魔法抓取抽主體→刪背景→ColourMix 轉 Parakeet<br>3. Lovart 彩色圖：魔法抓取抽主體去背<br>4. 片去背：page4 Lovart 短片；page3 背景模糊層換片（page 根 video 元素 API 換唔到，`invalid duration`）<br>5. 大致擺位，完成後話 AI 知 |
| **③ 收尾出貨** | AI | 1.（pilot）`position_element`/`resize_element` 按母版座標粗對位；page3 縮小版照母版比例（≈0.38×）擺位<br>2. `delete_element` 清走上個客殘留元素<br>3. QA：文字 bounding box 爆格檢查 + 新鮮縮圖眼證（⚠️ 縮圖 URL 帶 `fallbackstale=T` = 過時快取不可信，必須重攞）<br>4. `export-design` MP4 `horizontal_1080p` + 封面 JPG（page2，1280×720）<br>5. 交下載連結（提醒有效期約 4 小時） |

**同 Pangonyi 首單做法嘅關鍵分別：次序反轉。** 首單係 AI 先換字換 fill、Fat Mo 補加工執手尾（錯）。正確係 AI 先開殼 → Fat Mo 專心藝術加工 → AI 執尾。Fat Mo 全程唔使碰：改名、歸檔、換字、刪殘留、匯出、封面格式。

---

## 三、Pilot 項（下單驗證）

### P1：③段自動粗對位
母版每個素材位座標/尺寸 API 全部攞到（例 page2 圖對 left≈619, top≈146–151, w≈662–681）。Fat Mo 加工完隨手擺，AI snap 返母版位。
**已知限制**：去背主體形狀每單唔同，座標對齊 ≠ 視覺重心啱，最終仍需 Fat Mo 眼證。試一單先知值唔值保留。

### P2：圖片加工搬出 Canva 本地做（可選，Fat Mo 話事）
- 魔法抓取去背 → 本地 rembg（開源）一條命令
- ColourMix Parakeet → Fat Mo export 一張加工成品黑白圖，AI 反推色譜映射（LUT），以後本地重現
- 如質素過關，Fat Mo 人手步驟由 5 步減至 2 步（上載+擺位、片去背）
- **風險**：色準/去背邊緣未必及 Canva Apps；**片去背唔搬**（本地質素風險大）
- 啟動條件：Fat Mo export 一張 Parakeet 成品圖俾 AI

---

## 四、能力邊界總表（本 session 實測）

| 動作 | MCP 得唔得 | 備註 |
|---|---|---|
| copy / 改名 / 歸檔 | ✅ | 改名必須用事務內 `update_title` |
| 換字（含 \n 排位） | ✅ | 排位決策表見記憶檔 |
| 換圖/片 fill（普通格） | ✅ | page3 直片格、page4 動畫格實測 OK，動畫首幀正常 |
| page 根 video（背景模糊層） | ❌ | `invalid duration`，人手換 |
| 本地檔案上載 | ❌ | 只收公開 URL；人手拖 |
| 影片 asset 檔名反查 id | ❌ | list-folder-items 唔支援 video；但擺入 design 後事務內見到 |
| Canva Apps（魔法抓取/ColourMix/片去背） | ❌ | 編輯器 UI 專屬，結構性冇 API |
| 匯出 MP4/JPG | ✅ | 連結有效期約 4 小時 |
| 縮圖驗證 | ⚠️ | `fallbackstale=T` = 過時快取，必須重攞新鮮 URL |

---

## 五、誠實價值評估

全部做齊後，本自動化上限 = 慳走行政雜務（改名/歸檔/換字/排位/QA/匯出），估計每單 5–10 分鐘 + 零犯錯。**藝術核心（去背質素、調色、構圖對齊）永遠係 Fat Mo**。呢條線唔會變成 3D pipeline 嗰種端到端自動化——Canva 平台結構決定，唔係努力問題。

Dashboard 拖拉介面 / n8n 橋接方案已於 2026-07-08 查證不可行並擱置（Autofill 需 Enterprise、Design Editing API 需自起 Canva App），本方案書唔重開呢題。

---

## 六、SOP v3 增補（2026-07-11 S164 Testing123 試單裁定，取代 §二 嘅 Stage②/③ 分工）

核心突破：**擺位完全歸 AI**。母版複本入面上個客嘅素材格（page2 圖對、page3 右下細圖對＋直片、page4 動畫格）座標尺寸全部現成，AI 用 `update_fill` 將新素材換入原格即自動繼承位置，唔使人手擺、唔使 Stage③ 粗對位 pilot（P1 廢除）。

**diff-learning 校正回饋迴圈（S164 Fat Mo 批准，同 3D pipeline 樣本庫同一原理）**：案例庫 `canva_auto/placement_memory.json`。每單固定尾步——換 fill 前查案例庫預測擺位→縮圖眼證→Fat Mo 微調→改好後 AI 讀 diff 落庫；收斂規律（≥3 單）先升格入記憶檔規則層。convergence_log 追蹤每單修正格數，目標第 5-6 單起 Fat Mo 基本唔使改。

> ⚠️ **S164 hiumanthm 實戰修正：update_fill 繼承座標 ≠ 繼承正確比例。** 舊格尺寸係上一單素材嘅裁法；新素材長寬比唔同就變形（page4 曾將 960×1920 直片塞入 836×627 橫格）。換 fill 後必須用 `get-assets` 攞原始 width/height → `resize_element(preserve_aspect_ratio=true)` → `position_element` 錨點對齊（錨點標準見記憶檔 project_canva_video_automation「比例校正錨點標準」段）。page4 素材必須係 Fat Mo 另出嘅方形去背成品，非原始直片。

| 負責 | 步驟 |
|---|---|
| **AI（先）** | copy 最新人手正版母片→事務內 update_title 改名→歸檔→replace_text 換字→本地 `canva_auto/local_prep.py` 出 `彩色圖_cutout.png`+`黑白圖_parakeet.png`（P2 已落盤工具） |
| **Fat Mo（僅 2 步）** | ① 片去背（page3 直片/page4 動畫）② 上載：兩張已加工圖 upload 即可；**短片必須拖落 design 任何一頁**（API 列唔到上載區 video）→話 AI 知 |
| **AI（尾）** | 搵 asset id→update_fill 換入四類格（零擺位）→delete_element 清臨時元素+上客殘留→QA 縮圖→export MP4+封面 JPG(page2) |

新增能力邊界（S164 實測）：`get-design-thumbnail` 喺 editing transaction 內可能報 `Not allowed`（draft 縮圖攞唔到）——commit 後改用 `get-design-pages` 攞縮圖 QA（fallbackstale 陷阱照舊）。

Testing123 試單殘留：複本 `DAHPDTTXCPw`（改名+換字 draft 未 commit，會失效；design 本體仍在，下次新單直接重新 copy，呢個測試複本可刪）。
