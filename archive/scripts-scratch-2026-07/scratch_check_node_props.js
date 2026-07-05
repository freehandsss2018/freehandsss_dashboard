const fs = require('fs');
const path = require('path');

const localPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor.json');
const livePath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');

const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));
const live = JSON.parse(fs.readFileSync(livePath, 'utf8'));

console.log("Local nodes count:", local.nodes.length);
console.log("Live nodes count:", live.nodes.length);

const allowedKeys = new Set(Object.keys(live.nodes[0] || {}));
console.log("Allowed keys on node:", [...allowedKeys]);

local.nodes.forEach((node, index) => {
  const extraKeys = Object.keys(node).filter(k => !allowedKeys.has(k));
  if (extraKeys.length > 0) {
    console.log(`Local node ${index} (${node.name}) has extra keys:`, extraKeys);
  }
});
