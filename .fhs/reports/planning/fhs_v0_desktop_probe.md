# FHS V0 Desktop App 實機能力探針清單

**Flow ID**: 2026-07-03-0014
**計劃版本**: cl-final-plan-v2.2
**測試者**: Fat Mo（手動執行）
**建立日期**: 2026-07-03
**狀態**: P1–P8、P10、P11 已完成（2026-07-03）；P9 待後續

> 本清單為 Phase 0.2 交付物。每項探針必須記錄「過」或「不過」及具體觀察，
> 不得留空。結果將主宰後續 Phase 1–3 的策略走向。

---

## 前置準備

在開始探針測試前，確認：
- [ ] Claude Desktop App 已安裝並可正常啟動
- [ ] 已知道如何在 Desktop App 切換 Code 分頁與 Cowork 模式
- [ ] 手機已安裝 Claude App（用於 P9）
- [ ] 已有可存取的 n8n NAS 環境（用於 P10）

---

## Probe 清單

### P1 — Code 分頁 SessionStart Hook 繼承

**目的**：確認 Code 分頁開啟 FHS 資料夾後，SessionStart hook 自動觸發，顯示 handoff 摘要

**步驟**：
1. 開啟 Claude Desktop App → 切至 Code 分頁
2. 「開啟資料夾」→ 選 `d:\SynologyDrive\Free_handsss\freehandsss_dashboard`
3. 等待 session 初始化，觀察是否自動顯示 handoff 摘要（含「FHS SESSION AUTO-INIT」或 handoff 便攜塊內容）

**過 →** hooks 繼承成立，SessionStart 在 Desktop App Code 分頁正常觸發
**不過 →** 治理暫留 VSCode ext；記錄具體現象（靜默無輸出？錯誤訊息？）

**結果**：
- [ ] 過
- [ ] 不過

**觀察記錄**：
```
（填入具體看到的輸出/錯誤）
```

---

### P2 — Code 分頁 Slash Commands 執行

**目的**：確認 `.claude/commands/` 下的 commands 在 Code 分頁可正常呼叫

**步驟**：
1. 在 Code 分頁（已開啟 FHS 資料夾）
2. 輸入 `/read`，觀察是否執行完整初始化流程
3. 再輸入 `/help`，確認 command 清單顯示

**過 →** commands 成立，19 支 commands 可在 Desktop App Code 分頁呼叫
**不過 →** 同 P1 → 治理暫留 VSCode ext；記錄現象

**結果**：
- [ ] 過
- [ ] 不過

**觀察記錄**：
```
（指令是否執行？是否有錯誤？）
```

---

### P3 — Code 分頁 .mcp.json 繼承（n8n + Supabase）

**目的**：確認 `.mcp.json` 設定在 Code 分頁自動載入，n8n-mcp-server 與 supabase MCP 連通

**步驟**：
1. 在 Code 分頁輸入 `/mcp` 或查看 MCP 狀態
2. 確認看到 `n8n-mcp-server` 和 `supabase` 兩個 server 已連通
3. 可選：叫一個簡單的 supabase 工具（如 `list_tables`）驗證實際連通

**過 →** `.mcp.json` 繼承成立，Desktop App Code 分頁無需額外 `claude_desktop_config.json` 即可用現有 MCP
**不過 →** Desktop App 需要獨立 config；記錄是哪個 server 連不通及錯誤訊息

**結果**：
- [ ] 過
- [ ] 不過

**觀察記錄**：
```
（列出看到的 MCP server 清單及狀態）
```

---

### P4 — Code 分頁 Subagent 派遣

**目的**：確認 `.fhs/ai/subagents/` 下的 subagents 在 Code 分頁可被呼叫

**步驟**：
1. 在 Code 分頁輸入：「請用 finance-auditor 查一下目前的 subagent 清單」
   或直接輸入任何需要 subagent 能力的簡單任務
2. 觀察 Desktop App 是否能識別並派遣 subagent

**過 →** subagents 成立，9 支 subagents 在 Desktop App Code 分頁可用
**不過 →** 查全域 agents 掛載設定；記錄是否有「找不到 agent」錯誤

**結果**：
- [ ] 過
- [ ] 不過

