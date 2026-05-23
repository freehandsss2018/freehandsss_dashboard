const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const node = data.nodes.find(n => n.name === 'Delete Record');
console.log(JSON.stringify(node, null, 2));
