# /cl-flow — 完整規劃與對抗評審

**依賴**：`.fhs/ai/commands/rp.md`、`scripts/cl-flow-runner.js`、Node.js、runner 所需 API 設定、可寫入的 `artifacts/`。
**不可攜平台**：未安裝 Node.js 或未設定 runner 所需評審服務的平台不可執行外部評審；可先產出本地草案並明示缺口。
**副作用**：只寫規劃 artifacts，不修改業務代碼。

1. 對任務執行 `/rp` 完整精煉，展示 `<refined_prompt>` 給用戶審閱。收到修改意見就重寫；收到繼續指示才進入規劃。
2. 查證 `{{PROJECT_NAME}}` 的真實程式與文件，建立基礎分析、受影響檔案、實作步驟、驗收及開放問題。所有路徑須核實；不可填空泛佔位句。
3. 執行 `node scripts/cl-flow-runner.js --init "任務描述"`，從輸出取得 `flow_id`，寫 `artifacts/{flow_id}/a3-draft.md`。
4. 執行 `node scripts/cl-flow-runner.js --review {flow_id}`。檢查評審 artifacts 與 `state.json`；缺評審者記錄 degraded 原因，不能假稱完整評審。
5. 逐條製作批評處理表：來源、嚴重度、採納或拒絕、證據。採納項指向最終計畫落點；拒絕項附實碼、測試或規則反證。未解的阻斷意見限制最終裁決。
6. 寫 `artifacts/{flow_id}/cl-final-plan.md`：裁決、已審資料、批評處理、可執行步驟、驗證清單及所需授權。更新 `state.json` 為等待執行狀態，展示計畫後停止，等待用戶後續指令。
