"""
FHS /fhs-check — Unified Health Check Entry Point
版本: V46.0.0（2026-09-18，cl-flow 2026-09-18-1827 期一：LOCAL_AUDIT 移除
      [指向 2026-04-07 已刪檔案，靜默 SKIP 5 個月]；新增真環境前置檢查；
      SKIP 三態改為登記冊制；新增 COST_INTEGRITY；PRICE_AUDIT 改讀 Supabase）
用途: 依序執行環境前置檢查、webhook 壓力測試、成本/售價稽核，輸出 Health Report。
執行: python Maintenance_Tools/run_all.py
"""

import subprocess
import sys
import os
import json
import time
from datetime import datetime, date

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
REGISTRY_PATH = os.path.join(REPO_ROOT, ".fhs", "tools", "check_registry.json")

# ── 強制 UTF-8 輸出以防 Windows CP950 崩潰 ─────────────────────────────────────
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ── 執行清單 ─────────────────────────────────────────────────────────────
# (label, filename, description)
CHECKS = [
    (
        "LIFECYCLE",
        "FHS_Full_System_Test.py",
        "全週期測試：Create → Update → Delete（V41.11）",
    ),
    (
        "STRESS",
        "FHS_System_StressTester.py",
        "壓力測試：多情境 webhook 呼叫",
    ),
    (
        "ACCEPTANCE",
        "FHS_Comprehensive_Test.py",
        "結案驗收測試（V41.9c）",
    ),
    (
        "COST_INTEGRITY",
        "audit_cost_integrity.py",
        "訂單成本一致性稽核（Finance Bible §九 驗證1/2/4後半 + drift RPC，取代已廢除 /fhs-cost-audit）",
    ),
    (
        "PRICE_AUDIT",
        "audit_price_completeness.py",
        "Supabase products.suggested_price 空白售價稽核（真源由 Airtable 轉移，2026-09-18）",
    ),
]

SEPARATOR = "─" * 60

# ── D62 事故教訓（2026-08-10/11）：Supabase 憑證 401 令真實訂單斷同步 5 日，
# 但 /fhs-check 連續多輪回報「全部通過」——子腳本輸出文字內確實印咗警告
# （下列字串），卻從未影響 exit code，本聚合層對此類「靜默降級」完全無感知。
# 呢個清單就係補呢個盲點：任一子腳本輸出含以下任何字串，即使 exit code = 0，
# 亦標記為 DEGRADED（非 clean PASS），Health Report 一定會顯示、絕不會被
# 「全部通過」蓋過。清單只做偵測，不改動任何子腳本既有嘅寬容式設計。
#
# 2026-09-18（cl-flow 2026-09-18-1827 期一）新增三條：LIFECYCLE/ACCEPTANCE 憑證
# 缺失時靜默 return True（原稽核目標歸零，唔會被舊清單捕捉）；STRESS/ACCEPTANCE
# 「failsafe may have regressed」只印 WARN 唔入 exit code；ACCEPTANCE 查詢失敗
# 只印 WARN 唔入 exit code。三條皆源自 20 宗腐化實證 E4/E5/E6（見
# artifacts/2026-09-18-1827/a3-draft-full.md §1.1）。
DEGRADED_MARKERS = [
    "never appeared in Supabase",
    "did not appear in Supabase",
    "Cleanup verification TIMEOUT",
    "not set, skipping verification for",  # E4
    "failsafe may have regressed",         # E5
    "Verification query failed",           # E6
]


def load_registry():
    """讀取 .fhs/tools/check_registry.json。壞檔/缺檔 = fail-closed（回傳空登記冊，
    等同全部 SKIP 視為未登記）。"""
    if not os.path.exists(REGISTRY_PATH):
        return {"skips": [], "known_exceptions": []}
    try:
        with open(REGISTRY_PATH, encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data.get("skips"), list) or not isinstance(data.get("known_exceptions"), list):
            raise ValueError("skips/known_exceptions 必須為陣列")
        return data
    except (json.JSONDecodeError, ValueError, OSError) as e:
        print(f"[ERROR] check_registry.json 損壞：{e}（fail-closed，所有 SKIP 視為未登記）")
        return {"skips": [], "known_exceptions": []}


def is_expired(expires_str):
    try:
        y, m, d = (int(x) for x in expires_str.split("-"))
        return date.today() > date(y, m, d)
    except (ValueError, AttributeError, TypeError):
        return True


def classify_skip(label, registry):
    """回傳 (status_str) —— 'FAIL (SKIP-UNREGISTERED)' / 'FAIL (SKIP-EXPIRED until YYYY-MM-DD)'
    / 'WARN (SKIP-REGISTERED until YYYY-MM-DD)'"""
    entry = next((s for s in registry.get("skips", []) if s.get("check") == label), None)
    if entry is None:
        return "FAIL (SKIP-UNREGISTERED)", None
    expires = entry.get("expires")
    if not all([expires, entry.get("reason"), entry.get("approved_by"), entry.get("registered")]):
        return "FAIL (SKIP-UNREGISTERED)", None  # 缺欄位 = 視為未登記
    if is_expired(expires):
        return f"FAIL (SKIP-EXPIRED until {expires})", expires
    return f"WARN (SKIP-REGISTERED until {expires})", expires


