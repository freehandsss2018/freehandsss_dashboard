# Migration Repo/DB Drift 導致 CREATE OR REPLACE 回歸事故（2026-07-22）

## 事故經過

Fat Mo 回報財務總覽「訂單數」KPI 卡三行細項單位錯誤（顯示「單」應顯示「件」）。修復 `get_financial_charts()` 時，以 repo 內 `supabase/migrations/0041_fix_unconfirmed_doublecount_and_trend_3layer.sql` 的函式內容為底本撰寫新 migration `0064`，用 `CREATE OR REPLACE FUNCTION` 整段覆蓋。

`0064` 套用後才發現：live 資料庫的 `get_financial_charts()` 早在 2026-07-17 已經過線上 migration `fix_financial_rpc_status_filter_enum_mismatch` 修補（`process_status::TEXT NOT IN ('cancelled','refunded')` 英文死碼 → `NOT IN ('已取消')`），但**該修補從未以檔案形式落入 repo 的 `supabase/migrations/` 目錄**——只存在於 Supabase 的 migration history（`list_migrations` 可見版本 `20260717121508`），repo 檔案與 live DB 之間存在未被發現的 drift。

由於 `0064` 是照抄 repo 內（舊、修補前）的 `0041` 全文重建整個函式，`CREATE OR REPLACE` 覆蓋時把已修好的 5 處 `已取消` 過濾器全部打回英文死碼，**靜默重新讓「已取消」訂單計入財務圖表的收入/成本/毛利數字**（頂層「訂單數」由未觸碰的 `get_financial_kpis` 計算，不受影響）。跨查 `get_financial_kpis` 現行定義才發現它正確使用 `已取消`，兩者不一致才揭發此回歸；隨即以 `0065` hotfix 修復。

## 根因

1. **MCP 直接 apply_migration 不等於「檔案已落 repo」**：透過 Supabase MCP 工具（`apply_migration`）套用的修復，只會出現在 DB 的 migration history 表，若 AI 沒有額外手動 `Write` 對應的 `.sql` 檔到 `supabase/migrations/`，repo 就會漏收這次修復，形成隱形 drift。
2. **`CREATE OR REPLACE FUNCTION` 是全量覆蓋，不是差異 patch**：任何只改一小段（如本例的 3 個 key）而以「舊檔案全文 + 局部編輯」方式重建函式，都會把舊檔案漏收的其他修復一併抹掉，即使那些修復與本次改動主題無關。

## 防再犯

- **改動任何 RPC 前，先用 `pg_get_functiondef(oid)` 或 `list_migrations` 核對 live 定義同 repo 最新檔案是否一致**，不能假設 repo 內最後一個同名函式 migration 就是 live 現狀的真源。
- **任何透過 Supabase MCP `apply_migration` 套用的修復，必須同時 `Write` 對應 `.sql` 檔落 `supabase/migrations/`**（本專案既有習慣是先寫檔案、Read 驗證、再 apply——`0064`/`0065` 本身有遵守，但更早的 `fix_financial_rpc_status_filter_enum_mismatch` 沒有，才種下這次的根）。
- **CREATE OR REPLACE 大範圍覆蓋前，先跑一次 `pg_get_functiondef` 抓 live 版本全文，用它做底本而非 repo 檔案**，若兩者不同要先查清楚差異來源，而非默認 repo 檔案較新。

## 相關

[[project-financial-rpc-status-filter-bug]]（2026-07-17 原始修復事故記錄）、`.fhs/notes/FHS_System_Logic_Overview.md` §10.17/§10.18
