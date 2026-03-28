# 20260326_n8n_Soul_Restoration_V45.7.4

## 學習點總結
成功修復 n8n 生產環境「靈魂丟失」事故。重點在於使用 SSH/SQLite 強制同步 `activeVersionId`，並發現 n8n Code Node v2 必須回傳 `[{json: {...}}]` 格式以防止財務稽核失效。

## 詳細紀錄
1. **事故現象**：n8n 被降級為 23 節點版本，導致 Telegram 戰報內容丟失，財務稽核頻繁發出假警報。
2. **技術根因**：使用了 "Import From File" 導致 activeVersion 斷鍊。
3. **修復方案**：
    - 通過 SSH 進入 Synology NAS。
    - 使用 `sqlite3` 修改 `workflow_entity` 資料表，將 `activeVersionId` 手動指向 24 節點的 Gold Master。
    - **Code Node v2 修復**：發現 Code Node v2 (runOnceForAllItems) 若回傳裸物件，下游 Switch Node 會接收為 `undefined`。必須包裝成 `[{json: auditResults}]`。
4. **防護措施**：禁止生產環境 Import，強制使用 API 更新。

## 標籤
#n8n #Airtable #Bugfix #Architecture
