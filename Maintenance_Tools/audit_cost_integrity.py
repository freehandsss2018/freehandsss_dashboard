"""
FHS Order Cost Integrity Auditor（P1-3，取代 /fhs-cost-audit + Airtable audit_total_cost_integrity.py）
版本: V1.0.0（2026-09-18，cl-flow 2026-09-18-1827 期一）
用途: 讀 Supabase（anon key，唯讀），驗證 FHS_Finance_Bible.md §九「財務驗證公式」
      驗證1（成本一致性）、驗證2（利潤正確性）、驗證4後半（SKU 成本完整性）
      + fhs_check_product_cost_drift() RPC 零漂移。

執行: python Maintenance_Tools/audit_cost_integrity.py
公式來源: .fhs/ai/FHS_Finance_Bible.md:395-406 —— 本腳本不得自行推導成本組成，
          任何公式改動須先改該檔並同步本腳本註解引用行號。

例外登記: .fhs/tools/check_registry.json 的 known_exceptions（check="COST_INTEGRITY"）。
          已登記且未過期 = 印 [KNOWN EXCEPTION]，不計入 exit code；
          未登記或已過期 = 印 [VIOLATION]，計入 exit code 1。
"""

import urllib.request
import urllib.error
import json
import os
import sys
from datetime import date

# 強制 UTF-8 輸出以防 Windows CP950 崩潰（沿用既有腳本慣例）
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRY_PATH = os.path.join(REPO_ROOT, ".fhs", "tools", "check_registry.json")
CHECK_NAME = "COST_INTEGRITY"


def load_env():
    """.env 讀取（不依賴 python-dotenv，沿用 generate_fix_payload.py 慣例）"""
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
    """回傳 {(rule, key): expires_str} 字典，只包含 check==COST_INTEGRITY 的條目。
    登記冊不存在或格式壞 → 回傳空字典並印警告（fail-closed：等同全部視為未登記）。"""
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
        rule = ex.get("rule")
        key = ex.get("key")
        expires = ex.get("expires")
        reason = ex.get("reason")
        approved_by = ex.get("approved_by")
        registered = ex.get("registered")
        if not all([rule, key, expires, reason, approved_by, registered]):
            print(f"[WARN] 例外登記缺欄位（rule/key/expires/reason/registered/approved_by 缺一），視為未登記：{ex}")
            continue
        result[(rule, key)] = expires
    return result


def is_expired(expires_str):
    """expires_str 格式 YYYY-MM-DD；用宿主系統時間（date.today()）判斷，
    禁止在任何被凍結時鐘的 context 內呼叫此函式（cl-flow 2026-09-18-1827 §2B-A5）。"""
    try:
        y, m, d = (int(x) for x in expires_str.split("-"))
        return date.today() > date(y, m, d)
    except (ValueError, AttributeError):
        return True  # 格式壞 = 視為已過期（fail-closed）


def classify_violation(rule, key, exceptions):
    """回傳 (is_blocking, label) —— is_blocking=True 即計入 exit code 1"""
    expires = exceptions.get((rule, key))
    if expires is None:
        return True, "VIOLATION（未登記）"
    if is_expired(expires):
        return True, f"VIOLATION（例外已於 {expires} 過期）"
    return False, f"KNOWN EXCEPTION（有效至 {expires}）"


def fetch_json(url, headers, method="GET", body=None, timeout=20):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, headers=headers, method=method, data=data)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        print(f"[ERROR] Supabase API 回應 {e.code}: {err_body[:300]}")
        sys.exit(2)
    except urllib.error.URLError as e:
        print(f"[ERROR] Supabase 連線失敗：{e}")
        sys.exit(2)


def round2(x):
    return round(float(x), 2)


