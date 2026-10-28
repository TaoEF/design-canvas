# 初始化验证记录（2026-10-28）

## 范围与授权

用户明确请求 `ai-wiki`、`github` 初始化。当前协调代理仅负责本次初始化，不承担常驻管理。未启用 MCM、review-loopback 或定时任务。此记录不是正式产品发布验收。

## 本地

- 初始化前项目没有 Git 仓库；已建立本地 main 与 origin。
- 第一次 `npm test`：26/26 通过。
- `npm run project:check`：通过。
- `npm run wiki:check`：通过。
- `npm run wiki:graph`：7 实体，109 关系，无断链/重复 ID 告警。
- `npm run build`：通过；没有运行演示稿生成器。
- 并行开发新增 selection 源码/测试后复测：31 项，28 通过、3 失败。
  - documents.test.mjs：浏览器自动保存与交接测试等待“已保存”超时。
  - selection.test.mjs：modifier 点击/方向快捷键扩展选择，预期 2 个但得到 0。
  - selection.test.mjs：框选测试，预期 2 个但得到 0。
- 第二次测试期间工作区仍在变化，不是稳定提交的验收记录；原产品开发任务需要在完成后针对固定版本重新验证。
- 初始化配置的独立只读审查：initialization_review 完成，No findings（无可操作 P1/P2）。独立复核 project:check、wiki:check、seed 图谱均通过。审查限初始化配置，不构成产品版本验收。

## GitHub

- 仓库：https://github.com/TaoEF/design-canvas （private）。
- 唯一台账：https://github.com/users/TaoEF/projects/4 ，已关联仓库。
- 按 release-status-profile.json 配置 7 个有序 Status；Intake 在待处理。
- 创建 28 个管理标签；GitHub 默认标签保留，无重复语义的旧 status 标签。
- 新增 Risk、Task size、Priority、Queue order、Target release 字段。
- 初始化 Issue：https://github.com/TaoEF/design-canvas/issues/1 。
- 默认入板由 Repo-Issue-Manager 显式操作，未配置 PAT 或自动入板任务。
- 远端 CI 最终结果见初始化 Issue #1 / GitHub Actions；本文件记录推送前的固定本地验证。
- 用户已确认私有仓库，并要求等待编辑器工作完成后推送。原编辑器任务现已报告完成，34 项测试通过。
- 尚无 staging / production 部署、版本标签或 GitHub Release。

## 后续步骤

冻结首次提交，在独立干净副本复核测试、推送并读取 CI。实际产品变更以后走 Issue 分支与本地优先验收。

## 用户确认后的继续执行

用户确认 `TaoEF/design-canvas` 为私有，并明确要求等待既有编辑器工作完成后推送。
同目录原编辑器任务已 completed / idle，最终交付说明：相交即选的框选、统一「编辑」入口完成；34 项测试通过；demo 已更新并保留手动修改。
此前 31 项中的 3 个失败属于开发过程记录，不能用作最终固定版本结论。
首次导入是用户明确授权的仓库引导，不对既有产品代码做额外实现，也不代替测试服或正式服发布验收。

## 固定本地基线验收

- 本地首次导入 commit：`a9e7cae0ebe243d8de6af2093497db2ce9c81131`。
- 本地 tree：`694cdd054a732196a6cce8eb93a99141bd984127`。
- 无既有集成 base：仓库为空，本次是用户明确授权的首次导入，无历史 merge 可模拟。
- 使用独立 detached Git worktree，安装锁定依赖（npm ci），构建并运行测试。
- 结果：34/34 测试通过；构建后 git status 为空，bundle 与源码一致。
- project:check、wiki:check、wiki:graph 通过；7 实体、112 关系，无断链或重复 ID 告警。
- 覆盖编辑交接、自动保存恢复、框选多选、几何吸附、页面管理、PDF/PPTX 导出。
- 初始化配置已完成唯一一次独立只读审查，No findings；并行产品实现由原任务负责。
- 本次只冻结和导入既有产品，不追加功能实现；本地恢复副本、运行会话及依赖未纳入版本控制。
- 用户 2026-10-28 的等待条件已满足；授权范围为私有仓库首次导入，非应用部署。
- 后续仅更新初始化验证文档，产品目录、依赖、CI 与检查脚本必须与上述已测候选保持相同。
- 无应用部署或新增线上行为，本次初始化豁免 24–48 小时运行效果跟踪。
- 七阶段交付中，导入 main 后只能证明已集成、待测试环境发布；不得推断已部署或已正式验收。
