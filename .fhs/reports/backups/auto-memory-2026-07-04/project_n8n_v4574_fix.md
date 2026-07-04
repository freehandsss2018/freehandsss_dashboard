---
name: n8n V45.7.4 SKU Fix Deployed
description: FHS_Core_OrderProcessor workflow fixed - Profit Auditor return format and SKU normalization deployed to production via API
type: project
---

V45.7.4 deployed to production n8n (2026-03-26).

**Bugs fixed:**
1. Profit Auditor returned bare object instead of `[{json:...}]` — caused Auditor Logic Switch to always fire false alarm
2. Parse Items SKU normalization expanded to match all 木框/玻璃瓶 variants (not just 木框套裝)
3. Added `body.Items` fallback alongside `body.Order_Items_List` for test compatibility

**Why:** Order #0695346 triggered false Telegram alarm and showed cost=$0 because Airtable SKU lookup returned empty.

**How to apply:** n8n workflow is at https://yanhei.synology.me:8443/workflow/6Ljih0hSKr9RpYNm (24 nodes). Use API PUT with `X-N8N-API-KEY` header to deploy changes. Remove `active`, `issues`, and non-standard `settings` fields before PUT. Always write test payloads to a UTF-8 file and use `curl -d @file.json` — inline curl on Windows corrupts Chinese characters.

**Airtable Product_Database confirmed SKU formats:**
- `木框套裝 (4肢)` → recOL57agO90lHx3C (Cost: $210)
- `木框套裝 (2肢)` → recuqpoMH6BX4uYaH (Cost: $210)
- `玻璃瓶套裝 (4肢)` → rechzcU1GJkCiiQMG (Cost: $210)
- `嬰兒鎖匙扣 - 不銹鋼 - {N}飾 (加購/單購)` — various records
- `嬰兒吊飾 - 925銀/925金 - {N}飾 (加購/單購)` — various records
