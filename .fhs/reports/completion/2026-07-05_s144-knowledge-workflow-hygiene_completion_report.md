# S144 完成記錄 — 知識工作流程健檢（查詢路由 + 模型分派文件對齊 + 敘事單源合約 + 降級交接膠囊）

**日期**：2026-07-05
**分支**：`feature/knowledge-workflow-hygiene`（未合併，待 Fat Mo 確認）
**觸發**：Fat Mo 請求對「知識管理三軸」（資料怎麼更快找到／記憶怎麼分層／任務怎麼交接給更便宜模型）做健檢；經實測量化現況 → 八維度分析 v1（inline，非跑 `/cl-flow`）→ 自我批評 3 弱點 → v2 → Fat Mo `/execute`（視為口頭批准，比照 S139 先例）

## 執行範圍（M1'-M4'，v2 版）

| 項 | 內容 | 檔案 |
|---|---|---|
| M2' | 修正 governance/02 §0 subagent 模型釘選表的文件漂移（S139 A3 早已刪除 6 支 `model:` 行，本檔一直沒同步更新）；同時推翻舊表「frontmatter 必須用全名 ID」的未經查證臆測——實測 3 支現役釘選（code-reviewer/build-error-resolver/product-integration-validator）皆用短名 `model: haiku` 且正常運作 | `.fhs/ai/governance/02_model-dispatch.md` |
| M1' | 新增知識檢索路由表，只路由到**檔案類別**（非個別檔案），避免自己變成第七個要人工同步的漂移點 | `.fhs/notes/knowledge-map.md`（新）+ `CLAUDE.md`（路由表加一行） |
| M4' | 新增 T6「降級交接膠囊」模板：高階模型（opus/fable）裁決完畢後，交給下個 session 便宜模型（sonnet/haiku）接手機械執行的標準格式，落點寫進 handoff.md session 條目 | `.fhs/ai/governance/04_delegation-templates.md` |
| M3' | commit.md Phase 1.6 新增「敘事單源分級合約」：(a) 有完成報告的任務 → 報告=全文唯一居所，其他處≤3行+連結；(b) 無報告的小改動 → Changelog 條目=全文居所。治 S142/S143 兩次 MASTER 表 drift 事故的根因（同一件事寫 5+ 處） | `.fhs/ai/commands/commit.md` |

## 查證推翻的兩個前提（八維度分析階段發現）

1. **原判斷「6 支 subagent 仍釘舊世代模型 ID」為過期資訊**：實測 grep `.fhs/ai/subagents/freehandsss/*.md` 與 `~/.claude/agents/freehandsss/*.md`，僅 3 支釘 `model: haiku`，其餘 6 支已無 `model:` 行（S139 A3 已刪除，繼承主對話模型）。governance/02 §0 本身未同步更新才是真正的缺口，非 subagent 定義檔本身。
2. **原判斷「M3 敘事瘦身有 Notion 同步風險」不成立**：實測 `scripts/Sync_Notion_Brain.js` 只讀 `.fhs/memory/lessons/`（71 檔），完全不碰 `Changelog.md`/`session-log.md`，故 M3' 對兩者的分級瘦身零 Notion 影響。

## 本項目適用範例（元示範）

本報告本身即是 M3' 分級規則 (a) 的第一個實例：本任務觸發 execute.md [B]（修改 `.fhs/ai/commands/commit.md` 等制度層檔案），故本報告＝全文唯一居所，`Changelog.md`/`session-log.md`/handoff MASTER 表對應行僅寫 ≤3 行摘要 + 連結指回本檔。

## 驗證

- guard fixtures：**16/16 PASS**，無回歸
- health fixtures：**12/12 PASS**，無回歸
- live health check 實跑：靜默（無警示），確認新增 `knowledge-map.md` 未觸發孤兒/命名衝突偵測
- `.fhs/.kgov-pending` 未生成：確認本次改動未觸及財務/schema/n8n 邏輯（[G] 不觸發）

## 後效同步稽核

- **[A] 結構變動**：新增 `.fhs/notes/knowledge-map.md` → 已更新 `docs/repo-map.md`
- **[B] 制度層變動**：修改 `.fhs/ai/commands/commit.md`（指令層）+ 2 份 governance 文件 → 本報告即為交付物
- **[C] CHANGELOG**：影響未來使用方式（新查詢路由/新交接模板/新敘事寫入規則）→ 已更新 `Changelog.md`（≤3行+連結，依 M3' 新規則本身執行）
- **[F] FHS_Prompts.md**：不觸發——未新增 `.fhs/ai/commands/`（無指令增刪，僅修改既有 commit.md 內容）、未新增 `.fhs/ai/` 下 L2 文件（knowledge-map.md 位於 `.fhs/notes/`）、AGENTS.md 無新增 Rule
- **[G] 運算邏輯變動**：不觸發——無 migration/n8n/calculatePricing/cost_configurations 改動

## 未完成/待 Fat Mo 決定

- 分支 `feature/knowledge-workflow-hygiene` 尚未合併 main
- `.fhs/notes/knowledge-map.md` 為新機制首次落地，尚無使用週期驗證其「按類別」設計是否真的免維護，建議下次查詢知識時觀察是否夠用

【交付前雙紀律自檢】
驗收：文件治理任務 — guard fixtures 16/16 PASS 無回歸；health fixtures 12/12 PASS 無回歸；live 實跑靜默確認新檔零副作用（非口稱）= ✅
Subagent：❌ 未使用 — 4 項改動均為已知路徑定點讀寫（5 個檔案、每檔 1-2 處編輯），按 governance/02 §1「主對話可直接做」清單執行；查證環節（subagent 釘選現況、Notion 同步腳本讀取範圍）屬單次 grep 可解決，不需派工
