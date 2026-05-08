# Lesson — 2026-05-09 Skill Import & Report Unification

## 1. External Skill 評估教訓

### obra/superpowers 誤判
**A2 誤判**：假設 superpowers 含有 shell scripts（.sh 檔）。
**實際**：純 markdown prompt skills，與 FHS `.fhs/ai/commands/` 系統完全相同機制。
**正確做法**：先用 GitHub API `/contents` 確認真實目錄結構，再做評估。

### hesreallyhim/awesome-claude-code 誤判
**A2 誤判**：視為「可安裝框架」，估計 7-10 週 TypeScript 建設工期。
**實際**：200+ 項目的策展連結目錄，無需安裝，逐項取用即可。
**正確做法**：先看 README 確認 repository 性質，再評估工作量。

### raw.githubusercontent.com 路徑失效
多個 `/five`、`/mermaid`、`read-only-postgres` 來源連結回傳 404。
**解法**：用 GitHub Contents API `https://api.github.com/repos/{owner}/{repo}/contents/{path}` 探索正確路徑。若仍無法取得，基於功能說明自行撰寫 FHS 適配版本。

## 2. Vendor-in 策略確認

外部 skill 不能以連結方式依賴（外部可能刪除/改版），必須：
- 複製 .md 內容至 `.fhs/ai/skills/vendor/{source}/`
- 新增 frontmatter 記錄來源與 vendor_date
- 建立 Master 指令（`.fhs/ai/commands/`）+ Bridge（`.claude/commands/`）雙層

## 3. 報告路徑統一教訓

**症狀**：ai_reports、aireports、completion_reports 三個資料夾並存，命名不一致，指令輸出分散。
**原因**：每次新增功能時各自命名，無統一規範。
**解法**：
- 統一至 `.fhs/reports/`，明確子目錄 planning/ audits/system/ audits/cost/ incidents/ completion/
- 同步更新所有指令的輸出路徑 — 需更新 19 個檔案，提前用 `grep -r` 找齊比逐一手動更完整
- `git mv` 保留歷史，避免 git 認為檔案被刪除後重新建立

## 4. Ghost Check 程序價值

/commit Phase 0 P0.4 Ghost Check 正確識別了 6 個 `.claude/commands/` 橋接檔沒有對應 Master。
及早發現避免了日後「指令存在但找不到權威定義」的維護問題。
