# Harness Index

This is the AI development harness entry for this repository.

## Read Order

1. Read the root agent entry file.
2. Read this file.
3. Use `.harness/catalog.md` to route the task.
4. Read relevant `.project-wiki/` entities.
5. Inspect current code and tests.
6. Choose a workflow:
   - `.harness/workflows/small-change.md`
   - `.harness/workflows/large-change.md`
   - `.harness/workflows/github-planning.md`
   - `.harness/workflows/review-sync.md`
   - `.harness/workflows/knowledge-sync.md`
   - `.harness/workflows/wiki-update.md`

## Responsibility Split

- `.harness/` owns process.
- `.project-wiki/` owns durable project knowledge.
- GitHub issues, pull requests, and Projects own active planning and execution.
- Root entry files are launchers only.

When GitHub planning is configured, Repo-Issue-Manager owns the canonical Issue
ledger and Dev-Manager exclusively owns coding admission and WIP. Topic
planners own scope and acceptance without creating another queue.

## Development Admission Gate

When GitHub planning is configured, do not modify product code for an Issue
until it passes Definition of Ready, has stable priority/order, and Dev-Manager
records admission and ownership. Repositories without GitHub planning use their
existing user authorization and workflow gates.

## Large Change Gate

Large changes require an implementation plan, test cases, and user confirmation
before implementation.

## Local-First Acceptance Gate

For code-producing work, finish local implementation, tests, the configured
independent review, repair, and a clean simulated merge onto the exact current
integration base before remote delivery. Provide a stable local entry point and
record base SHA, feature tip, local integration commit/tree, test profile, and
deferred checks. The user must accept that exact candidate before remote branch
push, PR creation, integration merge, or test-environment deployment.

Keep the user's primary or dirty worktree untouched. Semantic remote-base drift
after acceptance requires a new local candidate and acceptance; provably
unrelated drift requires a recorded forward audit. Production promotion is
separately authorized.

## Knowledge Gate

When a task changes durable behavior, contracts, decisions, repeated failure
modes, or agent workflow rules, update `.project-wiki/` or record why no wiki
change is needed.

## GitHub Planning

All new or loose work enters the canonical Intake. Significant goals, epics,
requirements, tasks, bugs, RFCs, feedback, and release work follow
`.harness/workflows/github-planning.md`.

## Repository Governance Gate

Repo-Issue-Manager owns Intake, readiness, stable priority/order, canonical
Project placement, status, closure evidence, and recurring hygiene. Topic
planners own scope and acceptance without creating a competing queue.

Dev-Manager exclusively owns coding admission, WIP, Developer dispatch,
branches/worktrees, dependency order, and conflicts. Do not modify product code
for an Issue until Dev-Manager records admission and ownership.

## Project Commands And Boundaries

Read `.harness/project.json` for repository, Project, branches, owners, and
actual environments. This project currently ships a local HTML editor; staging
and production endpoints are not configured. The seven-stage model is a
release evidence contract, not proof those environments exist.

- `npm run build`: rebuild `html-design/editor.js` from `html-design/src/`.
- `npm test`: Node and Playwright regression suite; install Chrome/Chromium.
- `npm run project:check`: verify initialized capabilities and release mapping.
- `npm run wiki:check`: verify wiki structure and graph links.
- `npm run wiki:graph -- --seed contract.document-collaboration`: inspect related knowledge.

The initial repository import is explicitly requested bootstrap work; record
its provenance and verification. It does not constitute product acceptance or
a test/production release. Subsequent product changes use the local-first gate.
