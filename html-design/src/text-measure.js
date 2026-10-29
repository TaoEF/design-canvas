import { prepare, measureNaturalWidth, measureLineStats, clearCache } from "@chenglou/pretext";
import { createTextLayout } from "./text-layout.js";
import { checkVisualDocument } from "./qa.js";

const px = v => parseFloat(v) || 0;
const round = v => Math.round(v * 1000) / 1000;
const host = document.createElement("div");
host.setAttribute("data-editor-ui", "");
document.documentElement.append(host);
const ui = host.attachShadow({ mode: "open" });
const measurement = createTextLayout({ ui });

async function measureText(input) {
  const node = document.createElement("p");
  Object.assign(node.style, {
    position: "absolute", left: "0px", top: "0px", margin: "0", padding: "0", border: "0",
    boxSizing: "content-box", font: input.font, lineHeight: `${input.lineHeight}px`,
    letterSpacing: `${input.letterSpacing ?? 0}px`, wordSpacing: "normal",
    whiteSpace: input.whiteSpace || "normal", wordBreak: input.wordBreak || "normal", overflowWrap: "break-word",
  });
  node.textContent = input.text;
  ui.append(node);
  try {
    let timer;
    try {
      await Promise.race([document.fonts.load(input.font, input.text || " "),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Font loading timed out.")), 5000); })]);
    } finally { clearTimeout(timer); }
    clearCache();
    const prepared = prepare(input.text, input.font, {
      whiteSpace: input.whiteSpace, wordBreak: input.wordBreak, letterSpacing: input.letterSpacing,
    });
    node.style.width = "max-content";
    const actualNaturalWidth = node.getBoundingClientRect().width;
    const predictedNaturalWidth = measureNaturalWidth(prepared);
    const naturalMatches = Math.abs(actualNaturalWidth - predictedNaturalWidth) <= 1;
    const layouts = [];
    for (const width of input.widths) {
      node.style.width = `${width}px`;
      node.style.height = input.maxHeight === undefined ? "auto" : `${input.maxHeight}px`;
      const actual = await measurement.inspect(node);
      const predicted = measureLineStats(prepared, width);
      const range = document.createRange();
      range.selectNodeContents(node);
      const actualLineWidth = Math.max(0, ...[...range.getClientRects()].map(r => r.width));
      const matches = actual.engine === "pretext" && naturalMatches && Math.abs(actualLineWidth - predicted.maxLineWidth) <= 1;
      layouts.push({ width, engine: matches ? "pretext" : "browser", lineCount: actual.lineCount,
        maxLineWidth: round(matches ? predicted.maxLineWidth : actualLineWidth), requiredHeight: actual.requiredHeight,
        maxHeight: input.maxHeight ?? null, verticalOverflow: input.maxHeight === undefined ? null : actual.requiredHeight > input.maxHeight + 1,
        horizontalOverflow: node.scrollWidth > node.clientWidth + 1,
      });
    }
    return { status: layouts.some(l => l.verticalOverflow || l.horizontalOverflow) ? "issues" : "ok", units: "css-px", box: "content-box", font: input.font, lineHeight: input.lineHeight,
      naturalWidth: round(naturalMatches ? predictedNaturalWidth : actualNaturalWidth),
      naturalWidthEngine: naturalMatches ? "pretext" : "browser", layouts };
  } finally { node.remove(); }
}

async function checkDocument({ qa = false } = {}) {
  document.querySelectorAll("[data-editor-ui],style[data-editor-style],[data-editor-connection]").forEach(n => {
    if (n !== host) n.remove();
  });
  for (const a of [...document.documentElement.attributes]) {
    if (/^data-edit/.test(a.name)) document.documentElement.removeAttribute(a.name);
  }
  const style = document.createElement("style");
  style.textContent = `[data-stage]{transform:none!important;translate:none!important;zoom:1!important;position:static!important;display:block!important;margin:0!important;padding:0!important;width:max-content!important;height:auto!important}
    [data-artboard]{visibility:visible!important;margin:0!important}
    *,*::before,*::after{animation:none!important;transition:none!important}`;
  document.head.append(style);
  const boards = [...document.querySelectorAll("[data-artboard]")];
  if (!boards.length || boards.length > 100) throw new Error("Expected 1–100 artboards.");
  boards.forEach(board => {
    if (getComputedStyle(board).display === "none") board.style.setProperty("display", "block", "important");
  });
  const candidates = [];
  let scanTruncated = false;
  for (const board of boards) {
    const found = new Map(), walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      if (!text.textContent.trim() || text.parentElement.closest("script,style,noscript,template,svg,canvas,video,iframe")) continue;
      const marked = text.parentElement.closest("[data-el]");
      const el = marked && board.contains(marked) ? marked : text.parentElement;
      if (!found.has(el)) found.set(el, { board, el, marked: !!marked && board.contains(marked), preview: text.textContent.trim().slice(0, 80) });
      if (qa && candidates.length + found.size > 500) { scanTruncated = true; break; }
    }
    candidates.push(...found.values());
    if (scanTruncated) break;
  }
  const issues = [];
  const pageIds = boards.map(b => b.dataset.artboard), elementIds = [...document.querySelectorAll("[data-artboard] [data-el]")].map(n => n.dataset.el);
  let checked = 0;
  for (const { board, el, marked, preview } of candidates.slice(0, 500)) {
    const target = { pageId: board.dataset.artboard, elementId: el.dataset.el ?? null };
    if (!marked) {
      issues.push({ ...target, status: "unmarked", tag: el.tagName.toLowerCase(), preview, overflow: null });
      continue;
    }
    if (!target.pageId || !target.elementId || pageIds.filter(v => v === target.pageId).length !== 1 || elementIds.filter(v => v === target.elementId).length !== 1) {
      issues.push({ ...target, status: "invalid-id", overflow: null });
      continue;
    }
    const ancestors = [];
    for (let node = el; node && board.contains(node); node = node.parentElement) ancestors.push(node);
    if (getComputedStyle(el).visibility !== "visible" || ancestors.some(n => {
      const cs = getComputedStyle(n);
      return cs.display === "none" || cs.opacity === "0" || cs.contentVisibility === "hidden";
    })) {
      issues.push({ ...target, status: "hidden", overflow: null });
      continue;
    }
    if (el === board || el.querySelector("[data-el]")) {
      issues.push({ ...target, status: "unsupported", code: "NESTED_TEXT_CONTAINER", overflow: null });
      continue;
    }
    if (!el.getClientRects().length) { issues.push({ ...target, status: "unsupported", overflow: null }); continue; }
    if (qa && el.textContent.length > 20000) {
      scanTruncated = true;
      issues.push({ ...target, status: "unsupported", code: "QA_TEXT_LIMIT", overflow: null });
      continue;
    }
    try {
      const result = await measurement.inspect(el), cs = getComputedStyle(el);
      if (!result.adaptable) {
        issues.push({ ...target, status: "unsupported", overflow: null });
        continue;
      }
      checked++;
      const r = el.getBoundingClientRect(), b = board.getBoundingClientRect();
      const outOfBounds = r.left < b.left - 1 || r.top < b.top - 1 || r.right > b.right + 1 || r.bottom > b.bottom + 1;
      const clippedBy = [];
      for (const parent of ancestors.slice(1)) {
        const cs = getComputedStyle(parent), a = parent.getBoundingClientRect();
        const sx = parent.offsetWidth ? a.width / parent.offsetWidth : 1;
        const sy = parent.offsetHeight ? a.height / parent.offsetHeight : 1;
        const left = a.left + px(cs.borderLeftWidth) * sx, top = a.top + px(cs.borderTopWidth) * sy;
        const clipX = ["hidden", "clip", "auto", "scroll"].includes(cs.overflowX)
          && (r.left < left - 1 || r.right > left + parent.clientWidth * sx + 1);
        const clipY = ["hidden", "clip", "auto", "scroll"].includes(cs.overflowY)
          && (r.top < top - 1 || r.bottom > top + parent.clientHeight * sy + 1);
        if (clipX || clipY) clippedBy.push({ elementId: parent.dataset.el ?? null, id: parent.id || null, tag: parent.tagName.toLowerCase(), x: clipX, y: clipY });
      }
      if (result.overflow || outOfBounds || clippedBy.length) issues.push({ ...target, status: clippedBy.length ? "clipped" : "overflow", engine: result.engine,
        overflow: result.overflow, outOfBounds, lineCount: result.lineCount,
        ...(clippedBy.length ? { clippedBy } : {}),
        requiredHeight: result.requiredHeight, availableHeight: result.availableHeight,
        box: { x: round(r.left - b.left), y: round(r.top - b.top), width: round(r.width), height: round(r.height) },
        contentWidth: round(px(cs.width) - (cs.boxSizing === "border-box"
          ? px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth) : 0)),
      });
    } catch {
      issues.push({ ...target, status: "error", code: "MEASUREMENT_FAILED", overflow: null });
    }
  }
  const result = { status: issues.length || candidates.length > 500 ? "issues" : "ok", units: "css-px", box: "border-box",
    pageCount: boards.length, textCount: candidates.length, checkedCount: checked,
    truncated: scanTruncated || candidates.length > 500, issues };
  return qa ? checkVisualDocument({ boards, candidates, textResult: result }) : result;
}

globalThis.__htmlDesignText = { measureText, checkDocument };
