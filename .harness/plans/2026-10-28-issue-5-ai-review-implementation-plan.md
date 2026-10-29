# Issue #5 — AI Undo / Accept 实施计划

- Canonical Issue：https://github.com/TaoEF/design-canvas/issues/5
- Parent / queue：https://github.com/TaoEF/design-canvas/issues/4
- 日期：2026-10-28
- Planner / 需求沟通 / 验收 / Dev-Manager：本聊天 `/root`（flato能力迁移）
- Developer：`/root/undo_accept_developer`，只负责产品实现、测试、修复与证据，不负责决定需求或编写本计划。
- 基线：本地主线 `c75b1ac363b81e15bd0c0428064173020427b56b`；分支 `codex/issue-5-ai-review`。
- 独立工作副本：`/Users/yifutao/.codex/worktrees/issue-5-ai-review/design-canvas`。
- 关联测试计划：`2026-10-28-issue-5-ai-review-test-cases.md`。

## 1. 授权、WIP 与不做事项

用户已要求 Planner 分派一名 Developer，列 WIP 后开始，完成一个由用户确认，再进行下一项；随后明确 Planner 负责计划、验收与需求沟通。此计划由 Planner 制定，启动授权已经获得；Developer 仍必须等 Planner 在 Issue 记录 DoR 与 admission。

本批 coding WIP=1，仅 #5；之后 #6 → #7 → #8 → #10 → #9。后续项目不因排队自动 ready，不在本次实现。#2/#3/#11 的代码已获授权本地集成，它们既有 owner、远端交付状态不变；本批不重复开发或关闭它们。

不修改主目录、人工 demo、其他 worktree 或现有 8876/8879/8880 服务；不 push、PR、合并 main、部署。测试均使用临时文件；只新增独立的审阅试用稿和独立预览服务。完成后停在精确本地候选，等用户验收。

不做跨设备审阅、多人合并、协同 CRDT、任意三方合并、全量历史持久化、线上效果自动化，不替换 HTML/CSS 为 blocks JSON，不扩大为其他功能。

## 2. 已核实的源码与根因

已读 harness、collaboration/editor/export/verification wiki、`documents.mjs`、`server.mjs`、`collaborate.mjs`、`src/persistence.js`、editor 的 snap/push/history、serialize、reloadLatest、pages 的独立 iframe 缩略图，以及现有 documents/browser 测试。

当前服务为 canonical 文件路径串行化 revision/lease/write，AI begin 等待浏览器 flush/yield，commit 原子替换 HTML；浏览器发现 revision 变化会 reload。普通 undo 命令持有活 DOM 引用，刷新即消失；保存前备份仅保留10份，不能作为待审阅记录。

参考 Flato 的页级审阅行为，不搬 React/Zustand/pages-blocks 模型。借鉴 before 基线、after 为当前内容、增改删摘要、Accept/Undo 和人工修改隐式接受。

## 3. 用户可见行为（本轮确定的产品默认值）

1. AI begin/commit 成功后，当前 HTML 立即作为 after，可正常预览；变动终结后才显示紧凑审阅入口，含待审阅数量。
2. 页内独立变更：列出修改/新增/删除页；更新/新增可定位现页，删除页只在摘要显示。每项提供 Undo、Accept，摘要提供 Accept All。
3. before 通过显式「修改前/修改后」或同等清晰操作查看；隔离只读，不覆盖真实画布。新建页无 before，只提供撤回新增；删除页 before 可预览并恢复。
4. 共享 CSS、内容脚本、全局结构/属性、已存在页面顺序的变化归为文档级审阅，显示「整份文档」及原因；仅提供整次 Undo/Accept，不同时显示误导性的逐页恢复。保守扩大到文档级优于不完整还原。
5. Accept/Accept All 是确认当前结果，只改审阅元数据，不重写 HTML、不制造普通编辑历史。
6. 同页多次 AI 修改前未 Accept 时，保留最初未接受的 before。已接受的改动不能在后续审阅中被带回。
7. 用户后续真正修改某页并保存，隐式接受该页原 AI 修改，并在本次保存反馈中说明；其他待审阅页保留。文档级 pending 后发生真正人工修改则隐式接受文档审阅，避免任何后续 Undo 覆盖人工成果。仅进入编辑/选中/缩放不接受，派生 bbox 等更新也不应接受。
8. Undo 是新的受保护恢复写入：先结束当前手势/文字并 flush，检查 owner、lease、revision 与审阅 generation；不满足则明确失败并保留现有内容。成功后刷新/重新应用并清空会持有旧 DOM 的普通历史；不能让旧命令修改脱离文档的节点。
9. 只读窗口可以看摘要/before，写动作只有持有写权限的窗口可执行。owner 在默认预览态也可审阅，无须把 owner 与 editing 混为一谈。
10. 本轮审阅依托本地服务，持久基线不嵌入下载 HTML，离线文件不伪装支持服务审阅。已有普通离线编辑/下载保持；UI 和说明明确能力边界。

