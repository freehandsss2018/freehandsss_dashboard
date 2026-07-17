# /cl-flow

**用途 (Purpose)**：精煉任務描述後，由 Claude（A3）先寫基礎分析＋部署方案草案，交 Perplexity（A1）+ Gemini（A2）作對抗評審，Claude 綜合評審意見作最終裁決，等待 `/execute` 授權。
**對應 Agent**：A3 (Claude Code)
**Version**: v3.0.0 (2026-07-15，D37：A3-first 重組——A1/A2 由「盲寫作者」改為「有料評審」)
**NO-TOUCH GUARDRAIL**：全程禁止任何業務代碼寫入，直到 Fat Mo 輸入 `/execute`。

> 精煉（/rp）為預設第一步，不可跳過。名稱含義：cl = Claude 作最終裁決。

> **2026-07-15 重組背景（D37）**：抽驗 2026-07-02／07-05／07-13 三次歷史 flow 的 `cl-final-plan.md`「衝突/遺漏」章節，A1/A2 盲寫模式反覆出現同一病徵——幻覺檔案路徑、幻覺 Postgres Function、誤讀術語、幻覺不存在的角色/結構。根因是 context 飢餓（A1/A2 均無 repo 存取），非推理能力問題。改法：A3（有 repo 存取）先寫草案，A1/A2 對草案作 red-team／外部驗證，錯誤殺傷力由「作者錯 = 全盤重寫」降級為「評審錯 = A3 睇完唔採納就算」。詳見 `.fhs/notes/decisions.md` D37。
>
> **2026-07-04 對等驗收記錄**（Desktop App 平台收斂 Phase 4.1，沿用）：曾評估以 n8n 三腦 workflow 取代本指令觸發機制，結論本指令更優（裁決免費、直接落 repo、全套 hook 治理）。維持指令驅動，不遷移 n8n。詳見 `.fhs/reports/planning/fhs_n8n_3brain_spec.md` §十一。

---

## Step 0 — /rp 精煉（預設，不可跳過）

收到 `/cl-flow [任務]` 時，**必須先執行精煉**，再進入路徑判斷：

1. 讀取並執行 `.fhs/ai/commands/rp.md` Step 1–2（完整 8 維度掃描）
2. 輸出 `<refined_prompt>` XML
3. `<structural_warning>`（有問題才出現）

### Gate 1 — 強制審閱

```
┌──────────────────────────────────────────────────────┐
│  ⏸ Gate 1 — 精煉 XML 審閱                            │
│                                                      │
│  輸入修改指示 → AI 修正 XML 後重顯示（可重複）         │
│  回覆「Y」    → 繼續進入路徑判斷與管道執行             │
│  回覆「取消」  → 停止，保留 XML 供手動使用             │
│  回覆「拷問我」→ 僅當上方有 structural_warning 提議時  │
│               出現此選項；先跑 grilling 逐條釐清，     │
│               問完返回本 Gate 供最終確認               │
└──────────────────────────────────────────────────────┘
```

Fat Mo 回覆「Y」後，以精煉後 `<objective>` 作為任務輸入，進入以下路徑判斷。回覆「拷問我」（僅 Step 0 觸發 `structural_warning` 拷問提議時可用，見 `rp.md`「拷問掛鉤」段）後，先完成 grilling 逐條釐清，待雙方達成共識，重新顯示本 Gate 供最終確認，不自動略過。

---

## 路徑判斷（Path Selection）

收到 `/cl-flow [任務]` 時：

```
/cl-flow 觸發
    ↓
有傳入任務描述？
    → YES → 走 A3-first Runner 模式（見下）
    → NO  → 報錯停止，提示缺少輸入
```

> ⚠️ v2.x 的「靜態檔案備援模式」（讀 `a1_implementation_plan.md`/`a2_implementation_plan.md`）已於 v3.0.0 退役。舊模式服務兩個場景：①API 全掛時的降級路徑——v3.0.0 已用下方 Step 3 的「單邊 degraded」機制取代（不整條路徑降級，只標記缺了哪一邊評審）；②Antigravity 外部手寫計劃——A1/A2 在新流程下是評審角色不是作者，此用途已無語義基礎。若未來真的兩邊 API 同時全掛，A3 仍可基於 `a3-draft.md` 直接產出 Verdict 並在 `cl-final-plan.md` 頂部聲明「zero external review」，不需要獨立的舊格式備援分支。

---

## A3-first Runner 模式

### Step 0 — 前置檢查（僅當本 session 未執行 /read 時）

若本 session 尚未執行 `/read` 初始化，執行前必須確認以下文件已知悉：
- `docs/repo-map.md` — 確認相關文件位置，避免重複搜索或漏查
- 若已執行 `/read`，跳過此步驟，直接進入 Step 1。

