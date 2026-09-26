#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opts = {};
for (let i=0;i<args.length;i+=2) {
  if (!args[i]?.startsWith('--') || !args[i+1]) throw new Error('Expected --name value pairs');
  opts[args[i].slice(2)] = args[i+1];
}
const required = ['project-name','owner','db-primary','env-prefix'];
for (const key of required) if (!opts[key]) throw new Error(`Missing --${key}`);
if (!/^[A-Z][A-Z0-9_]*$/.test(opts['env-prefix'])) throw new Error('Environment prefix must be uppercase letters, digits, underscores');
const replacements = {
  '{{PROJECT_NAME}}':opts['project-name'],
  '{{OWNER}}':opts.owner,
  '{{DB_PRIMARY}}':opts['db-primary'],
  '{{ENV_PREFIX}}':opts['env-prefix']
};
const renamed = [
  ['AGENTS.skeleton.md','AGENTS.md'],
  ['CLAUDE.router.skeleton.md','CLAUDE.md'],
  ['.claude/settings.hooks.example.json','.claude/settings.json']
];
for (const [from,to] of renamed) {
  const source=path.join(root,from), destination=path.join(root,to);
  if (fs.existsSync(destination)) throw new Error(`${to} exists; refusing to overwrite`);
  if (!fs.existsSync(source)) throw new Error(`Missing ${from}`);
}
for (const [from,to] of renamed) fs.renameSync(path.join(root,from),path.join(root,to));
let changed=0;
function visit(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (['.git','node_modules'].includes(entry.name)) continue;
    const file=path.join(dir,entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.isFile() && file!==__filename && !entry.name.endsWith('.lock')) {
      const old=fs.readFileSync(file,'utf8');
      let next=old;
      for (const [token,value] of Object.entries(replacements)) next=next.split(token).join(value);
      if (next!==old) { fs.writeFileSync(file,next);changed++; }
    }
  }
}
visit(root);
console.log(`Bootstrap complete: ${changed} files configured. Review policy, rule JSON, and hook settings before live use.`);
