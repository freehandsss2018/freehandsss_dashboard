const fs = require('fs');
const filePath = 'd:/SynologyDrive/Free_handsss/freehandsss_dashboard/n8n/FHS_Order_Processor.json';
const data = fs.readFileSync(filePath, 'utf8');
const workflow = JSON.parse(data);

workflow.nodes.forEach(node => {
    // 1. Update Calculate Profit node to include Product_Record_ID
    if (node.name === 'Calculate Profit & Pack Items') {
        node.parameters.jsCode = `// === Freehandsss V22: 大腦 2 號 (利潤精算與雙重數據融合) ===

const firstNodeItems = $('Parse Items & Generate SKU').all();
const firstNodeData = firstNodeItems[0].json;
const totalRevenue = firstNodeData.Total_Revenue || 0;
const rawFormState = firstNodeData.Raw_Form_State || "";

let deposit = 0;
let balance = 0;
let additionalFee = 0;

try {
    const triggerBody = $('Receive Dashboard Order').first().json.body || $('Receive Dashboard Order').first().json;
    deposit = triggerBody.Deposit || 0;
    balance = triggerBody.Balance || 0;
    additionalFee = triggerBody.Additional_Fee || 0;
} catch (error) { }

let totalBaseCost = 0;
let packedItems = [];

const items = $input.all(); 
for (let i = 0; i < items.length; i++) {
    let itemCost = items[i].json.Total_Base_Cost || items[i].json.Base_Cost || 0;
    totalBaseCost += itemCost;

    let originalItemData = firstNodeItems[i] ? firstNodeItems[i].json : {};

    packedItems.push({
        Product_Record_ID: items[i].json.id, // THE RECORD ID FROM AIRTABLE database
        Product_Name: items[i].json.Product_Name || originalItemData.Search_SKU,
        Total_Base_Cost: itemCost,
        Quantity: originalItemData.Original_Qty || 1,
        Notes: originalItemData.Item_Notes || "",
        Order_Item_Key: originalItemData.Order_Item_Key
    });
}

const finalProfit = totalRevenue - totalBaseCost;

return [{
    json: {
        ...firstNodeData,              
        Total_Revenue: totalRevenue,   
        Total_Cost: totalBaseCost,     
        Final_Profit: finalProfit,     
        Deposit: deposit,              
        Balance: balance,              
        Additional_Fee: additionalFee, 
        Raw_Form_State: rawFormState,
        Sub_Items: packedItems         
    }
}];`;
    }

    // 2. Update Bind node to pass Product_Record_ID
    if (node.name === 'Bind Main Order ID') {
        node.parameters.jsCode = `// 1. 抓取剛剛建好的「主訂單 ID」
const recordId = $input.first().json.id;

// 2. 獲取打包好的子項目清單
const subItems = $('Calculate Profit & Pack Items').first().json.Sub_Items || [];

// 3. 轉換為 n8n 資料格式
return subItems.map(item => ({
  json: {
    Product_ID: item.Product_Record_ID,
    Quantity: item.Quantity,
    Notes: item.Notes,
    Main_Order_ID: recordId,
    Order_Item_Key: item.Order_Item_Key
  }
}));`;
    }

    // 3. Update Create Sub Items mapping to use IDs
    if (node.name === 'Create Sub Items') {
        node.parameters.operation = 'upsert';
        node.parameters.columns.mappingMode = 'defineBelow';
        node.parameters.columns.value = {
            "Product_Link": "={{ [$json.Product_ID] }}",
            "Quantity": "={{ Number($json.Quantity) }}",
            "Engraving_Text": "={{ $json.Notes }}",
            "Order_Link": "={{ [$json.Main_Order_ID] }}",
            "Order_Item_Key": "={{ $json.Order_Item_Key }}"
        };
        node.parameters.columns.matchingColumns = ["Order_Item_Key"];
    }
});

fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2), 'utf8');
console.log('Successfully implemented precision ID-based mapping for sub-items.');
