#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const master = path.join(root, '.fhs/ai/commands');
const files = fs.readdirSync(master).filter(x => x.endsWith('.md')).sort();
for (const file of files) {
  const name = path.basename(file, '.md');
  const content = fs.readFileSync(path.join(master, file), 'utf8');
  for (const field of ['**依賴**', '**不可攜平台**']) {
    if (!content.includes(field)) throw new Error(`${file} missing ${field}`);
  }
  const claude = path.join(root, '.claude/commands', file);
  const agent = path.join(root, '.agents/skills', name, 'SKILL.md');
  fs.mkdirSync(path.dirname(claude), {recursive:true});
  fs.mkdirSync(path.dirname(agent), {recursive:true});
  fs.writeFileSync(claude, `<!-- Generated from .fhs/ai/commands/${file}; edit master and rerun generator. -->\n${content}`);
  fs.writeFileSync(agent, `---\nname: ${name}\ndescription: Execute the portable ${name} project command.\n---\n\nGenerated from .fhs/ai/commands/${file}; edit master and rerun generator.\n\n${content}`);
}
console.log(`Generated ${files.length} command bridges for each platform.`);
