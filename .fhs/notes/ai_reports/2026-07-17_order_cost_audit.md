# FHS Supabase 訂單成本對抗式審計報告（2026-07-17）

> ⚠️ **2026-07-18 修正註記**：本報告嘅「問題發現」（邊張單、邊類錯）全部有效，但各 flag 單嘅「期望成本／差額」數字已被後續定案取代——本報告成文時尚未發現 products 材料價凍結（0046）、N飾未倍增與加購免畫圖（0056）三問題，期望值用咗舊價目計算。最終方程式與定案數（例：Akira total_cost=$2605）見 `FHS_System_Logic_Overview.md` §5.4.2、`decisions.md` D40+附錄。7 張 flag 單 resync 後之實際新值以 n8n V47.19 按新價目重算為準。

審計員模式（對抗式）。唯讀 SQL，project_id=vpmwizzixnwilmzctdvu。**零 DB 寫入**（全程只執行 SELECT：orders 全表、order_items 全表、products 全表、6 張舊式訂單 raw_form_state、全庫 n8n_adjustment_notes 展開）。

> 注意：本報告檔案先前已有一份內容（另一 session/前次嘗試遺留），本版本為讀取該版本後，用本 session 獨立重新拉取的 SQL 數據交叉驗證、修正並合併而成的最終版。

## 0. 範圍與 COUNT 核對

`SELECT COUNT(*) FROM orders WHERE deleted_at IS NULL` = **46**（非委託書所述 45，差 1 屬 Fat Mo 初掃估計誤差，非本審計遺漏——已用 COUNT 查證）。
- 42 張真實客戶訂單（本審計主體，全部出現在 §1 表）
- 4 張測試/污染資料：`test1001`／`test1004`（total_cost=-20，負數污染殘留）／`test9999003`／`未命名`（全零）— confirmed_at 全 NULL、客名含測試字樣，計入 COUNT 但不入財務結論

## 1. 方法論與最強證據：系統性 bug 而非個別訂單計錯

對全庫 `n8n_adjustment_notes` 展開（`jsonb_array_elements`），**只揭露 3 種 note_type**：`keychain_shipping_deduction`、`charm_shipping_deduction`、`convergence_note`。**全庫 46 單，從未出現任何「頸鏈成本」/ necklace_chain_cost 類型的 adjustment**。呢個係本審計最關鍵證據：頸鏈 ceil(N/2)×$100 呢條業務規則，喺 n8n pipeline 層面**從未被實作成會寫入 adjustment 的邏輯**，唔係個別訂單漏咗，而係規則本身喺代碼裡不存在。

另外發現 12 張訂單帶有 `convergence_note`（例：0600721 = "四分量毛值2780−扣減165=2615，products成本2357（差258.00，審計用）"）。呢個似乎係 n8n 自身 Profit Auditor 節點留低嘅診斷比對（"四分量毛值" vs "products成本"兩套演算法之間嘅差額），**本審計未能單憑 SQL 解讀"四分量毛值"嘅精確公式**，故本報告不以此數字作為 flag 判定依據，只列出原文供 Fat Mo 查 n8n workflow 源碼核實，避免誤判。

## 2. Verdict 總表（46/46，COUNT 已核對）

