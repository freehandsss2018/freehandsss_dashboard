"""
FHS Price Audit — Auto-Fix Payload Generator
版本: V45.7.4
用途: 查詢 Airtable Product_Database，找出 Suggested_Price_Manual 為空的記錄，
      生成可直接 PATCH 的 Airtable Update Payload JSON 檔案。

執行: python Maintenance_Tools/generate_fix_payload.py
輸出: Maintenance_Tools/fix_payloads/fix_empty_prices_YYYYMMDD_HHMMSS.json

修復指令（填完價格後執行）:
  curl -X PATCH "https://api.airtable.com/v0/app9GuLsW9frN4xaT/tblC3HDJAz9W0OF6R" \
    -H "Authorization: Bearer $AIRTABLE_API_KEY" \
    -H "Content-Type: application/json" \
    -d @fix_payloads/fix_empty_prices_YYYYMMDD_HHMMSS.json
"""

import urllib.request
import urllib.parse
import json
import os
import sys
from datetime import datetime

# ── 強制 UTF-8 輸出以防 Windows CP950 崩潰 ─────────────────────────────────────
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ── 常數 ───────────────────────────────────────────────────────────────────
BASE_ID = "app9GuLsW9frN4xaT"
TABLE_ID = "tblC3HDJAz9W0OF6R"  # Product_Database
AIRTABLE_API = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}"

FIELDS_TO_FETCH = ["Product_Name", "Target_Object", "Main_Category", "Suggested_Price_Manual"]
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fix_payloads")


# ── .env 讀取（不依賴 python-dotenv）──────────────────────────────────────
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            os.environ[key.strip()] = val.strip()


# ── Airtable 分頁查詢 ──────────────────────────────────────────────────────
def fetch_empty_price_records(api_key):
    """回傳所有 Suggested_Price_Manual 為空的 records"""
    all_records = []
    offset = None

    fields_param = "&".join(f"fields[]={urllib.parse.quote(f)}" for f in FIELDS_TO_FETCH)
    filter_formula = urllib.parse.quote("{Suggested_Price_Manual} = BLANK()")

    while True:
        url = f"{AIRTABLE_API}?{fields_param}&filterByFormula={filter_formula}&pageSize=100"
        if offset:
            url += f"&offset={urllib.parse.quote(offset)}"

        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            print(f"[ERROR] Airtable API 回應 {e.code}: {body}")
            sys.exit(2)

        all_records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break

    return all_records


# ── 生成 Payload ────────────────────────────────────────────────────────────
def build_patch_payload(records):
    """
    生成 Airtable PATCH payload。
    Suggested_Price_Manual 留 null，等人工填入後再執行修復指令。
    """
    return {
        "records": [
            {
                "id": rec["id"],
                "fields": {
                    "Suggested_Price_Manual": None  # ← 請填入正確售價
                },
                "_meta": {
                    "Product_Name": rec.get("fields", {}).get("Product_Name", "Unknown"),
                    "Target_Object": rec.get("fields", {}).get("Target_Object", ""),
                    "Main_Category": rec.get("fields", {}).get("Main_Category", ""),
                }
            }
            for rec in records
        ]
    }


# ── 主流程 ──────────────────────────────────────────────────────────────────
def main():
    load_env()

    api_key = os.environ.get("AIRTABLE_API_KEY", "")
    if not api_key:
        print("[ERROR] 找不到 AIRTABLE_API_KEY。請在 .env 設定：AIRTABLE_API_KEY=patXXX...")
        sys.exit(2)

    print("[PRICE_AUDIT] 查詢 Product_Database 空白售價記錄...")
    records = fetch_empty_price_records(api_key)

    if not records:
        print(f"[PRICE_AUDIT] ✅ 無空白售價記錄，Product_Database 定價完整。")
        sys.exit(0)

    # 輸出摘要
    print(f"\n[PRICE_AUDIT] 🔴 發現 {len(records)} 筆空白售價：")
    for rec in records:
        f = rec.get("fields", {})
        print(f"   • {f.get('Product_Name', '—'):<40} 對象: {f.get('Target_Object', '—'):<10} 類別: {f.get('Main_Category', '—')}")

    # 生成 fix payload 檔案
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(OUTPUT_DIR, f"fix_empty_prices_{timestamp}.json")

    payload = build_patch_payload(records)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"\n[PRICE_AUDIT] 📄 Fix Payload 已生成：")
    print(f"   {output_path}")
    print(f"\n修復步驟：")
    print(f"   1. 開啟上方 JSON 檔，將每筆 Suggested_Price_Manual 的 null 填入正確售價")
    print(f"   2. 執行以下指令 PATCH 回 Airtable：")
    print(f"""
   curl -X PATCH "https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}" \\
     -H "Authorization: Bearer $AIRTABLE_API_KEY" \\
     -H "Content-Type: application/json" \\
     -d @"{output_path}"
""")

    sys.exit(1)  # Red Flag: 有空白售價


if __name__ == "__main__":
    main()
