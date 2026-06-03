# 完成記錄：Rule 3.16 強化 + 財務核心文件升版

**日期**：2026-06-03
**Session**：58
**授權**：Fat Mo `/execute`（基於 /rp 八維度草案 v2）
**類型**：制度層變動（AGENTS.md + finance-gatekeeper + finance-auditor）

---

## 執行摘要

本次修正填補 Rule 3.16 自 2026-06-03 建立以來的第一個已知漏洞：
規則只指向 Finance Bible，但財務核心實為三檔分工（Finance Bible / Cost Schema v2 / Pricing Bible）。
修正後 Rule 3.16 指向 finance-gatekeeper 路由表作為統一入口，再按任務類型讀最少必要文件。

---

## 變更清單

### 1. AGENTS.md（Rule 3.16）
- **變更前**：Rule 3.16 直接要求「先讀 Finance Bible §一」
- **變更後**：「先讀 finance-gatekeeper/SKILL.md 取路由，再讀對應文件」；補入任務型路由表；觸發關鍵字擴充

### 2. finance-gatekeeper/SKILL.md v1.0.0 → v1.1.0
- 查詢路由表新增 L2a 條目（`FHS_Product_Cost_Schema_v2.md`，成本 key 實際數值）
- §6 條目拆分：組成邏輯（L2b Pricing Bible §6）vs 實際數值（L2a Cost Schema v2）
- 權威階層從 L1+L2 升為 L1+L2a+L2b（三層）
- §三第1條「前端利潤最高真理」→「收款確收守護（v1.4.10）」語義修正
- §五（新增）技術債備忘：Pricing Bible 位置 + Task A 路由更新觸發條件

### 3. finance-auditor.md v2.0.0 → v2.1.0
- `compatible_with` 升至 AGENTS.md v1.4.10
- `last_updated` 更新至 2026-06-03
- n8n 版本更新至 V47.15
- Step 1 補入 Rule 3.16 收款確收守護語義提示
- 已知現況：靜態筆數改為「執行時即時查 Supabase」動態提示
- 補入 migration 0027 四分量欄現況說明

---

## 未執行項目（技術債，已登記）

- **FHS_Pricing_Bible.md 搬移**（`.fhs/notes/` → `.fhs/ai/`）：牽連 5+ 個引用路徑，待 PRM v2 P2 命名規範設計階段一併處理

---

## 後效稽核結果

| 稽核項 | 狀態 | 執行動作 |
|-------|------|---------|
| [A] 結構變動 | 不觸發 | — |
| [B] 制度層變動 | ✅ 觸發 | 本完成記錄 |
| [C] CHANGELOG | ✅ 觸發 | CHANGELOG.md 新增條目 |

---

## Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（session 啟動時偵測到） |
| 實際使用 | ❌ 未使用（純文件制度層修改，無 schema/n8n 操作） |
| 遵從 Router | ❌ 未遵從（database-reviewer 適合 schema 稽核；本次為制度文件修訂，不需要 live DB 查詢）|