## 4. 核心数据与实现约束

### 4.1 设计真值与派生 diff

当前磁盘 HTML 及浏览器真实内容 DOM 仍是设计真值；服务 review sidecar 只是撤回参考和元数据。不得引入另一个独立可编辑的页面模型，也不存一份长期 after 文档。

服务需要 HTML parser，使用成熟 parser 的真实树与 source locations；允许新增一个锁定的轻量解析依赖并保留许可。不能靠跨页面正则截取 HTML。优先使用 source ranges 对指定 page 做局部替换/插入/删除，不把整份人工 HTML 无谓重序列化。解析依赖用于服务，不加入浏览器 bundle。

页对比以稳定 `data-artboard` 为主；存在重复/缺失标识、嵌套页、无法安全定位的结构则保守走文档级，不猜测。页内文字、属性、局部 style 均属于页；共享头部样式/字体/link、内容脚本、html/body/stage 全局属性或页外结构变化属于文档级。重排已有页走文档级；正常增删页仍可按页审阅。

比较必须排除已知编辑器临时属性/UI、data-bbox、connection 注入、视口状态、运行时计数变化；不能忽略 data-mode、data-flow-style、内容内联样式或内容脚本。编辑器 bundle 的纯升级不当成设计修改；恢复设计时保留当前编辑器 runtime，不能撤回成旧 bundle。只对明确的派生差异做归一化，不用激进空白折叠破坏 pre/inline 语义。

### 4.2 一个文档聚合基线，按 scope 接受

建议最小状态：version、generation（每次元数据变动更新）、expectedRevision、baselineHTML；pending scope/页列表可由 baseline 与当前 HTML 派生或缓存并校验。允许实现调整内部形状，但语义必须等价并记录。

- 第一次有效 AI commit：baseline 为最新交接后的 before；after 是当前 HTML。
- 追加 AI commit：继续对既有 baseline diff，不覆盖最初未接受 before。
- Accept 某页：只把该页的当前状态应用到参考 baseline（当前已删除则从 baseline 删除），从而保留其他 pending 的 before。基线不是设计真值，不写回设计。
- Undo 某页：把 baseline 中该页状态应用到当前 HTML，其他页完全保持当前 after；撤回新增删除该页，撤回删除按 before 邻接顺序恢复。
- 接受部分页面后再发生共享 CSS/脚本 AI 修改：聚合 before 必须已经包含此前接受的页，整份文档 Undo 不得撤回已接受成果。
- 人工 save：比较本次保存前后实际语义变化，将受人工影响的 scope 在参考 baseline 中更新为最新人工结果；全局人工变化接受文档级。派生序列化变化不接受。
- baseline 与当前不存在有效差异则清空 pending；只升级 editor、no-op、cancel/过期未提交均无新审阅。

页恢复必须维持 DOM ID/引用、原页标识和合理邻接顺序；stage 的 page/element sequence 不能回退，保留当前与恢复内容所需最大值，避免后续新建复用旧标识。

### 4.3 持久化与故障一致性

在忽略的 `.html-design/reviews/<canonical-path-hash>/` 保存私有 metadata/baseline（建议 mode 0600），独立于10份历史轮转。未接受数据在服务重启、浏览器刷新后仍在；明确接受后可清理无用基线。存储错误不能静默降为无审阅。

沿用每路径 exclusive 队列，HTML 写入仍走当前 revision/backup/temp/rename。新增 review/HTML 双文件事务须可恢复：

