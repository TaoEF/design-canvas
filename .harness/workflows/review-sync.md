# Review And Sync Workflow

1. Review diff for unintended changes.
2. Verify relevant checks passed.
3. Confirm project wiki reflects durable behavior changes.
4. Confirm root entry files still route to `.harness/index.md`.
5. For every code-producing development task, run exactly one independent
   read-only audit after implementation and primary verification, before final
   handoff. When review-loopback is configured, use its isolated thread and
   direct-return mechanism:
   - return final Findings or `No findings` directly to the originating
     Developer, never through a planner or manager
   - if automatic return fails, Developer reads the completed review thread and
     records the exact reviewed range and result
   - repair accepted P1/P2 Findings or explicitly record deferrals, then run
     focused verification without a routine second full audit
   - when GitHub governance is configured, return a material new critical
     boundary to Repo-Issue-Manager and Dev-Manager; otherwise return it to the
     originating owner or user for re-planning
   - reuse SHA-scoped evidence and review only named, uncovered semantic deltas
6. Build the local acceptance candidate before any remote code-delivery write:
   - keep the reviewed feature commits local
   - use a manager-owned clean local acceptance worktree, not the user's dirty
     or stale primary worktree
   - simulate the merge onto the exact current integration-base SHA
   - run required integration checks and expose a stable local URL or equivalent
     executable entry point
   - record base SHA, feature tip, local integration commit/tree, cleanliness,
     test profile, manual steps, and deferred checks
7. Obtain explicit user acceptance of that exact local candidate and
   authorization for remote test delivery. Before acceptance, do not push,
   create a PR, merge the remote integration target, or deploy. Refresh the
   remote base before writes; semantic drift requires a new candidate and
   acceptance, while unrelated drift requires a forward audit and focused
   equivalence checks. Production is separately authorized.
8. After acceptance, run the remote delivery and issue status guard when GitHub
   planning is configured:
   - identify the linked issue from the branch name, PR, commit message, or
     handoff
   - confirm development, review, local integration, and local acceptance are
     marked `status:in-progress` and Project Status `进行中`
   - confirm each status expresses the repository's documented observable fact
   - confirm local acceptance is not represented as a remote push or merge, a
     PR as merged, merged as deployed, or deployed as accepted
   - confirm `status:ready-for-staging` / `待测试服发布` only after the reviewed
     exact revision is integrated
   - confirm `status:staging-validation` / `测试服验证中` only after the exact
     revision is verified live on the test server
   - confirm `status:ready-for-production` / `待正式服发布` only after test-server
     acceptance against that revision
   - confirm `status:production-validation` / `正式服待验收` only after the
     accepted revision is verified live on production
   - confirm `status:done` and Project terminal status are used only after the
     production acceptance evidence required for `已完成`
   - confirm production verification is recorded before closing issues whose
     acceptance criteria require production validation
   - confirm closed completed issues do not retain stale active status labels:
     `status:triage`, `status:planned`, `status:in-progress`,
     or an obsolete delivery-stage label
9. Record sync status if the project uses sync metadata.

## Delivery Packet

The originating Developer's final handoff records Issue, local branch,
base/feature SHAs, local integration commit/tree, clean-worktree fact, stable
local entry point, exact user acceptance, remote PR state (`not created` before
acceptance), delivered scope, tests, smoke evidence, review range/result, wiki
and harness sync, current merge/deployment fact, exact test/production revision
and deployment evidence when present, next valid status, residual risks, and
follow-ups. When GitHub governance is configured, send it to Dev-Manager. A
local candidate may stop active commands but retains coding ownership until
acceptance and authorized remote integration complete.
