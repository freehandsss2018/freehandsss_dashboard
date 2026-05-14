# FHS Handoff - 2026-05-14 (Overview Badge 全面修復完成)

當前版本：v1.4.5（憲法層） / V41（Stable Production）

---

## 本次 Session 完成事項

### ✅ Bug 5C 修復（sbFetchGlobalReview NULL confirmed_at 排除）
- 真正根因：PostgreSQL NULL 比較永遠 false → 歷史訂單（confirmed_at=NULL）被日期過濾排除
- 修復：PostgREST `or(col.gte.X,col.is.null)` 語法

### ✅ Fix 4D 系列（P 款肢數 Badge）
- v1 失敗：key 名用 lh/rh/lf/rf（錯）→ 應用中文 左手/右手/左腳/右腳
- v2 失敗：玻璃瓶大寶/父母 section 預設「待定」被計入 → 8肢 → 無 pattern 匹配
- v3 成功：嬰兒只排除「無」，大寶/父母同時排除「無」+「待定」
- getProductDimensions 新增 1手1腳/2手/2腳/1手/1腳 pattern

### ✅ Bug 1 UI 修復
- total_cost/net_profit = 0 時顯示「待計算」（灰色），不再顯示 $0

### ✅ Badge 清理
- 有 count 時不重複顯示 part（去除立體擺設多餘 ✋ icon）
- 立體擺設不顯示 x1 數量
- Accordion renderer 補入 style + count badge

### ✅ Skill 建立
- `.fhs/ai/skills/fhs-p-product-display/SKILL.md`：立體擺設 Overview 顯示 bug 診斷 skill

---

## 待辦 ⏳ 項目

### 🔴 BLOCKING（下次 Session 優先處理）

1. **玻璃瓶 父母/大寶 部份顯示 Bug**（產品明細需正確顯示 父母/大寶 選取資訊）
2. **Bug 6 修復**（n8n `Fetch Exact Base Cost` 節點 Rate Limit → Telegram 節點未執行）
3. **test008–010 CRUD 測試**（暫停中）

### 📋 架構後續（排期）

4. **Phase A**：Supabase 建立 `v_products_with_costs` VIEW
5. **Phase B**：n8n 讀取從 Airtable → Supabase
6. **Anti-Idle Ping**：n8n Schedule Trigger 每 6 天 ping Supabase
7. **pg_cron TTL**：`error_logs` 30 天自動清理

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
| Skills | fhs-bug-triage, fhs-p-product-display（本次新增）|

---

## 本次教訓

- `2026-05-14_P_Product_Badge_Debug.md`：limb_sel key 中文命名 + 待定/無分層計算
- 玻璃瓶 vs 木框 的差異：玻璃瓶多出 大寶/父母 section，預設值為「待定」而非「無」
