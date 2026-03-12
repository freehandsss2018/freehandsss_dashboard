import sys
import re

file_path = r'd:\SynologyDrive\Free_handsss\freehandsss_dashboard\freehandsss_dashboardV27.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add modeReviewBtn
btn_replacement = """                <button id="modeCreateBtn" onclick="switchMode('create')"
                    style="padding:8px 15px; border-radius:8px; border:none; background:var(--primary); color:white; font-weight:bold; cursor:pointer;">新增訂單</button>
                <button id="modeEditBtn" onclick="switchMode('edit')"
                    style="padding:8px 15px; border-radius:8px; border:1px solid #ccc; background:#eee; color:#666; font-weight:bold; cursor:pointer;">修改舊單</button>
                <button id="modeReviewBtn" onclick="switchMode('review')"
                    style="padding:8px 15px; border-radius:8px; border:1px solid #ccc; background:#eee; color:#666; font-weight:bold; cursor:pointer;">📊 全域核對</button>"""

content = re.sub(
    r'<button id="modeCreateBtn".*?<button id="modeEditBtn"[^>]*>修改舊單</button>',
    btn_replacement,
    content,
    flags=re.DOTALL
)

# 2. Add reviewModeContainer and formContainer
container_replacement = """            <div id="searchSuggestions" class="suggestions-box"></div>
        </div>
    </div>
    
    <!-- 全域核對中心 (Excel Style) -->
    <div id="reviewModeContainer" style="display:none; width:100%;">
        <div class="card" style="border-top: 5px solid #D4A373;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap: wrap; gap: 10px;">
                <h2 style="margin:0; padding:0;">📊 全域核對中心 (Global Review)</h2>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap: wrap;">
                    <select id="reviewYear" style="width:100px; padding:8px;" onchange="fetchGlobalReview()"></select>
                    <select id="reviewMonth" style="width:100px; padding:8px;" onchange="fetchGlobalReview()">
                        <option value="">全部月份</option>
                        <option value="01">1月</option><option value="02">2月</option><option value="03">3月</option>
                        <option value="04">4月</option><option value="05">5月</option><option value="06">6月</option>
                        <option value="07">7月</option><option value="08">8月</option><option value="09">9月</option>
                        <option value="10">10月</option><option value="11">11月</option><option value="12">12月</option>
                    </select>
                    <select id="reviewStatus" style="width:200px; padding:8px;" onchange="fetchGlobalReview()">
                        <option value="">全部狀態</option>
                        <option value="0 什麼都未做">0 什麼都未做</option>
                        <option value="1 已繪圖 或 已取相">1 已繪圖 或 已取相</option>
                        <option value="1.5 已交付建模師, 等3D圖中">1.5 已交付建模師, 等3D圖中</option>
                        <option value="2 已修3D圖, 但未核對">2 已修3D圖, 但未核對</option>
                        <option value="2.5 已核對3D圖, 準備打印">2.5 已核對3D圖, 準備打印</option>
                        <option value="3 已交付廠家, 打印中">3 已交付廠家, 打印中</option>
                        <option value="Done 已完成">Done 已完成</option>
                    </select>
                    <input type="text" id="reviewBatch" placeholder="批次 (e.g. 第31批)" style="width:120px; padding:8px;" oninput="debounceFetchGlobalReview()">
                    <input type="text" id="reviewSearch" placeholder="搜尋姓名/單號" style="width:150px; padding:8px;" oninput="debounceFetchGlobalReview()">
                    <button onclick="fetchGlobalReview()" style="padding:8px 15px; border-radius:8px; border:none; background:#2A9D8F; color:white; font-weight:bold; cursor:pointer;">更新</button>
                    <span id="reviewLoading" style="display:none; color:#E76F51; font-weight:bold; font-size: 14px;">🔄 載入中...</span>
                </div>
            </div>
            
            <div style="overflow-x: auto; max-height: 70vh; border: 1px solid #ddd; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;" id="reviewTable">
                    <thead style="position: sticky; top: 0; background: #2A2D43; color: white; z-index: 10;">
                        <tr>
                            <th style="padding: 10px; border: 1px solid #444; min-width:80px;">S/N</th>
                            <th style="padding: 10px; border: 1px solid #444; min-width:90px;">Date</th>
                            <th style="padding: 10px; border: 1px solid #444; min-width:80px;">Customer</th>
                            <th style="padding: 10px; border: 1px solid #444; min-width:140px;">Admin Notes</th>
                            <th style="padding: 10px; border: 1px solid #444; min-width:140px;">Engraving</th>
                            <th style="padding: 10px; border: 1px solid #444; min-width:160px;">Product Items</th>
                            <th style="padding: 10px; border: 1px solid #444; min-width:90px;">Batch</th>
                            <th style="padding: 10px; border: 1px solid #444; min-width:140px;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="reviewTableBody">
                        <tr><td colspan="8" style="padding:20px; text-align:center; color:#888;">請選擇上方條件載入資料</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- 原有表單區域 -->
    <div id="formContainer">
        <div class="verification-list card">"""

