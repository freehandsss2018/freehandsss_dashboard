# Lesson — n8n Code Node 平行崩潰 + 表達式 `=` 前綴 + HTTP node 零結果三個新坑

**日期**：2026-07-22（Session 187，D43 Airtable 剝離期間實測發現）
**類型**：Pitfall

## 坑一：HTTP Request node 嘅字串參數必須以 `=` 開頭先會被當表達式解析

n8n workflow JSON 入面，`url`/`jsonBody` 等字串參數，**只有以 `=` 開頭嘅值先會被表達式引擎解析** `{{ }}` 樣板；冇 `=` 前綴嘅話，成串（包括 `{{ }}`）會照直當純文字送出，**唔會報錯**，只會靜默送錯內容（例如 `order_id=eq.{{ encodeURIComponent(...) }}` 被當純文字送出，PATCH 打中 `order_id=eq.undefined` 或字面 `{{ }}`，永遠 0-row match）。
**點應用**：透過 n8n API 直接寫 workflow JSON（而非用 UI 打字自動加 `=`）時，任何想用表達式嘅字串參數，開頭必須手動加 `=`。修改/新增呢類 node 後，一定要真實觸發一次並睇 execution runData 嘅實際輸出，唔可以淨睇 HTTP status。

## 坑二：HTTP Request node 響應 0 筆（空陣列）時，落游 node 唔會執行

當 HTTP Request node 打出去嘅 API 回應空陣列（例如 Supabase 查唔到匹配行），n8n 預設會令呢個 node output 0 個 item，而 **0 個 item 就唔會觸發任何落游 node 執行**（唔理落游 node 係咪 `runOnceForAllItems` 定 `runOnceForEachItem`）。喺 webhook 情境下，呢個會令成個 workflow 執行冇任何 node 產出最終回應，webhook 回 `{"code":0,"message":"No item to return was found"}`（HTTP 500）。
**修法**：喺可能收到空結果嘅 HTTP Request node 加 `"alwaysOutputData": true`，令佢即使查唔到嘢都輸出一個空 item，落游 node 先會執行（落游 code 要自行判斷輸出係空定有嘢）。

## 坑三：兩個 Code node 平行分支同時 `require('axios')` 打 HTTP call，可致 NAS n8n task runner 崩潰

喺 self-host NAS n8n 環境，若 workflow 有兩個獨立分支各自係一個 Code node 用 `require('axios')` 發 HTTP 請求，並且呢兩個分支**同時（平行）執行**，會偶發令 n8n 嘅 task runner disconnect，execution 出現含糊嘅 `"Node execution failed"` / `InternalTaskRunnerDisconnectAnalyzer` 錯誤，同真正嘅程式邏輯 bug 冇關（重試 2 次都同一位置死同一個錯）。
**修法**：改用**序列鏈**（一個 Code node 完成先觸發下一個），唔好將兩個都要打 HTTP 嘅 Code node 放喺同一上游節點嘅兩條平行分支。若後面嘅 node 原本靠 `$input`/`$json` 讀上游輸出，改行序列鏈後要記得改用 `$('原上游node名').all()` 明確引用，唔可以再靠 `$input`（因為依家上游變咗）。

## 附帶提醒（非新坑，但同場證實）

`require('axios')` 喺 NAS n8n Code node 本身**可以用**（Phase 1 `Smart Cache Strategist` 已有先例，本次 6 個新 Code node 全部用 axios 都正常運作）——舊有「NAS Code 節點 fetch/require/process 全部靜默失敗」嘅記錄唔完全準確，實際係 `fetch()` 唔可用、`require('axios')` 可用，兩者要分清楚，唔可以一概而論話「require 都唔得」。

## 關聯

- `.fhs/notes/decisions.md` D43
- `.fhs/memory/handoff.md` 便攜塊「⚠️ 易猜錯」(13)
- `.fhs/reports/completion/2026-07-22_d43-airtable-decoupling_completion_report.md`
