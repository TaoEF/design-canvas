---
id: contract.ai-review
type: contract
status: active
owners:
  - html-design/documents.mjs
  - html-design/review-html.mjs
  - html-design/review-store.mjs
  - html-design/src/review.js
updated: 2026-10-28
sources:
  - path: html-design/review-html.mjs
    status: current
  - path: html-design/review-store.mjs
    status: current
  - path: html-design/documents.mjs
    status: current
  - path: html-design/src/persistence.js
    status: current
  - path: html-design/src/review.js
    status: current
  - path: html-design/review.test.mjs
    status: current
  - path: html-design/review-browser.test.mjs
    status: current
  - path: html-design/references/collaboration.md
    status: current
related:
  - contract.document-collaboration
  - module.editor
  - method.verification
  - feature.export
confidence: high
---

# AI 修改审阅契约

## Summary

AI commit 后当前 HTML 是 after，私有聚合 baseline 只用于未接受修改的恢复。逐页/整份 Accept 不重写设计，Undo 使用版本/租约/generation 检查的新写入。HTML/CSS 仍是设计真值。

## Source Of Truth

review-html.mjs 使用服务端 parse5@8.0.0 真树和 source locations 分析与局部恢复；review-store.mjs 保存单文件 prepared envelope；documents.mjs 复用规范路径的 exclusive 队列；persistence.js 负责 flush、权限和刷新边界；review.js 只负责紧凑摘要和隔离 before。

## Contracts

- 页内变更按 data-artboard 稳定标识归类新增/修改/删除；共享 head/样式/全局属性/页外结构、任何内容脚本、已有页重排、重复/缺失标识、非 stage 直接子页等保守归为文档级。
- 等价属性次序/引号、编辑器 runtime/connection/UI、bbox、临时属性与序号不产生 pending。保留真实文本/pre 空白、data-mode/data-flow-style 和内容样式。
- 聚合 baseline 保留首次未接受版本；Accept 某页把该页当前状态写入 baseline，其他 before 保留。人工保存更新被修改范围的 baseline；全局人工修改或文档级 pending 后的人工修改接受整个审阅。派生差异不接受。
- 保存仍使用现有 CAS、备份与原子替换。新增 review/read、review/accept、review/undo；读按需返回 before，写只收 revision/generation/scope/requestId，服务器决定恢复内容。仅当前 owner 且无 AI/待交接可处理。
- `.html-design/reviews/<canonical hash>/state.json` 为 0600，独立于10份历史轮转；prepared 内保存旧 state/from/to/next。磁盘等于 to 时 finalize，等于 from 时 rollback，否则保留证据并阻止所有写入。metadata-only 也做近端文件版本检查。
- 轻量摘要不传 baseline；恢复后保留当前 runtime、单调序号，刷新清空旧 DOM closures。下载/离线不携带审阅状态，原离线编辑仍可用。
- before 清洗脚本/事件/表单/导航/嵌套活动内容，并置于 sandbox（仅 allow-same-origin，无 allow-scripts/forms/top-navigation）与 script-src none CSP 中。允许同源以保留原字体/资源，iframe 内容不进入 stage、序列化、history 或导出。

## Workflows

先正常 AI begin/commit，打开顶部 AI 修改：查看修改前、定位修改后、逐项撤回/接受或全部接受。正在输入时处理会先结束编辑并 flush；如果基线因人工编辑或其他窗口发生变化，刷新列表后重新选择，不自动重试旧写入。

`node html-design/review-demo.mjs` 只创建独立新稿并通过相同服务存储实现种入两页 pending；默认随机文件名，已有文件以 wx 拒绝覆盖。它不是升级已有稿的工具。

## Failure Modes

存储错误不会静默清空记录。HTML rename 后响应失败，可由下一次读取/重启 finalize，并通过同一 AI token 重试确认；重复 review 写仅显式 requestId 与相同原 revision/generation/scope 的最近收据可重放，后续内容变化后旧请求拒绝。

普通 undo/redo 不能跨恢复刷新执行旧节点命令。全局变化不能伪装为页级恢复。下载的 bundle 虽包含审阅代码，但没有 connection 或私有 baseline，不能离线撤回服务端 AI 提交。已有稿要走协作流程更新 bundle。

## Update Rules

改变 semantic scope、恢复、持久事务、权限、隐式接受或 before 隔离时同步协作说明、README 与 review Node/browser 回归。测试矩阵按 Issue #5 Planner 计划执行，不能用截图替代崩溃一致性证明。

## Open Questions

不支持跨服务进程协调、跨设备持久审阅、三方合并或离线审阅。外部第三版本冲突保留记录并拒绝盲目恢复，暂无自动合并/冲突解除产品流程。

基线保存 HTML/CSS 声明与资源引用，不快照被原地覆盖的外部图片、字体或 CSS 文件。同一 URL 下资源字节的外部变化不能由本次 HTML diff 撤回。
