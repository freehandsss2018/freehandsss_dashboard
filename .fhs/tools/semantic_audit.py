#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FHS Semantic Audit MVP — 語義稽核候選偵測器
========================================
用途：為 /fhs-audit Check 7 提供「程式化候選清單」。
本腳本不做語義仲裁，僅輸出候選 JSON 供 Claude 主流程二次審查。

對應維度：
- D1 Stale     → extract_canonical_keys()
- D2 Orphan    → build_ref_graph() → orphan list
- D3 Conflict  → extract_canonical_keys() → value mismatch
- D4 Redundant → （MVP 不實作，仰賴 AI 仲裁）
- D5 Loops     → build_ref_graph() → cycles + dangling
       + find_deprecated_refs() → blacklist hits

執行：
    python .fhs/tools/semantic_audit.py
輸出：
    .fhs/reports/semantic_audit_candidates.json

維護：
    本檔為 MVP，不引入第三方依賴（無 networkx / rapidfuzz）。
    後續可選裝以增強 D4/D5 偵測精度。
"""

from __future__ import annotations
import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_DIR = REPO_ROOT / ".fhs" / "tools"
REPORT_PATH = REPO_ROOT / ".fhs" / "reports" / "semantic_audit_candidates.json"

EXCLUDE_DIRS = {
    "node_modules", "archive", ".git", "artifacts",
    "perplexity-mcp-server", "n8n-mcp-server",
    "worktrees",  # 2026-07-05 S145：git worktree 快照（如 .claude/worktrees/*）非現行檔案，掃描會重複計數/產生假性孤兒
}
EXCEPTION_PATH_FRAGMENTS = [
    ".fhs/reports/completion",
    ".fhs/reports/audits",
    "docs/archive",
    "Freehandsss_Dashboard/archive",
    "CHANGELOG.md",
    ".fhs/notes/session-log.md",
    "artifacts/",
    ".fhs/tools/deprecated_terms.txt",
]


def walk_md_files(root: Path):
    """Yield .md files under root, excluding noisy dirs."""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn.endswith(".md") or fn == ".cursorrules":
                yield Path(dirpath) / fn


def is_excepted(path: Path) -> bool:
    rel = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    return any(frag in rel for frag in EXCEPTION_PATH_FRAGMENTS)


def parse_canonical_keys() -> dict:
    """Lightweight YAML-ish parser for canonical_keys.yml.
    Supports only the shape we wrote — no external dep.

    2026-09-18 v0.2.0（cl-flow 2026-09-18-1827）：新增 allowed_references（list）/
    key_type / reference_pattern 解析。v0.1.0-mvp 雖然在 schema 註解宣告
    allowed_references 為欄位，但從未真正解析——list item（`  - foo`）雖然 startswith
    一個空白因而落入 elif 分支，但因為冇 ':' 而完全被 `elif current_key and ":" in
    line` 條件擋在外面、靜默跳過，等於 D3 跨檔比對從一開始就係 dead code（見
    cl-flow 2026-09-18-1827 §0.3-3 A3 自認錯誤：曾誤判「機器已存在只係冧咗自己」，
    實情係機器從未實作）。"""
    keys_file = TOOLS_DIR / "canonical_keys.yml"
    if not keys_file.exists():
        return {}
    keys: dict = {}
    current_key = None
    in_list_field = None
    for raw in keys_file.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if not line or line.lstrip().startswith("#"):
            continue
        if not line.startswith(" "):
            m = re.match(r"^([\w_]+):\s*$", line)
            if m:
                current_key = m.group(1)
                keys[current_key] = {"allowed_references": []}
                in_list_field = None
            continue
        if current_key is None:
            continue
        stripped = line.strip()
        if stripped.startswith("- "):
            if in_list_field:
                keys[current_key][in_list_field].append(stripped[2:].strip())
            continue
        if ":" in stripped:
            field, _, val = stripped.partition(":")
            field = field.strip()
            val = val.strip()
            if field == "allowed_references":
                in_list_field = "allowed_references"
                continue
            in_list_field = None
            if field in ("pattern", "reference_pattern"):
                val = val.strip("'\"")
            if field in {"source_of_truth", "pattern", "reference_pattern", "note", "key_type"}:
                keys[current_key][field] = val
    return keys


def extract_canonical_values(keys: dict) -> dict:
    """For each key, extract current value from source_of_truth file."""
    values = {}
    for key, spec in keys.items():
        sot = spec.get("source_of_truth")
        pat = spec.get("pattern")
        if not sot or not pat:
            continue
        sot_path = REPO_ROOT / sot
        if not sot_path.exists():
            values[key] = {"status": "missing_source", "source": sot}
            continue
        try:
            text = sot_path.read_text(encoding="utf-8")
            m = re.search(pat, text, re.MULTILINE)
            values[key] = {
                "status": "ok" if m else "no_match",
                "value": m.group(1) if m else None,
                "source": sot,
            }
        except Exception as exc:
            values[key] = {"status": "error", "error": str(exc), "source": sot}
    return values


def compare_references(keys: dict, canonical_values: dict) -> list:
    """D3 Conflict：掃描每個 key 的 allowed_references，用 reference_pattern（缺省
    fallback 用 pattern）抽值，同 source_of_truth 現值比對。2026-09-18 新實作
    （cl-flow 2026-09-18-1827 §2B-A3，回應 A2 評審 #4）：
    - key_type=structured（散文語境，如 agents_version）→ reference_pattern 只匹配
      顯式標記（如 `<!-- canonical:key=vX -->`），不用自然語言 regex 猜測語境
    - key_type=literal（檔名等字面常量，如 production_html）→ reference_pattern
      可直接字面比對，無語境歧義
    回傳衝突清單，每條含 key/file/line/found_value/expected_value。"""
    conflicts = []
    for key, spec in keys.items():
        expected = canonical_values.get(key, {}).get("value")
        if not expected:
            continue  # 真理來源本身抽唔到值，D1 已報告，D3 冇比對基準可跳過
        ref_pattern = spec.get("reference_pattern") or spec.get("pattern")
        if not ref_pattern:
            continue
        for ref_glob in spec.get("allowed_references", []):
            try:
                matched_paths = list(REPO_ROOT.glob(ref_glob))
            except Exception:
                continue
            for path in matched_paths:
                if not path.is_file() or is_excepted(path):
                    continue
                try:
                    text = path.read_text(encoding="utf-8")
                except Exception:
                    continue
                for m in re.finditer(ref_pattern, text):
                    found = m.group(1)
                    if found != expected:
                        lineno = text.count("\n", 0, m.start()) + 1
                        conflicts.append({
                            "key": key,
                            "file": str(path.relative_to(REPO_ROOT)).replace("\\", "/"),
                            "line": lineno,
                            "found_value": found,
                            "expected_value": expected,
                        })
    return conflicts


def find_deprecated_refs(blacklist_file: Path) -> list:
    """Grep all .md files for deprecated terms; skip exception paths."""
    if not blacklist_file.exists():
        return []
    terms = []
    for raw in blacklist_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        token = line.split(";")[0].strip()
        replacement = line.split(";", 1)[1].split("#")[0].strip() if ";" in line else None
        if token:
            terms.append((token, replacement))

    hits = []
    for path in walk_md_files(REPO_ROOT):
        if is_excepted(path):
            continue
        try:
            for lineno, line in enumerate(
                path.read_text(encoding="utf-8").splitlines(), start=1
            ):
                for token, replacement in terms:
                    if token in line:
                        hits.append({
                            "file": str(path.relative_to(REPO_ROOT)).replace("\\", "/"),
                            "line": lineno,
                            "token": token,
                            "replacement": replacement,
                            "snippet": line.strip()[:120],
                        })
        except Exception:
            continue
    return hits


def build_ref_graph() -> dict:
    """Build cross-reference graph for cycle + dangling detection.
    MVP: emit edges as adjacency dict; cycle detection via DFS."""
    md_link_pat = re.compile(r"\[[^\]]+\]\(([^)]+\.md)\)")
    inline_path_pat = re.compile(r"`(\.?\.?/?[\w/\-.]+\.md)`")

    graph = {}
    dangling = []
    for path in walk_md_files(REPO_ROOT):
        if is_excepted(path):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue
        src_rel = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
        targets = set()
        for pat in (md_link_pat, inline_path_pat):
            for m in pat.finditer(text):
                target = m.group(1).split("#")[0]
                # 2026-07-05 S145 修正：str.lstrip("./") 是「字元集合」剝除，非「字串前綴」剝除，
                # 會把 "/.fhs/ai/AGENTS.md" 的 "/." 兩個字元都吃掉變成 "fhs/ai/AGENTS.md"（少一個點，比對必定找不到檔案）
                if target.startswith("./"):
                    target = target[2:]
                if target.startswith("/"):
                    target = target[1:]
                targets.add(target)
        graph[src_rel] = sorted(targets)
        for t in targets:
            full = REPO_ROOT / t
            if not full.exists() and not (REPO_ROOT / src_rel).parent.joinpath(t).exists():
                dangling.append({"from": src_rel, "to": t})

    cycles = []
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in graph}
    stack_trace = []

    def dfs(node):
        color[node] = GRAY
        stack_trace.append(node)
        for nxt in graph.get(node, []):
            if nxt not in color:
                continue
            if color[nxt] == GRAY:
                idx = stack_trace.index(nxt)
                cycles.append(stack_trace[idx:] + [nxt])
            elif color[nxt] == WHITE:
                dfs(nxt)
        stack_trace.pop()
        color[node] = BLACK

    for n in list(graph.keys()):
        if color[n] == WHITE:
            dfs(n)

    return {"dangling": dangling, "cycles": cycles}


def main():
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    keys = parse_canonical_keys()
    canonical_values = extract_canonical_values(keys)
    d3_conflicts = compare_references(keys, canonical_values)
    deprecated_hits = find_deprecated_refs(TOOLS_DIR / "deprecated_terms.txt")
    ref_graph_findings = build_ref_graph()

    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "tool_version": "0.2.0",
        "summary": {
            "canonical_keys_tracked": len(keys),
            "d3_conflicts": len(d3_conflicts),
            "deprecated_term_hits": len(deprecated_hits),
            "dangling_links": len(ref_graph_findings["dangling"]),
            "cycles_detected": len(ref_graph_findings["cycles"]),
        },
        "D1_canonical_values": canonical_values,
        "D3_conflicts": d3_conflicts,
        "D2_D5_dangling_links": ref_graph_findings["dangling"],
        "D5_cycles": ref_graph_findings["cycles"],
        "D5_deprecated_term_hits": deprecated_hits,
        "notes": [
            "本 JSON 為候選清單，不是判決。/fhs-audit 主流程 Claude 需做語義仲裁。",
            "D3_conflicts 為 2026-09-18 v0.2.0 新實作（v0.1.0-mvp 宣告過 allowed_references 欄位但從未解析，係 dead code）；"
            "與 .fhs/tools/check_registry.json 的 known_exceptions（check=\"SEMANTIC_D3\"）交叉比對，已登記且未過期者非新增紅旗。",
            "D4 沉餘偵測未實作於 MVP（需 fuzzy match 依賴）；由 Claude 讀文件直接判斷。",
        ],
    }

    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[OK] Semantic audit candidates written to: {REPORT_PATH}")
    print(f"     Canonical keys: {report['summary']['canonical_keys_tracked']}")
    print(f"     D3 conflicts: {report['summary']['d3_conflicts']}")
    print(f"     Deprecated hits: {report['summary']['deprecated_term_hits']}")
    print(f"     Dangling links: {report['summary']['dangling_links']}")
    print(f"     Cycles: {report['summary']['cycles_detected']}")


if __name__ == "__main__":
    sys.exit(main())
