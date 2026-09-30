# 「重開訂單還原」排查：階段 A 證據報告

> 日期：2026-10-01｜執行：A3（Claude），唯讀｜方案：`2026-10-01_restore-bug-sweep-plan.md`｜狀態：**階段 A、A2 完成；待 A4 審視**
> 資料源：Supabase `vpmwizzixnwilmzctdvu`（僅 SELECT）；財務盤點由 `finance-auditor` 執行；代碼審查由 Explore（唯讀）執行。

## 1. 結論（先看這裡）

| # | 結論 | 證據等級 |
|---|---|---|
| 1 | **在已評估的紀錄中，未發現被存回資料庫的 0600930 型多肢單**（67 張可評估單，疑似受害單清單為空）。這是有限結論：只涵蓋目前資料庫狀態與上述檢查，不能證明歷史上從未發生過（例如曾被寫壞後又被人手改回）。A4 審視亦要求此措辭 | SQL＋finance-auditor，見 §2 與附錄 SQL |
| 2 | **鎖匙扣有同類 bug，且已在生產版重現（UI 測試證實）**：含「家庭組合」的鎖匙扣單重開時，會憑空多出嬰兒 K「左手」，並把 K 左腳的刻字覆寫成家庭組合的合成文字、數量由 3 變 1。真實訂單 0600107 重現。目前資料庫**尚未被寫壞**（依 §2.1 Q1 結果，0600107 表單記錄與品項一致；A4 指出這是依報告、非其獨立查庫），但若有人重開後按保存，就會寫回 | 代碼審查＋UI 測試（生產版與修復前版皆重現），見 §3 |
| 3 | 鎖匙扣「刻字含方向字」會令方向誤判（第二個鎖匙扣邊界 bug）。合成案例重現，真實單暫無此刻字 | UI 測試 U8，機率低 |
| 4 | 財務欄位全面自洽（吊飾頸鏈折扣、運費扣減、成本加總、利潤計算），另發現 1 張與本 bug 無關的成本偏差（0600105，$80）和 1 張異常單（0600102） | finance-auditor |
| 5 | 「數量欄空白」：資料庫存空字串但空白按 1 件計，計價無誤（8 項檢查全 PASS）；修復後重開，數量會自動補回 1 | SQL＋UI 測試 |

## 2. 階段 A 盤點（SQL 與 finance-auditor）

### 2.1 結構盤點（A3，唯讀 SELECT）
| 檢查 | 結果 |
|---|---|
| Q1／Q2 吊飾、鎖匙扣：`raw_form_state` 部位旗標 vs `order_items.item_key` 尾段 | 只有 2 個差異：0600102（被關掉區塊的舊旗標，無對應品項，final_sale_price 只等於木框，資料庫沒被寫壞）、0600107（多一個家庭組合品項，本來就該有） |
| Q3 立體擺設：`enableP`／`_P_` 品項／追加件 slot 數 | 全部一致，0 差異 |
| Q7 M／K 品項 `item_key` 無方向尾段 | 只有 `0600107_K_FAM_COMBO`（設計如此） |
| Q6 重新保存過且有吊飾的單 | 8 張（0600107、0600710、0600721、0600727、0600800、0600803、0600804、0600903）；逐張與訂單文字比對，部位一致 |
| 補充：0600710 曾因「左手用料待定」被懷疑 | `audit_logs` 顯示 2026-07-24 回填前已有兩件吊飾，成本在 09-06 保存後沒變 → 排除 |