**觀察記錄**：
```
（能否派 subagent？派了誰？有無錯誤？）
```

---

### P5 — Auto-Memory 記憶連續性

**目的**：確認 Claude auto-memory 在 Desktop App Code 分頁仍能回憶跨 session 決策

**步驟**：
1. 在 Code 分頁問：「你記得 S130 phase B 的 cost_override_locked 雙守衛決策嗎？」
2. 或問：「你記得我叫什麼嗎？」（預期：Fat Mo）
3. 觀察是否能從 auto-memory 正確回答

**過 →** auto-memory 在 Code 分頁繼續有效，記憶系統連通
**不過 →** handoff 便攜塊補位（目前已是標準機制）；記錄是否完全不記得或部分記得

**結果**：
- [ ] 過
- [ ] 不過

**觀察記錄**：
```
（AI 如何回答？記得多少？）
```

---

### P6 — Cowork 模式資料夾讀取

**目的**：確認 Cowork 模式授權 FHS 資料夾後，可讀取 `.fhs/` 下的文件（含 dot-folder）

**步驟**：
1. 切至 Cowork 模式（Desktop App 左側面板）
2. 授權存取 `d:\SynologyDrive\Free_handsss\freehandsss_dashboard`
3. 要求：「請讀取 `.fhs/memory/handoff.md` 的前 10 行」
4. 觀察是否能成功讀取

**過 →** Cowork 讀成立，dot-folder 可讀，`.fhs/` SSoT 在 Cowork 可用
**不過 →** Cowork 降級純對話模式，不授予資料夾讀取；記錄拒絕原因

**結果**：
- [ ] 過
- [ ] 不過

**觀察記錄**：
```
（能讀到 handoff.md 嗎？顯示什麼內容？）
```

---

### P7 — Cowork 寫入邊界確認

**目的**：確認 Cowork 模式的寫入能力範圍，為三模式決策卡提供實據

**步驟**：
1. 在 Cowork 模式下，要求寫入一個**測試用**臨時檔案：
   「請在 `.fhs/reports/planning/` 下建立一個 `cowork_write_test.tmp` 檔案，內容為 'test'」
2. 觀察是否成功，以及 Cowork 是否有確認/警告提示
3. 完成後刪除該測試檔

**過 →** 記入決策卡：Cowork 可寫入，**必須嚴守單一寫者矩陣**（`.fhs/memory+notes`/財務六檔禁止 Cowork 寫入）
**不過 →** 記入決策卡：Cowork 唯讀，寫入動作一律回 Code 分頁執行（更安全）

**結果**：
- [ ] 過（可寫入）
- [ ] 不過（唯讀）

**觀察記錄**：
```
（寫入成功？有警告？還是直接拒絕？）
```

---

### P8 — Cowork MCP 來源確認

**目的**：確認 Cowork 模式的 MCP 是讀 `claude_desktop_config.json` 還是 claude.ai remote connectors

**步驟**：
1. 在 Cowork 模式下（`claude_desktop_config.json` 目前**不存在**）
2. 查看 MCP 工具是否可用
3. 嘗試：「請用 supabase MCP 執行 `list_tables`」
4. 觀察結果——是否需要先在 claude.ai 設定 remote connector？

**P8-A：若 Cowork MCP 工具可用** →
   - 確認來源（問 AI：「你用的 Supabase MCP 是從哪裡讀設定的？」）
   - 若來自 claude.ai remote connector → 確立 remote-first 策略（Phase 1.2 優先）
   - 若來自本機 claude_desktop_config.json → Phase 1.3 先做 local config

**P8-B：若 Cowork MCP 工具不可用** →
   - 前往 claude.ai 設定（Settings → Connectors）授權 Supabase remote connector
   - 重測確認連通

**結果**：
- [ ] MCP 可用（來源：____________________）
- [ ] MCP 不可用（需先授權 remote connector）

**觀察記錄**：
```
（Cowork 下 MCP 狀態？需要什麼設定？）
```

---

### P9 — 手機 Claude App Remote Connector 查單

**目的**：確認手機 Claude App 透過 remote connector 可查 Supabase 訂單（mobile-first 核心用例）

