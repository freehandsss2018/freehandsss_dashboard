# 交貨期提示系統 — 實作規劃

> 建立：2026-06-10（Session 82）
> 狀態：⏸ 待 Fat Mo `/execute` 授權
> 背景：Freehandsss 所有產品需 90 天內交貨，需就每張訂單作倒數提示，交貨期將到時通知 Fat Mo。

---

## 0. 需求鎖定（Fat Mo 已確認）

| 項目 | 決定 |
|------|------|
| 計時起點 | `COALESCE(appointment_at, created_at::date)`（倒模日；無則建單日）|
| 交貨期 | 起點 + 90 天 |
| 提醒門檻 | **14 天前** / **當天到期(0)** / **逾期持續**（不含 7 天前）|
| 提示方式 | Dashboard 視覺標記 **＋** Telegram 每日推送 |
| 「完成」訊號 | **`process_status`**：值 ∈ {完成, 已取件, 已取消} → 退出提示 |

> ⚠️ 隨此決定，Fat Mo 須開始維護 `process_status`（現況 30 張全為「待確認」，14 張已逾期）。首次上線前建議批次清理：把已交付舊單改為「已取件」。

---

## 1. 資料現況（2026-06-10 live 查證）

- `appointment_at` (date)：倒模預約日，多數有值，少數 null。
- `created_at` (timestamptz)：建單日，必有。
- `process_status` (enum)：待確認 / 製作中 / 完成 / 已取件 / 已取消。**現況全 30 張＝待確認（未維護）**。
- 現有分桶（未封存）：逾期 14、7天內 1、14天以上 15。

---

## 2. 提示對象定義（SSoT）

```
WHERE deleted_at IS NULL
  AND process_status NOT IN ('完成','已取件','已取消')
```

緊急度等級（`days_remaining = due_date - CURRENT_DATE`）：

| 等級 | 條件 | 色 |
|------|------|----|
| `overdue` | days_remaining < 0 | 紅 |
| `due_today` | = 0 | 紅閃 |
| `warn` | 1–14 | 黃 |
| `normal` | > 14 | 不標記 |

---

## 3. 實作三件（待 /execute）

### P1 — Supabase VIEW `v_delivery_reminders`（新 migration 0032）

集中計算，Dashboard 與 n8n 共讀同一真理源（避免邏輯漂移）。

```sql
CREATE OR REPLACE VIEW public.v_delivery_reminders AS
SELECT
  o.id, o.order_id, o.customer_name, o.process_status,
  COALESCE(o.appointment_at, o.created_at::date)               AS start_date,
  COALESCE(o.appointment_at, o.created_at::date) + 90           AS due_date,
  (COALESCE(o.appointment_at, o.created_at::date) + 90) - CURRENT_DATE AS days_remaining,
  CASE
    WHEN (COALESCE(o.appointment_at, o.created_at::date) + 90) - CURRENT_DATE < 0  THEN 'overdue'
    WHEN (COALESCE(o.appointment_at, o.created_at::date) + 90) - CURRENT_DATE = 0  THEN 'due_today'
    WHEN (COALESCE(o.appointment_at, o.created_at::date) + 90) - CURRENT_DATE <= 14 THEN 'warn'
    ELSE 'normal'
  END AS urgency
FROM public.orders o
WHERE o.deleted_at IS NULL
  AND o.process_status NOT IN ('完成','已取件','已取消');
```

- GRANT SELECT TO anon（與現有 anon 讀取一致）。
- 含 smoke test（DO $$ 驗 VIEW 存在）。

### P2 — Dashboard 視覺標記（`freehandsss_dashboardV42.html`）

- 訂單總覽每列加倒數徽章，讀 P1 VIEW（或前端以已載入的 appointment/created 直算，二擇一，優先讀 VIEW 保持單一真理）。
- 文案：`逾期 N 天` / `今日到期` / `剩 N 天`。
- 硬規則守護：**不改任何 HTML ID、不碰 captureFormState、不污染 raw_form_state**。純展示層 append。
- 桌面 + 手機兩視圖。
- code-reviewer G1–G8 Gate 把關。

### P3 — n8n Telegram 每日推送（新獨立 workflow）

- 仿 Anti-Idle Ping（Session 67，workflow `FxKHTDiYiUPnxvm6`）架構。
- Schedule Trigger：每日 09:00 HKT = `0 1 * * *` UTC。
- HTTP GET Supabase REST：`v_delivery_reminders?urgency=in.(overdue,due_today,warn)&order=days_remaining.asc`。
- Code/Set 節點格式化（逾期置頂）→ Telegram send，chat `7620524971`。
- 空清單時可選擇靜默（不推）或推「今日無到期」。

---

## 4. Rollback

| 元件 | 回滾 |
|------|------|
| P1 VIEW | `DROP VIEW v_delivery_reminders`（純讀，無資料風險）|
| P2 Dashboard | git revert 對應 commit（current.html 不動，僅 V42）|
| P3 n8n | 停用/刪除 workflow（獨立，不影響主流程）|

---

## 5. 上線前置（Fat Mo 手動）

1. 批次清理：把已交付舊單 `process_status` 改為「已取件」，消除 14 張逾期洗版。
2. /execute 授權後依 P1→P2→P3 順序實作。