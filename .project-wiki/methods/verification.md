---
id: method.verification
type: method
status: active
owners:
  - package.json
  - scripts/
  - .github/workflows/ci.yml
updated: 2026-10-28
sources:
  - path: package.json
    status: current
  - path: html-design/build.mjs
    status: current
  - path: html-design/documents.test.mjs
    status: current
  - path: html-design/export.test.mjs
    status: current
  - path: html-design/ui.test.mjs
    status: current
  - path: html-design/guides.test.mjs
    status: current
  - path: html-design/selection.test.mjs
    status: current
  - path: .github/workflows/ci.yml
    status: current
related:
  - architecture.html-design
  - contract.document-collaboration
  - feature.export
  - architecture.ai-development-system
confidence: high
---

# 验证、资料迁移与知识维护

## Summary

用现有行为测试验证产品，用初始化与图谱检查验证知识结构。Wiki 不依赖某个人机器上的技能路径。


## Source Of Truth

`npm run project:check` 检查已选能力和发布协议；`npm run wiki:check` 检查实体 ID/关系；`npm run wiki:graph` 派生临时图谱。这些脚本来自初始化技能配套工具，在 scripts/ 中随仓库维护。


## Contracts

`npm run build` 成功后运行 `npm test`。CI 安装锁定依赖与 Chromium，再构建并执行产品和 Wiki 检查。测试写临时目录；不能重建或改写人工编辑稿作为验证手段。


## Workflows

先看任务相关实体和代码；改动后跑相应测试，再同步长期事实。raw/ 接收新资料，核验后晋升到 Wiki，原始资料本身不作权威。


## Failure Modes

仅检查模板存在无法证明 GitHub 标签或 Project 已配置；仅检查图谱无法证明文字正确；旧 HTML 内嵌脚本不自动随 build 升级。


## Update Rules

新增测试入口、CI 或改变依赖/浏览器时更新此页与 harness。


## Open Questions

README.md / PRODUCT.md / DESIGN.md：作为当前说明保留在原位，对关键事实逐项核实。demos/recovered/：historical 的本地恢复副本，保留在磁盘并由 Git 忽略；旧预览图为 historical，不自动晋升 Wiki。html-design/SKILL.md：保留现有使用说明，事实以源码为准。尚无历史聊天记录需要复制到 raw/。
