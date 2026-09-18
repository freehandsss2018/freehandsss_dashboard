"""
FHS Product Price Completeness Auditor（P1-4，取代 PRICE_AUDIT 舊實作 generate_fix_payload.py）
版本: V1.0.0（2026-09-18，cl-flow 2026-09-18-1827 期一）
用途: 查詢 Supabase products.suggested_price 空白記錄（真源已由 Airtable
      Product_Database.Suggested_Price_Manual 轉移至 Supabase，見
      supabase/migrations/0001_initial_schema.sql:77,112）。

排除規則: sku LIKE '%(V2)' 的 26 個統一 SKU 按設計無 suggested_price
          （由 calculatePricing() 按位置動態定價，非漏填）——沿用
          supabase/migrations/0074_exclude_v2_skus_from_legacy_drift_monitor.sql
          的既有排除先例，非本腳本新發明的判準。

執行: python Maintenance_Tools/audit_price_completeness.py

例外登記: .fhs/tools/check_registry.json 的 known_exceptions（check="PRICE_COMPLETENESS"，rule="C5"）。
"""

import urllib.request
import urllib.error
import json
import os
import sys
from datetime import date

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRY_PATH = os.path.join(REPO_ROOT, ".fhs", "tools", "check_registry.json")
CHECK_NAME = "PRICE_COMPLETENESS"


def load_env():
    env_path = os.path.join(REPO_ROOT, ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())


def load_known_exceptions():
    if not os.path.exists(REGISTRY_PATH):
        print(f"[WARN] 例外登記冊不存在：{REGISTRY_PATH}（所有違規視為未登記）")
        return {}
    try:
        with open(REGISTRY_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        print(f"[ERROR] 例外登記冊 JSON 損壞：{e}（fail-closed，所有違規視為未登記）")
        return {}
    result = {}
    for ex in data.get("known_exceptions", []):
        if ex.get("check") != CHECK_NAME:
            continue
        rule, key, expires = ex.get("rule"), ex.get("key"), ex.get("expires")
        if not all([rule, key, expires, ex.get("reason"), ex.get("approved_by"), ex.get("registered")]):
            print(f"[WARN] 例外登記缺欄位，視為未登記：{ex}")
            continue
        result[(rule, key)] = expires
    return result


def is_expired(expires_str):
    try:
        y, m, d = (int(x) for x in expires_str.split("-"))
        return date.today() > date(y, m, d)
    except (ValueError, AttributeError):
        return True


def classify_violation(rule, key, exceptions):
    expires = exceptions.get((rule, key))
    if expires is None:
        return True, "VIOLATION（未登記）"
    if is_expired(expires):
        return True, f"VIOLATION（例外已於 {expires} 過期）"
    return False, f"KNOWN EXCEPTION（有效至 {expires}）"


def fetch_json(url, headers, timeout=20):
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[ERROR] Supabase API 回應 {e.code}: {body[:300]}")
        sys.exit(2)
    except urllib.error.URLError as e:
        print(f"[ERROR] Supabase 連線失敗：{e}")
        sys.exit(2)


def main():
    load_env()
    exceptions = load_known_exceptions()

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        print("[ERROR] SUPABASE_URL / SUPABASE_ANON_KEY 未設定，無法執行 PRICE_COMPLETENESS 稽核。")
        sys.exit(2)

    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"}

    # 反靜默閘：先確認 products 表整體有回應（非空），排除 RLS 靜默 200+0 rows
    total_url = f"{supabase_url}/rest/v1/products?select=sku"
    all_products = fetch_json(total_url, headers)
    if not isinstance(all_products, list) or len(all_products) == 0:
        print("[ERROR] 讀到 0 個產品——反靜默閘觸發：FAIL（非「產品表本身是空」的真陽性）。")
        sys.exit(1)

    print(f"[PRICE_COMPLETENESS] products 總數 {len(all_products)}，查詢空白售價（排除 (V2) SKU）...")

    # 注意：雙引號包裹規則（learnings/supabase.md Pitfall #1）只適用於 or=(...)/and=(...)
    # 組合語法內嵌入嘅 `column.operator.value` 字串；呢度用緊頂層查詢參數
    # `sku=not.like.value` 形式，唔可以加雙引號（2026-09-18 實測：加咗會令 PostgREST
    # 把整個 `"*(V2)"` 當字面樣式比對，永遠比對唔中任何 SKU，變成「排除條件冇效」）。
    null_price_url = (
        f"{supabase_url}/rest/v1/products"
        "?select=sku,total_base_cost&suggested_price=is.null&sku=not.like.*(V2)"
    )
    null_price_rows = fetch_json(null_price_url, headers)

    if not isinstance(null_price_rows, list):
        print("[ERROR] 空白售價查詢回應格式異常（非陣列）：FAIL。")
        sys.exit(1)

    total_violations = 0
    for row in null_price_rows:
        sku = row.get("sku", "?")
        blocking, label = classify_violation("C5", sku, exceptions)
        print(f"   [{label}] C5 產品 {sku}：suggested_price 為 NULL（total_base_cost=${row.get('total_base_cost')}）")
        if blocking:
            total_violations += 1

    if total_violations > 0:
        print(f"\n[PRICE_COMPLETENESS] 🔴 {total_violations} 項未登記/已過期空白售價，FAIL。")
        sys.exit(1)

    print(f"[PRICE_COMPLETENESS] ✅ 無未登記空白售價（(V2) SKU 已按設計排除，見 migration 0074 先例）。")
    sys.exit(0)


if __name__ == "__main__":
    main()
