# FHS n8n 三腦介接規格（A1 ChatGPT / A2 Gemini / A3 Claude）

**Flow ID**: 2026-07-03-0014
**依據**: cl-final-plan-v2.md Phase 3.1
**建立日期**: 2026-07-03
**狀態**: 規格交付——**Fat Mo 人手駁接**（AI 只供規格，不代為建置 workflow）
**對照現有**：`scripts/cl-flow-runner.js`（2 腦版：PX+AG 平行，本規格為 3 腦版正式獨立 workflow）

---

## 零、重要前提聲明（2026-07-03 已實測更新）

| 項目 | 狀態 |
|---|---|
| `.env` OPENAI_API_KEY / ANTHROPIC_API_KEY | ✅ 已補 |
| Perplexity API 從本機（Node.js/Python）被 Cloudflare 擋 → curl 繞過 | ✅ **已證實**——`scripts/cl-flow-runner.js` L55-59 註解記錄根因與修復，生產中持續運作 |
| **三腦 API 從 n8n 伺服器端連線** | ✅ **已實測（非模擬）——全數不被 Cloudflare 擋** |

**§五 最小驗證步驟已實際執行完成**（非紙上模擬，透過 n8n Public API 建立真實 workflow「3brain API Probe (P10 test)」，id `iTKmxBapcoJXSGLh`，執行 #4070/#4071）：

| 腦 | 結果 |
|---|---|
| Perplexity | ✅ 完整成功（HTTP 200，正常回應） |
| Anthropic | ✅ 連線通，HTTP 400「信用額度不足」——**帳務問題，非封鎖**，需 Fat Mo 加值 |
| OpenAI | ✅ 連線通，HTTP 429 rate limit——**非封鎖**，額度/頻率限制 |

**關鍵修正**：cl-flow-runner.js 需要 curl 繞過的 Cloudflare 指紋辨識，發生在**本機** Node.js/Python client 呼叫 Perplexity 時；**n8n 伺服器端的 HTTP Request 節點是完全不同的執行環境**，三個 API 從 n8n 呼叫全部直連成功，**不需要 Execute Command + curl 繞過方案**。原規格 §四 Pitfall 1 的「改用 Execute Command 跑 curl」應對方案**目前不需要啟用**（保留作未來若真的遇到封鎖時的備案）。

**n8n webhook 建立注意事項（實測發現，非計劃內容）**：透過 API 建立的 webhook 節點需額外補 `webhookId` 欄位（UUID），且建立/啟動後需在 n8n UI 手動存檔一次才會真正註冊路由——純 API 呼叫 `activate` 端點不會觸發 webhook 路由表更新，這是 n8n 本身的行為特性。

---

## 一、節點圖

```
┌─────────────────┐
│ Trigger (雙式)   │
│ ① Manual 手動觸發 │
│ ② Telegram 指令   │──────┐
└─────────────────┘       │
                           ▼
                  ┌─────────────────────┐
                  │ Init: 建立 flow_id    │
                  │ mkdir artifacts/{id}/│
                  │ 寫 state.json(created)│
                  └─────────────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │ A2 — Gemini 統整      │
                  │ HTTP Request → Gemini│
                  │ 輸出 a2-digest.md    │
                  └─────────────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │ A3 — Claude API 草案  │
                  │ HTTP Request → Claude│
                  │ 輸出 a3-draft.md     │
                  └─────────────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │ A1 — GPT 審查         │
                  │ HTTP Request → OpenAI│
                  │ 輸出 a1-review.md    │
                  └─────────────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │ Write state.json      │
                  │ status: awaiting_cl   │
                  │ _review（終態，n8n     │
                  │ 永不再寫此資料夾）      │
                  └─────────────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │ Telegram 通知完成      │
                  │ 「flow {id} 待 Claude  │
                  │ Desktop Code 分頁裁決」│
                  └─────────────────────┘
```

**關鍵設計**：A3（Claude）在此管道中只產**草案**（`a3-draft.md`），不是最終 Verdict。真正的 `cl-final-plan.md` 仍由 **Desktop Code 分頁的 Claude（訂閱側，非 API）** 讀取 a2/a3/a1 三份產物後裁決產出——**A3 裁決權不外包給 API**。這條界線防止「API 端自己審自己」的裁決權旁落。

---

## 二、檔案契約

寫入路徑：`artifacts/{flow_id}/`（沿用現有 cl-flow-runner.js 慣例，flow_id 格式 `YYYY-MM-DD-HHmm`）

