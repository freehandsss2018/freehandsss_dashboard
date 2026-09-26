# S149 Phase 4 — 新專案乾跑演練

- 日期：2026-09-26
- 模板 repo：`D:\SynologyDrive\AI_Governance_Template`，v0.1.0，commit `5ee17ca`
- 活體來源分支：`codex/s149-phase345`，Phase 3 commit `4b0b617`
- Fresh-context 盲測：只按模板 README，在 `.fhs-local/s149-phase4-blind/.audit-final-fresh` 新專案執行；未讀活體計畫或 `template-src/`。
- 結論：**PASS-with-fixes；修正後 9/9 PASS**。

| # | 驗收項 | 結果及證據 |
|---|---|---|
| 1 | SessionStart 快照 | PASS。乾淨 HOME 下 `node scripts/hooks/session-start-sop.js` 真實打印 7 行 fenced handoff，exit 0；settings 指向同一 Node 腳本。 |
| 2 | Fixtures | PASS。匯出後四套 runner：guard 5/5、kgov 10/10、health 3/3、handoff gate 3/3。 |
| 3 | 橋接 | PASS。`node scripts/generate-bridges.js` 生成 `.claude/commands/` 與 `.agents/skills/` 各 8 支。 |
| 4 | `/read` | PASS。通用 `.fhs/notes/SOP_NOW.md` 存在，bootstrap 代入專案資料；read master 可依序讀 handoff、memory、AGENTS。 |
| 5 | 便攜塊 | PASS。SessionStart 只抽 `─── 便攜邊界` 前內容。 |
| 6 | ≤10 分鐘 bootstrap | PASS。fresh copy、bootstrap、橋接及四套 runner 核心流程 4.15 秒；README 人工檢視和填 handoff 步驟可於 10 分鐘內完成。實際業務來源裁決時間不計。 |
| 7 | README 盲測 | PASS。Fresh agent 只依獨立模板 README，無參考活體 repo。 |
| 8 | 跨裝置 SOP | PASS。README 列交接日期、目標、證據、下一步、branch/commit 比對及其他 branch 檢查。 |
| 9 | agents/hooks 來源 | PASS。乾淨 HOME 無舊專案 agents/hooks；settings 五個 hook 目標均在新 checkout。guard 對 force push exit 2、普通命令 exit 0。 |

## 盲測揪出的缺陷與修正

1. `/read` 指向缺失的 `SOP_NOW.md`，新專案必定停跑；已加入通用骨架並重測。
2. Windows 上 Bash PATH 缺 `awk` 時舊 SessionStart 腳本 exit 0 卻錯報缺便攜塊；設定改用跨平台 Node 入口，日期比較採本地日期；已重測真實輸出。
3. README 曾強制 `npm install`，離線新機因 registry 無法存取而卡住；核心 bootstrap 改為零下載，`npm install` 只供選用 API runner。另加入 `.gitignore` 保護 `.env` 和本地輸出。

## 驗收邊界

未登入啟動 Claude Code 互動 session；第 1、9 項以實際 hook 命令輸出、乾淨 HOME 和 settings 來源核對。未測可選 API runner 的真實第三方服務呼叫。

【交付前雙紀律自檢】
驗收：fresh-context agent 9/9；匯出模板 69 檔、manifest 39/39、黑名單 0 hits（合成正例 PASS）；四套 runner 全 PASS。
Subagent：Phase 4 fresh-context 盲測 agent ×1，結論 PASS-with-fixes，修正後 9/9 PASS。
