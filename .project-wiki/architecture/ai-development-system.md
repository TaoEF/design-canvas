---
id: architecture.ai-development-system
type: architecture
status: active
owners:
  - AGENTS.md
  - CODEX.md
  - CLAUDE.md
  - .harness/index.md
  - .harness/catalog.md
  - .harness/rules.md
  - .harness/workflows/github-planning.md
  - .harness/workflows/review-sync.md
  - .github/ISSUE_TEMPLATE
  - .github/PULL_REQUEST_TEMPLATE.md
updated: 2026-10-28
sources:
  - path: .harness/index.md
    status: current
  - path: .harness/catalog.md
    status: current
  - path: .harness/rules.md
    status: current
  - path: .harness/workflows/github-planning.md
    status: current
  - path: .harness/workflows/review-sync.md
    status: current
  - path: .github/ISSUE_TEMPLATE
    status: current
related:
  - architecture.html-design
  - decision.github-object-planning
confidence: medium
---

# AI Development System

## Summary

This repository uses four AI development layers: root entry launchers, GitHub
execution objects, `.harness/` process rules, and `.project-wiki/` durable
project knowledge. Work is coordinated through one canonical ledger, a
Repo-Issue-Manager, one Dev-Manager coding gate, issue-isolated Developers,
exactly one independent read-only audit, and explicit release ownership.

## Source Of Truth

- Root entry files route agents into `.harness/`.
- GitHub issues and pull requests own active planning, requirement, feedback,
  defect, review, and release execution state.
- `.harness/` owns process, routing, gates, and completion rules.
- `.project-wiki/` owns durable architecture, module, feature, contract,
  decision, and failure-mode knowledge.
- Current code behavior wins over historical docs when sources disagree.

## Contracts

- Root entry files should stay short and route to `.harness/index.md`.
- Significant product or engineering work should be anchored to a GitHub issue
  before implementation.
- Issues and PRs should link related branches, commits, tests, and wiki or
  harness updates.
- Non-trivial tasks should read relevant `.project-wiki/` pages before editing.
- Large changes require the planning and verification gates described in
  `.harness/workflows/large-change.md`.
- Repo-Issue-Manager owns Intake, Issue quality, duplicates/superseded work,
  readiness, priority/order, canonical Project placement, status, and hygiene.
- Topic Issue Planners own scope, decomposition, acceptance, and domain
  dependencies without creating another repository queue.
- Dev-Manager owns coding admission, WIP, dispatch, worktrees, dependency
  execution order, and conflicts.
- Developer owns one issue-linked branch and final delivery packet.
- Exactly one independent audit follows primary verification. Findings return
  directly to Developer; Developer repairs P1/P2 and runs focused verification
  without a routine second full audit.
- Delivery is local-first: implementation, tests, the independent audit,
  repair, and a clean simulated merge onto the exact current integration base
  precede remote branch push, PR creation, merge, or test deployment.
- Dev-Manager owns a clean local acceptance worktree separate from the user's
  primary or dirty worktree. Product acceptance identifies base SHA, feature
  tip, local integration commit/tree, test profile, and stable local entry point
  and authorizes remote test delivery only.
- Semantic or shared-surface remote-base drift invalidates acceptance and
  requires a new candidate; unrelated drift requires a recorded forward audit.
  Production promotion requires separate authorization.
- Priority, risk, S/M/L task size, queue order, and delivery status are separate
  concepts.
- Delivery status follows `待处理 -> 进行中 -> 待测试服发布 -> 测试服验证中 ->
  待正式服发布 -> 正式服待验收 -> 已完成`; deployed stages require exact
  test/production server revision evidence and accepted stages require evidence
  against that same revision.

## Workflows

- Small work: `.harness/workflows/small-change.md`.
- Large work: `.harness/workflows/large-change.md`.
- Planning, requirements, feedback, RFC, and release work:
  `.harness/workflows/github-planning.md`.
- Project knowledge updates: `.harness/workflows/wiki-update.md`.
- Review and handoff: `.harness/workflows/review-sync.md`.
- Intake: raw work starts as `status:triage + ai-needs-context` in the canonical
  ledger.
- Queue admission: Repo-Issue-Manager requires Definition of Ready before
  applying `ai-ready` and stable order.
- Queue execution: derive development, local-acceptance, remote-delivery, and
  environment-delivery queues from Issue, acceptance, PR, and Project state.
  Default Dev-Manager coding WIP is one.
- Merge/release: after exact local acceptance, push and merge in dependency
  order, verify accepted-tree equivalence, and deploy only compatible batches
  with a manifest, smoke scope, owner, and rollback point.

## Local-First Delivery Model

The local candidate is isolated, replaceable, and verifiable before shared
branches or environments change. The default sequence is local implementation,
tests, local commits, one independent audit, repair, a clean simulated merge,
integration checks, a stable local product entry point, exact product
acceptance, then authorized remote push/PR/merge/test delivery. Production has a
separate gate.

Local review and acceptance remain the active `进行中` stage. Only an accepted
change merged into the remote integration target with matching ancestry/tree
evidence can enter `待测试服发布`. This keeps the seven observable delivery
stages unchanged without adding a second progress field.

## Failure Modes

- Root entry files become long duplicated harnesses.
- Historical docs get treated as current fact without code verification.
- Durable decisions remain only in chat, plans, issues, or PRs.
- GitHub issues become long-lived architecture records instead of execution
  objects that promote stable decisions into `.project-wiki/`.
- AI agents start implementation from vague issues without objective, scope,
  acceptance criteria, risk, and verification context.
- A planner or manager becomes a relay for Review Findings instead of keeping
  repair context with Developer.
- Multiple Issue Planners or Developers create competing repository queues.
- Status values express intent instead of observable delivery facts.
- Issue or Project status is ahead of the exact revision verified on the test
  or production server.
- Priority, risk, size, order, and status are collapsed into one field.
- A narrow `S` issue expands into adjacent framework work instead of producing
  follow-up issues.
- Strong dependents start before prerequisite merge.
- A branch is pushed, a PR is created, the remote integration target is merged,
  or a test environment is changed before exact local product acceptance.
- A stale or dirty primary worktree is used as the local acceptance baseline.
- Plan approval is mistaken for approval of finished bytes, or acceptance is
  reused after semantic remote-base drift.

## Update Rules

Update this page when agent entry routing, harness ownership, wiki ownership,
GitHub issue semantics, or PR requirements change.

## Open Questions

- Domains: editor, collaboration, export, tooling, docs; live labels are configured in GitHub.
- CI runs build, behavioral tests and wiki checks. Issue/PR semantic checks remain manager-owned.
