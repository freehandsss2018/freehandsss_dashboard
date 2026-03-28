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


def run_script(label, filepath, description):
    """執行單一腳本，回傳 (passed: bool, output: str, elapsed: float)"""
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
        passed = result.returncode == 0
        print(output)
        status = "PASS" if passed else f"FAIL (exit {result.returncode})"
        print(f"\n→ {label}: {status}  ({elapsed:.1f}s)")
        return passed, output, elapsed
    except subprocess.TimeoutExpired:
        elapsed = time.time() - start
        msg = f"[TIMEOUT] 腳本超過 120s 未完成"
        print(msg)
        return False, msg, elapsed
    except Exception as e:
        elapsed = time.time() - start
        msg = f"[ERROR] 無法執行腳本：{e}"
        print(msg)
        return False, msg, elapsed


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

        passed, output, elapsed = run_script(label, filepath, description)
        status = "PASS" if passed else "FAIL"
        results.append((label, filename, status, elapsed))

    # ── 總結報告 ───────────────────────────────────────────────────────────
    print(f"\n{'═' * 60}")
    print(f"  HEALTH REPORT — {run_at}")
    print(f"{'═' * 60}")

    red_flags = []
    for label, filename, status, elapsed in results:
        icon = "✅" if status == "PASS" else ("⏭️" if status == "SKIP" else "🔴")
        elapsed_str = f"{elapsed:.1f}s" if elapsed else "—"
        print(f"  {icon}  {label:<16} {status:<6}  {elapsed_str}")
        if status == "FAIL":
            red_flags.append(label)

    print(f"{'─' * 60}")

    if red_flags:
        print(f"\n🔴 RED FLAGS ({len(red_flags)}):")
        for flag in red_flags:
            print(f"   • {flag}")
        print("\n⚠️  系統未通過全部檢查，請在宣告 task success 前修復上述問題。")
        sys.exit(1)
    else:
        passed_count = sum(1 for _, _, s, _ in results if s == "PASS")
        skipped_count = sum(1 for _, _, s, _ in results if s == "SKIP")
        print(f"\n✅ 全部通過 ({passed_count} passed, {skipped_count} skipped)")
        print("   系統健康，可宣告 task success。")
        sys.exit(0)


if __name__ == "__main__":
    main()
