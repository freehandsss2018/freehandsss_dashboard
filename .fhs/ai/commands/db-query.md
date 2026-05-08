# db-query — 唯讀資料庫查詢指南

> **Master 定義**。橋接版位於 `.claude/commands/db-query.md`。

**技能來源**：`.fhs/ai/skills/vendor/awesome-cc/read-only-postgres.md`

---

## 用途

安全的唯讀 PostgreSQL / Supabase 查詢。適用於遷移驗證、財務對帳、n8n Debug，不會修改任何數據。

## 執行步驟

收到 `/db-query` 後，立即讀取並嚴格遵循：
[.fhs/ai/skills/vendor/awesome-cc/read-only-postgres.md](.fhs/ai/skills/vendor/awesome-cc/read-only-postgres.md)

## FHS 使用場景

- **Supabase 遷移前驗證** (P-HIGH handoff #2) — 比對 schema、row count、data integrity
- **財務對帳** — 查詢 Supabase 財務數據，與 Airtable 對比
- **n8n Debug** — 確認 workflow 寫入是否正確

## 安全保證

- 所有 INSERT/UPDATE/DELETE/DROP 操作均被封鎖
- 最多回傳 10,000 行
- 30 秒 timeout
- PII 自動遮罩

## 使用前置

需要先完成 Setup（安裝 Python deps + 設定 connections.json）。  
詳見 Master 技能定義的 Setup Requirements 章節。
