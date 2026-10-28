import { prepare, layout, clearCache } from "@chenglou/pretext";
import { textMetrics, scaleText } from "./typography.js";

const number = (v) => parseFloat(v) || 0;
const round = (v) => Math.round(v * 1000) / 1000;
const font = (cs) => `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

// Measurement is derived state. Probes live inside editor UI, never in the document.
export function createTextLayout({ ui }) {
  const cache = new Map();
  const invalidate = () => { cache.clear(); clearCache(); };
  document.fonts.addEventListener("loadingdone", invalidate);

  async function ready(el) {
    let timer;
    const fonts = [...new Set([el, ...el.querySelectorAll("*")].map(n => font(getComputedStyle(n))))];
    try {
      await Promise.race([
        Promise.all(fonts.map(f => document.fonts.load(f, el.textContent || " "))),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("字体尚未就绪，请稍后重试")), 5000); }),
      ]);
    } finally { clearTimeout(timer); }
    if (!el.isConnected) throw new Error("文字已移除");
  }

  function probe(el) {
    const nodes = [el, ...el.querySelectorAll("*")];
    const clone = el.cloneNode(true), copies = [clone, ...clone.querySelectorAll("*")];
    nodes.forEach((node, i) => {
      const cs = getComputedStyle(node), copy = copies[i];
      copy.removeAttribute("id");
      copy.removeAttribute("contenteditable");
      [...copy.attributes].filter(a => /^data-/.test(a.name)).forEach(a => copy.removeAttribute(a.name));
      for (const p of cs) copy.style.setProperty(p, cs.getPropertyValue(p));
      Object.assign(copy.style, { animation: "none", transition: "none", caretColor: "transparent" });
    });
    const cs = getComputedStyle(el);
    Object.assign(clone.style, {
      position: "fixed", inset: "auto", left: "0px", top: "0px", margin: "0",
      transform: "none", translate: "none", rotate: "none", scale: "none",
      visibility: "hidden", pointerEvents: "none", zIndex: "-1",
      height: "auto", minHeight: "0px", maxHeight: "none", overflow: "visible",
      width: cs.width, minWidth: cs.width, maxWidth: cs.width,
    });
    clone.setAttribute("data-pretext-probe", "");
    ui.append(clone);
    const edges = number(cs.paddingTop) + number(cs.paddingBottom) + number(cs.borderTopWidth) + number(cs.borderBottomWidth);
    const side = number(cs.paddingLeft) + number(cs.paddingRight) + number(cs.borderLeftWidth) + number(cs.borderRightWidth);
    const borderBox = cs.boxSizing === "border-box";
    const width = number(cs.width) - (borderBox ? side : 0);
    const height = number(cs.height) + (borderBox ? 0 : edges);
    const noGeneratedText = nodes.every(n => ["::before", "::after"].every(pseudo => {
      const content = getComputedStyle(n, pseudo).content;
      return ["none", "normal", '""'].includes(content);
    }));
    const adaptable = ["block", "inline-block"].includes(cs.display) && cs.writingMode === "horizontal-tb"
      && noGeneratedText && cs.columnCount === "auto" && ["none", ""].includes(cs.webkitLineClamp)
      && nodes.slice(1).every(n => {
        const s = getComputedStyle(n);
        return /^(SPAN|BR|B|STRONG|I|EM|U|S|A|SMALL|MARK|SUB|SUP)$/.test(n.tagName)
          && ["inline", "contents"].includes(s.display) && s.position === "static" && s.float === "none" && s.transform === "none";
      });
    return { clone, copies, nodes, cs, edges, width, height, borderBox, adaptable,
      natural: () => clone.getBoundingClientRect().height,
      wide: () => clone.scrollWidth > clone.clientWidth + 1,
    };
  }

  function prediction(p) {
    const cs = getComputedStyle(p.clone);
    if (p.clone.children.length || !["normal", "pre-wrap"].includes(cs.whiteSpace)
      || !["normal", "keep-all"].includes(cs.wordBreak) || cs.overflowWrap !== "break-word"
      || number(cs.wordSpacing) !== 0 || cs.textTransform !== "none"
      || cs.textWrapMode !== "wrap" || !["auto", "wrap"].includes(cs.textWrapStyle)
      || cs.hyphens === "auto" || cs.fontFeatureSettings !== "normal" || cs.fontVariationSettings !== "normal"
      || cs.fontKerning !== "auto" || cs.fontVariantNumeric !== "normal"
      || /^(system-ui|-apple-system|sans-serif|serif|monospace)(,|$)/i.test(cs.fontFamily)
      || !Number.isFinite(parseFloat(cs.lineHeight))) return null;
    const options = { whiteSpace: cs.whiteSpace, wordBreak: cs.wordBreak, letterSpacing: number(cs.letterSpacing) };
    const key = JSON.stringify([p.clone.textContent, font(cs), options, document.documentElement.lang]);
    let prepared = cache.get(key);
    if (!prepared) {
      if (cache.size >= 80) cache.delete(cache.keys().next().value);
      prepared = prepare(p.clone.textContent, font(cs), options);
      cache.set(key, prepared);
    }
    return layout(prepared, p.width, number(cs.lineHeight));
  }

  function report(p) {
    const height = p.natural();
    let predicted = null;
    try { predicted = prediction(p); } catch { /* Unsupported fonts retain browser measurement. */ }
    const matches = predicted && Math.abs(predicted.height + p.edges - height) <= 1;
    return {
      engine: matches ? "pretext" : "browser", lineCount: matches ? predicted.lineCount : null,
      requiredHeight: round(matches ? Math.max(height, predicted.height + p.edges) : height), availableHeight: round(p.height),
      overflow: height > p.height + 1 || p.wide(), adaptable: p.adaptable,
      reason: matches ? "Pretext 测量已通过浏览器校验" : "当前样式使用浏览器实际测量",
    };
  }

  return {
    check(el) {
      const p = probe(el);
      try { return report(p); } finally { p.clone.remove(); }
    },
    async inspect(el) {
      await ready(el);
      const p = probe(el);
      try { return report(p); } finally { p.clone.remove(); }
    },
    async plan(el, mode) {
      await ready(el);
      const p = probe(el);
      try {
        if (!p.adaptable || p.width <= 0 || !el.textContent.trim()) throw new Error("这种文字布局暂不支持自动适配");
        if (mode === "height") {
          if (p.wide()) throw new Error("文字超出宽度，请先调整文本框宽度或换行规则");
          return [{ node: el, styles: { width: p.cs.width, height: `${Math.ceil(p.natural() - (p.borderBox ? 0 : p.edges))}px`, minHeight: "0px", maxHeight: "none" } }];
        }
        if (mode !== "fit") throw new Error("未知的文字操作");
        if (!report(p).overflow) return [];
        const metrics = textMetrics(p.clone);
        const min = Math.min(1, 6 / Math.min(...metrics.map(m => m.font).filter(n => n > 0)));
        const fits = k => {
          scaleText(metrics, k);
          // Use validated Pretext heights where supported, browser heights elsewhere.
          return report(p).requiredHeight <= p.height + .25 && !p.wide();
        };
        if (!fits(min)) throw new Error("缩小至最小字号仍放不下，请扩大文本框或精简文字");
        let low = min, high = 1;
        for (let i = 0; i < 12; i++) {
          const mid = (low + high) / 2;
          if (fits(mid)) low = mid; else high = mid;
        }
        scaleText(metrics, low);
        const changes = metrics.map(m => ({
          node: p.nodes[p.copies.indexOf(m.node)],
          styles: Object.fromEntries(["fontSize", "lineHeight", "letterSpacing", "wordSpacing"].map(k => [k, m.node.style[k]])),
        }));
        Object.assign(changes[0].styles, { width: p.cs.width, height: p.cs.height });
        return changes;
      } finally { p.clone.remove(); }
    },
  };
}
