const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const mNode = data.nodes.find(n => n.name === 'Mirror to Supabase');
console.log("=== Mirror to Supabase Node ===");
console.log(JSON.stringify(mNode, null, 2));

const dNode = data.nodes.find(n => n.name === 'Mirror Delete to Supabase');
console.log("\n=== Mirror Delete to Supabase Node ===");
console.log(JSON.stringify(dNode, null, 2));
