# /commit（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/commit.md](/.fhs/ai/commands/commit.md)

### 流程摘要（v2.0.0）：
0. **Phase 0 — Pre-Commit Sweep**（5 項健全掃描，任一 🔴 立即停止）
   - P0.1 系統接通確認（hooks 腳本 + subagent 文件）
   - P0.2 README & repo-map 同步確認
   - P0.3 沉積快速掃描（temp/draft 殘留）
   - P0.4 幽靈偵測（Bridge vs Master 指令、腳本 vs README）
   - P0.5 衝突與遺漏確認（Changelog、handoff、.env 安全）
1. **Phase 1 — Memory Engine 同步**（lessons + handoff + Notion + session-log）
2. **Phase 2 — Git 推送**（add → status 安全確認 → commit → push）
3. **Phase 3 — 完成回報**（格式化輸出）

異常處理：🔴 停止修復 → 🟡 詢問 Fat Mo → ✅ 繼續執行
