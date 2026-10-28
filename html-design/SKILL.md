---
name: html-design
description: 生成和局部修改可以可视化编辑的 HTML 设计稿（幻灯片、海报、落地页草图等多页画板），文件内嵌编辑器，人可以在浏览器里拖动、改字、切换排版/画板模式并保存。用户要求做这类设计，或要求修改这类 HTML 文件时使用。
---

# HTML Design

产出是**单个自包含的 HTML 文件**：内容 + 样式 + 内嵌编辑器。人在浏览器中打开即可编辑、拖动、改字、管理页面和播放演示，并保存回 HTML。AI 和人改的是同一份文件，所以必须遵守下面的结构约定，否则编辑器和后续的局部修改都会出错。

## 1. 文件骨架（必须）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>标题</title>

<!-- 设计变量：颜色、字体、圆角、间距。全局改风格只改这里 -->
<style data-design>
:root{
  --primary:#2f6bff; --text:#1a1a1a; --muted:#6b7280; --bg:#ffffff;
  --font:"Inter","PingFang SC",system-ui,sans-serif;
  --radius:12px; --gap:24px;
}
</style>

<!-- 组件与排版样式 -->
<style>
body{margin:0;background:#e9e9ec;font-family:var(--font);color:var(--text)}
[data-stage]{display:flex;flex-direction:column;align-items:center;gap:40px;padding:40px 0}
[data-artboard]{position:relative;width:1280px;height:720px;overflow:hidden;
  background:var(--bg);box-sizing:border-box;padding:64px}
/* …组件 class… */
</style>
</head>
<body>
<main data-stage>
  <section data-artboard="p1" data-title="封面" data-mode="flow" class="page cover">
    <h1 data-el="p1-title" class="title">主标题</h1>
    <p data-el="p1-subtitle" class="subtitle">副标题</p>
  </section>
  <section data-artboard="p2" data-title="目录" data-mode="flow" class="page">
    …
  </section>
</main>

<!-- 编辑器：把 editor.js 原文完整放进来，一个字都不要改 -->
<script data-editor>/* editor.js 原文 */</script>
</body>
</html>
```

## 2. 页面（画板）

- 每一页是 `<main data-stage>` 下的一个 `<section data-artboard="pN" data-title="…">`。
- `data-artboard` 在整个文件里唯一，按 `p1, p2, p3…` 编号。新增页面编号取现有最大编号与舞台 `data-page-seq` 的较大值 +1，并更新 `data-page-seq`；**不要复用删除过的编号**，不要因为插入或排序去给已有页面重新编号。
- `data-title` 写简短的页面名，会显示在左侧缩略图下面。
- 新页面一律写 `data-mode="flow"`（排版模式）。**不要自己生成 `data-mode="artboard"`**：画板模式只能由人在编辑器里切换，这样才会留下可以还原排版的快照。
- 页面尺寸写在 CSS 里（默认 1280×720）。同一个文件里的页面尺寸尽量一致。
- 所有页面都保留在舞台中，显隐交给编辑器管理。**编辑画布仅提供单页居中预览**；连续展示仅用于「滚动播放」；不要自行隐藏其他页面，翻页说明见第 6 节。

## 3. 元素（data-el）

- 人可能想移动、改字、替换的每个可见块都要加 `data-el`，包括标题、段落、按钮、图片、卡片、图标、装饰图形。
- 命名格式是 `页id-语义`，例如 `p1-title`、`p3-card2`、`p3-card2-icon`。**整个文件内唯一**，已有的 id 永远不要改。
- 可以嵌套：卡片是 `data-el`，卡片里的标题、文字也是 `data-el`。只有不嵌套 `data-el` 的元素才能双击改字，所以文字要放在自己单独的 `data-el` 元素上。
- 纯布局用的包装层（只用来做 flex 或 grid）不需要加 `data-el`。
- 文字直接写在 HTML 里，不要用 JS 或 CSS `content` 生成。

## 4. 样式规则

- 颜色、字体、圆角等都引用 `data-design` 里的变量，不要到处写死。
- 用 class 写样式，同一个组件复用同一个 class。
- 排版优先用 flex 或 grid，让元素按排版自然排列，**不要自己写大量 `position:absolute`**。需要精确摆放时，由人切到画板模式处理。
- **不要使用 CSS 的 `translate` 属性**（编辑器用它来记录拖动），位移请用 `transform`。
- 不要给 `data-el` 元素的 `position / left / top / width / min-height / translate / margin` 加 `!important`，否则编辑器写的内联样式会失效。
- 可以用入场动画，但动画的结束状态必须是可见的（用 `animation-fill-mode: both` 或 `forwards`）。
- **不要让内容依赖 JS 才变得可见**，例如"滚动到了才加 `.visible`"这类效果。没触发前元素是透明的，缩略图也会是空白。
- 字体用 `<link rel="stylesheet">` 或 `@font-face` 引入，不要用 JS 加载。
- 图片用稳定的 URL 或 data URI，并给出宽高或比例，避免加载后布局跳动。
- 不要给 `[data-stage]` 写 `transform` 或 `margin-bottom`，编辑器的缩放功能要用它们。
- 编辑器顶部工具栏 52px、左侧页面栏 208px、底部状态栏 40px（窄屏会适配）。重要内容应相对画板布局，不要依赖窗口 `position:fixed`。舞台的居中、缩放和平移由编辑器的临时样式处理，页内留白应写在画板里。
- 不要写 `html-design-editor`、`html > *`、`html > :last-child` 这类会选中 `<html>` 直接子元素的选择器。
- 不要让页面自己隐藏非当前页（比如 `.slide{display:none} .slide.active{display:block}`）。编辑器默认只显示当前页，它会给当前页加上 `data-editor-current` 属性。如果确实需要自己的翻页逻辑，就监听 `editor:goto` 事件。
- 文字放在 `data-el` 元素里，不要再嵌套 `data-el`。嵌套了 `data-el` 的元素不能直接改字。
- 图片用 `<img data-el>`，这样才能双击替换、拖动改大小。

## 5. 脚本规则

内容可以有交互（tab、手风琴、轮播、按钮等）。查看模式下这些交互正常运行；编辑模式下编辑器会拦截它们，内容脚本不需要做任何处理。

- 交互脚本写在单独的 `<script>` 里，放在 `<script data-editor>` 之前。
- **必须能重复运行。** 保存时存的是当前 DOM，重新打开后脚本会再跑一遍。不要在加载时生成元素；如果确实要生成，先检查元素是否已经存在。
- 不要在 window 的捕获阶段对 pointer/click/key 事件调用 `stopPropagation`。
- 不要在加载时删除或重建 `[data-artboard]` 或 `[data-el]` 元素。
- 以下名字是保留的，不能使用：`window.__htmlDesignEditor`、`<html-design-editor>` 元素、以 `data-editor` 开头的属性（包括 `data-editor-on`、`data-editor-nav`、`data-editor-single`、`data-editor-current`）、`data-editing`、`data-flow-style`、`data-thumb-*`、`editor:goto` 事件。

## 6. 单页编辑与播放

编辑器提供单页居中、左侧缩略图管理、页脚翻页，以及滚动播放和全屏播放，不需要内容脚本重复实现。所有页面保留在 DOM 中，不要用自己的 class 或 CSS 隐藏非当前页；打印和导出仍包含全部页面。

如果确实需要自己的翻页逻辑，监听 `editor:goto` 事件，通过 `e.detail.index`（从 0 开始）和 `e.detail.id`（画板编号）同步状态。不要自行写入编辑器维护的 `data-editor-current` 属性。

## 7. 编辑器维护的属性（只读，不要手动修改）

| 属性 | 位置 | 含义 |
|---|---|---|
| `data-editor-single` | `<html>` | 编辑器当前启用单页显示 |
| `data-editor-current` | 页面 | 编辑器标记的当前页 |
| `data-mode` | 页面 | `flow` 是排版模式，`artboard` 是画板模式 |
| `data-flow-style` | 画板模式下的页面和顶层元素 | 切换前的 `style` 快照，用于切回排版模式 |
| `data-bbox` | `data-el` | 保存时测得的 `x,y,w,h`（px，相对页面内边距框），供 AI 理解版面 |
| 内联 `translate` | `data-el` | 排版模式下人拖动的位移 |
| 内联 `left/top/width/min-height/height` | 可编辑元素 | 人调整的位置和尺寸，必须保留 |
| 内联 `font-size/line-height/letter-spacing/word-spacing` | 文字及内部子元素 | 角点缩放或格式工具产生的排版，必须保留 |
| 内联 `object-fit` | 图片 | `contain` 为 Fit，`cover` 为 Cover，必须保留 |
| `data-page-seq / data-element-seq` | 舞台 | 编辑器生成标识的递增计数；删除页面/元素后不回退 |

需要了解版面时，读 `data-bbox` 即可判断元素位置、是否重叠、是否超出页面。它只在保存时更新，可能和当前代码有出入。

## 8. 局部修改（用户让你改已有文件时）

**原则：只改需要改的地方，不重新生成整个文件。** 人在编辑器里做过的拖动、尺寸调整和改字都属于需要保留的设计状态，整个重写会把它们丢掉。

通过本地服务打开的 v6 及更新版本文件会自动回写原 HTML。**修改已有文件前，先读取 [协作流程](references/collaboration.md)，使用 `collaborate.mjs begin` 等待浏览器保存并交接，只修改返回的工作副本，再用 `commit` 提交。** 不要直接覆盖原路径，也不要运行首次生成脚本重建已有设计。版本冲突时保留工作副本，重新同步后局部修改。

离线或旧版文件没有自动回写。若浏览器中仍有编辑页，先同步当前 DOM 或最新下载 HTML；读取含 base64 图片的 DOM 时应分块提取并校验总长度，避免工具截断。升级编辑器时尤其不能以旧磁盘文件覆盖未保存的页面。

1. 先读文件，用 `data-artboard` 和 `data-el` 定位要改的页面和元素。
2. 用最小的文本替换来修改，替换锚点用含 `data-el="…"` 的那一行或那个元素。
3. 不同类型修改的处理方式：
   - **改文字**：只替换元素内部的文字，保留标签和全部属性，包括 `style`、`data-bbox`、`data-flow-style`。
   - **改样式**：优先改 class 或 `data-design` 变量；不要删除人留下的内联 `translate/left/top/width/height/font-size/line-height/object-fit`，除非用户要求"重新排版""复位"。
   - **画板模式的页面**（`data-mode="artboard"`）：新增的顶层元素也要写 `position:absolute;left;top;width`，放在空白位置。如果修改了某个元素的 class 或排版相关样式，同时删掉这个元素的 `data-flow-style`，免得以后切回排版时还原出旧样式。
   - **新增页面**：按第 2 节的递增编号规则分配新编号，在合适的位置插入 `data-mode="flow"` 的画板，`data-el` 用新页面前缀。
   - **复制页面**：分配新的 `data-artboard`，所有 `data-el` 都重新编号；重映射 DOM `id` 及 SVG/链接引用，删除旧 `data-bbox` 和临时属性。保留当前模式、位置、尺寸、字号、图片模式和有效的 `data-flow-style` 快照，维持原有外观。
   - **删除页面或元素**：整个删掉，其他元素的 id 不要变。
4. **不要局部修改 `<script data-editor>` 里的内容。** 编辑器源码在 `src/`，修改后运行 `npm run build` 生成 `editor.js`。升级 HTML 时在协作工作副本中把内嵌脚本整体替换成新版构建产物，保持页面内容不变。
5. 改完后简要说明改了哪些页面、哪些 `data-el`。

## 9. 生成后自检

- 文字密集或文本框尺寸不确定时，按需使用本地[文字测量](references/text-measurement.md)比较候选宽度、检查生成文件的文字溢出，再按内容和美学约束局部调整；测量不替代最终浏览器检查。

- [ ] 有 `<meta charset="utf-8">`、`<main data-stage>`，`<script data-editor>` 放在 body 最后
- [ ] 每页是 `section[data-artboard][data-title][data-mode="flow"]`，编号唯一
- [ ] 所有可见内容块都有 `data-el`，全文件唯一，文字放在没有嵌套 `data-el` 的元素上
- [ ] 内容 CSS 没有使用 `translate` 属性，没有给定位属性加 `!important`
- [ ] 内容自身不隐藏非当前页，页面显隐由编辑器管理；内容没有依赖 JS 才显示的效果
- [ ] 交互脚本可以重复运行，加载时不生成 `data-el` 元素
- [ ] 内容没有超出页面尺寸（文字不溢出、元素不越界）

## 10. 交付时附上的使用说明

生成或修改完文件后，用几句话提醒用户：

- 本地预览中停止操作约 0.8 秒后自动写回原 HTML，顶部显示「已保存」。点击保存状态可查看异常并重试/恢复；Ctrl/⌘ S 或「更多 → 立即保存」可立即保存。离线通过「导出 → 下载 HTML」保存；其他窗口只读，点「编辑」会交接权限并直接进入编辑状态。
- 画布是纯单页，默认居中并适应窗口。编辑时左侧缩略图可拖动排序，点「＋」新增，缩略图「⋯」可复制、重命名、删除或上下移动；页脚与缩略图换页；编辑或播放时也可用 PageUp/PageDown、← →。
- 默认是画布预览，保留 HTML 原有交互；有权限后点「编辑」进入，点「✓ 完成」回到画布预览。编辑时顶部「排版 / 画板」切换布局，画板只解析当前页，切回排版恢复该页快照。拖动移动元素，双击改字或换图。文字四个角会等比缩放字号与行距，边点只调框；图片支持 Fit（完整显示）和 Cover（裁切铺满）。顶部文字/图片图标可插入内容，也能拖入或粘贴图片。
- 拖动时翠绿色辅助线提示与页面、其他元素的边缘和中心对齐，并自动吸附；按住 Alt/Option 暂停吸附，Esc 取消本次拖动。蓝色选框和控制点表示当前选中的元素。
- 空白处拖动框选，与元素相交即选中；Shift 或 Ctrl/⌘＋点击增减选择，Shift＋框选追加；Ctrl/⌘＋Shift＋方向键按方向扩选。多选可一起拖动、方向键微调、复制、删除及调整图层；批量操作可一次撤销。Ctrl/⌘ A 保留浏览器和文字编辑原有行为。
- Ctrl/⌘ Z 撤销，Ctrl/⌘ Shift Z 重做；Ctrl/⌘ D 复制元素，Delete 删除。在缩略图上同样支持复制、删除，Alt + ↑/↓ 可调整顺序。
- 「播放」下拉提供「滚动播放」与「全屏播放」：滚动播放可上下浏览全部页面，全屏播放按单页展示；播放时方向键、PageUp/PageDown、空格翻页，Esc 返回画布预览并保留当前页。
- 「更多 → 源码」查看和修改 HTML；「导出」提供 HTML、PDF 和可编辑 PPTX。PDF/PPTX 需要项目本地服务（`npm install` 后 `npm start`），以当前页面状态导出全部画板。
- 页脚右侧缩放：Ctrl/⌘ + − 0 1，或 Ctrl/⌘ 加滚轮；编辑时按住空格拖动可平移，点「适应」回到居中。

## 已知限制

- 插入的图片会以 base64 写进 HTML，图片多的话文件会变大。
- 在“源码”里应用修改时，新加的 `<script>` 不会马上运行，要保存后重新打开。
- 文字格式用浏览器自带的 `execCommand` 实现，结果是带 style 的 `<span>`。不同浏览器生成的标签可能略有不同。
- PPTX 保留独立文字和图片，复杂 CSS 背景、滤镜与圆角效果可能简化；所有画板需要相同宽高比，其他电脑也需要安装所用字体。

