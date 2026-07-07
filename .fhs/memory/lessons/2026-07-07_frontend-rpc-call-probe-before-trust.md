# Lesson — 前端呼叫的 RPC，先探針再信任

**日期**：2026-07-07（Session 150，審計修復 Phase 3）
**類型**：Pattern
**來源**：記錄中心「支出記錄」tab 寫入失敗診斷（`fhs_write_expense_log` RPC）

## 現象

V42 `submitExpenseLog()` 前端程式碼**看起來完全正確**：呼叫 `_fsRpc('fhs_write_expense_log', {p_log_type, p_entry_date, ...})`，參數名、型別、呼叫順序全部合理，程式碼審閱（純讀程式）挑不出毛病。但實際使用時記錄中心「支出記錄」永遠寫入失敗。

## 根因

前端程式碼的正確性，不等於它呼叫的後端物件存在。`fhs_write_expense_log` 這個 RPC **從未被建立**（Supabase 端探針回 404）。前端呼叫失敗後落入 `.catch()` fallback，而 fallback 又引用未定義的 `window._sbUrl`/`window._sbHdr`（第二層斷裂），導致連 fallback 都失敗，最終使用者只看到「儲存失敗」而不知道真正原因是「RPC 根本不存在」。

## Pattern：稽核/除錯前端呼叫後端的程式碼時，先對後端物件本身探針，再信任前端呼叫邏輯

單純讀前端程式碼判斷「呼叫寫法對不對」是不夠的——必須額外驗證：

1. **RPC/函式是否存在**：`SELECT proname FROM pg_proc WHERE proname = '...'` 或直接 curl 打 `/rest/v1/rpc/{fn}` 看是 404 還是 200/400（400 通常代表函式存在但參數不對，404 才是不存在）
2. **RLS/GRANT 是否允許呼叫端身份**：SECURITY DEFINER + `GRANT EXECUTE TO anon` 缺一都會導致 anon key 呼叫失敗
3. **表結構是否對得上**：`information_schema.columns` 核對 RPC 內部 INSERT/SELECT 的欄位名沒有手誤

這個順序特別重要：**前端程式碼「看起來合理」常常會誤導審閱者跳過對後端實體的驗證**，因為程式碼審閱的直覺是找「邏輯錯誤」，而非「引用了不存在的物件」。

## 應用

任何稽核任務遇到「前端呼叫 RPC/API 但功能異常」，先用最小成本的探針（curl/SQL）確認被呼叫物件的存在與可呼叫性，再往下追前端邏輯本身。反過來做（先信任前端邏輯正確，最後才查後端）容易在複雜呼叫鏈中繞遠路。

## 關聯

- `.fhs/reports/2026-07-06_s150-full-system-review-report.md`（原始稽核，此 pattern 的實戰案例）
- `.fhs/reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md` §4.4
- `.fhs/notes/FHS_System_Logic_Overview.md` §5.6（expense_logs 修復記錄）
