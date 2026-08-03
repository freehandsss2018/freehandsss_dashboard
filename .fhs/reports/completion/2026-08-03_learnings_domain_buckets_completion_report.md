# 完成記錄：learnings 系統領域分桶重構（D56）

> flow_id: `2026-08-03-2003`／執行：Claude Code Opus 5／2026-08-03

## 一、任務背景

Fat Mo 提出優化 learnings 系統：由「單檔 50 條硬上限」改成分類化知識庫，目標包括避免不必要刪除有用經驗、擴張資料庫容量、減低 token 消耗（先分類再讀取相關類別）、處理跨類別範疇、從 `/8d` 方向導向出發。

## 二、規劃階段（`/cl-flow` + `grilling` 九題拷問）

- 前置：`/rp` 精煉 + `grilling` skill 九題逐一拷問（Q1-Q9），每題附建議、實測證據、Fat Mo 裁決
- 過程推翻兩個原始前提，Fat Mo 皆接受：①目標「避免不必要刪除」實測 22 段退役附註全部理由正當，真正冤案接近 0，方案價值改為「教訓真正生效」而非「解救經驗」；②「從 `/8d` 出發」實測 8 維度套 50 條有 42 條無格可放，改為 8d 降級做路由觸發器
- A3 草案（`artifacts/2026-08-03-2003/a3-draft.md`）：全部經 Grep/Read 實測驗證（三重執法位置、路由 hook 限制、外部引用點）
- A2 Gemini 對抗評審（A1 Perplexity 因配額用盡缺席，degraded）：7 條批評，1 BLOCKER 全採納且經實查加重、4 MAJOR 全採納/部分採納（附反證）、2 MINOR 採納並改進
- Verdict：`CONDITIONAL_READY`（P1+P2 無條件批准，P3 需先過 session_id 探針）

## 三、P3.0 探針（Verdict 強制前置關卡）

實查 `grep -rn "session_id" scripts/hooks/*.js` 為零結果，故不能假設 payload 結構。於 `prompt-router.js` 加一次性診斷探針，等候真實 UserPromptSubmit 事件觸發，實測結果：`session_id` 為穩定 UUID、`transcript_path` 亦存在。探針完成後移除診斷代碼，按 Verdict 分支一實作。全文見 `decisions.md` D56 條目。

## 四、執行內容

### P1 — 純搬遷

- 新建 `.fhs/memory/learnings/{README,supabase,frontend,finance,n8n,governance,tooling}.md`
- 50 條教訓逐字遷移（零改寫），套用 `` `@主桶 +副桶` `` tag + `<!-- v:日期 -->` 複驗標記
- 22 段 📌 退役附註 + 檔頭制度說明搬入 README.md「退役登記冊」
- `learnings.md` 內容替換為 3 行 stub
- 修正 4 處外部號碼引用（`session-log.md` ×3、`decisions.md` ×2）+ 1 處既有斷鏈（`commit.md:123` 引用已退役的 `#28`）

**P1 驗收**：Python script 逐字 diff 比對，50 條零遺失零改寫（過程中修正自己造成的 3 類格式偏差：誤加粗體、漏掉「【Pitfall #19】」/「【高頻⚠️】」標記、夾帶規格外括號說明）；派 fresh-context agent 獨立覆核，結論 `PASS WITH ISSUES`（僅 README 表格統計筆誤，已修正）。

### P2 — 守衛接回

- `fhs-health-rules.json`：6 桶差異化配額規則（supabase 20/frontend 25/finance 20/n8n 20/governance 15/tooling 15）+ README bytes 規則（實測 21,033 bytes，設 28,000）+ 未註冊桶偵測 + 複驗逾期偵測（>365天，`v:unknown` 略過）
- `fhs-health-check.js`：新增 `checkUnregisteredFiles()` + `checkLastVerified()` 兩個檢查函式
- `post-tool-kgov.js` T6：改為逐桶預算判斷；**意外揪出既有 dead code bug**——`SAFE_PATH_PATTERNS` 涵蓋整個 `.fhs/memory/`，令 T6（含 learnings 與 handoff.md 兩個原始目標）自 S148 引入以來從未真正執行過，已修正（T6 移至 safe-path 判斷之前）
- `pre-tool-guard.js` R12：path 擴至 `learnings/` 目錄，finance.md 額外提示財務桶特殊守護
- 新建 `scripts/learnings-pointers.js`：跨桶 pointer 自動生成器，含防呆機制（POINTERS 區塊含正式編號條目 → ERROR 拒絕覆寫）
- `05_maintenance-protocol.md`：§1/§2/§4 三處 learnings.md 引用改 6 桶，補 O1 已知張力備註（governance/tooling 桶與 §2「教訓寫入 skill 本體」規則的關係，留待季度健檢）
- `knowledge-map.md`：learnings 索引改 6 桶，auto-memory 邊界改「可攜性」劃線

