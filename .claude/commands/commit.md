# /commit（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/commit.md](/.fhs/ai/commands/commit.md)

### 流程摘要（v2.6.0）：
0. **Phase 0 — Pre-Commit Sweep**（5 項健全掃描，任一 🔴 立即停止）
   - P0.1 系統接通確認（hooks 腳本 + subagent 文件）
   - P0.2 README & repo-map 同步確認
   - P0.3 沉積快速掃描（temp/draft 殘留）
   - P0.4 幽靈偵測（Bridge vs Master 指令、腳本 vs README）
   - P0.5 衝突與遺漏確認（Changelog、handoff、.env 安全）
1. **Phase 1 — Memory Engine 同步**（lessons + handoff + Notion + session-log）
1.5 **Lesson Distillation 自動判斷**（Pattern / Pitfall / Preference 清單式判斷）
2. **Phase 2 — Git 推送**（add → status 安全確認 → commit → push）
2.5 **Phase 2.5 — 條件觸發升格部署**（新，S168，AGENTS.md v1.7.0 授權途徑c）：自動偵測本次 commit 是否改動 `Freehandsss_Dashboard/freehandsss_dashboardV*.html`，有改動才續走 upload-web 升格部署（跳過二次確認）+ 三關驗證；沒有則跳過，兩種結果皆不再詢問
2.6 **Phase 2.6 — 主線同步**（新，2026-09-05，D70）：push 完之後嘗試將目前分支 fast-forward-only 合併落 `main`；main 已被其他並行分支搶先郁過（非快進）則跳過並回報需人手 merge/PR，唔做衝突自動解決唔強推
3. **Phase 3 — 完成回報**（格式化輸出＋強制三段式摘要：已完成／點運作／點維護，簡短直白）

異常處理：🔴 停止修復 → 🟡 詢問 Fat Mo → ✅ 繼續執行
