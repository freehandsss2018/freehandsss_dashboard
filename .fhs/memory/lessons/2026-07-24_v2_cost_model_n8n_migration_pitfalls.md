# Lesson — V2 三層成本模型 n8n 遷移 + 財務彈窗顯示四個新坑（qty 乘法/雙重計算/工具狀態失準/fetch漏欄位）

**日期**：2026-07-24（Session 189，鎖匙扣/吊飾成本模型 S55 語義漂移修復期間實測發現）
**類型**：Pitfall

## 坑一：靜態 SKU 目錄改「單件價 × quantity」模型時，n8n 未必真的做呢個乘法

舊系統慣性係「幾多件焗死喺 SKU 字串本身」（`total_base_cost` 已經係成套價，`item_per_set`=N，n8n 從未需要乘 quantity）。新 V2 模型改成「單件價，n8n 動態 × quantity」後，若只改 Supabase `products` 目錄唔改 n8n「Calculate Profit & Pack Items」計算節點，會**少計成本且完全唔會報錯**（qty=1 測試會 PASS，掩蓋咗呢個 bug，要用 qty>1 先揭發）。
**點應用**：任何「單件價×quantity」模型嘅新 SKU/新產品線，落地前必須專門用 qty≥2 嘅測試單驗證，qty=1 唔足夠證明乘法邏輯正確。

## 坑二：新增品類專屬固定成本（如頸鏈 $100）時，檢查係咪已經 baked 入單件價

舊 code 對所有吊飾類別無條件加 $100 頸鏈費（獨立於 SKU 單價之外）。新 V2 吊飾 SKU 設計時已經將呢個成本 bake 入 `total_base_cost` 本身，若冇加 guard 排除，會被舊 code 同新 SKU 定價**雙重計算**。
**點應用**：新增/重構任何 SKU 定價目錄前，先確認舊代碼有冇獨立於 SKU 之外嘅「品類固定加成」邏輯，新模型必須明確二選一（baked in SKU 或獨立加成），唔可以兩者並存。

## 坑三：`get_execution_log` MCP 工具對已完成 execution 可能持續回報過時 "running" 狀態

連續 4 次 regression 測試被此工具顯示 "running" 卡住，一度誤判為 NAS/axios 網絡層問題。實際上 execution 早已喺 958ms 內完成（Error），MCP 工具狀態失準。真正錯誤原因同表面症狀完全無關：測試訂單 ID 太長（`orders.order_id` 係 `varchar(20)`，22 字元測試 ID 觸發 Postgres `22001` 錯誤）。
**點應用**：懷疑「卡單」時，唔可以單憑 `get_execution_log` 判斷因果關係，應改開瀏覽器直查 n8n UI `/workflow/{id}/executions/{id}` 核實真實狀態同錯誤訊息。

## 坑四：新增資料表欄位後，前端所有獨立 fetch 呢個表嘅 SELECT query 都要逐一補齊，唔淨係 n8n 寫入鏈

`order_items` 新增 `position_code/drawing_waived/drawing_charged_count/cost_model_version` 四欄後（migration 0073），只改咗 n8n 寫入鏈（Supabase Mirror Prep + RPC），冇檢查 Dashboard 入面 6+ 處各自 hand-written 嘅 `rest/v1/order_items?select=...` fetch（財務彈窗 `buildAuditLedgerHtml()` 果句漏咗）——令財務彈窗完全冇資料可用（新欄位一律 undefined）但零報錯，表面睇好似邏輯bug，實際係 fetch 漏欄位。
**點應用**：新增/改動任何表結構化欄位後，`grep "rest/v1/<table>?"` 列晒所有讀取點，逐一核對 select list 是否需要同步；呢個坑同「n8n 寫入鏈三處」（Pattern #10）係同一類問題嘅鏡像版本——讀寫兩端都要各自逐點核對，唔可以只查其中一端。

## 附帶心得（Pattern）：歷史數據回填應「精準修單一分量」，唔應該「整行重套新目錄價」

修復 S189 語義漂移期間，Fat Mo 追加要求回填23張歷史舊模型訂單嘅畫圖成本。做法上有兩個選擇：(a) 直接套用 Phase0 模擬RPC算出嚟嘅「新模型全套單件價」（會連帶改埋material/運費等假設）；(b) 只修正被證實有問題嘅單一分量（畫圖費），其餘已記錄分量原封不動。最終採用 (b)，原因：(a) 嘅material/運費數字帶住V2新目錄嘅假設，同「畫圖費呢個bug」完全無關，混入會令回填範圍失控、審計時難以解釋每一蚊嘅改動理由。執行前用SQL逐行掃描確認咗一個關鍵前提：cross-category（鎖匙扣+吊飾）同部位分組入面費率必然一致（唔會出現一組入面一個S一個P嘅衝突），先可以放心用「组內首件」嚟做bookkeeping tie-break，唔影響總金額只影響邊個分類欄位吸收呢筆錢。
**點應用**：任何歷史財務數據回填，先問「呢次要修嘅係邊一個具體分量」，只動嗰個分量，唔好順手套用成套新公式；動手前用SQL/獨立查詢驗證會唔會撞到隱藏嘅費率/tier衝突，寫入`audit_logs`留返稽核軌跡，事後派獨立subagent重算驗證（唔可以自驗）。

## 附帶提醒（非新坑，但同場證實）

`.fhs/.deploy-ok` 旗標係**一次性 consume**（每次成功寫入 current.html 後即被刪除），同一批次多個檔案改動要逐次重建；旗標內容必須係有效 ISO timestamp 字串，純 `touch` 空檔案會被 `new Date('').getTime()` 判 NaN 當無效（S187 已記錄，本次再度實測確認）。

## 關聯

- `.fhs/notes/decisions.md`「S55 語義漂移」條目
- `.fhs/notes/FHS_System_Logic_Overview.md` §5.4.6
- `.fhs/memory/handoff.md` 便攜塊「⚠️ 易猜錯」(14)(15)(11)
- `.fhs/reports/completion/2026-07-24_keychain_cost_model_semantic_drift_and_phase0_simulation_completion_report.md`
