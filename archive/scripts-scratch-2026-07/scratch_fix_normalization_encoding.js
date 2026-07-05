const fs = require('fs');
const path = require('path');

const livePath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const wf = JSON.parse(fs.readFileSync(livePath, 'utf8'));

// 1. Fix Parse Items & Generate SKU
const parseNode = wf.nodes.find(n => n.name === 'Parse Items & Generate SKU');
if (parseNode) {
  parseNode.parameters.jsCode = `// === V45.7.4 Parse Items & Generate SKU (SKU Normalization Layer) ===
const body = $("Receive Dashboard Order").first().json.body || $("Receive Dashboard Order").first().json;
const orderId = body.Order_ID || "未命名";
const customer = body.Customer_Name || "未命名";
const appDate = body.Appointment_Date || null;
const confirmDate = body.Order_Confirm_Date || null;
const revenue = (body.Deposit || 0) + (body.Balance || 0) + (body.Additional_Fee || 0);
const rawText = body.Full_Order_Text || "";
const rawState = body.Raw_Form_State || "";

let outputItems = [];

// V45.7.4: Support both Order_Items_List (Dashboard) and Items (legacy/test)
const itemsList = body.Order_Items_List || body.Items;

if (itemsList && Array.isArray(itemsList)) {
    for (const item of itemsList) {
        let sku = item.Product_Name || "";
        const qty = Number(item.Quantity) || 1;

        // === 1. 3D Display SKU Normalization (Bible V3.7 Section 4) ===
        // Handles: 木框款式/木框套裝/立體擺設(木框) → 木框套裝 (N肢)
        // Rule: 3肢 maps to 4肢 pricing per V3.7
        if (sku.includes("木框")) {
            let limb = (sku.includes("4肢") || sku.includes("3肢")) ? "(4肢)" : "(2肢)";
            sku = \`木框套裝 \${limb}\`;
        } else if (sku.includes("玻璃瓶")) {
            let limb = (sku.includes("4肢") || sku.includes("3肢")) ? "(4肢)" : "(2肢)";
            sku = \`玻璃瓶套裝 \${limb}\`;
        }

        // === 2. Keychain SKU Normalization ===
        // Dashboard sends: "嬰兒鎖匙扣 - 不銹鋼" + Mode: "(加購)"
        // Airtable expects: "嬰兒鎖匙扣 - 不銹鋼 - {qty}飾 {mode}"
        if (sku.includes("鎖匙扣") && item.Mode) {
            sku = \`\${sku} - \${qty}飾 \${item.Mode}\`;
        }

        // === 3. Jewelry/Charm SKU Normalization ===
        // Dashboard sends: "嬰兒吊飾 - 925銀" + Mode: "(加購)"
        // Airtable expects: "嬰兒吊飾 - 925銀 - {qty}飾 {mode}"
        if (sku.includes("吊飾") && item.Mode) {
            sku = \`\${sku} - \${qty}飾 \${item.Mode}\`;
        }

        let shipping_saved = (sku.includes("鎖匙扣") && qty > 1) ? (qty - 1) * 20 : 0;
        let necklace_saved = (sku.includes("吊飾")) ? Math.floor(qty / 2) * 220 : 0;

        outputItems.push({
            json: {
                Order_ID: orderId,
                Customer_Name: customer,
                Appointment_Date: appDate,
                Order_Confirm_Date: confirmDate,
                Total_Revenue: revenue,
                Order_Text: rawText,
                Raw_Form_State: rawState,
                Search_SKU: sku,
                Original_Qty: qty,
                Item_Notes: item.Notes || "",
                Order_Item_Key: item.Order_Item_Key || "",
                Shipping_Deduction: shipping_saved,
                Necklace_Deduction: necklace_saved
            }
        });
    }
} else {
    outputItems.push({ json: { Order_ID: orderId, Customer_Name: customer, Total_Revenue: revenue, Order_Text: rawText, Raw_Form_State: rawState, Search_SKU: "無商品", Shipping_Deduction: 0, Necklace_Deduction: 0 }});
}
return outputItems;`;
}

// 2. Fix Bind Main Order ID comments
const bindNode = wf.nodes.find(n => n.name === 'Bind Main Order ID');
if (bindNode) {
  bindNode.parameters.jsCode = `// 1. 抓取剛剛建好的「主訂單 ID」
const recordId = $input.first().json.id;

// 2. 獲取打包好的子項目清單
const subItems = $('Calculate Profit & Pack Items').first().json.Sub_Items || [];

// 3. 轉換為 n8n 資料格式
// Product_ID 為空時跳過 - 因為 null 會在 Airtable 報錯 [null]，
// linked record 不接受 null ID，此處 Create Sub Items 報錯會卡住 Telegram 戰報
return subItems
  .filter(item => item.Order_Item_Key)
  .map(item => {
    const row = {
      Quantity: item.Quantity,
      Notes: item.Notes,
      Main_Order_ID: recordId,
      Order_Item_Key: item.Order_Item_Key
    };
    if (item.Product_Record_ID) row.Product_ID = item.Product_Record_ID;
    return { json: row };
  });`;
}

// Write it back
fs.writeFileSync(livePath, JSON.stringify(wf, null, 2), 'utf8');
console.log("Successfully fixed all character encodings in FHS_Core_OrderProcessor_live.json");
