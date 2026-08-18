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

# T5 /commit 漏跑偵測（S148 Phase 3）：比較最新 commit 日期 vs 便攜塊日期
# 僅當 commit 日期「晚於」塊日期 ≥1天才 warn-only（同日多 commit 不誤報）
if [ -n "$BLOCK_DATE" ]; then
  LAST_COMMIT=$(git -C "$PROJECT_DIR" log -1 --format=%cs 2>/dev/null || echo "")
  if [ -n "$LAST_COMMIT" ] && [ "$LAST_COMMIT" \> "$BLOCK_DATE" ]; then
    echo ""
    echo "⚠️  最新 commit（$LAST_COMMIT）晚於便攜塊更新日（$BLOCK_DATE）— 疑似上個 session 漏跑 /commit"
    echo "   → 自查：git log --oneline -5 對照 Changelog.md 最新條目；確認漏跑則先補 /commit"
  fi
fi

# L1 文件健康快檢（S142 新增）：零 token 死腳本，正常沉默，異常才印 ≤2 行。
# fail-open：node 不存在或腳本出錯都不得擋 session 啟動，故加 timeout + || true 雙保險。
if command -v node >/dev/null 2>&1; then
  timeout 5 node "$PROJECT_DIR/scripts/hooks/fhs-health-check.js" 2>/dev/null || true
fi

# T-並行 session 偵測（S183 D41撞單事故後新增，2026-07-21，見 02_model-dispatch.md §7）
# 根因：多條 worktree 並行時，本地 handoff/todo 只反映開工當刻快照，其他 session 完成的工作
# 直到 merge 才會被看見——曾導致 AI 用過時本地狀態答「未做」，實際 main 已由並行 session 做完。
# fail-open：任何步驟失敗都不得擋 session 啟動；git 網路操作加 timeout 防卡死。
if command -v git >/dev/null 2>&1 && [ -d "$PROJECT_DIR/.git" -o -f "$PROJECT_DIR/.git" ]; then
  # ⚠️ 必須 fetch 全部分支（非只 main）：下方 :OTHER_ACTIVE 讀嘅係本地 refs/remotes/origin/claude/*，
  # 全新雲端容器只帶住 clone 當刻嗰批 ref——只 fetch main 會令其他 session 新開/更新嘅分支
  # 喺本地完全冇對應 ref，令並行分支警告靜靜哋報一份殘缺清單（零報錯）。
  # 2026-08-18 實測事故：d65-family-owner-role（6小時前，PR #3，D65 已完成部署）被完全漏報，
  # 令本 session 誤信 main 上過時 handoff「D65 等緊 /execute」而重新規劃一次已完成嘅工作。
  timeout 12 git -C "$PROJECT_DIR" fetch origin --prune --quiet 2>/dev/null || true
  AHEAD_COUNT=$(git -C "$PROJECT_DIR" rev-list --count HEAD..origin/main 2>/dev/null || echo "")
  if [ -n "$AHEAD_COUNT" ] && [ "$AHEAD_COUNT" -gt 0 ] 2>/dev/null; then
    echo ""
    echo "🔴 main 領先本分支 $AHEAD_COUNT 個 commit——你嘅視野可能過時，其他並行 session 已做咗嘢："
    git -C "$PROJECT_DIR" log HEAD..origin/main --oneline 2>/dev/null | head -10
    echo "   → 答「做咗未／進度點／有冇人跟進緊」呢類問題前，先用上面清單核對，唔好單靠本地 handoff/todo 記憶"
  fi

  CURRENT_BRANCH=$(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null)
  OTHER_ACTIVE=$(git -C "$PROJECT_DIR" for-each-ref --sort=-committerdate refs/remotes/origin/claude/ \
    --format='%(refname:short)|%(committerdate:relative)|%(subject)' 2>/dev/null \
    | grep -v "^origin/${CURRENT_BRANCH}|" \
    | awk -F'|' '$2 ~ /second|minute|hour|^1 day |^2 days /' | head -5)
  if [ -n "$OTHER_ACTIVE" ]; then
    echo ""
    echo "🔀 近48小時有動靜嘅其他並行分支（可能同你撞工，落手前留意）："
    echo "$OTHER_ACTIVE" | awk -F'|' '{printf "   • %s（%s）：%s\n", $1, $2, $3}'
  fi

  # T-handoff 新鮮度比對（2026-08-18 新增）：便攜塊係 git 追蹤檔案，內容屬「分支局部」——
  # 其他 session 喺自己分支更新咗 handoff，喺未 merge 之前，本分支讀到嘅永遠係舊版。
  # 上方「分支有動靜」警告只講 commit subject，講唔到「邊條分支嘅交接狀態先係最新」，
  # 故此處獨立比對 handoff.md 本身嘅最後改動時間，直接指出真正權威嗰份喺邊。
  HANDOFF_REL=".fhs/memory/handoff.md"
  MY_HO_TS=$(git -C "$PROJECT_DIR" log -1 --format=%ct HEAD -- "$HANDOFF_REL" 2>/dev/null || echo "")
  if [ -n "$MY_HO_TS" ]; then
    NEWER_HO=$(for _r in $(git -C "$PROJECT_DIR" for-each-ref --format='%(refname:short)' \
                   refs/remotes/origin/main refs/remotes/origin/claude/ 2>/dev/null); do
        [ "$_r" = "origin/${CURRENT_BRANCH}" ] && continue
        _ts=$(git -C "$PROJECT_DIR" log -1 --format=%ct "$_r" -- "$HANDOFF_REL" 2>/dev/null || echo "")
        [ -n "$_ts" ] && [ "$_ts" -gt "$MY_HO_TS" ] 2>/dev/null && echo "$_ts|$_r"
      done | sort -rn | head -3)
    if [ -n "$NEWER_HO" ]; then
      echo ""
      echo "🕒 以下分支嘅 handoff 便攜塊比你手上呢份新——上面顯示嘅交接狀態可能已過時："
      echo "$NEWER_HO" | while IFS='|' read -r _ts _r; do
        _ago=$(git -C "$PROJECT_DIR" log -1 --format='%cr' "$_r" -- "$HANDOFF_REL" 2>/dev/null)
        printf "   • %s（%s）\n" "$_r" "$_ago"
      done
      echo "   → 答「做咗未／進度點」前，先 git show <分支>:$HANDOFF_REL 核對，唔好單信本分支版本"
    fi
  fi
fi

exit 0