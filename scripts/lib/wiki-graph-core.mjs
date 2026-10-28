import fs from 'node:fs';
import path from 'node:path';

const ENTITY_TYPES = new Set([
  'architecture',
  'module',
  'feature',
  'contract',
  'decision',
  'method',
]);

function walkMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function cleanScalar(value) {
  const trimmed = value.trim();
  if (trimmed === '[]') {
    return [];
  }
  if (trimmed === '{}') {
    return {};
  }
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseInlinePair(value) {
  const index = value.indexOf(':');
  if (index === -1) {
    return null;
  }
  const key = value.slice(0, index).trim();
  const scalar = cleanScalar(value.slice(index + 1));
  return { key, scalar };
}

export function parseFrontmatter(content) {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  if (!normalized.startsWith('---\n')) {
    return null;
  }

  const end = normalized.indexOf('\n---', 4);
  if (end === -1) {
    return null;
  }

  const frontmatter = normalized.slice(4, end).split('\n');
  const data = {};
  let currentKey = null;
  let currentObject = null;

  for (const line of frontmatter) {
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }

    const arrayItem = line.match(/^  -(?:\s+(.*))?$/);
    if (arrayItem && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }

      const item = arrayItem[1] || '';
      const pair = parseInlinePair(item);
      if (pair) {
        currentObject = { [pair.key]: pair.scalar };
        data[currentKey].push(currentObject);
      } else {
        currentObject = null;
        data[currentKey].push(cleanScalar(item));
      }
      continue;
    }

    const objectField = line.match(/^    ([^:]+):\s*(.*)$/);
    if (objectField && currentObject) {
      currentObject[objectField[1].trim()] = cleanScalar(objectField[2]);
      continue;
    }

    const topLevel = line.match(/^([^:\s][^:]*):\s*(.*)$/);
    if (topLevel) {
      currentKey = topLevel[1].trim();
      currentObject = null;
      const value = topLevel[2];
      data[currentKey] = value === '' ? [] : cleanScalar(value);
    }
  }

  return data;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null || value === '') {
    return [];
  }
  return [value];
}

function addNode(nodes, id, kind, data = {}) {
  if (!nodes.has(id)) {
    nodes.set(id, { id, kind, ...data });
    return;
  }

  const node = nodes.get(id);
  if (node.kind === 'entity-ref' || kind !== 'entity-ref') {
    node.kind = kind;
  }
  Object.assign(node, data);
}

function addEdge(edges, from, to, type, data = {}) {
  edges.push({ from, to, type, ...data });
}

export function buildWikiGraph(root) {
  const wikiRoot = path.join(root, '.project-wiki');
  const nodes = new Map();
  const edges = [];
  const entities = [];
  const duplicateIds = [];
  const idToEntity = new Map();

  const files = walkMarkdownFiles(wikiRoot)
    .filter((file) => !path.relative(wikiRoot, file).startsWith(`templates${path.sep}`))
    .sort();

  for (const file of files) {
    const relativePath = path.relative(root, file);
    const wikiPath = path.relative(wikiRoot, file);
    const frontmatter = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (!frontmatter?.id) {
      continue;
    }

    const entity = {
      id: frontmatter.id,
      type: frontmatter.type,
      status: frontmatter.status,
      confidence: frontmatter.confidence,
      owners: asArray(frontmatter.owners),
      sources: asArray(frontmatter.sources),
      related: asArray(frontmatter.related),
      file: relativePath,
      wikiPath,
    };
    entities.push(entity);

    if (idToEntity.has(entity.id)) {
      duplicateIds.push({ id: entity.id, files: [idToEntity.get(entity.id).file, entity.file] });
    } else {
      idToEntity.set(entity.id, entity);
    }

    addNode(nodes, entity.id, 'entity', {
      type: entity.type,
      status: entity.status,
      confidence: entity.confidence,
      file: entity.file,
    });

    if (entity.type) {
      const typeNode = `type:${entity.type}`;
      addNode(nodes, typeNode, 'type', { type: entity.type });
      addEdge(edges, entity.id, typeNode, 'typed_as');
    }

    const directory = path.dirname(entity.wikiPath);
    if (directory && directory !== '.') {
      const directoryNode = `directory:${directory}`;
      addNode(nodes, directoryNode, 'directory', { path: directory });
      addEdge(edges, entity.id, directoryNode, 'located_in');
    }

    for (const owner of entity.owners) {
      if (typeof owner !== 'string' || owner.length === 0) {
        continue;
      }
      const ownerNode = `owner:${owner}`;
      addNode(nodes, ownerNode, 'owner', { path: owner });
      addEdge(edges, entity.id, ownerNode, 'owned_by');
    }

    for (const source of entity.sources) {
      const sourcePath = typeof source === 'string' ? source : source?.path;
      if (!sourcePath) {
        continue;
      }
      const sourceNode = `source:${sourcePath}`;
      addNode(nodes, sourceNode, 'source', {
        path: sourcePath,
        status: typeof source === 'string' ? undefined : source.status,
      });
      addEdge(edges, entity.id, sourceNode, 'sourced_from', {
        status: typeof source === 'string' ? undefined : source.status,
      });
    }

    for (const related of entity.related) {
      const target = typeof related === 'string' ? related : related?.id;
      if (!target) {
        continue;
      }
      addNode(nodes, target, 'entity-ref');
      addEdge(edges, entity.id, target, 'related_to');
    }
  }

  const brokenRelated = [];
  const deprecatedReferences = [];
  const relatedDegree = new Map();

  for (const entity of entities) {
    relatedDegree.set(entity.id, 0);
  }

  for (const edge of edges.filter((item) => item.type === 'related_to')) {
    if (!idToEntity.has(edge.to)) {
      brokenRelated.push(edge);
      continue;
    }

    relatedDegree.set(edge.from, (relatedDegree.get(edge.from) || 0) + 1);
    relatedDegree.set(edge.to, (relatedDegree.get(edge.to) || 0) + 1);

    const fromEntity = idToEntity.get(edge.from);
    const toEntity = idToEntity.get(edge.to);
    if (fromEntity?.status === 'active' && toEntity?.status === 'deprecated') {
      deprecatedReferences.push(edge);
    }
  }

  const isolatedEntities = entities
    .filter((entity) => (relatedDegree.get(entity.id) || 0) === 0)
    .map((entity) => entity.id);

  const missingOwners = entities
    .filter((entity) => entity.owners.length === 0)
    .map((entity) => entity.id);

  const missingSources = entities
    .filter((entity) => entity.sources.length === 0)
    .map((entity) => entity.id);

  const invalidTypes = entities
    .filter((entity) => entity.type && !ENTITY_TYPES.has(entity.type))
    .map((entity) => ({ id: entity.id, type: entity.type }));

  return {
    root,
    wikiRoot,
    nodes: [...nodes.values()],
    edges,
    entities,
    health: {
      brokenRelated,
      deprecatedReferences,
      duplicateIds,
      isolatedEntities,
      missingOwners,
      missingSources,
      invalidTypes,
    },
  };
}

export function getSeedSubgraph(graph, seedId) {
  if (!seedId) {
    return null;
  }

  const adjacent = graph.edges.filter((edge) => edge.from === seedId || edge.to === seedId);
  const nodeIds = new Set([seedId]);
  for (const edge of adjacent) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);
  }

  return {
    seed: seedId,
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
    edges: adjacent,
  };
}
