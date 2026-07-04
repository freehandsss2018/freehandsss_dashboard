# 20260326_Triple_Sync_Field_Map_Ground_Truth

## 學習點總結
建立全系統三端對齊（Dashboard -> n8n -> Airtable）的欄位映射「唯一真理地圖」。此舉徹底解決了因 Payloads 格式不一導致的成本（SKU）數據丟失問題。

## 詳細紀錄
1. **問題定義**：前端傳送 `Order_Items_List` 而測試代碼使用 `Items`，導致 n8n 處理邏輯落空。
2. **解決策略**：
    - 建立 `Triple_Sync_Field_Map.md` 文件。
    - 詳細列出 **Order Level (16 欄)**、**Item Level (12 欄)** 與 **Raw_Form_State** 內嵌欄位的對照關係。
    - **SKU 正規化層**：實裝 3D 擺設（3肢/4肢）與鎖匙扣五維度匹配邏輯。
3. **長期價值**：未來 AI 助理（Gemini/Claude）在修改工作流前，必須強制對齊此地圖，實現 100% 數據流一致性。

## 標籤
#Airtable #n8n #Architecture #DataGovernance