1. 写入并落盘 prepared journal，记录 fromRevision、toRevision 与 next review state；不提前把待展示 after 当成已提交。
2. 执行 HTML 原子替换；若替换失败且文件仍为 fromRevision，恢复旧 review state。
3. 原子 finalize sidecar。
4. 重启/下一次读取发现 prepared：文件等于 toRevision 则完成 next state；等于 fromRevision 则回退 prepared；两者都不同视为外部变更冲突，保留基线并禁止盲目 Undo，明确报告。

Accept 仅元数据原子更新，不改变文档 revision；generation 防止旧 UI 在相同 HTML revision 下操作已被处理/新加入的审阅。失去 lease、AI 正在写、pending handoff、旧 revision/generation 均拒绝恢复或接受。

AI commit 的丢响应重试须幂等；journal finalize 错误不能导致第二份 review 或覆盖新版本。故障注入测试应验证 HTML rename 前后、sidecar finalize 前后的重启行为。保留原安全路径限制，不让 sidecar 通过静态服务读取。

### 4.4 服务与浏览器边界

open/sync 可增轻量 review 摘要与 generation；不要每2秒发送完整 baseline。独立 review/read（按需 before）、review/accept、review/undo 动作通过现有文档 API 路由；名字可按实现简化，必须统一读写验证与错误语义。

accept/undo 提交 `{revision, generation, scope}`，服务端自行解析和恢复，不能让浏览器任意传一整份所谓旧 HTML 绕过范围约束。浏览器先 flush 当前待保存内容，再取新摘要/generation；中途有变化则刷新/重试读取，不盲重试写入。

前端独立 `src/review.js` 管 UI/preview；`persistence.js` 管传输、flush 和权限；`editor.js` 只提供结束当前编辑、当前页/导航、history boundary 等已有能力。保留最近已合入的紧凑黑白灰 UI，不重复构建大侧栏或 AI 聊天。

before 用独立 sandbox iframe，禁止 script/inline handler、forms、嵌套 frame/object、刷新导航与交互；父层 pointer-events/焦点控制确保只读。可复用缩略图的静态 shell/样式/ancestor chain 思路，必要时提取小 helper。资源基址必须指向原文档；before 内容不能进入正式 stage、自动保存、export 或普通 history。

## 5. 实施顺序与受影响面

1. 新增服务端 HTML 分析/局部恢复与 review 持久存储模块，纯逻辑及故障用例先行。
2. 接入 documents 的 AI grant/begin/commit、普通 save、open/sync 与 review 动作，完成 lease/CAS/事务回归；server 路由继续复用。
3. 接入 persistence 的摘要/读取/确认/恢复，再做独立 review UI 与只读 before，适配 compact UI、权限和 history boundary。
4. 更新 build/editor bundle（仅产物），补独立试用稿和协作/README/feature wiki；旧人工稿不升级。新增样例可安全从零生成，不重建已有稿。
5. 主验证与源码自查，冻结 feature tip，交 root 安排恰好一次独立只读审查；Developer 修复接纳 Findings 并定向复验，不例行二审。
6. root 负责按验收清单建立干净本地模拟集成候选、检查视觉/行为与证据，提供用户入口。用户未确认前不推进下一 Issue。

预期涉及：`documents.mjs`、新增 review 存储/HTML helper、`src/persistence.js`、新 `src/review.js`、`src/editor.js`、`src/ui.js`/`editor.css` 的小入口、相应 Node/浏览器测试、依赖锁、README/协作说明/Wiki、build产物。不改内容生产的 HTML/CSS 格式或全编辑器布局。

## 6. 通过标准与交付包

测试矩阵见同目录 test-cases。所有承诺必须有实际证据；失败/不支持/未测写清，不能用运行几条 happy-path 代替恢复可靠性。

- build 后定向 review/documents/UI/export 回归；完整相同断言用 `node --test --test-concurrency=2 html-design/*.test.mjs`（沿用已记录的高并发时序边界）。
- wiki:check、wiki:graph、project:check、git diff --check；构建产物无漂移。
- 记录 feature base/tip、实际测试命令/数量/结果、审查范围与 Findings disposition、dirty人工稿保持事实、候选目录/commit/tree、独立 URL 和可复验人工步骤。
- 纯实现本地提交可冻结身份；未经本轮独立用户验收不更新主目录、不合 main、不远端交付。

