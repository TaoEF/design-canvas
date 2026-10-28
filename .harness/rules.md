# Harness Rules

## Source Of Truth Order

1. Explicit user instruction (intent and authorization).
2. Current code behavior (verified implementation facts).
3. Harness rules.
4. Project wiki.
5. Historical docs.

## Production Risk Priorities

1. Backward compatibility is usually the highest risk.
2. Architecture mistakes are high risk.
3. Local, reversible issues are usually more tolerable.

## Progressive Development

Prefer the easiest valid step first. Keep one main variable changing at a time.

## Local-First Delivery

Code-producing work stays local through implementation, primary verification,
the configured independent review, repair, a clean simulated merge onto the
exact current integration base, and explicit user acceptance. Local commits may
freeze byte identity. Before acceptance, do not push a remote branch, create a
PR, merge the remote integration target, or deploy a test environment.

Use a manager-owned clean acceptance worktree, not the user's stale or dirty
primary worktree. Record base SHA, feature tip, local integration commit/tree,
cleanliness, test profile, stable local entry point, manual steps, and deferred
checks. Refresh the remote base before writes. Semantic or shared-surface drift
invalidates acceptance; provably unrelated drift requires a recorded forward
audit and focused equivalence checks. Production requires separate
authorization.

## Minimalism

Reuse existing components, helpers, flows, and styles when they fit. Do not add
new abstractions unless they reduce real complexity or are required.

## Surgical Changes

Every changed line should trace to the request, approved plan, compatibility
fix, or required verification/doc sync.

## Uncertainty

If material uncertainty remains after reading code and wiki, ask before encoding
the assumption into code or durable docs.

## Single Repository Governance Queue

When GitHub planning is configured, one Repo-Issue-Manager owns canonical
Intake, readiness, repository priority/order, Project placement, status, and
hygiene. Topic planners may own scope and acceptance but must not create a
competing execution queue.

One Dev-Manager owns coding admission, WIP, Developer dispatch,
branches/worktrees, dependency order, and conflicts. No other agent starts
product-code work from a ready Issue without that admission.

## Observable State

Use evidence-backed status. Local acceptance is not a remote push or merge; a
PR is not merged, merged is not deployed, and deployed is not accepted.
