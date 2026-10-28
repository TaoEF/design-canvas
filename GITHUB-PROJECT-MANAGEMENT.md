# Design Canvas GitHub 与发布管理

- 仓库：[TaoEF/design-canvas](https://github.com/TaoEF/design-canvas)，私有。
- 唯一执行台账：[Design Canvas Development #4](https://github.com/users/TaoEF/projects/4)。
- 默认/集成分支：`main`；日常改动使用 `codex/issue-<编号>-<主题>` 分支。
- 产品与发布责任人：TaoEF；Repo-Issue-Manager / Dev-Manager 由每次任务指定的协调代理承担，默认 coding WIP=1。没有自动创建常驻代理或定时任务。
- 运行与环境配置见 `.harness/project.json`。当前仅有本机服务，测试服与正式服未配置。
- 首次导入保留现有产品代码，不代表首个正式版本，也不等于测试服或正式服验收。

## 日常入口

通过 Issue 模板提交任务、缺陷、RFC、反馈或发布申请，默认进入 Intake。
Repo-Issue-Manager 使用 `gh project item-add 4 --owner TaoEF --url <Issue URL>`
加入唯一台账，再设置 Status=`待处理`。没有配置需要额外 PAT 的自动入板流程。
Risk、Task size、Priority、Queue order 是独立字段，按 DoR 审核后填写；不把未调查的工作标为 ai-ready。

## 发布约定

采用 `vMAJOR.MINOR.PATCH` 标签；版本号在实际发布时确定，初始化不打版本标签。
先创建 release Issue，附带精确 revision、构建/测试、独立审查、本地产品验收、部署清单、回滚点与环境证据；产品验收授权后才能执行远端交付，生产需另行授权。
GitHub Release 通过 PR 标签生成分类说明；附件应明确来源 revision。Release 草稿、tag 或 CI 成功均不能代替部署与验收。
没有实际部署目标时，发布申请留在 Intake，先明确交付和验收环境。

以下通用契约在本项目生效；配置身份和环境以 `.harness/project.json` 为准。

# GitHub Project Management

Use one canonical repository execution ledger for every Issue, including loose
work that also belongs to a topic Project.

## Authority

- Repo-Issue-Manager: Intake, Issue quality, duplicates/superseded decisions,
  Definition of Ready, priority/order, canonical Project placement, observable
  status, closure evidence, and recurring hygiene.
- Topic Issue Planner: product scope, decomposition, acceptance, and domain
  dependencies; no competing execution queue.
- Dev-Manager: coding admission, WIP, Developer dispatch, branches/worktrees,
  dependency execution order, and conflicts.
- Developer: implementation, primary verification, review repair, and delivery
  packet.
- Independent Reviewer: exactly one read-only audit with direct Findings return
  to Developer.
- Release owner: remote push, PR, merge, deployment, smoke, rollback, and
  acceptance evidence after local product authorization.

## Intake And Readiness

All raw or incomplete work enters Intake as `status:triage +
ai-needs-context`. Repo-Issue-Manager investigates code and repository facts,
checks duplicates/conflicts, and promotes only when the Issue has objective,
scope/non-goals, acceptance criteria, affected surfaces, dependencies and
external owners, risk, S/M/L size, verification, and stable priority/order.

Promotion replaces Intake readiness with `status:planned + ai-ready` using the
target repository's equivalent labels and Project fields.

## Queues And Status

Derive development, local-acceptance, remote-delivery, and environment-delivery
queues from Issue, acceptance, PR, and Project facts. Default Dev-Manager coding
WIP is one. Keep priority, risk, size, order, readiness, and delivery status
separate.

Use `.harness/release-status-profile.json` as the canonical machine-readable
mapping. Its semantic stage keys, Issue labels, order, and evidence boundaries
are fixed; only Project status display names may be localized. The default
Project/Issue chain is:

`待处理/status:planned -> 进行中/status:in-progress ->
待测试服发布/status:ready-for-staging ->
测试服验证中/status:staging-validation ->
待正式服发布/status:ready-for-production ->
正式服待验收/status:production-validation -> 已完成/status:done`.

Raw Intake uses `status:triage + ai-needs-context` inside `待处理`.

Status must express observable facts. Test and production deployment stages
require exact revision evidence from the server or deployment system. Local
acceptance is not a remote merge, a PR is not merged, merged is not deployed,
and deployed is not accepted. If
metadata is ahead of verified server state, return it to the last provable
stage. A blocked marker requires owner, condition, and unblock evidence.

Live setup must create/reconcile all seven Issue labels and canonical Project
Status options from the profile in the same order. Local files are not proof
that GitHub is configured. Deployment automation may enter `测试服验证中` or
`正式服待验收` for an exact revision; it cannot mark test acceptance or
`已完成`.

## Review And Delivery

After implementation and primary verification, run exactly one independent
read-only audit. Findings go directly to Developer. Developer repairs accepted
P1/P2 Findings and runs focused verification without a routine second full
audit. Material new critical scope returns for re-planning.

Delivery is local-first. The Dev-Manager uses a clean acceptance worktree to
simulate the reviewed feature merge onto the exact current integration base,
runs the required integration checks, exposes a stable local entry point, and
records base SHA, feature tip, integration commit/tree, cleanliness, manual
steps, and deferred checks. The product owner must accept that exact candidate
before remote branch push, PR creation, integration merge, or test deployment.
Semantic remote-base drift invalidates acceptance; unrelated drift requires a
recorded forward audit. Production remains separately authorized.

The delivery packet records Issue, local branch, base/feature SHAs, local
integration commit/tree, clean-worktree fact, stable local entry point, exact
product acceptance, remote PR state, delivered scope, tests/smoke evidence,
review range/result, wiki/harness sync, current merge/deploy fact, exact
environment revision when deployed, next status, residual risk, and follow-ups.

## Hygiene

Run weekday Intake/status checks and a deeper weekly pass for queue order,
duplicates, blocked evidence, stale ownership, closed-item cleanup, and delivery
evidence. Automate only deterministic checks and safe metadata corrections.

Read `.harness/workflows/github-planning.md` for the complete contract.
