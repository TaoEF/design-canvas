---
id: contract.document-collaboration
type: contract
status: active
owners:
  - html-design/documents.mjs
  - html-design/collaborate.mjs
  - html-design/src/persistence.js
updated: 2026-10-28
sources:
  - path: html-design/documents.mjs
    status: current
  - path: html-design/server.mjs
    status: current
  - path: html-design/collaborate.mjs
    status: current
  - path: html-design/references/collaboration.md
    status: current
  - path: html-design/documents.test.mjs
    status: current
related:
  - contract.ai-review
  - architecture.html-design
  - module.editor
  - method.verification
confidence: high
---

# 文档保存与 AI 协作契约

## Summary

同一规范文件路径只有一个浏览器写者；AI 先等待浏览器保存和交出编辑权，再在工作副本修改，通过版本校验提交。


## Source Of Truth

`createDocumentStore` 为每个规范路径串行操作；`revisionOf` 是 HTML 的 SHA-256。默认浏览器 lease 15 秒、AI lease 10 分钟，交接等待 30 秒；以源码参数为准。


## Contracts

浏览器使用 `/__html-design/document/` 的 open/read/sync/save/takeover/yield/release；AI 使用 ai/begin/status/commit/cancel。save 与 ai/commit 必须匹配 revision；HTML 必须完整并包含 data-stage/data-artboard。服务限制项目内 HTML、拒绝隐藏路径和跨源写入；请求上限 32 MB。


## Workflows

先 `node html-design/collaborate.mjs begin demos/toy-history.html`，只修改返回的 workFile，再 `commit <session.json>`；取消则 `cancel <session.json>`。可用 HTML_DESIGN_ORIGIN 指向指定本地服务。会话和工作副本只保存在忽略的 `.html-design/`。


AI 提交后的接受/撤回、持久聚合基线、人工修改保护与双文件事务见 [AI 审阅契约](ai-review.md)。审阅是本地服务能力，私有基线不随 HTML 下载。

## Failure Modes

409 表示过期 revision、失去权限或交接冲突，必须保留修改并重新同步；不能强行覆盖。浏览器失败保留草稿。保存前历史保留最近 10 份；磁盘外部写入可被检测但不能被该服务阻止。

延迟的旧 viewer 心跳可能在同窗口接管已 pending 后再次触发 takeover。同 token 的 browser pending 请求必须幂等返回原请求，不能以409清除“一次点击进入编辑”的意图；其他窗口/AI锁与旧revision仍拒绝。保存/交接的串行与版本校验保持。


## Update Rules

协议、租约、版本算法、原子替换或草稿恢复变化时更新本页、协作说明与 documents.test.mjs。


## Open Questions

不支持多个服务进程协调写入同一目录；若将来需要远程协作，需另行设计身份、权限与跨进程协调。
