# Lesson — 移除 RLS 政策前，grep 稽核要防「method 與 URL 分行」盲點；anon 寫入失敗常是靜默 2xx 非顯式 403

**日期**：2026-07-12（Session 167 續，S150 審計修復 Phase 5）
**類型**：Pitfall
**來源**：`orders_anon_delete` RLS 政策移除後，Dashboard「刪除訂單」按鈕靜默失效，被 fresh-context code-reviewer(opus) 抓出並同一 session 內回滾

## 現象

S150 審計計畫 Phase 5（migration 0051）判斷 `orders_anon_delete` 政策「未使用」而移除，稽核依據是「Dashboard 全檔 grep 無 DELETE orders 呼叫」。政策移除並部署到 live 後，前端 `executeDeleteOrder()` 實際存在（`fetch(..., {method:'DELETE', ...})`），且用戶點擊「刪除訂單」後 UI 依然顯示「已成功刪除」——但訂單其實還在資料庫。

## 根因（兩層）

1. **grep 盲點**：`method:'DELETE'` 與目標 URL（含 `orders`）分處程式碼的不同行（物件字面量的兩個屬性），單行 pattern 的 grep（如 `grep "orders" file | grep -i delete`）抓不到跨行的因果關係——`orders` 那行本身不含 "DELETE" 字樣，看起來像普通 GET/PATCH 呼叫。
2. **RLS 對無權限寫入的失敗模式是靜默 2xx，不是顯式錯誤**：anon 角色對 `orders` 表仍持有 table 級 DELETE GRANT（S150 前就存在），只是移除 RLS 政策後沒有任何 permissive 規則允許該操作。PostgREST 對「有 GRANT 但 RLS 濾空」的請求回傳 **HTTP 200 + 空陣列/`Content-Range: */0`**，而非 403/404。前端常見的 `if (!res.ok)` 判斷完全抓不到這種「請求成功但操作對象是空集合」的失敗。

兩層疊加：稽核時漏看了呼叫存在（第 1 層），加上就算稽核時真的測試了也可能被 2xx 誤導成「有效」（第 2 層），使這類回歸極易在稽核階段被判定為安全移除。

## Pattern：移除任何 RLS 政策前，稽核與驗收都要繞開這兩個陷阱

**稽核階段（判斷是否真的未使用）**：
- 不要只 grep 表名 + method 關鍵字的「同行」出現；要嘛用能跨行匹配的 pattern，要嘛直接搜尋該表名出現的每一處呼叫並人工看清楚上下文（`method:` 常見於相鄰行、閉包參數、或另一個變數）。
- 更可靠的作法：搜尋所有 `fetch(` / `sbFetch(` / `sbDelete(` 等呼叫入口，逐一檢查其 `method` 與目標表，而非反向從表名 grep method。

**驗收階段（判斷政策移除/新增是否生效）**：
- 對「移除寫入權限」類的政策變更，驗收探針**不能只看 HTTP status code**。必須做「真實影響驗證」：insert 一筆 throwaway 測試列 → 嘗試用同一角色 key 操作它 → **查詢該列是否真的被改變/刪除**（而非只看 API response 的狀態碼）。HTTP 200 在 PostgREST + RLS 的世界裡完全不能代表「操作生效」。
- 這與 [[2026-07-07_frontend-rpc-call-probe-before-trust]] 同源但反向：那則講「前端呼叫看起來對，要查後端物件是否存在」；這則講「後端操作回應碼看起來對（2xx），要查資料是否真的被改動」——兩者都是「不要相信表面訊號，要驗證實際狀態變化」的同一類紀律。

## 應用

任何 DROP POLICY / 收斂 anon 權限的 migration，執行後驗收一律要求：(a) 用真實（非 bogus）目標列測試，(b) 驗證資料實際狀態而非只看 status code，(c) 對應的前端呼叫要用「列出所有呼叫入口逐一核對」取代「反向 grep 表名」。此類變更屬 AGENTS.md「驗收不自驗」紅線範圍，理想上應由 fresh-context 角色重新跑一次上述 (a)(b)(c)，不能由原執行者自我確認。

## 關聯

- `.fhs/reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md` §4.6（Phase 5 原計畫）
- `.fhs/notes/FHS_System_Logic_Overview.md` §11.6（事故完整記錄）
- `supabase/migrations/0051_orders_anon_policy_cleanup.sql` / `0052_restore_orders_anon_delete.sql`
- [[2026-07-07_frontend-rpc-call-probe-before-trust]]（同源反向教訓）