## 7. Planner 的范围判定

本方案解决 #5 原有 DoR 缺口：服务持久基线、人工编辑隐式接受、全局资源文档级、普通历史刷新边界、离线不携带 review、可靠事务恢复均已给出默认值。Developer 可在这些约束内选择小实现细节；如发现需要舍弃页级撤回、牺牲人工编辑、执行 before 脚本、取消持久审阅或扩大到多人协作，必须回报 Planner 再沟通，不得自行缩减验收。

## 8. 独立审查后的 Planner 修复指令（原范围内）

唯一独立审查已完成，范围657369dd..2e0a927，共3项P2，Planner全部接纳，直接由Developer修复；不安排例行二次独立审查。

- 页面内部的 style/stylesheet link 仍可能全局生效，相关变化必须归为文档级；不能因为位于page内部就当作局部样式。普通style属性仍可按页。
- stage内页面之间空白可能受white-space、inline布局等CSS影响。没有渲染证据时不得统一丢弃；保守归为文档级优于漏报。保持页面增删范围的已有约定，不激进归一化其他文本。
- 审阅写请求进行中必须禁止新的人工编辑/手势，并结束已有输入；不能只禁用审阅按钮。服务器已执行Undo但响应延迟时，用户不能新建未保存内容后又遭强制reload。刷新前再检查dirty、未应用源码/忙碌状态，发现新改动则保留副本、明确冲突；不能先release token再触发可取消导航并永久卡在refreshing。

Developer只修复上述已复现问题及直接回归，保留原保护断言；主验证与针对Findings的定向复验后冻结新tip。Planner在干净候选上验收以上行为并记录最终身份，用户接受前不进下一项。

## 9. 用户确认的 Flato UI 修订（2026-10-28，优先于第3节旧UI描述）

用户在看过源码调查后明确「好的，开始」。此为本修订的实施授权；不是对旧候选5502560的验收或远端交付授权。Planner `/root` 负责本计划及测试用例，原Developer负责实现。修订起点为5502560，WIP仍仅#5，原服务8881和正在试用的HTML不得重建/覆盖。

### 9.1 已核对参考与用户差异

Flato HEAD 2e650309：AIPageReviewPanel.jsx 为页底absolute/bottom12/水平居中、30px按钮、8px圆角；挂在缩放外的页面容器内，控件不缩放。左按钮mouseenter/focus切before，mouseleave/blur切after，click才Undo；右按钮hover/focus返回after，click Accept。SimpleSlideEditor用before只读投影，canonical after不变。AIPageChangesSummary默认收起，右下fixed/bottom120/right16，数量+箭头、Accept All，展开312px逐项列表，可定位/撤回/接受，删除项可恢复。

用户明确要求使用「放弃｜接受」文案、多页时出现汇总、控件始终可见；覆盖Flato源码现有「撤销」文案、单项也出现汇总和缺少视口夹紧的行为。保留现有黑白灰主题，用等价紧凑形态实现，不引入React/MUI/Zustand。

### 9.2 必须交付的交互

