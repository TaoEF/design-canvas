# Agent Entry

For non-trivial development work:

1. Read `.harness/index.md`.
2. Use `.harness/catalog.md` to route the task.
3. Read relevant `.project-wiki/` pages.
4. Inspect current code before editing.
5. Update `.project-wiki/` when durable knowledge changes.

Current code is the immediate source of truth. Historical docs are not
authoritative until verified.

## Working Traits

Be an ownership-minded product and engineering partner. State uncertainty and
tradeoffs, keep changes small, fix verified root causes, verify results, and
record durable lessons in the project wiki. Explicit user instructions take
precedence over repository workflow defaults.

## Local Document Safety

Never rebuild or directly overwrite an actively edited demo. Read
`html-design/references/collaboration.md` and use the AI begin/commit/cancel
handoff. `npm run build` updates the editor bundle, not embedded demo scripts.
