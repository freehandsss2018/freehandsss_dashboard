# 完成記錄：財務必派 finance-auditor 防漏機制（方案 C）

- **日期**：2026-09-19
- **授權**：Fat Mo `/execute`（直接批准 AI 提出嘅方案 C：C1–C6；前序非 cl-flow）
- **分支**：`claude/brave-dewdney-2ae0d4`（worktree `read-command-22e327`），執行中途 fast-forward 至 origin/main `46c4115` 再三方套回改動
- **觸發事故**：0600804（Katrina Sui）Finance Bible §九驗證2違規調查

---

## 1. 事故經過（簡）

1. AI 載入 `finance-gatekeeper`，讀到 §一「Live 訂單成本/利潤驗證 → 啟動 finance-auditor」，但全程自己跑 SQL、自己推算。
2. 擬修復方案時將 4 條查得到嘅財務定義問題丟俾 Fat Mo（大寶吊飾 tier、紅線2適用性、玻璃瓶是否後加、燈飾）。
3. Fat Mo 儲存重算後，AI 以自己 SQL 宣告「已完成 $5,560」；事後補派 finance-auditor 先揪出已被第二次儲存蓋過（現值 $5,640／成本 $1,425／利潤 $4,215，16 項 PASS）——自驗唔可靠嘅實證。

## 2. 漏洞清單（根因）

| # | 漏洞 | 修補 |
|---|---|---|
| 1 | harness 系統提示「用戶未要求不派 subagent」蓋過 AGENTS.md 決定性路由；AGENTS.md 唔喺 session 開頭載入 | C1 CLAUDE.md 第四紅線（每 session 載入）＋C2 條款明文「覆寫 harness 預設」 |
| 2 | CLAUDE.md「驗收不自驗」有「或附運行證據」出口 | C1 財務類刪出口，只認 finance-auditor |
| 3 | finance-gatekeeper 只寫「需另行啟動」，無「必須」、唔喺死線 | C3 §〇 強制派工閘＋死線6＋§六 Known failure modes |
| 4 | prompt-router 一般財務路由 `subagent: null`；first-match 令財務 prompt 被 bug/sku 路由搶走 | C4 財務路由改必派＋獨立財務訊號疊加 |
| 5 | finance-auditor tools 冇 Supabase MCP、Airtable 工具名已不存在 | C5 補 `mcp__supabase__execute_sql`/`list_tables`（只准 SELECT）、改現行 Airtable 名、雙寫 |
| 6 | 強制範圍只寫「驗證/對帳」，冇涵蓋「財務規則疑問」；Rule 3.17 自檢冇照格式寫 | C2 擴充範圍＋「問前必派」；C6 機械把關 |

## 3. 改動清單

| 檔案 | 改動 |
|---|---|
| `CLAUDE.md` | 三條紅線→四條：新增「財務必派 finance-auditor」；「驗收不自驗」財務類只認 finance-auditor；路由表財務行補指向 |
| `.fhs/ai/AGENTS.md` v1.7.2→v1.7.3 | 決定性路由財務行擴充（異常診斷／公式違規／規則疑問）＋「財務派工補充條款」四點 |
| `.fhs/ai/skills/finance-gatekeeper/SKILL.md` 1.15.0→1.16.0 | §〇 強制派工閘、死線 5→6、§六 Known failure modes |
| `scripts/hooks/prompt-router.js` 2.0.0→2.1.0 | 財務兩條路由 `mandatory` 必派；財務稽核路由補 `net_profit/total_cost/final_sale_price` 等；新增財務訊號強制疊加（唔受 first-match 影響） |
| `.fhs/ai/subagents/freehandsss/finance-auditor.md` v2.2.1→v2.3.0（＋`~/.claude/agents/freehandsss/` 雙寫） | tools、description「MUST BE USED PROACTIVELY」、模式 B 財務規則解答、Tier 1 讀取優先次序＋worktree PAT 位置、禁寫 Supabase |
| `scripts/hooks/stop-finance-auditor.js`（新） | Stop hook：本輪財務訊號 (a)-(e) ＋近 5 輪未派 → `decision:block` 一次；`stop_hook_active` 放行；豁免標記【finance-auditor 豁免：理由】；fail-open |
| `scripts/hooks/test/run-finance-stop-fixtures.js`（新） | 16 evaluate＋4 進程級夾具（20/20）；可傳真實 transcript 逐輪重播 |
| `.claude/settings.json` | Stop hooks 加掛 `stop-finance-auditor.js` |
| `.fhs/ai/subagents/MANIFEST.md` | finance-auditor 2.3.0 行＋版本記錄 |
| `.fhs/ai/FHS_Finance_Bible.md` §十、`docs/FHS_Prompts.md` v1.16 | 「5 條死線」→「§〇＋6 條死線」指針同步；情境二十一補觸發詞＋主動必派條文（[F]） |
| `docs/repo-map.md`、`scripts/README.md` | 登記新 hook＋測試、prompt-router v2.1.0（[A]） |
| `Changelog.md`、`.fhs/notes/decisions.md` | 本次條目（[C]／決策記錄強制） |