### Step 1 — 初始化 Flow（Runner --init）

```bash
node scripts/cl-flow-runner.js --init "[任務描述]"
```

- 純本地操作，**不呼叫任何 API**（PX/AG 尚未介入）
- 自動生成 `flow_id`（格式：`YYYY-MM-DD-HHmm`），從 stdout 最後一行讀取 `FLOW_ID=xxx`
- 產出 `artifacts/{flow_id}/task-brief.md` + `artifacts/{flow_id}/state.json`（`status: awaiting_a3_draft`）
- 若腳本報錯（exit code ≠ 0），立即停止並回報錯誤

### Step 2 — Claude 撰寫基礎分析＋部署方案草案

Claude 必須實際查證 repo（grep / 窗口讀 / 現行邏輯確認），撰寫並寫入：

```
artifacts/{flow_id}/a3-draft.md
```

**草案必要章節**（此份草案即後續 A1/A2 評審的唯一輸入，品質直接決定評審能否抓到真問題）：
1. **基礎分析**：任務本質、現行相關邏輯／檔案的真實現況（附路徑＋行號，非憑印象）
2. **部署方案**：分步驟實作計劃，含影響檔案 `[NEW]`/`[MODIFY]`/`[DELETE]`
3. **已知風險與開放問題**：Claude 自認不確定或需要外部視角驗證的點——這是留給 A1/A2 發揮的入口，不可省略

**品質底線**：禁止出現「TBD」「同上一步驟」等佔位語句；引用檔案路徑必須是真實存在的路徑（寫草案前用 Grep/Read 驗證過）。草案本身就是接下來評審 prompt 的 context 來源，草案越紮實，A1/A2 的批評越有含金量。

寫完後自我檢查：草案非空、無佔位語句、章節齊全，方可進入 Step 3。

### Step 3 — 觸發評審（Runner --review）

```bash
node scripts/cl-flow-runner.js --review {flow_id}
```

- Runner 讀取 `a3-draft.md`，若缺失或為空 → 立即報錯停止
- 平行呼叫 **A1 Perplexity**（外部驗證，prompt 明確禁止評論 repo 內部結構）與 **A2 Gemini**（對抗 red-team，prompt 明確禁止重寫方案），各自獨立 try/catch（一邊失敗不影響另一邊）
- 產出 `artifacts/{flow_id}/ag-review.md` + `artifacts/{flow_id}/px-review.md`，逐條標 Severity（BLOCKER/MAJOR/MINOR）
- 若任一邊呼叫失敗，`state.json` 標 `degraded: true` + `degraded_reason`，**不硬停**——Runner 繼續完成另一邊並交回給 Claude

### Step 4 — 確認 Artifact 存在（Deterministic Gate）

Runner 完成後，必須確認以下檔案存在且非空：

```
artifacts/{flow_id}/task-brief.md
artifacts/{flow_id}/a3-draft.md
artifacts/{flow_id}/ag-review.md
```

`px-review.md` 若 `state.json.degraded=true` 且原因含 `px_review_failed` 則允許缺失，但 Claude 必須在 Verdict 中明確聲明「本次 A1 外部驗證缺席」。`ag-review.md` 缺失視為嚴重異常（AG 為兩種模式共同必經角色），立即停止並回報。

### Step 5 — 審閱評審意見 + 產出批評處理表

Claude 必須實際讀取並逐條回應：

- `artifacts/{flow_id}/px-review.md`（若存在）
- `artifacts/{flow_id}/ag-review.md`

**批評處理表規格**（D37 防做戲條款，逐條強制，不可籠統帶過）：

| 批評來源 | 批評內容摘要 | Severity | 裁決 | 證據 |
|---|---|---|---|---|
| A1/#N 或 A2/#N | 一句話摘要 | BLOCKER/MAJOR/MINOR | 採納/拒絕 | 見下 |

- **標「採納」** → 必須引用 `cl-final-plan.md` 第 5 節（最終執行計劃）對應章節號。指不出落點 = 視為未處理，不得標採納。
- **標「拒絕」** → 必須附反證：真實檔案路徑/行號、實測結果、或 AGENTS.md 規則編號。零證據拒絕 = 無效，需重新處理。
- **Severity 由評審方原文決定，Claude 無權調降或調升**——若 Claude 對分級有異議，可在裁決欄註明異議，但表格中的 Severity 欄照抄評審原文。
- 任一條 **BLOCKER** 被標「拒絕」→ 本次 Verdict 最高只能是 `CONDITIONAL_READY`，禁止 `APPROVED_READY`，並在批准提示中明示是哪一條。
- **Fat Mo 隨時可以一句話（例如「派 agent 覆核處理表」）要求派 fresh-context agent 抽查本表**：獨立 agent 只讀 `px-review.md`/`ag-review.md`/批評處理表，逐條核實「拒絕」的反證是否真實存在（路徑/行號/規則是否真如所述）、「採納」的落點是否真的改了東西。此為隨查機制，非強制步驟，但寫入本檔案以確保 Claude 不能假設 Fat Mo 不會查。

