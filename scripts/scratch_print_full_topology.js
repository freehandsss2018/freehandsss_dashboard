const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log("=== WORKFLOW CONNECTIONS ===");
for (const [sourceNode, targets] of Object.entries(data.connections)) {
  for (const [type, targetArrays] of Object.entries(targets)) {
    targetArrays.forEach((targetArray, index) => {
      targetArray.forEach(conn => {
        console.log(`${sourceNode} (${type} output ${index}) -> ${conn.node} (index ${conn.index})`);
      });
    });
  }
}
