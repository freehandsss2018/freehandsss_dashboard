const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log("Incoming connections to Pack Telegram Data:");
for (const [sourceNode, targets] of Object.entries(data.connections)) {
  for (const targetType of Object.values(targets)) {
    for (const targetArray of targetType) {
      for (const conn of targetArray) {
        if (conn.node === 'Pack Telegram Data') {
          console.log(`Source: ${sourceNode}`);
        }
      }
    }
  }
}