content = content.replace(
    """            <div id="searchSuggestions" class="suggestions-box"></div>
        </div>
    </div>

    <div class="verification-list card">""",
    container_replacement
)

# 3. Close formContainer before bottom-action-bar
content = content.replace(
    """    <div class="bottom-action-bar">""",
    """    </div> <!-- End formContainer -->\n    <div class="bottom-action-bar" id="bottomActionBar">"""
)

# 4. Replace switchMode JS
new_switchMode = """        function switchMode(mode) {
            if (currentMode !== mode) {
                resetForm(); // 只要模式改變，就清空表單
            }
            currentMode = mode;
            if (mode === 'create') {
                document.getElementById('editModeContainer').style.display = 'none';
                if(document.getElementById('reviewModeContainer')) document.getElementById('reviewModeContainer').style.display = 'none';
                if(document.getElementById('formContainer')) document.getElementById('formContainer').style.display = 'block';

                document.getElementById('modeCreateBtn').style.background = 'var(--primary)';
                document.getElementById('modeCreateBtn').style.color = 'white';
                document.getElementById('modeCreateBtn').style.border = 'none';
                
                document.getElementById('modeEditBtn').style.background = '#eee';
                document.getElementById('modeEditBtn').style.color = '#666';
                document.getElementById('modeEditBtn').style.border = '1px solid #ccc';
                
                if (document.getElementById('modeReviewBtn')) {
                    document.getElementById('modeReviewBtn').style.background = '#eee';
                    document.getElementById('modeReviewBtn').style.color = '#666';
                    document.getElementById('modeReviewBtn').style.border = '1px solid #ccc';
                }

                const syncBtn = document.getElementById('syncBtn');
                if (syncBtn) {
                    syncBtn.innerText = '🚀 建立新單並同步至後台';
                    syncBtn.style.backgroundColor = '#457B9D';
                    syncBtn.style.opacity = '1';
                    syncBtn.style.pointerEvents = 'auto';
                }
                const bbar = document.getElementById('bottomActionBar');
                if(bbar) bbar.style.display = 'flex';
                
            } else if (mode === 'edit') {
                document.getElementById('editModeContainer').style.display = 'block';
                if(document.getElementById('reviewModeContainer')) document.getElementById('reviewModeContainer').style.display = 'none';
                if(document.getElementById('formContainer')) document.getElementById('formContainer').style.display = 'block';

                document.getElementById('modeCreateBtn').style.background = '#eee';
                document.getElementById('modeCreateBtn').style.color = '#666';
                document.getElementById('modeCreateBtn').style.border = '1px solid #ccc';
                
                document.getElementById('modeEditBtn').style.background = 'var(--primary)';
                document.getElementById('modeEditBtn').style.color = 'white';
                document.getElementById('modeEditBtn').style.border = 'none';

                if (document.getElementById('modeReviewBtn')) {
                    document.getElementById('modeReviewBtn').style.background = '#eee';
                    document.getElementById('modeReviewBtn').style.color = '#666';
                    document.getElementById('modeReviewBtn').style.border = '1px solid #ccc';
                }

                const syncBtn = document.getElementById('syncBtn');
                if (syncBtn) {
                    syncBtn.innerText = '📝 更新舊單並同步至後台';
                    syncBtn.style.backgroundColor = '#D4A373';
                    syncBtn.style.opacity = '1';
                    syncBtn.style.pointerEvents = 'auto';
                }
                const bbar = document.getElementById('bottomActionBar');
                if(bbar) bbar.style.display = 'flex';
                
            } else if (mode === 'review') {
                document.getElementById('editModeContainer').style.display = 'none';
                if(document.getElementById('formContainer')) document.getElementById('formContainer').style.display = 'none';
                if(document.getElementById('reviewModeContainer')) document.getElementById('reviewModeContainer').style.display = 'block';

                document.getElementById('modeCreateBtn').style.background = '#eee';
                document.getElementById('modeCreateBtn').style.color = '#666';
                document.getElementById('modeCreateBtn').style.border = '1px solid #ccc';
                
                document.getElementById('modeEditBtn').style.background = '#eee';
                document.getElementById('modeEditBtn').style.color = '#666';
                document.getElementById('modeEditBtn').style.border = '1px solid #ccc';

                if (document.getElementById('modeReviewBtn')) {
                    document.getElementById('modeReviewBtn').style.background = 'var(--primary)';
                    document.getElementById('modeReviewBtn').style.color = 'white';
                    document.getElementById('modeReviewBtn').style.border = 'none';
                }

                const bbar = document.getElementById('bottomActionBar');
                if(bbar) bbar.style.display = 'none'; // Hide bottom bar
                
                initReviewYears();
                fetchGlobalReview();
            }
        }"""

