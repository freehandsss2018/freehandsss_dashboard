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
    Supports only the shape we wrote — no external dep."""
    keys_file = TOOLS_DIR / "canonical_keys.yml"
    if not keys_file.exists():
        return {}
    keys = {}
    current_key = None
    for raw in keys_file.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip()
        if not line or line.lstrip().startswith("#"):
            continue
        if not line.startswith(" "):
            m = re.match(r"^([\w_]+):\s*$", line)
            if m:
                current_key = m.group(1)
                keys[current_key] = {}
        elif current_key and ":" in line:
            field, val = line.strip().split(":", 1)
            field = field.strip()
            val = val.strip()
            if field == "pattern":
                val = val.strip("'\"")
            if field in {"source_of_truth", "pattern", "note"}:
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
                target = target.lstrip("./")
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
    deprecated_hits = find_deprecated_refs(TOOLS_DIR / "deprecated_terms.txt")
    ref_graph_findings = build_ref_graph()

    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "tool_version": "0.1.0-mvp",
        "summary": {
            "canonical_keys_tracked": len(keys),
            "deprecated_term_hits": len(deprecated_hits),
            "dangling_links": len(ref_graph_findings["dangling"]),
            "cycles_detected": len(ref_graph_findings["cycles"]),
        },
        "D1_D3_canonical_values": canonical_values,
        "D2_D5_dangling_links": ref_graph_findings["dangling"],
        "D5_cycles": ref_graph_findings["cycles"],
        "D5_deprecated_term_hits": deprecated_hits,
        "notes": [
            "本 JSON 為候選清單，不是判決。/fhs-audit 主流程 Claude 需做語義仲裁。",
            "D4 沉餘偵測未實作於 MVP（需 fuzzy match 依賴）；由 Claude 讀文件直接判斷。",
        ],
    }

    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[OK] Semantic audit candidates written to: {REPORT_PATH}")
    print(f"     Canonical keys: {report['summary']['canonical_keys_tracked']}")
    print(f"     Deprecated hits: {report['summary']['deprecated_term_hits']}")
    print(f"     Dangling links: {report['summary']['dangling_links']}")
    print(f"     Cycles: {report['summary']['cycles_detected']}")


if __name__ == "__main__":
    sys.exit(main())
