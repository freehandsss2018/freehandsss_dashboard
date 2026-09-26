# S149 治理系統可攜化 — 完成報告

- 日期：2026-09-26
- 執行依據：D96；計畫 v2＋§5.1＋§5.4 及 `scripts/portability/§4-effective.md`
- 活體分支：`codex/s149-phase345`，承接 `claude/s149-phase2`；Phase 3 `4b0b617`、Phase 4 `4719af3`、Phase 5 本 commit
- 獨立模板 repo：`D:\SynologyDrive\AI_Governance_Template`，v0.1.0，commit `5ee17ca`

## 完成內容

1. Phase 0–1：依賴閘、五套活體基線與 manifest 普查完成；Phase 2 由 Claude Code 拆 guard 並通過 opus 對抗審查，交接 commit `bb3db78`。
2. Phase 3：抽取器以 manifest 非 SKIP 映射 39/39 產生通用模板，另 30 份骨架／設定／範例／工具，共 69 檔。FHS 規則 JSON 保持 SKIP；匯出模板另附中性 `guard-rules.fhs.json`，避免新專案 fail-closed 死鎖。guard 引擎的專案歷史註解已去識別化，環境變數使用通用前綴。八支 commands、governance 00–07、四支專案級 agents、記憶骨架、Mode Card、MCP／hook 設定、橋接產生器與 VERSION/CHANGELOG 均已落地。
3. Phase 4：fresh-context agent 只讀模板 README 做新專案乾跑，先找出 `/read` 缺入口、Windows shell 快照錯報及離線安裝阻塞；修正後 9/9 PASS。獨立演練報告：`2026-09-26_s149-phase4-portability-dryrun_report.md`。
4. Phase 5：D97 記錄完成邊界；README、scripts README、repo map、CLAUDE 路由、05 §7 模板 drift 健檢與 auto-memory 同步。

Phase 5 更新活體 00/05 治理檔後，manifest 兩個 upstream blob hash 已刷新，`check-manifest.js` 再次 PASS。呢兩處係 FHS 模板生產者嘅索引與季度健檢規則；通用 fork 內容毋須變更，匯出模板位元內容維持 v0.1.0。

## 驗證

| 檢查 | 結果 |
|---|---|
| Manifest 非 SKIP 目的檔 | 39/39 存在；額外 30 檔 |
| 匯出後敏感黑名單 | 0 hits；合成正例 PASS |
| 行數預算 | README 53/150；AGENTS skeleton 40/120 |
| 匯出後四套 runner | guard 5/5；kgov 10/10；health 3/3；handoff gate 3/3 |
| Fresh bootstrap | 9/9 PASS-with-fixes；核心命令流程 4.15 秒 |
| SessionStart | Node 入口於乾淨 HOME 真實抽取 fenced handoff，exit 0 |
| Agent/hook 來源 | 專案級 agents，settings 五個 hook 目標均在新 checkout |

## 保留邊界與後續

- 未登入啟動 Claude Code 互動 session；第 1、9 項以實際 hook 命令與乾淨 HOME 的來源核對驗收。可選 API runner 未呼叫第三方服務；離線 bootstrap 無需它。
- 三項 guard 加固留待下一輪：`KIND_SCOPES` scope/kind 相容檢查、JSON BOM 剝除、`symbol_modify_warn` symbols 預編譯。此輪不把提案當成已做。
- 「每 Phase commit 前回填狀態」全域化只提案，須 Fat Mo 另案裁決。模板更新需按 VERSION、manifest blob hash、05 §7 及模板 README 單一寫者流程處理。
- Fat Mo 提到的獨立指令檔 `s149_codex_execute_phase345.md` 未出現在目前 workspace；本輪按 repo 內已批准計畫與對話中列明的 Phase 3–5 要求執行。

【交付前雙紀律自檢】
驗收：manifest、匯出掃描、四套 runner 及 fresh-context 9/9 均有運行證據；外部模板 repo commit 可追溯。
Subagent：Phase 2 opus 三輪（Claude Code）；Phase 3 文件／runtime 分工；Phase 4 fresh-context 盲測一輪。非財務任務，未作財務數值或規則判斷。
