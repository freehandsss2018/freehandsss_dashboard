# /rp — Rewrite Prompt

**用途 (Purpose)**：將用戶的原始問題重寫為具備架構思維與明確任務指令的結構化 Prompt，以 XML Tag 格式輸出，然後分析改寫後的版本。
**版本**：v1.0.0 (2026-05-20)
**通用平台**：Claude Code (CL) · Antigravity/Gemini (AG) · Perplexity (PL)
**觸發**：`/rp [你的原始問題]`

> **PL 使用說明**：Perplexity 無指令系統，直接把以下「執行步驟」作為 Prompt 前置詞貼入對話框，後接你的問題。

---

## 執行步驟

### Step 1 — 識別原始問題

從用戶輸入中提取 `[Question]` 部分（`/rp` 後面的所有文字即為原始問題）。

### Step 2 — 重寫為結構化 Prompt

以下列 XML Tag 格式輸出重寫後的 Prompt：

```xml
<refined_prompt>
  <context>
    <!-- 背景環境：這個問題發生在什麼系統/場景/角色下？補充必要前提 -->
  </context>

  <objective>
    <!-- 明確任務目標：這個問題真正想達成的是什麼？用動詞開頭 -->
  </objective>

  <constraints>
    <!-- 限制與邊界：有哪些不能做的、必須考慮的、已知條件？ -->
  </constraints>

  <expected_output>
    <!-- 期望輸出：希望得到什麼格式/深度/長度的回答？ -->
  </expected_output>
</refined_prompt>
```

### Step 3 — 分析與說明

用 2–4 點說明：
- 原始問題缺少了什麼結構
- 重寫後新增了哪些關鍵資訊
- 這樣改寫如何讓回答更精準

### Step 4 — 輸出可直接使用的版本

將重寫後的 Prompt 以純文字輸出（去除 XML Tag），方便直接貼入下一次對話。

---

## 示例

**原始輸入**：`/rp 怎麼優化我的資料庫？`

**Step 2 輸出**：
```xml
<refined_prompt>
  <context>
    我正在使用 PostgreSQL 資料庫（Supabase 託管），目前有約 10,000 筆訂單記錄，
    主要查詢模式是按日期範圍過濾 + 聚合統計（sum/count）。
  </context>

  <objective>
    識別目前查詢效能瓶頸，提供具體的索引策略與 Query 重寫建議，
    目標是將報表查詢從 3 秒降至 500ms 以內。
  </objective>

  <constraints>
    - 不能修改現有欄位名稱（前端直接依賴）
    - 只能新增索引，不能刪除現有索引
    - Supabase Free Tier 限制，無法用 pg_cron 以外的擴充
  </constraints>

  <expected_output>
    列出 3–5 個具體優化動作，每個包含：SQL 指令、預期效果、執行風險。
  </expected_output>
</refined_prompt>
```

---

## 副作用 (Side Effects)

- 是否寫檔：**否**
- 是否修改任何檔案：**絕對禁止**
- Token 消耗：~500–1500（視問題複雜度）