### 2.2 財務盤點（finance-auditor，2026-10-01）
- 範圍：70 張未軟刪非測試單，3 張已決定不修的歷史孤例（0600704、0500719、0600722）單獨標註，實評 67 張。
- C0 `final_sale_price`＝訂金＋尾款＋附加費：全 PASS。C2 吊飾頸鏈折扣、運費扣減：9 張吊飾單全 PASS。C3／C4 成本分類加總、淨利計算：70 張全 PASS。C8 空白數量按 1 件：全 PASS。
- 「多出一肢」特徵（吊飾多 1 件、成本多 $625／$660、品項售價合計高於實收）：**無**。9 張吊飾單的收款拆分金額與定價目錄一致（這是操作者手輸的收款，最接近獨立證據）。
- **疑似受害單：空。**
- 限制（finance-auditor 明言）：`updated_at` 被批量 migration 污染（09-11 有 10 張、07-24 有 8 張），不能單靠它判斷「曾被重新保存」；已改用「有吊飾的 9 張單」逐張核對。
- 與本 bug 無關的發現：
  - **0600105**：鎖匙扣共 6 件，運費扣減按舊「行數−1」算法只扣 $20（現行規則應扣 $100），成本多算 **$80**、利潤少算 $80。只經 migration 0076 補畫圖費，運費沒有重算。**待 Fat Mo 決定是否修正。**
  - 0600809、0600905、0600908、0650429、0696216：`n8n_adjustment_notes` 過時，`total_cost` 本身正確，無金額影響。
  - **0600102**：表單記錄有 3 個部位開著（K 左腳、K 左手、M 左腳），但品項只有木框；`__System_Final_Sale_Price` 是 6180，實收只有 2380。方向與本 bug 相反（表單比資料庫多），資料庫沒被寫壞，成因未明。**若有人重開此單，畫面會顯示 3 件未收費項目。**
  - `n8n_cost_adjustments` 的「畫圖去重」項在 09-14 前後記法不一致（18 張，只是記帳格式，非錯數）。

## 3. 代碼審查（Explore，唯讀，全部有行號）

寫入端事實：正常儲存走 n8n「Supabase Mirror Prep」，`specification` 存的是**刻字**（不含方向）；只有 n8n webhook 失敗時的 fallback `sbSyncOrder` 才會寫含方向字的 specification。`item_key` 尾段才是可靠方向來源。

| 分支 | 方向來源 | 依賴 specification？ | V2 風險 |
|---|---|---|---|
| 吊飾 嬰兒／大寶（已修） | key 尾段（另以 OR 併入 spec） | 部分 | 修復有效；殘留：刻字含「右手」等字時會同時點亮兩個部位（低） |
| 吊飾 舊格式 `TEMP_M_01` | 位置猜測（一律左手） | 是 | 只影響舊格式單 |
| 鎖匙扣 嬰兒 | **先 spec，找不到才 key** | **是，優先於 key** | 刻字含方向字會搶先命中，阻斷 key 路徑（中低） |
| **鎖匙扣 家庭組合 `_K_FAM_COMBO`** | 無專屬還原分支，卻被 K 方向匹配誤吞 | 是，且誤判 | **高**：其 specification／刻字是「合成: 父母手(S) + 嬰兒左手(S)…」，會點亮嬰兒 K 部位並覆寫該部位真實項目的刻字與數量 |
| 立體擺設主件／追加件 | 款式靠 `raw_form_state` 補（V2 品項的款式解析形同空轉） | 形式上是 | 缺少 `p{N}_*` 旗標時追加件變「木框」（低中） |
| 大寶／家庭組合 | 大寶 K／M 正確；家庭區塊只靠 `raw_form_state` | — | 同上「家庭組合」 |
| 訂單總覽 `mapOrder` | **key 尾段優先** | V2 有尾段者不依賴 | 對 V2 K／M 不會顯示錯誤方向；註解稱「與還原相同後備」不準確 |

其餘顯示層問題（稽核帳行標籤、Mode 2 卡片標籤先看 specification，家庭項可能標成「大寶」）純顯示，不改資料，記錄備查。

