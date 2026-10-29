# 从文件导出 PDF / PPTX

在 [完整源码根目录](runtime.md) 安装依赖与浏览器后运行：

```sh
node html-design/export-cli.mjs pptx input.html --output result.pptx
node html-design/export-cli.mjs pdf input.html --output result.pdf
```

无需打开编辑器或启动常驻预览服务。复用同一导出引擎，保留现有可编辑文字、图片和语义容器原生组合；复杂 CSS 仍可能简化，成功摘要不等于完整保真检查。

## 保存快照与资源

命令只读取一次已保存的普通 HTML 文件（最多32 MiB，拒绝目录、设备和命名管道），不读取浏览器未保存 DOM，不写回 HTML、不自动接管活跃稿件。已有人工稿先保存或按 [协作流程](collaboration.md) 取得最新工作副本，不以旧磁盘稿冒充当前设计。

默认以输入文件目录为资源根，启动随机 `127.0.0.1` 端口的临时只读资源服务。输入和资源必须在根目录内；中文、空格路径可直接使用，终端参数有空格时加引号。相对 CSS、图片和字体沿 HTML/CSS 原路径解析。需要访问上级公共资源时，显式选择合适的根：

```sh
node html-design/export-cli.mjs pptx designs/proposal.html --root . --output proposal.pptx --title "产品方案"
```

临时服务只有 GET/HEAD，没有保存或交接 API；拒绝隐藏路径、node_modules、目录穿越和指向根外的符号链接。选择所需资源目录即可，不必把整个个人目录作为根。成功、失败或 SIGINT/SIGTERM 后都会关闭浏览器和临时服务。

协作工作副本可能位于另一个目录。若原资源已由本机服务提供，用原文件 URL 作为基址：

```sh
node html-design/export-cli.mjs pptx /absolute/work/document.html --base-url http://127.0.0.1:8878/designs/proposal.html --output proposal.pptx
```

`--base-url` 只接受 loopback IP 的 HTTP(S) URL（127.0.0.1 / 127网段或 [::1]），不接受远程站点、file: 或带凭据的 URL。该模式不启动临时服务，`--root` 不使用，也不会停止已有服务；原服务必须已经运行。此参数用于资源解析，不会替你执行 begin/commit/cancel。

## 参数与结果

`--output` 必填，扩展名须与 `pdf` / `pptx` 格式一致；输出父目录须已存在。不会覆盖输入或任何已有输出（包括符号链接），请选择新路径。导出失败不留下本次部分输出，也不删除他人文件。`--title` 可选，默认输入文件名；`--help` 无需浏览器即可查看用法。

成功退出码0，stdout只有一份 JSON（示意）：

```json
{"status":"ok","format":"pptx","input":"/absolute/input.html","revision":"sha256…","output":"/absolute/result.pptx","pages":2,"bytes":17865}
```

`input` / `output` 为规范化绝对路径；`revision` 为实际读取字节的64字符十六进制 SHA-256，`pages` 为导出页数，`bytes` 为产物字节数。它描述保存快照，不是审阅状态、完整逐元素报告或 Office 视觉验收。

错误 JSON 写 stderr，退出码非0；中断为 SIGINT=130、SIGTERM=143。不要仅凭目标文件名或旧产物存在判断此次成功，应读取退出码与 JSON。字体、外链资源与 PPTX 可编辑性边界仍以 [主技能](../SKILL.md) 和当前导出说明为准。
