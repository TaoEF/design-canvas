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

## H. 独立审查 Findings 的修复验收（Planner追加）

H01 修改页内style/stylesheet link中的跨页选择器，应产生单一文档级审阅；不得在其他页已接受/人工修改后通过某页Undo改变其共享样式。普通内联style属性仍可页级。
H02 white-space:pre的stage、inline-block页面之间换行改空格，实际布局可变，必须有文档级审阅；保留pre/inline文字，不用格式忽略漏报。
H03 真实浏览器门闩延迟Undo响应：请求发出后普通Edit、改字、拖动/源码应用均不可创建新持久修改；响应后内容和连接可继续正常使用。
H04 在响应期间强制制造dirty/未应用源码，验证刷新保护：不释放有效token后再盲目导航，不丢DOM/草稿，不永久refreshing；明确冲突或可恢复状态，不用忽略beforeunload断言代替修复。
H05 修复后针对review Node/browser与原交接流程定向验证；不常规二次独立审查。最终干净候选运行完整相同断言，并由Planner实际覆盖H01-H04。

## I. 用户确认的 Flato UI 修订验收（Planner，2026-10-28）

I01 单页updated自动页底「放弃｜接受」，无需顶部入口/打开面板；hover/focus放弃原位before，离开/blur/接受hover恢复after；点击才写入。preview前后磁盘字节/revision、DOM与history不变，Accept仍字节不变。
I02 真实浏览器在50%/200% zoom、pan四边越界、1280/390px窗口和侧栏开合时检查操作条bbox完整在viewport.bounds内，按钮屏幕尺寸不变；before/after锚点相同，无hover引起的位移/闪烁。页面真实尺寸变化不拉伸before。
I03 两页pending默认右下收起summary包含数量/箭头/Accept All；展开逐项定位、放弃、接受，长名和多项列表可滚动；接受一页保留另一页baseline，剩一页UI正确，全部接受后控件消失；current未pending但另页pending仍可发现/到达。
I04 新增页无before；唯一删除页仍有恢复/接受入口，恢复位置/导航正确；最后一页删除仍可恢复；全局scope明确显示文档范围和原因，不提供虚假页级动作，部分接受成果保留。
I05 使用真实网络门闩：hover后立刻离开、切页、切接受/新generation，迟到before结果不得显示；再hover可正确载入最新before；失败有反馈、不标假before。保持hover多次heartbeat不会销毁/闪现iframe或改焦点。
I06 原位before继续阻止脚本/事件/表单/导航和嵌套活动内容；保留相对资源基址；before打开时下载/PDF/PPTX仍只取after，stage、保存与导出无review UI/iframe泄漏。before页面大小/样式不同也不改变canonical尺寸/布局。
I07 owner预览态可处理；viewer能hover查看但写动作禁用；Undo门闩期间普通Edit/拖动/源码应用仍锁定，异常dirty/source仍保DOM/草稿/token，旧revision/generation仍拒绝。
I08 Tab/focus同样显示before，blur/接受聚焦/Escape恢复after；展开/收起有正确aria和可见焦点，退出回到可见控件；触摸设备可直接处理；进入播放隐藏review并退出旧preview，返回后恢复正确状态。
I09 旧A-H、documents、UI/selection/text/导出断言继续通过；旧测试仅更新已变的交互步骤，禁止删掉安全断言。build确定、wiki/project/graph/diff通过；按concurrency=2跑完整回归。运行一次UI detector并记录处理或有据例外。
I10 Planner在最终干净模拟集成候选上独立实际覆盖I01/I02/I03/I04/I05/I06；结合I07/I08定向用例确认，不只看截图。桌面/窄屏截图一次批量检查、集中修复后至多一次视觉确认。记录原服务8881/人工稿保持事实和新的稳定URL。用户确认前不进#6或远端交付。

流程：Developer主验证冻结后，原Reviewer仅检查5502560之后新增UI边界一次，直接反馈Developer；不重复原服务审查。Planner验收修复后的确定候选。用户「好的，开始」授权实施本修订，不等于验收旧候选。