def check_environment():
    """真環境前置檢查（取代舊 fhs-check.md 描述咗但未實作嘅 Phase 1）。
    根治 E4：若呢度已 FAIL 停止，子腳本就冇機會再各自靜默 `return True` 跳過驗證。"""
    print(f"\n{SEPARATOR}")
    print("[ENV_CHECK] 環境前置檢查")
    print(SEPARATOR)

    env_path = os.path.join(REPO_ROOT, ".env")
    if os.path.exists(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

    missing = [k for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY") if not os.environ.get(k)]
    if missing:
        print(f"[ENV_CHECK] 🔴 缺少必要環境變數：{', '.join(missing)}")
        print("[ENV_CHECK] 全部子腳本皆需 Supabase 連線，環境不齊即停止（不進入任何子腳本，")
        print("            防止子腳本各自靜默 `return True` 跳過驗證 —— E4 腐化實證）。")
        return False
    print("[ENV_CHECK] ✅ SUPABASE_URL / SUPABASE_ANON_KEY 已設定")
    return True


def run_script(label, filepath, description):
    """執行單一腳本，回傳 (status: 'PASS'|'DEGRADED'|'FAIL', output: str, elapsed: float)"""
    print(f"\n{SEPARATOR}")
    print(f"[{label}] {description}")
    print(f"  檔案: {os.path.basename(filepath)}")
    print(SEPARATOR)

    interpreter = "node" if filepath.endswith(".js") else sys.executable

    start = time.time()
    try:
        result = subprocess.run(
            [interpreter, filepath],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
        elapsed = time.time() - start
        output = result.stdout + (f"\n[STDERR] {result.stderr}" if result.stderr.strip() else "")
        print(output)

        if result.returncode != 0:
            status = f"FAIL (exit {result.returncode})"
        else:
            hits = [m for m in DEGRADED_MARKERS if m in output]
            status = f"DEGRADED ({hits[0]})" if hits else "PASS"

        print(f"\n→ {label}: {status}  ({elapsed:.1f}s)")
        return status, output, elapsed
    except subprocess.TimeoutExpired:
        elapsed = time.time() - start
        msg = f"[TIMEOUT] 腳本超過 120s 未完成"
        print(msg)
        return "FAIL (timeout)", msg, elapsed
    except Exception as e:
        elapsed = time.time() - start
        msg = f"[ERROR] 無法執行腳本：{e}"
        print(msg)
        return f"FAIL ({e})", msg, elapsed


def main():
    run_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'═' * 60}")
    print(f"  FHS /fhs-check — Health Report")
    print(f"  執行時間: {run_at}")
    print(f"{'═' * 60}")

    if not check_environment():
        print(f"\n{'═' * 60}")
        print("🔴 環境前置檢查未通過，全部子腳本未執行。")
        print(f"{'═' * 60}")
        sys.exit(1)

    registry = load_registry()

    results = []
    for label, filename, description in CHECKS:
        filepath = os.path.join(SCRIPT_DIR, filename)
        if not os.path.exists(filepath):
            skip_status, expires = classify_skip(label, registry)
            print(f"\n[SKIP] {label}: 找不到 {filename} → {skip_status}")
            results.append((label, None, skip_status, 0.0))
            continue

        status, output, elapsed = run_script(label, filepath, description)
        results.append((label, filename, status, elapsed))

    # ── 總結報告 ───────────────────────────────────────────────────────────
    print(f"\n{'═' * 60}")
    print(f"  HEALTH REPORT — {run_at}")
    print(f"{'═' * 60}")

    red_flags = []
    degraded_flags = []
    warn_flags = []
    for label, filename, status, elapsed in results:
        if status == "PASS":
            icon = "✅"
        elif status.startswith("WARN"):
            icon = "🟨"
        elif status.startswith("DEGRADED"):
            icon = "🟡"
        else:
            icon = "🔴"
        elapsed_str = f"{elapsed:.1f}s" if elapsed else "—"
        print(f"  {icon}  {label:<16} {status:<40}  {elapsed_str}")
        if status.startswith("DEGRADED"):
            degraded_flags.append((label, status))
        elif status.startswith("WARN"):
            warn_flags.append((label, status))
        elif icon == "🔴":
            red_flags.append((label, status))

    print(f"{'─' * 60}")

    # DEGRADED／FAIL 一律視為 Red Flag 等級，不可再被「全部通過」蓋過（D62 教訓）。
    # WARN（已登記且未過期嘅 SKIP）刻意唔阻斷 exit code，但一定會顯示喺 Health
    # Report，唔可以被「全部通過」蓋過（2026-09-18 修正：舊版 SKIP 全部唔阻斷、
    # 亦冇到期機制，令 LOCAL_AUDIT 靜默 5 個月都印「全部通過」，即本次整頓根因）。
    has_blocking_issue = bool(red_flags) or bool(degraded_flags)

    if has_blocking_issue:
        if red_flags:
            print(f"\n🔴 RED FLAGS ({len(red_flags)}):")
            for label, status in red_flags:
                print(f"   • {label}: {status}")
        if degraded_flags:
            print(f"\n🟡 DEGRADED — exit code 正常但輸出內文有落地疑點，須人手核實 Supabase ({len(degraded_flags)}):")
            for label, status in degraded_flags:
                print(f"   • {label}: {status}")
        if warn_flags:
            print(f"\n🟨 WARN — 已登記且未過期嘅 SKIP ({len(warn_flags)})，仍請留意到期日:")
            for label, status in warn_flags:
                print(f"   • {label}: {status}")
        print("\n⚠️  系統未通過全部檢查，請在宣告 task success 前修復上述問題（DEGRADED 亦不得視為 task success）。")
        sys.exit(1)
    else:
        passed_count = sum(1 for _, _, s, _ in results if s == "PASS")
        print(f"\n✅ 全部通過 ({passed_count} passed", end="")
        if warn_flags:
            print(f", {len(warn_flags)} warned)")
            print(f"🟨 WARN 清單（已登記且未過期，仍需留意到期日）:")
            for label, status in warn_flags:
                print(f"   • {label}: {status}")
        else:
            print(")")
        print("   系統健康，可宣告 task success。")
        sys.exit(0)


if __name__ == "__main__":
    main()
