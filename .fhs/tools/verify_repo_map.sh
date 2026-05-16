#!/bin/bash
# FHS Repo-Map Verification Tool
# 驗證 docs/repo-map.md 與實際檔案結構的一致性
# Usage: bash .fhs/tools/verify_repo_map.sh

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🔍 FHS Repo-Map 驗證工具 — Phase 4 自動化"
echo "═══════════════════════════════════════════════════════════"
echo ""

REPO_MAP="docs/repo-map.md"
ERRORS=0
WARNINGS=0

# 檢查 1: 驗證所有引用的檔案是否存在
echo "📋 檢查 1: 驗證文件參考"
echo "---"

# 從 repo-map 中提取所有檔案參考（簡單模式）
REFERENCED_FILES=$(grep -o '`[^`]*\.md`' "$REPO_MAP" | sed 's/[`]//g' | sort | uniq)

for file in $REFERENCED_FILES; do
    if [ ! -f "$file" ]; then
        echo "❌ 缺失檔案: $file"
        ((ERRORS++))
    else
        echo "✅ 存在: $file"
    fi
done

echo ""
echo "📋 檢查 2: 驗證版本號一致性"
echo "---"

# 檢查 AGENTS.md 版本 (格式: > Version: v1.4.5)
AGENTS_VERSION=$(grep "^> Version:" .fhs/ai/AGENTS.md 2>/dev/null | head -1 | grep -o "v[0-9.]*" || echo "unknown")
echo "📌 AGENTS.md 版本: $AGENTS_VERSION"

# 檢查各 README 中的 AGENTS 版本參考
for readme in README.md docs/README.md .fhs/ai/README.md Freehandsss_Dashboard/README.md; do
    if [ -f "$readme" ]; then
        VERSION=$(grep -o "AGENTS.md.*v[0-9.]*" "$readme" 2>/dev/null | head -1 | grep -o "v[0-9.]*" || echo "none")
        if [ "$VERSION" != "$AGENTS_VERSION" ] && [ "$VERSION" != "none" ]; then
            echo "⚠️  $readme: 版本不符 (找到: $VERSION, 應為: $AGENTS_VERSION)"
            ((WARNINGS++))
        else
            echo "✅ $readme: $VERSION"
        fi
    fi
done

echo ""
echo "📋 檢查 3: 檢查過時檔案標記"
echo "---"

# 檢查過時檔案是否有標記
OBSOLETE_MARKERS=("已過時" "已由" "取代" "⚠️")
for marker in "${OBSOLETE_MARKERS[@]}"; do
    if grep -q "Triple_Sync.*$marker\|GLOBAL_AI_SOP.*$marker" "$REPO_MAP"; then
        echo "✅ Triple_Sync/GLOBAL_AI_SOP 已標記為過時"
        break
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 驗證結果"
echo "═══════════════════════════════════════════════════════════"
echo "❌ 錯誤: $ERRORS"
echo "⚠️  警告: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ repo-map.md 驗證通過！"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  驗證通過但有警告，需要檢查版本一致性"
    exit 0
else
    echo "❌ 驗證失敗，請修正上述問題"
    exit 1
fi
