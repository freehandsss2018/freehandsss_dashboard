const fs = require('fs');
const path = require('path');

const livePath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
const live = JSON.parse(fs.readFileSync(livePath, 'utf8'));

live.nodes.forEach((n, i) => {
  console.log(`${i}: ${n.name} (${n.type})`);
  if (n.name === 'Parse Items & Generate SKU') {
    console.log(n.parameters.jsCode);
  }
});
