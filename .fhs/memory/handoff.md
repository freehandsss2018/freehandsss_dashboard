# FHS Handoff - 2026-05-14 (CRUD 測試完成 + 新 Bug 發現)

當前版本：v1.4.5（憲法層） / V41（Stable Production）

---

## 本次 Session 完成事項

### ✅ Fix 4A/4B/4C + pEngraving Save（上次 Session 遺留，本次確認已上線）

- Fix 4B 擴展（line ~4542）：renderLimbGrid 後 re-apply babyQuickColor/woodStyle/en_parent/en_elder
- Fix 4C 擴展（line ~4866）：restoreFormState(_synth) 前 carry 全部 limb_sel_* from raw_form_state
- pEngraving save fix（line ~4022）：orderItemsArray.push 補入 Notes 欄位

### ✅ CRUD 測試（test001–test007 全部 PASS）

- test001–006：前次 Session 完成
- test007（P木框 + M大寶）：本次完成
- test-e1（人手測試）：Fat Mo 手動新增，新增/載入均成功

### ✅ A2 測試指令文件

- `artifacts/2026-05-13-2257/A2_browser_test_prompt.md` 生成完畢（10 筆訂單 CRUD 規格）

### 🔴 新發現 Bug（尚未修復）

**Bug 4** — 立體擺設 Overview vs Edit Form 不符
- 根因：`mapOrder` 只讀 `order_items.item_key`（`TEMP_P_MAIN`），不讀 `raw_form_state.pSubCat`
- 影響：Overview 顯示 P 款式類型錯誤/空白

**Bug 5** — 新增訂單後 Overview 不立即顯示（需等 3 分鐘）
- 根因 1：`sbSyncOrder.orderRow` 沒有 `confirmed_at` → Supabase 存 NULL → date filter 排除
- 根因 2：`sbSyncOrder` 完成後沒有觸發 `fetchGlobalReview(true)`
- 影響：操作者誤以為新增失敗

**Bug 6** — 沒有收到 Telegram 訊息
- 根因：待查 n8n 執行日誌
- 影響：訂單通知系統無效

---

## 待辦 ⏳ 項目

### 🔴 BLOCKING（下次 Session 優先處理）

1. **Bug 5 修復**（sbSyncOrder 加 confirmed_at + 完成後觸發 Overview 刷新）
2. **Bug 4 修復**（mapOrder 從 raw_form_state 補充 P 產品顯示欄位）
3. **Bug 6 診斷**（查 n8n 執行日誌，確認 Telegram 節點）
4. **test008–010 CRUD 測試**（待 Bug 4/5 修復後繼續）

### 📋 架構後續（排期）

5. **Phase A**：Supabase 建立 `v_products_with_costs` VIEW
6. **Phase B**：n8n 讀取從 Airtable → Supabase
7. **Anti-Idle Ping**：n8n Schedule Trigger 每 6 天 ping Supabase
8. **pg_cron TTL**：`error_logs` 30 天自動清理

---

## 核心配置

| 項目 | 現況 |
|------|------|
| 憲法層 | `AGENTS.md` v1.4.5 |
| 穩定生產版 | `Freehandsss_dashboard_current.html` (V41) |
| 主要開發版 | `freehandsss_dashboardV41.html` |
| n8n Workflow | V45.7.4 |
| Airtable Base | `app9GuLsW9frN4xaT` |
| Supabase | Primary Lead（RLS 已設，anon write 正常）|
| Field Map | `n8n/Quadruple_Sync_Field_Map.md` v1.1 |
| Bug Triage Skill | `.fhs/ai/skills/fhs-bug-triage/SKILL.md` |
| Subagents | 8 個 |

---

## 本次教訓記錄

- `2026-05-13_Bug_Fix_Completion_Bias.md`：代碼已寫 ≠ Bug 已修復，宣告完成前必須通過 5-Gate Protocol
- `2026-05-14_Overview_Refresh_Gap.md`（待寫）：sbSyncOrder 必須攜帶 confirmed_at 否則 date filter 靜默排除新訂單