## 4. 待 A4 審視的具體問題
1. 鎖匙扣家庭組合的修法：建議「還原時排除 `_K_FAM_COMBO`（不進入單品肢體匹配），並讓 K 分支改為 key 尾段優先」，是否有更好方案或遺漏？
2. 「還原只加不減」的機制（`_synth` 疊加在 `raw_form_state` 之上）是否應根本改為以 `order_items` 為準？本方案不改此機制（超出範圍），只需 A4 評估是否值得另案。
3. 我的 UI 測試矩陣有無漏案例（例如家庭組合＋大寶、追加件 slot、雙擺設）；網路攔截是否足以保證零寫入。

## 附錄 A：實際執行的 SQL 與結果摘要（A4 要求附原始證據）

全部為唯讀 SELECT，Supabase project `vpmwizzixnwilmzctdvu`，母體＝`orders.deleted_at is null and order_id not ilike 'test%'`（70 張）。

**Q1／Q2（吊飾、鎖匙扣部位 vs item_key）**
```sql
with o as (select order_id, created_at, updated_at, raw_form_state r from orders where deleted_at is null and order_id not ilike 'test%'),
rs as (select o.order_id, case when k like 'm\_%' then 'M' else 'K' end cat, upper(regexp_replace(k,'^[mk]_(.*)_en$','\1')) part
       from o, jsonb_each_text(o.r) e(k,v) where k ~ '^[mk]_(e_)?(lh|rh|lf|rf)_en$' and v='true'),
it as (select oi.order_fhs_id order_id, case when item_key ~* '_M_' then 'M' when item_key ~* '_K_' then 'K' end cat,
        upper((regexp_match(item_key,'_[MK]_((?:E_)?(?:LH|RH|LF|RF))$','i'))[1]) part, item_key
       from order_items oi join o on o.order_id=oi.order_fhs_id where item_key ~* '_[MK]_'),
rset as (select order_id,cat,array_agg(part order by part) parts from rs group by 1,2),
iset as (select order_id,cat,array_agg(coalesce(part,'??'||item_key) order by coalesce(part,'??'||item_key)) parts from it group by 1,2)
select coalesce(r.order_id,i.order_id) order_id, coalesce(r.cat,i.cat) cat, r.parts raw_parts, i.parts item_parts
from rset r full join iset i on r.order_id=i.order_id and r.cat=i.cat where r.parts is distinct from i.parts order by 1;
```
結果（3 列）：`0600102 K raw=[LF,LH] item=null`；`0600102 M raw=[LF] item=null`；`0600107 K raw=[LF,RH] item=[??0600107_K_FAM_COMBO,LF,RH]`。

**Q3／Q6／Q6b／Q7（立體擺設、重新保存、無方向 key）** 結果：Q3 三項皆 0 列；Q6 重新保存（updated_at > created_at+1 日）共 55 張（受批量更新污染，見 §2.2）；Q6b 有吊飾且 V2 時代重新保存 8 張（0600107、0600710、0600721、0600727、0600800、0600803、0600804、0600903）；Q7 僅 `0600107_K_FAM_COMBO`。

**逐張核對（8 張）**：`order_items` 的吊飾 `item_key` 尾段集合 vs `full_order_text` 吊飾行，8 張部位皆吻合（注意：`full_order_text` 由表單產生，非獨立證據，僅作一致性輔證）；0600710 另以 `audit_logs`（`backfill_drawing_cost_s189`，2026-07-24，necklace_cost 995→1055）佐證當時已有兩件吊飾，成本在 2026-09-06 保存後未變。

**財務部分（C0–C8）**：完整 SQL 與逐項結果見 finance-auditor 報告（2026-10-01，唯讀 `WITH…SELECT`，重點欄位 `final_sale_price`、`sum(item_sale_price)`、`n8n_adjustment_notes` 的 `type/amount`、`total_cost`、四分類成本、`raw_form_state.depositSplitData`）；其摘要見 §2.2。本附錄不轉貼以免失真，A4 如需重算請向 A3 索取完整報告。

**限制聲明**：`updated_at` 被批量 migration 污染，Q6 不能單獨作為「曾重新保存」的證據；「沒有受害單」僅為「在上述檢查下未發現」。
