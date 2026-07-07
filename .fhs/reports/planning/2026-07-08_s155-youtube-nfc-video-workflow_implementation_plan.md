# S155 — YouTube + NFC 記念影片工作流實施計畫

> **日期**：2026-07-08
> **規劃**：Fable 5（本檔為敘事單源，全文唯一居所，依 D13 合約）
> **編號註記**：原以 S154 命名，因迴圈硬化執行 session 同日已佔用 S154，改編號 S155（不影響內容）
> **執行**：Sonnet 5 — 開新 session 只需開本計畫檔，不需重跑規劃期澄清
> **狀態**：⏳ 待 Fat Mo 批准
> **範圍**：W1–W4（W5 明文不做，見 §7）

---

## §0 緣起與已定裁決

### 0.1 背景

FHS 為客人製作記念短片（客人 WhatsApp 傳原片 → Fat Mo 用 Canva 製作），現行走 Spotify（V42 狀態「已做音訊」即此產品線），痛點 = 客人要先裝 Spotify app。新方案：影片上傳公司 YouTube 頻道（@Free_handsss），NFC 貼紙貼木框內，客人手機一拍即開片。

規劃期發現兩個系統盲區：(a) V42 對此產品線只有 `已做音訊` process status 字串，**無任何欄位儲存影片連結**（連現行 Spotify link 都散落 WhatsApp 無入系統）；(b) `.fhs` 知識庫 grep 零 Spotify 記錄，產品線從未落盤。本計畫一併補此洞。

### 0.2 已定裁決（規劃期 8 問 8 答，Fat Mo 2026-07-08）

| # | 問題 | 裁決 |
|---|------|------|
| 1 | 月產量 | **5–15 支/月** |
| 2 | YouTube 可見度 | **Unlisted（不公開）** |
| 3 | 上傳方式 | **半自動**（人手拖檔上傳，周邊全自動；不申請 Google API 稽核） |
| 4 | NFC 連結 | **直連 YouTube URL**（已知代價：重傳片=重寫貼紙） |
| 5 | 成品落點 | 下載到電腦資料夾 + NAS 備份（Synology Drive 自動同步） |
| 6 | 訂單整合 | **寫入系統**（Supabase + V42 顯示）；影片屬後期製作，連結不發客人，客人只拍 NFC |
| 7 | Spotify 去留 | **新單只做 YouTube**，舊單不回溯 |
| 8 | NFC 硬體 | 已有 NFC 貼紙 + 手機寫入（NFC Tools 類 app） |

### 0.2b 補充裁決（第 3 輪 4 問，Fat Mo 2026-07-08）

| # | 問題 | 裁決 |
|---|------|------|
| 9 | 上傳頻道 | **@Free_handsss**（freehandsss2018@gmail.com），不另開頻道 |
| 10 | 標題格式 | **`{客人名} - {刻字}`**（如 `Andrea - Our bundle of joy`）；刻字係 IG/WhatsApp 對話問客人想刻喺木框嘅字，已存於訂單 `order_items.engraving_text` |
| 11 | 描述 | 固定文案（見 §2.3 模板；IG/WhatsApp 帳號正確寫法執行時問 Fat Mo） |
| 12 | 封面圖 | **Canva 生成、每單自訂**，與影片同存「一客一專檔」資料夾（片+封面） |

### 0.3 規劃期現場盤點（2026-07-08 快照；行號執行時以 grep 重定位，勿直接信行號）

