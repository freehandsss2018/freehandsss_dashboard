# /rp-flow — Refined Prompt Pipeline

**用途**：將 /rp 精煉與規劃管道自動串聯，減少手動銜接步驟。
**版本**：v1.0.0 (2026-05-30)
**平台**：Claude Code (CL) · Antigravity/Gemini (AG)
**觸發**：`/rp-flow [task]` · `/rp-flow --review [task]` · `/rp-flow-fast [task]` · `/rp-flow-ag [task]`

> ⚠️ `/execute` 在所有變體下永遠由 Fat Mo 手動輸入，AI 不自動觸發（遵 execute.md 硬規則）。

---

## 四變體定義

| 指令 | A1 PX | A2 ag-plan | A3 Verdict | 批評位置 | Gate2 |
|------|:-----:|:----------:|:----------:|---------|:-----:|
| `/rp-flow [task]` | ✅ | ✅ | ✅ | Verdict 後 | ❌ |
| `/rp-flow --review [task]` | ✅ | ✅ | ✅ | Verdict 後 | ⏸ |
| `/rp-flow-fast [task]` | ✅ | ✅ | ✅ (fast) | ❌ | ❌ |
| `/rp-flow-ag [task]` | ✅ | ✅ (裁決) | ❌ | ag-plan 後 | ❌ |

**與現有指令的關係**（不替代，僅包裝）：

```
/rp-flow     = /rp精煉 → 自動接 /cl-flow
/rp-flow-ag  = /rp精煉 → 自動接 A1+A2（ag-plan 為最終裁決）
/cl-flow     ← 仍可獨立使用
/ag-plan     ← 仍可獨立使用
```

---

## 執行步驟（所有變體共用前段）

### Step 1 — /rp 精煉

讀取並執行 `.fhs/ai/commands/rp.md` Step 1–2：

- 識別任務
- 8 維度掃描（conflict / token / history 強制相關）
- `<structural_warning>`（有問題才出現）
- 輸出 `<refined_prompt>` XML

**fast 變體**：掃描輕量化（N/A 快速帶過），跳過 `<structural_warning>` 判斷。

---

### Gate 1 — 強制審閱（所有變體）

```
┌──────────────────────────────────────────────────────┐
│  ⏸ Gate 1 — 精煉 XML 審閱                            │
│  建議 subagent：<從 architecture_scan 自動提取>        │
│                                                      │
│  輸入修改指示 → AI 修正 XML 後重顯示（可重複）         │
│  回覆「Y」    → 繼續接管道下一步                      │
│  回覆「取消」  → 停止，保留 XML 供手動使用             │
└──────────────────────────────────────────────────────┘
```

---

### Step 2 — 管道執行（依變體分流）

**`/rp-flow` 與 `/rp-flow --review`**：

```
讀取並執行 .fhs/ai/commands/cl-flow.md
輸入 = 精煉後 <objective>（而非原始輸入）
標示：【/rp-flow → cl-flow 自動接管，輸入已精煉】
→ A1 Perplexity 研究 → A2 ag-plan → A3 Claude Verdict
→ cl-final-plan.md 產出
```

**`/rp-flow-fast`**：

```
讀取並執行 .fhs/ai/commands/cl-flow-fast.md
輸入 = 精煉後 <objective>
標示：【/rp-flow-fast → cl-flow-fast 自動接管，輸入已精煉】
→ A1+A2+A3（輕量）→ Verdict 產出
```

**`/rp-flow-ag`**：

```
執行 A1 Perplexity 研究（讀取 .fhs/ai/commands/px-plan.md）
輸入 = 精煉後 <objective>
→ px-report 產出

執行 A2 ag-plan（讀取 .fhs/ai/commands/ag-plan.md）
輸入 = px-report + 精煉後 <objective>
→ ag-plan.md 產出（ag-plan 為本管道最終裁決文件）
標示：【/rp-flow-ag：ag-plan 為裁決文件，跳過 A3】
```

---

### Step 3 — 裁決批評

> 目的：在最終輸出處做真實批評（有內容才能批評）。fast 變體跳過。

**`/rp-flow` / `--review` / `-ag`** 必須在顯示 Gate 提示前輸出：

```xml
<verdict_critique>  <!-- /rp-flow 與 --review 用 -->
  <w1>Verdict/計畫本身的真實缺陷一</w1>
  <w2>Verdict/計畫本身的真實缺陷二</w2>
  <w3>真實缺陷三（可選，若只有 2 個有意義的則省略）</w3>
  <better_version>修正後一句話總結</better_version>
</verdict_critique>

<plan_critique>  <!-- /rp-flow-ag 用，批評 ag-plan -->
  <w1>ag-plan 本身的真實缺陷一</w1>
  <w2>真實缺陷二</w2>
  <w3>真實缺陷三（可選）</w3>
  <better_version>修正後一句話總結</better_version>
</plan_critique>
```

**批評守則**：

- 必須針對剛產出的 Verdict/ag-plan 內容，不得套用通用弱點模板
- 發現假設有誤必須直接指出，不用「或許」軟化
- 禁止以「這個計畫整體不錯，但…」開頭（奉承前綴）

---

### Gate 2 — 僅 `--review` 變體

```
┌──────────────────────────────────────────────────────┐
│  ⏸ Gate 2 — Verdict 嚴格審閱（--review 限定）        │
│                                                      │
│  輸入修改指示 → AI 補充/調整 Verdict 後重顯示         │
│  回覆「Y」    → 顯示 /execute 提示                   │
│  回覆「取消」  → 停止，等手動決定                     │
└──────────────────────────────────────────────────────┘
```

---

### Step 4 — /execute 提示（所有變體）

```
┌──────────────────────────────────────────────────────┐
│  裁決文件已產出並完成批評審閱。                        │
│  請輸入 /execute 執行。                               │
│  （AI 不自動觸發，遵 execute.md 硬規則）               │
└──────────────────────────────────────────────────────┘
```

---

## 完整流程對比

```
/rp-flow
  精煉+完整掃描 → Gate1⏸ → A1+A2+A3 → verdict_critique → 提示/execute

/rp-flow --review
  精煉+完整掃描 → Gate1⏸ → A1+A2+A3 → verdict_critique → Gate2⏸ → 提示/execute

/rp-flow-fast
  精煉+輕掃描   → Gate1⏸ → A1+A2+A3(fast) → 提示/execute

/rp-flow-ag
  精煉+完整掃描 → Gate1⏸ → A1+A2(裁決) → plan_critique → 提示/execute
```

---

## 副作用

- 是否寫檔：**是**（觸發 cl-flow/ag-plan 流程會產出 artifacts）
- 觸發 /execute：**絕對禁止自動觸發**
- Token 消耗：/rp-flow ~4000–8000 / -fast ~2000–4000 / -ag ~2000–5000
