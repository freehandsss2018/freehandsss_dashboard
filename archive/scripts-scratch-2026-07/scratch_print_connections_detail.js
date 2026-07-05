const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log("Calculate Profit & Pack Items connections:");
console.log(JSON.stringify(data.connections['Calculate Profit & Pack Items'], null, 2));

console.log("\nMirror to Supabase connections:");
console.log(JSON.stringify(data.connections['Mirror to Supabase'], null, 2));

console.log("\nDelete Record connections:");
console.log(JSON.stringify(data.connections['Delete Record'], null, 2));

console.log("\nMirror Delete to Supabase connections:");
console.log(JSON.stringify(data.connections['Mirror Delete to Supabase'], null, 2));
