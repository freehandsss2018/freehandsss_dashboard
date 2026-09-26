#!/usr/bin/env node
'use strict';

// Build a reusable template from reviewed forks. FHS sources are never copied
// for GENERIC-FORK entries: the curated template-src file is authoritative.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '../..');
const templateSrc = path.join(__dirname, 'template-src');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!args[i].startsWith('--') || !args[i + 1]) throw new Error(`Expected --name value, got ${args[i] || '(nothing)'}`);
  options[args[i].slice(2)] = args[i + 1];
}
if (!options.out) throw new Error('Usage: node export-template.js --out <directory> [--project-name <name> --owner <name> --db-primary <name> --env-prefix <PREFIX>]');
if (options['env-prefix'] && !/^[A-Z][A-Z0-9_]*$/.test(options['env-prefix'])) {
  throw new Error('--env-prefix must be an uppercase environment variable prefix');
}

const target = path.resolve(options.out);
if (target === root || target === templateSrc || target.startsWith(templateSrc + path.sep)) {
  throw new Error('Output directory must not overwrite the source repository or template-src');
}
const replacements = new Map([
  ['{{PROJECT_NAME}}', options['project-name']],
  ['{{OWNER}}', options.owner],
  ['{{DB_PRIMARY}}', options['db-primary']],
  ['{{ENV_PREFIX}}', options['env-prefix']]
].filter(([, value]) => value !== undefined));

function safePath(base, relative) {
  if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) {
    throw new Error(`Unsafe destination: ${relative}`);
  }
  const absolute = path.resolve(base, relative);
  if (!absolute.startsWith(base + path.sep)) throw new Error(`Destination escapes output: ${relative}`);
  return absolute;
}

function render(content) {
  let output = content.toString('utf8');
  for (const [placeholder, value] of replacements) output = output.split(placeholder).join(value);
  return output;
}

function write(relative, input) {
  const destination = safePath(target, relative);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.writeFileSync(destination, render(input), 'utf8');
}

function listFiles(directory, prefix = '') {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  for (const dirent of fs.readdirSync(directory, {withFileTypes: true})) {
    const relative = prefix ? `${prefix}/${dirent.name}` : dirent.name;
    if (dirent.isDirectory()) output.push(...listFiles(path.join(directory, dirent.name), relative));
    else if (dirent.isFile()) output.push(relative);
  }
  return output.sort();
}

cp.execFileSync(process.execPath, [path.join(__dirname, 'check-manifest.js')], {cwd: root, stdio: 'pipe'});
const missingForks = manifest.files.filter(entry => entry.action === 'GENERIC-FORK' &&
  !fs.existsSync(safePath(templateSrc, entry.dest))).map(entry => entry.dest);
if (missingForks.length) throw new Error(`Missing GENERIC-FORK files: ${missingForks.join(', ')}`);
const mapped = new Set();
for (const entry of manifest.files) {
  if (entry.action === 'SKIP') continue;
  if (mapped.has(entry.dest)) throw new Error(`Duplicate manifest destination: ${entry.dest}`);
  mapped.add(entry.dest);
  const source = entry.action === 'COPY-CLEAN'
    ? path.join(root, entry.source)
    : safePath(templateSrc, entry.dest);
  if (!fs.existsSync(source)) throw new Error(`Missing ${entry.action} source for ${entry.source}: ${source}`);
  write(entry.dest, fs.readFileSync(source));
}

let extras = 0;
for (const relative of listFiles(templateSrc)) {
  if (mapped.has(relative)) continue;
  write(relative, fs.readFileSync(safePath(templateSrc, relative)));
  extras++;
}
console.log(JSON.stringify({output: target, mapped: mapped.size, extras, total: mapped.size + extras}));
