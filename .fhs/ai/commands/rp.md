# /rp — Rewrite Prompt

**用途 (Purpose)**：將用戶的原始問題重寫為具備架構思維與明確任務指令的結構化 Prompt，以 XML Tag 格式輸出供審閱；並執行 8 維度架構掃描，作為任務前置入口（自我批評不在此階段，見 Step 3 說明與理由）。
**版本**：v2.4 (2026-07-15，新增拷問掛鉤：structural_warning 觸發時主動提議「拷問我」)
**通用平台**：Claude Code (CL) · Antigravity/Gemini (AG) · Perplexity (PL)
**觸發**：`/rp [你的原始問題]` 或 `/rp cl-flow [task]` 或 `/rp cl-flow-fast [task]`

> **PL 使用說明**：Perplexity 無指令系統，請將以下 Step 2 的 Markdown 輸出格式（非 XML）貼入對話框前置詞，後接你的問題。

---

## 三變體定義

| 指令 | 精煉 | 8維度掃描 | 自我批評 | 輸出格式 | 自動執行 |
|------|:---:|:---:|:---:|------|:---:|
| `/rp [task]` | ✅ | ✅ 完整 | ✅ ≤3點×1行 | XML | ❌ 停等審閱 |
| `/rp cl-flow [task]` | ✅ | ✅ 完整 | ✅ ≤3點×1行 | XML + cl-flow 簡報 | ❌ 停等審閱 |
| `/rp cl-flow-fast [task]` | ✅ | ⚡ 輕掃描 | ❌ 跳過 | XML 精簡 | ❌ 停等審閱 |

---

## Pipe 模式判定

當 `/rp` 後第一個 token 匹配 `.fhs/ai/commands/` 內存在的指令檔名（cl-flow、cl-flow-fast、execute、new-product 等），進入**乾式組裝（Pipe）模式**：

- 輸出開頭強制加：`【模式：pipe → <指令名>，不自動執行，等候 /execute 授權】`
- `/rp cl-flow`：精煉 + 掃描 + 輸出「cl-flow-ready 簡報」後**停止**，不自動觸發 cl-flow
- `/rp cl-flow-fast`：精煉 + 輕掃描後**停止**，不自動觸發 cl-flow-fast

> ⚠️ Pipe 模式由**用戶明確輸入**觸發（最高授權）。與 Compatibility Map 的 Exempt 規則不衝突：Exempt 禁止的是 AI 主動建議，不禁止用戶明確指定的 pipe。

---

## 執行步驟

### Step 1 — 識別模式與問題

從用戶輸入中：

1. 判定是**標準模式**還是 **Pipe 模式**（見上節）
2. 提取 `/rp [指令]` 後面的原始問題文字作為 `[Question]`

### Step 2 — 重寫為結構化 Prompt（XML 輸出）

以下列 XML Tag 格式輸出（**不輸出純文字版**，XML 本身即為供審閱的格式）：

```xml
<refined_prompt>
  <context>
    <!-- 背景環境：FHS 系統前提 + 問題發生場景（角色/系統/約束） -->
    <!-- FHS 固定前提自動注入（若問題涉及 FHS 術語）：
         Supabase-First 架構、n8n V47.x、NAS Code Node fetch 禁用、
         AGENTS.md v1.4.8、Dashboard V41 current.html -->
  </context>

  <objective>
    <!-- 明確任務目標：用動詞開頭，真正要達成的是什麼？ -->
  </objective>

  <constraints>
    <!-- 限制與邊界：不能做的、必須考慮的、已知條件 -->
  </constraints>

  <architecture_scan>
    <!-- 8 維度掃描清單。conflict / token / history 強制標 [相關]；其餘可 [N/A] -->
    <!-- 若某強制維度對本任務確實無關，可標 [強制·低] + 半行說明（如 "token:[強制·低] 微改動無顯著消耗"） -->
    <perf>[相關/N-A] 系統效能</perf>
    <ux_mgmt>[相關/N-A] 直觀管理模式（操作流暢度、Desktop/手機）</ux_mgmt>
    <conflict>[相關] 衝突避免（ID/webhook/雙寫競態/指令規則衝突）</conflict>
    <token>[相關] Token 消費（遵 Rule 3.11）</token>
    <long_term>[相關/N-A] 系統長期方向（Supabase-First、V42 規劃）</long_term>
    <responsive>[相關/N-A] Desktop + 手機介面</responsive>
    <subagent_skill>[相關/N-A] 建議 subagent/skill（建議，不自動啟動）</subagent_skill>
    <history>[相關] 過往記錄（handoff/decisions/learnings 相關 pattern/pitfall）</history>
  </architecture_scan>

  <expected_output>
    <!-- 期望輸出：格式、深度、長度；cl-flow pipe 時補「cl-flow-ready 簡報」需求 -->
  </expected_output>
</refined_prompt>
```

