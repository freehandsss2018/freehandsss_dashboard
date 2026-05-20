# FHS Learnings — Pattern / Pitfall / Preference
> 由 /commit 結尾手動 distill，每條上限 150 字元含日期來源。
> 全檔上限 50 條；超過時必須合併或退役，嚴禁變成第二份 decisions.md。
> 由 /read Phase 2.5 載入至工作記憶。

---

## Patterns（成功反覆驗證的做法）

- 「批評答案 + 更好版本」迭代模式有效：要求指出 3 個弱點逼出自我批評，比直接請求修改產出更精準的 v2 — 源自 2026-05-20
- 雙層成本架構：Supabase View（Layer 1 即時報價）+ n8n 靜態寫入（Layer 2 歷史快照），職責不重疊 — 源自 2026-05-16
- 四端同步隔離：Supabase 失敗不中斷 Airtable、Airtable 失敗不中斷 Supabase，用 try-catch 分隔鏈路 — 源自 2026-05-16
- Subagent 單一職責：database-reviewer=靜態 schema；finance-auditor=Live 動態驗證，兩者正交不互換 — 源自 2026-05-10

---

## Pitfalls（重複踩過的雷）

- AI 在計畫未批核前擅自執行架構改動（2026-03-30 事故）→ /execute 是唯一授權信號，任何結果好壞都不能事後合理化
- n8n Code 節點 NAS 限制：fetch() / process.env / require() 全部靜默失敗，必須用 HTTP Request 節點 — 源自 2026-05-18
- Airtable formula 無法可靠處理 multipleLookupValues 陣列計算，核心財務欄位必須由 n8n 計算後直接寫入 — 源自 2026-05-03
- try-catch 靜默吞掉 TDZ 錯誤（Temporal Dead Zone），導致 Order_Items_List 空白，無錯誤提示 — 源自 memory
- 對標外部方法論（如 gstack）時，AI 本身也需要先走 Forcing Questions（「用戶真正缺什麼？」），否則容易產出「答對了錯誤題目」的過度工程 — 源自 2026-05-20
- 備註欄批次色陷阱：`batchCol = getBatchColor(o.Batch)` 若訂單層空、item 層有值則返回白色；需用 `o.Batch || items[0].Batch || ''`；CSS class `background:#fff` 蓋過 td batchCol，需 inline `background:#ffffff` + td `padding` 相框方案 — 源自 2026-05-20
- HTML table rowspan 排位陷阱：rowspan 欄若需在逐行渲染欄之後（如備註在進度右側），必須在 `index === 0` 條件內單獨追加 `<td rowspan>`，不能放入 orderLeftColsHtml；否則瀏覽器將後續行的逐行欄錯位填入 rowspan 欄之前 — 源自 2026-05-20
- 批次色全訂單 over-sweep 陷阱：用 `.order-group-${orderId} .batch-cell` sweep 會掃到同訂單所有 item，導致更新一行批次色時全部同步；必須用 `#row-${orderId}-item-${itemIndex}` 定位單行，備註 td 則只在 itemIndex===0 時同步 — 源自 2026-05-20

---

## Preferences（Fat Mo 已確認的偏好）

- 當 action items 超過 5 個時，問「其中哪一個才是真正的釘子？」往往收斂到 1 個 — 源自 2026-05-20
- 最小改動優先：能補一個釘子就不重做廚房，v2 優先於 v9 — 源自多次 cl-flow 對話
- 收斂指令體系：零新指令、零新 subagent，除非現有工具無法完成任務 — 源自 2026-04-28
- 橋接版禁止含邏輯：.claude/commands/ 與 .agents/workflows/ 只做指向，邏輯只在 Master (.fhs/ai/commands/) — 源自 2026-05-19
