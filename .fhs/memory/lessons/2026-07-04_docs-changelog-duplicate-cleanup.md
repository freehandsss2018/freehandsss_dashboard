# docs/CHANGELOG.md 重複檔案清理

**日期**：2026-07-04（Session 138）
**來源**：S137 記憶系統審視時意外發現，另開 session 處理

## 問題

根目錄 `Changelog.md`（git 實際追蹤，4352 行，持續更新至 S137）與 `docs/CHANGELOG.md`（298 行）長期並存。後者由 Session 63（2026-04-10 commit）建立，斷續同步至 S130 Phase B（2026-07-01）後完全停更，S131–S137 六個 session 的內容完全缺漏。frontmatter 宣稱 `last_updated: 2026-06-05`，比自己內文最新的 S130 條目（2026-07-01）還舊，暴露編輯紀律低落。

## 診斷步驟

1. 讀兩檔全文，比對起始版本、最新條目、更新頻率。
2. Grep 全 repo 搜尋 `docs/CHANGELOG.md` 路徑引用——確認 `docs/repo-map.md`、`README.md` 均無引用（孤兒檔案）；唯一命中為 `.fhs/ai/FHS_Product_Cost_Operations.md` Stage 4（未執行草案）計畫表。
3. `git log --oneline -- docs/CHANGELOG.md` 確認建立源頭與最後修改 commit，佐證「分岔複本」而非「獨立用途摘要版」的判斷。

## 修復

- 備份原檔 → `git rm -f docs/CHANGELOG.md`
- 更新 `docs/repo-map.md`（原本連樹狀圖裡都沒把這個檔案列出——地圖本身不完整，不只是缺跨連結）
- 改正 `.fhs/ai/FHS_Product_Cost_Operations.md` Stage 4 表格的引用指向根目錄 `Changelog.md`
- `decisions.md` 補決策記錄

## 可複用教訓

判斷文件是否過時 / 停更，不能只看 frontmatter 的 `last_updated`／`version` 欄位，必須比對其**最新一條實際內文日期**——metadata 可能比內容本身還舊。另外，`repo-map.md` 作為系統地圖，新增/刪除檔案後必須連樹狀圖本身也同步，不能只用關鍵字搜尋確認「有沒有被提到」就當作已完整索引。

見 [[2026-07-04_docs-changelog-duplicate-cleanup]] learnings.md Pitfall #25。