### Step 3 — 結構警示（有問題才輸出，無問題省略）

> 自我批評已移至 /rp-flow 管道的最終輸出層（Verdict/ag-plan 後）。
> 在精煉階段無參照物，強制批評等於表演。此處改為輕量結構警示。

只在以下任一情況成立時輸出，否則省略整個 tag：

```xml
<structural_warning>
  <!-- 觸發條件（任一）：
       • objective 含 3+ 動作動詞（任務可能需要拆分）
       • constraints 為空（執行邊界不明，風險高）
       • expected_output 未說明格式或深度
       → 每條觸發只輸出一行說明，不強制湊 3 點 -->
</structural_warning>
```

**拷問掛鉤**（2026-07-15，D27 延伸，非新決策編號）：若上方 `<structural_warning>` 有實際觸發（非省略整個 tag），XML 輸出後另起一行主動提議：

```
⚠️ 呢個任務觸發咗 structural_warning，睇落有啲模糊。要唔要「拷問我」一輪，逐條問清楚先繼續？
```

此為 AI 主動建議層級（D27 既定行為的機械化落地），非強制流程：用戶回覆「拷問我」則轉入 `grilling` skill 逐條釐清，問完返回原本審閱點；回覆「Y」/其他或忽略則照原流程繼續，不阻擋。若 `<structural_warning>` 未觸發（省略整個 tag），**不輸出此句**，維持現行零摩擦——避免 `/8d` 已識別過的「無參照物強制表演」問題重演在提議層。

### Step 4 — Pipe 模式補充（僅 /rp cl-flow 適用）

輸出「cl-flow-ready 簡報」，供直接餵給 `/cl-flow`：

```
=== cl-flow 簡報（乾式組裝，複製後手動執行 /cl-flow） ===
任務：[從 objective 提取的一句話]
關鍵約束：[從 constraints 提取的 3 條以內]
建議 subagent：[從 architecture_scan.subagent_skill 提取]
```

---

## 輸出守則（強制，所有變體）

- 分析結論不因用戶立場調整方向
- 發現用戶假設有誤，直接指出，不用「或許」「可能」軟化
- `<structural_warning>` 只針對真實結構問題，不製造假警示
- 禁止在輸出結尾加「這是個好問題」「你的方向是對的」等肯定語
- 用戶不需每次輸入「專業」「不奉承」——守則已內建，永遠生效

---

## /rp 與管道指令的關係

```
/rp [task]            ← 只精煉，Fat Mo 決定下一步（無副作用）
/cl-flow [task]       ← 精煉（內建）→ A1+A2+A3，Claude 裁決
/cl-flow-fast [task]  ← 精煉（內建）→ A2+A3，Claude 裁決（跳 PX）
/ag-flow [task]       ← 精煉（內建）→ A1+A2，AG 裁決（跳 A3）
```

**何時用 /rp 獨立呼叫**：

| 情況 | 建議 |
|------|------|
| 任務模糊，先整理思路 | `/rp` — 只精煉，看 XML 後再決定管道 |
| 任務清晰，直接規劃 | 直接用 `/cl-flow` 或 `/ag-flow`（精煉已內建）|

---

## Compatibility Map v2.2

| 情境 | 規則 |
|------|------|
| AI **主動建議**在 `/commit`、`/cl-flow`、`/cl-flow-fast`、`/ag-flow`、`/error-eye` 前插 /rp | **Exempt（禁止）**（管道指令已內建精煉，無需 AI 再建議） |
| 用戶**明確輸入** `/rp cl-flow [task]` 或 `/rp cl-flow-fast [task]` | **允許**（用戶最高授權，語義為 pipe 組裝，非重複研究） |
| `/execute` 收到含 3+ 動作動詞或並列結構的輸入 | AI 可輸出**一行建議**：「輸入較複雜，可先執行 `/rp` 整理後再提交」（不攔截，不自動重定向） |
| `/new-product`（複合 SKU 場景） | **建議**先跑 /rp 整理規格；標準產品可跳過 |
| `/fhs-check`（查詢目標模糊時） | **推薦**；明確場景無需 /rp |

---

## FHS 系統自動注入層

若輸入問題含以下關鍵詞，`<context>` 自動前置注入固定前提（節省 Fat Mo 每次手填）：

