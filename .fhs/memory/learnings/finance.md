# Learnings — 財務 / 成本 / SKU 定價

> 由 `.fhs/memory/learnings.md` 分桶重構遷入（2026-08-03，flow `2026-08-03-2003`）。
> 制度說明、配額規則、tag 語法、退役 checklist 全部見 [README.md](README.md)，本檔只放內容。
> 全檔上限見 README 配額表（本桶：20）。
>
> ⚠️ **本桶受 `finance-gatekeeper` skill 管轄**：新增條目前必須先載入 finance-gatekeeper，寫入時須引用對應 `FHS_Pricing_Bible.md` / `FHS_Finance_Bible.md` 章節（`pre-tool-guard.js` R12 對本檔的變體提示）。

---

## 財務核心（Fat Mo 確認，違反=嚴重過失）

1. **運費扣減公式必用件數而非行數**：`(總件數-1)×單件運費`，總件數=SUM(quantity)；鎖匙扣$20/件，吊飾$35/件 — Fat Mo 確認 2026-06-02 [[2026-05-16_keychain_shipping_deduction]] `@finance` <!-- v:2026-06-02 -->
2. **吊飾 Clasp=頸鏈（非扣夾），奇偶規則**：成本=畫圖+打印+頸鏈+運費；奇數件加$100頸鏈，偶數件免頸鏈（共用同鏈） — Fat Mo 確認 2026-06-02 `@finance` <!-- v:2026-06-02 -->
3. **`material_cost_*` = 打印/鑄造費（非原材料進價）**：necklace_silver=465、gold=465、keychain_stainless=115（嬰兒/大寶）、alloy=115（嬰兒/大寶）；命名問題 deferred 至 PRM v2 — 源自 2026-06-03，2026-06-25 更正 `@finance` <!-- v:2026-06-25 -->
4. **鎖匙扣打印費依嬰兒/家庭分層**：嬰兒：不鏽鋼$115/鋁$115；家庭(S/P)：$135（兩材質相同）；吊飾各對象一致（銀$465/金$465）— 源自 2026-06-03，2026-06-25 更正 `@finance` <!-- v:2026-06-25 -->
5. **一單多件手模擺設（木框/玻璃瓶）逐件全額收費，無第二件起減免**：與鎖匙扣/吊飾嘅運費共享扣減不同——`orders.handmodel_cost=SUM(order_items.handmodel_cost)` 本身從未有扣減邏輯，多件只係首次令佢實際發生。範例：木框(4肢)$210+玻璃瓶(2肢)$210×2=$630 — Fat Mo 確認 2026-08-15，`FHS_Finance_Bible.md` §四「立體擺設（手模擺設）多件無共享扣減」 `@finance` <!-- v:2026-08-15 -->
6. **「嬰兒」＝客人首個孩子、「大寶」＝第二個孩子（**出生次序**，非年齡）；「大寶」係相對於「嬰兒」而存在嘅稱謂，故**有大寶必然有嬰兒**，「純大寶單」定義上不存在**：此定義直接決定玻璃瓶定價分級——大寶係「＋$300 修正項」（有參與就加），**唔係**獨立產品線；肢數 tier **只數嬰兒肢體**（2026-08-22 起，推翻 2026-07-21「大寶肢體同等計入總數」定案）。曾因 `FHS_Product_Cost_Schema_v2.md` §3.1 舊記「嬰兒＝0–3歲／大寶＝4歲以上」（**年齡**定義，已更正）而誤將新價綁喺「零嬰兒＋有大寶」呢個定義上不存在嘅組合，令新價永遠觸發唔到，migration 0090 全套作廢由 0091 重做 — Fat Mo 確認 2026-08-22，`FHS_Pricing_Bible.md` §0＋§2.1、`FHS_System_Logic_Overview.md` §5.4.20 `@finance` <!-- v:2026-08-22 -->

## Preferences

1. **反推歷史 SKU 定價都可能誤導，要查前端實際運行代碼先定案**：opus 對抗審查用家庭吊飾現價反推出「單一成人畫圖式」，同原定案 composite 假設矛盾，兩者都係「推論」非實測。最終查 Dashboard `calculatePricing()` 原始碼先揭盅 composite 先啱。日後遇到方程式爭議，live 數據反推只係次選，查前端/後端實際運行邏輯先係終極真相 — D41/S181 2026-07-18 `@finance` <!-- v:2026-07-18 -->

<!-- POINTERS:BEGIN — 本區由 scripts/learnings-pointers.js 生成，禁止人手編輯 -->
### 跨領域指標（全文在別桶）
- → `supabase.md` #8 【高頻 ⚠️】新增/沿用 status-filter 查詢前必查權威完成旗標 + 生產真實字面值
- → `supabase.md` #14 【高頻 ⚠️】`pg_get_functiondef()` 讀到「預期欄位 0 次出現」唔可以直接判「本來就冇」，必須先查有冇獨立 migration 記錄過
- → `frontend.md` #6 【高頻 ⚠️】「每件扣減率」config key 唔可以複用嚟當「每件加項成本」
- → `n8n.md` #4 【高頻 ⚠️】SKU 目錄由「整套價焗死件數」改「單件價 × quantity」模型時，必須專門用 qty≥2 測試單驗證 n8n 有冇真的做呢個乘法
- → `governance.md` #7 grep sweep 嘅「必查清單」本身可以就係漏嘅源頭，唔止靠記憶寫低嘅清單先會漏
- → `governance.md` #9 【高頻 ⚠️】向 Fat Mo 確認「窮舉組合表」時禁止預填 ✅/🚫——AI 嘅預填會變成雙方都冇審視嘅共同前提
- → `governance.md` #10 【高頻 ⚠️】同一個 AI 用同一套方法論自查三次仍會漏——驗收財務/生產改動必須改派獨立 fresh-context agent，唔可以再自己查第四次
<!-- POINTERS:END -->
