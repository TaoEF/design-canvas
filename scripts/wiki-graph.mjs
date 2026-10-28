#!/usr/bin/env node
import path from 'node:path';
import { buildWikiGraph, getSeedSubgraph } from './lib/wiki-graph-core.mjs';

const args = process.argv.slice(2);
let rootArg = null;
let seed = null;
let format = 'summary';

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--seed') {
    seed = args[index + 1];
    index += 1;
    continue;
  }
  if (arg === '--format') {
    format = args[index + 1] || format;
    index += 1;
    continue;
  }
  if (!rootArg) {
    rootArg = arg;
  }
}

const root = path.resolve(rootArg || process.cwd());
const graph = buildWikiGraph(root);
const view = seed ? getSeedSubgraph(graph, seed) : null;

if (format === 'json') {
  console.log(JSON.stringify(view || graph, null, 2));
  process.exit(0);
}

if (format === 'mermaid') {
  printMermaid(view || graph);
  process.exit(0);
}

if (!['summary', 'json', 'mermaid'].includes(format)) {
  console.error(`Unsupported format: ${format}`);
  console.error('Supported formats: summary, json, mermaid');
  process.exit(1);
}

printSummary(graph, view);

function printSummary(currentGraph, subgraph) {
  const entityCount = currentGraph.entities.length;
  const ownerCount = currentGraph.nodes.filter((node) => node.kind === 'owner').length;
  const sourceCount = currentGraph.nodes.filter((node) => node.kind === 'source').length;
  const edgeCount = currentGraph.edges.length;

  console.log('Runtime Wiki Graph');
  console.log('');
  console.log(`Root: ${currentGraph.root}`);
  console.log(`Entities: ${entityCount}`);
  console.log(`Owner nodes: ${ownerCount}`);
  console.log(`Source nodes: ${sourceCount}`);
  console.log(`Edges: ${edgeCount}`);
  console.log('');

  if (subgraph) {
    console.log(`Seed: ${subgraph.seed}`);
    const seedNode = subgraph.nodes.find((node) => node.id === subgraph.seed);
    if (!seedNode || seedNode.kind === 'entity-ref') {
      console.log('Seed entity was not found in .project-wiki/.');
    }
    printEdgeList('Adjacent edges', subgraph.edges);
    console.log('');
  }

  const { health } = currentGraph;
  printDuplicateIds(health.duplicateIds);
  printEdgeList('Broken related links', health.brokenRelated);
  printEdgeList('Active entities referencing deprecated entities', health.deprecatedReferences);
  printList('Invalid entity types', health.invalidTypes.map((item) => `${item.id} uses ${item.type}`));
  printList('Isolated entities', health.isolatedEntities);
  printList('Entities missing owners', health.missingOwners);
  printList('Entities missing sources', health.missingSources);
}

function printDuplicateIds(duplicates) {
  if (duplicates.length === 0) {
    return;
  }

  console.log('Duplicate ids:');
  for (const duplicate of duplicates) {
    console.log(`- ${duplicate.id}: ${duplicate.files.join(', ')}`);
  }
  console.log('');
}

function printList(title, items) {
  if (items.length === 0) {
    return;
  }

  console.log(`${title}:`);
  for (const item of items) {
    console.log(`- ${item}`);
  }
  console.log('');
}

function printEdgeList(title, edges) {
  if (edges.length === 0) {
    return;
  }

  console.log(`${title}:`);
  for (const edge of edges) {
    const suffix = edge.status ? ` (${edge.status})` : '';
    console.log(`- ${edge.from} --${edge.type}--> ${edge.to}${suffix}`);
  }
}

function printMermaid(currentGraph) {
  console.log('graph TD');
  for (const edge of currentGraph.edges) {
    console.log(`  ${mermaidId(edge.from)}["${escapeMermaid(edge.from)}"] -->|${edge.type}| ${mermaidId(edge.to)}["${escapeMermaid(edge.to)}"]`);
  }
}

function mermaidId(value) {
  return value.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeMermaid(value) {
  return value.replace(/"/g, '\\"');
}
