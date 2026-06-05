---
name: FHS_Prompts.md 同步機制補丁完成記錄
task_slug: prompts-sync-mechanism
date: 2026-06-05
session: 63 (patch)
agents_version: AGENTS.md v1.4.12
verdict: COMPLETE
---

# FHS_Prompts.md 同步機制補丁 — 完成記錄

## 根本問題

FHS_Prompts.md（AI 業務路由總機）缺乏自動同步觸發機制。Session 63 kgov 執行後，
新增的 Rule 3.17、FHS_Product_Definition.md、/new-product Step 6、語義修正均未
反映至路由總機，Fat Mo 須靠人工主動巡查才能發現過時路由。

## 解決方案設計

三層修補：
1. AGENTS.md 規則擴充（觸發條件加寬）
2. execute.md [F] 稽核項（每次 execute 強制自查）
3. FHS_Prompts.md 內容更新（補回缺失路由）

## 執行結果

### AGENTS.md — 文件同步強制律擴充 ✅
原有：僅 `.fhs/ai/commands/` 增刪觸發
新增 3 個觸發：
- AGENTS.md 新增任何 Rule
- `.fhs/ai/` L2 文件增刪
- 核心業務語義修正（財務術語 / 產品身份 / §0 規則改變）

### execute.md — [F] 項新增 ✅
- 4 個觸發條件
- 強制更新 compatible_with + last_updated + 最後稽核 session
- ⚠️ 未執行 = 任務不得視為正式收尾（與 [B] 同等強制力）

### FHS_Prompts.md v1.7 ✅（9 個改動）

| # | 改動 | 類型 |
|---|------|:---:|
| 1 | Header: v1.6→v1.7, compatible_with v1.4.12, last_audited_session S63 | P0 |
| 2 | Header: 同步觸發說明行 | P0 |
| 3 | 情境五: 「前端利潤最高真理」→「收款確收守護」語義修正 | P0 |
| 4 | 情境六: 三叉路由（定價/成本/產品身份） | P1 |
| 5 | 情境八: 加 kgov/知識治理/Product_Definition 觸發詞 | P2 |
| 6 | 情境十二: /new-product 6步 + kgov + Rule 3.17 提示 | P1 |
| 7 | 情境二十三: v2.2→v2.3 | P1 |
| 8 | 標題行: v1.6→v1.7 | P0 |
| 9 | 更新日期/最後更新說明 | P0 |

## 後效同步稽核

- [A] 結構變動：不觸發（無檔案增刪）
- [B] 制度層變動：✅ 本報告
- [C] CHANGELOG：✅ [System v1.4.12-patch1] 已更新
- [F] FHS_Prompts.md：✅ 本任務即為同步任務

---

【交付前雙紀律自檢】
驗收：文件治理 — 引用同步清單：AGENTS.md ✅ / execute.md ✅ / FHS_Prompts.md v1.7 ✅ / CHANGELOG ✅ / completion report ✅ — PASS
Subagent：文件修改任務，A3 直接執行 — ❌ 未派（合理）
