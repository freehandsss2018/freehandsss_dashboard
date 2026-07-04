# NAS n8n Code 節點能力邊界精確化（Buffer/Compression 可用，補充 2026-05-18 教訓）

> 對應 learnings.md 教訓：「【更正】n8n Code 節點 NAS 限制」 [[learnings]]

## 背景
2026-05-18 教訓記錄了 NAS n8n Code 節點 `fetch`/`require`/`process.env` 靜默失敗，
當時結論是「Code 節點不可靠，改用 HTTP Request 節點」。Session 110（IG 漏單看門狗
改方案C）需要在 NAS 端完整跑 mojibake 解碼 + ZIP 解壓 + CJK 模糊比對，逼著把這個邊界
測清楚，而非籠統避開整個 Code 節點。

## 新發現（透過建臨時 webhook probe workflow 逐項實測，測完即刪，零殘留）

| 能力 | 狀態 | 備註 |
|------|------|------|
| `n8n-nodes-base.executeCommand` | ❌ 完全不可用 | `activate` 時直接回 `Unrecognized node type` |
| Code 節點 `require()` | ❌ 靜默失敗 | 沿用 2026-05-18 教訓 |
| Code 節點 `fetch()` | ❌ 靜默失敗 | 沿用 2026-05-18 教訓，改用 HTTP Request 節點 |
| Code 節點 `process.*` | ❌ `process is not defined` | 新確認 |
| Code 節點 `Buffer` | ✅ **可用** | 全域物件非 require，mojibake `Buffer.from(s,'latin1').toString('utf8')` 可直接搬進 Code 節點 |
| `n8n-nodes-base.compression`（decompress）| ✅ **可用** | 真實測試把 ZIP 解壓成多個 binary 輸出，且**保留原始相對路徑**於 `binary[key].fileName`（如 `thread_a\message_1.json`），分組邏輯不受影響 |

## 二個額外踩坑（與 Buffer/Compression 可用性無關，但同一輪測試中發現）

1. **`filesystem-v2` 二進位儲存模式**：這台 NAS 的 n8n 設定 binary data 存檔案系統而非
   inline base64。Code 節點內 `item.binary[key].data` 是字面字串 `"filesystem-v2"`
   （路徑標記），**不是**內容。必須用 `await this.helpers.getBinaryDataBuffer(itemIndex, key)`
   才能讀到真實內容（前提：節點 mode 設 `runOnceForAllItems`，否則 `this.helpers`
   情境可能不同）。
2. **HTTP Request 節點回應空陣列 `[]` 時，下游節點被跳過**：n8n 預設「0 輸入 items
   → 不執行該節點」。若 Supabase 查詢真的查到 0 筆（如 `sales_pipeline` 暫時無資料），
   整條鏈會在該節點後完全停擺、無錯誤訊息，webhook 回應變成空 body，乍看像 bug
   其實是資料真的是空的 + 這個預設行為疊加造成的假死。修法：該 HTTP Request 節點
   設定 `alwaysOutputData: true`，下游 Code 節點要相應處理「輸入是空陣列 vs
   單一物件」兩種shape（`flattenItems` helper）。

## 結論 / 怎麼用這個教訓

- 「NAS Code 節點不可靠」不是全稱命題——**沙盒鎖的是 `require`/`fetch`/`process`，
  不是整個 JS 引擎**。下次評估能否把某段本機邏輯搬上 NAS n8n，先用臨時 webhook
  probe workflow 實測那段邏輯實際用到的 API（Buffer/JSON/正則/Math…基本全通），
  別直接假設「Code 節點=不能用」。
- 改動 NAS workflow 牽涉長 Code 字串時，**用腳本生成 JSON 再 PUT**（見
  `scripts/ig-watchdog/build_n8n_workflow.cjs`），別在 n8n 編輯器手改，
  版本控管與除錯都更可靠。
- 任何串接 Supabase 查詢的 n8n 節點，若該表「目前為空」是合理狀態（非錯誤），
  必須設 `alwaysOutputData`，否則上線後資料一多起來才會踩到，本地測試容易漏掉
  （測試資料通常都「剛好」有結果）。

## 相關
- [[2026-05-18_n8n-nas-code-node-limits-telegram-debug]]（原始教訓，本篇是精確化補充）
- Session 110 完整變更見 `Changelog.md` 2026-06-19 條目