### Step 6 — 產出 `cl-final-plan.md`

**路徑**：`artifacts/{flow_id}/cl-final-plan.md`

**必要章節**：
1. **Verdict**：`APPROVED_READY` / `CONDITIONAL_READY` / `BLOCKED`（受 Step 5 BLOCKER 規則約束）
2. **已審閱 Artifact 清單**（含 flow_id、生成時間、是否 degraded）
3. **A3 草案摘要**（引用 `a3-draft.md` 核心分析／方案）
4. **批評處理表**（Step 5 規格，完整逐條）
5. **最終執行計劃**（分步驟，含影響檔案；若批評處理表有採納項，須反映在此節）
6. **驗證清單**
7. **批准提示**（提示 Fat Mo 輸入 `/execute`；若 degraded，此處重複警示）

**品質底線**（沿用 2026-07-07，[來源: obra/superpowers writing-plans]）：第 5 節「最終執行計劃」禁止出現佔位語句——「TBD」「加適當錯誤處理」「同上一步驟」「細節待定」視為計畫失敗，須重寫到可執行為止。硬約束（AGENTS.md 相關條款）逐字抄入相關章節，不用「見上方規則」帶過。

**Degraded 聲明規則**：若 `state.json.degraded=true`，`cl-final-plan.md` 開頭第一行必須是：
```
⚠️ DEGRADED：[degraded_reason]。本次 Verdict 僅基於[存活的評審方]意見，Fat Mo 批准 /execute 前請自行評估風險。
```

### Step 7 — 更新 state.json

寫入 `cl-final-plan.md` 後，更新：

```json
{
  "cl_status": "done",
  "status": "awaiting_approval",
  "execution_status": "locked"
}
```

### Step 8 — 停止等待

輸出最終計劃後，**強制停止**前，必須先輸出雙紀律自檢兩行（Rule 3.17）：

```
【交付前雙紀律自檢】
驗收：純規劃（cl-flow 待 execute）— 待 /execute；驗收於執行後
Subagent：[前置評估了什麼 + 派了誰/沒派 + 理由]
```

然後 **強制停止**，不得自行繼續任何修改。等待 Fat Mo 輸入 `/execute`。

---

## 錯誤處理

| 情況 | 行動 |
|------|------|
| `GEMINI_API_KEY` 缺失 | 報錯，提示填入 `.env`（AG 為兩種模式共同必經，不可省） |
| `PERPLEXITY_API_KEY` 缺失（非 --fast） | 報錯，提示填入 `.env` 或改用 `/cl-flow-fast` |
| `--init` 腳本 exit code ≠ 0 | 停止，顯示 stderr |
| `a3-draft.md` 缺失或為空（`--review` 前） | 停止，Claude 必須先完成 Step 2 |
| `--review` 腳本 exit code ≠ 0 | 停止，顯示 stderr |
| `ag-review.md` 為空（AG 兩邊皆失敗） | 停止，回報異常，不進入 Step 5 |
| `px-review.md` 缺失（單邊 degraded） | **不停止** — Step 4/6 已定義的 degraded 聲明流程接手 |
| repomix 不可用 | 不影響本流程——A3 草案階段直接用 Grep/Read，不依賴 repomix |

---

## 與舊版 /cl-flow 的差異

| v2.2.1（盲寫模式） | v3.0.0（A3-first，D37） |
|------------|--------------|
| A1/A2 盲寫作者，各自從零產出計劃 | A3 先寫草案，A1/A2 對草案作對抗評審 |
| Runner 一次執行完成 PX+AG | Runner 兩段式：`--init`（開檔）／`--review`（評審） |
| 輸出 `px-report.md`/`ag-plan.md`（作者格式） | 輸出 `px-review.md`/`ag-review.md`（逐條 Severity 批評格式） |
| A3 需自行抓兩份計劃的衝突 | A3 產出批評處理表，逐條採納/拒絕+證據，防做戲條款強制 |
| API 掛 → 整條路徑降級到靜態備援 | API 掛 → 單邊 degraded，另一邊照常完成，Verdict 顯眼聲明 |
| 有靜態檔案備援分支 | 備援分支退役（見上方路徑判斷段說明） |
