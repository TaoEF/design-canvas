#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildWikiGraph } from './lib/wiki-graph-core.mjs';

const root = path.resolve(process.argv[2] || process.cwd());

const requiredFiles = [
  '.harness/index.md',
  '.harness/catalog.md',
  '.harness/rules.md',
  '.harness/workflows/small-change.md',
  '.harness/workflows/large-change.md',
  '.harness/workflows/github-planning.md',
  '.harness/workflows/review-sync.md',
  '.harness/workflows/knowledge-sync.md',
  '.harness/workflows/wiki-update.md',
  '.project-wiki/schema.md',
  '.project-wiki/index.md',
  '.project-wiki/log.md',
  '.project-wiki/templates/method.md',
  'raw/README.md',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length > 0) {
  console.error('Missing Project-LLM-Wiki files:');
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const schema = fs.readFileSync(path.join(root, '.project-wiki/schema.md'), 'utf8');
for (const token of ['architecture', 'module', 'feature', 'contract', 'decision', 'method']) {
  if (!schema.includes(token)) {
    console.error(`Project wiki schema is missing entity type: ${token}`);
    process.exit(1);
  }
}

for (const token of ['current', 'historical', 'conflict', 'needs-verification', 'raw']) {
  if (!schema.includes(token)) {
    console.error(`Project wiki schema is missing source status: ${token}`);
    process.exit(1);
  }
}

const graph = buildWikiGraph(root);
const { health } = graph;
let hasError = false;

for (const duplicate of health.duplicateIds) {
  console.error(`Duplicate project wiki id: ${duplicate.id}`);
  for (const file of duplicate.files) {
    console.error(`- ${file}`);
  }
  hasError = true;
}

for (const item of health.invalidTypes) {
  console.error(`Invalid project wiki entity type: ${item.id} uses ${item.type}`);
  hasError = true;
}

for (const edge of health.brokenRelated) {
  console.error(`Broken project wiki related link: ${edge.from} -> ${edge.to}`);
  hasError = true;
}

for (const edge of health.deprecatedReferences) {
  console.error(`Active project wiki entity references deprecated entity: ${edge.from} -> ${edge.to}`);
  hasError = true;
}

if (hasError) {
  process.exit(1);
}

for (const id of health.isolatedEntities) {
  console.warn(`Warning: isolated project wiki entity has no related links: ${id}`);
}

for (const id of health.missingOwners) {
  console.warn(`Warning: project wiki entity has no owners: ${id}`);
}

for (const id of health.missingSources) {
  console.warn(`Warning: project wiki entity has no sources: ${id}`);
}

console.log(`Project-LLM-Wiki structure verified in ${root}`);
