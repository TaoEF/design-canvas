# Commit Message Guide

Use clear commit messages that explain what changed and why. Prefer the format:

```text
type: short summary

Optional body explaining why the change was made.

Main changes:
- Change 1
- Change 2

Affected areas:
- path-or-module: impact
```

## Types

- `feat`: new capability
- `fix`: bug or regression fix
- `refactor`: code restructuring without behavior change
- `perf`: performance improvement
- `style`: formatting or presentation-only code style
- `docs`: documentation update
- `test`: tests or test infrastructure
- `chore`: build, tooling, dependency, or repository maintenance
- `optimize`: general optimization that is not strictly performance-specific

## Rules

- Keep the first line specific and concise.
- Mention the user-visible or engineering outcome, not just the file touched.
- Use a body when the change has non-obvious motivation, risk, or follow-up.
- List important affected modules for multi-file or cross-domain changes.
- Reference the issue or PR when the change is issue-driven.
- Do not commit secrets, local environment files, generated dumps, or unrelated
  cleanup.

## Examples

```text
fix: prevent stale status label after integration promotion

Main changes:
- Update the issue promotion workflow to keep Project Status aligned.
- Add effect-tracking guidance after integration merge.

Affected areas:
- .harness/workflows/github-planning.md
- .project-wiki/decisions/github-object-planning.md
```

```text
docs: clarify AI-ready issue investigation gate

Main changes:
- Require pre-submission investigation notes.
- Explain when to use ai-needs-context.
```
