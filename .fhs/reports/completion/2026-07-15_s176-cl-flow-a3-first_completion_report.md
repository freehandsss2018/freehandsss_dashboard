# S176 完成記錄 — `/cl-flow`／`/cl-flow-fast` A3-first 重組（D39）

> 日期：2026-07-15｜執行：Claude Code / Sonnet 5｜決策：D39｜本檔為全文唯一居所（D13 規則(a)）

## 一、緣起

Fat Mo 觀察「A1（Perplexity）/A2（Gemini）時常錯誤很大，根本幫助不到 A3（Claude）」，提議重組流程：由 A3 先做基礎分析＋部署方案，A1/A2 評分，A3 最終決定。`cl-flow-fast` 同步適用。經 `/rp` 精煉觸發 `structural_warning`（objective 含 3+ 動作、constraints 為空、expected_output 未指定），拷問一輪 7 條問答逐項釐清後 `/execute` 授權執行，執行前 Fat Mo 明確要求切換模型至 Sonnet。

## 二、根因查證（有實證，非臆測）

抽驗歷史三次 `/cl-flow` flow 的 `cl-final-plan.md`「衝突/遺漏」章節：

| Flow | A1/A2 錯誤樣本 |
|---|---|
| 2026-07-13 | AG 提案「Postgres Function 調用 `lib/order-match.mjs`」——技術不可行（PL/pgSQL 無法載入 Node ESM 模組）；提案 4 個 RPC 偏離既有寫入模式；原稿因 token 上限截斷 |
| 2026-07-05 | A1 誤讀 token 語義（當成區塊鏈 token）；AG 虛構檔案路徑多處（`Finance_Bible.md`/`dashboards/*` 等不存在路徑）、幻覺「治理委員會、財務組」等不存在角色 |
| 2026-07-02 | AG 對 Claude Code 機制連環事實錯誤（幻覺 `.claude/tools/`/`bridge.py` 等不存在結構；提議刪除未移植的 MCP config） |

**診斷**：錯誤模式集中於幻覺路徑、幻覺結構、幻覺角色——病徵指向 context 飢餓（A1/A2 均無 repo 存取），非推理能力不足。

## 三、拷問共識（7 條問答，逐項落地）

1. **方向**：A3 先寫草案（含真實檔案路徑/行號）→ A1 外部驗證 + A2 對抗 red-team 評審 → A3 綜合裁決。錯誤殺傷力由「作者錯=全盤重寫」降級為「評審錯=A3 睇完唔採納就算」。
2. **分工**：A1 禁評 repo 內部結構（佢見唔到），只驗業界慣例；A2 禁重寫方案，專職 red-team；統一輸出格式（逐條編號 + Severity）。
3. **`/cl-flow-fast`**：鏡像縮水（草案→淨 A2 評審→A3 精簡終審），跳嘅係外部研究唔係評審。
4. **Runner**：兩段式 `--init`（開檔，deterministic gate 把關）／`--review [--fast]`（評審）。
5. **降級**：單邊 API 失敗唔硬停，`state.json.degraded` 標記 + Verdict 顯眼聲明；舊靜態備援模式退役。
6. **防做戲**：拒絕 BLOCKER → Verdict 最高 `CONDITIONAL_READY`；採納須引落點、拒絕須附真實反證、Severity 由評審方原文決定 A3 無權調；Fat Mo 隨時可派 fresh-context agent 抽查批評處理表。
7. **驗收**：乾測兩段 → 真實試點（借用「Fat Mo 操作手冊」任務）→ Fat Mo 驗貨。

## 四、執行內容

| 檔案 | 版本變化 | 改動摘要 |
|---|---|---|
| `scripts/cl-flow-runner.js` | v1.0.0→v2.0.0 | 拆 `--init`/`--review [--fast]`；PX/AG 由盲寫作者 prompt 改為評審 prompt（`buildPxReviewPrompt`/`buildAgReviewPrompt`）；獨立 try/catch + degraded 標記；移除舊 `validateAgPlan` 呼叫（格式已變，檔案保留不刪） |
| `.fhs/ai/commands/cl-flow.md` | v2.2.1→v3.0.0 | 全文重寫 A3-first 8 步流程 + 批評處理表規格 + degraded 聲明規則 + fresh agent 隨查權；退役靜態備援分支留遷移註記 |
| `.fhs/ai/commands/cl-flow-fast.md` | v1.1.0→v2.0.0 | 鏡像縮水版同步重寫 |
| `.fhs/ai/commands/rp.md` | 段落更新 | 「/rp 與管道指令的關係」兩行描述反映 A3-first 語義 |

