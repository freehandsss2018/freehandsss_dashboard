---
name: GLOBAL_AI_SOP v2.0 升級與 /a3go 雙重授權重構
date: 2026-03-31
tags: [sop, a3go, multi-agent, dual-authorization, atomic-update]
---

# GLOBAL_AI_SOP v2.0 升級 — Lesson Learned

## 背景

現有 SOP v1.0 未涵蓋真實工作模式：Fat Mo 手動橋接 Web/AG/Claude 多環境。
/a3go 讀取固定舊格式路徑，無容錯設計，命名碰撞風險存在。

## 核心決策

1. **Fat Mo 橋接者角色文件化**
   - 原本只是隱性工作模式，v2.0 正式寫入 SOP
   - 所有跨環境信息流必須經由 Fat Mo 橋接，A1/A2 不直接溝通

2. **命名規範一次性切換（無過渡期）**
   - 舊格式：`audit_report.md.resolved` / `implementation_plan.md.resolved`（退役）
   - 新格式：`a1_audit_report.md` / `a2_implementation_plan.md` / `a3_execution_verdict.md`
   - Fat Mo 確認：不採雙格式兼容，直接退役

3. **雙重授權機制**
   - 第一層：技術可行性評估 → 暫停等待授權
   - 第二層：[MODIFY]/[NEW]/[DELETE] 完整清單 → 暫停等待「執行」
   - 清單以外文件嚴禁修改

4. **原子更新執行**
   - 4 個文件（GLOBAL_AI_SOP.md + a3go.md + repo-map.md + README.md）同一批次完成
   - 避免中途新舊格式不一致的中間狀態

## 後效注意

- **A2 (Antigravity) 輸出命名更新是 Fat Mo 的責任**，不是 A3 端工作
- 下次 /a3go 觸發前，必須確認 A2 已更新輸出命名，否則會強制停止

## 執行結果

- Commit: 86cbc8d
- 文件：6 個文件（4 主文件 + verdict + decisions）
- GitHub Push: ✅
