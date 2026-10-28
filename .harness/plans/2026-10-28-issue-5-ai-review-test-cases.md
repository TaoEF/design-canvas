# Issue #5 — AI Undo / Accept 测试与 Planner 验收计划

- Canonical：https://github.com/TaoEF/design-canvas/issues/5
- Planner 作者：`/root`，2026-10-28；Developer 负责执行、记录及修复。
- 实施计划：`2026-10-28-issue-5-ai-review-implementation-plan.md`。
- 全部测试使用 mkdtemp 或独立审阅样例，禁止写主目录/既有 demo/服务。

## A. 纯 HTML 分析、scope 与恢复

A01 相同 HTML、属性引号/次序等明确等价差异，以及 bbox/editor connection/viewport/seq 派生更新不生成审阅；pre/inline 空白与真实样式变化不被误忽略。
A02 更新 p1 文案/局部style，只生成 p1 updated；p2 保持 after，Undo p1 不影响 p2。
A03 新增 p3 / 删除 p2 / 二者混合；可发现和按项 Accept/Undo；删除恢复位置按旧邻接关系，其他页顺序不变。
A04 改 head CSS/link/字体、全局属性、页外内容脚本/结构，或重排已存在页，必须文档级；新增/删除页本身不误判为全局。
A05 重复/缺失页标识、嵌套/复杂祖先结构不能安全按页时保守文档级，不靠 regex 截断 script/style 或嵌套标签。
A06 纯 editor bundle 更新无设计审阅；撤回设计不降级当前 editor bundle。
A07 恢复删除页/旧文档后 page/element seq 不减，新增/复制不会复用标识；SVG/链接引用不变。

## B. 多轮 AI 与部分处理

B01 人工最新未保存文本经 flush/yield 进入 AI before；AI 修改后刷新可见 before 是人工最新结果。
B02 同页 AI 连改两轮，before 为最初未接受版本；其他页 before 独立正确。
B03 先 Accept p1，再 AI 改 p1/p2；p1 新 before 为已接受版本，p2 保留首次 pending before。
B04 先 Accept p1、保留 p2 pending，再 AI 改共享 CSS；转文档级 Undo 后 p1 已接受成果仍存在，p2 未接受变化可撤回。
B05 新增页未 Accept 再 AI 修改/删除、旧页删除后 AI 恢复/同ID更新，聚合 diff 与最终 before/after 一致，没有幽灵记录。
B06 AI 无实质修改、begin 后 cancel/过期、失败提交均无虚假 Accept；AI 未终结时不提前展示本轮新审阅。

## C. 人工编辑保护

C01 AI 后人工修改 p1，保存隐式接受 p1，p2 pending 保留；旧 UI 的 p1 Undo 被拒绝，不覆盖人工内容。
C02 文档级 pending 后真正人工编辑，按计划隐式接受文档并说明；选择/进入编辑/缩放/派生 bbox 不能触发接受。
C03 正在改字/拖动时点 Undo，先结束与 flush；若人工内容刚接受了目标，后续 stale 请求不得撤回。
C04 Accept 不写设计字节、不改变文档 revision、不增加普通 history；重复操作安全；另一窗口旧 generation 即使同 revision 也不能处理新 review。
C05 Undo 后 ordinary undo/redo 不执行旧 DOM closures，选择/页码/缩略图正确；允许新人工编辑重新形成普通 history。

## D. 权限、版本与安全

D01 owner 预览态可接受/撤回，viewer 仅看；接管后才可写。失去/过期 lease、AI锁、pending handoff 时服务端拒绝写，不仅靠禁用按钮。
D02 旧 revision、旧 generation、跨页错误 scope、直接外部改盘、删除审阅目标与并发窗口请求均 fail closed，当前 HTML 和基线保留。
D03 原 canonical path、符号链接/别名锁、跨源写保护与隐藏路径限制回归；review sidecar 不可经静态服务访问。
D04 before 内 script/onclick/表单/meta refresh/iframe/object 均不能执行或导航修改真实页面；只读预览不能聚焦交互或更改 canonical DOM/history。

## E. 持久化与故障恢复

E01 刷新/关窗重开、createDocumentStore 重建或服务重启后 pending 与 before 正确；无需浏览器 localStorage 唯一副本。
E02 连续超过10次普通保存（修改非pending页）后 pending基线仍可撤回；接受后可清理不再使用的数据。
E03 注入 prepared写失败、HTML rename前失败：当前 HTML 和旧审阅均保留，无伪提交。
E04 注入 HTML rename后/metadata finalize前中断，重新创建store：磁盘=toRevision时补完 next review，不丢基线、不重复审阅。
E05 journal存在但磁盘仍fromRevision时回退；两者都不等时报告外部冲突，保留证据并拒绝盲目Undo。
E06 丢响应后重复 AI commit/Accept/Undo 不重复创建、不覆盖新版本；元数据写失败不得声称已接受或返回无pending。
E07 长文/内嵌图片baseline按现有文档上限行为正确；心跳只含轻量摘要，不反复传整HTML；存储错误有明确反馈。

## F. UI、保存与交付

F01 默认展示 after；紧凑入口/数量和摘要可达，更新/新建可定位、删除项可恢复；文档级有明确范围与原因。
F02 before iframe 与正式stage隔离，预览进出不改序列化字节；原文档相对字体/图片使用正确基址；before只显示目标页或文档。
F03 Accept All、逐页Accept、逐页Undo后数量/当前页一致；键盘/Esc/焦点回到可见入口，窄窗口不覆盖关键操作。
F04 before开着时下载/PDF/PPTX只导出after，不含任何review UI/iframe/connection；离线下载不带私有基线，已有离线编辑不回归。
F05 多窗口同步、源码未应用、草稿恢复、普通自动保存与AI handoff原有行为回归；原未保存设计不被reload冲掉。
F06 新增独立审阅样例，含两页、共享CSS与内容脚本样本，并配最小CLI/可复验步骤；生成前后文件不得冒充正在编辑demo。

## G. 执行顺序、审查与验收

1. Developer 先执行 A/B/D/E 的服务与纯逻辑用例，再执行 C/F 的浏览器集成，记录实际覆盖到的case IDs。可把相关场景合并为有辨别力的测试，不逐条镜像实现。
2. 主验证：build、review/documents/browser定向、完整回归（concurrency=2）、wiki/project/graph/diff检查；透明保留失败，修复后按涉及边界复验。
3. Developer 冻结 tip、提交变更摘要/测试证据；Planner 才分派恰好一次独立只读审查，Reviewer Findings直接回Developer修复并抄Planner，不新增同功能Developer。
4. Planner 基于最终tip建立干净本地模拟集成候选；新代码/修复需实际运行对应验收，不能只看Developer摘要。
5. Planner 独立行为验收至少覆盖：B01/B04、C01/C04、D02/D04、E01/E04、F01/F04；用服务/API复现与真实浏览器组合，避免重复整轮审查。
6. 稳定独立URL提供给用户。用户体验路径：AI改p1 → 修改前对照 → Undo；再改两页 → 接受一页；删页 → 恢复；人工改字后旧Undo不可覆盖；共享CSS → 文档级审阅。
7. 记录 base/feature tip/integration commit/tree、clean fact、test profile、审查范围与处置、入口、局限。用户确认前不启动 #6，不更换原服务、不升级人工稿、不合 main/远端交付。
