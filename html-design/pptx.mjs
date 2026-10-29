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
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map(side => ({
      side, width: parseFloat(cs[`border${side}Width`]) || 0,
      style: cs[`border${side}Style`], color: cssColor(cs[`border${side}Color`]),
    }));
    const visibleBorder = side => side.width > 0 && !['none', 'hidden'].includes(side.style) && side.color.transparency < 100;
    // Only merge geometry we can express faithfully. Translations are harmless;
    // scaled/rotated/skewed boxes need the existing side-specific approximation.
    let axisAligned = true;
    for (let node = el; node && node !== board.parentElement; node = node.parentElement) {
      const style = getComputedStyle(node), matrix = new DOMMatrix(style.transform);
      if (!matrix.is2D || matrix.a !== 1 || matrix.d !== 1 || matrix.b || matrix.c ||
          !['none', '0deg'].includes(style.rotate) || !['none', '1'].includes(style.scale) || Number(style.zoom) !== 1) axisAligned = false;
    }
    const corners = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map(corner => {
      const parts = cs[`border${corner}Radius`].split(/\s+/);
      const length = (value, size) => value.endsWith('%') ? parseFloat(value) * size / 100 : parseFloat(value);
      return [length(parts[0], box.w), length(parts[1] || parts[0], box.h)];
    });
    // CSS reduces all radii by a common factor when adjacent corners overlap.
    const factor = Math.min(1, ...[
      box.w / (corners[0][0] + corners[1][0]), box.w / (corners[3][0] + corners[2][0]),
      box.h / (corners[0][1] + corners[3][1]), box.h / (corners[1][1] + corners[2][1]),
    ]);
    const [rx, ry] = corners[0].map(value => value * factor);
    const near = (a, b) => Math.abs(a - b) < .01;
    const uniformCorners = corners.every(([x, y]) => near(x * factor, rx) && near(y * factor, ry));
    const geometry = axisAligned && uniformCorners && (near(rx, ry) || (near(rx, box.w / 2) && near(ry, box.h / 2)))
      ? { type: near(rx, ry) ? (rx > 0 ? 'roundRect' : 'rect') : 'ellipse', radius: rx } : null;
    const first = sides[0];
    const uniformStroke = geometry && sides.every(side => visibleBorder(side) && side.style === 'solid' &&
      side.width === first.width && side.color.color === first.color.color && side.color.transparency === first.color.transparency) &&
      first.width < Math.min(box.w, box.h) && (geometry.type !== 'roundRect' || geometry.radius > first.width / 2) ? first : null;
    const container = !el.matches('img,svg,canvas');
    if (container && (fill.transparency < 100 || uniformStroke)) {
      // CSS borders lie inside the border box; DrawingML strokes straddle their path.
      const inset = uniformStroke ? uniformStroke.width / 2 : 0;
      items.push({ kind: 'shape', x: box.x + inset, y: box.y + inset, w: box.w - inset * 2, h: box.h - inset * 2,
        name, fill, geometry: geometry?.type || 'rect', radius: Math.max(0, (geometry?.radius || 0) - inset),
        stroke: uniformStroke, opacity: Number(cs.opacity) });
    }
    if (!container || !uniformStroke) for (const border of sides.filter(visibleBorder)) {
      const { side, width, color } = border;
      const points = side === 'Top' ? [box.x, box.y, box.w, 0]
        : side === 'Bottom' ? [box.x, box.y + box.h, box.w, 0]
          : side === 'Left' ? [box.x, box.y, 0, box.h] : [box.x + box.w, box.y, 0, box.h];
      items.push({ kind: 'line', points, width, color, name });
    }
    if ((fill.transparency < 100 || sides.some(visibleBorder)) && (!geometry || (sides.some(visibleBorder) && !uniformStroke))) {
      warnings.push(`${name}: 边框或圆角使用简化映射`);
    }
    if (cs.backgroundImage !== 'none' || cs.filter !== 'none') warnings.push(`${name}: 复杂背景或滤镜`);
    if (el.matches('img')) {
      items.push({ kind: 'image', ...box, name, source: el.currentSrc || el.src, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, fit: cs.objectFit, opacity: Number(cs.opacity) });
    } else if (el.matches('svg,canvas')) {
      items.push({ kind: 'graphic', ...box, name, index: graphics.indexOf(el) });
    } else if (el.hasAttribute('data-el') && !el.querySelector('[data-el]') && el.textContent.trim()) {
      // Keep authored breaks, not the browser's width-dependent soft wraps.
      const runs = [];
      let lastKey = null, pendingSpace = null, pendingBlockBreak = false;
      const baseStyle = styles(cs, el.textContent);
      const append = (text, options) => {
        if (!text) return;
        const key = JSON.stringify(options);
        if (key === lastKey) runs[runs.length - 1].text += text;
        else { runs.push({ text, options }); lastKey = key; }
      };
      const endsLine = () => !runs.length || runs[runs.length - 1].text.endsWith('\n');
      const lineBreak = (options, explicit = false) => {
        pendingSpace = null;
        if (explicit || !endsLine()) append('\n', options);
        pendingBlockBreak = false;
      };
      const appendContent = (text, options) => {
        if (pendingBlockBreak) lineBreak(options);
        if (pendingSpace && !endsLine()) append(' ', pendingSpace);
        pendingSpace = null;
        append(text, options);
      };
      const visit = node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const parentStyle = getComputedStyle(node.parentElement);
          const options = styles(parentStyle, el.textContent);
          let text = node.textContent;
          if (parentStyle.textTransform === 'uppercase') text = text.toUpperCase();
          if (parentStyle.textTransform === 'lowercase') text = text.toLowerCase();
          const preserveSpaces = ['pre', 'pre-wrap', 'break-spaces'].includes(parentStyle.whiteSpace);
          const preserveLines = preserveSpaces || parentStyle.whiteSpace === 'pre-line';
          if (!preserveLines) text = text.replace(/\n/g, ' ');
          for (const token of text.match(/\n|[\t\r\f ]+|[^\t\r\f \n]+/g) || []) {
            if (token === '\n') {
              if (pendingBlockBreak) lineBreak(options);
              lineBreak(options, true);
            } else if (!preserveSpaces && /^[\t\r\f ]+$/.test(token)) pendingSpace ||= options;
            else appendContent(token, options);
          }
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const nodeStyle = getComputedStyle(node);
        if (nodeStyle.display === 'none' || nodeStyle.visibility === 'hidden' || nodeStyle.opacity === '0') return;
        const options = styles(nodeStyle, el.textContent);
        if (node.tagName === 'BR') {
          if (pendingBlockBreak) lineBreak(options);
          lineBreak(options, true);
          return;
        }
        const parentStyle = node.parentElement && getComputedStyle(node.parentElement);
        const layoutItem = node !== el && ['flex', 'inline-flex', 'grid', 'inline-grid'].includes(parentStyle?.display);
        // Flex/Grid blockify inline children; that does not make each child a paragraph.
        const columnItem = layoutItem && parentStyle.display.includes('flex') && parentStyle.flexDirection.startsWith('column');
        const block = node !== el && (layoutItem ? columnItem : ['block', 'flow-root', 'flex', 'grid', 'list-item', 'table-row'].includes(nodeStyle.display));
        if (block) lineBreak(options);
        else if (layoutItem && parseFloat(parentStyle.columnGap) > 0) pendingSpace ||= options;
        for (const child of node.childNodes) visit(child);
        if (block) { pendingSpace = null; pendingBlockBreak = true; }
      };
      visit(el);
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
      slide.addShape(pptx.ShapeType[item.geometry], {
        ...position, fill: { color: item.fill.color, transparency: 100 - (100 - item.fill.transparency) * item.opacity },
        line: item.stroke ? { color: item.stroke.color.color,
          transparency: 100 - (100 - item.stroke.color.transparency) * item.opacity, width: pt(item.stroke.width) }
          : { transparency: 100 },
        rectRadius: item.geometry === 'roundRect' ? px(item.radius) : undefined,
      });
    } else if (item.kind === 'line') {
      const [x, y, w, h] = item.points;
      slide.addShape(pptx.ShapeType.line, {
        x: px(x), y: px(y), w: px(w), h: px(h), objectName: `${item.name}-border`,
        line: { color: item.color.color, transparency: item.color.transparency, width: pt(item.width) },
      });
    } else if (item.kind === 'text') {
      // Explicit segments avoid PptxGenJS treating a trailing newline in a rich run
      // differently from a newline followed by more text in the same run.
      const runs = item.runs.flatMap(run => run.text.split('\n').map((text, i, parts) => ({
        text, options: { ...textOptions(run.options), breakLine: i < parts.length - 1 },
      })));
      slide.addText(runs, {
        ...position, ...textOptions(item),
        x: position.x, y: position.y, w: position.w + px(2), h: position.h + px(2),
        margin: item.padding.map(pt), valign: 'top', fit: 'none', wrap: true,
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
