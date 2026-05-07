"""
FHS Total_Cost Integrity Auditor
=================================
掃描所有 Main_Orders，偵測 Total_Cost 與 Order_Items rollup 之間的異常差距。

執行方式：
    python Maintenance_Tools/audit_total_cost_integrity.py

輸出：
    .fhs/notes/aireports/total_cost_audit_YYYY-MM-DD.md
"""

import os
import json
import requests
from datetime import datetime

# === 設定 ===
AIRTABLE_TOKEN = os.environ.get("AIRTABLE_API_KEY") or os.environ.get("AIRTABLE_TOKEN")
BASE_ID = "app9GuLsW9frN4xaT"
MAIN_ORDERS_TABLE = "tbltCH0I9fknVCtmV"

HEADERS = {
    "Authorization": f"Bearer {AIRTABLE_TOKEN}",
    "Content-Type": "application/json"
}

FIELD_ORDER_ID     = "fldiTH9iGQpa7Xqau"
FIELD_CUSTOMER     = "fldCxe9RM62FswD9G"
FIELD_TOTAL_COST   = "fldK2rNdLS5O92suA"
FIELD_NET_PROFIT   = "flduPsfxg751GsJuk"
FIELD_FINAL_SALE   = "flduMLKYerq5aswNf"
FIELD_KEYCHAIN     = "flda10EwN6V6ecKi1"   # rollup
FIELD_HANDMODEL    = "fldnNDzUvWy2mNCX9"   # rollup
FIELD_NECKLACE     = "fldm4GXOs5dwryOZt"   # rollup
FIELD_ORDER_ITEMS  = "fldUA7Um14KkPR3rC"   # linked records

# 允許的最大誤差（跨部位扣減最大為 (N-1)×$20，保守設定 $200 以容納 10 個部位）
TOLERANCE_MAX_DEDUCTION = 200
# 誤差超過此值視為 SUSPICIOUS（可能漏算）
SUSPICIOUS_THRESHOLD = 100


def fetch_all_records(table_id, fields):
    """分頁讀取所有 Airtable 記錄"""
    records = []
    url = f"https://api.airtable.com/v0/{BASE_ID}/{table_id}"
    params = {"fields[]": fields, "pageSize": 100}
    while True:
        resp = requests.get(url, headers=HEADERS, params=params)
        resp.raise_for_status()
        data = resp.json()
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
        params["offset"] = offset
    return records


