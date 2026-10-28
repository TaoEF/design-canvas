import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import PptxGenJS from 'pptxgenjs';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { collectEditableSlide, addEditableSlide } from './pptx.mjs';

export function browserOptions() {
  const executablePath = process.env.HTML_DESIGN_CHROME;
  if (executablePath) return { executablePath, headless: true };
  if (process.platform === 'darwin' && existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')) {
    return { channel: 'chrome', headless: true };
  }
  return { headless: true };
}

const RESET = `
html,body{margin:0!important;padding:0!important;min-width:0!important;min-height:0!important;overflow:visible!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
body>*:not([data-stage]){display:none!important}
[data-stage]{display:block!important;position:static!important;transform:none!important;translate:none!important;zoom:1!important;margin:0!important;padding:0!important;min-width:0!important;min-height:0!important;width:auto!important;height:auto!important;gap:0!important}
[data-artboard]{margin:0!important;box-shadow:none!important;break-inside:avoid!important}
[data-editor-ui]{display:none!important}
*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}
`;

// Render the submitted DOM snapshot, never reread the potentially older HTML file.
export async function exportDocument({ html, baseUrl, title = 'design', format }, options = {}) {
  if (!['pdf', 'pptx'].includes(format)) throw new Error('不支持的导出格式');
  if (typeof html !== 'string' || !html.trim()) throw new Error('没有可导出的页面内容');
  const browser = await chromium.launch(browserOptions());
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2,
      acceptDownloads: false,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    const renderUrl = new URL(`__html-design/render/${randomUUID()}`, baseUrl).href;
    const base = new URL(baseUrl);
    if (!['http:', 'https:'].includes(base.protocol)) throw new Error('请通过本地预览打开后导出');
    const head = `<base href="${base.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">`;
    // CSP blocks document scripts while permitting the renderer's own browser operations.
    const documentHtml = /<head\b[^>]*>/i.test(html)
      ? html.replace(/<head\b[^>]*>/i, match => match + head)
      : head + html;
    await page.route(renderUrl, route => route.fulfill({
      contentType: 'text/html; charset=utf-8', body: documentHtml,
      headers: { 'Content-Security-Policy': "script-src 'none'; object-src 'none'; frame-src 'none'" },
    }));
    await page.goto(renderUrl, { waitUntil: 'load', timeout: 45_000 });
    await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
    await page.addStyleTag({ content: RESET });
    const sizes = await page.evaluate(async () => {
      document.querySelectorAll('[data-artboard] img').forEach(image => { image.loading = 'eager'; });
      await document.fonts.ready;
      const boards = [...document.querySelectorAll('[data-artboard]')];
      if (!boards.length) throw new Error('没有找到可导出的画板');
      if (boards.length > 100) throw new Error('一次最多导出 100 页');
      for (const image of document.querySelectorAll('[data-artboard] img')) {
        if (!image.complete) await new Promise((resolve, reject) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', () => reject(new Error('图片加载失败，请替换图片后重试')), { once: true });
        });
        if (!image.naturalWidth) throw new Error('图片加载失败，请替换图片后重试');
        await image.decode();
      }
      return boards.map(board => {
        const display = getComputedStyle(board).display;
        board.style.setProperty('display', display === 'none' ? 'block' : display, 'important');
        board.style.setProperty('visibility', 'visible', 'important');
        const w = board.offsetWidth, h = board.offsetHeight;
        if (!w || !h || w > 4096 || h > 4096) throw new Error('画板尺寸应在 1–4096 像素之间');
        return { width: w, height: h, display: getComputedStyle(board).display, title: board.dataset.title || board.dataset.artboard };
      });
    });
    const slides = page.locator('[data-artboard]');
    const select = async index => {
      await page.evaluate(({ index, sizes }) => {
        [...document.querySelectorAll('[data-artboard]')].forEach((board, i) => {
          board.style.setProperty('display', i === index ? sizes[i].display : 'none', 'important');
        });
        document.querySelector('[data-stage]').style.setProperty('width', `${sizes[index].width}px`, 'important');
      }, { index, sizes });
      await page.setViewportSize({ width: sizes[index].width, height: sizes[index].height });
    };
    if (format === 'pdf') {
      const merged = await PDFDocument.create();
      merged.setTitle(title);
      merged.setCreator('HTML Design');
      for (let i = 0; i < sizes.length; i++) {
        await select(i);
        await page.addStyleTag({ content: `@page{size:${sizes[i].width}px ${sizes[i].height}px;margin:0}` });
        // Use screen CSS for the content; override the print page dimensions for each board.
        const bytes = await page.pdf({
          width: `${sizes[i].width}px`, height: `${sizes[i].height}px`,
          printBackground: true, preferCSSPageSize: false,
          displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 },
          pageRanges: '1',
        });
        const source = await PDFDocument.load(bytes);
        const [first] = await merged.copyPages(source, [0]);
        merged.addPage(first);
      }
      return { bytes: Buffer.from(await merged.save()), pages: sizes.length };
    }
    const first = sizes[0];
    if (sizes.some(s => Math.abs(s.width / s.height - first.width / first.height) > .001)) {
      throw new Error('PPTX 的所有页面需要相同比例，请统一画板比例后重试');
    }
    const pptx = new PptxGenJS();
    const width = first.width / 96, height = first.height / 96;
    pptx.defineLayout({ name: 'HTML_DESIGN', width, height });
    pptx.layout = 'HTML_DESIGN';
    pptx.title = title;
    pptx.subject = 'HTML 画板导出（可编辑文字与图片）';
    pptx.author = 'HTML Design';
    for (let i = 0; i < sizes.length; i++) {
      await select(i);
      const slide = pptx.addSlide();
      const data = await slides.nth(i).evaluate(collectEditableSlide);
      await addEditableSlide({ pptx, slide, data, page, board: slides.nth(i), context, scale: first.width / sizes[i].width });
      if (options.onSlideImage) await options.onSlideImage(i, await slides.nth(i).screenshot({ type: 'png', scale: 'device', animations: 'disabled' }));
    }
    return { bytes: await pptx.write({ outputType: 'nodebuffer', compression: true }), pages: sizes.length };
  } finally {
    await browser.close();
  }
}
