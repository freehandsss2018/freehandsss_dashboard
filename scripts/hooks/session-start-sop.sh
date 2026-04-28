#!/bin/bash
# scripts/hooks/session-start-sop.sh
# FHS SessionStart Hook — Auto-inject SOP_NOW + handoff summary
# Triggered by Claude Code on SessionStart event (replaces manual /read)
# Version: 1.0.0 | 2026-04-28

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
SOP_FILE="$PROJECT_DIR/.fhs/notes/SOP_NOW.md"
HANDOFF_FILE="$PROJECT_DIR/.fhs/memory/handoff.md"

echo "═══════════════════════════════════════════════════"
echo "⚡ FHS SESSION AUTO-INIT (SessionStart Hook)"
echo "═══════════════════════════════════════════════════"

# ─── System Snapshot (from SOP_NOW.md) ──────────────────
if [ -f "$SOP_FILE" ]; then
  echo "📌 系統快照："
  # Extract the snapshot table lines (between | markers)
  grep "^|" "$SOP_FILE" | head -10
else
  echo "⚠️  SOP_NOW.md 未找到：$SOP_FILE"
fi

echo ""

# ─── Pending Items (from handoff.md) ────────────────────
if [ -f "$HANDOFF_FILE" ]; then
  echo "⏳ 上次待辦："
  # Extract lines between 待辦 section and next ## section
  awk '/^## 待辦/,/^## [^待辦]/' "$HANDOFF_FILE" | grep -E "^\s*[0-9]+\.|^\s*-|\[LOCKED\]|\[NEW\]" | head -8
else
  echo "⚠️  handoff.md 未找到"
fi

echo ""
echo "💡 /read 完整初始化 | /cl-flow [任務] 開始規劃 | /cl-flow-fast 快速規劃"
echo "═══════════════════════════════════════════════════"
exit 0
