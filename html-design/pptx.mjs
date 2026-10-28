// Browser geometry is the source of truth; text and images remain native PPTX objects.
export function collectEditableSlide(board) {
  const origin = board.getBoundingClientRect();
  const items = [], warnings = [];
  const cssColor = value => {
    const numbers = String(value).match(/[\d.]+/g)?.map(Number);
    if (!numbers || numbers.length < 3) return { color: '000000', transparency: 100 };
    return {
      color: numbers.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase(),
      transparency: Math.round((1 - (numbers[3] ?? 1)) * 100),
    };
  };
  const rect = el => {
    const r = el.getBoundingClientRect();
    return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
  };
  const font = (cs, text) => {
    const names = cs.fontFamily.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    const cjk = /[\u3400-\u9fff]/.test(text) && names.find(s => /PingFang|YaHei|Noto Sans CJK|Heiti|SimSun/i.test(s));
    return cjk || names[0] || 'Arial';
  };
  const styles = (cs, text) => ({
    fontFace: font(cs, text), fontSize: parseFloat(cs.fontSize),
    bold: Number(cs.fontWeight) >= 600 || cs.fontWeight === 'bold', italic: cs.fontStyle === 'italic',
    underline: cs.textDecorationLine.includes('underline'), strike: cs.textDecorationLine.includes('line-through'),
    color: cssColor(cs.color).color, charSpacing: parseFloat(cs.letterSpacing) || 0,
  });
  const graphics = [...board.querySelectorAll('svg,canvas')];
  for (const el of board.querySelectorAll('*')) {
    if (el.closest('svg') && !el.matches('svg')) continue;
    const cs = getComputedStyle(el), box = rect(el);
    if (!el.getClientRects().length || cs.visibility === 'hidden' || cs.opacity === '0' || !box.w || !box.h) continue;
    const name = el.dataset.el || el.className?.baseVal || String(el.className || el.tagName);
    const fill = cssColor(cs.backgroundColor);
    if (fill.transparency < 100 && !el.matches('img,svg,canvas')) {
      items.push({ kind: 'shape', ...box, name, fill, radius: parseFloat(cs.borderRadius) || 0, opacity: Number(cs.opacity) });
    }
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const width = parseFloat(cs[`border${side}Width`]);
      if (width && cs[`border${side}Style`] !== 'none') {
        const color = cssColor(cs[`border${side}Color`]);
        const points = side === 'Top' ? [box.x, box.y, box.w, 0]
          : side === 'Bottom' ? [box.x, box.y + box.h, box.w, 0]
            : side === 'Left' ? [box.x, box.y, 0, box.h] : [box.x + box.w, box.y, 0, box.h];
        items.push({ kind: 'line', points, width, color, name });
      }
    }
    if (cs.backgroundImage !== 'none' || cs.filter !== 'none') warnings.push(`${name}: 复杂背景或滤镜`);
    if (el.matches('img')) {
      items.push({ kind: 'image', ...box, name, source: el.currentSrc || el.src, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, fit: cs.objectFit, opacity: Number(cs.opacity) });
    } else if (el.matches('svg,canvas')) {
      items.push({ kind: 'graphic', ...box, name, index: graphics.indexOf(el) });
    } else if (el.hasAttribute('data-el') && !el.querySelector('[data-el]') && el.textContent.trim()) {
      // Measure actual browser line breaks, including rich-text spans, instead of rewrapping in PowerPoint.
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const runs = [];
      let node, lastY = null, lastKey = null;
      const baseStyle = styles(cs, el.textContent);
      while ((node = walker.nextNode())) {
        const parentStyle = getComputedStyle(node.parentElement);
        const options = styles(parentStyle, el.textContent);
        const key = JSON.stringify(options);
        let offset = 0;
        for (const char of node.textContent) {
          const range = document.createRange();
          range.setStart(node, offset); range.setEnd(node, offset + char.length); offset += char.length;
          const r = range.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (lastY !== null && Math.abs(r.top - lastY) > Math.max(3, baseStyle.fontSize * .45)) {
            if (runs.length) runs[runs.length - 1].text += '\n';
            lastKey = null;
          }
          lastY = r.top;
          let text = char;
          if (parentStyle.textTransform === 'uppercase') text = text.toUpperCase();
          if (parentStyle.textTransform === 'lowercase') text = text.toLowerCase();
          if (key === lastKey) runs[runs.length - 1].text += text;
          else { runs.push({ text, options }); lastKey = key; }
        }
      }
      if (runs.length) items.push({
        kind: 'text', ...box, name, runs, ...baseStyle,
        align: ['left', 'center', 'right', 'justify'].includes(cs.textAlign) ? cs.textAlign : 'left',
        lineHeight: parseFloat(cs.lineHeight) || baseStyle.fontSize * 1.2,
        padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(v => parseFloat(v) || 0),
        href: el.closest('a')?.href,
      });
    }
  }
  return { background: cssColor(getComputedStyle(board).backgroundColor), items, warnings };
}