def main():
    load_env()
    exceptions = load_known_exceptions()

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        print("[ERROR] SUPABASE_URL / SUPABASE_ANON_KEY 未設定，無法執行 COST_INTEGRITY 稽核。")
        sys.exit(2)

    headers = {"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}", "Content-Type": "application/json"}
    total_violations = 0  # 只計未登記/已過期，known exception 不計

    # ── 驗證1 + 驗證2：orders 成本一致性 + 利潤正確性 ──────────────────────
    print("[COST_INTEGRITY] 查詢 orders（排除 test* 與 deleted）...")
    orders_url = (
        f"{supabase_url}/rest/v1/orders"
        "?select=order_id,final_sale_price,total_cost,net_profit,"
        "handmodel_cost,keychain_cost,necklace_cost,accessory_cost"
        "&deleted_at=is.null&order_id=not.ilike.test*"
    )
    orders = fetch_json(orders_url, headers)

    if not isinstance(orders, list) or len(orders) == 0:
        print("[ERROR] 讀到 0 張生產訂單——可能係 RLS 政策阻擋或表名/篩選錯誤，非真正「無訂單」。"
              "反靜默閘觸發：FAIL（learnings/supabase.md Pitfall #6：PostgREST 政策移除後可能回 200+0 rows）。")
        sys.exit(1)

    # Schema Probe（A2 評審 #7 採納）：欄位必須存在且非全部為 NULL，防欄位級權限令數值靜默變 NULL
    non_null_cost = sum(1 for o in orders if o.get("total_cost") is not None)
    non_null_price = sum(1 for o in orders if o.get("final_sale_price") is not None)
    if non_null_cost == 0 or non_null_price == 0:
        print(f"[ERROR] Schema Probe 失敗：{len(orders)} 張訂單中 total_cost 非空 {non_null_cost} 筆、"
              f"final_sale_price 非空 {non_null_price} 筆。懷疑 anon 對成本欄位無讀取權限（欄位級 RLS），"
              "而非「0 違規」的真陽性——FAIL，不得視為 PASS。")
        sys.exit(1)

    print(f"[COST_INTEGRITY] 讀到 {len(orders)} 張生產訂單，開始驗證...")

    for o in orders:
        oid = o.get("order_id", "?")
        tc = o.get("total_cost")
        # 驗證1：Finance_Bible §九 :395-397
        # handmodel_cost + keychain_cost + necklace_cost + accessory_cost = total_cost
        if tc is not None:
            parts = [o.get("handmodel_cost") or 0, o.get("keychain_cost") or 0,
                     o.get("necklace_cost") or 0, o.get("accessory_cost") or 0]
            calc = round2(sum(parts))
            if calc != round2(tc):
                blocking, label = classify_violation("C1", oid, exceptions)
                print(f"   [{label}] C1 訂單 {oid}：四分類成本和=${calc}，total_cost=${round2(tc)}")
                if blocking:
                    total_violations += 1

        # 驗證2：Finance_Bible §九 :399-400 —— net_profit = final_sale_price - total_cost
        fsp = o.get("final_sale_price")
        np_ = o.get("net_profit")
        if tc is not None and fsp is not None and np_ is not None:
            expected = round2(fsp - tc)
            if round2(np_) != expected:
                blocking, label = classify_violation("C2", oid, exceptions)
                print(f"   [{label}] C2 訂單 {oid}：net_profit=${round2(np_)}，"
                      f"應為 final_sale_price-total_cost=${expected}")
                if blocking:
                    total_violations += 1

    # ── 驗證4後半：products.total_base_cost IS NOT NULL ────────────────────
    print("[COST_INTEGRITY] 查詢 products.total_base_cost 完整性...")
    products_url = f"{supabase_url}/rest/v1/products?select=sku,total_base_cost"
    products = fetch_json(products_url, headers)

    if not isinstance(products, list) or len(products) == 0:
        print("[ERROR] 讀到 0 個產品——反靜默閘觸發：FAIL。")
        sys.exit(1)

    for p in products:
        if p.get("total_base_cost") is None:
            sku = p.get("sku", "?")
            blocking, label = classify_violation("C3", sku, exceptions)
            print(f"   [{label}] C3 產品 {sku}：total_base_cost 為 NULL")
            if blocking:
                total_violations += 1

    # ── fhs_check_product_cost_drift() 零漂移 ───────────────────────────────
    print("[COST_INTEGRITY] 執行 fhs_check_product_cost_drift() RPC...")
    drift_url = f"{supabase_url}/rest/v1/rpc/fhs_check_product_cost_drift"
    drift_rows = fetch_json(drift_url, headers, method="POST", body={})

    if not isinstance(drift_rows, list):
        print("[ERROR] drift RPC 回應格式異常（非陣列）：FAIL。")
        sys.exit(1)

    for row in drift_rows:
        drift = row.get("drift")
        if drift is not None and round2(drift) != 0:
            sku = row.get("sku", "?")
            mode = row.get("mode", "?")
            key = f"{sku}|{mode}"
            blocking, label = classify_violation("C4", key, exceptions)
            print(f"   [{label}] C4 {sku}（{mode}）：drift=${round2(drift)}"
                  f"（現值 ${row.get('current_base_cost')}，應為 ${row.get('expected_base_cost')}）")
            if blocking:
                total_violations += 1

    print(f"\n[COST_INTEGRITY] 驗證完畢：orders={len(orders)}、products={len(products)}、drift_rows={len(drift_rows)}")

    if total_violations > 0:
        print(f"[COST_INTEGRITY] 🔴 {total_violations} 項未登記/已過期違規，FAIL。")
        sys.exit(1)

    print("[COST_INTEGRITY] ✅ 全部通過（含已登記且有效的已知例外，見上方 KNOWN EXCEPTION 標記）。")
    sys.exit(0)


if __name__ == "__main__":
    main()
