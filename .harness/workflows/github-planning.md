# GitHub Issue Governance And Delivery Workflow

Use this workflow for Intake, issue planning, development admission, PRs,
delivery, release, and recurring repository hygiene.

## Canonical Ledger And Roles

Choose one canonical repository execution ledger. Every new or loose Issue
enters its Intake even when a topic Project also owns the item.

- Repo-Issue-Manager owns Intake, investigation quality, duplicate/superseded
  decisions, Definition of Ready, stable priority/order, canonical Project
  placement, status synchronization, closure evidence, and recurring hygiene.
- Topic Issue Planners own product scope, parent/child decomposition,
  acceptance criteria, and domain dependencies. They do not create a competing
  repository queue.
- Dev-Manager exclusively owns coding admission from the ready queue, coding
  WIP, Developer dispatch, branches/worktrees, dependency execution order, and
  conflict coordination.
- Developer owns implementation, primary verification, review repair, and the
  final SHA-scoped delivery packet.
- Independent Reviewer performs exactly one read-only audit after primary
  verification and returns Findings directly to Developer.
- Release ownership owns remote push, PR creation, merge, deployment, smoke
  checks, rollback evidence, and delivery-stage promotion after exact local
  product acceptance.

Repo-Issue-Manager and Dev-Manager may be the same person or agent in a small
repository, but the two authorities and decisions remain explicit.

## Intake And Issue Submission Gate

Use `.github/ISSUE_TEMPLATE/intake.yml` for raw requests, observations, and
unplanned work. Intake starts as `status:triage + ai-needs-context`; capture is
not authorization to implement.

Before promoting an item, inspect relevant code, harness docs, wiki pages,
commits, issues, PRs, and Project objects. Record what was checked, identify
assumptions, and resolve questions that could change scope, acceptance,
compatibility, risk, ownership, or ordering.

Search for exact duplicates, broader owners, already-shipped fixes, and
conflicting work. Close only with evidence and an explicit reason: completed,
duplicate, invalid, wontfix, or superseded.

## Definition Of Ready

Repo-Issue-Manager applies `ai-ready` and `status:planned` only when the Issue
records:

- verified objective or problem statement
- explicit scope and non-goals
- testable acceptance criteria
- affected modules or a reason they remain unknown
- dependencies, conflicts, and external ownership
- risk and S/M/L task size
- verification plan
- stable repository priority or queue order

Priority never bypasses readiness. Remove `ai-needs-context` when promoting;
do not retain conflicting readiness labels.

Task size describes implementation shape, not urgency or time:

- `S`: one established boundary and focused regression coverage
- `M`: multiple modules or one cross-layer flow with integration coverage
- `L`: architecture, schema, migration, data contract, or coupled workflows;
  use the large-change gate

## Queue Model And WIP

Derive four logical queues from existing Issue, local acceptance, PR, and
Project facts:

1. Development queue: DoR-passing Issues in stable queue order.
2. Local acceptance queue: reviewed clean local integration candidates awaiting
   exact product acceptance.
3. Remote delivery queue: accepted candidates authorized for push, PR creation,
   and integration merge.
4. Environment delivery queue: merged changes waiting for or undergoing
   environment promotion and acceptance.

Default Dev-Manager coding WIP is one. A reviewed local candidate may stop
active Developer commands but retains coding ownership until acceptance and
authorized remote integration complete. A strong dependent still waits for its
prerequisite merge. Parallel work requires separate ownership, worktrees, and
non-conflicting affected surfaces.

Use executable dependency terms: `blocked-by`, `depends-on-merge`,
`external-owner`, and `conflicts-with`.

## Development And Review Loop

1. Dev-Manager admits one ready Issue and records ownership.
2. Developer works on an issue-linked branch and runs primary verification.
3. Independent Reviewer runs exactly one read-only audit of the exact range.
4. Findings return directly to Developer, never through a planner or manager.
5. Developer repairs accepted P1/P2 Findings and runs focused verification.
   Do not start a routine second full audit.
6. A material new critical boundary returns to Repo-Issue-Manager and
   Dev-Manager for re-planning. Later deltas must be named and reviewed only to
   the extent not covered by prior evidence.
7. Dev-Manager builds a clean local integration candidate on the exact current
   integration-base SHA, runs required checks, exposes a stable local entry
   point, and records its exact identity.
8. Product owner accepts that candidate and authorizes remote test delivery.
9. Release refreshes the remote base. Semantic or shared-surface drift requires
   a new candidate and acceptance; unrelated drift requires a forward audit.
10. Developer sends Dev-Manager the final Delivery Packet, then authorized
    remote push, PR, merge, and test delivery may proceed.

## Delivery Packet

Record:

- issue, local branch, base SHA, feature tip SHA, local integration commit/tree,
  clean-worktree fact, and remote PR state (`not created` before acceptance)
- delivered scope and non-goals
- tests, smoke checks, and evidence paths
- independent review thread, exact range, Findings disposition, and result
- stable local URL or executable entry point, manual steps, and exact product
  acceptance/remote-test authorization
- wiki/harness synchronization
- remote-base drift audit, merge/deployment fact, and next valid Project status
- residual risks and follow-up Issues

A local candidate is not accepted without exact confirmation; acceptance is not
a remote push or merge; a PR is not merged, merged is not deployed, and
deployed is not accepted.

## Observable Status

Use `.harness/release-status-profile.json` as the canonical machine-readable
mapping. Its seven semantic keys, order, Issue labels, and evidence boundaries
are fixed; only `projectStatus` display names may be localized.

