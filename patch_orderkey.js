const fs = require('fs');
const file = 'n8n/FHS_Query_GlobalReview.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

let mergeNode = data.nodes.find(n => n.name === 'Merge Data');
if (mergeNode) {
    mergeNode.parameters.jsCode = mergeNode.parameters.jsCode.replace(
        "Specification: data.Specification || ''",
        "Specification: data.Specification || '',\n            OrderKey: data.Order_Item_Key || ''"
    );
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log("Merge Data node updated successfully.");
} else {
    console.log("Could not find Merge Data node.");
}