1. 移除旧顶部「AI 修改」作为正常主入口和独立大预览/返回模式。当前页有pending时，自动在该页下边缘附近显示「放弃｜接受」分段操作条。它是两个动作，不是持久设置的toggle。普通新增页也可放弃/接受，但没有虚假的before。
2. updated页：hover或键盘focus「放弃」即在原画布位置显示只读before；mouseleave/blur/转到接受/Escape/切页/播放/新generation/权限交接时退出。移到接受立即回after。点击放弃才调用已有Undo，点击接受调用已有Accept。触摸设备不依赖hover，动作可直接点击；不新增需要用户先进入的比较模式。
3. before复用既有sanitize/CSP/sandbox隔离。在editor Shadow DOM的独立视觉层对齐页面原屏幕原点、相同zoom/pan，不插入真实stage、不替换设计DOM、不改自动保存/history/导出。before实际尺寸变化使用原尺寸，不拉伸成after尺寸；只在可用画布视口裁切。iframe不得截获操作条hover/焦点，切换不能改变锚点造成闪烁。
4. 异步按需读before，以revision/generation/scope为缓存边界；悬停期间可预取，离开/切页/新generation后拒绝陈旧结果。网络慢时仍可移到接受/点击操作；加载失败明确提示，不能把after标成before。预览不制造持久状态或隐式接受。
5. 操作条用页面实际getBoundingClientRect和viewport.bounds定位；正常靠近页底居中，超出时在可用画布范围内夹紧，保持完整按钮/焦点圈。随zoom、pan、resize、侧栏开合和当前页变化更新；控件尺寸固定屏幕像素，不随内容缩放。整页移出视口时仍为当前pending页保留夹紧操作条。与页脚、summary碰撞时让位，不遮住关键按钮。
6. pending页数>1，画布右下额外出现summary：默认收起，数量+箭头、Accept All。展开是小面板，列表可滚动且不越出可用视口；逐项定位/放弃/接受、当前项状态、增改删标识。处理到剩一个普通可见页时收起/移除summary，保留该页操作条。若唯一pending页不在当前页，保留可发现的页导航提示；不能为了隐藏summary让剩余修改不可达。
7. 删除页没有页面锚点：即使只剩一个，也保留右下小型恢复/接受入口作为明确例外；恢复后导航到恢复页。文档级pending显示「整份文档」范围/原因，用同样紧凑控件和右下说明入口，放弃明确影响全部未接受修改；不得伪造逐页恢复。异常/外部冲突也保留可达说明。正常单页无需整块列表。
8. summary在页面右下可见区域、页脚之上；窄窗口可限宽和向上展开。轻量阴影/圆角/紧凑密度对齐Flato，长页名省略并可读完整名称。所有控件可键盘访问，展开有aria-expanded，Escape收起/结束preview；禁用态与只读权限明确。

### 9.3 实现面与交付边界

主要改src/review.js、editor.css、ui.js与editor/viewport少量状态/几何通知；尽量复用现有persistence API和全部服务保护。不改review存储schema或另造after模型。若实现必须变更安全协议，先回Planner说明，不能自行弱化。

Developer先读impeccable的craft-floor（本会话已读SKILL和shape；context已跑过，不重跑），按用户明确参考执行，不发起无关审美选择。一次合并桌面/窄屏视觉检查，集中修复后至多一次视觉确认；完成时运行一次UI detector。同步DESIGN、README/collaboration和wiki，删除失效旧UI描述。

新增用户反馈形成未被原审查覆盖的交互边界（原位sandbox预览、异步hover生命周期、几何定位）。主验证冻结后，只请原Reviewer对5502560之后的本次UI增量做一次定向只读检查，Findings直接回Developer；不重审已审查的服务实现，不启动常规第二轮全量审查。修复后Developer定向验证，Planner最终候选验收。

测试I01-I10见测试计划；全量回归保留原断言的产品语义，只把旧顶部/弹窗操作步骤更新为新UI，不能删除保护用例。新建独立候选/新文件提供试用；不更新旧8881稿，不启动#6，不合main或远端交付。

### 9.4 唯一UI增量审查后的viewport修复（Planner，2026-10-29）

定向审查5502560..ac8b544已完成，独立7/7；唯一P2直接交Developer，Planner接纳：iframe扩大至页面1600px导致实际窗口1280px下的10vw/媒体查询渲染错误。修复应始终以父文档实际innerWidth/innerHeight作为iframe viewport，页面可大于viewport；缩放/目标偏移在隔离文档内依照现有fixed stage契约执行，外层仅裁切画布可见范围。不得通过扩大iframe或拉伸页面改变vw/vh/media语义。保留原始before尺寸、兄弟/继承CSS、sandbox、权限及异步取消保护；窗口变化后重新计算，避免沿用过期的viewport/测量。

Developer在本计划提交后修复，执行I11及相关I01-I08和完整回归，冻结最终tip；Planner独立复现viewport案例并重跑候选验收。不安排常规二审，不扩大其他功能。

## 10. 用户验收反馈：审阅一键执行，后台交接（2026-10-29）

用户明确反馈「逻辑上需要编辑权限正确，但交互应该直接可以执行」。本节覆盖第3节/第9节及I07中要求viewer先点编辑的UI约定；服务写权限、CAS和人工修改保护不变。此反馈授权实施，不是验收df708112或授权远端交付。Planner负责编写本节和K用例，原Developer负责实现，WIP仍仅#5，基线df708112。

