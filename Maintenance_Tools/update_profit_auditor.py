#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Update Profit Auditor in FHS_Core_OrderProcessor.json to Anti-Loss logic (V45.8)"""

import json, sys

JSON_PATH = "n8n/FHS_Core_OrderProcessor.json"

NEW_CODE = (
    "// Profit Auditor V45.8 - Anti-Loss Guard\n"
    "// Business logic: Ling Au sets prices manually; system price is reference only.\n"
    "// Audit purpose: only alert if actual collected < system cost (selling at a loss)\n"
    'const body = $("Receive Dashboard Order").first().json.body || $("Receive Dashboard Order").first().json;\n'
    "\n"
    "const deposit       = Number(body.Deposit)           || 0;\n"
    "const balance       = Number(body.Balance)           || 0;\n"
    "const additionalFee = Number(body.Additional_Fee)    || 0;\n"
    "const actualTotal   = deposit + balance + additionalFee;\n"
    "const systemCost    = Number(body.System_Total_Cost) || 0;\n"
    "\n"
    "let auditResults = {\n"
    "    auditPassed: true,\n"
    "    systemCost:  systemCost,\n"
    "    actualTotal: actualTotal,\n"
    "    discrepancy: 0,\n"
    "    reasons:     [],\n"
    '    orderId:     body.Order_ID      || "Unknown",\n'
    '    customer:    body.Customer_Name || "Unknown",\n'
    '    role:        body.Role          || "ling"\n'
    "};\n"
    "\n"
    "// Only audit when both values are meaningful (skip if no payment entered yet)\n"
    "if (actualTotal > 0 && systemCost > 0) {\n"
    "    if (actualTotal < systemCost) {\n"
    "        const diff = systemCost - actualTotal;\n"
    "        auditResults.auditPassed = false;\n"
    "        auditResults.discrepancy = diff;\n"
    "        auditResults.reasons.push(`At-a-loss alert: collected $${actualTotal}, cost $${systemCost}, gap $${diff}`);\n"
    "    }\n"
    "}\n"
    "\n"
    "return [{ json: auditResults }];"
)

with open(JSON_PATH, encoding="utf-8") as f:
    data = json.load(f)

patched = 0

# Patch nodes array
for node in data.get("nodes", []):
    if node.get("name") == "Profit Auditor" and node.get("type") == "n8n-nodes-base.code":
        node["parameters"]["jsCode"] = NEW_CODE
        patched += 1

# Patch activeVersion.nodes array
for node in data.get("activeVersion", {}).get("nodes", []):
    if node.get("name") == "Profit Auditor" and node.get("type") == "n8n-nodes-base.code":
        node["parameters"]["jsCode"] = NEW_CODE
        patched += 1

if patched == 0:
    print("ERROR: Profit Auditor node not found!", file=sys.stderr)
    sys.exit(1)

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"OK: patched {patched} Profit Auditor node(s)")
