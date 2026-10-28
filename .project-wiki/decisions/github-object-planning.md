---
id: decision.github-object-planning
type: decision
status: active
owners:
  - .github/ISSUE_TEMPLATE/config.yml
  - .github/ISSUE_TEMPLATE/intake.yml
  - .github/ISSUE_TEMPLATE/development-plan.yml
  - .github/ISSUE_TEMPLATE/feature.yml
  - .github/ISSUE_TEMPLATE/bug.yml
  - .github/ISSUE_TEMPLATE/rfc.yml
  - .github/ISSUE_TEMPLATE/feedback.yml
  - .github/ISSUE_TEMPLATE/release-checklist.yml
  - .github/PULL_REQUEST_TEMPLATE.md
  - .harness/workflows/github-planning.md
  - .harness/workflows/review-sync.md
  - .harness/release-status-profile.json
updated: 2026-10-28
sources:
  - path: .harness/workflows/github-planning.md
    status: current
  - path: .harness/workflows/review-sync.md
    status: current
  - path: .harness/release-status-profile.json
    status: current
  - path: .github/ISSUE_TEMPLATE
    status: current
  - path: .github/PULL_REQUEST_TEMPLATE.md
    status: current
related:
  - architecture.html-design
  - architecture.ai-development-system
confidence: medium
---

# GitHub Object Planning

## Summary

This repository uses GitHub issues and pull requests as active engineering
execution objects, while `.project-wiki/` remains the durable project knowledge
base.

## Source Of Truth

- GitHub issues own goals, epics, requirements, tasks, bugs, RFC discussions,
  feedback, and releases.
- Pull requests own change proposal and review state.
- GitHub Projects may provide shared planning views across related
  repositories.
- One Project or equivalent view is the canonical repository execution ledger;
  topic Projects may add views but do not own a competing queue.
- `.harness/` owns the workflow that tells agents how to move from issues to
  implementation, review, wiki sync, and release.
- `.project-wiki/` owns durable architecture, contracts, decisions, repeated
  failure modes, and source-of-truth references.

## Contracts

- Significant product or engineering work should be anchored to a GitHub issue
  before implementation.
- Agents must inspect relevant code, harness docs, wiki pages, commits, issues,
  or repository objects before submitting an issue. If unresolved questions
  could change scope, acceptance criteria, compatibility, risk, or ownership,
  the agent must clarify with the user before filing.
- Issue content should include objective, scope, non-goals, acceptance criteria,
  risk, pre-submission investigation notes, related objects, and verification
  expectations.
- Branches and PRs should keep issue relationships explicit.
- Significant work should happen on issue-linked branches rather than directly
  on the repository's shared integration or default branch.
- Issue-linked code branches remain local through implementation, tests, the
  exactly-one independent audit, repair, a clean simulated merge onto the exact
  current integration base, and product acceptance. The user's primary or dirty
  worktree is not an acceptance baseline.
- Product acceptance identifies base SHA, feature tip, local integration
  commit/tree, test profile, and stable local entry point. It must precede
  remote branch push, PR creation, integration merge, or test deployment.
  Semantic remote-base drift invalidates it; unrelated drift requires a forward
  audit. Production is separately authorized.
- PRs should record architectural impact, regression risk, tests run, and
  project-wiki or harness sync status, plus the exact local acceptance and
  remote-base audit that authorized the PR.
- RFC issues are discussion objects. Accepted decisions must be promoted to
  `.project-wiki/decisions/*` or an existing wiki page.
- Historical plans remain valid context, but new active planning should start
  in GitHub issues.
- Raw work enters Intake as `status:triage + ai-needs-context` and is not
  executable until Repo-Issue-Manager verifies Definition of Ready.
- Issue status labels and Project status express observable facts in this
  repository's delivery topology. A ready PR is not merged, merged is not
  deployed, and deployed is not accepted.
- `.harness/release-status-profile.json` is the canonical machine-readable
  release mapping. Its seven semantic keys, Issue labels, order, and evidence
  boundaries are fixed; only Project status display names may be localized.
- By default, Project delivery follows `待处理 -> 进行中 -> 待测试服发布 -> 测试服验证中 ->
  待正式服发布 -> 正式服待验收 -> 已完成`, mapped to `status:planned`,
  `status:in-progress`, `status:ready-for-staging`,
  `status:staging-validation`, `status:ready-for-production`,
  `status:production-validation`, and `status:done`.
- `status:triage + ai-needs-context` remains a pre-ready Intake state inside
  `待处理`.
- Test/production deployed stages require exact server or deployment-system
  revision evidence; acceptance stages require smoke/business acceptance
  against the same revision. Verified server state wins over stale metadata.
- Live repository labels and canonical Project Status options must implement
  all seven mappings in order; local templates alone do not satisfy this gate.
- Trusted deployment automation may enter deployed stages only. Test and
  production acceptance stages require explicit recorded acceptance.
- Runtime, product, operational, and user-facing changes merged to the shared
  integration target should have a linked 24-48 hour effect-tracking task
  unless explicitly exempt.
