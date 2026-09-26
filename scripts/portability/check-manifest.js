#!/usr/bin/env node
'use strict';

// Validate the Phase 1 inventory before the Phase 2 guard split changes sources.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const manifestPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
// Keep the inventory boundary outside manifest.json: removing a source scope
// from that file must not turn an omitted directory into a false PASS.
const REQUIRED_SCOPES = [
  '.fhs/ai', 'scripts/hooks', 'scripts/cl-flow-runner.js',
  'scripts/validate-ag-plan.js', '.claude/commands', '.agents/workflows',
  '.fhs/notes/FHS_Mode_Card.md', '.fhs/notes/knowledge-map.md',
  '.fhs/notes/SOP_NOW.md', '3d', 'canva_auto', 'scripts/lib/env.js',
  'package.json', '.fhs/tools/fhs-health-rules.json',
  '.fhs/tools/canonical_keys.yml'
];
const errors = [];
const bySource = new Map();
const byDest = new Map();
const actions = {'COPY-CLEAN': 0, 'GENERIC-FORK': 0, SKIP: 0};
const classes = {U: 0, F: 0, M: 0};

function trackedSources() {
  return new Set(cp.execFileSync('git', ['ls-files', '-z', '--', ...REQUIRED_SCOPES], {cwd: root})
    .toString('utf8').split('\0').filter(Boolean));
}

function actualDeps(source) {
  const deps = new Set();
  if (/\.(?:js|mjs|cjs)$/.test(source)) {
    const text = fs.readFileSync(path.join(root, source), 'utf8');
    const specs = [
      ...text.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...text.matchAll(/\bimport\s*(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g),
      ...text.matchAll(/\bexport\s+[^'";]*?\s+from\s*['"]([^'"]+)['"]/g),
      ...text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)
    ];
    for (const match of specs) {
      const spec = match[1];
      if (spec.startsWith('.')) {
        const base = path.posix.normalize(path.posix.join(path.posix.dirname(source), spec));
        const resolved = [base, `${base}.js`, `${base}.mjs`, `${base}.cjs`, `${base}.json`, `${base}/index.js`].find(p => fs.existsSync(path.join(root, p)));
        if (!resolved) errors.push(`${source}: unresolved require ${spec}`);
        else deps.add(resolved);
      } else if (!require('module').builtinModules.includes(spec) && !spec.startsWith('node:')) {
        deps.add(`npm:${spec}`);
      }
    }
  }
  if (source === 'scripts/hooks/fhs-health-check.js') {
    deps.add('.fhs/tools/fhs-health-rules.json');
    deps.add('.fhs/tools/canonical_keys.yml');
  }
  return [...deps].sort();
}

const tracked = trackedSources();
if (JSON.stringify([...manifest.source_scopes].sort()) !== JSON.stringify([...REQUIRED_SCOPES].sort())) {
  errors.push('Manifest source_scopes differs from independent required scope list');
}
for (const entry of manifest.files) {
  const {source, action, dest} = entry;
  if (!source || typeof source !== 'string') { errors.push('Entry without source'); continue; }
  if (bySource.has(source)) errors.push(`Duplicate source: ${source}`);
  bySource.set(source, entry);
  if (!tracked.has(source)) errors.push(`Source is missing or not tracked: ${source}`);
  if (!Object.hasOwn(actions, action)) errors.push(`Invalid action: ${source}`);
  else actions[action]++;
  if (!Object.hasOwn(classes, entry.class)) errors.push(`Unclassified source: ${source}`);
  else classes[entry.class]++;
  if (!Array.isArray(entry.deps)) errors.push(`Missing deps array: ${source}`);
  if (action === 'SKIP') {
    if (entry.install_level !== 'n/a' || dest !== null) errors.push(`SKIP has target: ${source}`);
    if (!entry.reason || typeof entry.reason !== 'string' || entry.reason.trim().length < 12) errors.push(`SKIP lacks one-sentence reason: ${source}`);
  } else {
    if (entry.install_level !== 'project') errors.push(`Non-project installation: ${source}`);
    if (!dest || typeof dest !== 'string' || path.isAbsolute(dest) || dest.includes('..')) errors.push(`Invalid destination: ${source}`);
    if (byDest.has(dest)) errors.push(`Duplicate destination ${dest}: ${source}, ${byDest.get(dest)}`);
    byDest.set(dest, source);
  }
  if (action === 'GENERIC-FORK') {
    if (!/^[a-f0-9]{40}$/.test(entry.upstream_blob_hash || '')) errors.push(`GENERIC-FORK lacks blob hash: ${source}`);
    else {
      const actualHash = cp.execFileSync('git', ['hash-object', source], {cwd: root, encoding: 'utf8'}).trim();
      if (entry.upstream_blob_hash !== actualHash) errors.push(`Source drift: ${source}`);
    }
  }
  if (action === 'COPY-CLEAN') {
    const text = fs.readFileSync(path.join(root, source), 'utf8');
    if (/freehandsss|FHS_|Fat Mo|Edwin|SynologyDrive/i.test(text)) errors.push(`COPY-CLEAN contains project identity: ${source}`);
  }
}

for (const source of tracked) if (!bySource.has(source)) errors.push(`Unclassified tracked source: ${source}`);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const [source, entry] of bySource) {
  if (!Array.isArray(entry.deps)) continue;
  const declared = [...entry.deps].sort();
  const actual = actualDeps(source);
  if (JSON.stringify(declared) !== JSON.stringify(actual)) errors.push(`Dependency drift: ${source}; declared=${declared.join(',')} actual=${actual.join(',')}`);
  for (const dep of declared) {
    if (dep.startsWith('npm:')) {
      const name = dep.slice(4);
      if (!(name in (packageJson.dependencies || {})) && !(name in (packageJson.devDependencies || {}))) errors.push(`External package not declared: ${source} -> ${name}`);
    } else if (!bySource.has(dep)) {
      errors.push(`Dependency not in manifest: ${source} -> ${dep}`);
    }
  }
}

console.log(`manifest sources=${manifest.files.length}; tracked=${tracked.size}; unclassified=${[...tracked].filter(s => !bySource.has(s)).length}`);
console.log(`classes U=${classes.U} F=${classes.F} M=${classes.M}; actions COPY-CLEAN=${actions['COPY-CLEAN']} GENERIC-FORK=${actions['GENERIC-FORK']} SKIP=${actions.SKIP}`);
console.log(`SKIP reasons=${manifest.files.filter(e => e.action === 'SKIP' && e.reason).length}/${actions.SKIP}; GENERIC-FORK hashes=${manifest.files.filter(e => e.action === 'GENERIC-FORK' && e.upstream_blob_hash).length}/${actions['GENERIC-FORK']}; dependency closure=${errors.some(e => e.includes('Dependency')) ? 'FAIL' : 'PASS'}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
} else {
  console.log('PASS: every tracked source is classified and every declared dependency is covered');
}