| 關鍵詞 | 自動注入前提 |
|--------|------------|
| Supabase / DB / migration / RPC | Supabase-First 架構、PostgREST 限制、RLS anon 政策 |
| n8n / webhook / workflow | NAS Code Node fetch 禁用、必用 axios / HTTP Request 節點 |
| Dashboard / HTML / UI / 手機 | V41 current.html、P9 IIFE window 暴露、手機 bottom-sheet |
| 訂單 / 付款 / IG / SKU | captureFormState 不可動、Raw_Form_State 不可侵犯 |
| 財務 / 成本 / 利潤 / KPI / RPC / 混合單 / category | 收款確收守護：final_sale_price=真理；total_cost=n8n估算快照；n8n嚴禁覆蓋確收金額。**3-layer revenue fallback**：category='metal'/'handmodel' 混合單（同單含手模+鎖匙扣）WHERE 絕對禁止加 `AND handmodel_cost=0`；eff_rev 按 item_sale_price → 成本比例 → 平均分三層；previous 期 WHERE 不含 `OR confirmed_at IS NULL`。完整邏輯見 `/.fhs/notes/FHS_System_Logic_Overview.md §十` |
| 驗證 / 查詢 / VT / live data / 查單 / 查訂單 | Supabase 為唯一 live 資料主源；Airtable 不得作為驗證或查詢資料源（僅歷史補救/冷備援）；執行工具若缺 Supabase 存取 = blocker，須先解決再設計方案，禁止靜默降級 |

### FHS 資源目錄（供 `architecture_scan.subagent_skill` 對號入座）

**Subagents（Claude Code 專用）**：

- `database-reviewer` — Airtable schema / Supabase migration 靜態審查
- `finance-auditor` — Live 三端財務動態驗算
- `frontend-developer` — Phase B 靜態 HTML 原型建構
- `code-reviewer` — 上線前 G1–G8 Gate 稽核
- `build-error-resolver` — n8n / JS runtime 錯誤診斷
- `ui-designer` — Phase A 視覺系統設計
- `tdd-guide` — 測試驅動開發引導
- `blender-3d-modeler` — STL / 3D 列印模型

**Commands（CL / AG 共用）**：

- `/cl-flow` — 精煉（內建）→ 完整規劃（A1+A2+A3），Claude 裁決
- `/cl-flow-fast` — 精煉（內建）→ 輕量規劃（A2+A3，跳 PX），Claude 裁決
- `/ag-flow` — 精煉（內建）→ 外部研究（A1+A2），AG 裁決（跳 A3）
- `/execute` — 唯一執行授權信號
- `/commit` — 交接 + Notion 同步
- `/new-product` — 新產品五步 atomic 流程
- `/fhs-check` — 全系統健康檢查
- `/guardian` — 全端守護稽核
- `/error-eye` — 錯誤監控診斷
- `/ag-plan` — Gemini 實施方案（Antigravity 主力，A2）
- `/ag-stitch-sync` — UI snippet 擷取與依賴識別
- `/ag-ui-import` — Stitch → Vanilla HTML/CSS 轉換
- `/px-plan` — 外部架構審視 + Implementation Plan（A1）
- `/px-audit` — 外部研究與系統審查

---

## 示例

**輸入**：`/rp 怎麼在 Dashboard 新增一個付款欄位？`

**Step 2 輸出（部分）**：
```xml
<refined_prompt>
  <context>
    FHS Dashboard V41 current.html（AGENTS v1.4.8）。Supabase-First 架構。
    Dashboard 為單一 HTML 檔，IIFE 閉包，新函式需 window.fn = fn 暴露。
    手機介面採 bottom-sheet，桌面採 Modal。
  </context>
  <objective>
    在訂單表單新增「付款欄位」，確保 captureFormState 序列化、payload 正確寫入 Supabase。
  </objective>
  <constraints>
    - 禁止修改 captureFormState() 核心邏輯
    - 禁止修改已有 Input/Button HTML ID（n8n webhook 掛鉤）
    - 新欄位需同時支援 Desktop 桌面版與手機版 UI
  </constraints>
  <architecture_scan>
    <perf>[N/A] 單欄位新增無效能影響</perf>
    <ux_mgmt>[相關] 桌面/手機兩版需同步設計</ux_mgmt>
    <conflict>[相關] 禁止改現有 ID；需查 payload 欄位名稱不衝突</conflict>
    <token>[強制·低] 微改動無顯著消耗</token>
    <long_term>[N/A] 單欄位改動不影響長期架構</long_term>
    <responsive>[相關] 手機 input 需 inputmode 設定</responsive>
    <subagent_skill>[相關] 建議 code-reviewer Gate（DOM 驗證）</subagent_skill>
    <history>[相關] P9 IIFE window 暴露 pitfall（learnings 2026-05-27）</history>
  </architecture_scan>
  <expected_output>
    具體 HTML/JS diff，含 captureFormState 對應欄位名稱；桌面與手機版各一段。
  </expected_output>
</refined_prompt>
```

---

## 副作用 (Side Effects)

- 是否寫檔：**否（絕對禁止）**
- 是否修改任何檔案：**絕對禁止**
- Token 消耗：標準 ~800–2000 / fast ~300–600（視問題複雜度）
