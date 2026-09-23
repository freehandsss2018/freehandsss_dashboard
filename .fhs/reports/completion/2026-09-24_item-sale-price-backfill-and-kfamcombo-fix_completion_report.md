# 完成記錄：歷史 `item_sale_price` NULL backfill + K_FAM_COMBO第三缺口修復

**日期**：2026-09-24
**Flow**：`cl-flow-fast 2026-09-24-0134`
**Verdict**：APPROVED_READY → finance-auditor 部署後驗收
**執行者**：Claude Code（Sonnet 5）
**授權**：Fat Mo「跟建議做」

---

## 一、緣起

2026-09-23（flow 2026-09-23-1957）修復咗n8n頸鏈斷鏈①同附加費斷鏈②，但只影響未來新提交訂單。Fat Mo要求先睇分攤方案傾一輪，再要求睇埋backfill方案先一齊決定。finance-auditor兩輪獨立查證14張現存生產訂單，意外揪出兩個額外獨立缺口（K_FAM_COMBO命名斷層、0600704等歷史孤例）。

## 二、規劃與Fat Mo拍板

| 事項 | finance-auditor建議 | Fat Mo決定 |
|---|---|---|
| 13張單backfill | 動態重放n8n演算法計出數值，逐張守恆驗證 | 執行 |
| K_FAM_COMBO | 方案甲：改Dashboard box key字串（`freehandsss_dashboardV42.html:9433`） | 跟建議做 |
| 0600704/0500719/0600722 | 判定歷史孤例，不修 | 跟建議做（不修） |
| `sync_order_to_mirror`成本欄位缺COALESCE保護 | 另案追蹤，非本次範圍 | 記錄待排期 |

## 三、cl-flow-fast規劃（flow 2026-09-24-0134）

AG（`gemini-2.5-flash`，過程中三個預設model同時503，curl probe後override重試）評審5條批評（2MAJOR+3MINOR，冇BLOCKER）：

| 批評 | Severity | 裁決 |
|---|---|---|
| K_FAM_COMBO處理狀態文字矛盾 | MINOR | ✅採納，重寫澄清 |
| backfill數值hardcode，冇動態重放機制 | MAJOR | ✅採納，重新設計為即場重放+交叉核對 |
| 建議改用`@supabase/supabase-js` | MAJOR | ❌拒絕（查證repo既定慣例為原生https，批評前提有誤） |
| 冇型態/範圍驗證 | MINOR | ✅採納 |
| 單一失敗令全批中斷 | MINOR | ✅採納，per-item try/catch |

Verdict：**APPROVED_READY**

## 四、執行

### Backfill（13張單，25個品項）

用單一SQL UPDATE（`item_sale_price IS NULL`守衛）寫入，數值全部由finance-auditor獨立重放n8n V47.26演算法驗證：
- 7張純頸鏈斷鏈單：0600710/0600721/0600727/0600800/0600803/0600804/0600903（14項）
- 0600107頸鏈2項
- 5張附加費斷鏈單：0600112/0600303/0600506/0600904/0601011（7項）

24項全部成功、0項覆寫現存值。

### K_FAM_COMBO（第三缺口，現行代碼修復）

- `freehandsss_dashboardV42.html:9433`：`"TEMP_K_FAM"` → `"TEMP_K_FAM_COMBO"`（純字串，唔碰共用`_boxKey()`函式）
- 已複製落主倉`Freehandsss_Dashboard/freehandsss_dashboardV42.html`供Fat Mo手動測試（既有慣例）
- `0600107_K_FAM_COMBO`品項另用獨立UPDATE人手核准backfill=$1300

### 已知操作限制

`scripts/repair/backfill_item_sale_price_2026_09.js`（動態重放版）已寫入repo，但執行時`.env`嘅`SUPABASE_SERVICE_KEY`回報`401 Unregistered API key`（curl直測確認key本身已失效，非腳本邏輯bug）。改用`mcp__supabase__execute_sql`直接執行同一批已驗證數值完成backfill；腳本本身待Fat Mo處理key問題後補測。**此發現可能與D79-follow「Fat Mo輪替Supabase secret key」pending項有關，建議Fat Mo一併確認。**

## 五、驗證

**主對話執行時驗證**：
- 逐張守恆重查：7張頸鏈單`SUM(item_sale_price)=final_sale_price`；5張附加費單`SUM=deposit+balance`；0600107全8項`SUM=10300=final_sale_price`
- 0600704/0500719/0600722確認`item_sale_price`/`item_base_cost`依然全部NULL，未被觸碰
- `category_revenue`超收由backfill前$12,711.5轉為現時短收約$846（方向轉變：頸鏈由Layer2高估修正為真實值大幅下調，keychain因K_FAM_COMBO由0變1300小幅上調，相抵後淨效應轉向；殘餘差額源自6張真正歷史舊單Layer2估算+0600723獨立$80落差，非本次範圍）

**finance-auditor 部署後獨立驗收（強制，非自驗）— 結論 PASS-with-notes**：
1. 逐張SQL用`updated_at`時間戳定位實際被寫入嘅25行，全部落喺13張目標訂單之內，冇溢出 — PASS
2. 逐張守恆重查：14張單全部零誤差（7張頸鏈單/5張附加費單/0600107全8項）— PASS
3. 三張歷史孤例（0600704/0500719/0600722）確認完全未被觸碰 — PASS
4. Dashboard `TEMP_K_FAM_COMBO`代碼修復：字串正確、`_boxKey()`共用函式未被改動、無語法風險、全檔無殘留舊字面值 — PASS
5. `category_revenue`差額獨立重測：精確值$846短收（非約數），方向同幅度與主對話講法完全吻合；歸因判斷（主要源自6張已知metal_fallback歷史單，含決定不修嘅0500719/0600722）屬合理外推非逐項拆解證實 — **PASS-with-notes**
6. `orders`表核心財務欄位（`final_sale_price`/`net_profit`/`deposit`/`balance`/`additional_fee`/`total_cost`）16張相關訂單`updated_at`全部唔喺backfill當日，證明完全未被觸碰 — PASS

全文見`decisions.md` 2026-09-24條目。

## 六、明確不做範圍

- `category_revenue`分攤演算法架構缺口（另案，需Fat Mo先拍板分攤邏輯）
- 0600704/0500719/0600722維持NULL（歷史孤例，Fat Mo決定不修）
- `sync_order_to_mirror`嘅COALESCE保護（預防性技術債，待排期）
- `SUPABASE_SERVICE_KEY`更新（待Fat Mo確認，可能與D79-follow相關）

## 七、後效同步稽核

- **[A] 結構變動**：新增`scripts/repair/backfill_item_sale_price_2026_09.js` → 已知（腳本本身歸類為repair工具，非commands/repo-map核心結構，本次未另行更新repo-map——如Fat Mo認為需要可另補）
- **[G] 運算邏輯變動**：Dashboard `calculatePricing()`相關box key改動 → 已更新`.fhs/notes/FHS_System_Logic_Overview.md`§10.27
- **[C] CHANGELOG**：已更新，見2026-09-24條目
- **[B] 完成記錄**：本文件

## 八、【交付前雙紀律自檢】

**驗收**：財務/成本 → `finance-auditor` live驗收（部署後強制），詳見decisions.md 2026-09-24引用
**Subagent**：✅ `finance-auditor`×5（分攤方案初評、14張單分類驗算×2、K_FAM_COMBO/0600704深挖、部署後驗收，全部背景派工）
