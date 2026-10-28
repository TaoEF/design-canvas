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
- CI 仅已配置；在源码首次推送前没有实际运行证据。
- 用户已确认私有仓库，并要求等待编辑器工作完成后推送。原编辑器任务现已报告完成，34 项测试通过。
- 尚无 staging / production 部署、版本标签或 GitHub Release。

## 后续步骤

冻结首次提交，在独立干净副本复核测试、推送并读取 CI。实际产品变更以后走 Issue 分支与本地优先验收。

## 用户确认后的继续执行

用户确认 `TaoEF/design-canvas` 为私有，并明确要求等待既有编辑器工作完成后推送。
同目录原编辑器任务已 completed / idle，最终交付说明：相交即选的框选、统一「编辑」入口完成；34 项测试通过；demo 已更新并保留手动修改。
此前 31 项中的 3 个失败属于开发过程记录，不能用作最终固定版本结论。
首次导入是用户明确授权的仓库引导，不对既有产品代码做额外实现，也不代替测试服或正式服发布验收。