**P2 驗收**：19 guard fixtures（含 2 條新增）+ 10 kgov fixtures + 12 health fixtures 全數 PASS 零回歸；實測觸發並復原：未註冊桶偵測、複驗逾期偵測、配額超額觸發、pointer 防呆拒絕覆寫；`fhs-health-check.js` `issue_count` 維持 1（既有 handoff.md 過肥，與本次無關）。

### P3 — 路由注入

- `prompt-router.js`：新增獨立 `LEARNINGS_ROUTES`（6 桶各一組關鍵詞）+ `matchLearningsBuckets()`（多重匹配，不 break，與既有 12 條 subagent 路由完全獨立）
- Slash command 白名單：僅 `/cl-flow`、`/cl-flow-fast`、`/execute`、`/error-eye`、`/guardian` 放行 learnings 注入；`/commit`、`/fhs-slim` 等維護型指令維持 bypass
- Session 去重：`resolveSessionKey()` 優先用 `session_id`（探針已證實存在），狀態寫入 `.fhs/.learnings-injected-<key>.json`（已加入 `.gitignore`）
- `SOP_NOW.md` Step 3：改為讀 `learnings/README.md` 索引，不再全量載入 6 桶
- `commit.md` Phase 1.5：查重目標改 6 桶，補 tag 規格 + pointer 生成器呼叫
- `.claude/settings.json`：移除 4 條因分桶而失效的 awk allowlist

**P3 驗收**：三種 prompt 實測——「n8n 財務 webhook 空 body」→ 正確注入 finance+n8n 兩桶；「/cl-flow 改 Dashboard 排版」→ 白名單放行注入 frontend；「/commit」→ 零注入（bypass 生效）；「今日天氣」→ 零注入。同 session 重複 prompt 第二次不再注入（去重生效）。舊有 12 條 subagent/model 路由（如 Airtable 查詢 → database-reviewer）確認不受影響、與 learnings 注入同時輸出。Token 實測：單桶命中 2,734–8,111 bytes（對比原檔 35,337 bytes，減幅 77–92%）。

## 五、明確不做（技術債，另案處理）

- auto-memory 30+ 條純業務知識尚未依可攜性原則歸位
- 已退役 ~25 條教訓不復活（五類退役理由全部正當）
- `07_compounding-loop.md §2` 與 governance/tooling 兩桶現存全文條目的張力（已於 05_maintenance §2 加註記，留待季度健檢裁決）

## 六、影響檔案總表

**NEW（8）**：`.fhs/memory/learnings/{README,supabase,frontend,finance,n8n,governance,tooling}.md`、`scripts/learnings-pointers.js`

**MODIFY（14）**：`.fhs/memory/learnings.md`（清為 stub）、`.fhs/tools/fhs-health-rules.json`、`scripts/hooks/fhs-health-check.js`、`scripts/hooks/post-tool-kgov.js`、`scripts/hooks/pre-tool-guard.js`、`scripts/hooks/prompt-router.js`、`scripts/hooks/test/guard-fixtures.json`、`.fhs/ai/governance/05_maintenance-protocol.md`、`.fhs/notes/knowledge-map.md`、`.fhs/notes/SOP_NOW.md`、`.fhs/ai/commands/commit.md`、`.claude/settings.json`、`.gitignore`、`.fhs/notes/session-log.md`、`.fhs/notes/decisions.md`（D56 條目）、`.fhs/memory/README.md`、`docs/repo-map.md`

零業務代碼改動：Dashboard HTML / n8n workflow / Supabase schema/RPC/migrations 全程 NO-TOUCH。

**Subagent 使用記錄**：✅ P1 驗收派 fresh-context agent（general-purpose）獨立覆核 50 條零遺失/零改寫/pointer 一致性/退役登記冊完整性，結論 PASS WITH ISSUES（1 項統計筆誤已修正）。其餘階段（P2/P3 實作+驗收）判斷為需要即時交叉核對代碼與已完成 P1 產物、且測試迭代頻繁（多次故意注入/清理測試資料），直接執行效率更高，未派 subagent。
