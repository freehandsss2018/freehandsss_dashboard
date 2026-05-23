const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const names = data.nodes.map(n => n.name);
const uniqNames = new Set(names);
console.log(`Total nodes: ${names.length}, Unique node names: ${uniqNames.size}`);

const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
console.log("Duplicate node names:", duplicates);