| 事實 | 證據 |
|------|------|
| 本地 migration 最大 = `0048`；**0049 已 live**（S150 F2 `fhs_write_expense_log`）但本地缺檔——本地資料夾有滯後前科（0039-0041 亦曾缺漏） | `supabase/migrations/` glob + handoff S150 條目 |
| **0050/0051 已預留**俾 S150 Phase 4-6（P1a verified_ok / P1b anon 權限收斂） | S150 計畫檔 §4.5 起 |
| decisions.md 最大編號 = ~~D17~~ **D18**（前提過期：D18 已被同日 S156 blocktempo 吸收 session 佔用）→ 本計畫用 **D19**，執行時仍以「檔尾最新編號+1」為準 | decisions.md grep（2026-07-08 S156 更新） |
| 前端有現成泛用 RPC helper `_fsRpc(fn, body)` | V42 約 L14597 |
| `mapOrder`：`o.id` = FHS 訂單字串、`o._uuid = row.id` = Supabase UUID | V42 約 L14023；auto-memory pitfall 已載 |
| 詳情 modal 入口 = `openOrderModal(orderId, catFilter, initialTab)` | V42 約 L9847，`window` 已暴露 L13635 |
| 剪貼簿：現有 `navigator.clipboard.writeText` 用例僅 1 處（約 L13539）；NAS 走 HTTP 非 secure context，`navigator.clipboard` 可能為 undefined（S150 F1 igwatch 曾為此加 fallback） | V42 grep |
| audit_logs 機制：`0044_audit_logs.sql` 建表、`0047_order_cost_override.sql` 有寫入範式 | migrations grep |

---

## §1 方案總覽

**「半自動上傳 SOP + V42 影片連結欄位 + NFC 手機直寫」**：檔案上傳呢一下人手做（免 API 稽核），其餘（標題描述生成、連結入庫、複製、狀態可見）全部系統化。零 n8n workflow 改動。

每單營運流程（5 步，約 8–10 分鐘人手，含 Canva 封面）與一次性設置，全文見附錄 A（SOP 草稿，P4 落地後以 `.fhs/notes/youtube_nfc_video_sop.md` 為活體）。

```
客人WhatsApp原片 → Canva製作 → 匯出MP4存固定資料夾(NAS自動備份)
  → YouTube Studio人手上傳(Unlisted, 標題描述由V42一鍵生成)
  → youtu.be連結貼入V42詳情modal「影片連結」欄 → RPC寫入Supabase
  → 手機開V42複製連結 → NFC Tools寫貼紙 → 實測 → lock → 貼木框
```

---

## §2 設計規格

### 2.1 W1 資料層 — `orders.video_url` + RPC `fhs_write_video_url`

**欄位**：`orders` 加 `video_url text null`。

- **點解落 orders 層而非 order_items 層**：業務現實一單一條記念片；`已做音訊` 狀態語義亦掛單層。一單多片屬明文不做（§7）。
- **點解叫 `video_url` 唔叫 `youtube_url`**：中性命名，日後搬平台唔使改欄。

**RPC 規格**（命名跟 `fhs_write_expense_log` 慣例）：

```
fhs_write_video_url(p_order_uuid uuid, p_url text) returns json
```

- `SECURITY DEFINER` + `set search_path = public`（鏡 0049 模式，執行時讀 live 0049 定義確認 hardening 寫法）
- 驗證：`p_url` 非空時必須匹配 `^https://(www\.)?(youtube\.com|youtu\.be)/`，否則 raise `INVALID_URL`（白名單收窄 anon 濫用面）
- 允許清空：`p_url` 為 `''` 或 null → 寫 null（NFC lock 前更正用）
- 訂單不存在或已軟刪（`deleted_at is not null`）→ raise `ORDER_NOT_FOUND`
- **寫 audit_logs**：鏡 0047 寫入範式（old value → new value），保持 S130 Phase B 變更歷史一致性；欄位結構 P0 讀 0044/0047 確認
- `grant execute to anon`（V42 用 anon key 經 `_fsRpc` 調用）
- **與 S150 P1b 相容**：P1b 收斂 orders anon 直接權限後，本 RPC 因 SECURITY DEFINER 不受影響——正正係 P1b 方向下的正確寫入模式

**Migration 編號協調（重要）**：執行時先 `list_migrations`（live）取真實 max；0050/0051 讓路 S150 Phase 4-6（無論屆時已跑未跑都不得佔用）；**預期用 0052**。本地檔與 live 同步落盤（吸取 0049 本地缺檔教訓）。

### 2.2 W2 V42 UI — 詳情 modal「影片連結」欄 + 訂單卡 badge