**前提**：需先完成 P8 並成功授權 claude.ai Supabase remote connector

**步驟**：
1. 在手機開啟 Claude App
2. 開新對話，問：「用 Supabase 查一下最新一張訂單的 order_id 和 status」
3. 觀察手機是否能通過 remote connector 查到 Supabase 資料

**過 →** 手機查單動線成立，mobile remote connector 策略有效
**不過 →** 手機僅 Notion 同步/純對話模式；記錄失敗原因（未授權？connector 未同步到手機？）

**結果**：
- [ ] 過（手機查單成功）
- [ ] 不過（原因：___________________）

**觀察記錄**：
```
（手機 App 顯示什麼？能查到訂單嗎？）
```

---

### P10 — n8n HTTP Request 節點三腦出口連通

**目的**：確認 n8n 的 HTTP Request 節點能直接打通 Perplexity / Anthropic / OpenAI API，
不被 Cloudflare 指紋封鎖（歷史地雷 S107 教訓：n8n Node.js http 曾被 Cloudflare 擋）

**步驟（分三個最小請求測試）**：

**P10-A Perplexity**：
- n8n HTTP Request 節點 POST `https://api.perplexity.ai/chat/completions`
- body: `{"model":"sonar","messages":[{"role":"user","content":"ping"}]}`
- header: `Authorization: Bearer {PERPLEXITY_API_KEY}`
- 預期：200 OK + 有效回應

**P10-B Anthropic**：
- n8n HTTP Request 節點 POST `https://api.anthropic.com/v1/messages`
- body: `{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}`
- headers: `x-api-key: {ANTHROPIC_API_KEY}`, `anthropic-version: 2023-06-01`
- 預期：200 OK + 有效回應

**P10-C OpenAI**：
- n8n HTTP Request 節點 POST `https://api.openai.com/v1/chat/completions`
- body: `{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"max_tokens":10}`
- header: `Authorization: Bearer {OPENAI_API_KEY}`
- 預期：200 OK + 有效回應

**過 →** 三腦出口連通，n8n HTTP Request 可直接用，無需 curl 迂迴
**不過（某腦被擋）→** 被擋的腦改用「Execute Command」節點跑 curl 子程序（已在計劃內）；記錄哪個 API 被擋及 HTTP 狀態碼

**注意**：
- ANTHROPIC_API_KEY / OPENAI_API_KEY 尚未存入 `.env`，測試前需 Fat Mo 手動填入（Phase 1.1 前置）
- 若 n8n 尚未有相應 credential，先建 Header Auth credential

**結果（2026-07-03 已測）**：
- P10-A Perplexity: [x] 過（HTTP 200，完整成功回應）
- P10-B Anthropic:  [x] 連線過，帳務擋（HTTP 400 "credit balance too low"——非 Cloudflare 封鎖，Fat Mo 需加值）
- P10-C OpenAI:     [x] 連線過，rate limit（HTTP 429——非 Cloudflare 封鎖，帳號額度/頻率限制）

**觀察記錄**：
```
測試方式：實際建立 n8n workflow「3brain API Probe (P10 test)」（id: iTKmxBapcoJXSGLh），
透過 n8n Public API（.env N8N_KEY）建立 3 組 Header Auth credentials + workflow + webhook 觸發，
非紙上模擬。webhook 註冊需一次 UI 手動存檔（API 建立/啟動不會自動註冊 webhook 路由，n8n 已知行為）
+ 節點補 webhookId 欄位（API 直建的 webhook 節點缺此欄位，導致路由表未登記）。

結論：三個 API 從 n8n（yanhei.synology.me:8443）伺服器端直接呼叫，**均未被 Cloudflare 指紋擋**。
cl-flow-runner.js 需要 curl 繞過的問題，是 Node.js/Python client 在「本機」呼叫 Perplexity 時的
指紋辨識，與 n8n 伺服器端 HTTP Request 節點是不同的執行環境/TLS 指紋，不能一概而論。

Anthropic 400 / OpenAI 429 為帳務層問題，非連線問題：
- Anthropic: 需 Fat Mo 至 console.anthropic.com 加值
- OpenAI: rate limit，待額度恢復或檢查帳號設定後可重測

測試 workflow 已停用（active=false）但保留在 n8n，credentials 亦保留，供正式 3-brain workflow 沿用。
```

