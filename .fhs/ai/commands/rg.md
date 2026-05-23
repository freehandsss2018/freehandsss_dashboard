# /rg — Ripgrep 全專案搜尋

**用途 (Purpose)**：在整個 FHS 專案目錄中執行 ripgrep 搜尋，支援關鍵字、正則表達式、路徑過濾。
**版本**：v1.0.0 (2026-05-23)
**通用平台**：Claude Code (CL) · Antigravity/Gemini (AG)
**觸發**：`/rg [搜尋目標]` 或 `/rg [pattern] [--filter 過濾條件]`

---

## 執行步驟

### Step 1 — 解析搜尋意圖

從用戶輸入中提取：
- `[pattern]`：搜尋的關鍵字或正則表達式
- `[--filter]`（可選）：副檔名或路徑限制，例如 `*.html`、`*.sql`、`*.js`
- `[--path]`（可選）：限定搜尋路徑，例如 `scripts/`、`Freehandsss_Dashboard/`

若沒有指定 `--filter`，預設搜尋所有檔案類型，但排除：
- `node_modules/`
- `.git/`
- `*.pb`（Antigravity implicit memory）
- `artifacts/`（生成物快取）

### Step 2 — 執行搜尋

使用內建搜尋工具（`grep_search` / Grep MCP）執行：
- 輸出包含：**檔案路徑 + 行號 + 匹配行內容**
- 支援正則（例如 `sbSync.*Order`）
- 支援大小寫不敏感（加 `-i` 後綴時）

### Step 3 — 輸出結果

以下列格式呈現：

```
[檔案路徑:行號] 匹配內容
```

並在末尾統計：
- 共找到 N 個匹配
- 分佈在 M 個檔案中

### Step 4 — 結果摘要（可選）

若結果超過 20 條，可概要說明：哪些檔案匹配最多、有無可疑的重複定義或遺漏。

---

## 常用範例

```
/rg sbSyncOrder
/rg W_WOOL --filter *.html
/rg order_status --filter *.sql
/rg "DELETE FROM order_items" --filter *.js
/rg process_status --path Freehandsss_Dashboard/
/rg captureFormState -i
```

---

## 副作用 (Side Effects)

- 是否寫檔：**否**
- 是否修改任何檔案：**絕對禁止**
- Token 消耗：視結果數量而定（~300–2000）