I11 UI增量审查修复：真实窗口1280×844及390×844、页面1600×1000等大于viewport时，仅改文案的before与实际原始渲染具有相同10vw字号、10vh行高和min/max-width媒体查询颜色；iframe innerWidth/innerHeight等于父实际viewport。fit可看到完整页面，200%/pan时只裁切可见区域；投影保持当前页屏幕原点，不拉伸。保持hover跨窗口resize后单位/媒体查询及自然尺寸刷新正确，旧测量不能滞留；原nth-child/继承/尺寸和异步/权限断言继续通过。Planner需独立实际执行此复现，而非仅核读Developer结果。

## K. 用户要求的一键审阅与后台安全交接（Planner，2026-10-29）

K01 真实两个浏览器窗口A owner/B viewer，B在预览态直接点击Accept（按钮不因viewer灰掉），自动takeover，A正常yield后一次操作完成；无需点Edit，不进入editing，HTML字节/revision不变，pending正确减少。
K02 同样两窗口B一次点击Undo，先交接再撤回/刷新；before正确恢复，页码/zoom保持，普通历史边界与后续新人工编辑可用；不自动进入editing。
K03 Accept All、展开列表逐项Accept/Undo、唯一删除页恢复都走同一自动交接；不漏掉只有页底按钮修了的情况；触摸和Enter/Space显式激活可执行。
K04 A有最新未保存人工编辑，B点击旧Undo：A先flush保存，人工内容不丢；目标已被隐式接受或generation/revision变化则旧动作停止，B同步新状态，没有无条件重放到新审阅。
K05 A有未应用源码/保存失败无法yield，B等待状态明确且有界，不能强抢、不能写；失败后保留原稿/草稿/有效token，可重试；超时/离开后没有迟到自动执行。
K06 B加载的是旧revision/旧generation，或交接等待期间新AI/另一窗口已处理目标，禁止旧动作写入；保留人最新内容、清楚同步/失效反馈。不因自动reload把旧意图换到新scope。
K07 同时双击/Enter+Space、延迟的交接前heartbeat或同token pending重入不重复takeover/review写；其他窗口/AI锁仍不能被重复请求绕过。
K08 网络断开、lease过期、AI锁、他人pending及窗口关闭等失败路径fail closed；本窗口自动交接/写状态可恢复，无永久busy/refreshing、无删除token后循环401、无过期后台回调执行。
K09 在takeover等待及review响应门闩期间，B普通Edit/拖动/源码应用仍锁定，A合法flush/yield和B自己的等待poll仍能完成，无reviewing短路死锁。hover/focus只预览不takeover；click才触发。
K10 build和原A-I保护、服务端直接viewer API拒写、AI/lease/CAS/故障恢复继续通过；只改已明确变化的viewer UI断言。完整concurrency=2回归、wiki/project/graph/diff通过。Planner最终候选独立两窗口覆盖Accept/Undo/All、人工脏内容保护及无editing，并提供新稿入口。用户确认前不进下一项或远端交付。

## L. 同轮追加label与页码验收（2026-10-29）

L01 使用ID为p8/p12但实际第1/2页的样本，修改/新增项按after真实顺序显示第1/2页；与页脚/缩略图导航一致，不从ID推数字。接受某页/删除其他页后剩余显示与当前顺序一致。
L02 删除项显示baseline原顺序的「原第N页」，不能显示成当前N；恢复后导航当前页正确。共享CSS/document项仅显示整份文档，无虚假page number。
L03 修改/新增/删除为非按钮小label，归于左侧页面信息，不在右侧action组，不可Tab聚焦、不触发定位/审阅写；页码、长名称、label、两个动作在桌面/390px布局可区分，关键页码与按钮不截断。
L04 轻量页序字段来自已有解析结果；新增summary元数据不改变设计HTML字节/revision、baseline schema或原权限/恢复语义。相关Node/浏览器断言及最终全量保持，Planner确认一次桌面/窄屏截图与实际行内容。和K同一候选/同一次新增增量检查，不另启动功能。
