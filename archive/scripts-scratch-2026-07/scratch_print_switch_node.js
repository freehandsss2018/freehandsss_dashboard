const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

for (const node of data.nodes) {
  if (node.type === 'n8n-nodes-base.switch') {
    console.log(`=== Switch Node: ${node.name} ===`);
    console.log(JSON.stringify(node, null, 2));
  }
}
