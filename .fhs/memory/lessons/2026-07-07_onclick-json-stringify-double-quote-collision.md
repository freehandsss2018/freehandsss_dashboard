# Lesson — JSON.stringify() 產生的雙引號與同分隔符 HTML 屬性衝突

**日期**：2026-07-07（Session 150，審計修復 Phase 1）
**類型**：Pitfall
**來源**：IG 看門狗警報卡片三顆按鈕（開訂單/複製訂號/標記已處理）onclick 全數失效

## 現象

V42 `_renderIgWatchList()` 動態組裝按鈕 HTML：

```js
'<button onclick="_igwCopyOrderId(' + JSON.stringify(r.order_id) + ')">複製訂號</button>'
```

`JSON.stringify(r.order_id)` 對字串值輸出時**自帶雙引號**（如 `"FHS12345"`）。這段輸出被直接嵌入同樣用雙引號分隔的 `onclick="..."` 屬性中，瀏覽器解析 HTML 屬性時在第一個內嵌雙引號處提前截斷 —— 整組 onclick 屬性斷裂成不完整的碎片，三顆按鈕全部無反應且不報任何 JS 錯誤（因為根本沒解析出合法的 onclick，不是執行時錯誤）。

## 根因（通用 pattern）

**字串分隔符不可與外層容器的分隔符相同**：`JSON.stringify()` 的輸出分隔符固定是雙引號，若外層 HTML 屬性也用雙引號分隔，兩者必然衝突。這與程式語言巢狀字串必須換引號的道理相同（如 Python `f'{"key"}'` vs `f"{'key'}"`），但在「JS 字串組 HTML 字串」這種雙層拼接情境下容易被忽略，因為兩層字串的視覺邊界（JS 引號 vs HTML 屬性引號）不對齊，肉眼校對很難抓到。

## 修法

改手動包單引號，前提是內容字元集已知安全（不含引號/尖括號）：

```js
'<button onclick="_igwCopyOrderId(\'' + r.order_id + '\')">複製訂號</button>'
```

`order_id`/alert `id` 經 `normalizeOrderId()`（`scripts/ig-watchdog/lib/order-match.mjs` L28-34）保證只含英數+連字號，無需 HTML escape 即可安全用單引號包裹。**若字元集不保證安全（如可能含使用者自由輸入文字），此手法不適用，須走正規 HTML attribute escape。**

## 檢查清單（未來遇到類似模式時）

1. 看到 `onclick="..." + JSON.stringify(...) + ...")"` 這種拼接，先確認外層屬性分隔符與 `JSON.stringify` 輸出分隔符是否相同
2. 若相同，要嘛換一邊的分隔符（單引號屬性 or 手動單引號字串），要嘛對輸出做屬性層級 escape
3. 這類 bug 不會拋 JS 例外，只會讓功能「靜默失效」——排查時應先檢查渲染出的實際 DOM `outerHTML`/`getAttribute('onclick')`，而非只看 console

## 關聯

- `.fhs/reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md` §4.2
- `.fhs/notes/FHS_System_Logic_Overview.md` §11.4（V42 igwatch 模式）
