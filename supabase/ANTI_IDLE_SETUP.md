# Supabase Anti-Idle Setup
**目的**：防止 Supabase Free Tier 7 天無活動自動暫停
**AGENTS.md §4**：防閒置強制 — 必須維持每 6 天定時 ping

## ✅ 已部署（2026-06-07）

| 項目 | 值 |
|------|-----|
| Workflow 名稱 | `FHS_Anti_Idle_Ping` |
| Workflow ID | `FxKHTDiYiUPnxvm6` |
| 狀態 | ACTIVE |
| 排程 | `0 1 */5 * *`（每 5 天 01:00 UTC） |
| Telegram Chat ID | `7620524971` |
| Supabase 端點 | `products?select=id&limit=1` |

---

## 方法一：n8n Schedule Trigger（推薦）

在 n8n 新增一個獨立 workflow，每 6 天自動 ping Supabase。

### Workflow 結構

```
[Schedule Trigger] → [HTTP Request: Supabase Ping] → [IF: Error?] → [Telegram Alert]
```

### Schedule Trigger 設定
- Mode: `Cron`
- Cron Expression: `0 9 */6 * *` (每 6 天早上 9:00 UTC+8)

### HTTP Request 設定（Supabase Ping）
- Method: `GET`
- URL: `{{ $env.SUPABASE_URL }}/rest/v1/products?select=id&limit=1`
- Headers:
  - `apikey`: `{{ $env.SUPABASE_ANON_KEY }}`
  - `Authorization`: `Bearer {{ $env.SUPABASE_ANON_KEY }}`

### 預期結果
- 成功：返回 1 筆 product 記錄（HTTP 200）
- 失敗（項目暫停）：HTTP 503 → Telegram 告警

---

## 方法二：Vercel / GitHub Actions（備用）

若 n8n 本身也不活躍，可用免費 GitHub Actions cron：

```yaml
# .github/workflows/supabase-ping.yml
name: Supabase Anti-Idle Ping
on:
  schedule:
    - cron: '0 1 */6 * *'  # every 6 days at 01:00 UTC
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: |
          curl -f "${{ secrets.SUPABASE_URL }}/rest/v1/products?select=id&limit=1" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

GitHub Secrets 需設定：`SUPABASE_URL`, `SUPABASE_ANON_KEY`

---

## 手動測試 ping

```bash
curl "$SUPABASE_URL/rest/v1/products?select=id&limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

返回 `[]` 或 `[{"id":"..."}]` = 正常（project 活躍中）
返回 503 或 timeout = project 已暫停，需登入 Supabase Dashboard 手動恢復

---

## Error Logs TTL（pg_cron 設定）

在 Supabase SQL Editor 執行（需先到 Database > Extensions 啟用 pg_cron）：

```sql
SELECT cron.schedule(
  'delete-old-error-logs',
  '0 3 * * *',
  $$DELETE FROM error_logs WHERE occurred_at < NOW() - INTERVAL '30 days'$$
);
```

⚠️ 注意：pg_cron 在 project 暫停時也會暫停。恢復後會繼續執行，但暫停期間的清理不會補跑。
