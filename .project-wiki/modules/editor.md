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

`editor.js` 组合交互；`ui.js` / `editor.css` 负责界面；`pages.js` 负责页面；`viewport.js` 负责缩放、播放；`text-layout.js` 封装 Pretext 1.0.0、字体就绪、测量和适配计划；`typography.js`、`guides.js`、`layers.js` 负责文字、吸附和叠层；`selection.js` 负责多选、框选和方向扩选；`persistence.js` / `drafts.js` 负责保存恢复；`export.js` 序列化导出。具体模块以当前 import 为准。


## Contracts

临时选框、辅助线、缩放和 UI 不得写进保存和导出。框选与元素相交即选中；只读窗口通过「编辑」一次完成安全交接并进入编辑。保留文档布局与手动内联样式。Lucide 许可由构建脚本嵌入产物。


## Workflows

修改 `src/`，运行构建与相关回归。已有文档使用 begin/commit 交接更新内嵌脚本；不能直接运行示例生成器替换用户稿件。


## 文字测量与适配边界

文字「适配」菜单提供溢出检测、保持字号调整高度、保持框按比例缩小字号（最小6px）。纯文本预测通过浏览器校验后采用，否则回退实测；混合字号不宣称由 Pretext rich-inline 覆盖。排版计划在隐藏副本上计算，仅操作确认时修改原节点，保留 HTML 结构；无布局缓存/分行持久化，PPTX 保留原生自动换行与显式段落。复杂块结构/伪元素/多栏/竖排/截断不自动适配。每次仍测量 DOM，不承诺性能收益。AI 只读测量/扫描通过独立本地命令提供，见 contract.text-measurement。

排版模式保留原 CSS，不能将原来绝对定位的示例当成 Flex 联动。独立 demos/flex-text-layout.html 用真实 Flex 兄弟文字框验证边点拉伸的挤压、测量不改布局、单步撤销、保存重开与可编辑导出；已有人工稿不重建、不随 build 更新。

## 紧凑 UI

侧栏170px，缩略图宽按列表内宽计算并保留顶部安全边距。页头模式显示「自动排版 / 手动」，内部 flow/artboard 语义不变。元素工具条为黑底浅色，文字对齐单击按左/中/右/两端循环并反映状态；文字适配位于元素更多菜单，面板锚定可见的元素更多按钮，避免隐藏菜单项造成坐标或焦点丢失。颜色入口改为圆点但原生选色器不变；图片为适应/填充、RefreshCw 替换。更多类菜单190px。

## Failure Modes

侧栏宽度变化时，画布视口必须读取同一 CSS 宽度变量，不能保留另一套断点常量。自动适应与后续缩放采用相同的三位小数精度，避免内容更新时重算缩放产生亚像素位移。

文字自然高度测量必须解除副本的 aspect-ratio / contain / container-type 尺寸约束，并结合真实节点 scrollHeight/clientHeight 验证，避免误报适配成功；坐标和视觉缩放不一致；复制后 ID 引用重复；把 owner 状态当作 editing；跨容器图层或临时 UI 污染保存。


## Update Rules

增删模块、改变模式或持久化字段时更新本页与 DESIGN.md，并添加相应行为回归。


## Open Questions

多选和编辑入口工作已由原开发任务报告完成；首次导入在独立干净副本中复核。未来行为以当前源码和回归为准。
