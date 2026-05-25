# Completion Report — /rp 協議整合至指令工作流

**日期**：2026-05-25
**任務 Slug**：rp-protocol-integration
**授權方式**：Fat Mo 明確 `/execute` 指令（口頭批准修訂版實施計畫）
**執行者**：A3 (Claude Code)

---

## 任務摘要

將 `/rp` (Prompt 結構化重寫) 協議整合至 FHS 指令工作流，建立 Command Compatibility Map、授權邊界安全守護、與建議路由機制。

## 修改檔案（5 個）

| 檔案 | 變更性質 | 核心內容 |
|------|---------|---------|
| `.fhs/ai/commands/rp.md` | 新增章節 | Command Compatibility Map（7 條指令分類：Supported / Recommended / Exempt） |
| `.fhs/ai/commands/execute.md` | 新增章節 | Section 2.4 — Safety Boundaries for Refined Prompts（`<original_auth_scope>` 鎖定）|
| `.fhs/ai/commands/new-product.md` | 補充說明 | 啟動前置新增複合 SKU 建議先跑 `/rp` 整理規格 |
| `docs/FHS_Prompts.md` | 更新情境 | 情境二十三補入建議路由（非強制攔截）+ Exempt 指令清單（含 /error-eye 原因說明） |
| `docs/repo-map.md` | 更新條目 | /rp 條目補入「含 Command Compatibility Map」與日期更新 |

## 關鍵設計決策

1. **建議路由而非強制攔截**：原 a2_implementation_plan.md 提出 "automatically execute /rp"，審閱後確認此設計違反 Rule 3.11（Token 節約）及 Fat Mo 最小摩擦原則。修訂為：`/execute` 收到複雜輸入時輸出一行建議，Fat Mo 可忽略。
2. **Error Eye 強制 Exempt**：`/error-eye` 緊急診斷場景需立即路由 `build-error-resolver`，任何前置步驟均有害，明確加入 Exempt 清單並說明原因。
3. **`<original_auth_scope>` 鎖定**：`execute.md` Section 2.4 防止 `/rp` 精煉提示被用於擴大授權範圍，是本次整合最高價值的安全守護。

## 六維度架構分析結論（執行前審閱）

| 維度 | 結論 |
|------|------|
| Token 消費 | 強制攔截 overhead 不可接受（最高 +8000/session），改為建議式解決 |
| 直觀管理 | 保持 Fat Mo 零多餘步驟，僅在真正需要時出現建議文字 |
| AGENTS.md 衝突 | 唯一衝突點（Rule 3.11 + auto-intercept）已透過修訂消除 |
| 長期發展對齊 | 與零新指令原則、Supabase-First 無衝突 |
| Subagent 意外啟動 | Error Eye Exempt 消除最高風險點 |
| 驗證計畫 | Gate 1–5（3 正向 + 2 否定）就緒，待 Fat Mo 手動驗收 |

## Gate 驗收（待 Fat Mo 手動執行）

| Gate | 測試場景 | 期望結果 |
|------|---------|---------|
| Gate 2 | `/execute` 複雜多動詞輸入 | AI 宣告 `<original_auth_scope>`，不超範圍 |
| Gate 3 | `/rp /new-product 木框套裝(4肢)` | 輸出結構化 SKU 規格 XML |
| Gate 4 | `/commit sync` | 無 /rp 建議出現 |
| Gate 5 | `/error-eye n8n 診斷` | 直接路由 build-error-resolver，無前置 /rp 建議 |

## 後效同步稽核

- [A] 結構變動：無新增/刪除/移動檔案，repo-map.md 已更新 ✅
- [B] 制度層變動：3 個 commands/ 指令檔修改，本報告已產出 ✅
- [C] CHANGELOG：已更新 ✅

---

**Subagent 使用記錄**

| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（純指令文件修改，無 n8n log / UI 實作需求） |
| 遵從 Router | — |