def audit():
    print("🔍 FHS Total_Cost Integrity Audit")
    print(f"   時間：{datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"   Base: {BASE_ID}\n")

    fields = [
        FIELD_ORDER_ID, FIELD_CUSTOMER, FIELD_TOTAL_COST, FIELD_NET_PROFIT,
        FIELD_FINAL_SALE, FIELD_KEYCHAIN, FIELD_HANDMODEL, FIELD_NECKLACE,
        FIELD_ORDER_ITEMS
    ]

    records = fetch_all_records(MAIN_ORDERS_TABLE, fields)
    print(f"   讀取 {len(records)} 筆訂單\n")

    results = []

    for rec in records:
        f = rec.get("cellValuesByFieldId", {})
        order_id   = f.get(FIELD_ORDER_ID, "???")
        customer   = f.get(FIELD_CUSTOMER, "???")
        total_cost = f.get(FIELD_TOTAL_COST) or 0
        net_profit = f.get(FIELD_NET_PROFIT) or 0
        final_sale = f.get(FIELD_FINAL_SALE) or 0
        keychain   = f.get(FIELD_KEYCHAIN) or 0
        handmodel  = f.get(FIELD_HANDMODEL) or 0
        necklace   = f.get(FIELD_NECKLACE) or 0
        items_count = len(f.get(FIELD_ORDER_ITEMS) or [])

        raw_sum = keychain + handmodel + necklace
        deduction = raw_sum - total_cost   # 正數 = 系統扣減了錢（正常）

        # 判斷狀態
        if raw_sum == 0 and total_cost == 0:
            status = "✅ 無成本訂單"
        elif deduction < -SUSPICIOUS_THRESHOLD:
            # Total_Cost > rawSum → 不可能（成本比各項加總還多）
            status = "❌ CRITICAL: Total_Cost 異常偏高"
        elif deduction > TOLERANCE_MAX_DEDUCTION:
            # 扣減超過合理範圍
            status = "⚠️  WARN: 扣減異常偏大"
        elif raw_sum > 0 and total_cost == 0:
            status = "❌ CRITICAL: Total_Cost=0 但有產品成本"
        elif raw_sum > total_cost + SUSPICIOUS_THRESHOLD and deduction > TOLERANCE_MAX_DEDUCTION:
            status = "⚠️  SUSPICIOUS: 差距過大"
        elif abs(deduction) <= TOLERANCE_MAX_DEDUCTION and deduction >= 0:
            status = "✅ 正常"
        else:
            status = "⚠️  WARN: 需人工確認"

        # 利潤核對
        expected_profit = final_sale - total_cost
        profit_diff = net_profit - expected_profit
        if abs(profit_diff) > 1:
            profit_note = f"⚠️ 利潤差 ${profit_diff:+.0f}"
        else:
            profit_note = ""

        results.append({
            "order_id": order_id,
            "customer": customer,
            "total_cost": total_cost,
            "raw_sum": raw_sum,
            "deduction": deduction,
            "keychain": keychain,
            "handmodel": handmodel,
            "necklace": necklace,
            "net_profit": net_profit,
            "expected_profit": expected_profit,
            "profit_note": profit_note,
            "items_count": items_count,
            "status": status,
        })

    # 分類
    critical = [r for r in results if "CRITICAL" in r["status"]]
    warnings  = [r for r in results if "WARN" in r["status"] or "SUSPICIOUS" in r["status"]]
    ok        = [r for r in results if "✅" in r["status"]]

    # === 輸出報告 ===
    today = datetime.now().strftime("%Y-%m-%d")
    report_path = os.path.join(
        os.path.dirname(__file__), "..",
        ".fhs", "notes", "aireports",
        f"total_cost_audit_{today}.md"
    )
    os.makedirs(os.path.dirname(report_path), exist_ok=True)

    lines = [
        f"# FHS Total_Cost Integrity Audit — {today}",
        f"> 掃描 {len(records)} 筆訂單 | {len(critical)} Critical | {len(warnings)} Warning | {len(ok)} OK",
        "",
    ]

    if critical:
        lines += ["## ❌ CRITICAL（需立即修正）", ""]
        lines += ["| 訂單 | 客人 | Total_Cost | rawSum | 差額 | 備註 |", "|------|------|-----------|--------|------|------|"]
        for r in critical:
            diff = r['raw_sum'] - r['total_cost']
            lines.append(
                f"| {r['order_id']} | {r['customer']} | ${r['total_cost']} | "
                f"${r['raw_sum']} | ${diff:+.0f} | {r['profit_note']} |"
            )
        lines.append("")

    if warnings:
        lines += ["## ⚠️ WARN / SUSPICIOUS（建議人工確認）", ""]
        lines += ["| 訂單 | 客人 | Total_Cost | rawSum | 扣減 | 狀態 |", "|------|------|-----------|--------|------|------|"]
        for r in warnings:
            lines.append(
                f"| {r['order_id']} | {r['customer']} | ${r['total_cost']} | "
                f"${r['raw_sum']} | ${r['deduction']:+.0f} | {r['status']} |"
            )
        lines.append("")

    lines += ["## ✅ 正常訂單", ""]
    lines += ["| 訂單 | 客人 | Total_Cost | Keychain | Handmodel | Necklace | 扣減 |",
              "|------|------|-----------|---------|----------|---------|------|"]
    for r in ok:
        lines.append(
            f"| {r['order_id']} | {r['customer']} | ${r['total_cost']} | "
            f"${r['keychain']} | ${r['handmodel']} | ${r['necklace']} | ${r['deduction']:+.0f} |"
        )

    report = "\n".join(lines)

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(report)
    print(f"\n📄 報告已儲存：{report_path}")

    # 摘要
    print(f"\n{'='*50}")
    print(f"CRITICAL: {len(critical)} | WARNING: {len(warnings)} | OK: {len(ok)}")
    if not critical and not warnings:
        print("✅ 全部訂單成本核對正常")


if __name__ == "__main__":
    if not AIRTABLE_TOKEN:
        print("❌ 錯誤：請設定環境變數 AIRTABLE_API_KEY 或 AIRTABLE_TOKEN")
        exit(1)
    audit()
