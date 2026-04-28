# FHS 記憶層

## 目錄說明
| 路徑 | 用途 |
|---|---|
| handoff.md | 跨 Session 核心狀態快照，每次 /commit 更新 |
| lessons/ | AI 教訓庫，所有學習記錄存放於此 |

## 同步機制
lessons/ 下所有 .md 檔案由 scripts/Sync_Notion_Brain.js V2.0
Auto-Discovery 自動掃描並同步至 Notion 雲端大腦。
新增教訓無需手動登記，系統自動偵測。

## 命名規範
lessons/ 下的檔案命名格式：YYYY-MM-DD_主題描述.md
臨時草稿請加後綴：_temp 或 _draft（90天後會被 /commit 提示清理）