| 檔案 | 產出節點 | 內容 |
|---|---|---|
| `task-brief.md` | Init | 原始任務描述（Telegram 指令文字或手動輸入） |
| `a2-digest.md` | A2 Gemini | 資料統整、背景研究、事實彙整 |
| `a3-draft.md` | A3 Claude | 基於 a2-digest 的實作草案（**非最終裁決**） |
| `a1-review.md` | A1 GPT | 對 a3-draft 的品質/風險審查意見 |
| `state.json` | 每階段更新 | 見下方狀態機 |

**state.json 狀態機**（沿用現有欄位命名慣例）：

```json
{
  "flow_id": "2026-07-03-1530",
  "task": "...",
  "status": "created | a2_done | a3_done | a1_done | awaiting_cl_review",
  "a2_status": "pending | done | failed",
  "a3_status": "pending | done | failed",
  "a1_status": "pending | done | failed",
  "created_at": "ISO8601",
  "trigger_source": "manual | telegram",
  "n8n_execution_id": "..."
}
```

**與現有 cl-flow state.json 的差異**：既有 `cl-flow-runner.js` 用 `px_status/ag_status/cl_status`（2 腦），三腦版改用 `a2_status/a3_status/a1_status`——**避免混用同一 flow_id 空間**，三腦 workflow 觸發時建議 flow_id 加後綴（如 `2026-07-03-1530-3brain`）防止與既有 2 腦 runner 撞名。

---

## 三、寫入所有權規則（conflict 防線，對應 FHS_Mode_Card.md 單一寫者矩陣）

> 這條規則是 v2.2 共存治理三規約在 n8n 場景的延伸——n8n 是第四個「無 hook 守護」的寫入端。

1. **n8n 只建立並寫入自己觸發產生的新 `{flow_id}/` 資料夾**，絕不觸碰既有 flow_id 目錄
2. `state.json` 寫至 `status: "awaiting_cl_review"` 後，**n8n 該次 execution 生命週期結束，永不再回寫該資料夾**（即使後續 workflow 重跑，也是開新 flow_id，不是覆寫舊的）
3. 本機端（Desktop Code 分頁）只在看到 `awaiting_cl_review` 狀態後才讀取/處理該資料夾，處理完寫入 `cl-final-plan.md` 於同一資料夾（此時所有權轉移至本機端）
4. Synology Drive 同步時延預期 10-60 秒——**n8n 寫完 state.json 後不要立即輪詢確認**，Telegram 通知本身已是完成信號，不需額外輪詢機制

---

## 四、四項歷史地雷內嵌

### Pitfall 1 — Cloudflare 指紋封鎖（風險等級因腦而異）

- **已證實**：Perplexity API 會被 Cloudflare fingerprint 擋（Node.js https / Python urllib 皆中招，僅 curl 可通）。根因與修復詳見 `scripts/cl-flow-runner.js` 內建註解（2026-06-23 fix）
- **未證實**：Anthropic（`api.anthropic.com`）與 OpenAI（`api.openai.com`）是否有同樣問題——**n8n HTTP Request 節點底層引擎與 Node.js https 不同**（n8n 用自己的 HTTP client），不能直接套用 Perplexity 的結論
- **應對**：§五 最小驗證步驟先測三腦各一次 ping。若某腦被擋（連線被 reset / socket hang up / 無回應但無明確錯誤）→ 該節點改用 **Execute Command 節點跑 curl 子程序**（body 寫暫存檔用 `--data @file`，不要用 `-d` 直接帶長 JSON 字串，避免 shell escaping 問題）
- **前提未驗證項**：n8n Execute Command 節點所在容器是否有 `curl` 二進制——Fat Mo 駁接時第一步用 Execute Command 跑 `curl --version` 確認

### Pitfall 2 — n8n workflow API 部署 body 限制（S121）

- workflow 經 PUT API 部署時，body **只能含四個欄位**：`{name, nodes, connections, settings}`
- 多帶欄位（如 `active`, `tags`, `versionId`）會導致部署失敗或行為異常
- 本規格建立的三腦 workflow 若要用 API（非 UI）部署，務必遵守此限制

### Pitfall 3 — JSON 序列化 emoji 問題（S129）

