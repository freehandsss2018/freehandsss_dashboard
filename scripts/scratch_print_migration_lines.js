const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../supabase/migrations/0001_initial_schema.sql');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let i = 10; i < 70; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log("File does not exist:", filePath);
}
