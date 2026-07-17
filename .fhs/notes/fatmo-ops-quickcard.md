# Fat Mo 操作手冊（AI 能力速查卡）

> 本卡收錄 Fat Mo 日常最常用能力子集，非 harness/FHS 完整清單；完整 AI 資產真源見 `/team`（`artifacts/agent_dashboardV42.json`）。
> 產出於 2026-07-16，經 `/cl-flow` A3-first 管道規劃（flow_id `2026-07-15-2330`，見同 flow 的 `cl-final-plan.md`），批評處理表逐條帶證據，已 fresh-context agent 覆核。

---

## 核心集（10 條，日常直接用）

### 日常操作

| 情境 | 講咩 | 會發生咩 | FHS 實例 |
|---|---|---|---|
| 需求模糊，想先整理思路先決定點做 | 「/rp [你嘅問題]」 | AI 重寫做結構化 XML（context/objective/constraints/8維度掃描），停喺度等你審閱，唔會自動執行任何嘢 | 「/rp 我想加一個付款欄位」 |
| AI 提出模糊需求，或你自己有個計畫想俾人逐條質問清楚先做決定 | 「拷問我」 | 轉入 grilling 技能，逐條問你，你答完先問下條，每條有建議答案 | D39 cl-flow 重組七條問答收口先執行（詳情見 `grilling-quickcard.md`，本卡不重列） |
| 完成一輪工作要交接/存檔 | 「/commit」 | 整理 handoff.md、同步 Notion、寫 session-log | 每次 session 尾聲 |
| 想直接查 Supabase 數據 *(暫定，待用量驗證)* | 「/db-query [問題]」 | AI 用 Supabase MCP 執行唯讀查詢 | 查某張訂單嘅確收金額 |

### 規劃與查詢

| 情境 | 講咩 | 會發生咩 | FHS 實例 |
|---|---|---|---|
| 架構決策/新系統/重大改動，想有外部視角把關 | 「/cl-flow [任務]」 | A3 先寫草案，A1（Perplexity）+A2（Gemini）評審，A3 出 Verdict，停喺度等 `/execute` | 本次 cl-flow 管道重組（D39）本身 |
| 功能實作/UI改動/Bug修復，架構已定，唔想使咁多 token | 「/cl-flow-fast [任務]」 | 同上但跳 A1 外部研究（評審一步保留），較快 | 改個表單欄位 |
| 想睇齊晒 AI 有邊啲隊員/指令/自動化存在 | 「/team」 | 重生成名冊，出 `agent_dashboardV42.html`+`.json` | 想知邊個 subagent 識審財務 |

### 驗收抽查

| 情境 | 講咩 | 會發生咩 | FHS 實例 |
|---|---|---|---|
| 財務/schema/n8n部署/生產HTML 嘅改動完成咗，AI 唔可以自己話自己啱（`CLAUDE.md` 三條紅線第三條：「驗收不自驗：財務／schema／n8n 部署／生產 HTML 的改動，驗收派 fresh-context agent 或附運行證據」） | 「派 fresh agent 驗收/覆核 [嘢]」 | 開一個冇見過呢場對話嘅新 agent，淨係俾佢睇證據去核實 | 今次批評處理表覆核——抓到一條假採納（`/db-query` 承諾嘅標註原本冇落地，已補正） |
| 想知成個系統衛生狀況（21 項、5 大類全面稽核） | 「/fhs-audit」 | 全系統架構衛生稽核 | 定期健檢 |
| 想快速知成個系統健唔健康（比 audit 快） | 「/fhs-check」 | 全系統健康檢查 | 唔記得上次幾時檢查過 |

---

## 擴展集（存在，一句話連結，唔喺本卡教學）

| 能力 | 一句話 |
|---|---|
| ScheduleWakeup | 排程未來喚醒（例如「4 週後自動覆核」），已用於 D28 llm-council-skill 試用閘 |
| EnterWorktree / ExitWorktree | 隔離工作區，本次 D39 執行本身就運行喺 worktree `cl-flow-instructions-a03768` |
| `/loop` | 定時重複執行某個 prompt/指令 |
| spawn_task | 背景任務 chip，唔打斷主線，適合順手發現嘅技術債 |

---

## 角色速查（想搵邊個 agent，先睇呢張細表）

| 想做咩 | 揀邊個 |
|---|---|
| 財務/成本/利潤改動驗收 | `finance-auditor` |
| Airtable schema / n8n 資料流靜態審查 | `database-reviewer` |
| HTML/前端上線前 Gate 稽核 | `code-reviewer` |
| n8n workflow / JS runtime 錯誤診斷 | `build-error-resolver` |
| 新產品/新 SKU 跨層驗證 | `product-integration-validator` |
| 大範圍搜尋/開放式研究 | `Explore` / `general-purpose` |

完整 7 類成員見 `/team`。

---

## ⚠️ 進階/高風險能力（存在但唔喺本卡教學）

| 能力 | 提示 |
|---|---|
| Workflow | 多代理編排腳本，一次可生成幾十個 subagent，token 消耗大——存在，需另讀 Workflow 工具本身嘅 schema，唔好靠呢張卡自學 |
| RemoteTrigger | 遠端觸發機制——存在，唔好靠呢張卡自學 |

---

## 附錄：重疊沉積盤點

| 檔案 | 職責 | 與本卡關係 |
|---|---|---|
| `CLAUDE.md`（root） | AI 導航：治理路由表「做 X 之前先讀 Y」 | 職責正交（AI 讀者 vs 本卡人讀），已加一行輕量互指（見治理路由表最後一列），非合併 |
| `.fhs/notes/knowledge-map.md` | 查歷史知識/決策/教訓去邊搵 | 職責正交（查過去 vs 查當下能力），不重疊 |
| `/team`（`ai-team-registry.md`） | 機器盤點全部 AI 資產，真源 `team-manifest.json` | **非完全正交**——本卡核心集/擴展集之指令清單為 `/team` manifest 嘅人讀子集投影，非獨立維護；`/team` 更新時本卡子集需人手覆核是否跟進（暫無自動同步機制，屬已知限制） |
| `.fhs/notes/grilling-quickcard.md` | 拷問技能專屬速查卡 | 本卡「拷問我」一行連結指返呢份，不重複列細節 |

**發現嘅真實待清項（非本卡範圍，順手記錄避免重複）**：`/team` 上次重生成（S174/S175）撈到 4 項 subagent 版本漂移勘誤（`database-reviewer`/`tdd-guide`/`ui-designer` 版本號、`finance-auditor` 未登記 MANIFEST）未清，已存在於 handoff.md 待辦，本卡不重複處理。
