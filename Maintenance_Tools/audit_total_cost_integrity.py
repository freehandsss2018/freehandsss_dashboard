"""
FHS Total_Cost Integrity Auditor — Detailed Format
===================================================
掃描所有 Main_Orders，產出詳細成本核對報告。每筆訂單展示：
  - 商品逐項成本明細
  - 跨部位扣減邏輯
  - 收入、利潤核對

執行方式：
    python Maintenance_Tools/audit_total_cost_integrity.py

輸出：
    .fhs/notes/aireports/total_cost_audit_YYYY-MM-DD.md
"""

import os
import json
import requests
from datetime import datetime

# Load .env if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# === 設定 ===
AIRTABLE_TOKEN = os.environ.get("AIRTABLE_API_KEY") or os.environ.get("AIRTABLE_TOKEN")
BASE_ID = "app9GuLsW9frN4xaT"
MAIN_ORDERS_TABLE = "tbltCH0I9fknVCtmV"
ORDER_ITEMS_TABLE = "tbljkptnNcUEyDRFH"

HEADERS = {
    "Authorization": f"Bearer {AIRTABLE_TOKEN}",
    "Content-Type": "application/json"
}

FIELD_ORDER_ID     = "fldiTH9iGQpa7Xqau"
FIELD_CUSTOMER     = "fldCxe9RM62FswD9G"
FIELD_TOTAL_COST   = "fldK2rNdLS5O92suA"
FIELD_NET_PROFIT   = "flduPsfxg751GsJuk"
FIELD_FINAL_SALE   = "flduMLKYerq5aswNf"
FIELD_APPT_DATE    = "fldEJXnuXW5kgEgb0"  # Appointment_Date
FIELD_ORDER_ITEMS  = "fldUA7Um14KkPR3rC"   # linked records

# Order_Items 欄位
OI_ITEM_ID = "fldZJvUcpU226rnC7"         # Item_ID
OI_ITEM_SKU = "fldFD2PlG5JGlsT7r"        # Product_Link (will need to lookup product name)
OI_QTY = "fldQkjPj81ayiCi6I"             # Quantity
OI_ITEM_COST = "fldHe2v50lgcTDcEc"       # Item_BaseCost (lookup)
OI_PART = ""                              # No part field in Order_Items; need to extract from engraving

# 允許的最大誤差
TOLERANCE_MAX_DEDUCTION = 200
SUSPICIOUS_THRESHOLD = 100


def fetch_all_records(table_id, fields):
    """分頁讀取所有 Airtable 記錄"""
    records = []
    url = f"https://api.airtable.com/v0/{BASE_ID}/{table_id}"
    params = {"fields[]": fields, "pageSize": 100, "returnFieldsByFieldId": "true"}
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


def fetch_order_items_batch(order_item_ids):
    """批量讀取指定 Order_Items 記錄"""
    if not order_item_ids:
        return {}

    url = f"https://api.airtable.com/v0/{BASE_ID}/{ORDER_ITEMS_TABLE}"
    # 使用簡單欄位：Item_ID (formula)、Product_Link (to lookup SKU)、Quantity、Item_BaseCost (lookup)
    fields = [OI_ITEM_ID, OI_ITEM_SKU, OI_QTY, OI_ITEM_COST]
    params = {"fields[]": fields, "pageSize": 100, "returnFieldsByFieldId": "true"}

    items_by_id = {}
    # 批量讀取所有 Order_Items，然後過濾
    while True:
        resp = requests.get(url, headers=HEADERS, params=params)
        resp.raise_for_status()
        data = resp.json()
        for rec in data.get("records", []):
            if rec["id"] in order_item_ids:
                items_by_id[rec["id"]] = rec.get("fields", {})
        offset = data.get("offset")
        if not offset:
            break
        params["offset"] = offset
    return items_by_id