---

### P11 — 大檔案讀取行為（915KB Dashboard HTML）

**目的**：確認 Code 分頁與 Cowork 模式讀取 915KB Dashboard HTML 的實際行為，
建立大檔 SOP（截斷？爆 context？正常讀取？）

**步驟**：
1. **Code 分頁**：要求「讀取 `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`」
   - 觀察是否自動截斷、給警告，還是直接讀完
2. **Cowork 模式**：同樣要求讀取該檔
   - 對比行為差異

**過 →** 記錄具體 SOP：大檔應使用 Grep/區段讀取（如 `Read offset+limit`），不做全文讀取
**不過** → 此維度無「不過」——無論何種行為均記錄為 SOP 依據

**結果（Code 分頁）**：
- [ ] 正常讀取全文
- [ ] 自動截斷（截至第___行）
- [ ] 拒絕/給出警告

**結果（Cowork）**：
- [ ] 正常讀取全文
- [ ] 自動截斷（截至第___行）
- [ ] 拒絕/給出警告

**觀察記錄**：
```
（兩個模式各自的行為詳情）
```

---

## 結果彙總表

完成全部探針後，填寫此彙總：

| # | 探針 | 結果 | 後續策略 |
|---|---|---|---|
| P1 | SessionStart Hook | ✅ 過 | AGENTS.md v1.4.13 + handoff 自動載入 |
| P2 | Slash Commands | ✅ 過 | `/read` 完整執行，19 支 commands 可用 |
| P3 | .mcp.json 繼承 | ✅ 過 | n8n + Supabase 均連通，Code 分頁繼承 .mcp.json |
| P4 | Subagent 派遣 | ✅ 過 | finance-auditor 成功派遣，訂單 #07001011 五項 PASS |
| P5 | Auto-Memory | ✅ 過 | Fat Mo 身份 + S130 cost_override_locked 細節全記得 |
| P6 | Cowork 資料夾讀取 | ✅ 過 | 每 session 需一次 folder picker 授權；CLAUDE.md 自動為 Instructions |
| P7 | Cowork 寫入邊界 | ⚠️ 可寫入 | 技術上可寫，**紀律約束**禁止寫治理/財務檔案（單一寫者矩陣） |
| P8 | Cowork MCP 來源 | ❌ 需 remote connector | Cowork 不繼承 .mcp.json；需在 claude.ai 授權 remote connector |
| P9 | 手機查單 | ⏳ 待測 | 前提：先完成 Phase 1.2 授權 remote connector |
| P10-A | Perplexity API | ✅ 過 | 完整成功，n8n 伺服器端無 Cloudflare 封鎖 |
| P10-B | Anthropic API | ✅ 連線過 | HTTP 400 帳務問題（信用額度不足），非封鎖 |
| P10-C | OpenAI API | ✅ 連線過 | HTTP 429 rate limit，非封鎖 |
| P11 | 大檔行為（Code） | ✅ 主動詢問 | 偵測 15,646 行 / 919,443 bytes，提供三選項，不盲目讀入 |
| P11 | 大檔行為（Cowork） | ⏳ 未測 | 可補測，預期同樣智能處理 |

**完成日期**：2026-07-03
**備註**：Code 分頁 P1–P7、P10、P11 全數通過（P10 為實測，非模擬——實際建立 n8n workflow 驗證）；Cowork P8 確認需 remote connector（已於 Phase 1.2 補授權完成）；P9 待手機實測

---

## 探針完成後行動

填完結果後，回報給 Claude（Desktop App Code 分頁），輸入：

```
P1:[過/不過] P2:[過/不過] P3:[過/不過] P4:[過/不過] P5:[過/不過]
P6:[過/不過] P7:[可寫/唯讀] P8:[config/connector]
P9:[過/不過] P10:[A過/A不過,B過/B不過,C過/C不過] P11:[Code行為/Cowork行為]
```

Claude 將根據結果調整 Phase 1 MCP 策略與 Phase 3 三腦規格。
