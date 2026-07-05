const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log("=== Incoming Connections to Mirror to Supabase ===");
for (const [sourceNode, targets] of Object.entries(data.connections)) {
  for (const targetType of Object.values(targets)) {
    for (const targetArray of targetType) {
      for (const conn of targetArray) {
        if (conn.node === 'Mirror to Supabase' || conn.node === 'Mirror Delete to Supabase') {
          console.log(`Source: ${sourceNode} -> Target: ${conn.node} (Type: ${targetArray[0].node})`);
        }
      }
    }
  }
}

console.log("\n=== Outgoing Connections from Mirror to Supabase ===");
const outgoing = data.connections['Mirror to Supabase'];
console.log("Mirror to Supabase outgoing:", JSON.stringify(outgoing, null, 2));

const outgoingDelete = data.connections['Mirror Delete to Supabase'];
console.log("Mirror Delete to Supabase outgoing:", JSON.stringify(outgoingDelete, null, 2));
