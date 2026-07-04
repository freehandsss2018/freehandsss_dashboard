# FHS Lesson: 終極審判 QA 協議 (The Final Judgment)

## 💡 學習點總結
為了驗證複雜的「畫圖成本」與「階梯計價」邏輯，系統必須通過四大地獄級情境測試。這些測試已封裝於 `test_judgment.js`。

## 🛠️ 四大核心情境 (Scenarios)
- **🔥 情境 L (Undo/Redo Trap)**: 
  - 測試行為：頻繁切換「木框/玻璃瓶」與「月齡」。
  - 檢驗點：年齡警示必須隨狀態動態顯隱，不可卡死在舊狀態。
- **🔥 情境 M (Cost Summation Torture)**: 
  - 測試行為：混合載入「成人(P) + 嬰兒(S) + 嬰兒(P)」。
  - 檢驗點：成本精算必須為 $410 (240+60+110)，驗證跨對象成本疊加。
- **🔥 情境 N (Triple Limb Reset)**: 
  - 測試行為：連續訂購 3 隻異部位 (S) 系列鎖匙扣。
  - 檢驗點：價格應重置為 $860x3 + $100 (一次性附加費)，驗證「異部位重置」規則。
- **🔥 情境 O (Boundary Hijack)**: 
  - 測試行為：注入負數數量 (-1)。
  - 檢驗點：系統必須以 `Math.max(1)` 強制重置為 1。

## ⚠️ 執行規範
每次修改報價 JS 或產品維度解析後，**必須**啟動沙盒模式執行 `runAllAudits()` 或 `node test_judgment.js`。

---
*Created: 2026-03-21*
*Reference Session: 1162b961-8c9c-481c-bd35-ebceee62e932*