**紅線（先讀後做）**：
1. 巨檔替換三步：改前 `grep -c` =1 → 才替換 → 改後 count 驗證
2. 禁改任何既有 HTML ID；新元素一律用新 ID，統一前綴 `fhsVideoUrl*`
3. **新欄位不入 `captureFormState()` / `raw_form_state`**——影片係後期製作非表單狀態，行獨立儲存路徑（`_fsRpc`），完全避開斷鏈紅線
4. RPC 參數傳 `o._uuid`（Supabase UUID），**唔係 `o.id`**（FHS 字串）——傳錯會靜默失敗（auto-memory pitfall）

**modal 欄位規格**（錨點 `openOrderModal`，具體擺位 P0 讀 modal 結構窗口後定，建議近備註/產品明細資訊區，遠離財務區）：

- 無片時：text input（placeholder 提示「建議貼 youtu.be 短連結」）+「儲存」按鈕
- 有片時：顯示連結 +「複製」「開啟」「修改」三按鈕
- 儲存成功後即場更新顯示 + 更新記憶體中訂單物件（免重新載入先見到）
- **剪貼簿必須帶 fallback**（textarea + `document.execCommand('copy')`），NAS HTTP 環境 `navigator.clipboard` 唔保證存在——S150 F1 前科，錯誤唔可以靜默吞（TDZ silent-catch 教訓）

**mapOrder**：加 `videoUrl: row.video_url || ''`（約 L14023 區塊）。**P0 必查**：主訂單列表 fetch 用 `select=*` 定明確欄位清單——如為明確清單須加 `video_url`，否則欄位永遠 undefined。

**訂單卡 badge**：collapsed 卡片有片時顯示向量 SVG icon（影片/播放符號），**跟 S153 全向量化慣例，禁 emoji**；樣式沿用 S153 剛做完嘅 badge 結構（P0 grep 現成 badge 模式照抄）。

### 2.3 W3 —「生成上傳資料」按鈕

modal 內按鈕 `fhsVideoUrlGenBtn`：由訂單資料生成標題+描述，顯示於**可編輯 textarea** 供覆核修改後複製（帶 clipboard fallback）。

**標題規則**（裁決 10）：
- 格式 `{客人名} - {刻字}`，如 `Andrea - Our bundle of joy`
- 刻字來源：`order_items.engraving_text`（REST 錨點見 V42 約 L7247 現成 select 模式，`order_fhs_id` 對番 FHS 訂單字串）；多品項多刻字時**取第一個非空**，生成落 textarea 由 Fat Mo 手改——唔使做複雜揀選 UI
- 冇刻字 fallback：`{客人名} - Freehandsss 記念影片`
- 客人名來源：`orders.customer_name`

**描述模板**（固定文案，Fable 5 起草；落地後 Fat Mo 微調字眼唔使重批，見授權 5）：

```
{客人名} 的專屬記念影片｜Freehandsss

每一個小手模、每一段片刻，都值得被好好保存。
這是 Freehandsss 為客人親手製作的專屬記念影片，
配合 NFC 感應木框——手機輕輕一貼，回憶即刻重現。

🤍 手腳模訂製｜記念木框｜專屬記念影片
📷 Instagram：{IG帳號}
💬 WhatsApp 查詢：{WhatsApp號碼}

訂單編號：{訂單編號}
本影片為客人專屬作品，請勿轉載。
```

`{IG帳號}` `{WhatsApp號碼}` 為未定常數，**執行 session P0 問 Fat Mo 攞正確寫法**先落 code。

**私隱註記**：Fat Mo 2026-07-08 明確裁決標題用客人名+刻字（辨識度+人情味優先，接受名字現於 Unlisted metadata），取代規劃初稿「不放全名」建議——此為拍板決定，執行者不需重新質疑。

### 2.4 W4 — SOP 落盤 + 制度收尾

