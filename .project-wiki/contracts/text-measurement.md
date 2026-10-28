---
id: contract.text-measurement
type: contract
status: active
owners:
  - html-design/text.mjs
  - html-design/text-measure.mjs
  - html-design/src/text-measure.js
updated: 2026-10-28
sources:
  - path: html-design/text.mjs
    status: current
  - path: html-design/text-measure.mjs
    status: current
  - path: html-design/src/text-measure.js
    status: current
  - path: html-design/references/text-measurement.md
    status: current
  - path: html-design/text-measure.test.mjs
    status: current
related:
  - module.editor
  - contract.document-collaboration
  - method.verification
confidence: high
---

# AI 本地文字测量

## Summary

Pretext 实验分支提供只读 CLI，让内容/美学 skill 按需比较文字宽度并检查生成文件。没有新增 HTTP 接口、编辑器 UI 或外部服务。

## Source Of Truth

`text.mjs` 定义命令与文件快照来源，`text-measure.mjs` 验证输入、运行本地浏览器，`src/text-measure.js` 复用编辑器测量并输出 JSON。完整调用约定见 `html-design/references/text-measurement.md`；构建产物 `text-measure.js` 独立于文档内嵌编辑器。

## Contracts

measure 输入纯文本、字体、行高与候选内容宽度；check 扫描保存的静态 HTML，输出稳定页面/元素 ID、溢出及未能可靠测量的项目。源文件版本以 SHA-256 标明。测量单位为未缩放 CSS px，measure 是内容框，check 是边框盒；缺少高度约束不构造默认高度预算。

命令不写文件、不运行内容脚本、不申请编辑权。已有人工稿仍须通过协作流程获取最新工作副本，检查该副本时使用原稿资源基址；命令不声称读到了浏览器尚未保存的 DOM。字体/CSS失败、未知布局、隐藏文字、无效ID和截断不能返回干净通过。

## Workflows

文字密集或布局不确定时生成前比较候选宽度，生成后检查文字块；依据内容与美学约束决定调整方式。Skill 主文只保留一个按需规则，具体参数独立引用。普通画布拖动与编辑保持原样。

## Failure Modes

保存快照落后于浏览器；工作副本资源基址错误；字体回退不同于目标机器；复杂 CSS 不被支持；将文字检查误认为整体视觉或重叠检查。测量失败或被截断时不能把未检查项当作通过。

## Update Rules

改变字段、单位、退出码、快照语义或资源加载时同步引用文档和 CLI 回归。只修改测量能力不应升级或重建用户演示稿。

## Open Questions

尚未完成跨浏览器、大规模文档及真实生成 skill 效率对照；当前保留浏览器校验，不承诺性能收益。