### 10.1 产品行为与安全边界

- 「放弃」「接受」「全部接受」及逐项操作无需先点「编辑」；连接正常、没有明确冲突/AI锁/他人交接时，viewer也可点击，按钮不因缺少当前写租约而灰掉。单击本身就是对该审阅动作的授权。
- 点击后由persistence复用既有takeover→owner flush/yield→sync/grant流程，在后台取得当前写租约后继续原动作。等待期间显示「正在同步并处理…」等普通反馈、禁用重复点击，**不进入普通编辑模式、不要求用户再点一次**。干净owner的正常交接同revision/generation时，单击必须落到完成。
- 服务端review/accept、review/undo继续只接受当前owner、有效lease和精确revision/generation；不能以UI方便为由取消权限检查、替viewer直接任意写入、强夺未保存内容或另造写通道。
- 点击先结束当前输入/手势；若本窗口有未保存内容按原flush规则处理，源码未应用仍保护。别的owner有输入，先由其现有交接流程保存并yield。如果最新revision/generation/目标与用户点击时不一致，停止旧动作并同步可见审阅（目标可能已被人工编辑隐式接受），明确反馈；不把旧意图无条件重放到新审阅，也不通过自动重试回退人工成果。
- 本窗口的自动交接与review写是一项串行操作；busy期间锁普通编辑/新autosave，保留请求前的合法flush。自己的等待poll不能被reviewing短路造成死锁，也不能让普通heartbeat误reload/抢先写入；陈旧heartbeat不能清除意图或引发重复takeover。
- 保留点击时scope/generation/revision；页切换/失效目标、新AI提交、网络失败、lease丢失、交接超时后不得迟到执行。后台等待必须有界（与现有30秒交接/请求timeout相协调），停止后可重试；不能清理意图时先release有效token导致连接失效。优先复用原协议，不为此新增永久角色或复杂队列；确需新协议先报Planner。
- hover/focus查看before仍是只读，不因悬停获取权限。只有点击/Enter/Space激活才请求交接。Accept仍不改HTML，Undo仍形成普通history边界；取得租约不等于进入editing。旧只读提示改为说明可直接处理/后台同步，不再要求先编辑。

### 10.2 实现、审查与交付

主要修改src/persistence.js的审阅准入/自动交接，以及review.js控件可用性和反馈；尽量沿用takeover/sync，editor只提供既有输入结束与刷新边界。服务原安全用例保留。更新旧viewer浏览器断言为「显式激活后安全交接」，不能删除直接viewer API拒写、AI锁/旧版本/草稿保护断言。同步collaboration、README、DESIGN与wiki契约。

这是用户新要求带来的权限交接新边界，原审查证据不能覆盖。主验证冻结后请原Reviewer仅对df708112之后的一键交接增量做一次定向只读检查，直接回Developer；不重审原服务/Flato视觉，不做例行二审。Developer修复后Planner在干净候选以真实两窗口验收K01-K10，提供独立新稿入口（不覆盖8881/8882）。用户确认前不启动#6，不push/PR/main合并/部署。

## 11. 同轮追加：变更类型小标签与页码（2026-10-29）

用户补充截图指出「修改」应是小label、不能混在操作按钮中，并要求显示页码以关联页面。合并在第10节同一WIP/候选，由Planner定范围，原Developer实现，不另开队列。

- 每行分成左侧页面信息与右侧动作。左侧标题显示「第 N 页 · 页面名称」，下方或紧邻左侧标题显示紧凑非交互状态label（修改/新增/删除），有轻量底色/间距，与右侧「放弃/接受」明确分组；label不是button、不进Tab序列、无按钮hover样式、不触发定位或审阅写入。标题仍可定位当前存在页。
- N是当前after页面的真实1-based顺序，不能把data-artboard内部ID数字当页码。删除项没有当前页码，明确显示「原第 N 页 · 页面名称」，N来自聚合baseline中的页顺序；不伪装成当前页，恢复后跟随当前页面导航。document范围显示「整份文档」，不编造页码。
- 允许在既有reviewDiff/轻量summary里增加只读派生current/original页序字段，以取得删除页原位置；优先利用已解析的before/after.ids，不另造页面模型、不保存重复page数据，不改HTML、baseline schema、写权限、revision/generation语义。此只读元数据补充在Planner授权范围内，无需再次申请协议变更许可。
- 长名称省略但完整title可读，页码不可被省略到不可识别；390px窄窗口仍将信息/标签与动作分开、按钮完整可见。无无关视觉重构。同步必要契约/说明。