1. 新檔 `.fhs/notes/youtube_nfc_video_sop.md`（全文 = 附錄 A，落地後該檔為活體，本計畫附錄轉為歷史快照）
2. `decisions.md` 新增 **D19**（YouTube+NFC 工作流架構決策：半自動/Unlisted/直連/orders 層單欄/RPC 模式，連結本計畫檔）
3. `Changelog.md` 執行條目（引用本 S155 計畫；執行 session 屆時用自身 session 號）
4. `docs/repo-map.md` 補新 SOP 檔 + 新 migration
5. `.fhs/notes/FHS_System_Logic_Overview.md` 登記新 RPC `fhs_write_video_url` 與 `orders.video_url` 欄（鏡 0049 `fhs_write_expense_log` 條目格式：migration 編號＋SECURITY DEFINER＋GRANT 範圍）——**kgov [G] 治理要求，落此檔即結案，勿漏**（S155 規劃期 stop-hook 核實時發現原稿漏此項）
6. `/commit`（更新 handoff 便攜塊 + Notion 同步）
7. `/upload-web` 部署 NAS（Step0 `/fhs-check` 前置；`.fhs/.deploy-ok` **只能 Fat Mo 手動 touch**，AI 任何工具嘗試建立都會被 R10 攔——執行時記得問 Fat Mo 攞）

---

## §3 Phase 計畫（獨立 commit）

| Phase | 內容 | Commit | 估時 |
|-------|------|--------|------|
| **P0 依賴閘**（無 commit） | live `list_migrations` 取真實 max；orders schema 確認（無同名欄）；主列表 fetch select 範圍查證；讀 0044/0047/0049(live) 攞 audit_logs+RPC hardening 範式；grep modal 結構+S153 badge 模式定錨；guard 16/16 + health 12/12 baseline | — | ~15 分鐘 |
| **P1 資料層** | migration 0052（或屆時下一可用）：欄位+RPC；apply 後 live probe：搵一張測試單 → RPC 寫入合法 URL → SELECT 驗證 → RPC 清空還原 → 非法 URL 預期 raise | c1 | ~30 分鐘 |
| **P2 modal 欄位 + badge** | §2.2 全部；mapOrder + select 補欄；playwright/preview 實測（badge 渲染 + 儲存 round-trip + 複製 fallback） | c2 | ~60–90 分鐘 |
| **P3 生成按鈕** | §2.3；樣本訂單生成文字逐字比對模板 | c3 | ~20 分鐘 |
| **P4 收尾 + 部署** | §2.4 全部；code-reviewer 驗收（見 §4）；`/upload-web` 部署 + Fat Mo 實機驗一單流程 | c4 | ~40 分鐘 |

P2/P3 同觸 V42 巨檔，仍分開 commit（獨立可 revert）。

---

## §4 執行紀律

- **模型**：Sonnet 5 主對話執行；卡關兩輪 → 讀 `governance/03_judgment-rubrics.md` 再決定升級/上報
- **驗收不自驗**（紅線）：P1 schema + P2/P3 生產 HTML 改動 → 派 **fresh-context code-reviewer** 驗收；援引 S150 先例**合併為單次派工**（P3 完成後一次過審 c1–c3，省 spawn）
- **kgov [G] 預期觸發**：SOP/decisions 提及「NFC 貼紙成本」等財務字眼可能觸發——按 `governance/02` §7 核實為「寫文件、非改財務邏輯」後結案，唔好慌
- **本計畫不掂任何財務數字**：NFC 貼紙如要入 `cost_configurations` 屬另案，須走 finance-gatekeeper 流程（明文不做，§7）
- 結束前：guard 16/16 + health 12/12 無回歸；`git status` 核對改動面 = 預期清單

### §4.0b 授權清單（Fat Mo 批准本計畫 = 一併授權以下 7 項）

1. `orders` 加 `video_url` 欄（nullable text）
2. 新 RPC `fhs_write_video_url`：SECURITY DEFINER + grant anon + audit_logs 寫入
3. Migration 編號執行時動態取（預期 0052；0050/0051 永久讓路 S150）
4. V42 生產 HTML 修改：詳情 modal 新元素（`fhsVideoUrl*` 新 ID）+ 訂單卡向量 badge + mapOrder/select 補欄
5. 標題/描述模板常數落地（日後純字眼微調唔使重批）
6. 新檔 `.fhs/notes/youtube_nfc_video_sop.md` + `decisions.md` D19
7. `/upload-web` 部署 NAS（`.deploy-ok` 屆時由 Fat Mo 手動 touch）