The default display names form this release-promotion chain:

| Project Status | Issue label | Promotion evidence |
| --- | --- | --- |
| `待处理` | `status:planned` | DoR passed and stable order exists; no active Developer |
| `进行中` | `status:in-progress` | Dev-Manager admission and active development, review, local integration, or local acceptance ownership |
| `待测试服发布` | `status:ready-for-staging` | product-accepted local candidate is merged to the integration target, but test-server deployment is not verified |
| `测试服验证中` | `status:staging-validation` | deployment system or server proves that exact revision is live on test; smoke/acceptance pending |
| `待正式服发布` | `status:ready-for-production` | test-server acceptance is recorded against the deployed revision |
| `正式服待验收` | `status:production-validation` | production system or server proves the accepted revision is live; production acceptance pending |
| `已完成` | `status:done` | production acceptance and required effect evidence are recorded |

Raw Intake stays in Project `待处理` with `status:triage +
ai-needs-context`. DoR promotion changes it to `status:planned + ai-ready`
without moving the Project item.

Repositories may localize Project display names, but must retain all seven
semantic stages, ordered Issue labels, and evidence boundaries.

Use exactly one ordered delivery status. If `status:blocked` is retained as an
orthogonal marker, record blocker owner, condition, and unblock evidence.
Synchronize Issue labels and Project Status from facts; never promote from
intent alone.

For test and production deployment stages, the server/deployment system is the
source of truth. Record exact revision, environment, deployment run or server
evidence, deployment time, smoke result, acceptance result, and rollback or
follow-up. A PR, branch, merge, release request, or CI build alone does not prove
that a revision is live. When metadata is ahead of verified server state or a
rollback occurs, return it to the last provable stage and comment with evidence.

For runtime, product, operational, or user-facing changes, create or update a
linked 24-48 hour effect-tracking task with exact revision, environment,
signals, owner/deadline, success/failure criteria, and rollback or follow-up.

## Labels

- Type: `type:goal`, `type:epic`, `type:requirement`, `type:task`, `type:bug`,
  `type:rfc`, `type:feedback`, `type:release`
- Risk: `risk:low`, `risk:medium`, `risk:high`
- AI: `ai-ready`, `ai-needs-context`, `ai-large-change`
- Domain: add project-specific `domain:*` labels only when useful
- Status: use the ordered labels from `.harness/release-status-profile.json`

Priority, risk, size, order, readiness, and delivery status are separate facts.

## Live Project Configuration

Initialization or upgrade is incomplete until the live repository is checked:

1. Read and validate `.harness/release-status-profile.json`.
2. Create or reconcile its seven ordered `status:*` labels.
3. Configure the canonical Project Status options from its ordered
   `projectStatus` values.
4. Keep raw `status:triage` Intake in the configured `planned` Project status
   until DoR promotion.
5. Remove or migrate legacy labels/options that duplicate a stage with a
   conflicting meaning.
6. Re-read mutated Issues and Project items; local template verification alone
   does not prove live GitHub configuration.

Trusted deployment events may automate only exact-revision transitions into
`测试服验证中` and `正式服待验收`. Test acceptance is required for
`待正式服发布`; production acceptance is required for `已完成`. In profile
semantics, acceptance stages require recorded acceptance for the exact deployed
revision.

## Branch, PR, Merge, And Release

Significant work uses issue-linked branches. Every PR links its Issue and
records impact, regression risk, tests, review evidence, and wiki/harness sync.
Keep feature commits local through review, clean simulated merge, integration
checks, and exact product acceptance. Local commits may freeze byte identity;
do not use the user's dirty primary worktree as acceptance evidence. Before acceptance, do not push,
create a PR, merge the remote integration target, or deploy a test environment.

After acceptance, refresh the remote base. Semantic or shared-surface drift
invalidates acceptance; unrelated drift requires a forward audit and focused
equivalence checks. Then push and merge accepted candidates in dependency
order, verify accepted-tree equivalence, and deploy only compatible batches
with a manifest, smoke scope, owner, and rollback point.
Production requires separate authorization.

## Recurring Hygiene

Repo-Issue-Manager runs:

- weekday quick pass: new Intake, duplicate candidates, conflicting labels,
  missing canonical Project items, stale ownership, and obvious status drift
- weekly deep pass: ready queue order, blocked evidence, superseded work,
  closed-item cleanup, PR/Issue alignment, exact server revision drift, and
  delivery/acceptance evidence
- monthly taxonomy review when repository volume justifies it

Automate deterministic checks, reminders, canonical Project inclusion, and safe
metadata correction. Do not automate ambiguous closure, product priority,
dependency judgment, or acceptance without evidence.

When ongoing ownership is authorized, create or update one recurring job using
the host's supported automation mechanism. Reuse the same logical
Repo-Issue-Manager; do not create duplicate schedules or competing queues.

## RFC And Durable Knowledge

Issues and PRs own active execution. Promote accepted architecture, contracts,
decisions, and repeated failure modes into `.project-wiki/`; do not leave them
only in issue comments.

## Cross-Repo GitHub Projects

Use one canonical Project when related repositories need a shared ledger. Keep
implementation Issues in their owning repository, link all repositories, and
use Project fields for normalized type, risk, domain, size, order, target, and
observable status. Historical Issues may require explicit backfill; audit open
and closed items when reconciling all work.

Do not copy a Project number or branch name from another repository. Discover
the target's actual test/production environments, localize display names when
needed, and preserve the seven release evidence boundaries unless the user
explicitly approves a different topology.
