# FHS Lesson - 2026-05-09
# 嬰兒肢體「待定」預設邏輯與報價一致性

## 背景
為了避免使用者在進入「自訂」模式時忘記選擇顏色而導致系統誤判為「無肢體」（進而報價為 $0 或錯誤金額），需要實作安全預設機制。

## 核心教訓
1. **防錯設計 (Safety Default)**：當觸發 `babySetMode('custom')` 時，強制將四肢設為「待定」而非空值。
2. **報價邏輯相容性**：
   - 報價系統 (`buildOrderItemsForPricing`) 必須將「待定」視為「有效肢體」，以觸發 4 肢的基準報價（$2380）。
   - IG 預覽邏輯需保留「待定」顯示，以便客服識別尚未完成的選擇。
3. **顏色結構優化**：將複合選項（如「粉紅及藍」）拆分為獨立的「粉紅色」與「藍色」，提升數據原子性。

## 程式碼模式
```javascript
// babySetMode 修改
if (mode === 'custom') {
    ['LHand', 'RHand', 'LFoot', 'RFoot'].forEach(id => {
        document.getElementById('baby' + id).value = '待定';
    });
    babyApplyAllCustom(); // 立即同步狀態
}
```

## 驗證清單
- [x] 切換自訂 ↓：四肢預設「待定」
- [x] 報價顯示：$2380 (4 肢)
- [x] IG 預覽：顯示「待定」
- [x] 成本計算：正確反映 4 肢成本
