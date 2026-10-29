---
id: architecture.html-design
type: architecture
status: active
owners:
  - html-design/src/
  - html-design/server.mjs
  - html-design/build.mjs
updated: 2026-10-29
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
  - path: html-design/SKILL.md
    status: current
  - path: html-design/references/runtime.md
    status: current
related:
  - module.editor
  - contract.document-collaboration
  - feature.export
  - architecture.ai-development-system
confidence: high
---

# HTML-PPT-Canvas 架构

## Summary

人与 AI 协作的 HTML 画板，显示品牌为 HTML-PPT-Canvas，技能标识为 html-ppt-canvas；物理 html-design/ 路径、DOM 属性、CLI 路径与 Wiki ID 保持兼容。内嵌编辑器可离线普通编辑并下载 HTML，外链资源仍需可用；本地 Node 服务提供写回、编辑权协调、AI 审阅和 PDF/PPTX 导出。当前是桌面浏览器优先的本地工具。


## Source Of Truth

`html-design/src/` 是编辑器源码；`build.mjs` 通过 esbuild 输出 IIFE 到 `html-design/editor.js`。`server.mjs` 提供静态预览与本地 API；`documents.mjs` 管理文档；`export.mjs` 与 `pptx.mjs` 负责导出。


## Contracts

画板使用 `[data-stage]` / `[data-artboard]`。HTML 内嵌内容、样式和编辑器；界面使用 Shadow DOM。本地服务默认绑定 127.0.0.1:8876，属于本机工具，不作为远程多用户服务部署。


## Workflows

安装技能使用标准 skills CLI（Node22.20+），不安装 Node、本项目依赖或服务。已安装 skill 目录只提供技能资源，不是完整源码根；优先复用匹配源码，否则克隆公开 TaoEF/HTML-PPT-Canvas 仓库到新目录，再在含根 package.json/package-lock.json 的目录 `npm ci`（运行时Node20+）。完整安装、浏览器和端口步骤见 `html-design/references/runtime.md`。

运行 `npm start` 后打开示例。新设计须位于实际服务根目录内；非默认端口须给 CLI 设置相同 HTML_DESIGN_ORIGIN，不能双服务写同根。源码改动运行 `npm run build`，文档内嵌脚本通过协作交接单独升级。当前集成分支和 GitHub 对象见 `.harness/project.json`。


## Failure Modes

重建演示稿会覆盖人工修改；仅重建编辑器不会更新旧 HTML 内嵌脚本；多个服务同时写同一目录不受进程内单写者协议保护。


## Update Rules

模块边界、运行方式、DOM 标记、构建和交付边界改变时同步本页及 README。


## Open Questions

公开源码与标准 Skill 安装入口不代表已部署测试服或正式服；首个正式版本及兼容性支持矩阵尚未定义。
