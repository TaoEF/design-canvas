---
id: contract.text-measurement
type: contract
status: active
owners:
  - html-design/text.mjs
  - html-design/text-measure.mjs
  - html-design/src/text-measure.js
updated: 2026-10-30
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
  - path: html-design/qa.mjs
    status: current
  - path: html-design/src/qa.js
    status: current
  - path: html-design/src/contrast.js
    status: current
  - path: html-design/contrast.test.mjs
    status: current
  - path: html-design/src/qa-result.js
    status: current
  - path: html-design/saved-file.mjs
    status: current
  - path: html-design/qa.test.mjs
    status: current
  - path: html-design/references/qa.md
    status: current
related:
  - module.editor
  - contract.document-collaboration
  - method.verification
confidence: high
---

# AI 本地文字测量

## Summary

提供只读本地文字测量 CLI，让内容/美学 skill 按需比较文字宽度并检查生成文件。Pretext 预测经浏览器校验，复杂文本回退实测，无外部服务。

## Source Of Truth

`text.mjs` 定义命令与文件快照来源，`text-measure.mjs` 验证输入、运行本地浏览器，`src/text-measure.js` 复用编辑器测量并输出 JSON。完整调用约定见 `html-design/references/text-measurement.md`；构建产物 `text-measure.js` 独立于文档内嵌编辑器。

## Contracts

measure 输入纯文本、字体、行高与候选内容宽度；check 扫描保存的静态 HTML，输出稳定页面/元素 ID、溢出及未能可靠测量的项目。源文件版本以 SHA-256 标明。测量单位为未缩放 CSS px，measure 是内容框，check 是边框盒；缺少高度约束不构造默认高度预算。

本地接口按 references/text-measurement.md 的 v1 约定稳定字段含义、类型、nullable 与退出码，允许消费者忽略新增字段；保持现有 JSON 格式，无额外网络 API。Flex/Grid 联动由浏览器原布局负责，测量不改原节点或布局。字体请求失败明确失败并保留原稿，不把失败回退成适配成功。

命令不写文件、不运行内容脚本、不申请编辑权。已有人工稿仍须通过协作流程获取最新工作副本，检查该副本时使用原稿资源基址；命令不声称读到了浏览器尚未保存的 DOM。字体/CSS失败、未知布局、隐藏文字、无效ID和截断不能返回干净通过。

按实际文本节点收集候选：无 `data-el` 的文字报告 unmarked，嵌套编辑元素周围的直接文字报告 NESTED_TEXT_CONTAINER；祖先隐藏和裁切分别报告 hidden / clipped。裁切由文本盒与祖先边界比较，可能是有意设计，不能据此自动扩大容器。浏览器上下文禁用内容 JavaScript，并拒绝文档跳转，避免检查其他页面却关联输入文件版本。

## 保存快照的布局 QA

`qa.mjs check` 在同一次浏览器准备和文字 check 上增补实际 Range/字素行诊断、可见对象越界和图片解码检查。与 export-cli 共用 saved-file.mjs 的普通文件/32MiB/单快照读取及临时只读资源边界；不读未保存 DOM，不申请编辑权或写回。schemaVersion1、英文规则码/有界事实、SHA-256 来源、CSS px、覆盖/截断/豁免计数与0/2/1退出码见 references/qa.md。旧 text.mjs measure/check 字段和退出码保持。

实际软折行才参与末行孤汉字（含结束标点）、单标点孤行与禁则行首/行尾检测，显式br/保留换行独立分段。复杂变换、竖排/多栏（column-count或column-width，包括适用后代）、混合字号/基线或不可靠Range明确不支持，不用预测替代事实。data-qa-ignore仅豁免具体观察规则；ID、资源失败、隐藏/不支持覆盖与扫描超限不可豁免为通过。QA标识最多256 UTF-16单元，过长目标/裁切祖先ID返回null和ID_INVALID，不截短成定位符。每条诊断追加前同时限制500条与128KiB issue JSON字节，裁切证据最多32层；省略项标为truncated/incomplete，合法ID保持原值。QA来源路径4096单元、错误文案512单元，连同元数据输出小于160KiB；旧text接口不套用这些新增边界。没有整体审美评分、自动修复、commit门禁或定位UI；#19已衔接旋转元素实际BCR的页边界检查；旋转文字逐行仍为LINE_UNSUPPORTED覆盖，不猜测禁则。#6已按真实裁切/内部图片几何校验，只有受支持实际clip才豁免预期内部越界。

## 保存快照的文字对比度

#33在同一次QA浏览器准备中独立运行固定本地axe-core4.10.3的color-contrast规则，不受TEXT_UNSUPPORTED/LINE_UNSUPPORTED阻断。普通文字AA4.5，大字AA3；判定用未缩放设计尺寸与引擎未舍入分类。白字白底1:1保留incomplete/possible-same-color，白字黄底按实际比值报告。实际参与文字背景的图片/渐变、混合/遮挡、SVG/生成文字或无引擎报告均明确未确认，不自建颜色猜测。不透明纯色层已遮住远祖先背景时保留axe确定事实；checkbox/radio/range/color等不显示value的控件归不适用，form-only可见文字缺data-el同样TEXT_UNMARKED/non-clean。独立contrast覆盖区分checked/low/unverified/hidden/inapplicable/unmarked和截断；真实文字item可共享所属data-el定位，ID/证据仍受现有上限约束。

仅QA的隔离context允许JavaScript调度可信axe（false下其异步调度不会完成）；响应头CSP仍强制script-src none/object-src none/frame-src none，并保留导航拦截，稿件inline/external/module/event-handler/javascript URL/内嵌frame不运行，内容meta CSP不能放宽响应头。旧measure/check继续javaScriptEnabled:false。引擎来自npm ci的生产依赖，失败/超时不能返回clean。contrast库存上限500文字item/100000字符/2000元素，issues共享500条/128KiB与30秒扫描预算。只有确定TEXT_LOW_CONTRAST可显式豁免并计数，未知覆盖不可豁免；字段与原因见references/qa.md。

## Workflows

文字密集或布局不确定时生成前比较候选宽度，生成后检查文字块；依据内容与美学约束决定调整方式。Skill 主文只保留一个按需规则，具体参数独立引用。普通画布拖动与编辑保持原样。

## Failure Modes

保存快照落后于浏览器；工作副本资源基址错误；字体回退不同于目标机器；复杂 CSS 不被支持；将文字检查误认为整体视觉或重叠检查。测量失败或被截断时不能把未检查项当作通过。

## Update Rules

改变字段、单位、退出码、快照语义或资源加载时同步引用文档和 CLI 回归。只修改测量能力不应升级或重建用户演示稿。

## Open Questions

尚未完成跨浏览器、大规模文档及真实生成 skill 效率对照；当前保留浏览器校验，不承诺性能收益。