| order_id | 客名 | stored total_cost | 判定 | 差額(HK$) | Class |
|---|---|---|---|---|---|
| 0500509 | Andrea Lui | 210 | ✅ PASS | 0 | - |
| 0500703 | Micaela | 650 | ✅ PASS | 0 | - |
| 0500719 | 森蝶 | 815 | 🟠 FLAG | 中信心度，估+60（運費扣減疑似不足） | C |
| 0600100 | Jasmine | 395 | 🟡 FLAG（分類錯位，金額本身無誤） | 0 | F |
| 06001007 | YY | 210 | ✅ PASS | 0 | - |
| 06001008 | Mandy Ho | 650 | ✅ PASS | 0 | - |
| 0600101 | Katkat | 500 | 🟡 FLAG | 存疑，item層數字內部矛盾 | F |
| 0600102 | nam.kaaa | 210 | ✅ PASS | 0 | - |
| 0600103 | Bu | 235 | ✅ PASS | 0 | - |
| 0600104 | Ivystel | 450 | ✅ PASS | 0 | - |
| 0600105 | Kathy | 450 | ⚪ NEEDS_CONTEXT | 未知，item_base_cost疑似SKU階梯查找異常 | F |
| 0600106 | Angie Yeung | 1070 | ✅ PASS | 0 | - |
| 0600107 | Dede | 2021 | 🔴 FLAG | -100（漏頸鏈，keychain部分本身對） | A |
| 0600112 | Evelyn.c414 | 650 | ✅ PASS | 0 | - |
| 0600710 | Kathleen | 1075 | 🔴 FLAG | -100 | A |
| 0600721 | Akira | 2357 | 🔴 FLAG | -200 | A |
| 0600722 | KateSo | 920 | ✅ PASS（raw_form_state重建完全吻合） | 0 | D（僅item層display gap，訂單層正確） |
| 0600723 | PrinceCheng | 1190 | ⚪ NEEDS_CONTEXT | 存疑，keychain扣減僅-20 vs理論多件應更高 | C/D |
| 0600724 | Angel | 650 | ✅ PASS | 0 | - |
| 0600727 | DebbieHo | 635 | 🔴 FLAG（中信心度，舊式重建） | 約-100 | A+D |
| 0600800 | Amen | 1466 | 🔴 FLAG | -65（漏鏈100，運費扣減未觸發+35抵銷部分） | A+C |
| 0600801 | KaLeiChan | 450 | 🟡 FLAG（total本身啱） | 0（total_cost正確，keychain_cost欄位未同步-20調整） | D+F |
| 0600802 | WingLee | 450 | ✅ PASS | 0 | - |
| 0600803 | Selina Lai | 1575 | 🔴 FLAG | -100 | A |
| 0600804 | Katrina Sui | 1136 | ⚪ NEEDS_CONTEXT | 未知，handmodel_cost=0異常+長者SKU tier未能確認 | A+D+F |
| 0600805 | lanalanax | 210 | ✅ PASS | 0 | - |
| 0600809 | Wing430 | 650 | ✅ PASS | 0 | - |
| 0600900 | tinkicheung | 210 | ✅ PASS | 0 | - |
| 0600903 | Lokyi_C | 1206 | 🔴 FLAG | -100 | A |
| 0600905 | Wood Cheung | 440 | ✅ PASS | 0 | - |
| 0600906 | hiumanthm | 210 | ✅ PASS | 0 | - |
| 0600907 | pangonyi | 210 | ✅ PASS | 0 | - |
| 0600908 | Tsz Yu cheung | 440 | ✅ PASS | 0 | - |
| 0601100 | Ho Ka Sin | 210 | ✅ PASS | 0 | - |
| 0650429 | Shirley Lee | 650 | ✅ PASS | 0 | - |
| 0696216 | Gaeac | 650 | ✅ PASS | 0 | - |
| 07001006 | Augustine | 210 | ✅ PASS | 0 | - |
| 07001007 | Iris | 660 | ✅ PASS | 0 | - |
| 07001009 | Cheng ka ka | 210 | ✅ PASS | 0 | - |
| 0700101 | Heidi NB | 210 | ✅ PASS | 0 | - |
| 07001011 | Eugenia | 210 | ✅ PASS | 0 | - |
| 0800802 | Janet Yau | 210 | ✅ PASS | 0 | - |
| test1001 | STRESS_TESTER_NORM | 0 | ⬜ TEST | - | - |
| test1004 | STRESS_TESTER_POLLUTED | -20 | ⬜ TEST | - | - |
| test9999003 | Cycle_Tester_V4111 | 230 | ⬜ TEST | - | - |
| 未命名 | 未命名 | 0 | ⬜ TEST | - | - |

**COUNT 核對**：42 真實訂單 + 4 測試列 = 46 = SQL COUNT(*) 結果，全部出現，無遺漏。cost_override_locked 全庫掃描結果：**冇一單為 true**，無鎖定豁免情況需註明。

## 3. 錯誤分類統計（42 真實訂單）

| Class | 定義 | 單數 | 訂單 |
|---|---|---|---|
| A 漏頸鏈成本 | 有吊飾但 necklace_cost 未加 ceil(N/2)×$100，全庫 adjustment note 從無此 type 佐證屬系統性缺失 | 7 | Akira(-200)、Dede(-100)、Kathleen(-100)、Amen(-65)、Selina(-100)、Lokyi_C(-100)、DebbieHo(~-100，中信心) |
| C 運費件數扣減異常 | (N-1)×$20/$35 疑似計錯或未觸發 | 2 存疑 | 森蝶 0500719、PrinceCheng 0600723 |
| D 舊式訂單 item 層缺失 | order_items 成本全 NULL，需 raw_form_state 重建 | 6 | 見 §4，1 張驗證PASS(KateSo)，其餘中低信心度 |
| F 資料完整性/分類錯位 | 分類錯誤、欄位未同步調整、item_base_cost 與 SKU 表對唔上 | 5 | Jasmine(0600100)、Katkat(0600101)、Kathy(0600105)、KaLeiChan(0600801)、Katrina Sui(0600804) |

