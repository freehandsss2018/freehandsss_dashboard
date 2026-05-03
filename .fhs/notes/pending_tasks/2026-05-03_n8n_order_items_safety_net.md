# Pending Task — n8n Create Sub Items 安全網修正

- **Title**: 問題一 B — n8n `Create Sub Items` 節點 upsert 安全網
- **Status**: PENDING
- **Priority**: Medium
- **Owner**: A3 (n8n Workflow)
- **Created Date**: 2026-05-03

## 背景

在 2026-05-03 的 Order_Items 完整性稽核中，發現兩個系統弱點：

1. **問題一 A（已修正）**：Dashboard `buildOrderItemsForPricing()` 在 section toggle 關閉但子項目已勾選時，會跳過 K/M items，導致 payload 漏傳。已在 freehandsss_dashboardV40.html 修正。

2. **問題一 B（本待辦）**：n8n Node 17 `Create Sub Items` 的 upsert 行為需要確認——若 payload 中沒有某個 Order_Item_Key，該節點是否會刪除現有的 Order_Items 記錄？若有刪除行為，需移除，確保「只 upsert，不刪舊」。

## 任務描述

### 需要確認的問題
1. n8n `Create Sub Items` 節點目前的行為：
   - 純 upsert（有 key 就更新，沒有 key 就新增）？
   - 還是「先刪除此 Order 所有 Order_Items，再重建」？

2. 若是「先刪再建」模式：需修改為純 upsert 模式，保留未在 payload 中的舊 Order_Items

### 預期修正方案
- 移除 `Create Sub Items` 節點前任何「DELETE 舊 Order_Items by Order_Link」的邏輯
- 確保 Upsert Key = `Order_Item_Key`，只更新已存在的記錄，新增不存在的記錄，不刪除任何舊記錄

## 執行前需確認

- [ ] Fat Mo 授權修改 n8n Workflow（版本會從 V45.7.4 升至 V45.7.5 或更高）
- [ ] 執行前先讀取 n8n workflow JSON，確認 Node 17 現有邏輯
- [ ] 測試修正後的 upsert 行為

## 關聯案例
- 訂單 0601100（Ho Ka Sin）：第二次提交漏傳 K items，若 n8n 有刪舊行為會使問題更嚴重
- 與問題一 A（Dashboard fix）互為「源頭防堵 + 安全網」的雙重保護