- workflow JSON 序列化時使用 `ensure_ascii=True`（若走 Python 工具鏈）或等效機制
- **禁止**在 Code 節點字串中直接嵌入 emoji——surrogate pair 會靜默失敗（S129 實際事故：tg2 深連結因 emoji 嵌入導致 invalid syntax，S133 才根因修復）
- Telegram 通知節點若要用 emoji，透過 Unicode escape（`✅` 等）而非直接貼字符

### Pitfall 4 — HTTP Request v4 body 格式 + timeout（S127）

- HTTP Request 節點（v4）POST JSON body 時用 `contentType: "raw"`，**禁止** `specifyBody: "string"` + `JSON.stringify()` 組合（S127 實際事故：導致 PGRST204 錯誤）
- A2/A3/A1 三個 API 呼叫節點皆為長生成任務，**timeout 設定 ≥180 秒**（Claude/GPT 生成較長草案時容易超時；n8n 預設 timeout 通常過短）
- Drive 同步時延預期 10-60 秒（見 §三 第 4 點），不要把這個誤判為節點失敗

---

## 五、最小驗證步驟（Fat Mo 駁接前必做）

在建立完整 pipeline 前，先建一個臨時測試 workflow，3 個獨立 HTTP Request 節點：

**A — Perplexity（已知會通，用 curl 驗證環境）**：
```
Execute Command 節點:
curl -s --max-time 30 -X POST https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer {{ $env.PERPLEXITY_API_KEY }}" \
  -H "Content-Type: application/json" \
  --data '{"model":"sonar","messages":[{"role":"user","content":"ping"}],"max_tokens":10}'
```

**B — Anthropic（未知，先用 HTTP Request 節點原生測，不通再改 curl）**：
```
HTTP Request 節點:
POST https://api.anthropic.com/v1/messages
Headers: x-api-key={{ANTHROPIC_API_KEY}}, anthropic-version: 2023-06-01, content-type: application/json
Body (raw): {"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}
```

**C — OpenAI（未知，同 B 先測原生節點）**：
```
HTTP Request 節點:
POST https://api.openai.com/v1/chat/completions
Headers: Authorization=Bearer {{OPENAI_API_KEY}}, content-type: application/json
Body (raw): {"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"max_tokens":10}
```

**結果記錄回** `.fhs/reports/planning/fhs_v0_desktop_probe.md` P10-A/B/C 欄位（原探針清單已預留此格式）。

---

## 六、System Prompt 範例（三腦角色邊界）

### A2 Gemini（資料統整）
```
你是 FHS 系統的 A2 資料統整員。你的任務是把使用者的任務描述，結合 FHS 專案已知背景
（.fhs/ai/AGENTS.md 憲法層規則、相關歷史決策），整理成結構化的背景摘要，供 A3 建置參考。
不要給實作建議，只做事實彙整與背景鋪陳。輸出 Markdown，控制在 1500 字以內。
```

### A3 Claude（建置草案）
```
你是 FHS 系統的 A3 建置規劃員。基於 A2 提供的背景摘要，產出實作草案（非最終定案）。
草案需包含：任務拆解、預計影響檔案、風險點。明確標註「本草案待 Claude Desktop Code 分頁
覆核後才是正式 cl-final-plan，此處僅供 A1 審查與人工參考」。
硬約束：NO-TOUCH 業務代碼（Dashboard HTML/n8n 業務 workflow/Supabase 不可在此草案建議直接改動，
只能提出方案供人工覆核後由 Desktop Code 分頁執行）。
```

### A1 GPT（審查）
```
你是 FHS 系統的 A1 品質審查員。審查 A3 產出的草案，從風險、遺漏、邏輯一致性角度提出意見。
不需要重寫草案，只需列出：(1) 你認同的部分 (2) 你認為有風險或遺漏的部分 (3) 建議 Desktop
Code 分頁裁決時特別注意的點。輸出精簡條列，勿超過 800 字。
```

---

## 七、成本表

| 腦 | 預設 model tier | 每 flow 估算 | 升級條件 |
|---|---|---|---|
| A2 統整 | gemini-flash 級 | ~$0.01-0.05 | 超大 context 才升 pro |
| A3 建置 | claude-haiku/sonnet 級 API | ~$0.10-0.50 | 高難度才升 opus 級 |
| A1 審查 | gpt-4o-mini 級 | ~$0.01-0.03 | 安全審查才升 4o |
| **合計** | | **~$0.15-0.6/flow** | 對照：日常互動走 Desktop Pro 訂閱額度不另計費，三腦僅用於**離開電腦時的規劃需求**（如手機下指令、外出時想推進大任務） |

---

