# Project Wiki Schema

The wiki is a collection of durable entities with explicit source status.

## Entity Types

- `architecture`: system-level structure.
- `module`: file, package, service, or subsystem ownership.
- `feature`: user-visible or domain behavior.
- `contract`: API, data, tool, schema, protocol, or integration contract.
- `decision`: durable design choice or policy.
- `method`: repeatable implementation, research, migration, or maintenance
  procedure.

## Required Frontmatter

```yaml
---
id: feature.example
type: feature
status: active
owners:
  - path/to/source
updated: 2026-01-01
sources:
  - path: docs/source.md
    status: current
related:
  - decision.example
confidence: high
---
```

## Source Status

- `current`: agrees with current code or active process.
- `historical`: useful background, not authoritative.
- `conflict`: disagrees with current truth.
- `needs-verification`: potentially useful but not checked.
- `raw`: captured as source material but not yet organized or authoritative.

## Field Rules

- `id`: stable identifier in the form `<type>.<slug>`.
- `type`: one of `architecture`, `module`, `feature`, `contract`,
  `decision`, or `method`.
- `status`: `active`, `historical`, `draft`, `deprecated`, or `needs-review`.
- `owners`: files, folders, docs, or workflows that own the knowledge.
- `updated`: ISO date.
- `sources`: source material with status.
- `related`: related wiki entity IDs.
- `confidence`: `high`, `medium`, or `low`.

Runtime graph tools may derive edges from `related`, `owners`, `sources`,
`type`, and file location. The graph is generated from Markdown; it is not a
separate source of truth.

## Required Sections

Every entity should include:

1. `Summary`
2. `Source Of Truth`
3. `Contracts`
4. `Workflows`
5. `Failure Modes`
6. `Update Rules`
7. `Open Questions`

Use `None currently known.` when a section has no entries.

## Raw Source Rules

Raw source files live in root-level `raw/`. They may contain unstructured
notes, copied chat exports, URLs, screenshot descriptions, outlines, and
research fragments.

Raw files should include:

- source name or URL
- capture date
- access status
- processing status
- original or lightly normalized content

Raw files are not authoritative until promoted into a structured entity page
with source status and confidence.

## Runtime Graph Rules

Project wiki entities can be scanned into a runtime graph:

- `related` creates wiki entity edges.
- `owners` creates entity-to-owner path edges.
- `sources` creates entity-to-evidence path edges.
- `type` creates classification edges.
- directory location creates wiki grouping edges.

Do not maintain a separate graph file as project memory. Generated graph output
is disposable and should be reproducible from `.project-wiki/`.
