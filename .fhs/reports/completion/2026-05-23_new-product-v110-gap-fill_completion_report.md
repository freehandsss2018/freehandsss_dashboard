# 完成記錄：/new-product v1.1.0 — Order 資料流 Gap 補強

**任務類型**：指令層升版（.fhs/ai/commands/ 變更）
**完成日期**：2026-05-23
**執行者**：Claude Code A3
**授權方式**：Fat Mo 口頭批准（「可以執行」）
**AGENTS.md 版本**：v1.4.7

---

## 任務背景

本 session 對 `a2_implementation_plan.md`（立體擺設款式管理）進行審閱，識別出 R2 風險（n8n COST_MAP 缺漏）。後續透過 /rp 精煉 prompt，分析了「Order 全生命週期資料流」的三個 Gap：

| Gap | 描述 | 對應既有 pitfall |
|-----|------|----------------|
| G1 | 新產品在訂單總覽 Review Mode 渲染未驗證 | — |
| G2 | Edit Mode 重同步後 batch/process 保留率未驗收 | P2、P3（handoff #6、#8） |
| G3 | Step 2 未明確核查 Smart Cache COST_MAP | P7（handoff 待辦 #1） |

這三個 Gap 均未被 `/new-product` v1.0.0 覆蓋，本次任務將其補入。

---

## 變更清單

### [MODIFY] `.fhs/ai/commands/new-product.md`（Master）

| 位置 | 變更內容 |
|------|---------|
| 版本號 | v1.0.0 → v1.1.0 |
| Step 2 新增 2e | Smart Cache Strategist COST_MAP 核查（對應 G3 / pitfalls P7） |
| Gate 2 PASS 條件 | 新增「COST_MAP 含新 SKU 成本條目（或 fallback 值正確）」 |
| Step 3 新增 3f | Review Mode 渲染驗證（Desktop renderReviewTable + Mobile renderReviewAccordion + getProductDimensions）（對應 G1） |
| Gate 3 PASS 條件 | 新增「Desktop + Mobile Review Mode 均正確渲染新產品明細」 |
| Step 5 新增 5f | 已有批次訂單 Edit Mode 重同步保留驗證（含驗證 SQL）（對應 G2） |
| Gate 5 PASS 條件 | 新增「batch_number 100% 保留（SQL 驗證一致）」 |

### [MODIFY] `.claude/commands/new-product.md`（橋接版）
- description 欄位版本號同步：v1.1.0

### [MODIFY] `CHANGELOG.md`
- 新增 2026-05-23 條目記錄本次升版

---

## 後效同步稽核

| 條件 | 觸發 | 動作 |
|------|------|------|
| [A] 結構變動 | ❌ 未觸發（無新增/刪除/移動檔案） | — |
| [B] 制度層變動 | ✅ 觸發（.fhs/ai/commands/ 指令檔修改） | 本報告即為對應完成記錄 |
| [C] CHANGELOG 稽核 | ✅ 觸發（command 行為邏輯新增，影響未來使用方式） | CHANGELOG.md 已更新 |

---

## 驗收確認

- [x] new-product.md 版本號已更新至 v1.1.0
- [x] Step 2 含 2e（COST_MAP 核查）
- [x] Step 3 含 3f（Review Mode 渲染驗證）
- [x] Step 5 含 5f（批次保留 SQL 驗證）
- [x] Gate 2/3/5 PASS 條件已對應更新
- [x] 橋接版 description 同步
- [x] CHANGELOG.md 已新增條目
- [x] 本完成記錄已產出

---

## Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` + Haiku |
| 實際使用 | ❌ 未使用 |
| 遵從 Router | ❌ 未遵從（理由：任務為指令文件補強，屬制度層寫入，非 execution log 診斷；build-error-resolver 能力與任務不匹配） |