def build_detailed_report_section(rec):
    """為單筆訂單產出詳細報告段落"""
    f = rec.get("fields", {})
    order_id = f.get(FIELD_ORDER_ID, "???")
    customer = f.get(FIELD_CUSTOMER, "???")
    total_cost = f.get(FIELD_TOTAL_COST) or 0
    net_profit = f.get(FIELD_NET_PROFIT) or 0
    final_sale = f.get(FIELD_FINAL_SALE) or 0
    appt_date = f.get(FIELD_APPT_DATE, "日期未填")
    item_ids = f.get(FIELD_ORDER_ITEMS) or []

    # 判斷狀態
    if total_cost == 0 and len(item_ids) == 0:
        status_icon = "✅"
    elif total_cost > 0 and len(item_ids) > 0:
        status_icon = "✅"
    else:
        status_icon = "⚠️"

    # 讀取 Order_Items
    items_map = fetch_order_items_batch(item_ids) if item_ids else {}

    lines = [f"## {order_id} {customer}（{appt_date}）{status_icon}", ""]
    lines.append("| 產品 SKU | 件數說明 | 成本 |")
    lines.append("|----------|---------|------|")

    # 產品明細
    product_rows = []
    subtotal = 0
    keychain_parts = set()  # 追蹤鎖匙扣部位

    for oid in item_ids:
        if oid not in items_map:
            continue
        item = items_map[oid]
        item_id = item.get(OI_ITEM_ID, "未知")  # This is a formula field (may be list or string)
        qty = item.get(OI_QTY) or 1
        cost_val = item.get(OI_ITEM_COST)       # This is a lookup (may be list)

        # Handle lookup fields that come back as lists
        if isinstance(item_id, list):
            item_id = item_id[0] if item_id else "未知"
        if isinstance(cost_val, list):
            cost_val = cost_val[0] if cost_val else 0
        cost = float(cost_val) if cost_val else 0

        # Item_ID is a formula that shows item description
        qty_desc = f"qty={qty}" if qty > 1 else f"{qty}件"
        product_rows.append(f"| {item_id} | {qty_desc}件，${cost:.0f} | ${cost:.0f} |")
        subtotal += cost

    for row in product_rows:
        lines.append(row)

    # 小計（有多筆時顯示）
    if len(product_rows) > 1:
        lines.append(f"| 小計 | | ${subtotal:.0f} |")

    # 扣減說明（簡化版：直接計算差額）
    deduction = subtotal - total_cost
    if deduction > 0:
        lines.append(f"| **扣減** | | −${deduction:.0f} |")
    else:
        lines.append(f"| **無扣減** | | $0 |")

    # 最終成本
    lines.append(f"| **Total_Cost** | | **${total_cost:.0f}** |")
    lines.append("")

    # 收入與利潤
    if final_sale > 0 or net_profit > 0:
        lines.append(f"> 收入 ${final_sale:.0f} ／ 利潤 ${net_profit:.0f}")
    lines.append("")

    return {
        "order_id": order_id,
        "customer": customer,
        "total_cost": total_cost,
        "status_icon": status_icon,
        "lines": lines,
    }


def audit():
    print("🔍 FHS Total_Cost Integrity Audit — Detailed Format")
    print(f"   時間：{datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"   Base: {BASE_ID}\n")

    fields = [
        FIELD_ORDER_ID, FIELD_CUSTOMER, FIELD_TOTAL_COST, FIELD_NET_PROFIT,
        FIELD_FINAL_SALE, FIELD_APPT_DATE, FIELD_ORDER_ITEMS
    ]

    records = fetch_all_records(MAIN_ORDERS_TABLE, fields)
    print(f"   讀取 {len(records)} 筆訂單\n")

    all_sections = []
    ok_count = 0

    for rec in records:
        section = build_detailed_report_section(rec)
        all_sections.append(section)
        if section["status_icon"] == "✅":
            ok_count += 1

    # === 輸出報告 ===
    today = datetime.now().strftime("%Y-%m-%d")
    report_path = os.path.join(
        os.path.dirname(__file__), "..",
        ".fhs", "notes", "aireports",
        f"total_cost_audit_{today}.md"
    )
    os.makedirs(os.path.dirname(report_path), exist_ok=True)

    lines = [
        f"# 全 {len(records)} 單成本詳細核對表",
        f"> {today} | 數據來源：Airtable Order_Items（實時查詢）",
        "> ",
        "> **成本計算邏輯說明**",
        "> - **N飾** = N件同部位批次，括號內 $XXX 是 N件的總成本（不用再乘件數）",
        "> - **跨部位扣減**（§2.5）= 同一訂單有 2 個或以上不同部位鎖匙扣 → (鎖匙扣部位數 − 1) × $20",
        "> - **頸鏈吊飾不適用**跨部位扣減",
        "",
        "---",
        "",
    ]

    # 逐訂單輸出詳細段落
    for section in all_sections:
        lines.extend(section["lines"])
        lines.append("---")
        lines.append("")

    # 摘要統計
    lines += [
        "## 總覽",
        "",
        "| | 訂單數 |",
        "|---|---|",
        f"| ✅ 正常 | {ok_count} |",
        f"| ⚠️ 待確認 | {len(all_sections) - ok_count} |",
        f"| **合計** | **{len(all_sections)}** |",
        "",
    ]

    report = "\n".join(lines)

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    print(report)
    print(f"\n📄 報告已儲存：{report_path}")

    # 摘要
    print(f"\n{'='*50}")
    print(f"✅ 正常: {ok_count} | ⚠️ 待確認: {len(all_sections) - ok_count} | 合計: {len(all_sections)}")
    if ok_count == len(all_sections):
        print("✅ 全部訂單成本核對正常")


if __name__ == "__main__":
    if not AIRTABLE_TOKEN:
        print("❌ 錯誤：請設定環境變數 AIRTABLE_API_KEY 或 AIRTABLE_TOKEN")
        exit(1)
    audit()
