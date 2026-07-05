const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log("=== Node references to Mirror to Supabase ===");
for (const node of data.nodes) {
  const str = JSON.stringify(node);
  if (str.includes('Mirror to Supabase')) {
    console.log(`Node: "${node.name}" references "Mirror to Supabase"`);
  }
  if (str.includes('Mirror Delete to Supabase')) {
    console.log(`Node: "${node.name}" references "Mirror Delete to Supabase"`);
  }
}
