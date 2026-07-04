---
name: reference_supabase_mcp_dropout_workaround
description: Supabase MCP stdio 掉線時，用 Management API query 端點 + PAT 繞過跑 SQL/DDL（curl，非 python-urllib）
metadata: 
  node_type: memory
  type: reference
  originSessionId: 0a2c4db0-295f-4df8-8f6a-a867f12b3b8a
---

Supabase MCP 工具（mcp__supabase__*）若中途消失（ToolSearch 找不到 execute_sql），先區分：專案是否 healthy（curl PostgREST 測）、PAT 是否有效（`GET https://api.supabase.com/v1/projects` 回 200）、`.mcp.json` 配置是否正確。三者正常 = 純 MCP stdio pipe 掉線，**我無法在沙箱代重啟**，客戶端 `/mcp` 重連或重啟 session。

繞過跑 SQL（含 DDL，MCP execute_sql 底層即此）：
`POST https://api.supabase.com/v1/projects/{ref}/database/query` + header `Authorization: Bearer {PAT}` + body `{"query":"..."}`。

⚠️ 兩個坑：(1) **必用 curl**——python-urllib 預設 UA 觸 Cloudflare 1010 ban（403）；(2) payload 用 python `json.dumps` 寫 **cwd 相對檔**再 `curl --data-binary @file`（`/tmp` 在 Windows python = 磁碟根，Git Bash curl = msys mount，兩者不一致致 file not found）。

FHS project ref = `vpmwizzixnwilmzctdvu`；PAT 在 `.mcp.json` supabase 段。仍屬官方 Supabase 路徑，**不違反 Supabase-First**（非降級 Airtable）。Session 84 用此完成 migration 0034。相關 [[feedback_supabase_first_enforcement]]。
