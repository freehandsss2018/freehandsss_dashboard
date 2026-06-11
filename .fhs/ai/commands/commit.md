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
- **Subagents**: 確認 `~/.claude/agents/freehandsss/` 下 8 個主要 agent 存在且非空。
- **🔴 失敗處理**：輸出「❌ 系統接通失敗」，指明缺失項並停止。

### P0.2 文件同步映射
若發生變更，須確認以下對應文件已同步更新：
- `scripts/**` ↔ `scripts/README.md`
- `.fhs/ai/commands/**` ↔ `docs/repo-map.md`
- `Freehandsss_Dashboard/**` ↔ `Freehandsss_Dashboard/README.md`
- 新增/刪除目錄 ↔ `docs/repo-map.md`
- **🟡 警告**：列出未同步清單並確認。

### P0.3 沉積掃描
- **Git Check**: 執行 `git status` 辨識疑似臨時檔 (test_*, fix_*, *_temp, *_draft)。
- **🟡 警告**：列出發現項，確認是否清除。

### P0.4 幽靈偵測
- **Ghost Check**: 比對 `.fhs/ai/commands/` (Master) vs `.claude/commands/` (Bridge)。
- **🟡 警告**：列出發現項，確認是否補全指令橋接。

### P0.5 狀態一致性
- **Changelog.md** & **handoff.md**: 確保在本 session 已更新（若有代碼改動）。
- **.env**: 嚴禁 Staging 包含真實 API Keys。
- **🔴 失敗**：手動改動後未更 Changelog/Handoff 則禁止 commit。

### P0.6 MASTER 待辦同步（新，2026-06-11）
- 讀取 handoff.md 頂部「📋 MASTER 持續待辦」區塊。
- 將本 session 已完成的項目從表中移至「已確認完成」清單。
- 若本 session 產生新待辦，追加至表格。
- **🟡 警告**：MASTER 區塊若不存在，立即補建後繼續。
- 目的：解決 append-only 歷史積壓導致「持續待辦永遠不更新」的系統性漏洞。

---

## 【Phase 1: Memory Engine 同步】
1. **Lessons**: 寫入 `.fhs/memory/lessons/YYYY-MM-DD_主題.md`。
2. **Handoff**: 更新 `.fhs/memory/handoff.md` (強制包含：版本、完成事項、待辦、核心配置)。
   每個 session 完成事項末尾必須附上 **Subagent 使用記錄** 表格（格式見 execute.md [E]）。
3. **Notion**: 執行 `node scripts/Sync_Notion_Brain.js`。
4. **Logs**: 更新 `.fhs/notes/session-log.md`。
5. **Learnings Distillation**: 自動判斷本次會話是否需要 distill Lesson 至 `.fhs/memory/learnings.md`（見 Phase 1.5）。

## 【Phase 1.5: Lesson Distillation 自動判斷】

判斷本次會話是否需要 distill Lesson。ONLY 在以下條件滿足時執行：

### 【Pattern 條件】（成功反覆驗證的做法）
- ✓ 本次會話改進了多個 session 都在用的技術模式
- ✓ 該模式已通過至少 2 次以上的不同場景驗證
- *例*：「同步進度輪詢機制」、「四端同步隔離」— 都是跨多個 session 驗證的

### 【Pitfall 條件】（重複踩過的雷）
- ✓ 本次會話的根本問題已被其他 session 踩過，或被文件記錄為 handoff 待辦項
- ✓ 該問題有明確的「預防檢查清單」或「修復方案」
- ✓ 未來新產品/功能很可能會踩到同一個坑
- *例*：「Smart Cache COST_MAP 硬編碼表遺漏」— 對應 handoff #1、P7 pitfall，新 SKU 都會遇到

### 【Preference 條件】（Fat Mo 已確認的偏好）
- ✓ 本次會話涉及架構決策，且 Fat Mo 明確確認了方向
- ✓ 該決策不是臨時的，而是未來多個類似情況都適用
- *例*：「橋接版禁止含邏輯」、「最小改動優先」— 都是跨多個會話的決策方向

### 【執行流程】
1. 檢查本次會話的改動是否屬於上述三種之一 → 若否：靜默跳過
2. 若是 → 檢查 `.fhs/memory/learnings.md` 是否已有相同或相似條目（避免重複）
3. 若無重複 → 寫入 1 條內容（≤150 字元含日期來源）
4. 在 Phase 3 完成報告中註明：「✅ Lesson: [Pattern/Pitfall/Preference] — [選擇原因]」

---

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

