# Implementation Plan — Add Instagram Message Preview & Enlarge Details Modal

This plan adds Instagram message preview capability directly to the order details popup modal (`#fhsOrderModal`) and widens the modal layout for easier reading of raw conversation text.

---

## Proposed Changes

### Component: Frontend Dashboard UI

#### [MODIFY] [freehandsss_dashboardV41.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/freehandsss_dashboardV41.html)

##### 1. Widen the details modal container
In the CSS style section, modify `.fhs-modal-box` to increase its size:
```css
/* Before */
.fhs-modal-box { background:#fff; border-radius:12px; width:100%; max-width:560px; max-height:90dvh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.22); }

/* After */
.fhs-modal-box { background:#fff; border-radius:12px; width:100%; max-width:min(800px, 95vw); max-height:90dvh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.22); }
```

##### 2. Add `full_order_text` to Supabase select query
Update the select query in `sbFetchGlobalReview()` to retrieve `full_order_text`:
```javascript
// Before
const qs = { select: 'id,order_id,customer_name,confirmed_at,appointment_at,deposit,balance,additional_fee,adjustment_amount,final_sale_price,total_cost,net_profit,process_status,batch_number,admin_notes,raw_form_state', deleted_at: 'is.null', order: 'confirmed_at.asc', limit: 200 };

// After
const qs = { select: 'id,order_id,customer_name,confirmed_at,appointment_at,deposit,balance,additional_fee,adjustment_amount,final_sale_price,total_cost,net_profit,process_status,batch_number,admin_notes,raw_form_state,full_order_text', deleted_at: 'is.null', order: 'confirmed_at.asc', limit: 200 };
```

##### 3. Map `full_order_text` in `mapOrder`
Update `mapOrder()` to assign the `Full_Order_Text` property:
```javascript
// Before
                Admin_Notes:      row.admin_notes || '',
                items:            mappedItems,

// After
                Admin_Notes:      row.admin_notes || '',
                Full_Order_Text:  row.full_order_text || '',
                items:            mappedItems,
```

##### 4. Display IG Message in `openOrderModal()`
Add a new collapsible section `💬 IG 原始訊息` in `openOrderModal()`:
```javascript
            var msgHtml = '<div style="padding:4px 0;white-space:pre-wrap;color:#333;font-family:monospace;font-size:12px;background:#f9f9f9;border:1px solid #eee;border-radius:4px;padding:8px;max-height:250px;overflow-y:auto;text-align:left;">' +
                (o.Full_Order_Text ? o.Full_Order_Text.replace(/</g,'&lt;') : '（無原始訊息）') + '</div>';
```
Insert it into `fhsModalBody.innerHTML`:
```javascript
            document.getElementById('fhsModalBody').innerHTML =
                _sec('💰 財務摘要', finHtml, false) +
                _sec('📦 產品明細', itemsHtml, true) +
                _sec('💬 IG 原始訊息', msgHtml, true) +
                _sec('📝 備註', notesHtml, false);
```

#### [MODIFY] [Freehandsss_dashboard_current.html](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/Freehandsss_Dashboard/Freehandsss_dashboard_current.html)
After modifying `freehandsss_dashboardV41.html`, copy it to `Freehandsss_dashboard_current.html` using the terminal command:
```powershell
cp "Freehandsss_Dashboard/freehandsss_dashboardV41.html" "Freehandsss_Dashboard/Freehandsss_dashboard_current.html"
```

---

## Verification Plan

### Manual Verification
1. Open the dashboard in the browser.
2. Go to **Review Mode** (訂單總覽).
3. Click the details icon (📋) for any order.
4. Verify that:
   - The modal popup is wider and more spacious.
   - The collapsible `💬 IG 原始訊息` section is displayed and expanded by default.
   - The original Instagram message details are printed clearly within it.
