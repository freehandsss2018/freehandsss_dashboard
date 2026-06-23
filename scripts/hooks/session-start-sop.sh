#!/bin/bash
# scripts/hooks/session-start-sop.sh
# FHS SessionStart Hook — 自動注入 handoff 便攜塊動態段
# v2.0.0 | 2026-06-23 (SSOT 機制：讀 handoff.md 頂部 ```handoff 塊動態段，取代 SOP_NOW 快照表 + 殭屍待辦)
# v1.0.0 | 2026-04-28 (原版：SOP_NOW 快照表 + handoff.md ## 待辦 awk)
# 觸發：Claude Code SessionStart 事件

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
HANDOFF_FILE="$PROJECT_DIR/.fhs/memory/handoff.md"

echo "═══════════════════════════════════════════════════"
echo "⚡ FHS SESSION AUTO-INIT (SessionStart Hook v2)"
echo "═══════════════════════════════════════════════════"

if [ -f "$HANDOFF_FILE" ]; then
  # v2-B：只抽動態段（```handoff 開始 → ─── 便攜邊界 結束，不含靜態地雷，節省 ~50% token）
  # 若無便攜邊界分隔線，則抽到 ``` 結束
  DYNAMIC=$(awk '/^```handoff$/{found=1; next} found && /^─── 便攜邊界/{exit} found && /^```$/{exit} found{print}' "$HANDOFF_FILE")

  if [ -n "$DYNAMIC" ]; then
    echo "📌 FHS 交接摘要（來源：handoff.md 便攜塊，動態段）"
    echo "$DYNAMIC"

    # v2-A：過期偵測（比較塊頭 YYYY-MM-DD 與今日）
    BLOCK_DATE=$(echo "$DYNAMIC" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
    TODAY=$(date +%Y-%m-%d 2>/dev/null || echo "")
    if [ -n "$BLOCK_DATE" ] && [ -n "$TODAY" ] && [ "$BLOCK_DATE" != "$TODAY" ]; then
      echo ""
      echo "⚠️  便攜塊上次更新：$BLOCK_DATE（今日 $TODAY）— 若超過 3 天請 /commit 時更新便攜塊"
    fi
  else
    # Fallback：便攜塊不存在時提示並顯示 MASTER 待辦表前幾行
    echo "⚠️  handoff.md 未找到 \`\`\`handoff 便攜塊"
    echo "    → 請在 handoff.md 頂部建立（格式見 decisions.md Session 118 SSOT 機制）"
    echo ""
    echo "📌 臨時顯示（handoff.md 前 8 行）："
    head -8 "$HANDOFF_FILE"
  fi
else
  echo "⚠️  handoff.md 未找到：$HANDOFF_FILE"
fi

echo ""
echo "💡 /read 完整初始化 | /cl-flow [任務] 開始規劃 | /cl-flow-fast 快速規劃"
echo "═══════════════════════════════════════════════════"
exit 0