# A2 Implementation Plan — Layout Optimization and Auto-Expanding Modal Textareas

## 1. Goal & Scope
Implement visual layout optimizations and dynamic auto-resizing textareas in the FHS Dashboard (V41) to improve form usability and information readability on mobile and desktop viewports.

Specifically:
1. **Reorder Financial Split Boxes**: Order of inputs in the financial splits block should be: Main Product ➔ Lights Add-on ➔ Wool felt doll Add-on ➔ Keychains ➔ Pendants.
2. **Simplify Display Labels**: Strip material suffixes (` - 不銹鋼`, ` - 鋁合金`, ` - 925銀`, ` - 925金`) in `renderPaymentSplits()` to fit labels within columns and avoid truncation.
3. **Auto-Expanding Modal Textareas**: Eliminate internal scrollbars and manual resizing handles for the Category A/B preview textareas. Textareas will expand to show the *entire* content height automatically upon load, format toggle, or user input.

---

## 2. Findings & Risks
* **Array Index Mapping Risk**: In `syncToAirtable()`, the database sync payload matches the pricing calculations array `window.fhsCurrentPricingItems` by index. If the sorting order is modified in `buildOrderItemsForPricing()` but not synced in `syncToAirtable()`, prices and item keys will mismatch.
  * *Mitigation*: Both functions must be edited to push items in the exact same sequence.
* **Hidden Dimension Calculation Risk**: Calling `scrollHeight` on a textarea while it is hidden (`display: none` or inside a hidden modal overlay) returns `0`.
  * *Mitigation*: Trigger the auto-resize logic via a `setTimeout` of 50ms after the modal is displayed (`overlay.classList.add('is-open')`).
* **Manual Input Support**: The textareas are editable.
  * *Mitigation*: Attach an `oninput` handler to both textareas that calls `_autoResize(this)` on every keypress.

---

## 3. Proposed File Changes

### `[MODIFY] d:\SynologyDrive\Free_handsss\freehandsss_dashboard\Freehandsss_Dashboard\Freehandsss_dashboard_current.html`
### `[MODIFY] d:\SynologyDrive\Free_handsss\freehandsss_dashboard\Freehandsss_Dashboard\freehandsss_dashboardV41.html`

#### Changes in `<style>` (around line 2255):
```css
        #igPreviewModal .igpm-pre {
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 13px;
            line-height: 1.55;
            color: #1D3557;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 12px 14px;
            margin: 0 0 16px;
            min-height: 200px; /* Enhanced default */
            border: 1px solid #e9ecef;
            width: 100%;
            box-sizing: border-box;
            resize: none; /* Disable manual drag resize */
            overflow-y: hidden; /* Hide scrollbars as it auto-expands */
            font-family: inherit;
            outline: none;
        }
```

#### Changes in `buildOrderItemsForPricing()` (around line 4910):
Reorder item push sequences:
```javascript
            // 1. MAIN PRODUCT
            // (pushed here...)
            
            // 2. LIGHTS & WOOL ADD-ONS (Moved up!)
            if (getValSafe('enableP', false)) {
                if (getValSafe('l_light_en', false)) {
                    orderItemsArray.push({
                        "Order_Item_Key": "TEMP_L_LIGHTS",
                        "Product_Name": "燈飾 - 加購",
                        "Quantity": 1,
                        "isAccessory": true
                    });
                }
                if (getValSafe('w_wool_en', false)) {
                    let qty = Math.max(1, Math.floor(Number(getValSafe('w_wool_qty', '1')) || 1));
                    orderItemsArray.push({
                        "Order_Item_Key": "TEMP_W_WOOL",
                        "Product_Name": "羊毛氈公仔 - 加購",
                        "Quantity": qty,
                        "isAccessory": true
                    });
                }
            }

            // 3. KEYCHAINS
            // (pushed here...)

            // 4. PENDANTS
            // (pushed here...)
```

