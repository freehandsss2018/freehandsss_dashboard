const fs = require('fs');
const path = require('path');

const n8nDir = path.resolve(__dirname, '../n8n');
const files = fs.readdirSync(n8nDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(n8nDir, file), 'utf8'));
  if (!data.nodes) continue;
  for (const node of data.nodes) {
    if (node.type.includes('httpRequest') || node.type.includes('http') || node.type.includes('Http')) {
      console.log(`In ${file}: Node: "${node.name}" (Type: ${node.type})`);
    }
  }
}
