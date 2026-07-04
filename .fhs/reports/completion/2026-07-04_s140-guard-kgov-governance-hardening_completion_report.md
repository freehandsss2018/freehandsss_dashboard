# 完成記錄：S140 稽核修復 — Guard/Kgov 補洞 + 治理層對齊

> **日期**：2026-07-04
> **觸發**：Fat Mo `/execute`（無正式 `/cl-flow` Verdict 前置，屬對話內規劃（v1→自我批評→v2）後明確 `/execute` 口頭批准，見下方程序性註記）
> **範圍**：本 session 稽核發現（F1-F14、L1-L4）的 v2 方案落地，共 4 個 commit 批次（C1-C4）

---

## 程序性註記（誠實記錄，非隱藏）

本次前置為對話內直接稽核分析（八維度 v1→自我批評→v2），非經 `/cl-flow-runner.js` 產生（無 `artifacts/{flow_id}/cl-final-plan.md`）。`.fhs/reports/planning/a3_execution_verdict.md` 為 2026-05-06 舊任務（A1架構衛生/A2初始化），與本次無關，不構成本次 Verdict。

Fat Mo 於看過完整 v2 方案（含 4 個裁決點：F8 deploy 授權方案A+TTL、F4 handoff語義方案A、F7 model alias、F2 只輪換不重寫）後明確輸入 `/execute`，視為口頭批准（execute.md 允許的替代路徑）。C1 範圍另因 key 未輪換而縮小（settings.json/settings.local.json 內嵌 key 條目暫緩），經 `AskUserQuestion` 取得明確確認後執行。

---

## 執行內容

### C1（密鑰止血，guard 補洞部分）
- `pre-tool-guard.js` R2 新增 `sb_secret_` pattern（F13：S139 只補了 sbp_/JWT，漏了 Supabase 新版 secret key 格式）
- `guard-fixtures.json` 新增對應 fixture
- **終局裁決：不清**：`.claude/settings.json`/`.claude/settings.local.json` 內嵌 n8n JWT / Supabase secret key 的 allowlist 條目維持現狀——Fat Mo 明確承擔風險，決定不輪換 key、不清 allowlist 條目，此為結案決定非待辦（2026-07-04 二次確認）

### C2（kgov 三盲區 + deploy 授權機制）
- `post-tool-kgov.js`：`MCP_HIT_TOOLS` 固定 Set 改為後綴匹配函式 `isMcpHit()`（F11：修復 claude.ai Desktop connector 用 UUID 前綴工具名導致的盲區）；新增 `__execute_sql` 後綴命中邏輯，要求「寫入動詞 + 財務關鍵字」雙條件才觸發（F10：修復最常用的 execute_sql 財務改動路徑從未觸發 [G] 稽核的缺口）
- `.claude/settings.json` PostToolUse matcher 同步改為 `mcp__.*__apply_migration|mcp__.*__update_node_code|mcp__.*__execute_sql`
- `pre-tool-guard.js` 新增：
  - **R10**：AI 自行建立/寫入 `.fhs/.deploy-ok` 旗標 → 硬攔截（Write/Edit 與 Bash/PowerShell 兩變體）——防 AI 自我授權
  - **R1/R9 授權旁路**：`.fhs/.deploy-ok` 存在且 10 分鐘 TTL 內 → 放行一次current.html覆蓋、消耗 flag、append 記錄至 `.fhs/notes/deploy-log.md`（F8：解決過去死鎖——Fat Mo 口頭批准後 AI 無任何機制可執行 promote）
  - **R11-observe**：shell 寫入指令命中財務關鍵字 → warn-only 記錄至 `.fhs/.kgov-observe.log`，暫不攔截（F12 降級為 v2 裁決之觀察期方案，避免 matcher 擴大到 Bash/PowerShell 造成 perf/誤觸風險未評估就上線）
  - `.gitignore` 新增 `.fhs/.deploy-ok`
- 端到端測試：無 flag 攔截 / 有效 flag 放行+消耗+落審計 / 過期 flag（11分鐘）自動失效，三態全通過

### C3（文件對齊七項）
- F1：`AGENTS.md` §1 生產版聲明 V41→V42（與實測 hash 一致、與 handoff 決策(1)一致）
- F4：Mid-Session 脈衝條文加第三種豁免「§3 交接強制要求的任務結束交接」，消除與交接強制規則的字面矛盾（方案A）
- F5：`SOP_NOW.md` 版本號類行（n8n/finance-auditor/database-reviewer）改指向 handoff.md/frontmatter 單一真源；subagent「8個」→「9個」；ag-* 三行加 ⚠️DEPRECATED 標記
- F6：`database-reviewer.md`/`finance-auditor.md` installed 版（v2.2.0，S99-100 已合法變更但未回灌）反向同步回 master，消除反向 drift
- F7：3 支殘留 `model:` 釘選（build-error-resolver/code-reviewer/product-integration-validator）改浮動 alias `haiku`，與決策(23)精神一致；master+installed 共 6 檔同步
- F9：`.gitignore` 補 `logs/`（AGENTS §全域硬規則聲稱但未落實）
- F14：`prompt-router.js` 清除死引用 `/px-audit`（已刪除的指令）；skip list 補全現有 slash commands；`ui-ux-pro-max` 從 `skill:` 欄位改為新增 `reference:` 欄位（該資源非 Skill-tool 註冊項，屬參考文件）

