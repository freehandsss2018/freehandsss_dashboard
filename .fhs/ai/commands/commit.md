# /commit (任務完成 · 全包一條龍)
> Version: v2.3.0 (2026-07-12, Session 168) | 新增 Phase 2.5 條件觸發升格部署鏈（AGENTS.md v1.7.0 授權途徑c，先偵測 Dashboard HTML 是否有改動才部署）
> 本指令為任務完成之單一入口：包含掃描、同步、備份、推送、（視偵測結果）升格部署。

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

### P0.7 便攜摘要塊更新（新，2026-06-23）
- 讀取 handoff.md **最頂部** ` ```handoff ` 便攜塊，逐一核對六類欄位是否反映本 session 最新狀態：
  - `🎯 目標` — 若工作線已轉移，更新
  - `✅ 已定決策` — 本 session 有新拍板決策，追加（保留舊條，加 session 號）
  - `🔬 驗證` — 把本 session「已證實」移入「已證實」清單；新「未驗」加入
  - `📋 待辦` — 對應 P0.6 MASTER 表最高優先 3 條
  - `➡️ 下一步` — 下個 session 第一個行動
  - `更新: <日期> / S<session號>` — 必須更新至今日日期
- **若本 session 無任何狀態改變**（純查詢 session）→ 只更新日期即可。
- **🟡 警告**：便攜塊若不存在，依 decisions.md Session 118 SSOT 機制補建後繼續。
- 目的：確保人類複製（外部聊天）與 hook 自動注入（AI session）始終同源不 drift。

### P0.7.1 便攜塊體積預算（新，2026-07-04 Session 141 防回胖）
- **背景**：便攜塊設計初衷為 hook 每 session 輕量注入（原估 ~300 tokens），但因「✅ 已定決策」逐 session 只追加不精簡，Session 140 實測動態段已膨脹至 7,787 bytes（~3,500 tokens），超出設計值 10 倍以上。
- **預算**：動態段（hook 抽取的邊界以上部分）目標 **≤ 4,000 bytes**。
- **輪轉規則**：`/commit` 執行 P0.7 時，若「✅ 已定決策」條目數 > 20 條，將**最舊**且已於 `decisions.md`/`AGENTS.md`/本檔 MASTER 待辦表**有完整記錄**的決策，壓縮為「一行摘要＋連結」；若查無其他完整記錄，搬移全文至 `.fhs/memory/archive/handoff-portable-block-decisions-<日期>.md` 並留一行摘要＋連結（禁止直接刪除不留痕）。「🔬 驗證」欄同理，只留最近 3 個 session 的「已證實」項，較舊者搬移至 `.fhs/memory/archive/handoff-portable-block-verified-<日期>.md`；「未驗」項無論哪個 session 一律保留（代表仍是待辦）。「📋 待辦」欄已完成（✅）項若下方 MASTER 表已有對應記錄，直接移除（非歸檔，因 MASTER 表本身即完整記錄，同檔內重複才需清除而非搬移）。
- **不得壓縮**：「⚠️ 易猜錯」欄（踩坑教訓性質，全保留）；本 session 產生的新決策/驗證/待辦（只精簡「舊」的，不精簡「當次」的）。

---

## 【Phase 1: Memory Engine 同步】
1. **Lessons**: 寫入 `.fhs/memory/lessons/YYYY-MM-DD_主題.md`。
2. **Handoff**: 更新 `.fhs/memory/handoff.md` (強制包含：版本、完成事項、待辦、核心配置)。
   每個 session 完成事項末尾必須附上 **Subagent 使用記錄** 表格（格式見 execute.md [E]）。
3. **Notion**: 執行 `node scripts/Sync_Notion_Brain.js`。
4. **Logs**: 更新 `.fhs/notes/session-log.md`。
5. **Learnings Distillation**: 自動判斷本次會話是否需要 distill Lesson 至 `.fhs/memory/learnings.md`（見 Phase 1.5）。

### 【Phase 1.6 敘事單源分級合約（新，2026-07-05 Session 144）】
> **背景**：同一件事同時寫進 handoff session 條目、MASTER 表、session-log、Changelog、completion report 五處，是 S142「MASTER 表遺留 drift」與 S143「/commit 補跑」兩次事故的根因——寫得越多處，越容易漏同步。本節不免除 §3「交接強制」的寫入義務，只約束**寫多細**。

**分級規則**（二選一，依任務規模判斷）：
- **(a) 有 `.fhs/reports/completion/` 完成報告的任務**（制度層變動/[B]觸發）：完成報告＝**唯一全文居所**。`Changelog.md`、`session-log.md`、handoff MASTER 表對應行，一律**≤3 行摘要 + 連結指回該報告**，不得重複展開細節。
- **(b) 無完成報告的小改動**（如純清理、單點修復）：`Changelog.md` 條目本身即**全文居所**（不設行數上限），其餘處（session-log/handoff）只需一行摘要 + 連結指回 Changelog 對應條目。

**判準**：先問「這件事有沒有觸發 execute.md [B]（制度層變動）」→ 有 → 走 (a)；沒有 → 走 (b)。不存在「兩處都寫全文」的第三種情況。

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

## 【Phase 2.5: 自動升格部署（條件觸發，2026-07-12 Session 168，AGENTS.md v1.7.0 授權途徑c）】
> **先偵測、後執行、不再詢問**：Fat Mo 執行 `/commit` 本身即構成「有條件」授權（AGENTS.md §3 授權途徑 c）。AI 先自動判斷本次是否需要部署，需要則直接續走部署鏈，不需要則只做 commit+push——兩種結果皆不再另外詢問確認。

1. **偵測是否需要部署**：`git diff --cached --name-only`（或本次已知改動清單）是否包含 `Freehandsss_Dashboard/freehandsss_dashboardV*.html`（dev 版原始檔，非 `current.html` 本身）。
   - **有**改動該檔案 → 判定「需要部署」，繼續下方步驟 2-6。
   - **沒有**改動（純文件/治理/migration/n8n/其他 scripts 改動）→ 判定「不需要部署」，Phase 2.5 到此結束，直接進 Phase 3 回報，並註明「本次未改動 Dashboard HTML，已跳過部署」。
2. 依 `upload-web.md` 無參數流程執行：偵測 `Freehandsss_Dashboard/` 內版本號最高的 `freehandsss_dashboardV*.html` → **跳過該檔案原本的 Step 1 二次確認**（已由途徑c預先授權）→ AI 自建 `.fhs/.deploy-ok`（純 ISO timestamp 字串，見 learnings.md #28，禁夾帶說明文字）→ cp 升格為 `Freehandsss_dashboard_current.html`。
3. 執行 `scripts/upload-web.ps1 current -Force` 完成 NAS 部署，三關驗證（HTTP 200 / Content-Length 相符 / SHA256 相符）不可省略——**任一關失敗則視為部署失敗**，回報 Fat Mo，不得回頭跳過驗證強行視為成功。
4. 部署前置 `/fhs-check`（Step 0）仍需執行；若命中**已有先例裁決不阻擋部署的已知外部限制**（如 Airtable API 429 額度用盡類的 PRICE_AUDIT FAIL），比照先例繼續部署並在回報中註明；若是**新出現**的 Red Flag（非既有已裁決先例），停止部署並回報，不得比照舊例擅自放行。
5. `git add` 補上 `Freehandsss_Dashboard/Freehandsss_dashboard_current.html` + `.fhs/notes/deploy-log.md`（hook 自動追加）→ 追加一個部署 commit → push。
6. 回報格式併入 Phase 3（見下），額外附上傳三關結果 + 公開網址。

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

