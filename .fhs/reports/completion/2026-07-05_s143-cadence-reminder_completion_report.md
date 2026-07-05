# S143 完成記錄 — 衛生指令記憶負擔歸零（週期稽核到期提醒 + 部署前置檢查）

**日期**：2026-07-05
**分支**：`feature/fhs-audit-cadence`（未合併，待 Fat Mo 確認）
**觸發**：Fat Mo 追問「能否不必記憶何時該跑哪支衛生指令」，經評估 agent/loop/合併指令三個方案後判定均不適合（loop 燒 token 且寫入仍要批准、合併違反單一職責），改為延伸 S142 L1 架構的最小增量方案

## 執行範圍（C1-C6）

| 階段 | 內容 | commit |
|---|---|---|
| C1 | rules.json 新增 `cadence_checks`（/fhs-audit，90天，出處governance/05 §7） | `e12d68c` |
| C2 | `fhs-health-check.js` 新增第6檢查 `checkCadenceOverdue()` | `b67f378` |
| C3 | fixtures 補2案（11-overdue/12-fresh），10→12 | `6847998` |
| C4 | `upload-web.md` 加 Step 0 部署前置 `/fhs-check`（預設執行，可明示skip） | `e7e4742` |
| C5 | 驗證：12/12+16/16+live靜默+語法全過 | （驗證，無獨立commit） |
| C6 | 本報告+Changelog+repo-map/README+decisions+handoff | 本commit |

## 核心機制

**「上次執行時間」的推斷方式**：不建新 marker 檔案，直接讀 `/fhs-audit` 既有產物 `.fhs/reports/audits/system/audit_*.md` 的**檔名日期**（非 mtime，避免 git/sync 操作污染判斷——這是 S138 Pitfall #25 教訓的直接應用：不信中繼資料，只信可驗證的內容）。逾期（>90天，出處 governance/05 §7）才印一行提醒；找不到任何報告視為「從未執行過」同樣提醒。

**day-one 行為（實測驗證）**：現存最新報告 `audit_2026-05-17.md`，距今 49 天 < 90 天門檻 → **live 跑動確認完全靜默**，符合預期（機制正確安裝但尚未進入告警窗口，不是沒生效）。

**部署前置**：`/upload-web` 新增 Step 0，預設先跑 `/fhs-check`（全系統功能/資料層壓力測試），FAIL 則停止部署；Fat Mo 可明示 skip（小改動/緊急修復場景），不做成硬性 `exit 1` 攔截（AG 原始建議如此，Verdict 已修正——避免每次小部署都被迫跑一次會建立/刪除測試訂單的重量級測試）。

## 記憶負擔盤點（決策時的完整分析）

四支既有稽核指令的觸發模式：
- `/fhs-audit`（週期型，90天）→ **本次補上自動到期提醒**（原本無人記得，事實上從未執行過制度規定的週期）
- `/fhs-check`（事件型，部署前）→ **本次掛入 `/upload-web` 前置**，部署時自然帶到
- `/guardian`（事件型，大改前）→ prompt-router 已有關鍵詞覆蓋，無缺口
- `/error-eye`（事件型，錯誤發生時）→ prompt-router 已有關鍵詞覆蓋，無缺口

結論：兩個真缺口（週期型無提醒、部署前置未強制掛載）本次補齊；兩個事件型指令現況已被既有機制覆蓋，未動。

## 驗證

- health fixtures：**12/12 PASS**（新增 11-cadence-overdue／12-cadence-fresh，既有 10 案零回歸）
- **12-cadence-fresh 設計亮點**：證據檔用 `run-health-fixtures.js` 在測試執行當下動態產生（今日日期），而非提交寫死日期的靜態檔——避免測試套件在未來某天（>90天後）自然變成假陽性
- guard fixtures：**16/16 PASS**，無回歸
- JS 語法檢查：全過
- live 實跑：0.354s（含新檢查），符合 <2s 預算，靜默行為與現存報告日期推算完全吻合

## 未完成/待 Fat Mo 決定

- 分支 `feature/fhs-audit-cadence` 尚未合併 main
- `/fhs-check` 目前的 skip 機制純口頭記錄，未落審計檔——若未來 skip 頻繁發生需要稽核軌跡，可仿 `.fhs/notes/deploy-log.md` 模式另建

【交付前雙紀律自檢】
驗收：治理層工具擴充 — health fixtures 12/12 PASS（含day-one行為的實測驗證，非臆測）；guard fixtures 16/16 無回歸；live 實跑計時 0.354s<2s = ✅
Subagent：❌ 未使用 — 延伸既有 S142 架構的小範圍增量（1個新檢查函式+1個規則節+2個測試+1處指令文件），範圍明確、可直接程式驗證，不適合派工