export async function addEditableSlide({ pptx, slide, data, page, board, context, scale = 1 }) {
  const px = v => v * scale / 96;
  const pt = v => v * scale * .75;
  const textOptions = options => ({
    fontFace: options.fontFace, fontSize: pt(options.fontSize), charSpacing: pt(options.charSpacing || 0),
    bold: options.bold, italic: options.italic, underline: options.underline, strike: options.strike,
    color: options.color, align: options.align,
  });
  slide.background = { color: data.background.transparency === 100 ? 'FFFFFF' : data.background.color };
  for (const item of data.items) {
    const position = { x: px(item.x), y: px(item.y), w: px(item.w), h: px(item.h), objectName: item.name };
    if (item.kind === 'shape') {
      slide.addShape(item.radius >= Math.min(item.w, item.h) / 2 ? pptx.ShapeType.ellipse : item.radius > 2 ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
        ...position, fill: { color: item.fill.color, transparency: Math.max(item.fill.transparency, (1 - item.opacity) * 100) },
        line: { transparency: 100 }, radius: px(item.radius),
      });
    } else if (item.kind === 'line') {
      const [x, y, w, h] = item.points;
      slide.addShape(pptx.ShapeType.line, {
        x: px(x), y: px(y), w: px(w), h: px(h), objectName: `${item.name}-border`,
        line: { color: item.color.color, transparency: item.color.transparency, width: pt(item.width) },
      });
    } else if (item.kind === 'text') {
      slide.addText(item.runs.map(run => ({ text: run.text, options: textOptions(run.options) })), {
        ...position, ...textOptions(item),
        x: position.x, y: position.y, w: position.w + px(2), h: position.h + px(2),
        margin: item.padding.map(pt), valign: 'top', fit: 'none', wrap: false,
        lineSpacing: pt(item.lineHeight), paraSpaceBefore: 0, paraSpaceAfter: 0,
        lang: 'zh-CN', hyperlink: item.href ? { url: item.href } : undefined,
      });
    } else {
      let source;
      if (item.kind === 'graphic') {
        const png = await board.locator('svg,canvas').nth(item.index).screenshot({ type: 'png', scale: 'device' });
        source = `image/png;base64,${png.toString('base64')}`;
      } else if (item.source.startsWith('data:')) {
        if (/;base64,/i.test(item.source)) source = item.source;
        else {
          const response = await fetch(item.source);
          const mime = (response.headers.get('content-type') || 'image/png').split(';')[0];
          source = `data:${mime};base64,${Buffer.from(await response.arrayBuffer()).toString('base64')}`;
        }
      }
      else {
        const response = await context.request.get(item.source);
        if (!response.ok()) throw new Error('图片读取失败，请替换后重试');
        source = `data:${response.headers()['content-type'] || 'image/png'};base64,${(await response.body()).toString('base64')}`;
      }
      // SVG previews are not generated by PptxGenJS in Node. Rasterize unsupported
      // sources at their intrinsic aspect, keeping Fit/Cover and a separate image object.
      if (/^(?:data:)?image\/(?:svg\+xml|webp|avif)[;,]/i.test(source)) {
        source = await page.evaluate(async data => {
          const image = new Image(); image.src = data; await image.decode();
          const k = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * k));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * k));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/png');
        }, source);
      }
      const sizing = ['cover', 'contain'].includes(item.fit) ? { type: item.fit, w: position.w, h: position.h } : undefined;
      // PptxGenJS calculates crop from the supplied intrinsic aspect, then uses sizing as the viewport.
      const intrinsic = sizing && item.naturalWidth ? { w: position.w, h: position.w * item.naturalHeight / item.naturalWidth } : {};
      slide.addImage({ ...position, ...intrinsic, sizing, data: source, transparency: (1 - (item.opacity ?? 1)) * 100, altText: item.name });
    }
  }
  slide.addNotes(data.warnings.length ? `文字和图片均为可编辑元素。以下效果可能简化：\n${data.warnings.join('\n')}` : '文字和图片均为可编辑元素。');
}
