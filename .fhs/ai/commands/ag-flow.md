# /ag-flow — AG 裁決規劃管道

> ## ⚠️ [DEPRECATED]（2026-07-04，Session 134，Desktop App 平台收斂 Phase 4.2）
> **原因**：本指令在 Claude Code / Desktop App 內執行，卻把裁決權讓給 AG（跳過 A3 Claude 審閱）——
> Desktop App 現有 `/cl-flow` 已提供同等（甚至更強）能力：PX+AG 平行研究 + Claude（Pro 訂閱，免費）裁決，
> 直接落 repo 並銜接 `/execute`。在 Claude Code 內繞一圈讓 AG 裁決已無實質優勢。
> **若你真的想要 AG（Gemini）作最終裁決**：請直接打開 Antigravity IDE 原生操作，不透過此橋接指令。
> Antigravity 本身依 2026-07-03 決策為**永久共存備援**，未除役，此處僅棄用「從 Claude Code 橋接呼叫 AG 裁決」這條路徑。
> 本檔案內容保留作歷史參考，不再是建議用法。

**用途**：精煉任務描述後，自動執行 A1 Perplexity 外部研究 + A2 Gemini ag-plan，由 AG 作最終裁決。跳過 A3 Claude 審閱。
**版本**：v1.0.0 (2026-05-30)
**平台**：Claude Code (CL) · Antigravity/Gemini (AG)
**觸發**：`/ag-flow [task]`

> ⚠️ `/execute` 永遠由 Fat Mo 手動輸入，AI 不自動觸發。

---

## 裁決者：AG（Gemini）

| 步驟 | 執行內容 | 跳過 |
|------|---------|------|
| Step 0 | /rp 精煉（完整 8 維度掃描）| — |
| Gate 1 | 強制停，Fat Mo 審閱精煉 XML | — |
| A1 | Perplexity 外部研究 → px-report.md | — |
| A2 | Gemini ag-plan → ag-plan.md（最終裁決文件）| — |
| A3 | Claude Verdict | **跳過** |

**適用場景**：需要外部研究參考、但信任 AG 計畫直接執行、不需要 Claude 再審一遍。

---

## 執行步驟

### Step 0 — /rp 精煉（預設，不可跳過）

讀取並執行 `.fhs/ai/commands/rp.md` Step 1–2：
- 完整 8 維度掃描（conflict / token / history 強制相關）
- 輸出 `<refined_prompt>` XML
- `<structural_warning>`（有問題才出現）

---

### Gate 1 — 強制審閱

```
┌──────────────────────────────────────────────────────┐
│  ⏸ Gate 1 — 精煉 XML 審閱                            │
│                                                      │
│  輸入修改指示 → AI 修正 XML 後重顯示（可重複）         │
│  回覆「Y」    → 繼續執行 A1+A2 管道                   │
│  回覆「取消」  → 停止，保留 XML 供手動使用             │
└──────────────────────────────────────────────────────┘
```

---

### Step 1 — 執行 Runner（AG 裁決模式）

```bash
node scripts/cl-flow-runner.js "[精煉後 objective]"
```

- 執行完整 PX + AG 流程（不加 `--quick`）
- 腳本生成 `flow_id`（格式：`YYYY-MM-DD-HHmm`）
- 從 stdout 最後一行讀取 `FLOW_ID=xxx`

---

### Step 2 — 確認 Artifact 存在

```
artifacts/{flow_id}/task-brief.md
artifacts/{flow_id}/px-report.md
artifacts/{flow_id}/ag-plan.md
artifacts/{flow_id}/state.json
```

任一缺失 → 立即停止回報，不進行裁決。

---

### Step 3 — ag-plan 裁決批評

讀取 `artifacts/{flow_id}/ag-plan.md` 後輸出：

```xml
<plan_critique>
  <w1>ag-plan 本身的真實缺陷一</w1>
  <w2>真實缺陷二</w2>
  <w3>真實缺陷三（可選，只有 2 個有意義的可省略）</w3>
  <better_version>修正後一句話總結</better_version>
</plan_critique>
```

**批評守則**：
- 必須針對剛產出的 ag-plan 內容，不套通用弱點模板
- 發現假設有誤直接指出，不用「或許」軟化
- 禁止「這個計畫整體不錯，但…」開頭

---

### Step 4 — /execute 提示

```
┌──────────────────────────────────────────────────────┐
│  ag-plan 已產出並完成批評。AG 為最終裁決文件。         │
│  請輸入 /execute 執行。                               │
│  （AI 不自動觸發，遵 execute.md 硬規則）               │
└──────────────────────────────────────────────────────┘
```

---

## 與其他管道的對照

```
/rp [task]           ← 只精煉，Fat Mo 決定下一步
/cl-flow [task]      ← 精煉 → A1+A2+A3，Claude 裁決
/cl-flow-fast [task] ← 精煉 → A2+A3，Claude 裁決（跳 PX）
/ag-flow [task]      ← 精煉 → A1+A2，AG 裁決（跳 A3）
```

---

## 副作用

- 是否寫檔：**是**（產出 artifacts/{flow_id}/）
- 觸發 /execute：**絕對禁止自動觸發**
- Token 消耗：~3000–6000
