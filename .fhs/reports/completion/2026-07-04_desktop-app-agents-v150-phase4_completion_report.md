# Phase 4 完成記錄：AGENTS.md v1.5.0 + 指令族裁決（Desktop App 平台收斂計劃完結）

**日期**: 2026-07-04
**Flow ID**: 2026-07-03-0014
**依據**: `artifacts/2026-07-03-0014/cl-final-plan-v2.md`（v2.3）Phase 4
**執行者**: Claude (A3, Desktop Code 分頁 via VSCode ext session)
**授權**: Fat Mo `/execute Phase 4`

---

## 一、任務範圍（Verdict 已批准）

- 4.1 對等驗收裁定 → cl-flow.md 觸發機制去留
- 4.2 ag-flow / ag-stitch-sync / ag-ui-import 標 [DEPRECATED]；ag-plan.md 保留
- 4.3 AGENTS.md → v1.5.0
- 4.4 decisions.md + handoff + CHANGELOG

## 二、執行內容

### 4.1 對等驗收裁定

Phase 3 已完成 n8n 三腦 vs `/cl-flow` 逐項對照，結論：**不對等，`/cl-flow` 更優**（裁決免費走 Pro 訂閱、直接落 repo、全套 hook 治理）。依計劃邏輯「未過維持現狀」——`cl-flow.md` Step 1 觸發機制不變，僅在檔案頂部補一段對等驗收記錄供未來稽核追溯。

### 4.2 指令族裁決

三支指令標記 [DEPRECATED]（master `.fhs/ai/commands/` + bridge `.claude/commands/` 雙層皆加註）：

| 指令 | 棄用原因 | 替代方案 |
|---|---|---|
| `ag-flow` | 在 Claude Code 內執行卻讓 AG 裁決，已被 `/cl-flow` 同等能力+免費覆蓋 | `/cl-flow`；若真要 AG 裁決，直開 Antigravity 原生操作 |
| `ag-stitch-sync` | 依賴「執行方：Antigravity」呼叫 `mcp__magic__21st_magic_component_builder` | `ui-designer` subagent 已原生擁有同一 MCP 工具，Desktop App 內直接可用 |
| `ag-ui-import` | 前置步驟 ag-stitch-sync 已棄用，輸入來源不再產生 | `ui-designer` + `frontend-developer` 原生流程 |

`ag-plan.md`（A2 規格源，供 `cl-flow-runner.js` 呼叫）**不受影響**，維持現役。

內容保留作歷史參考，不刪除（符合「archive 搬移非刪除」硬約束的同等精神）。

### 4.3 AGENTS.md v1.4.13 → v1.5.0

新增 §1.2「平台定位與多工具共存治理」，彙整本輪（S134）全部平台收斂決策至憲法層：

- Desktop App 主介面定位（Code 分頁 + Cowork，P1-P5 探針實測依據）
- 三模式決策卡 + 單一寫者矩陣正式引用
- CLI/VSCode 永久 fallback
- Antigravity 永久共存備援守則（入場條件、緊急寫入覆核義務）
- Cursor 休眠藍圖定位
- n8n 三腦休眠藍圖定位

版本號同步更新至頁首與 §1 系統快照。

### 4.4 文檔落盤

- `decisions.md`：Phase 4 完整決策記錄（S134 續）
- `handoff.md`：便攜塊更新（S134 摘要，保留 S131-133 /upload-web 待辦不變，兩軌並存）
- `CHANGELOG.md`：Session 134 Phase 4 條目

## 三、[F] FHS_Prompts.md 同步稽核（額外觸發，非原始 4.1-4.4 範圍但依 execute.md 強制）

觸發原因：AGENTS.md 版本變更 + `.fhs/ai/commands/` 指令狀態變更。

- `docs/FHS_Prompts.md` v1.7 → v1.8，`compatible_with` 對齊 v1.5.0
- 情境二十四（/ag-flow）加棄用標註
- 情境七（Stitch UI 翻新協議）**核查後確認不受影響**——內容為通用 Mobile UI 設計準則，非指令路由，未提及 ag-stitch-sync/ag-ui-import，無需修改（避免誤改無關內容）

## 四、影響檔案清單

| 動作 | 路徑 |
|---|---|
| [MODIFY] | `.fhs/ai/AGENTS.md`（v1.4.13→v1.5.0） |
| [MODIFY] | `docs/FHS_Prompts.md`（v1.7→v1.8） |
| [MODIFY] | `.fhs/ai/commands/ag-flow.md`（棄用標註） |
| [MODIFY] | `.fhs/ai/commands/ag-stitch-sync.md`（棄用標註） |
| [MODIFY] | `.fhs/ai/commands/ag-ui-import.md`（棄用標註） |
| [MODIFY] | `.fhs/ai/commands/cl-flow.md`（對等驗收記錄） |
| [MODIFY] | `.claude/commands/ag-flow.md`（棄用標註） |
| [MODIFY] | `.claude/commands/ag-stitch-sync.md`（棄用標註） |
| [MODIFY] | `.claude/commands/ag-ui-import.md`（棄用標註） |
| [MODIFY] | `.fhs/notes/decisions.md` |
| [MODIFY] | `.fhs/memory/handoff.md` |
| [MODIFY] | `Changelog.md` |

無新增/刪除/移動檔案，[A] 結構變動不觸發，`docs/repo-map.md`/`README.md` 本階段無需更新。

## 五、里程碑

**Claude Desktop App 平台收斂計劃（Flow ID 2026-07-03-0014）Phase 0-4 全數完成**：

| Phase | 內容 | 狀態 |
|---|---|---|
| 0 | V0 實機探針 + AG 安全快照 | ✅ |
| 1 | MCP 駁接（remote-first） | ✅ |
| 2 | Skills 收斂 + Cowork 治理 + 決策卡 | ✅ |
| 3 | n8n 三腦規格 + 實測 + 對照裁定 | ✅（結論：休眠） |
| 4 | AGENTS.md v1.5.0 + 指令族裁決 | ✅ |
| 5 | Antigravity 存檔 | 可選，未觸發，無時間表 |

計劃定性維持「收斂」而非「遷移/除役」——Antigravity、Cursor、n8n 三腦均以「休眠藍圖」形式保留，未強制移除任何能力。

---

【交付前雙紀律自檢】
驗收：文件治理任務——`/read` 可正常執行驗證 AGENTS.md v1.5.0 載入無誤；斷鏈檢查：情境二十四連結 `.fhs/ai/commands/ag-flow.md` 有效，棄用標註雙層（master+bridge）皆已落地，斷鏈數 0
Subagent：前置評估 general-purpose，本階段為既有決策彙整至憲法層文件，內容需精確對應前序 Phase 0-3 已驗證事實，直接處理更精確 → ❌ 未使用 subagent
