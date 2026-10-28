---
id: feature.export
type: feature
status: active
owners:
  - html-design/export.mjs
  - html-design/pptx.mjs
  - html-design/src/export.js
updated: 2026-10-28
sources:
  - path: html-design/export.mjs
    status: current
  - path: html-design/pptx.mjs
    status: current
  - path: html-design/src/export.js
    status: current
  - path: html-design/export.test.mjs
    status: current
related:
  - architecture.html-design
  - module.editor
  - method.verification
confidence: high
---

# PDF 与可编辑 PPTX 导出

## Summary

导出点击时的当前 DOM 快照，含未保存编辑。PDF 按画板逐页渲染；PPTX 将支持的文字、图片和形状映射为独立对象。


## Source Of Truth

浏览器 `src/export.js` 提交快照；服务 `/__html-design/export/pdf|pptx`；`export.mjs` 使用 Playwright、pdf-lib、PptxGenJS；`pptx.mjs` 收集和映射对象。


## Contracts

导出不重新读取旧磁盘 HTML。脚本通过 CSP 禁止执行，等待字体图片；最多 100 页，尺寸 1–4096px。PDF 允许逐页不同尺寸；PPTX 页面宽高比须一致。普通文字与 img 不整页扁平化；SVG/canvas 可转为图片。

PPTX 每个文字元素对应一个可编辑文本框，开启 `wrap="square"`，不自动缩小字号或按文字撑宽。只保留 HTML 的显式换行（br、块段落、white-space 保留的换行），不将浏览器因当前宽度产生的软折行固化。普通空白按 CSS 合并，跨 span 保留词间空格，pre/pre-wrap/break-spaces 保留空格。富文本样式继续按 run 映射，混合字号或基线差异不能凭字符几何位置推断换行。


## Workflows

本地预览中选择导出；macOS 可使用已安装 Chrome，其他环境安装 Playwright Chromium，或设置 HTML_DESIGN_CHROME。离线 HTML 保留下载和浏览器打印能力。


## Failure Modes

复杂 CSS、滤镜、圆角与字体可能简化；目标机器缺字体会改变显示。图片加载错误、比例不符或并发导出会明确失败，不能发布不完整产物。

固定浏览器软折行并关闭文本框换行，会导致 WPS / PowerPoint 拉宽后段落仍无法重新排版（Issue #3）。需同时修正文本内容和 wrap 属性；仅打开 wrap 无法删除已固化的换行。PPTX 原生排版与浏览器可能存在折行差异，以可编辑段落语义为准；PDF 继续保留浏览器布局。导出回归检查真实生成的 slide XML，覆盖中英文、富文本、显式空行和空格。


## Update Rules

新增映射、限制、字体或快照逻辑时同步 README、导出测试与本页。


## Open Questions

不承诺复杂 CSS 与 PowerPoint 完全等价；尚无正式分发或兼容性支持矩阵。
