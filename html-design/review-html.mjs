import { parse } from 'parse5';

const attr = (n, name) => n?.attrs?.find(a => a.name === name)?.value;
const has = (n, name) => n?.attrs?.some(a => a.name === name);
const children = n => n.childNodes || [];
const walk = function* (n) { yield n; for (const c of children(n)) yield* walk(c); if (n.content) yield* walk(n.content); };
const ignored = n => has(n, 'data-editor') || has(n, 'data-editor-ui') || has(n, 'data-editor-connection') || (n.tagName === 'style' && has(n, 'data-editor-style')) || attr(n, 'id') === 'codex-browser-sidebar-comments-root';
const derived = name => name === 'data-bbox' || name === 'contenteditable' || name === 'data-page-seq' || name === 'data-element-seq' || name === 'data-editing' || name.startsWith('data-editor-');
function signature(n, shell = false, commonPages = new Set()) {
  if (ignored(n)) return null;
  if (shell && has(n, 'data-artboard')) return commonPages.has(attr(n, 'data-artboard')) ? ['page', attr(n, 'data-artboard')] : null;
  if (n.nodeName === '#comment') return null;
  if (n.nodeName === '#documentType') return ['doctype', n.name, n.publicId, n.systemId];
  if (n.nodeName === '#text') {
    const structural = ['#document', 'html', 'head'].includes(n.parentNode?.nodeName);
    return shell && structural && !n.value.trim() ? null : ['text', n.value];
  }
  const content = [];
  for (const c of children(n).map(c => signature(c, shell, commonPages)).filter(c => c !== null)) {
    if (c.length === 2 && c[0] === 'text' && content.at(-1)?.length === 2 && content.at(-1)[0] === 'text') content.at(-1)[1] += c[1];
    else content.push(c);
  }
  return [n.tagName || n.nodeName, (n.attrs || []).filter(a => !derived(a.name)).map(a => [a.namespace || '', a.name, a.value]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), content, n.content ? signature(n.content, shell, commonPages) : null];
}
export function inspectHTML(html) {
  const tree = parse(html, { sourceCodeLocationInfo: true }), nodes = [...walk(tree)];
  const stages = nodes.filter(n => has(n, 'data-stage')), stage = stages[0];
  const pages = nodes.filter(n => has(n, 'data-artboard') && !ignored(n));
  const ids = pages.map(n => attr(n, 'data-artboard'));
  const safe = stages.length === 1 && !!stage.sourceCodeLocation?.endTag && pages.every(n => n.parentNode === stage && n.sourceCodeLocation?.endTag) && ids.every(id => id && id !== 'all') && new Set(ids).size === ids.length;
  return { html, tree, nodes, stage, pages, ids, safe, byId: new Map(pages.map(n => [attr(n, 'data-artboard'), n])) };
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const source = (doc, node) => doc.html.slice(node.sourceCodeLocation.startOffset, node.sourceCodeLocation.endOffset);
export function reviewDiff(beforeHTML, afterHTML) {
  const before = inspectHTML(beforeHTML), after = inspectHTML(afterHTML);
  if (equal(signature(before.tree), signature(after.tree))) return { scope: 'pages', items: [], reasons: [] };
  const reasons = [];
  const commonBefore = before.ids.filter(id => after.byId.has(id)), commonAfter = after.ids.filter(id => before.byId.has(id)), common = new Set(commonBefore);
  if (!before.safe || !after.safe) reasons.push('页面结构或标识无法安全分开恢复');
  if (!equal(signature(before.tree, true, common), signature(after.tree, true, common))) reasons.push('共享样式、全局属性或页面外内容变化');
  const styles = doc => doc.nodes.filter(n => !ignored(n) && (n.tagName === 'style' || (n.tagName === 'link' && attr(n, 'rel')?.toLowerCase().split(/\s+/).includes('stylesheet')))).map(n => signature(n));
  if (!equal(styles(before), styles(after))) reasons.push('样式表变化（包含页内共享样式）');
  const scripts = doc => doc.nodes.filter(n => n.tagName === 'script' && !ignored(n)).map(n => signature(n));
  if (!equal(scripts(before), scripts(after))) reasons.push('内容脚本变化');
  if (!equal(commonBefore, commonAfter)) reasons.push('已有页面顺序变化');
  if (reasons.length) return { scope: 'document', items: [{ id: 'document', kind: 'updated', title: '整份文档' }], reasons };
  const items = [...new Set([...before.ids, ...after.ids])].flatMap(id => {
    const b = before.byId.get(id), a = after.byId.get(id);
    if (b && a && equal(signature(b), signature(a))) return [];
    return [{ id, kind: !b ? 'added' : !a ? 'deleted' : 'updated', title: attr(a || b, 'data-title') || id }];
  });
  return { scope: 'pages', items, reasons: [] };
}
function patch(html, edits) {
  for (const e of edits.sort((a, b) => b.start - a.start)) html = html.slice(0, e.start) + e.text + html.slice(e.end);
  return html;
}
function counters(doc) {
  const result = { 'data-page-seq': Number(attr(doc.stage, 'data-page-seq')) || 0, 'data-element-seq': Number(attr(doc.stage, 'data-element-seq')) || 0 };
  for (const n of doc.nodes) {
    result['data-page-seq'] = Math.max(result['data-page-seq'], Number(attr(n, 'data-artboard')?.match(/^p(\d+)$/)?.[1]) || 0);
    result['data-element-seq'] = Math.max(result['data-element-seq'], Number(attr(n, 'data-el')?.match(/(?:^|-)(?:element|text|image|copy)-(\d+)$/)?.[1]) || 0);
  }
  return result;
}
export function preserveCounters(html, ...sources) {
  const target = inspectHTML(html), all = [target, ...sources.map(inspectHTML)].map(counters);
  const stage = target.stage;
  if (!stage?.sourceCodeLocation) return html;
  const edits = [];
  for (const name of ['data-page-seq', 'data-element-seq']) {
    const value = Math.max(...all.map(c => c[name]));
    if (!value || value === Number(attr(stage, name))) continue;
    const loc = stage.sourceCodeLocation.attrs?.[name];
    edits.push(loc ? { start: loc.startOffset, end: loc.endOffset, text: `${name}="${value}"` } : { start: stage.sourceCodeLocation.startTag.endOffset - 1, end: stage.sourceCodeLocation.startTag.endOffset - 1, text: ` ${name}="${value}"` });
  }
  return patch(html, edits);
}
// Only source ranges are changed: unrelated hand-authored markup remains byte-for-byte intact.
export function restorePage(targetHTML, referenceHTML, id) {
  const target = inspectHTML(targetHTML), reference = inspectHTML(referenceHTML);
  if (!target.safe || !reference.safe) throw new Error('页面结构不能安全局部恢复');
  const old = target.byId.get(id), restored = reference.byId.get(id);
  let start, end, text = restored ? source(reference, restored) : '';
  if (old) { start = old.sourceCodeLocation.startOffset; end = old.sourceCodeLocation.endOffset; }
  else if (restored) {
    const i = reference.ids.indexOf(id), next = reference.ids.slice(i + 1).find(x => target.byId.has(x)), previous = reference.ids.slice(0, i).reverse().find(x => target.byId.has(x));
    start = end = next ? target.byId.get(next).sourceCodeLocation.startOffset : previous ? target.byId.get(previous).sourceCodeLocation.endOffset : target.stage.sourceCodeLocation.endTag.startOffset;
  } else return targetHTML;
  return preserveCounters(patch(targetHTML, [{ start, end, text }]), targetHTML, referenceHTML);
}
export function restoreDocument(currentHTML, baselineHTML) {
  const current = inspectHTML(currentHTML), baseline = inspectHTML(baselineHTML);
  const runtime = current.nodes.filter(n => ignored(n) && has(n, 'data-editor')).map(n => source(current, n)).join('\n');
  const old = baseline.nodes.filter(n => ignored(n));
  const edits = old.filter(n => n.sourceCodeLocation).map(n => ({ start: n.sourceCodeLocation.startOffset, end: n.sourceCodeLocation.endOffset, text: '' }));
  const body = baseline.nodes.find(n => n.tagName === 'body');
  const position = body?.sourceCodeLocation?.endTag?.startOffset ?? baselineHTML.lastIndexOf('</html>');
  edits.push({ start: position, end: position, text: runtime });
  return preserveCounters(patch(baselineHTML, edits), currentHTML);
}
export function acceptScopes(baselineHTML, currentHTML, ids) {
  for (const id of ids) baselineHTML = restorePage(baselineHTML, currentHTML, id);
  return baselineHTML;
}