## 八、Fat Mo 駁接檢查清單

- [ ] 確認 n8n Execute Command 節點容器內有 `curl`（跑 `curl --version`）
- [ ] 建三腦測試 workflow，跑 §五 最小驗證，記錄 P10-A/B/C 結果
- [ ] 若 B 或 C 被擋，改用 Execute Command + curl（參考 A 的寫法）
- [ ] 建正式 3-brain workflow（節點圖見 §一），credential 用 Header Auth 或 n8n 內建 credential type
- [ ] Telegram 觸發指令設計（沿用現有 Telegram bot，指令格式待 Fat Mo 決定，如 `/flow3 <任務描述>`）
- [ ] 對等驗收（Phase 3.3）：同一任務分別跑 `cl-flow-runner.js`（2 腦）與新 3-brain workflow，比對產出品質與檔案完整性
- [ ] 確認 artifacts/{flow_id}/ 無 Synology Drive 衝突副本產生（§三 寫入所有權規則生效驗證）

---

## 十一、休眠決策（2026-07-04，Fat Mo 確認）

與 `/cl-flow` 逐項對比後（見下表），發現 FHS 系統相關任務 `/cl-flow` 全面勝出——免費（走 Pro 訂閱裁決）、直接落 repo、有完整 hook 治理；n8n 三腦每步都花 API 錢、無治理、產出仍須帶回 Desktop Code 分頁才算數。Fat Mo 確認「想不出具體用途」，**降級為休眠藍圖**（比照 Cursor 處置模式，見 `cl-final-plan-v2.md` Phase 2.5）。

| 對照項 | `/cl-flow` | n8n 三腦 |
|---|---|---|
| 裁決者 | Desktop Code 分頁 Claude（Pro 訂閱，有 repo/工具/記憶） | API 呼叫的 Claude（無 repo/工具存取，只看 prompt 文字） |
| 誰說了算 | Claude 產出 Verdict，直接餵 `/execute` | 沒有人說了算，草案仍須帶回 Desktop Code 分頁 |
| 用途範圍 | FHS 系統架構變更提案 | 任意外部任務 |
| 治理 | 全套 hook 守護（Gate 1/8 維度/NO-TOUCH） | 無 hook，安全邊界僅靠 prompt 措辭 |
| 成本 | 只有 PX+AG 花 API 錢，裁決免費 | 三步全花 API 錢 |
| 產出落點 | 直接寫入 repo `artifacts/{flow_id}/` | 只留在 n8n 畫布，需手動搬運 |
| 架構 | PX+AG 平行（獨立視角交叉比對） | Gemini→Claude→ChatGPT 串行接力（前面錯，後面全錯） |

**n8n 三腦唯一未被 `/cl-flow` 覆蓋的優勢**：排程、無人值守、跟 FHS 無關的外部任務（`/cl-flow` 需人在 Claude Code 內手動觸發，做不到排程自動跑）。目前無此類具體需求。

**處置**（比照 Cursor 休眠模式，見 Phase 2.5）：
- workflow「FHS AI 開發團隊」（id `cztGsFXZYtvBUDA6`）保留在 n8n，維持**停用**狀態，零成本
- 3 組 credentials（`3brain-gemini`/`3brain-anthropic`/`3brain-openai`）保留，未來重新啟用時可直接沿用
- **不再投入時間優化**，除非未來出現具體「排程/無人值守/非 FHS」需求
- Phase 3.2（Fat Mo 完整駁接）/ 3.3（對等驗收）**不再推進**——本輪對照分析已實質達成「對等驗收」目的（結論：不對等，`/cl-flow` 更優，非因技術缺陷而是架構定位重疊）

## 十、實作記錄（2026-07-03，正式 workflow 已建）

**定位修正**：本節修正一個口頭誤述——n8n 三腦一度被錯誤定位為「Fat Mo 離開電腦時的手機備用觸發」，這是錯的。Fat Mo 澄清後的正確定位：**n8n 畫布本身就是「同一畫面」**，三個 AI 節點依序自動接力完成任務，Fat Mo 坐在電腦前手動按 Execute、在畫布上直接看每個節點輸出——這是「4 步打造 AI 開發團隊」教學的核心概念，非邊緣情境功能。原節點圖（§一）Trigger 本就把「手動」排第一位，設計方向沒有錯，錯的只是口頭的優先度定位。

**正式 workflow 已建立**（透過 n8n Public API，同 P10 測試手法）：

