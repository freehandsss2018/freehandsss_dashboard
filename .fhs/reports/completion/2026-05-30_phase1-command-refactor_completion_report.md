# Phase 1 指令精簡 — 完成記錄
**日期**：2026-05-30
**Session**：46

## 執行摘要

指令體系 Phase 1 精簡完成。核心決策：/rp 精煉內建為所有管道指令的預設 Step 0，rp-flow 包裝層刪除，新建 ag-flow 取代 rp-flow-ag。

## 刪除（7 個檔）

| 檔案 | 原因 |
|------|------|
| `.fhs/ai/commands/rp-flow.md` | 包裝糖，功能已內建至 cl-flow/cl-flow-fast/ag-flow |
| `.claude/commands/rp-flow.md` | 同上橋接版 |
| `.claude/commands/rp-flow-fast.md` | 同上橋接版 |
| `.claude/commands/rp-flow-ag.md` | 同上橋接版 |
| `.agents/workflows/rp-flow.md` | 同上橋接版 |
| `.agents/workflows/rp-flow-fast.md` | 同上橋接版 |
| `.agents/workflows/rp-flow-ag.md` | 同上橋接版 |

## 新建（3 個檔）

| 檔案 | 用途 |
|------|------|
| `.fhs/ai/commands/ag-flow.md` | 精煉內建 → A1+A2，AG 裁決（跳 A3）|
| `.claude/commands/ag-flow.md` | CL 橋接版 |
| `.agents/workflows/ag-flow.md` | AG 橋接版 |

## 修改（10 個檔）

| 檔案 | 變更 |
|------|------|
| `.fhs/ai/commands/cl-flow.md` | v2.1→v2.2，加 Step 0 /rp 精煉 + Gate 1 |
| `.fhs/ai/commands/cl-flow-fast.md` | v1.0→v1.1，加 Step 0 /rp 輕量精煉 + Gate 1 |
| `.fhs/ai/commands/rp.md` | v2.2→v2.3，移除 rp-flow 引用，更新關係說明 |
| `.claude/commands/cl-flow.md` | 更新橋接說明 |
| `.claude/commands/cl-flow-fast.md` | 更新橋接說明 |
| `.agents/workflows/cl-flow.md` | 更新橋接說明 |
| `.agents/workflows/cl-flow-fast.md` | 更新橋接說明 |
| `docs/repo-map.md` | 移除 rp-flow 條目，新增 ag-flow 條目 |
| `docs/FHS_Prompts.md` | 情境二十四改為 ag-flow |
| `.fhs/ai/commands/README.md` | 更新指令列表，加退役記錄 |

## 後效文件同步

- ✅ `CHANGELOG.md`
- ✅ `.fhs/notes/decisions.md`
- ✅ `.fhs/notes/SOP_NOW.md`
- ✅ `.fhs/memory/handoff.md`

## 設計決策

1. **精煉內建**：不再需要手動先 /rp 再 /cl-flow，管道自帶精煉
2. **命名 = 裁決者**：cl-flow=Claude / ag-flow=AG / rp=只精煉
3. **Gate 1 強制**：精煉後必須 Fat Mo 審閱 XML 才進入規劃管道

## Phase 2 待辦（下次 session）

`guardian` `five` `code-analysis` `tdd-guide`（指令版）`px-plan` `px-audit` `mermaid` `fhs-cost-audit` — 共 8 個
