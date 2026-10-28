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