## 五、驗證（甲案：乾測 + 真實試點，非口稱）

**乾測**（真實 API 呼叫）：
- `--init`：生成 `flow_id`/`task-brief.md`/`state.json` 正常
- `--review --fast`：AG 準確揪出乾測草案中刻意植入嘅假陳述（`validateReview()` 函式唔存在），標 MAJOR，並守住「唔准重寫方案」邊界
- `--review`（全模式）：AG+PX 皆正常輸出；withRetry 喺真實 Gemini timeout 情況下自動恢復；PX 守住「唔評 repo 內部結構」邊界
- **乾測抓到真實 bug**：`callPerplexity`/`callGemini` 原設計試圖喺字串 primitive 上掛 `__outFile` 屬性，strict mode 下拋 `TypeError`——已修復為傳純字串 + 明確 `tmpDir` 參數
- 乾測用假 flow（`2026-07-15-2326`）驗證後已清理

**真實試點**（flow_id `2026-07-15-2330`，任務：Fat Mo 操作手冊速查卡）：
- A3 草案：4 個真實檔案查證表（`CLAUDE.md`/`knowledge-map.md`/`team.md`/`grilling-quickcard.md`）+ 2 份已查證能力清單
- AG 評審：6 條批評，1 條 BLOCKER（可用性驗收方式未定）
- PX 評審：8 條批評，涵蓋單一事實來源風險、分類軸不足、高風險能力警示缺失
- 批評處理表：14 條逐一採納/拒絕，含 1 個拒絕案例（PX 提議三軸分類，以 `user_fatmo.md`「Fat Mo 為單一決策者」反證拒絕）
- Verdict：`APPROVED_READY`（唯一 BLOCKER 已採納折入最終計劃，無拒絕 BLOCKER，不觸發降級規則）
- 「Fat Mo 操作手冊」實際內容產出為**獨立待批項**，本輪未一併 `/execute`——此 flow 目的僅驗證管道機制

## 六、後效同步稽核

- **[A] 結構變動**：不觸發——僅編輯既有 4 個追蹤檔案；`artifacts/2026-07-15-2330/` 屬既有 gitignore 模式的新實例（`docs/repo-map.md` 已有通用條目「`artifacts/` ← `/cl-flow` 執行時生成」），非新結構，無需更新 repo-map
- **[B] 制度層變動**：觸發——`.fhs/ai/commands/` 3 個指令檔屬制度層，本報告即為對應完成記錄，已同步 `decisions.md` D39
- **[C] CHANGELOG**：觸發——command 行為邏輯改變，已更新 `Changelog.md` S176 條目
- **[F] FHS_Prompts.md**：不觸發——本次僅編輯既有指令檔內容，未增刪 `.fhs/ai/commands/` 檔案數量，`AGENTS.md` 未新增 Rule
- **[G] 運算邏輯**：不觸發——無財務/n8n/schema 相關函式異動

## 七、待辦

- 「Fat Mo 操作手冊」（`.fhs/notes/fatmo-ops-quickcard.md`）待 Fat Mo 對 `artifacts/2026-07-15-2330/cl-final-plan.md` 下達獨立 `/execute`
- `.env` 已臨時複製入 worktree 供本次乾測/試點使用（gitignored，不會進版控）；若 worktree 合併/廢棄前需自行確認清理

## 八、雙紀律自檢

【交付前雙紀律自檢】
驗收：制度層改動（指令檔+腳本）— 乾測（`--init`/`--review`/`--review --fast` 三路徑真實 API 呼叫）+ 真實試點（完整管道跑通產出 Verdict）雙重驗證 = ✅
Subagent：❌ 未使用（拷問共識到程式碼/文件改動屬單一貫穿脈絡，範圍明確可直接驗證；批評處理表逐條帶證據設計已令未來抽查低成本，機制已寫入 `cl-flow.md`，本輪執行階段判斷無需額外派工）
