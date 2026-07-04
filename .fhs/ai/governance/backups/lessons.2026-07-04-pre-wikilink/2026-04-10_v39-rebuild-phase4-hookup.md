# 教訓記錄 — V39 Rebuild Phase 4 Hookup

日期：2026-04-10
主題：V39 Dashboard 原型接回 n8n Webhook（Phase 4 完成）

## 完成事項

V39 Rebuild 全 4 個 Phase 在本 session 完成：

- **Phase 3**：code-reviewer 稽核 → **PASS**（180+ CONTRACT IDs 全數存在，零 V36 舊 class 殘留，零外部依賴）
- **Phase 4**：8 個 TODOhookup 全數接回真實 n8n webhook

## 接回細節

| # | Function | 接回動作 |
|---|---|---|
| 1 | `loadSystemConfig()` | 解除 fetch 註解，保留 catch 中的 syncConfigUI() fallback |
| 2 | `saveSeqSettings()` | 解除 fetch + HTTP status 分支，移除模擬文字 |
| 3 | `checkOrderIDDuplicate()` | 解除 fetch，found/not-found 邏輯恢復 |
| 4 | `fetchOldOrder()` | 解除 fetch + 完整 restoreFormState 呼叫邏輯（從 V36 補回） |
| 5 | `syncToAirtable()` | 重寫：從 V36 完整複製 payload 構建邏輯（K/M/P items + Update_Note + Raw_Form_State 注入） |
| 6 | `executeDeleteOrder()` | 解除 fetch，改用 showToast() 取代 alert |
| 7 | `fetchGlobalReview()` | 解除 fetch + query param 拼接邏輯 |
| 8 | `saveInlineEdit()` | 解除 fetch + HTTP status 分支 |

## 關鍵教訓

1. **syncToAirtable 的 prototype 版本是簡化版**，省略了 K/M 品項擷取邏輯與 Update_Note 計算。Phase 4 接回時必須從 V36 完整複製，不能只解除 fetch 註解。

2. **prototype 中部分 TODOhookup 用 `alert()` 模擬成功**，接回時需改回原有的 `showToast()` 或 `alert()` 根據 V36 原邏輯判斷。

3. **fetchOldOrder 的還原邏輯（deposit/balance/Raw_Form_State）在 prototype 中被完全省略**，接回時需補回完整的 data 解析和 restoreFormState 呼叫。

## 後續

- V39 prototype 現為 **production-ready**（已接回所有 webhook）
- 下個 session 可考慮：部署測試 / 重命名為正式版 `freehandsss_dashboardV39.html`