- GitHub Projects may require explicit historical issue backfill; future issue
  and PR auto-add workflows should document their Project owner, number,
  repositories, token/secret, and inclusion filters.
- Queue admission requires the Definition of Ready, S/M/L task size,
  dependencies, and a stable queue order.
- Repo-Issue-Manager owns Intake, readiness, duplicates/superseded work,
  priority/order, canonical placement, status, closure evidence, and hygiene.
- Topic Issue Planners own scope, decomposition, acceptance, and domain
  dependencies without creating another queue.
- Dev-Manager owns coding admission, dispatch, conflicts, and default coding
  WIP one. A reviewed local candidate awaiting acceptance retains coding
  ownership until authorized remote integration completes, while strong
  dependents wait for merge.
- Exactly one independent audit follows primary verification. Findings return
  directly to Developer; P1/P2 repair gets focused verification without a
  routine second full audit.
- Product-accepted local candidates form the dependency-ordered remote merge
  train. Deployment batches contain only compatible accepted work and record
  manifest, smoke scope, owner, and rollback.

## Workflows

1. Capture new and loose work in canonical Intake.
2. Repo-Issue-Manager investigates, deduplicates, classifies, and records facts.
3. Topic Planner clarifies scope, decomposition, acceptance, and dependencies.
4. Repo-Issue-Manager verifies DoR and stable priority/order.
5. Dev-Manager admits one ready Issue within WIP and conflict limits.
6. Developer implements and runs primary verification on an issue-linked branch.
7. Independent Reviewer performs exactly one read-only audit.
8. Developer repairs accepted P1/P2 Findings and runs focused verification.
9. Dev-Manager builds the clean local integration candidate and exposes a stable
   acceptance entry point.
10. Product owner accepts the exact candidate and authorizes remote test
    delivery.
11. Release refreshes the remote base, performs any required drift audit, then
    pushes, creates the PR, merges, deploys, smokes, and records evidence.
12. Repo-Issue-Manager synchronizes Issue and Project status from those facts.
13. Create effect tracking where impact requires 24-48 hour observation.
14. Promote stable knowledge to `.project-wiki/`.
15. Close only with terminal acceptance or an explicit non-completion reason.

## Observable Status Mapping

| Project Status | Issue label | Evidence |
| --- | --- | --- |
| `待处理` | `status:planned` | ready and ordered, not active |
| `进行中` | `status:in-progress` | active development, review, local integration, or local acceptance ownership |
| `待测试服发布` | `status:ready-for-staging` | product-accepted local candidate integrated, test deployment unverified |
| `测试服验证中` | `status:staging-validation` | exact revision live on test, acceptance pending |
| `待正式服发布` | `status:ready-for-production` | test acceptance recorded |
| `正式服待验收` | `status:production-validation` | accepted revision live on production, acceptance pending |
| `已完成` | `status:done` | production acceptance and required observation recorded |

Use one ordered status; treat blocked as orthogonal with owner and unblock
evidence. Other repositories may localize the names, but changing the seven
semantic stages requires explicit user approval after discovering the actual
release topology.

## Failure Modes

- Treating GitHub issue comments as the only durable architecture record.
- Duplicating project-wiki facts inside issue templates or PR templates.
- Creating issues that are too vague for AI agents to execute safely.
- Filing issues that only restate a user request without checking relevant code
  locations or asking necessary clarification questions.
- Closing a planning issue without linking PRs, tests, follow-ups, or wiki
  updates.
- Closing or promoting work while the linked issue still has a stale status
  label from an earlier development stage.
- Marking work done before the repository's terminal evidence exists.
- Promoting from a merge or release request without verifying the exact server
  revision.
- Moving through an integration branch, staging, default branch, or production
  without recording the current Issue/Project status transition.
- Forgetting effect tracking after changes that need 24-48 hour validation.
- Adding label taxonomy without using it consistently enough for filtering.
- Migrating old plans destructively instead of linking them as historical
  context.
- Assuming GitHub Projects automatically backfill existing repository issues.
- Filtering only open issues when the requested Project audit is for all
  issues.
- Starting work before readiness because its title implies urgency.
- Dispatching work already owned by another Developer or external contributor.
- Routing Review Findings through a planner or manager.
- Running routine second full audits after the exactly-one review pass.
- Letting topic planners or Developers create competing repository queues.
- Starting a strong dependent before prerequisite merge.
- Deploying unrelated ready work as an opaque batch.
- Creating a remote branch/PR, merging the integration target, or deploying a
  test environment before exact local product acceptance.
- Reusing acceptance after semantic remote-base drift or using a dirty primary
  worktree as the acceptance baseline.

## Update Rules

Update this page when issue templates, PR template requirements, GitHub Project
fields, label conventions, promotion-stage rules, or the boundary between
GitHub issues and `.project-wiki/` changes.

## Open Questions

- Decide whether live label/Project reconciliation runs through a GitHub App,
  Actions workflow, CLI/API bootstrap, or an authorized Repo-Issue-Manager.
- Decide whether to add GitHub Actions for PR issue-link and wiki-sync checks.