| 項目 | 值 |
|---|---|
| Workflow 名稱 | `FHS AI 開發團隊（A2 Gemini→A3 Claude→A1 ChatGPT）` |
| Workflow ID | `cztGsFXZYtvBUDA6` |
| 節點鏈 | Manual Trigger → 任務輸入（Set，Fat Mo 手動編輯 requirement 欄位）→ 準備 A2 Prompt（Code）→ A2 Gemini 統整（HTTP）→ 解析A2+準備A3 Prompt（Code）→ A3 Claude 草案（HTTP）→ 解析A3+準備A1 Prompt（Code）→ A1 ChatGPT 審核（HTTP）→ 組合最終成品（Code） |
| Credentials | `3brain-gemini`（Query Auth）、`3brain-anthropic`（Header Auth）、`3brain-openai`（Header Auth）——與 P10 測試沿用同一組 |
| 狀態 | 已部署，**未執行**——Anthropic 帳戶餘額 $0，等 Fat Mo 加值後首次觸發 |

**設計要點**：
- 用 Code 節點組裝各 API 的 JSON body（而非在 HTTP Request 節點內手刻含中文/換行的 JSON 字串），避免跳脫字元錯誤，這是比 §一 原規格更穩健的實作手法
- 「組合最終成品」節點把 A2 摘要 + A3 草案 + A1 審核意見整合成一份 Markdown，Fat Mo 點該節點即可在畫布上讀完整份成品，**不寫檔案**（依 Fat Mo 確認，n8n 畫布直接看即可，不需要 artifacts/ 落地）
- A3 model 暫用 `claude-haiku-4-5-20251001`（成本考量），Fat Mo 可日後直接在 HTTP Request 節點內把 model 欄位改成更強模型
- 首次測試建議用簡短需求描述，避免加值後第一次跑就消耗過多 token

**與 §二/§三 檔案契約規格的關係**：本次實作**未採用**原規格 `artifacts/{flow_id}/` 寫檔方案——Fat Mo 確認「n8n 畫布直接看就夠」，無需落地檔案。原規格保留供未來若改用 Telegram 觸發（無法在畫布上讀取）時啟用。

**與來源教學的對照與刻意偏離（2026-07-03 Fat Mo 確認保留）**：

Fat Mo 提供的原始教學（「4 步打造你的 AI 開發團隊」）中，三腦角色定義為：
- Gemini＝資料統整員，輸出 JSON 規格書
- Claude＝主力工程師，**直接輸出可執行程式碼本身**，不解釋
- ChatGPT＝QA 審查員，審查程式碼安全性/邏輯錯誤，給出修改後版本

本次實作 System Prompt **刻意偏離**教學原文兩處：

| 角色 | 教學原版 | 本次實作 | 偏離原因 |
|---|---|---|---|
| A3 Claude | 直接寫可執行代碼 | 寫「實作草案」（任務拆解/影響檔案/風險），不寫可執行代碼 | 若讓 API 端直接吐出可貼上即跑的代碼，等於三腦管道繞過 Desktop Code 分頁 5-hook 守護，直接產出無審查生產代碼——牴觸 NO-TOUCH 硬約束與「A3 裁決權不外包給 API」既定治理原則 |
| A1 ChatGPT | 審查代碼安全性/邏輯錯誤 | 審查草案品質/風險/遺漏 | 承上，沒有真代碼可審 |

**Fat Mo 確認**（2026-07-03）：此 workflow 定位為**規劃/草案型任務**，維持安全設計不變。若未來需要「直接寫可執行代碼」的教學原版用法（僅限不碰 Dashboard/n8n/Supabase 的獨立小工具/腳本），應**另建第二個 workflow**，不修改本 workflow 的安全邊界——維持單一寫者矩陣「一般代碼＝Cursor/任一工具主場，治理/財務/生產檔＝AI-agent 絕對禁寫」的既有原則對稱設計，此為潛在 Phase 3 擴充項，非本次範圍。

## 九、與現有 cl-flow-runner.js 的關係

**不取代**——`cl-flow-runner.js` 定位為**永久備援**（cl-final-plan-v2.md §1 條件 3：對等驗收通過前強制保留；即使通過，也降級備援不刪除）。3-brain n8n workflow 用於 Fat Mo 離開電腦、透過手機 Telegram 觸發規劃任務的場景；`cl-flow-runner.js` 用於 Desktop Code 分頁內直接執行的場景。兩者互不排斥，依情境選用。
