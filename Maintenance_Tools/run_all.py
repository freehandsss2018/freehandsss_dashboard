"""
FHS /fhs-check — Unified Health Check Entry Point
版本: V45.7.4
用途: 依序執行所有 webhook 壓力測試與本地邏輯稽核，輸出 Health Report。
執行: python Maintenance_Tools/run_all.py
"""

import subprocess
import sys
import os
import time
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── 強制 UTF-8 輸出以防 Windows CP950 崩潰 ─────────────────────────────────────
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ── 執行清單 ─────────────────────────────────────────────────────────────
# (label, filename, requires_network, description)
CHECKS = [
    (
        "LOCAL_AUDIT",
        "test_audit_0695346.py",
        False,
        "Profit Auditor 本地邏輯測試（無網路）",
    ),
    (
        "LIFECYCLE",
        "FHS_Full_System_Test.py",
        True,
        "全週期測試：Create → Update → Delete（V41.11）",
    ),
    (
        "STRESS",
        "FHS_System_StressTester.py",
        True,
        "壓力測試：多情境 webhook 呼叫",
    ),
    (
        "ACCEPTANCE",
        "FHS_Comprehensive_Test.py",
        True,
        "結案驗收測試（V41.9c）",
    ),
    (
        "PRICE_AUDIT",
        "generate_fix_payload.py",
        True,
        "Product_Database 空白售價稽核 — 有問題時自動生成 Fix Payload",
    ),
]

SEPARATOR = "─" * 60

# ── D62 事故教訓（2026-08-10/11）：Supabase 憑證 401 令真實訂單斷同步 5 日，
# 但 /fhs-check 連續多輪回報「全部通過」——子腳本輸出文字內確實印咗警告
# （下列字串），卻從未影響 exit code，本聚合層對此類「靜默降級」完全無感知。
# 呢個清單就係補呢個盲點：任一子腳本輸出含以下任何字串，即使 exit code = 0，
# 亦標記為 DEGRADED（非 clean PASS），Health Report 一定會顯示、絕不會被
# 「全部通過」蓋過。清單只做偵測，不改動任何子腳本既有嘅寬容式設計。
DEGRADED_MARKERS = [
    "never appeared in Supabase",
    "did not appear in Supabase",
    "Cleanup verification TIMEOUT",
]


def run_script(label, filepath, description):
    """執行單一腳本，回傳 (status: 'PASS'|'DEGRADED'|'FAIL', output: str, elapsed: float)"""
    print(f"\n{SEPARATOR}")
    print(f"[{label}] {description}")
    print(f"  檔案: {os.path.basename(filepath)}")
    print(SEPARATOR)

    start = time.time()
    try:
        result = subprocess.run(
            [sys.executable, filepath],
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

    results = []
    for label, filename, requires_network, description in CHECKS:
        filepath = os.path.join(SCRIPT_DIR, filename)
        if not os.path.exists(filepath):
            print(f"\n[SKIP] {label}: 找不到 {filename}")
            results.append((label, None, "SKIP", 0.0))
            continue

        status, output, elapsed = run_script(label, filepath, description)
        results.append((label, filename, status, elapsed))

    # ── 總結報告 ───────────────────────────────────────────────────────────
    print(f"\n{'═' * 60}")
    print(f"  HEALTH REPORT — {run_at}")
    print(f"{'═' * 60}")

    red_flags = []
    degraded_flags = []
    for label, filename, status, elapsed in results:
        if status == "PASS":
            icon = "✅"
        elif status == "SKIP":
            icon = "⏭️"
        elif status.startswith("DEGRADED"):
            icon = "🟡"
        else:
            icon = "🔴"
        elapsed_str = f"{elapsed:.1f}s" if elapsed else "—"
        print(f"  {icon}  {label:<16} {status:<40}  {elapsed_str}")
        if status.startswith("DEGRADED"):
            degraded_flags.append((label, status))
        elif icon == "🔴":
            red_flags.append(label)

    print(f"{'─' * 60}")

    # DEGRADED 一律視為 Red Flag 等級，不可再被「全部通過」蓋過（D62 教訓）——
    # 差別只在訊息措辭：DEGRADED 代表「exit code 正常但實際資料落地有疑點」，
    # 需要人手核實 Supabase 而非單靠腳本自報。
    has_blocking_issue = bool(red_flags) or bool(degraded_flags)

    if has_blocking_issue:
        if red_flags:
            print(f"\n🔴 RED FLAGS ({len(red_flags)}):")
            for flag in red_flags:
                print(f"   • {flag}")
        if degraded_flags:
            print(f"\n🟡 DEGRADED — exit code 正常但輸出內文有落地疑點，須人手核實 Supabase ({len(degraded_flags)}):")
            for label, status in degraded_flags:
                print(f"   • {label}: {status}")
        print("\n⚠️  系統未通過全部檢查，請在宣告 task success 前修復上述問題（DEGRADED 亦不得視為 task success）。")
        sys.exit(1)
    else:
        passed_count = sum(1 for _, _, s, _ in results if s == "PASS")
        skipped_count = sum(1 for _, _, s, _ in results if s == "SKIP")
        print(f"\n✅ 全部通過 ({passed_count} passed, {skipped_count} skipped)")
        print("   系統健康，可宣告 task success。")
        sys.exit(0)


if __name__ == "__main__":
    main()
