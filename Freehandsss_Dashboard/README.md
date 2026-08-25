# Freehandsss_Dashboard — Dashboard UI 核心區

## 用途

本資料夾存放 FHS POS 系統的前端 Dashboard UI。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `Freehandsss_dashboard_current.html` | **正式生產環境** = V42（2026-06-16 Session 107：split 還原修復 + 成本設定 A 區摺疊） |
| `freehandsss_dashboardV36.html` | 舊版穩定基準 (Legacy Stable) |
| `freehandsss_dashboardV40.html` | 前一版穩定基準（V40.8 — 移除嬰兒月齡 + 報價明細 breakdown）|
| `freehandsss_dashboardV41.html` | V41 穩定基準（Supabase-First 遷移；2026-05-16）|
| `freehandsss_dashboardV42.html` | **✅ Production**（Session 115 升格；Audit Ledger + split 還原快照隔離 + 成本設定摺疊；Session 119 加入 igwatch 模式）|
| `freehandsss_financial_overview.html` | **Financial Overview 頁面**（財務圖表中樞） |
| `products.json` | 產品資料快取（非 live 資料；NAS 真正運作快取在 `.n8n/data/products.json`） |

## 重要規則

- **禁止覆蓋 `Freehandsss_dashboard_current.html`**：未獲 Fat Mo 授權，絕不可覆蓋正式環境
- **禁止變更 HTML ID**：Input/Button ID 是 n8n Webhook 掛鉤，牽一髮動全身
- **禁止改動 `captureFormState()`**：這是整個 POS 系統的數據根基

## 當前版本

- **2026-08-25（D69＋D69-follow）**：訂單總覽「類別」由訂單層篩選改為**類別視圖**（品項層過濾＋Excel式欄位換裝＋收起財務欄＋類別工作台橫幅），另修 3 個既有 bug（分類真源打架令部分品項篩選唔到、品項 index 漂移致內聯編輯寫錯品項、hm_ 進度篩選未跟同一真源）。`/code-review` xhigh 覆核再揪出並修返 4 個 D69 自身回歸（備註格背景色同步／`hm_` 篩選未同步／類別橫幅唔即時更新／「全部」視圖表頭 padding 誤改）。`current.html` 尚未同步，待 Fat Mo 授權部署。詳見 Changelog.md、decisions.md D69／D69-follow、方案書 `.fhs/reports/planning/overview-category-view-plan_2026-08-25.md`。
- **2026-08-15（D64，cl-flow 2026-08-15-1944）**：`V42.html` 新增多件手模擺設訂單支援（逃生口模式）——手模擺設區底新增「追加擺設款式」摺疊區，一單最多容納 1 主件 + 3 追加件（`p2_`/`p3_`/`p4_` 前綴），主件邏輯零改動。item_key 用 `p_slot_seq` 單調遞增防重排污染。IG 訊息沿用現行格式。Supabase schema／n8n 皆零改動。`current.html` 尚未同步，待 Fat Mo 授權部署。詳見 Changelog.md、decisions.md D64。
- **2026-07-24（Session 189）**：`current.html`+`V42.html` 同步新增 V2 統一SKU支援（嬰兒tier限定，鎖匙扣+吊飾）——`syncToAirtable()`及`buildOrderItemsForPricing()`各2個區塊，`finalObj`由「僅冇主套裝先tag(P)」改「兩邊皆明確tag(S)/(P)」+ SKU尾加`(V2)`後綴，接駁 cl-flow `2026-07-24-0213` 新三層成本模型。大寶/家庭/成人tier未動，詳見 Changelog.md 同 `.fhs/notes/FHS_System_Logic_Overview.md` §5.4.6。
- UI 層：**V42** (Active Production，2026-06-16 Session 107)
  - **split 還原快照隔離**：修復全付重載後 deposit/balance 顯示錯誤（P36）
  - **成本設定中心 A 區摺疊**：繪圖成本與 B/C/D/E/MISC 行為一致，預設摺疊
  - 繼承 Session 102：Audit Ledger 財務對賬四區塊
  - 繼承 Session 101：restoreSplits 容器清空修復
  - **取模排程中心 B：迷你月曆 v2**（2026-07-16，決策見 decisions.md D29）：`約定日期` 旁掣（先睇當日明細，撳「✓ 揀呢日」先回填表單）+ 訂單總覽獨立「查看檔期」掣（純顯示，明細行可撳開單），每日格三時段（上午/下午/晚上，PM 6:00 起算晚上）+「📋 近期排期」tab（成月list+跳去下一個全日空檔），read-only Supabase 查詢，唔綁定任何財務欄位；C/D/E（今日取模一覽/過期未更新/未約日期）延後未做
- 憲法層：v1.4.13（AGENTS.md，2026-06-09）

## 相關文件

- 四端欄位映射：`/n8n/Quadruple_Sync_Field_Map.md`（v1.1，2026-05-13，取代 Triple_Sync）
- 架構定位與數據主導權：`.fhs/ai/AGENTS.md` §1；運作細節：`.fhs/notes/FHS_System_Logic_Overview.md`（原 `/docs/FHS_Blueprint.md` 已於 2026-07-08 S158 刪除，見 decisions.md D20）
