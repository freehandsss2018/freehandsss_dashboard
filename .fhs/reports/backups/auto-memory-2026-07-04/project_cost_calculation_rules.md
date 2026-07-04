---
name: project_cost_calculation_rules
description: FHS 成本計算核心規則（位置依賴）——鎖匙扣/吊飾首件 vs 加購、運費與頸鏈扣減、Clasp=頸鏈，這些規則在 Finance Bible 缺失或寫錯，AI 反覆算錯
metadata: 
  node_type: memory
  type: project
  originSessionId: f5edbcdc-9180-4349-982b-225464cee610
---

FHS 成本（cost，非售價）計算是**位置依賴**的，不是單一 per-SKU flat 值。Fat Mo 已多次解釋，但 Finance Bible 缺失/寫錯，導致 AI 反覆算錯。核心規則：

**成本組件（per piece）**
- 鎖匙扣：畫圖 + 打印 + **環扣(Clasp)** + 運費
- 吊飾：畫圖 + 打印 + **頸鏈** + 運費（**吊飾無環扣**；Airtable 的 `Clasp` 欄位對吊飾而言就是「頸鏈」，現行頸鏈成本 = **$100**，Airtable 舊值 $70 已過時）

**位置規則（同一訂單、同一部位）**
1. 第 1 件（首件）= 全成本（含畫圖 + 頸鏈/環扣）
2. 第 2 件起（加購）= **免畫圖**（圖只畫一次）
3. 跨產品同部位：即使後加的是另一類（如鎖匙扣後加吊飾），該類首件**同樣免畫圖**
4. **吊飾頸鏈邏輯：1 頸鏈最多掛 2 吊飾** → 奇數件加 $100 頸鏈、偶數件不加（第1件加、第2件不加、第3件加、第4件不加…）

**運費扣減（訂單層，同類型共享）**
- 公式 = **(該類總件數 − 1) × 單件運費**，注意是**件數 pieces，不是 order_items 行數**（Finance Bible 寫成行數是 BUG）
- 鎖匙扣運費 = $20/件；吊飾運費 = $35/件
- 同類別享運費減免（鎖匙扣與吊飾各自獨立計）

**驗算範例（訂單 #0600007 鎖匙扣，嬰兒左手×1 + 右手×2，不銹鋼）**
- 左手第1件（首件）= 60+95+10+20 = $185
- 右手第1件（首件）= 60+95+10+20 = $185
- 右手第2件（加購，免畫圖）= 95+10+20 = $125
- 小計 = $495；運費扣減 = (3件−1)×$20 = $40；**鎖匙扣成本 = $455**

**售價（price）邏輯另計**：在 `freehandsss_dashboardV41.html` calculatePricing()（S mode=加購/P mode=單購階梯價、頸鏈組 Math.floor(n/2)）。售價與成本是兩套邏輯，勿混淆。

**根因**：這些規則只散落在售價代碼，從未寫進 [[feedback_finance_rules_must_be_recorded]] 指的權威成本文件。修正任務 G1–G7 + 財務核心資料 PRM 進行中（2026-06-02 起）。

---

**⚠️ 2026-06-03 追加：收款確收守護（Rule 3.16 觸發記錄）**

「前端利潤最高真理」規則的正確語義（Fat Mo 2026-06-03 確認）：
- **真理側 = 收款確收**：`final_sale_price` = Deposit + Balance + Additional_Fee（操作者手輸）= 絕對真理，n8n 嚴禁覆蓋
- **成本側 = n8n 估算**：`total_cost` 及四分量由 n8n 從 Supabase `cost_configurations` 計算，屬後台記帳快照
- **利潤** = `final_sale_price`（確收）- `total_cost`（估算），由 n8n 計算
- `calculatePricing()` 前端顯示的金額 = 供操作者參考的**預算估算**，非確收數字

**AI 過失記錄**：AI 曾將此規則誤讀為「前端估算成本亦為真理」，導致 B2 設計方向錯誤。AGENTS.md v1.4.10 已修正規則文字並新增 Rule 3.16（財務規則前置讀取強制律）。
