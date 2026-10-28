# Harness Catalog

Map task types to workflows and wiki pages.

| Task type | Workflow | Knowledge |
| --- | --- | --- |
| Copy/string edit | Direct after root rules | Target file |
| Small local change | `.harness/workflows/small-change.md` | Relevant wiki page |
| Large/cross-domain change | `.harness/workflows/large-change.md` | Architecture, feature, contract, and decision pages |
| Cross-repo planning | `.harness/workflows/github-planning.md` | Canonical shared GitHub Project and repo-owned issues |
| Goal, epic, requirement, task, bug, RFC, feedback, release | `.harness/workflows/github-planning.md` | Related issue, PR, project, and wiki pages |
| Loose request, idea, observation, or unplanned Issue | `.harness/workflows/github-planning.md` | Canonical Intake and related evidence |
| Project knowledge update | `.harness/workflows/wiki-update.md` | `.project-wiki/schema.md` |
| Review/handoff | `.harness/workflows/review-sync.md` and `.harness/workflows/knowledge-sync.md` | Relevant wiki pages |

| Browser editor, selection, pages, viewport | `.harness/workflows/small-change.md` | `.project-wiki/modules/editor.md` |
| Save, takeover, AI collaboration, recovery | `.harness/workflows/large-change.md` | `.project-wiki/contracts/document-collaboration.md` |
| PDF / editable PPTX export | `.harness/workflows/small-change.md` | `.project-wiki/features/export.md` |
| Build, tests, CI, demo upgrade | `.harness/workflows/review-sync.md` | `.project-wiki/methods/verification.md` |
| GitHub repository and release topology | `.harness/workflows/github-planning.md` | `.harness/project.json`, `GITHUB-PROJECT-MANAGEMENT.md` |

When task scope is unclear or cross-domain, use the runtime wiki graph helper
with `npm run wiki:graph` to discover related entities and source
paths.
