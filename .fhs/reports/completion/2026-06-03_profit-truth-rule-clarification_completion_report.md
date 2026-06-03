# 完成記錄：財務規則「收款確收守護」語義修正

**日期**：2026-06-03
**Session**：56
**觸發原因**：AI 過失——未讀 Finance Bible 即誤解「前端利潤最高真理」規則語義，導致 B2 設計方向錯誤

---

## 過失說明

AI 在 B2 cl-flow 設計階段，僅依賴 AGENTS.md 第 60 行摘要，錯誤地將
「收款確收（final_sale_price）不可被 n8n 覆蓋」的規則，延伸解讀為
「前端 calculatePricing() 估算成本亦為 n8n 應信任的真理」。

導致在 cl-final-plan.md 中提出「n8n 信任前端四分量」的設計方向，
此方向與 Finance Bible §一的明確職責分工相違背。

Fat Mo 於 2026-06-03 澄清正確語義後，本次執行所有修正。

---

## 正確語義定義（Fat Mo 確認）

| 欄位 | 寫入方 | 語義 | 可否被 n8n 改動 |
|------|--------|------|----------------|
| `final_sale_price` | 操作者手輸（Dashboard） | 確收金額（絕對真理） | ❌ 嚴禁 |
| `deposit` | 操作者手輸 | 確收訂金 | ❌ 嚴禁 |
| `balance` | 操作者手輸 | 確收尾款 | ❌ 嚴禁 |
| `additional_fee` | 操作者手輸 | 確收附加費 | ❌ 嚴禁 |
| `total_cost` | n8n（從 Supabase cost_configurations 計算） | 成本估算快照 | ✅ n8n 負責 |
| `net_profit` | n8n 計算 = final_sale_price - total_cost | 利潤（估算） | ✅ n8n 負責 |

**系統 calculatePricing() 輸出**：供操作者參考的預算估算，非確收數字。

---

## 執行完成項目

- ✅ **AGENTS.md v1.4.9 → v1.4.10**
  - 規則文字：「前端利潤最高真理」→「收款確收守護」，附語義澄清與起源警示
  - 新增 Rule 3.16：財務規則前置讀取強制律

- ✅ **learnings.md**
  - 新增「財務規則摘要 ≠ 完整語義，必先讀 Finance Bible」（嚴重過失 pitfall）
  - 新增「未讀源文件即作財務設計判斷」（嚴重過失 pitfall，Rule 3.16 觸發）

- ✅ **decisions.md**：補入 2026-06-03 AI 過失事故記錄

- ✅ **CHANGELOG.md**：記錄 v1.4.10 變更

- ✅ **持久記憶**：更新 project_cost_calculation_rules.md

---

## 防範措施（Rule 3.16）

**觸發條件**：任何涉及財務規則解釋、財務設計決策、成本計算討論時。

**強制行為**：AI 必須在作出任何判斷前，先讀取 `.fhs/ai/FHS_Finance_Bible.md` 相關章節。

**違規後果**：視為嚴重過失，同等於 feedback_investigate_before_asking 違規。

---

## B2 設計方向修正（本次澄清的影響）

舊方向（已否決）：「n8n 信任前端 calculatePricing() 四分量，前端算好 n8n 照單全收」

**正確方向**：
- n8n 停止查詢 Airtable 取成本（Airtable 已降級）
- n8n 改從 Supabase cost_configurations 計算成本四分量
- 前端 calculatePricing() = 操作者估算參考，非 n8n 輸入
- n8n 計算結果 = 後台成本記帳快照
- 確收金額（手輸）= 唯一真理，n8n 禁止覆蓋

待 Fat Mo 確認後，B2 cl-final-plan.md 需依此修正後重新規劃。
