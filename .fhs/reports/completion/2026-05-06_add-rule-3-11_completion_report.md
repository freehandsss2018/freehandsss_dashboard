# 完成記錄：AGENTS.md v1.4.3 — Rule 3.11 新增

**日期**：2026-05-06  
**授權方**：Fat Mo（`/execute` 指令）  
**執行方**：Claude (A3)  
**涉及層級**：制度層（憲法層修改）

---

## 變更範圍

| 項目 | 變更類型 | 檔案路徑 |
|------|---------|---------|
| AGENTS.md 版本升級 | 版本號遞增 | `/.fhs/ai/AGENTS.md` |
| Rule 3.11 新增 | 規則新增 | `/.fhs/ai/AGENTS.md` (Section 3.1) |
| read.md 角色明確化 | 文檔更新 | `/.fhs/ai/commands/read.md` |
| repomix-output.txt 清理 | 檔案刪除 | `/repomix-output.txt` |
| CHANGELOG 同步 | 文檔更新 | `/CHANGELOG.md` |

---

## Rule 3.11 核心內容

**會話初始化與 Token 節約原則**

### 三大支柱

1. **Session 絕對起點**：任何新 Session 必須執行初始化。優先用 Hook 輕量快照（~300 tokens），重大決策時升級全量重載（~2000 tokens）。

2. **輕量化優先**：一般情況依賴 Hook，僅在複雜決策、跨時間 session 風險、需驗證全細節時升級。

3. **Anti-Stale 防腐（含澄清條文）**：
   - **適用範圍**：Session **內**的重複讀取禁止（節省 token）
   - **例外明確**：Session **首次初始化不受時間戳限制**，必須執行（防失憶）
   - **理由**：每個新 session 的 LLM context 全新，不能依賴前 session 的讀取狀態判斷

---

## 風險防護

本規則設計特別重視 **LLM context 斷鏈風險**：

- ❌ **曾經的風險**：若不澄清「新 session 首次初始化例外」，AI 可能看到時間戳未變就跳過讀取 → 本 session 從未讀過 → 失憶
- ✅ **本規則的防護**：明確澄清新 session 無法依賴時間戳判斷，必須執行初始化 → 每 session 都有狀態認知

---

## 衝突檢查

**與現有規則的相容性**：

- ✅ **Mid-Session 脈衝規則**：無衝突
  - Mid-Session：管理 session **中段**的 checkpoint 存檔
  - Rule 3.11：管理 session **起點**的初始化
  - 兩者場景互補，不衝突

---

## 後效同步稽核

### [A] 結構變動稽核

**觸發**：删除 `repomix-output.txt`（根目錄變動）

**同步動作**：
- ✅ `docs/repo-map.md` 已檢查，無需更新（repomix-output.txt 未在 repo-map 中登記）

### [B] 制度層變動稽核

**觸發**：修改 AGENTS.md + 修改 read.md

**同步動作**：
- ✅ 本完成記錄已產出

### [C] CHANGELOG 稽核

**觸發**：版本升級 (v1.4.2 → v1.4.3) + 規則語義變更

**同步動作**：
- ✅ `CHANGELOG.md` 已記錄 v1.4.3 新增

---

## 驗證清單

- ✅ `repomix-output.txt` 已刪除（根目錄不存在）
- ✅ `AGENTS.md` Rule 3.11 已新增，版本號升至 v1.4.3
- ✅ `AGENTS.md` 更新時間戳已更新至 2026-05-06
- ✅ `read.md` 已明確「全量重載」角色與使用時機
- ✅ `CHANGELOG.md` 已記錄 v1.4.3 變更摘要
- ✅ 本完成記錄已產出

---

## 簽署

**執行方（Claude/A3）**：確認所有變更已完成，無遺漏項目。

**備註**：A2（Antigravity）提案中的 Timestamp Check 邏輯已納入澄清條文，防止新 session 失憶風險。建議未來若需進一步優化 Token 節省機制，應在「本 session 內的重複讀取檢測」上著手，而非依賴跨 session 的時間戳比對。