与第10节一并主验证/冻结。原Reviewer同一次df708112之后增量检查顺带看页序来源/标签语义，不新增一轮审查。Planner用L01-L04及两窗口K用例一起验收。

## 12. 同轮追加：页面管理不依赖编辑模式（2026-10-29）

用户进一步明确页面操作也应直接执行、后台交接，「只在AI操作阶段锁定」。这是用户授权的本轮范围扩展，和第10节共用安全交接根因/实现边界，仍由#5统一执行，WIP=1；其他迁移功能不启动。

- 页面新增、复制、重命名、上移/下移、删除、缩略图拖动排序在正常预览态即可操作，不需要点Edit，不自动进入editing；菜单/侧栏新增/空画布新增/页脚标题/缩略图双击与键盘入口行为一致。移除「进入编辑后可管理页面」提示及preview隐藏新增按钮的规则。首末位置、无目标等固有无效动作仍按实际状态禁用。
- 普通viewer/其他窗口owner不是入口灰掉的理由；复用第10节同一个后台安全租约交接原语，然后才执行页面事务和保存。AI pending/AI持锁阶段禁用页面写操作；本窗口正在执行操作时可短暂busy防重复。网络/旧版本/未应用源码等真实冲突仍保留内容并反馈，不能强行写或取消服务CAS。
- 事件入口到pages.js的writable、editor.syncBar/UI点击mutations守卫和CSS都需一致调整，不能只解禁菜单但底层仍静默return。普通元素编辑/源码应用仍保留原显式编辑模式，不因页面管理解禁而一并放开。
- 页面操作捕获稳定targetId/插入位置ID和触发revision，交接完成后校验/重新解析目标；若另一窗口改了页面/顺序/revision，停止旧操作并同步，不能操作过时DOM节点或把命令误套到当前另一页。人工最新内容必须先由原owner保存/yield。
- 拖动期间仅显示临时排序指示，不在取得租约前改canonical DOM；完成手势后再后台交接并提交最终drop意图。取消/未过阈值/仅选择不接管、不写，避免结束手势时prepare/pause重入up造成双重提交。AI锁在手势途中生效时取消/拒绝该提交并清理指示。
- 重命名输入/确认/取消不丢用户输入；等待或窗口交接时不能盲reload丢失未确认名称，提交时校验租约/版本/目标。新增/复制/移动/删除继续走既有transaction/push、自动保存、稳定ID/引用和单调序号，不能为preview绕过history。离线页面管理可用，沿用原离线下载保存语义。
- 页面管理busy与审阅busy互斥，自己的合法flush/yield/poll不被堵塞；页面管理的人工保存仍按既有规则隐式接受相应AI范围。保留原AI begin等待人工操作完成、下载/导出只取canonical设计的边界。

Developer在本计划提交后实现pages/editor/persistence/UI的最小接缝，复用一套后台写权限获取，不能复制第二套交接状态机或另造远程写入口。K/L/M主验证合并冻结后，原Reviewer同一次df708112之后新增增量检查覆盖页面管理/共享租约/拖动重命名边界；不另开全量审查。Planner以真实双窗口和preview页面管理验收，提供新独立入口，原8881/8882不覆盖，用户确认前无远端交付或下一功能。

### 执行者接替记录（2026-10-29）

原Developer `/root/undo_accept_developer` 因服务容量错误连续两次无法恢复，已停止并interrupt。Dev-Manager/root准入 `/root/direct_review_developer` 接替同一branch/worktree及未提交实现，仅一个Developer可写，WIP仍1。既有K/L/M通过证据保留；接替者先只读核验进度再完成文档、定向/全量验证和冻结，不重做已完成实现。需求/计划/验收仍由root负责，原Reviewer安排不变；这不是范围或远端交付授权变更。