Class-A 累計少計成本（net_profit 虛高）：高信心 6 單合計 **$665**（200+100+100+65+100+100）+ DebbieHo 中信心估 $100 = 約 **$765**。

## 4. 兩張錨點單詳細拆解

### 4.1 Akira 0600721（審計動機樣本，驗證 Fat Mo 原假設）
品項：4 條吊飾（925銀×2 @425、925金×2 @481），item 層 subtotal 合計 = 425+425+481+481 = **1812**；keychain 4 件（1飾加購 @125）合計 500；handmodel 210。
- `n8n_adjustment_notes`：`keychain_shipping_deduction -60`（"4件鎖匙扣...扣減3件運費補貼"）+ `charm_shipping_deduction -105`（"4件吊飾...扣減3件運費補貼"）+ `convergence_note`（"四分量毛值2780−扣減165=2615，products成本2357，差258，審計用"）
- keychain：500 − 60 = **440** = stored keychain_cost ✓
- necklace：1812 − 105 = **1707** = stored necklace_cost ✓（運費扣減完全正確套用）
- item 層 chain_cost 逐項：100,100,0,0，合計 **200**（= ceil(4/2)×100，數字本身無誤，但此欄位純屬 item-level 備忘，從未捲入訂單層彙總——同全庫 adjustment note type 掃描結果一致：無任何加鏈 type）
- **結論確認**：−165 調整 = −(105+60)，只係兩項運費扣減，同頸鏈成本完全無關。期望 necklace_cost = 1812−105+200 = **1907**；stored 1707；差 **-200**。期望 total_cost = 210+440+1907 = **2557**；stored **2357**；差 **-200**。Fat Mo 原假設「漏頸鏈」**成立**。

### 4.2 KateSo 0600722（推翻「成本未明」＝訂單層錯誤嘅假設）
`order_items` 兩行 item_base_cost 全 NULL（舊式）。用 `raw_form_state` 重建：`enableK=true,enableM=false,enableP=true`、`k_lh_qty=6`、`pSubCat=木框款式`。
- keychain SKU「嬰兒鎖匙扣-不銹鋼-6飾(單購)」= **$810**（products 表值；`__FHS_Quote_Mode` 欄位雖顯示"(加購)"，但用 810 反推扣減後嘅結果同 stored 完全吻合，用 750(加購價) 反推則對唔上——證明實際 SKU 選用咗單購階梯，`__FHS_Quote_Mode` 呢個 metadata 欄位唔可靠，值得另案跟進）
- keychain：810 − (6−1)×20 = **710** = stored keychain_cost（710）完全吻合 ✓
- handmodel：木框套裝 = 210 = stored handmodel_cost（210）✓
- necklace：0（enableM=false）✓
- 210+710+0 = **920** = stored total_cost 完全吻合
- **結論**：KateSo「成本未明」只係 **item 層 display gap**（order_items 冇存值），訂單層 total_cost / 各 component 全部正確，**免修**。呢張單原先被 Fat Mo 標記為疑似錯誤，經重建後判定 PASS，屬本審計「未搵到問題都要附證據」嘅正面例子。

## 5. 舊式 6 單分類結論（item_base_cost 全 NULL）

| order_id | 客名 | raw_form_state 還原 | 判定 |
|---|---|---|---|
| 0600722 | KateSo | 見 §4.2 | **PASS，Class-D 純 display 問題，免修** |
| 0500719 | 森蝶 | K「5飾(加購)」$625 + P 木框$210；運費理論扣(5-1)×20=80，stored kc=605 隱含只扣咗20 | Class-C，中信心度，估 stored 偏高 $60 |
| 0600723 | PrinceCheng | K 兩組各 3 件（925鋼加購），adjustment note 明確只 -20（"2 keychains total"，即以「項數」非「件數」計）；但 stored keychain_cost(1000) 連原始 SKU 加總都對唔上（750→1000 反而升咗），SKU/數量映射存疑 | NEEDS_CONTEXT，建議查 n8n execution log |
| 0600727 | DebbieHo | M 1 件嬰兒吊飾 925銀 $425（enableK=false，冇鎖匙扣），漏 ceil(1/2)×100=100 頸鏈，同 Class-A 系統性缺失一致 | Class-A 候選，中信心度 |
| 0600801 | KaLeiChan | K 兩件各 1 飾(單購)$235=470；adjustment note 明確 `-20`（"2nd item shipping waived"）。total_cost=450=470−20 **正確**；但 orders.keychain_cost 欄位仍存 470（未同步扣減），造成 keychain_cost+handmodel_cost+necklace_cost(470)≠total_cost(450) 嘅內部矛盾 | Class-D+F，total 本身啱，只係 breakdown 欄位過時 |
| 0600804 | Katrina Sui | P 玻璃瓶應$210 但 handmodel_cost=0（疑似成本落錯落 necklace_cost 欄）；另有 2 件吊飾（1 嬰兒 925銀 + 1 疑似長者/家庭系列），長者 SKU tier 對唔實 | NEEDS_CONTEXT，建議人手個案覆核 |