content = re.sub(
    r'        function switchMode\(mode\) \{.*?            \} else \{.*?            \}\n        \}',
    new_switchMode,
    content,
    flags=re.DOTALL
)

# 5. Append new Review JS logic
new_js = """
        // ==========================================
        // V27 Global Review System
        // ==========================================
        let reviewFetchTimeout = null;
        let globalOrders = [];
        
        const BATCH_COLORS = [
            "#fdf6e3", "#f4f1de", "#e9edc9", "#fefae0", "#faedcd", "#d4a373", 
            "#e2ece9", "#dfe7fd", "#f8ad9d", "#fbc4ab", "#ffdab9"
        ];
        
        function getBatchColor(batch) {
            if (!batch || batch.trim() === '') return '#ffffff';
            let hash = 0;
            for (let i = 0; i < batch.length; i++) {
                hash = batch.charCodeAt(i) + ((hash << 5) - hash);
            }
            const index = Math.abs(hash) % BATCH_COLORS.length;
            return BATCH_COLORS[index];
        }

        function initReviewYears() {
            const yearSel = document.getElementById("reviewYear");
            if (yearSel.options.length > 0) return;
            const currentYear = new Date().getFullYear();
            yearSel.innerHTML = '<option value="">全部年份</option>';
            for(let y = currentYear; y >= currentYear - 3; y--) {
                yearSel.innerHTML += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
            }
        }

        function debounceFetchGlobalReview() {
            clearTimeout(reviewFetchTimeout);
            reviewFetchTimeout = setTimeout(fetchGlobalReview, 600);
        }

        async function fetchGlobalReview() {
            const year = document.getElementById("reviewYear").value;
            const month = document.getElementById("reviewMonth").value;
            const status = document.getElementById("reviewStatus").value;
            const batch = document.getElementById("reviewBatch").value.trim();
            const search = document.getElementById("reviewSearch").value.trim();
            
            const tbody = document.getElementById("reviewTableBody");
            const loading = document.getElementById("reviewLoading");
            
            loading.style.display = "inline";
            tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; text-align:center; color:#888;">⏳ 讀取資料中... (如果資料量大可能需要幾秒鐘)</td></tr>';

            const url = new URL("https://yanhei.synology.me:8443/webhook/fetch-global-review");
            if(year) url.searchParams.append("year", year);
            if(month) url.searchParams.append("month", month);
            if(status) url.searchParams.append("status", status);
            if(batch) url.searchParams.append("batch", batch);
            if(search) url.searchParams.append("search", search);

            try {
                const res = await fetch(url.toString(), { method: 'GET' });
                const data = await res.json();
                
                loading.style.display = "none";
                
                if (data && data.orders) {
                    globalOrders = data.orders;
                    renderReviewTable(globalOrders);
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; text-align:center; color:#E63946;">⚠️ 未找到符合條件的訂單</td></tr>';
                }
            } catch (err) {
                console.error(err);
                loading.style.display = "none";
                tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; text-align:center; color:#E63946;">❌ 網路連線錯誤，無法載入資料。請檢查 n8n Webhook。</td></tr>';
            }
        }

        function renderReviewTable(orders) {
            const tbody = document.getElementById("reviewTableBody");
            if (!orders || orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; text-align:center; color:#888;">沒有符合條件的項目</td></tr>';
                return;
            }

            let html = "";
            orders.forEach((o, index) => {
                const cDate = o.Date ? new Date(o.Date).toLocaleDateString('zh-HK') : 'N/A';
                const batchCol = getBatchColor(o.Batch);
                
                let prodHtml = "";
                let engText = "";
                if(o.items && o.items.length > 0) {
                    o.items.forEach(i => {
                        prodHtml += `<div style="margin-bottom:2px; font-size:12px; padding:2px; background:#f9f9f9; border-radius:4px; border:1px solid #eee;">${i.Item_ID || ''} - ${i.Product || ''} (x${i.Qty || 1})</div>`;
                        if(i.Engraving && i.Engraving !== '待定' && i.Engraving !== '不適用') {
                            engText += `<div style="font-size:12px;">${i.Item_ID}: ${i.Engraving}</div>`;
                        }
                    });
                } else {
                    prodHtml = '<span style="color:#aaa;">無子項目</span>';
                }

                html += `
                <tr style="border-bottom: 1px solid #eee; background-color: ${batchCol}; transition: background 0.3s;" id="row-${o.id}">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight:bold; color:#B07D4C;">${o.Order_ID || 'N/A'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; font-size:12px;">${cDate}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${o.Customer || '-'}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">
                        <textarea style="width:100%; height:50px; font-size:12px; padding:4px;" 
                                  onblur="saveInlineEdit('${o.id}', 'Admin_Notes', this.value)" 
                                  placeholder="備註...">${o.Admin_Notes || ''}</textarea>
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; color:#457B9D; font-size:12px;">
                        ${engText || '-'}
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd;">
                        <div style="max-height: 80px; overflow-y:auto; padding-right:5px;">${prodHtml}</div>
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd;">
                        <input type="text" style="width:100%; font-size:12px; padding:4px;" 
                               value="${o.Batch || ''}" 
                               onblur="saveInlineEdit('${o.id}', 'Batch_Number', this.value)" 
                               placeholder="第X批">
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd;">
                        <select style="width:100%; font-size:12px; padding:4px;" 
                                onchange="saveInlineEdit('${o.id}', 'Process_Status', this.value)">
                            <option value="0 什麼都未做" ${o.Status === '0 什麼都未做' ? 'selected' : ''}>0 什麼都未做</option>
                            <option value="1 已繪圖 或 已取相" ${o.Status === '1 已繪圖 或 已取相' ? 'selected' : ''}>1 已繪圖 或 已取相</option>
                            <option value="1.5 已交付建模師, 等3D圖中" ${o.Status === '1.5 已交付建模師, 等3D圖中' ? 'selected' : ''}>1.5 已交付建模師...</option>
                            <option value="2 已修3D圖, 但未核對" ${o.Status === '2 已修3D圖, 但未核對' ? 'selected' : ''}>2 已修3D圖...</option>
                            <option value="2.5 已核對3D圖, 準備打印" ${o.Status === '2.5 已核對3D圖, 準備打印' ? 'selected' : ''}>2.5 已核對3D圖...</option>
                            <option value="3 已交付廠家, 打印中" ${o.Status === '3 已交付廠家, 打印中' ? 'selected' : ''}>3 已交付廠家, 打印中</option>
                            <option value="Done 已完成" ${o.Status === 'Done 已完成' ? 'selected' : ''}>Done 已完成</option>
                        </select>
                        <div id="save-indicator-${o.id}" style="font-size:10px; color:#2A9D8F; text-align:right; min-height:12px; margin-top:2px;"></div>
                    </td>
                </tr>`;
            });

            tbody.innerHTML = html;
        }

        async function saveInlineEdit(recordId, field, value) {
            const ind = document.getElementById(`save-indicator-${recordId}`);
            if (ind) {
                ind.innerText = "儲存中...";
                ind.style.color = "#E76F51";
            }
            
            // Find order to keep other fields unchanged
            const orderIndex = globalOrders.findIndex(o => o.id === recordId);
            if (orderIndex > -1) {
                if (field === 'Admin_Notes') globalOrders[orderIndex].Admin_Notes = value;
                else if (field === 'Batch_Number') {
                    globalOrders[orderIndex].Batch = value;
                    // update background colour immediately
                    const row = document.getElementById(`row-${recordId}`);
                    if(row) row.style.backgroundColor = getBatchColor(value);
                }
                else if (field === 'Process_Status') globalOrders[orderIndex].Status = value;
                
                const o = globalOrders[orderIndex];
                
                const payload = {
                    Record_ID: recordId,
                    Batch_Number: o.Batch || '',
                    Process_Status: o.Status || '0 什麼都未做',
                    Admin_Notes: o.Admin_Notes || ''
                };

                try {
                    const url = "https://yanhei.synology.me:8443/webhook/update-order-meta";
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    if(res.ok) {
                        if (ind) {
                            ind.innerText = "✔ 已儲存";
                            ind.style.color = "#2A9D8F";
                            setTimeout(() => { if(ind.innerText === "✔ 已儲存") ind.innerText = ""; }, 2000);
                        }
                    } else {
                        if (ind) {
                            ind.innerText = "❌ 儲存失敗";
                            ind.style.color = "red";
                        }
                    }
                } catch(e) {
                    console.error(e);
                    if (ind) {
                        ind.innerText = "❌ 網路錯誤";
                        ind.style.color = "red";
                    }
                }
            }
        }
        
    </script>
</body>"""

# Find closing script and body tags
content = content.replace("    </script>\n</body>", new_js)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patch applied successfully.")
