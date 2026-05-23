const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../Freehandsss_Dashboard/Freehandsss_dashboard_current.html');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Order_Item_Key') && (line.includes('=') || line.includes(':'))) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
