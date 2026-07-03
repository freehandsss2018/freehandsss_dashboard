# FHS Cowork 模式治理替代方案

**Flow ID**: 2026-07-03-0014
**計劃版本**: cl-final-plan-v2.3 Phase 2.2
**建立日期**: 2026-07-03
**狀態**: 生效中

---

## 背景

Claude Desktop App 的 Cowork 模式**不執行**專案 hooks（SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/Stop）與 slash commands。P6–P8 探針已實測確認：

| 探針 | 結果 |
|---|---|
| P6 資料夾讀取 | ✅ 過——dot-folder 可讀，CLAUDE.md 自動成為 Project Instructions |
| P7 寫入邊界 | ⚠️ **可寫入**——技術上無限制，靠紀律約束 |
| P8 MCP 來源 | ❌ 不繼承 `.mcp.json`——需 claude.ai remote connector（已授權 Supabase） |

因此 Cowork 是**治理真空環境**：沒有 kgov 落盤、沒有財務守衛、沒有 handoff 自動注入。本文件是補償設計。

---

## 一、開場協議（補 SessionStart 缺口）

Cowork 每次新對話**不會**自動顯示 handoff 摘要（不同於 Code 分頁 P1 已驗證的自動注入）。

**開場動作**：
1. 開新 Cowork 對話時，先讀 `.fhs/memory/handoff.md` 便攜塊（`\`\`\`handoff` 至邊界線之間的內容）
2. 若不確定當前狀態，第一句先問：「讀一下 .fhs/memory/handoff.md 的便攜塊，告訴我目前狀態」

---

## 二、讀寫分工（補 PreToolUse 財務守衛缺口）

**核心原則**：Cowork = 讀 / 分析 / 規劃；**寫入動作一律回 Code 分頁執行**。

依 `FHS_Mode_Card.md` 單一寫者矩陣：

| 檔案類別 | Cowork 可否寫 |
|---|---|
| `.fhs/memory/` + `.fhs/notes/`（handoff/decisions/learnings） | ❌ 只讀 |
| 財務六檔 / Dashboard HTML / migrations | ❌ 絕對禁止 |
| `.claude/skills/`（活體 master） | ❌ |
| 一般草稿/暫存分析文件 | ⚠️ 可寫，但落地決策前需人審 |

P7 已證實 Cowork **技術上無寫入限制**——這條防線純靠使用紀律執行，沒有系統強制。

---

## 三、落盤紀律（補 kgov 缺口）

Cowork 產出的任何決策、分析結論、方案，**不會自動落 `decisions.md`/`learnings.md`**（kgov PostToolUse/Stop hook 在 Cowork 不觸發）。

**紀律**：
1. Cowork 討論出結論後，把結論**帶回 Desktop Code 分頁**（或 CLI）
2. 在 Code 分頁執行落盤動作（`decisions.md` 追記、必要時 `/commit`）
3. 純規劃/分析類任務可留在 Cowork 完成，但**任何要變成正式決策的內容**必須經 Code 分頁二次確認落盤

---

## 四、衝突副本偵測

Cowork 對本機資料夾的讀寫透過 Synology Drive 同步——若 Cowork 與其他工具（AG/Code/Cursor）同時寫同一檔案，可能產生 `xxx (conflicted copy).md`。

`/read` 初始化流程已加入掃描步驟（見 Phase 2.4），發現衝突副本即上報，禁止靜默忽略。

---

## 五、驗證記錄（V3）

| 項目 | 結果 |
|---|---|
| 開場協議可執行 | ✅ 已驗證（P6 讀 handoff.md 成功） |
| Cowork 全鏈演練 | ✅ P6–P8 已完成，本文件即產出物 |
| 決策落盤成功案例 | 本 Phase 2 執行本身即為案例——結論帶回 Code 分頁落盤 |

---

## 附錄：與 Antigravity / Cursor 治理規約的關係

Cowork、Antigravity、Cursor（休眠）三者面對相同的結構性問題——**無 hook 守護的環境接觸 FHS 資料夾**。三者共用同一套底層原則：

> **凡 AI 要寫治理/財務/生產檔 → 只准 hook 守護側（Desktop Code / CLI）。**

差異僅在於各工具的技術邊界（Cowork 可寫但無 MCP；AG 有完整能力；Cursor 若啟用則預設無 MCP）。詳見 `FHS_Mode_Card.md` 單一寫者矩陣。
