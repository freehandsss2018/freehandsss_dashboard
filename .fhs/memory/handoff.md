# FHS Handoff - 2026-05-13 (Bug Fix + Architecture + Skill)
當前版本：v1.4.5（憲法層） / V41（Stable Production）

---

## 本次 Session 完成事項

### 🐛 Dashboard Bug 修復（代碼完成）
- **Bug 1 — Supabase 同步缺失**：`sbSyncOrder()` 已實作（V41 7283–7360），並在 n8n 成功後觸發（line 5081）
- **Bug 1 附加**：`final_sale_price` 補入 `sbSyncOrder orderRow`（line 7315）— 修復財務欄位同步後為 0 的問題
- **Bug 2 — 重複資料**：`sbFetchItems()` dedup filter（V41 7516–7520）+ `renderReviewTable()` dedup（V40 ~5470）
- **Bug 3 — 面板未展開**：Auto-repair IIFE（4428–4454）+ hybrid supplement mode（4648–4666）+ enhanced item parsing（4695–4757）

### 🏗️ 架構文件更新
- `n8n/Quadruple_Sync_Field_Map.md` → **v1.1**
  - 成本計算雙層架構決策（Supabase View 即時報價 vs n8n 歷史快照）
  - sbSyncOrder 寫入白名單（9 允許 / 6 禁止）
  - raw_form_state 解碼表（17 個 key）
- `supabase/descriptions_comments.sql` — 6 張表全欄位中文說明（新建）

### 🛠️ Skill + Subagent
- `.fhs/ai/skills/fhs-bug-triage/SKILL.md` — 5-Gate Completion Protocol（新建）
- `build-error-resolver.md` — 掛入 fhs-bug-triage skill，更新必讀清單

### 📁 文件清理
- 刪除 5 份重複 Setup 文件，精簡 SUPABASE_RLS_SETUP.md 為純 SQL

---

## 待辦 ⏳ 項目

### 🔴 BLOCKING（Fat Mo 手動執行，5 分鐘）
1. **Supabase SQL Editor 建立 4 個 RLS 寫入 Policy**
   - 見 `.fhs/setup/SUPABASE_RLS_SETUP.md`
   - 完成後 sbSyncOrder 才能正常同步

### 🟡 Live 驗證（RLS 完成後）
2. 編輯一筆訂單 → 同步 → 確認 Console 顯示 `[sbSyncOrder] Supabase sync complete`
3. Supabase Table Editor 確認 `orders.final_sale_price` 非 0、`order_items` 有資料

### 📋 架構後續（下次 Session）
4. **Phase A**：在 Supabase 建立 `v_products_with_costs` VIEW（供 Dashboard 即時報價）
5. **Phase B**：n8n 讀取來源從 Airtable → Supabase（減少 Airtable API 調用）
6. **Anti-Idle Ping**：n8n Schedule Trigger 每 6 天 ping Supabase
7. **pg_cron TTL**：`error_logs` 30 天自動清理設定
8. **Supabase 資料遷移最終確認**：`migrate_airtable_to_supabase.js`

---

## 核心配置

| 項目 | 現況 |
|------|------|
| 憲法層 | `AGENTS.md` v1.4.5 |
| 穩定生產版 | `Freehandsss_dashboard_current.html` (V41) |
| 主要開發版 | `freehandsss_dashboardV41.html` |
| n8n Workflow | V45.7.4 |
| Airtable Base | `app9GuLsW9frN4xaT` |
| Supabase | Primary Lead（RLS 待補）|
| Field Map | `n8n/Quadruple_Sync_Field_Map.md` v1.1 |
| Bug Triage Skill | `.fhs/ai/skills/fhs-bug-triage/SKILL.md` |
| 報告中心 | `.fhs/reports/` |
| Subagents | 8 個（含 fhs-bug-triage 整合） |

---

## 本次教訓記錄

`.fhs/memory/lessons/2026-05-13_Bug_Fix_Completion_Bias.md`
— 代碼已寫 ≠ Bug 已修復。宣告完成前必須通過 5-Gate Protocol。