#### Changes in `syncToAirtable()` (around line 5945):
Reorder item push sequences to match `buildOrderItemsForPricing()`:
```javascript
                // 1. MAIN PRODUCT
                // (pushed here...)

                // 2. LIGHTS & WOOL ADD-ONS (Moved up!)
                const _diagEnP = getValSafe('enableP', false);
                const _diagLight = getValSafe('l_light_en', false);
                if (_diagEnP && _diagLight) {
                    orderItemsArray.push({
                        "Order_Item_Key": `${currentOrderId}_L_LIGHTS`,
                        "Product_Name": "燈飾 - 加購",
                        "Quantity": 1
                    });
                }
                const _diagWool = getValSafe('w_wool_en', false);
                if (_diagEnP && _diagWool) {
                    orderItemsArray.push({
                        "Order_Item_Key": `${currentOrderId}_W_WOOL`,
                        "Product_Name": "羊毛氈公仔 - 加購",
                        "Quantity": 1
                    });
                }

                // 3. KEYCHAINS
                // (pushed here...)

                // 4. PENDANTS
                // (pushed here...)
```

#### Changes in `renderPaymentSplits(field)` (around line 9188):
Simplify display label by removing material suffixes:
```javascript
                const bk = _boxKey(item, index);
                let displayName = item.Product_Name;
                displayName = displayName.replace(/ - 不銹鋼/g, '').replace(/ - 鋁合金/g, '').replace(/ - 925銀/g, '').replace(/ - 925金/g, '');
                const label = displayName + (item.PartDesc ? ' (' + item.PartDesc + ')' : '');
```

#### Changes in Modal JS (around line 11545):
Define and integrate `_autoResize()` utility:
```javascript
        // Auto resize textarea height to fit content scrollHeight
        function _autoResize(el) {
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
        window._autoResize = _autoResize;

        // Refresh modal body from live textarea values
        function _igpmRefresh() {
            var valA = (document.getElementById('output-preview-a') || {}).value || '';
            var valB = (document.getElementById('output-preview-b') || {}).value || '';
            var preA = document.getElementById('igpmPreA');
            var preB = document.getElementById('igpmPreB');
            var lblB = document.getElementById('igpmLabelB');
            if (preA) {
                preA.value = valA.trim() || '(無內容)';
            }
            var hasBContent = valB.trim().length > 0;
            if (preB)  { 
                preB.value = valB.trim() || ''; 
                preB.style.display = hasBContent ? '' : 'none'; 
            }
            if (lblB)  { lblB.style.display = hasBContent ? '' : 'none'; }
            // Sync format toggle button label
            var btnOrig  = document.getElementById('igFmtToggleA');
            var btnModal = document.getElementById('igFmtToggleAModal');
            if (btnOrig && btnModal) btnModal.textContent = btnOrig.textContent;
        }

        // Open modal
        window.openIgPreviewModal = function() {
            if (typeof window.generate === 'function') { window.generate(); }
            _igpmRefresh();
            var status = document.getElementById('igpmSyncStatus');
            if (status) { status.textContent = ''; status.style.color = ''; }
            var overlay = document.getElementById('igPreviewModalOverlay');
            if (overlay) overlay.classList.add('is-open');
            
            // Auto resize textareas after modal is shown to ensure correct scrollHeight calculation
            var preA = document.getElementById('igpmPreA');
            var preB = document.getElementById('igpmPreB');
            setTimeout(function() {
                _autoResize(preA);
                if (preB && preB.style.display !== 'none') {
                    _autoResize(preB);
                }
            }, 50);

            var closeBtn = overlay && overlay.querySelector('.igpm-close-btn');
            if (closeBtn) { setTimeout(function(){ closeBtn.focus(); }, 50); }
        };

        // Format toggle inside modal
        window.igpmToggleFmt = function() {
            if (typeof window.toggleIgFormatA === 'function') { window.toggleIgFormatA(); }
            _igpmRefresh();
            var preA = document.getElementById('igpmPreA');
            var preB = document.getElementById('igpmPreB');
            _autoResize(preA);
            if (preB && preB.style.display !== 'none') {
                _autoResize(preB);
            }
        };
```

#### Changes in Modal HTML textareas (around line 11656):
```html
<textarea class="igpm-pre" id="igpmPreA" spellcheck="false" oninput="window._autoResize(this)">(無內容)</textarea>
<p class="igpm-seg-label" id="igpmLabelB" style="display:none;">⚙️ Category B — 金屬產品訊息</p>
<textarea class="igpm-pre" id="igpmPreB" style="display:none;" spellcheck="false" oninput="window._autoResize(this)">(無內容)</textarea>
```

---

## 4. NO-TOUCH Guardrail Declaration
No files have been modified in this planning phase. The changes detailed above are proposals awaiting authorization to proceed.

Please review this plan. To authorize execution, please reply with `/execute`.
