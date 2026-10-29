---
id: method.verification
type: method
status: active
owners:
  - package.json
  - scripts/
  - .github/workflows/ci.yml
updated: 2026-10-30
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
  - path: html-design/rotation.test.mjs
    status: current
  - path: html-design/text-measure.test.mjs
    status: current
  - path: html-design/qa.test.mjs
    status: current
  - path: html-design/text-layout.test.mjs
    status: current
  - path: .github/workflows/ci.yml
    status: current
related:
  - contract.ai-review
  - architecture.html-design
  - contract.document-collaboration
  - feature.export
  - architecture.ai-development-system
  - contract.text-measurement
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

浏览器全屏进入/退出是异步状态切换；回归用 waitForFunction 等待实际 fullscreenElement，不能在点击后立即读取后断言。首次 Linux CI 曾因此33/34通过，见 Issue #1。仅检查模板存在无法证明 GitHub 标签或 Project 已配置；仅检查图谱无法证明文字正确；旧 HTML 内嵌脚本不自动随 build 升级。


文字测量回归补充中英文预测/浏览器对照、复杂样式回退、50%/100%/200%缩放、富文本比例与单步撤销、离线保存重开、最小字号失败和字体异步期间退出编辑。演示页只使用分支新建稿，不覆盖主目录人工稿。

本地文字 CLI 回归补充多候选宽度与 DOM 对照、源文件不写回/版本标记、脚本禁用、相对 CSS 和失败字体、隐藏/未知/无效ID/截断不可误报通过。浏览器编辑测试需等待实际 editing/contenteditable 状态；双击后立即 fill 在并行负载下曾读到尚未可编辑节点。

独立工具审查增加三类回归：meta refresh 不可切换文档或执行目标脚本，无标注/嵌套直接文字不可遗漏，祖先透明/隐藏及裁切不可误报通过。内容脚本在浏览器上下文禁用，导航拦截导致的错误统一说明导航失败，不能返回其他页面的测量结果。

Flex 示例回归使用真实浏览器指针拉伸边点，验证兄弟框宽度与位置联动；保存重开保持 Flex，导出为原生自动换行文本框。富文本缩小适配后保存重开保持节点与格式，PPTX 保持多字号与颜色，PDF 保持页数。真实 web font 请求失败必须拒绝测量/适配且不改原稿，移除失败字体后恢复浏览器实测。

AI 审阅增加 review.test.mjs（真树语义、部分接受/恢复、私有基线、租约/并发、事务6故障点、重启/历史轮转）与 review-browser.test.mjs（真实 before 隔离、输入flush、只读、历史边界、下载/离线和导出）。`npm test` 固定执行 `node --test --test-concurrency=1 html-design/*.test.mjs`，本地与 CI 共用并发数 1 的完整回归配置，将浏览器套件按文件串行执行，以减少低资源 Linux 上的资源竞争；保留原测试语义与等待上限，接受运行时间增加。

布局 QA 回归使用真实 CLI 与 DOM Range，验证软折行孤字/标点、显式换行/豁免、混合基线不猜测、Flex/Grid/缩放、非文字越界、坏图/坏字体/外部根symlink、扫描上限及源hash不变。共享只读文件IO的变更同时复用导出CLI普通文件/FIFO/独占输出/信号清理回归。

旋转回归覆盖真实手柄和角度输入、共同中心多选、50/100/200%与非中心origin/原矩阵/均匀scale、局部resize往返与对侧锚点、父逆坐标拖动/微移、富文本最小字号、单步历史/取消/no-op、flow占位/inline还原、复制保存离线重开、真实owner→AI交接。PPTX实际XML检查累积角度/真实尺寸和中心、缩放padding/字体、原生圆角shape、图片crop/链接及identity嵌套组；同快照PDF渲染与浏览器平色连通块对照允许既有CSS→PDF量化1px。一次集中桌面/窄屏视觉和新增UI detector，Office人工验收仍单列。

## Update Rules

新增测试入口、CI 或改变依赖/浏览器时更新此页与 harness。


## Open Questions

README.md / PRODUCT.md / DESIGN.md：作为当前说明保留在原位，对关键事实逐项核实。demos/recovered/：historical 的本地恢复副本，保留在磁盘并由 Git 忽略；旧预览图为 historical，不自动晋升 Wiki。html-design/SKILL.md：保留现有使用说明，事实以源码为准。尚无历史聊天记录需要复制到 raw/。
