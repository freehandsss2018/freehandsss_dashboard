# GLOBAL_AI_SOP v2.0 升級實施計畫 (A2 本地視角)

將目前「Fat Mo 手動橋接 Web / AG / Claude 多環境」的真實工作模式正式寫入 GLOBAL_AI_SOP，並且重構 `/a3go` 邏輯，避免越權與文件衝突。

## Proposed Changes

### 核心協作協議升級
更新全局 SOP 檔案以涵蓋多環境與授權條款：

#### [MODIFY] [GLOBAL_AI_SOP.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/docs/GLOBAL_AI_SOP.md)
- 升級標題與文件頭為 v2.0。
- 重寫第一部分的 A1、A2、A3 角色定義與分工，明確加入 **Fat Mo 做為唯一上下文橋接者**。
- 新增「報告命名規範」（`a1_audit_report.md`, `a1_implementation_plan.md`, `a2_implementation_plan.md`, `a3_execution_verdict.md`）嚴防同名碰撞。
- 規定 A3 產出之 `a3_execution_verdict.md` 應統一存放於 `.fhs/notes/ai_reports/` 目錄中。
- 新增「跨環境上下文條款」（接收轉述資訊時視為草案、須交叉比對）。
- 新增「雙重授權條款」（第一層啟動審核，第二層列出檔案清單並獲取明確同意）。

### 指令重構
將 a3go 指令邏輯與新 SOP 的「雙重授權機制」徹底綁定：

#### [MODIFY] [a3go.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/ai/commands/a3go.md)
- **更改預期行為**：不再固定讀取單一計畫，而是改為嘗試讀取 `a1_...` 與 `a2_...` 新命名規範的檔案群。
- **異常處理強化**：新增規則「若找不到任何符合上述命名的報告時，強制停止執行並主動提示 Fat Mo 提供路徑或檔案」。
- **更改 A3 任務**：強制要求 A3 審核後，**必須**使用 `[MODIFY] / [NEW] / [DELETE]` 的格式輸出明確的「變更檔案清單及絕對路徑」。未列在此清單上的檔案嚴禁修改。
- **釐清語意指令**：明確宣告「/a3go 是進入最終技術把關的觸發器，並非自動覆寫令」。

### 文件索引與 README 同步
根據修訂的「文件同步強制律」，核心 SOP 改版必須同步擴及周邊的 Map 與 README 檔案，確保其他 AI 看見的規則一致：

#### [MODIFY] [repo-map.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/docs/repo-map.md)
- 確保指向 `GLOBAL_AI_SOP.md` 的節點說明已修改為「v2.0 跨環境與多代理協作協議」。

#### [MODIFY] [README.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/ai/README.md)
- 更新關於 `/a3go` 的功能簡述與代理間的角色定位，確保它符合 v2.0 的精神。

#### [MODIFY] [README.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/README.md)
- 於專案根目錄的 README 開頭增加指示：「本專案已升級並遵循 `docs/GLOBAL_AI_SOP.md v2.0` 架構，新進代理請優先閱讀」。

## Verification Plan

### Manual Verification
- **Dry-run 測試驗證**：
  A3 在未來執行任何寫入前，必須先執行一次「Dry-run」，模擬輸出預計會變更的檔案清單，確認雙重授權的安全鎖確實發揮作用，等 Fat Mo 批准後才真的寫入檔案。
- **異常防呆驗證**：
  Fat Mo 清空或隱藏先前的報告檔案，故意觸發 `/a3go`，測試 A3 是否會依規定「強制停止執行並提示路徑錯誤」。
- **正確路徑驗證**：
  檢查產生的裁決結果，是否能自動存放至正確的相對路徑 `.fhs/notes/ai_reports/a3_execution_verdict.md`。
