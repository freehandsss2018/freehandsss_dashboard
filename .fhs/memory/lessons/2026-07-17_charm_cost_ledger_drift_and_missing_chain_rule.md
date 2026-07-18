---
name: 2026-07-17_charm_cost_ledger_drift_and_missing_chain_rule
type: lesson
date: 2026-07-17
---

# 吊飾成本「雙數簿」漂移 + 頸鏈規則從未落地（S181）

## 背景

Fat Mo 發現訂單 Akira（0600721）成本計錯，懷疑吊飾成本漏計頸鏈。全量審計（46 張訂單）後發現問題比單一訂單大得多。

## 發現一：`necklace_chain_cost`（每 2 條吊飾共用 1 條頸鏈 $100，奇偶進位）規則存在於 `cost_configurations`（非 deprecated）同前端 `calculatePricing()`（有正確算並存入 `order_items.chain_cost` 供顯示），但 n8n `Calculate Profit & Pack Items` node 從未把呢個值計入 `orders.total_cost` / `necklace_cost`。全庫 7 張吊飾單全部少計，合共約 $765。

## 發現二（比預期更深）：「雙數簿」漂移

`products.total_base_cost`（n8n 實際讀嗰個「舊數簿」）凍結喺舊 `cost_configurations` 值（吊飾材料成本銀$365/金$421），而 `cost_configurations`（前端即時讀嗰個「新數簿」）已經升到銀$465/金$421→兩者拉平做$465/$465。呢個 drift 同 finance-gatekeeper skill 已知技術債一致：「`cost_configurations` 改值不會自動回算 `products.total_base_cost`（無傳播機制）」。

**第一次 patch 嘗試（純加 $100 頸鏈）會撞正舊數簿入面已經凍結咗嘅 $70 舊頸鏈估算值，變成雙重計算**——呢個係 fresh-context opus 對抗式審查揪出嚟嘅，證明「財務/n8n 部署類任務強制 fresh-context 第二意見」呢條治理規則（02_model-dispatch.md §5）確實攔到咗一個會令問題惡化嘅錯誤修復。

## 解決方案（仿鎖匙扣 migration 0045 先例）

1. **migration 0046**：建 `fhs_compute_charm_cost(p_drawing_fee, p_material_per_piece, p_qty=1)` RPC（`= drawing + material×qty`，無 clasp/chain 項——頸鏈刻意留喺訂單層獨立計，因為係跨 2 件吊飾共用嘅實體資源，攤分做半件成本會喺奇數件時算錯，只有 `Math.ceil(N/2)×100` 先啱），回填 242 行吊飾 SKU 嘅 `total_base_cost`（銀/金材料 365/421 → 465/465，Fat Mo 確認金銀同價屬有意）。**已執行，即時生效，但因為只改「價目表」未改任何客戶訂單，零風險。**
2. **n8n patch**（頸鏈 `Math.ceil(charmItemCount/2)×100` 計入 `Necklace_Cost_Total`）：已寫好、dry-run 語法驗證、opus 第二意見覆核（NEEDS_REVISION→已按建議修正雙計問題）。**待 Fat Mo 落 `/execute` 先上線**（`update_node_code` MCP tool 本身有 dryRun 硬閘，唔接受聊天室口頭授權）。
3. 7 張歷史訂單（Akira/Dede/Kathleen/Amen/Selina/Lokyi_C/DebbieHo）需要 Fat Mo 親自喺 Dashboard 載入→sync 先會補正（AI 不自動代做，因為呢個動作等同重交真實客戶訂單，錯咗會產生新嘅「已確認」錯誤快照）。

## 2026-07-18 續章：第四次出錯與最終定案（Fat Mo 定性為嚴重過程缺陷後補正）

Fat Mo 叫「再核實」後，我對照鎖匙扣先例揪出 0046 殘留兩個真缺口（N飾未倍增、加購未免畫圖），**但同時自己又製造第三個假缺口**：用 Pricing Bible §6.2 舊運費分解（425=60+260+70+35）做基準，誤判 0046「跌咗 $35 運費」——而嗰份分解早已被 S124 v2 裁決取代（「subtotal 不含運費；運費僅訂單層扣減」，live 鐵證：鎖匙扣單購 185 而非 205）。**我引用咗一份我自己喺同一 session 較早前已判定過時嘅文件做核數基準。**

最終修正（migrations 0056/0057，opus 八角度對抗審查 FORMULA_HOLDS 後執行）：加購=465×N（免畫圖）、單購=tier_drawing+465×N；drift 檢查 RPC 擴充至吊飾全 tier（282 行零漂移）；Akira 定案數 $2605。對抗審查另捉到 products 表 1 行「加貼」typo SKU（mode 欄亦錯填「無」），防禦性處理咗。

## 教訓

- **懷疑成本計錯時，先查 `products.total_base_cost` 係咪同 `cost_configurations` 對得上**——兩者可以長期分岔而冇任何自動同步機制，呢個 drift 模式已經喺鎖匙扣（已修）、立體擺設（已修）、吊飾（本次修）出現過三次，**下次任何品類報成本異常，第一步應該直接查呢個 drift 模式**，唔使由零假設。而家有工具：`SELECT * FROM fhs_check_product_cost_drift() WHERE drift <> 0;`（0057 起覆蓋鎖匙扣嬰兒層+吊飾全 tier）。
- 對「加 XX 費用」呢類睇落好簡單嘅財務 patch，一定要先查呢個費用嘅組成單位（元件 SKU total_base_cost）入面有冇已經包咗（哪怕係舊值/錯值）——otherwise 好容易雙計。
- **【本事故最核心教訓】財務核數基準只認 live 數據，唔認文件**：文件（包括 Bible）可以載住已被推翻嘅舊裁決而冇標記；同一個 session 內我判咗份文件過時、跟住又攞返嚟做基準。防止機制已落地：finance-gatekeeper §三B「成本改動前置紀律」三步（完整方程式先行／對齊已驗證先例／改完跑 drift 檢查零行先收工）。
- **逐忽修 = 連環爆**：頸鏈、材料價、N飾倍增、加購免畫圖——四樣嘢其實係同一條方程式嘅四個分量。第一日只修被投訴嗰忽（頸鏈），之後每次「補鑊」都再漏第二忽。正確做法係第一次就寫全式逐分量對 live。
- 完整審計報告：`.fhs/notes/ai_reports/2026-07-17_order_cost_audit.md`
