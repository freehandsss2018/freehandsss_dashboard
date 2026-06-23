# 完成報告：IG 看門狗警報整合 Phase 1a + Phase 2

**Session**: S119
**日期**: 2026-06-23
**Flow ID**: 2026-06-23-1841
**執行者**: Claude A3

---

## 交付範圍

本報告涵蓋 `/cl-flow` Verdict 核准的 **Phase 1a**（Supabase migration）與 **Phase 2**（V42 igwatch 模式），共兩個 Phase。Phase 1b（n8n write node）與 Phase 3（TG 深連結）依決策 Q3 延後至 2026-06-24 v3 首次 Cron 驗收通過後。

---

## Phase 1a：Supabase Migration 0043

### 已部署內容

| 物件 | 說明 |
|------|------|
| `public.ig_watchdog_alerts` | IG 看門狗警報主表（11 欄位 + CHECK kind ENUM） |
| `ix_igwatch_alerts_dedup` | expression UNIQUE INDEX，冪等鍵：`(alert_date, thread, COALESCE(order_id,''), kind)` |
| `ix_igwatch_alerts_resolved_date` | 效能索引（resolved, alert_date DESC） |
| `ix_igwatch_alerts_order_id` | 部分索引（WHERE order_id IS NOT NULL） |
| RLS `igwatch_anon_select` | anon/authenticated 只讀 SELECT |
| `public.fhs_resolve_ig_alert(uuid, boolean, text)` | SECURITY DEFINER RPC，僅允許改 resolved/resolved_at/resolved_by 三欄 |
| GRANT EXECUTE | anon + authenticated 可呼叫 RPC |
| pg_cron job | `delete-old-resolved-igwatch-alerts`：每日 03:00 UTC，清理 resolved=true 且 resolved_at < 90天前 |

### 架構決策（Verdict Q1–Q4）

- **Q2**：SECURITY DEFINER RPC 模式，anon 無法直接 UPDATE，防偽造 alert（PX 風險 5 緩解）
- **Q4**：n8n 寫入用 service_role key（`SUPABASE_SERVICE_ROLE_KEY` env），anon 無 INSERT policy（PX 風險 2 緩解）

### 本地 SQL 修正（S119 內部 bugfix）

原始草稿使用 `CONSTRAINT ... UNIQUE (... COALESCE(...))` 語法（PostgreSQL 不支援 CONSTRAINT 內含函式表達式）。已改為 `CREATE UNIQUE INDEX`，本地檔 `supabase/migrations/0043_ig_watchdog_alerts.sql` 已同步修正。

---

## Phase 2：V42 igwatch 模式

### 修改清單（freehandsss_dashboardV42.html）

| # | 位置 | 改動 |
|---|------|------|
| 1 | `#modeSwitcher` 區 | 新增 `<button id="modeIgWatchBtn" onclick="switchMode('igwatch')">🐶</button>` |
| 2 | `#reviewModeContainer` 後 | 新增完整 `#igwatchModeContainer` div（badge / 三個 filter tab / status / list） |
| 3 | IIFE 查詢初始化 | `const igwatchs = document.querySelectorAll('#igwatchModeContainer')` |
| 4 | hide-all 區 | `igwatchs.forEach(ig => ig.style.display = 'none')` |
| 5 | `switchMode` else-if 鏈 | `igwatch` 分支：show igwatchModeContainer，隱 forms |
| 6 | 6-element button array | 加入 `'modeIgWatchBtn'` |
| 7 | `activeMap` | 加入 `igwatch:'modeIgWatchBtn'` |
| 8 | bottomBar/v40bbar hide | 加入 `\|\| mode === 'igwatch'` |
| 9 | lazy-load chain | `igwatch` 分支：`setTimeout(loadIgWatchAlerts, 50)` |
| 10 | `window.onload` | URL 深連結解析：`?view=igwatch[&orderId=xxx]` |
| JS | 新增函式區（before PGC-ODAT） | 6 函式 + 4 window 匯出（見下） |

### 新增 JS 函式

| 函式 | 說明 |
|------|------|
| `setIgWatchFilter(f)` | 切換 pending/resolved/all filter tab |
| `loadIgWatchAlerts()` | `sbFetch('ig_watchdog_alerts', ...)` 200筆，更新 badge 及 list |
| `_renderIgWatchList(rows)` | kind-aware card 渲染（未/已處理背景、DB 比對徽章） |
| `_igwToggleResolve(id, resolved)` | `sbRpc('fhs_resolve_ig_alert', ...)` + 樂觀更新 |
| `_igwCopyOrderId(orderId)` | `navigator.clipboard.writeText` + showToast fallback |
| window exports | `loadIgWatchAlerts / setIgWatchFilter / _igwToggleResolve / _igwCopyOrderId` |

### kind-aware 動作設計（v2 mapOrder pitfall 修正）

| kind | 動作 | 原因 |
|------|------|------|
| `created_incomplete` | `openOrderModal(order_id, '', 'finance')` | 訂單已存在 DB，可正常開啟 |
| `not_created` | `_igwCopyOrderId(order_id)` 複製訂號 | 訂單**不**存在 DB，`openOrderModal` 會靜默失敗（mapOrder pitfall） |

### URL 深連結格式

```
?view=igwatch                         → 切換至 igwatch 模式
?view=igwatch&orderId=0601234         → 切換並自動 openOrderModal（created_incomplete 用）
```

---

## 後效同步稽核

- [A] `docs/repo-map.md` — ✅ 已更新（migration 0043 + V42 igwatch 模式說明）
- [B] 本報告 — ✅
- [C] `CHANGELOG.md` — ⏳ 進行中

---

## BLOCKED 項目（Phase 1b / Phase 3）

| Phase | 內容 | 等待條件 |
|-------|------|---------|
| 1b | n8n `Classify & Report` 後加 HTTP Request write node | 2026-06-24 06:00 HKT v3 首次 Cron 驗收 PASS |
| 3 | TG 訊息附 V42 deep-link URL | Phase 1b 完成後 |

---

## 驗收 Checklist（V42 igwatch）

- [ ] 點擊 🐶 按鈕切換至 igwatch 模式，不影響其他 mode
- [ ] `loadIgWatchAlerts()` 從 `ig_watchdog_alerts` 成功查詢（空表時顯示「目前無待處理警報」）
- [ ] filter tab 切換（未處理/已處理/全部）即時更新列表
- [ ] `not_created` 卡片顯示「複製訂號」按鈕（無「開訂單」）
- [ ] `created_incomplete` 卡片顯示「開訂單」按鈕（openOrderModal finance mode）
- [ ] 「標記已處理」→ 樂觀更新 → RPC 呼叫成功 → filter 自動更新
- [ ] URL `?view=igwatch` 自動切換模式
- [ ] URL `?view=igwatch&orderId=0601234` 自動切換 + openOrderModal（需 DB 有該訂單）
