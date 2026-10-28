---
id: architecture.html-design
type: architecture
status: active
owners:
  - html-design/src/
  - html-design/server.mjs
  - html-design/build.mjs
updated: 2026-10-28
sources:
  - path: PRODUCT.md
    status: current
  - path: README.md
    status: current
  - path: html-design/build.mjs
    status: current
  - path: html-design/server.mjs
    status: current
  - path: package.json
    status: current
related:
  - module.editor
  - contract.document-collaboration
  - feature.export
  - architecture.ai-development-system
confidence: high
---

# HTML Design 架构

## Summary

人与 AI 协作的自包含 HTML 画板。离线可编辑并下载 HTML；本地 Node 服务提供写回、编辑权协调和 PDF/PPTX 导出。当前是桌面浏览器优先的本地工具。


## Source Of Truth

`html-design/src/` 是编辑器源码；`build.mjs` 通过 esbuild 输出 IIFE 到 `html-design/editor.js`。`server.mjs` 提供静态预览与本地 API；`documents.mjs` 管理文档；`export.mjs` 与 `pptx.mjs` 负责导出。


## Contracts

画板使用 `[data-stage]` / `[data-artboard]`。HTML 内嵌内容、样式和编辑器；界面使用 Shadow DOM。本地服务默认绑定 127.0.0.1:8876，属于本机工具，不作为远程多用户服务部署。


## Workflows

运行 `npm start` 后打开示例；源码改动运行 `npm run build`，文档内嵌脚本通过协作交接单独升级。当前集成分支和 GitHub 对象见 `.harness/project.json`。


## Failure Modes

重建演示稿会覆盖人工修改；仅重建编辑器不会更新旧 HTML 内嵌脚本；多个服务同时写同一目录不受进程内单写者协议保护。


## Update Rules

模块边界、运行方式、DOM 标记、构建和交付边界改变时同步本页及 README。


## Open Questions

测试服、正式服、分发格式及首个正式版本尚未定义；不得从 GitHub 初次导入推断已发布。