### C4（行為層：session log 痛點治本）
- L1：`ui-designer.md`/`frontend-developer.md`（master+installed）新增「動手前置：意圖複述閘」——排版/視覺任務動手前先複述理解等確認，緩解 UI 任務高頻返工（session log 挖出 5 次「我意思是/做錯了」）
- L2：`governance/03_judgment-rubrics.md` R2 追加反例——視覺修復宣告完成前必須實測，呼應 session log 3 次「没有改變/仍有bug」回報
- L3：`03_judgment-rubrics.md` R1 追加反例——斷言外部工具能力（AG Supabase MCP 誤判案例）前必須實測驗證，不可憑記憶斷言
- L4：`governance/02_model-dispatch.md` §7 新增 2 條實戰修正錄——(a) guard 新規則的中文說明文字本身可能誤觸自身 pattern（本次 fixture 撰寫時發生兩次）；(b) 長任務（61次打斷中１/5跟隨「繼續」）應主動分段報告降低使用者打斷需要
- `02`/`03`/`00_INDEX` 版本號同步 patch bump（v1.0.1→v1.0.2 / v1.0.0→v1.0.1）

---

## 驗收證據

| 項目 | 驗證指令 | 結果 |
|---|---|---|
| Guard fixtures 全量迴歸 | `node scripts/hooks/test/run-fixtures.js` | **16/16 PASS**（原12組+新增4組：sb_secret_/R10×2/R11-observe） |
| F10 execute_sql 財務DDL | 模擬 `CREATE OR REPLACE FUNCTION get_financial_kpis()` | FLAG（修復前 NOFLAG） |
| F10b execute_sql 純SELECT | 模擬 `SELECT total_cost FROM orders LIMIT 1` | NOFLAG（正確不誤觸）|
| F11 UUID connector | 模擬 `mcp__3d810ebe-...__apply_migration` | FLAG（修復前 NOFLAG） |
| 既有 update_node_code 迴歸 | 模擬 n8n-mcp-server update_node_code | FLAG（未破壞既有行為）|
| Deploy-ok 三態 | 無flag/有效flag/過期flag(11分鐘) 各跑一次current.html覆蓋模擬 | 攔截 / 放行+消耗+落log / 攔截+自清 全通過 |
| F1 | `grep -c "V41.html.*current" .fhs/ai/AGENTS.md` | `0` |
| F4 | `grep -c "任務結束交接" .fhs/ai/AGENTS.md` | `1` |
| F5 | `grep -c "V47.4\|v2.0.0\|（8個）" .fhs/notes/SOP_NOW.md` | `0` |
| F6 | `diff` database-reviewer.md 兩地 | 空（已同步）|
| F7 | `grep -h "^model:" *.md` (6檔) | 全部 `model: haiku` |
| F9 | `grep -c "^logs/" .gitignore` | `1` |
| F14 | `grep -c "px-audit\|skill: 'ui-ux-pro-max'"` | `0` |
| L1 | `grep -c "意圖複述閘"` (2檔) | 各 `1` |
| L2/L3 | `grep -c "没有改變\|斷言外部工具"` 03檔 | `2` |
| 全部 hook 語法檢查 | `node --check` ×3 | 全部通過 |

---

## 後效同步稽核

**[A] 結構變動**：本次新增檔案僅為 `.fhs/ai/governance/backups/` 內的日期備份副本（改動前依 §5 規則產生），非結構性新增模組/目錄——該 backups/ 目錄本身已於 S137 記錄在 `docs/repo-map.md:141`，個別備份檔為既有已知機制下的常規產出，判斷不觸發 repo-map/README 更新（若 Fat Mo 認為此判斷過寬，請指出，我會補行）。

**[B] 制度層變動**：`AGENTS.md`、governance/ 三檔（00/02/03）均有變更 → **觸發**，本報告即為對應完成記錄。

**[C] CHANGELOG**：涉及行為邏輯改變（kgov 判定範圍擴大、guard 新增授權機制、subagent model 策略改變）→ **觸發**，另行更新 `CHANGELOG.md`（見下一步）。

**[G] 運算邏輯變動**：本次改動皆為治理/hook 層，未觸及財務欄位語義、n8n 節點代碼、`calculatePricing`、或 `cost_configurations` 資料值 → **不觸發**。

**[F] FHS_Prompts.md 同步稽核**：`AGENTS.md` 本次為既有規則語義澄清（非新增 Rule 編號）；`.fhs/ai/commands/` 無增刪；無新增 L2 文件；非核心業務語義修正（財務/產品身份/§0）→ **不觸發**。

**[D] 稽核宣告**：A 不觸發（含理由說明）；B/C 觸發，已/將完成同步。
