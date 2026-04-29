# /commit (任務完成 · 全包一條龍)
> Version: v2.1.0 (2026-04-28) | Optimized for Token Efficiency
> 本指令為任務完成之單一入口：包含掃描、同步、備份與推送。

## 🧩 執行標準 (General Rules)
- **🔴 項目失敗**：立即中斷任務，輸出錯誤並等待修復。
- **🟡 項目警告**：列出清單，詢問 Fat Mo 確認後方可繼續。
- **✅ 項目成功**：靜默通過，記錄於最後報告。

---

## 【Phase 0: Pre-Commit Sweep (健全掃描)】

### P0.1 系統接通確認
- **Hooks**: 確認 `scripts/hooks/` (session-start-sop.sh, prompt-router.js, pre-tool-guard.js) 與 `.claude/settings.json` 存在。
- **Subagents**: 確認 `~/.claude/agents/freehandsss/` 下 6 個主要 agent 存在且非空。
- **🔴 失敗處理**：輸出「❌ 系統接通失敗」，指明缺失項並停止。

### P0.2 文件同步映射
若發生變更，須確認以下對應文件已同步更新：
- `scripts/**` ↔ `scripts/README.md`
- `.fhs/ai/commands/**` ↔ `docs/repo-map.md`
- `Freehandsss_Dashboard/**` ↔ `Freehandsss_Dashboard/README.md`
- 新增/刪除目錄 ↔ `docs/repo-map.md`
- **🟡 警告**：列出未同步清單並確認。

### P0.3 沉積與幽靈偵測
- **Git Check**: 執行 `git status` 辨識疑似臨時檔 (test_*, fix_*, *_temp, *_draft)。
- **Ghost Check**: 比對 `.fhs/ai/commands/` (Master) vs `.claude/commands/` (Bridge)。
- **🟡 警告**：列出發現項，確認是否清除或補全。

### P0.4 狀態一致性
- **Changelog.md** & **handoff.md**: 確保在本 session 已更新（若有代碼改動）。
- **.env**: 嚴禁 Staging 包含真實 API Keys。
- **🔴 失敗**：手動改動後未更 Changelog/Handoff 則禁止 commit。

---

## 【Phase 1: Memory Engine 同步】
1. **Lessons**: 寫入 `.fhs/memory/lessons/YYYY-MM-DD_主題.md`。
2. **Handoff**: 更新 `.fhs/memory/handoff.md` (強制包含：版本、完成事項、待辦、核心配置)。
3. **Notion**: 執行 `node scripts/Sync_Notion_Brain.js`。
4. **Logs**: 更新 `.fhs/notes/session-log.md`。

## 【Phase 2: Git 推送與安全】
1. **Staging**: `git add .` -> `git status`。
2. **Safety**: 若出現 `.env` 則立即 `git reset HEAD .env` 並警告。
3. **Push**: `git commit -m "chore: sync [YYYY-MM-DD]"` -> `git push`。

---

## 【Phase 3: 完成回報】
輸出格式如下：
```text
✅ /commit 全包完成 [YYYY-MM-DD HH:MM]
- Pre-Commit Sweep: ✅
- Memory Engine: ✅ (Notion + Handoff)
- Git Operation: ✅ (Commit + Push)
雲端大腦 + GitHub 雙備份完成。收工！
```
✅ / 🟡 [差距清單]
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