---

## §5 驗收標準（機械可驗）

| Phase | 驗收 | 通過標準 |
|-------|------|---------|
| P1 | live probe 四連：合法寫入/SELECT 回讀/清空還原/非法 raise | 4/4 符合預期；audit_logs 有對應記錄 |
| P1 | 本地 migration 檔與 live 同步落盤 | 檔案存在且與 apply 內容一致 |
| P2 | `grep -c` 三步紀律逐次留痕 | 每次替換前=1 後 count 符合 |
| P2 | playwright/preview：badge 渲染、儲存 round-trip、複製 fallback（模擬 clipboard undefined） | 全過，無 console error |
| P2 | 既有 HTML ID 零變更 | 改前後 ID 清單 diff = 僅新增 `fhsVideoUrl*` |
| P3 | 樣本訂單生成文字 vs 模板 | 逐字一致（訂單編號/日期代入正確） |
| P1–P3 | fresh-context code-reviewer 單次合併審 | PASS |
| P4 | guard fixtures + health fixtures | 16/16 + 12/12 無回歸 |
| P4 | `/upload-web` 三關 | HTTP 204 部署通過 |
| P4 | Fat Mo 實機走一單全流程（上傳→入庫→複製→NFC 寫入→拍卡） | 人工 PASS 先算結案 |

---

## §6 風險與回滾

**回滾**：四 phase 獨立 commit，逐個 revert；migration 回滾 = `drop function` + `drop column`（欄位 nullable、無下游依賴前安全）；badge/modal 元素純增量，revert 無殘留。

| 風險 | 影響 | 緩解 |
|------|------|------|
| anon 可寫任意訂單 video_url | 竄改連結 | regex 白名單只收 YouTube domain + audit_logs 全程有跡；NFC 直連特性下，已寫貼紙不受 DB 竄改影響 |
| Canva 配樂被 Content ID 認領 | 片上出廣告（不封不刪） | SOP 建議用 Canva royalty-free 曲目；中 claim 不影響 NFC 播放 |
| 直連 URL：重傳片=連結變 | 收返木框重寫 NFC | SOP 步驟：上傳前確認最終版；先實測後 lock 再貼框 |
| 頻道單點風險 | 頻道被停權=全部 NFC 死 | Unlisted+無濫用機率極低；NAS 有齊原檔可重建 |
| NAS HTTP 環境 clipboard 失效 | 複製按鈕靜默失敗 | 強制 execCommand fallback + 失敗顯式提示（見 §2.2） |

---

## §7 明文不做（scope 邊界）

| 項 | 重新評估觸發條件 |
|----|----------------|
| W5：n8n Telegram 提醒（「完成（音訊）」但 video_url 空） | 真實發生漏寫 NFC 事故、或月產量明顯上升 |
| 全自動 API 上傳（Google API 稽核申請） | 月產量穩定 >20 支 |
| 舊單 Spotify 回溯補 YouTube | Fat Mo 主動要求 |
| 一單多片（video_url 陣列/子表） | 業務出現一單多片真實訂單 |
| NFC 貼紙入 cost_configurations | 另案走 finance-gatekeeper |

---

## §8 自我批評（3 弱點與回應）

1. **anon 寫入面**：任何持 anon key 者可改任何訂單 video_url。回應：regex 白名單+audit_logs 追蹤已係 5–15 支/月規模下成本相稱嘅防護；更嚴格嘅簽名機制屬過度工程；且 NFC 直連令 DB 竄改無法波及已交付貼紙。
2. **主列表 select 範圍規劃期未實證**：如為明確欄位清單而漏補，videoUrl 永遠 undefined 而 UI 靜默空白。回應：唔靠假設，已寫死為 P0 必查項 + P2 round-trip 驗收兜底。
3. **一次性設置依賴 Fat Mo 手動**（YouTube Studio 上傳預設值 Unlisted 等）機器無法驗收，漏做嘅話某日趕住上傳可能意外公開客人片。回應：SOP 附錄 A 以 checklist 形式列明 + 每單步驟 3 本身再核對一次可見度，雙重兜底。

