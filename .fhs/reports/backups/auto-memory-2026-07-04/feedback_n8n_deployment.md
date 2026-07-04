---
name: n8n-deployment-rules
description: "Critical rules for deploying changes to n8n workflows — API PUT method, never Import From File, Windows curl UTF-8 workaround"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3654db32-4424-4bd7-a227-95b73514c0d8
---

1. **NEVER use n8n "Import From File"** — it creates a new workflow + new Webhook URL, breaking all Dashboard connections.
   **Why:** User explicitly prohibited this after near-miss that would have orphaned the production webhook.
   **How to apply:** Always modify code in n8n editor directly, or use API PUT to update in-place.

2. **n8n API PUT must clean payload** — remove `active` (read-only), `issues` on nodes, and non-standard settings (`availableInMCP`, `binaryMode`) before PUT, or you get HTTP 400.
   **Why:** Discovered during V45.7.4 deployment — 3 consecutive 400 errors before identifying all fields to strip.
   **How to apply:** After GET workflow JSON, run cleanup before PUT.

3. **Windows curl + Chinese = use file, not inline** — write JSON to UTF-8 file with Python, then `curl -d @file.json`. Inline `-d '{...中文...}'` corrupts to U+FFFD on Windows cp950.
   **Why:** All V45.7.4 test webhook calls returned Cost=$0 until this was discovered via hex dump.
   **How to apply:** Any time sending Chinese characters to n8n webhook from Windows terminal.

4. **n8n Code Node v2 (runOnceForAllItems) must return `[{json: {...}}]`** — bare objects cause silent downstream failures (Switch/IF nodes receive `undefined`).
   **Why:** Root cause of every order triggering false Telegram alarm in V45.7.4 incident.
   **How to apply:** Check return format whenever editing any Code node in n8n.

5. **Never overwrite production with local JSON** — local `FHS_Core_OrderProcessor.json` may be outdated (e.g., 23 nodes vs production 24 nodes).
   **Why:** Local file was missing Pack Telegram Data node; deploying it would have broken Telegram reports.
   **How to apply:** Always GET current production state first via API, modify, then PUT back.

6. **GET→PUT surgical fix: strip down to 4 core fields only** — n8n PUT /workflows/:id returns HTTP 400 "must NOT have additional properties" if the body contains server-managed fields from the GET response.
   **Why:** S121 — tried to PUT the raw GET response, got 400. Only `{name, nodes, connections, settings}` are accepted. Fields like `active`, `versionId`, `isArchived`, `shared`, `triggerCount`, `activeVersion`, `description` all cause rejection.
   **How to apply:** After GET, build PUT body as `{k: v for k, v in data if k in {'name','nodes','connections','settings'}}`.

7. **build_n8n_workflow.cjs requires .env loaded** — `process.env.SUPABASE_URL/SUPABASE_ANON_KEY` are undefined if .env is not loaded; string concat `"undefined" + "/rest/v1/"` gets silently embedded in workflow JSON.
   **Why:** S121 — v3 first Cron (Exec 4009) failed because Fetch Orders URL = "undefined/rest/v1/..."; root cause was S117 build ran without .env in process.env.
   **How to apply:** Build script now auto-loads `.env` on startup (6-line loader added S121). When running build script, verify SUPABASE_URL is not undefined before deploy.