## 6. 已查角度清單

- orders 全 46 行 × order_items 全 84 行 × products 全 SKU 表交叉拉取
- `total_cost = handmodel_cost+keychain_cost+necklace_cost` 內部一致性逐單驗證（發現 0600801 一單表面不一致，經 adjustment note 查證後屬欄位未同步，非真實金額錯）
- 全庫 `n8n_adjustment_notes` type 展開掃描（發現只有 3 種 type，從無頸鏈成本類型——本審計最強證據）
- 8 張吊飾訂單（Akira/Dede/Kathleen/Amen/Selina/Lokyi_C + 舊式 DebbieHo/未達花費 Katrina）逐張驗證頸鏈成本有否捲入訂單層
- 6 張舊式訂單全部用 raw_form_state 還原品項並重算（非停留喺「成本未明」標籤，KateSo 因而由「疑似錯誤」推翻為 PASS）
- item_base_cost 欄位可靠性抽查（發現 Katkat 0600101、Kathy 0600105 疑似 SKU 階梯查找異常，但因訂單層數字未必直接引用 item_base_cost，未能定論金額影響幅度）
- cost_override_locked 全庫掃描：0 單為 true
- convergence_note 診斷欄位發現（12 單），因公式未明，列存但不作為 flag 依據

## 7. 修正建議清單（供 Fat Mo 裁決，本 session 不執行任何 UPDATE）

1. **最高優先（Class-A，7單）**：頸鏈成本 ceil(N/2)×$100 呢條規則喺 n8n pipeline **從未實作**成會寫入 orders.necklace_cost 或 adjustment_notes 嘅邏輯——建議直接查 n8n workflow 源碼（Code Node）確認係咪漏咗呢一步彙總，而非逐單修 patch。7 張高/中信心單合計少計約 $765。
2. **KateSo 0600722**：確認 PASS，免修，但 `__FHS_Quote_Mode` 欄位顯示"(加購)"同實際使用嘅 SKU 階梯("單購")不符，建議工程查呢個 metadata 欄位嘅寫入邏輯（可能誤導未來人手排查）。
3. **0600801**：orders.keychain_cost 欄位應同步反映 n8n_cost_adjustments，唔應該淨係 total_cost 扣咗而 breakdown 欄位唔跟。
4. **0600100/0600804**：item_category / handmodel_cost 欄位錯位（"??" 分類、P 成本落錯 necklace 欄），建議查 n8n 品項分類 mapping 邏輯。
5. **0600101/0600105**：item_base_cost 疑似冇跟 N飾 tier 正確讀 products 表，建議 Fat Mo 提供原始表單截圖或 n8n execution log 核實，先可以定金額影響。
6. **0600723/0600804**：需要 Fat Mo 補充多件同SKU/家庭長者系列 SKU tier 對應規則，先可以出精確差額金額。
7. **convergence_note 診斷欄位**（12張單有記錄）：建議 Fat Mo 或熟悉 n8n workflow 嘅人解讀"四分量毛值"公式定義，本審計因公式未明未能用作 flag 判定依據，但呢個既有機制本身可能已經覆蓋咗部份本報告嘅發現，值得整合。

## 8. 卡關協議回報

**DONE_WITH_CONCERNS** — 全 46 單已出現、零寫入已達成、Akira/KateSo 兩單已深入拆解確認（KateSo 結論由「疑似錯誤」推翻為 PASS）。3 張單（0600723、0600804、部份 0600105/0600101 金額幅度）因 SKU tier 對應規則覆蓋不足，未能以高信心出精確差額數字，已如實標註 NEEDS_CONTEXT 而非猜測填數。convergence_note 診斷欄位公式未明，已列出原文但不用作判定依據，避免誤判。