---

## 附錄 A — SOP 全文草稿（P4 落地至 `.fhs/notes/youtube_nfc_video_sop.md`）

### A.1 一次性設置（做一次永遠受益）

- [ ] 確認登入 **@Free_handsss** 頻道（freehandsss2018@gmail.com；裁決 9）
- [ ] YouTube Studio → 設定 → 上傳預設值：可見度預設 **Unlisted** + 貼上描述模板（防漏設意外公開；marketing 片屆時手動較 Public）
- [ ] 頻道電話驗證（**必須**——自訂封面同 >15 分鐘影片都要呢個）
- [ ] 建立不公開播放清單「客人記念影片」（內部搵片用）
- [ ] 建立客人媒體根資料夾（**建議放 repo 以外**，如 `D:\SynologyDrive\Free_handsss\FHS_Customer_Media\`——影片/封面唔應該入 git repo；Fat Mo 口頭俾嘅路徑係 repo 根目錄，判定為近似指向，**執行時同 Fat Mo 確認最終落點**，如堅持放 repo 內須同步補 `.gitignore`）
- [ ] 手機裝 NFC Tools（或同類）app；NTAG213 貼紙備貨

### A.2 每單流程（約 8–10 分鐘人手，唔計上傳等候）

| 步 | 動作 | 時間 |
|---|------|------|
| 1 | Canva 匯出 **MP4 + 封面圖（1280×720）** → 存入該客人專檔資料夾 `FHS_Customer_Media\{訂單編號}_{客人名}\`（一客一檔：`video.mp4` + `cover.jpg`）；Synology Drive 自動同步 NAS = 備份完成 | 3 分鐘 |
| 2 | V42 訂單詳情 →「生成上傳資料」→ 覆核/微調自動生成嘅標題（客人名+刻字）同描述 → 複製 | 20 秒 |
| 3 | YouTube Studio 拖檔上傳 → 貼標題描述 → 設自訂封面（專檔 `cover.jpg`）→ **「是否為兒童打造」必答「否」**（BB 手模內容≠目標觀眾係兒童；剔錯會封留言/限功能）→ **核對可見度 = Unlisted** → 入「客人記念影片」清單 | 3 分鐘 |
| 4 | 複製 youtu.be 短連結（分享按鈕）→ 貼入 V42「影片連結」欄 → 儲存 | 30 秒 |
| 5 | 手機開 V42 → 複製連結 → NFC Tools 寫入貼紙（URL/URI record）→ **自己手機拍卡實測** → Lock tag（⚠️ 鎖咗永久改唔返，必須先測後鎖）→ 貼入木框 | 2 分鐘 |

### A.3 規則與貼士

- **標題格式**：`{客人名} - {刻字}`（如 `Andrea - Our bundle of joy`）；冇刻字用 `{客人名} - Freehandsss 記念影片`（Fat Mo 2026-07-08 裁決：接受客人名現於 metadata，辨識度+人情味優先）
- **NFC**：寫 youtu.be 短連結（NTAG213 容量綽綽有餘）；貼紙避開金屬部件；木框感應位可加小印仔「請用手機感應」
- **客人體驗預期**：iPhone 一拍彈通知要撳一下先開；Android 直開——交收時示範一次
- **配樂**：優先揀 Canva royalty-free 曲目，減 Content ID claim（中咗都只係出廣告，不封不刪）
- **重傳片 = 連結變**：直連設計下要收返木框重寫 NFC——所以步驟 3 前確認片係最終版

### A.4 相關系統位置

- 影片連結欄：V42 訂單詳情 modal「影片連結」（寫入 `orders.video_url`，經 RPC `fhs_write_video_url`）
- 變更歷史：audit_logs 自動記錄每次連結改動
- 架構決策：decisions.md D19；實施計畫：本檔所在 `.fhs/reports/planning/2026-07-08_s155-*.md`
