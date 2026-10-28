---
id: module.editor
type: module
status: active
owners:
  - html-design/src/
  - html-design/editor.js
updated: 2026-10-28
sources:
  - path: html-design/src/editor.js
    status: current
  - path: html-design/src/pages.js
    status: current
  - path: html-design/src/viewport.js
    status: current
  - path: html-design/build.mjs
    status: current
  - path: html-design/src/selection.js
    status: current
  - path: html-design/selection.test.mjs
    status: current
  - path: html-design/src/text-layout.js
    status: current
  - path: html-design/text-layout.test.mjs
    status: current
  - path: DESIGN.md
    status: current
related:
  - architecture.html-design
  - contract.document-collaboration
  - feature.export
  - method.verification
  - contract.text-measurement
confidence: high
---

# 浏览器编辑器模块

## Summary

原生 JavaScript 编辑器按职责拆分，构建为可内嵌的单脚本。默认画布预览；编辑权限与显式编辑模式是独立状态。


## Source Of Truth

`editor.js` 组合交互；`ui.js` / `editor.css` 负责界面；`pages.js` 负责页面；`viewport.js` 负责缩放、播放；`text-layout.js` 在实验分支封装 Pretext 1.0.0、字体就绪、测量和适配计划；`typography.js`、`guides.js`、`layers.js` 负责文字、吸附和叠层；`selection.js` 负责多选、框选和方向扩选；`persistence.js` / `drafts.js` 负责保存恢复；`export.js` 序列化导出。具体模块以当前 import 为准。


## Contracts

临时选框、辅助线、缩放和 UI 不得写进保存和导出。框选与元素相交即选中；只读窗口通过「编辑」一次完成安全交接并进入编辑。保留文档布局与手动内联样式。Lucide 许可由构建脚本嵌入产物。


## Workflows

修改 `src/`，运行构建与相关回归。已有文档使用 begin/commit 交接更新内嵌脚本；不能直接运行示例生成器替换用户稿件。


## Pretext 实验边界

当前分支新增文字「适配」菜单：溢出检测、保持字号调整高度、保持框按比例缩小字号（最小6px）。纯文本预测通过浏览器校验后采用，否则回退实测；混合字号不宣称由 Pretext rich-inline 覆盖。排版计划在隐藏副本上计算，仅操作确认时修改原节点，保留 HTML 结构；无布局缓存/分行持久化，PPTX 仍按浏览器实测导出。复杂块结构/伪元素/多栏/竖排/截断不自动适配。每次仍测量 DOM，不承诺性能收益。AI 只读测量/扫描通过独立本地命令提供，见 contract.text-measurement；不会改变编辑 UI 或重建旧文档。

## Failure Modes

文字自然高度测量必须解除副本的 aspect-ratio / contain / container-type 尺寸约束，并结合真实节点 scrollHeight/clientHeight 验证，避免误报适配成功；坐标和视觉缩放不一致；复制后 ID 引用重复；把 owner 状态当作 editing；跨容器图层或临时 UI 污染保存。


## Update Rules

增删模块、改变模式或持久化字段时更新本页与 DESIGN.md，并添加相应行为回归。


## Open Questions

多选和编辑入口工作已由原开发任务报告完成；首次导入在独立干净副本中复核。未来行为以当前源码和回归为准。
