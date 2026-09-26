# /cl-flow-fast — 精簡規劃與對抗評審

**依賴**：`.fhs/ai/commands/rp.md`、`scripts/cl-flow-runner.js`、Node.js、runner 的對抗評審服務設定、`artifacts/`。
**不可攜平台**：未安裝 Node.js 或未設定評審服務的平台不可完成外部評審。
**副作用**：只寫規劃 artifacts，不修改業務代碼。

適用於範圍已知的功能、介面及錯誤修復。涉及新服務或重大架構取捨時使用 `/cl-flow`。

1. 用 `/rp` 輕量精煉任務，展示 XML；接受修訂，收到用戶繼續指示後才執行 runner。
2. 查證 repo 實況，執行 `node scripts/cl-flow-runner.js --init "任務描述"`，取得 `flow_id`；寫 `artifacts/{flow_id}/a3-draft.md`，包含現況證據、檔案清單、步驟、風險與驗收。
3. 執行 `node scripts/cl-flow-runner.js --review {flow_id} --fast`；核對 `ag-review.md` 與 state。評審失敗即標 degraded，不能當作已獨立審查。
4. 逐條處理批評，記錄嚴重度、採納落點或拒絕反證。阻斷項未解決時不得標為可直接執行。
5. 寫精簡 `artifacts/{flow_id}/cl-final-plan.md`，列裁決、批評處理表、最多十項執行清單、驗收及授權提示。更新 state 為等待執行，展示後停止。
