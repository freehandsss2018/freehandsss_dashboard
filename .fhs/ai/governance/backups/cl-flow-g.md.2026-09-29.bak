# /cl-flow-g

**用途 (Purpose)**：`/cl-flow-fast` 的 A4 串接版（g = GPT = A4，Codex）。前段與 `/cl-flow-fast` 相同（A3 草案 → A2 對抗評審 → Verdict），另把 **A4 實作後審查**變成流程內建的硬性關卡，不再靠記憶。
**適用場景**：`/cl-flow-fast` 適用的任務（功能實作、UI 修改、Bug 修復、已定架構的改動），且屬 A4 必審範圍（代碼／HTML／n8n／migration／hook／腳本）。
**不適用場景**：需要外部研究或技術選型 → `/cl-flow`（其 Verdict 亦可走 `/a4-review`）；純文件搬移／文案潤飾 → 用 `/cl-flow-fast` 即可（A4 標「不適用」）。
**對應 Agent**：A3 (Claude Code)
**Version**: v1.0.0 (2026-09-26，D99)
**角色表唯一本文**：`.fhs/ai/AGENTS.md` §7（A1–A4）。本檔只寫流程，不複製角色表。
**NO-TOUCH GUARDRAIL**：`/execute` 前全程禁止任何業務代碼寫入；A4 只審不改，A3 不代跑 Codex。

> 精煉（/rp 輕量版）為預設第一步，不可跳過。名稱含義：cl = Claude 裁決；g = GPT（A4）於實作後獨立審查；同樣跳過 A1(PX)（不是跳過評審）。

---

## 與 /cl-flow-fast 的差異

| 項目 | /cl-flow-fast | /cl-flow-g |
|------|--------------|-----------|
| 前段（精煉、草案、A2 評審、批評處理表） | ✅ | ✅ 完全相同 |
| Verdict 加「A4 適用性」欄 | ❌ 只寫指針 | ✅ 必填（必審／不適用＋理由） |
| `/execute` 後 A4 步驟 | 靠 A3 記得 | ✅ 內建硬停點，狀態記入 `state.json` |
| A4 交付包、回應、2 輪上限 | 手動 `/a4-review` | ✅ 自動接 `/a4-review` |
| 收尾 | 無 A4 收斂條件 | ✅ A4 未審／受阻不得收尾 |

---

## 前段（Step 0–8）：同 `/cl-flow-fast`

依序照 `.fhs/ai/commands/cl-flow-fast.md` 的 Step 0（/rp 輕量精煉、Gate 1 強制審閱）→ Step 1（`cl-flow-runner.js --init`）→ Step 2（`a3-draft.md`）→ Step 3（`--review {flow_id} --fast`，A2 Gemini）→ Step 4（確認 artifact）→ Step 5（批評處理表）→ Step 6（Verdict）→ Step 7（state.json）→ Step 8（停）。錯誤處理、degraded 規則、Gemini 過載處置一併沿用該檔，此處不重複。**以下只列差異。**

### Verdict 差異（Step 6 精簡格式）

在「## 1. 判決」加兩行，並在「## 4. 批准提示」改為：

```markdown
## 1. 判決
APPROVED_READY / CONDITIONAL_READY / BLOCKED
A1(PX)：本次不需（理由）
A4 適用性：必審（屬代碼／HTML／n8n／migration／hook／腳本）／不適用（理由）

## 4. 批准提示
輸入 `/execute` 開始執行。實作與測試完成後，本流程會準備 A4 交付包並在「請 Fat Mo 觸發 A4」處停下。
```

### state.json 差異（Step 7）

除 `cl_status`／`status`／`execution_status` 外，A3 手動加 `"a4": {"required": true|false, "reason": "...", "status": "pending"}`（Runner 不管此欄，避免改 runner）。

---

## 後段（`/execute` 之後，A4 串接）

`/execute` 由 Fat Mo 輸入才開始（A3 不自行串接）。**必審範圍**者在開工前記基線（`/execute` 已規定）：`{ echo "HEAD=$(git rev-parse HEAD)"; git --no-optional-locks status --porcelain; } > artifacts/{flow_id}/a4-baseline.txt`。

### G1 — 實作與測試
A3 只做 Verdict 已批准範圍；跑測試並記結果。

### G2 — 既有驗收
照 Rule 3.17 任務型驗收：`code-reviewer` G1–G8（代碼／HTML）、財務只認 `finance-auditor`、n8n 看 execution log。A4 是附加層，不取代。

### G3 — 準備 A4 交付包並硬停
A3 依 `.fhs/ai/commands/a4-review.md`（v1.3.0+）Step 1 產出 `artifacts/{flow_id}/a4-scope.md`，`state.json` 的 `a4.status` 設 `awaiting_fatmo_trigger`，然後**強制停止**並輸出：

```
⏸ A4 待審 — 請 Fat Mo 親手觸發（A3 不代跑）：
  (a) Claude Code 輸入 /codex:review --base main（或 /codex:review 審工作區）
  (b) 或在 repo 根目錄 codex -s read-only，貼 a4-review.md 提示詞模板
  貼回結果後我會存 gpt-review.md 並逐條回應。
```

### G4 — 收結果與回應
Fat Mo 貼回 Codex 結果後，A3 依 `a4-review.md` Step 3–4：存 `gpt-review.md`（檔頭含工具、指令、範圍 sha256、thread id、時間、效力級別；效力級別只能是 `A4 已審（Fat Mo 直接觸發）`——除非 Fat Mo 另有說明）、逐條回應（severity 照抄；已修／待處理／不採納＋證據），並把 `a4.status` 更新為 `responded`。

### G5 — 收斂或升級
- 重審上限 **2 輪**；仍有未解 BLOCKER → `a4.status = "DISPUTE_ESCALATED"`，停止並交 Fat Mo。
- A4 的 BLOCKER 不得由 A3 推翻；審後任何代碼改動使舊報告作廢，需再審。
- Codex 失敗（非 0 exit、逾時、未登入、陳舊輸出檔）→ `a4.status = "blocked"`，標「A4 受阻」，不得以「A4 已審」收尾，替代由 Fat Mo 決定。

### G6 — 收尾條件
只有 `a4.status` 為 `responded`（且無未解 BLOCKER）、或 `not_applicable`（Verdict 已寫理由）時，A3 才可寫完成記錄並在 [E] 驗收行填 `A4：已審（級別）／不適用（理由）`。`blocked`／`DISPUTE_ESCALATED`／`awaiting_fatmo_trigger` 一律不得寫「已獨立審查」。

---

## 為何 Codex 不自動跑

清單 #7（runner 自動呼叫 Codex）已於 D98 擱置：探針只證明非互動 `codex exec -s read-only` 下寫入被沙盒擋，Codex 端 hook 對本 repo 未證實生效，且「Fat Mo 親手觸發」才使 A4 效力級別成立。故 G3 是硬停，不是缺陷。

## Known failure modes（迴圈追加，格式勿改）

（暫無條目）
