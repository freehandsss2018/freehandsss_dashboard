# 便攜塊「✅ 已定決策」條目歸檔（2026-07-04 E3 瘦身）

> 來源：`.fhs/memory/handoff.md` 頂部便攜塊。以下 3 條決策在瘦身核實時確認**無其他文件收錄完整原文**（decisions.md / AGENTS.md / MASTER 待辦表 / completion reports 均未涵蓋），故原文搬移至此，原處留一行結論＋本檔連結。其餘 25 條決策已確認在別處有完整記錄，原處直接改為一行索引＋連結，不重複搬移。

---

## (5) ig_watchdog_alerts 資料表存取設計（Session 119 Q2/Q4）

**決策**：`ig_watchdog_alerts` 資料表——anon 角色只讀；resolve 動作走 `SECURITY DEFINER` RPC（非直接 UPDATE）；寫入僅限 `service_role`。

**原因**：IG 看門狗告警資料需前端（anon key）可讀以顯示狀態，但 resolve/寫入需權限控管，避免匿名端直接竄改告警狀態或寫入偽造告警。SECURITY DEFINER RPC 讓 resolve 動作可控制在特定業務邏輯內執行（如記錄 resolved_by/resolved_at），優於開放 anon UPDATE 權限。

## (6) Phase 1b 上線時序（Session 119 Q3，已解鎖 Session 122）

**決策**：Phase 1b（n8n write node → ig_watchdog_alerts）原訂等 v3 Cron 驗收通過後才上線；Session 122 v3 Cron 驗收 PASS（Exec 4012）後正式解鎖部署。

**原因**：避免在偵測邏輯（v3 Cron order-match）尚未驗證穩定的情況下，讓寫入端提前上線產生錯誤告警資料，造成後續清理成本。屬於「先驗證讀路徑，再開寫路徑」的保守上線順序。目前狀態：已部署（Session 122），Write Alerts body bug 已於 Session 127 修復（versionId=2353e4da）。

## (27) 3 支殘留 subagent `model:` 釘選改浮動 alias（Session 140）

**決策**：`.fhs/ai/subagents/freehandsss/` 中 3 支殘留 `model:` 硬釘選的 subagent，改為浮動別名 `model: haiku`（短名 enum），而非如 Session 139 A3 對其餘 6 支那樣直接刪除 `model:` 行改繼承主對話模型。

**原因**：與 Session 139 A3「刪除 model: 行改繼承，避免 ID 過期」的精神一致（同樣不釘死具體版本 ID），但**非完全等同**——這 3 支需要保留「用平價模型（haiku）跑審查/驗證類任務」的明確成本意圖，若改繼承會讓這些審查型 subagent 意外使用呼叫方的（可能是 opus/sonnet）模型執行，失去省成本設計初衷。用短名 enum `haiku`（而非全名 ID `claude-haiku-4-5-20251001`）則規避了 ID 過期問題，同時保留降級成本的語意。

---

**回退**：若需完整還原原便攜塊決策文本（含以下已連結至其他文件的 25 條），見 git 歷史 `.fhs/memory/handoff.md`（本次瘦身 commit 前一版）或 `.fhs/reports/backups/`。