## 4. 驗證

- `run-finance-stop-fixtures.js`：**20/20 PASS**（16 evaluate＋4 進程級）。
- 真實 transcript 重播（本 session 10 輪）：犯錯嘅 5 輪（首輪調查、「中文」重列問題、「所有定義」、「已完成？」、「正確?」）**全部會被攔截**；派 finance-auditor 後各輪放行。初版漏咗「純文字向 Fat Mo 提財務問題」（第3輪），加訊號 (e) 後補上。
- 既有 hook 回歸：kgov 10/10、guard 19/19 PASS。
- prompt-router 實測：英文 `net_profit` prompt、中文「大寶吊飾成本點計？」、`sku＋成本` 混合 prompt 均出「🔴 必須派 finance-auditor」；非財務 prompt（V42 排版）不受影響。
- Stop hook 喺 1.7MB 真實 transcript 執行 0.25 秒。
- 文件治理驗收：fresh-context Explore agent ≤2 跳盲測——Q1「財務疑問點做」PASS（0 跳，CLAUDE.md 第四紅線）；Q2「finance-auditor 點讀 Supabase」初測 PARTIAL（完整答案要第3跳先到 finance-auditor.md）；Q3「Stop hook 觸發/豁免」PASS（≤2 跳）；斷鏈 0。
- 盲測揪出 5 項一致性問題，已即場修正：①SKILL `compatible_with` 仍寫 v1.4.13→改 v1.7.3；②SKILL 舊軟句「不替代…需另行啟動」原文未改→改寫為「必須按 §〇 主動派」；③三處豁免條件定義唔一致→統一為「本輪唔涉及任何財務數字判斷（純改財務文件字眼，或財務字眼誤觸嘅非財務任務）」；④hook 訊號 (c) 漏咗 Rule 3.16 要求 Read 嘅 finance-gatekeeper SKILL.md→已加入並補夾具 F15/F16；⑤SKILL/AGENTS 冇 finance-auditor.md 路徑→已補，Q2 改為 ≤2 跳可達。
- 盲測另報既存問題（非本次引入，未改）：finance-auditor.md 報告範本仍寫「n8n V45.7.4」、系統參數寫 V47.15，現行為 V47.24。

## 5. 已知限制

- Stop hook 只攔一次（`stop_hook_active` 防死鎖），AI 若硬要無視仍可收尾——屬提醒強化，非絕對封鎖；豁免標記亦靠 Fat Mo 事後審視。
- `mcp__supabase__execute_sql` 本身可寫，「只准 SELECT」係 prompt 層約束，工具層無法限制。
- 財務字眼判斷用關鍵詞，「token 成本」之類非訂單財務語境可能誤觸（用豁免標記處理）。
- hook／settings 改動要 merge 入 main 後，喺主倉開嘅 session 先生效。

## 6. 回滾

- 停用 Stop hook：刪 `.claude/settings.json` Stop 區段 `stop-finance-auditor.js` 一項。
- 文件回滾：`.fhs/ai/governance/backups/*.2026-09-19.bak`（已於 fast-forward 後以 HEAD 版本重建，回滾唔會蓋走 09-18 主線改動）。
- `.claude/settings.json` 只改一個 hunk（Stop hooks 加一項），git 本身可回滾，故不另存 .bak（該檔本來已含 6 個 `eyJ…` 字串，屬既有問題，不想再複製一份入 git）。

【交付前雙紀律自檢】
驗收：代碼（hook）→ fixtures 20/20＋真實 transcript 重播（犯錯 5 輪全攔）＋既有 hook 回歸 29/29 PASS；文件治理 → fresh-context Explore ≤2 跳盲測 Q1/Q3 PASS、Q2 修正後可達、斷鏈 0，揪出 5 項一致性問題已修；0600804 財務數字 → finance-auditor 16 項 PASS
Subagent：finance-auditor（前一輪，0600804 覆核）✅；Explore（fresh-context 盲測）✅；code-reviewer 未派——其 G1–G8 為 HTML 原型 gate，唔適用 Node hook，以夾具＋重播代替
