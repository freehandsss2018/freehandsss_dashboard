---
name: feedback_investigate_before_asking
description: 嚴禁直接問 Fat Mo 可自行查證/分析的事；先查 Airtable+檔案，決策題給優劣對比+建議
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 16cf88e3-f3f1-4d69-a101-a08f86ac5350
---

直接向 Fat Mo 拋出「我可以自己查或自己分析」的問題 = 重複性錯誤行為 = 嚴重過失。

**四類問題的正確處理**：
- **缺資料型（如物料成本數字）**：先查 Supabase/Airtable（舊記錄雖舊但都可取用）→ 再查專案檔案。只有在「全新、任何記錄都找不到」時，才告知 Fat Mo「我已找尋 X/Y/Z 檔案，無記錄」，然後他才發問/提供。
- **規則/公式型（如「加購鎖匙扣成本怎麼算」「財務規則為何」）**：**先查權威專檔（FHS_Finance_Bible / FHS_Pricing_Bible / FHS_Product_Cost_Schema 等）→ 再用 skill（/fhs-cost-audit）→ 再派 subagent（finance-auditor / database-reviewer）**。多數財務/業務規則已成文，翻找到即是答案。查無才問。
- **決策型（如範圍取捨）**：我先自行評估，向他作出**優劣對比**，再**給出建議答案**——不是把原始問題丟回給他。
- **判定型（如是否觸及某架構命題）**：自己從架構/文件判定，不問他。

**只在兩種情況才允許問 Fat Mo**：(a) 權威專檔/skill/subagent 全查無；(b) 存在需 Fat Mo 商業判斷的「真歧義」（非已成文者）。**禁止把「已成文但需翻找」當成「查無」來合理化提問。**

**Why**：把可自行解決的問題丟給用戶 = 偷懶 + 浪費他的時間；Fat Mo 視為嚴重過失。**S124 實犯**：點4「N飾(加購)成本模型歧義」當下，先 AskUserQuestion 問 Fat Mo 而非先 grep Finance Bible——而 G2/G3 規則本就成文於 Bible，被回推後才查到。程序倒置。
**How to apply**：任何想對 Fat Mo 發問前，先自檢「Supabase/Airtable/專檔能查到嗎？skill/subagent 能得出嗎？我的分析能判定嗎？」全否才可問，且須附已查清單。規則型問題自檢「Finance/Pricing/Cost Bible 翻過了嗎？」。決策題一律「優劣對比 + 建議」格式。

關聯：[[feedback_delivery_standards]]（不交付未驗證的修復）、[[feedback_airtable_direct_query]]（Supabase first, Airtable fallback，禁用截圖當真實資料）、[[feedback_subagent_router]]。
