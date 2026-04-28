# /commit（任務完成 · 全包一條龍）
> Version: v2.0.0 (2026-04-28) — 新增 Phase 0 Pre-Commit Sweep

用途：任務完成時一鍵執行——提交前健全掃描 + 記憶同步 + 雲端備份 + Git 推送。

觸發關鍵字（自動偵測）：
「commit」「收工」「任務完成」「同步記憶」「備份大腦」

---

執行步驟：

【第零階段：Pre-Commit Sweep（提交前健全掃描）】

> 目標：在任何 git 操作前，確保系統接通、文件同步、無沉積幽靈、無衝突。
> 若 🔴 項目出現 → 立即停止，修復後才能繼續。
> 若 🟡 項目出現 → 列出，詢問 Fat Mo 確認後繼續。

**P0.1 系統接通確認（Hook + Subagent）**
執行以下檢查（使用 Glob/Bash，不修改任何檔案）：

Hook 腳本接通：
- scripts/hooks/session-start-sop.sh 是否存在？
- scripts/hooks/prompt-router.js 是否存在？
- scripts/hooks/pre-tool-guard.js 是否存在？
- .claude/settings.json 是否含 `hooks` 區段？

Subagent Runtime 接通：
- ~/.claude/agents/freehandsss/ 是否有以下全部 6 個 agent？
  ui-designer.md / frontend-developer.md / code-reviewer.md /
  database-reviewer.md / tdd-guide.md / build-error-resolver.md
- 每個 agent 文件大小是否 > 0？

🔴 任一缺失 → 立即停止，輸出「❌ 系統接通失敗：[缺失項]，請修復後再 commit」
✅ 全部通過 → 繼續 P0.2

**P0.2 README & repo-map 同步確認**
執行：`git status --short`，分析本次 staged + modified 的檔案清單

- 若有新增或刪除任何目錄/檔案 → 確認 docs/repo-map.md 已在本 session 更新
- 若有修改 scripts/ 下任何腳本 → 確認 scripts/README.md 反映此變更
- 若有修改 .fhs/ai/commands/ → 確認 docs/repo-map.md 已反映
- 若有修改 Freehandsss_Dashboard/ HTML → 確認 Freehandsss_Dashboard/README.md 已反映

🟡 發現未同步 → 列出差距，詢問 Fat Mo：「以下文件可能需要更新，是否補做？[清單]」
✅ 全部同步 → 繼續 P0.3

**P0.3 沉積快速掃描**
執行掃描（使用 Glob，不修改）：

- 根目錄：偵測 test_*.js/py/html、fix_*.js/py、clean_*.js、*_temp.*、*_draft.*
- tmp/：列出所有存在的檔案（應為空）
- .fhs/memory/lessons/：檔名含 `_temp` 或 `_draft` 的日誌

🟡 發現沉積 → 列出所有發現項，詢問 Fat Mo：「以下疑似沉積檔案，是否清除？[清單]」
   ⚠️ 不得自動刪除，必須等 Fat Mo 確認
✅ 無沉積 → 繼續 P0.4

**P0.4 幽靈偵測**
- 比對 .fhs/ai/commands/ 所有 .md 指令 vs .claude/commands/ 橋接版
  → 若 Master 有但 Bridge 無：列為幽靈指令（執行不到）
- 比對 scripts/ 所有腳本 vs scripts/README.md 中的記錄
  → 若腳本存在但 README 未記錄：列為幽靈腳本
- 確認 .fhs/ai/subagents/freehandsss/ 中每個 agent 都在 MANIFEST.md 有記錄

🟡 發現幽靈 → 列出，詢問 Fat Mo 是否補文件或刪除
✅ 無幽靈 → 繼續 P0.5

**P0.5 衝突與遺漏確認**
- Changelog.md 最後記錄是否為今日（若本 session 有代碼/制度改動）
- .fhs/memory/handoff.md 是否已在本 session 更新（時間戳確認）
- .fhs/notes/decisions.md 是否需要更新（若本次有架構改動）
- 確認 git staging 中無 .env 真實值（雙重保護，Phase 2 也會再查）

🔴 Changelog/handoff 完全未更新但有實質改動 → 阻止，必須先補寫再 commit
🟡 decisions.md 可能需更新 → 詢問確認
✅ 全部確認 → 輸出 Pre-Commit Sweep 結果摘要，進入 Phase 1

---

**P0 輸出格式（掃描結果摘要）**：
```
═══ Pre-Commit Sweep 結果 ═══
P0.1 系統接通    ✅ / 🔴 [問題]
P0.2 文件同步    ✅ / 🟡 [差距清單]
P0.3 沉積掃描    ✅ / 🟡 [發現清單]
P0.4 幽靈偵測    ✅ / 🟡 [孤獨清單]
P0.5 衝突確認    ✅ / 🔴🟡 [問題]
═══════════════════════════
[全綠：繼續執行] / [有🔴：停止修復] / [有🟡：詢問後繼續]
```

---

【第一階段：Memory Engine 同步】

1. 將本次教訓整理，寫入 .fhs/memory/lessons/YYYY-MM-DD_主題.md
2. 更新 .fhs/memory/handoff.md（核心狀態快照）—— 格式強制如下：

   # FHS Handoff - YYYY-MM-DD HH:MM
   當前版本：vX.Y.Z（憲法層）/ VXX.X.X（UI層）

   ## 本次 Session 完成事項
   [本次任務完成事項，如實描述，禁止虛報「100% 潔淨」]

   ## 待辦 ⏳ 項目
   [列出所有待處理項目；若無，寫「無」]

   ## 核心配置
   [系統關鍵路徑與配置摘要]

   ⚠️ 缺少上述格式任一區段 → /commit 視為未完成，禁止繼續

3. 執行 node scripts/Sync_Notion_Brain.js
4. 更新 .fhs/notes/session-log.md
5. 回報：「✅ Memory Engine 同步完成」

【第二階段：Git 推送】

6. 執行 git add .
7. 執行 git status，執行安全確認：
   - .env 出現在 staging？→ 立即 git reset HEAD .env 並警告
   - 大型檔案 > 10MB？→ 暫停並提示
   - artifacts/ 目錄是否已在 .gitignore？→ 確認
8. 安全確認通過後執行：
   git commit -m "chore: Memory Engine sync + session checkpoint [YYYY-MM-DD]"
9. git push
10. 回報：「✅ Git 推送完成，GitHub 已更新」

【第三階段：完成回報】

11. 輸出以下格式：

========================================
✅ /commit 全包完成
時間：YYYY-MM-DD HH:MM
========================================
Pre-Commit Sweep      ✅ (P0.1–P0.5)
Memory Engine 同步    ✅
Notion 上雲           ✅
handoff.md 更新       ✅
session-log.md 更新   ✅
git add               ✅
git commit            ✅
git push              ✅
========================================
雲端大腦 + GitHub 雙備份完成。收工！

異常處理：
- P0 發現 🔴 → 停止所有後續步驟，輸出修復清單
- P0 發現 🟡 → 逐一詢問 Fat Mo，確認後繼續
- .env 出現在 staging → 立即 reset，警告 Fat Mo，暫停 git push
- Notion API 失敗 → 本地保存，繼續執行 git push，事後提示補同步
- git push 失敗 → 回報錯誤訊息，不重試，等待 Fat Mo 指示
