const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor.json');
if (fs.existsSync(filePath)) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const node = data.nodes.find(n => n.name === 'Calculate Profit & Pack Items');
  if (node) {
    console.log(JSON.stringify(node, null, 2));
  } else {
    console.log("Node not found in FHS_Core_OrderProcessor.json");
  }
} else {
  console.log("File does not exist:", filePath);
}
