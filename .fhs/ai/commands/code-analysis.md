# code-analysis — 代碼深度分析

> **Master 定義**。橋接版位於 `.claude/commands/code-analysis.md`。

**技能來源**：awesome-claude-code（FHS 適配版）

---

## 用途

對指定檔案或代碼片段執行多角度深度分析，識別問題、優化機會、安全隱患。

**最佳搭配**：`/debug-guide`（發現問題後系統化除錯）、`/tdd-guide`（修復前先寫測試）

## 執行步驟

收到 `/code-analysis [檔案路徑 / 代碼片段 / 描述]` 後，依序分析：

### 1. 結構分析
- 函數/節點職責是否單一？
- 是否有過度嵌套或複雜條件？
- 代碼組織是否清晰？

### 2. 邏輯正確性
- 邊界條件處理是否完整？
- 是否有靜默失敗的 try-catch？
- 資料類型假設是否正確？

### 3. 性能評估
- 是否有不必要的重複計算？
- 資料結構選擇是否合適？
- 是否有 N+1 查詢問題？

### 4. 安全審查
- 是否有 hardcoded API Keys 或密碼？
- 是否有 SQL/Command Injection 風險？
- 外部輸入是否有驗證？

### 5. 可維護性
- 命名是否清晰表達意圖？
- 是否有重複代碼需要提取？
- 依賴是否過度耦合？

## 輸出格式

```
## 代碼分析報告：[檔案名]

### 🔴 Critical（需立即修復）
- [問題描述] — 位於 [行號/節點名]
  建議：[具體修復方案]

### 🟡 Warning（需要注意）
- [問題描述]
  建議：[具體建議]

### 🟢 Improvement（優化機會）
- [優化建議]

### 總體評分：[1-10] / 主要風險：[最重要的一個問題]
```

## FHS 常用分析場景

| 場景 | 命令範例 |
|-----|---------|
| n8n Code Node 審查 | `/code-analysis [貼上 Code Node JS]` |
| Maintenance_Tools 腳本 | `/code-analysis Maintenance_Tools/audit_total_cost_integrity.py` |
| Dashboard JS 函數 | `/code-analysis [貼上 captureFormState() 函數]` |
| Airtable formula 驗證 | `/code-analysis [貼上 formula 邏輯]` |

## 使用範例

```
/code-analysis Maintenance_Tools/audit_total_cost_integrity.py
```
