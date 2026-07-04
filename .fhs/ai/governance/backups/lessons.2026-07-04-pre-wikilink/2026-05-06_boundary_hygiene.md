# Lesson: 執行邊界認知與架構衛生守護 (2026-05-06)

## 💡 核心教訓 (Key Lessons)

1. **執行邊界 (Execution Boundary)**:
    - **問題**: AI 有時會過於「積極」修復發現的小問題，而在未獲授權的情況下直接修改檔案。
    - **對策**: 嚴格遵守 `AGENTS.md` 中的「規劃優先」原則。無論改動多小，只要涉及檔案寫入 (Write) 或刪除 (Delete)，必須先產出 `ag-plan` 並等待用戶 (Fat Mo) 授權。禁止在未授權下執行「靜默修復」。

2. **架構衛生 (Architecture Hygiene)**:
    - **冗贅清理**: 對於已不再需要的指令 (如 `rebuild_index.py`)，應徹底從實體檔案與文檔參照中移除，以減少 AI 的 Token 消耗與路徑混淆。
    - **歷史歸檔**: 過往的歷史遷移腳本 (Legacy Scripts) 不應與現役腳本混雜。應在 `README.md` 中設立專屬區塊說明其用途與停用狀態，避免 AI 誤用。

3. **橋接完整性 (Bridge Integrity)**:
    - 當 Master 指令集 (.fhs/ai/commands/) 更新時，必須同步檢查並補齊橋接層 (.agents/workflows/)，確保不同入口 (Antigravity/Claude Code) 都能正確執行相同的標準流程。

## 🛠️ 最佳實踐 (Best Practices)

- **Atomic Update**: 在執行 `/execute` 後，務必檢查 `repo-map.md` 與 `CHANGELOG.md` 的同步狀況。
- **Command Indexing**: 新增指令後，除了建立橋接檔，也要將其登錄在 `commands/README.md` 與 `SOP_NOW.md` 中。
- **Zero Placeholder**: 避免在文檔中留下「待辦」或「未完成」的模糊描述，若已完成應立即更新狀態。

## 🔗 相關參考
- [AGENTS.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/ai/AGENTS.md)
- [SOP_NOW.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/notes/SOP_NOW.md)
