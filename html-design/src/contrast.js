// Normalize only local axe color-contrast facts; absent reports never imply a pass.
const ENGINE = { name: 'axe-core', version: '4.10.3', rule: 'color-contrast' };
const LIMIT = 500, UNITS = 100000;
const skip = 'script,style,noscript,template,canvas,video,iframe';
function hidden(el, board) {
  const style = getComputedStyle(el);
  if (style.visibility !== 'visible' || (!el.getClientRects().length && style.display !== 'contents')) return true;
  for (let n = el; n; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (s.display === 'none' || Number(s.opacity) === 0 || s.contentVisibility === 'hidden') return true;
  }
  return false;
}
function uncertainBackground(el) {
  if (el.closest('svg')) return 'svg-text';
  for (let n = el; n; n = n.parentElement) {
    const s = getComputedStyle(n);
    if (s.backgroundImage !== 'none') return 'image-or-gradient-background';
    if (s.mixBlendMode !== 'normal' || s.backgroundBlendMode !== 'normal' || s.filter !== 'none' || s.backdropFilter !== 'none') return 'blending-or-filter';
    if (['::before', '::after'].some(p => !['none', 'normal', '""'].includes(getComputedStyle(n, p).content))) return 'generated-content';
  }
  return null;
}
export async function checkContrast({ boards, coverage, emit, output }) {
  const facts = coverage.contrast = { engine: ENGINE, seen: 0, checked: 0, low: 0, unverified: 0,
    hidden: 0, inapplicable: 0, unmarked: 0, suppressed: 0, truncated: false, complete: true, limit: LIMIT };
  const items = [], seen = new Map();
  let units = 0;
  scan: for (const board of boards) {
    const walker = document.createTreeWalker(board, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const el = node.parentElement;
      if (!node.data.trim() || el.closest(skip)) continue;
      units += node.data.length;
      if (units > UNITS || (!seen.has(el) && items.length >= LIMIT)) { facts.truncated = true; break scan; }
      let item = seen.get(el);
      if (!item) {
        const owner = el.closest('[data-el]');
        item = { board, el, owner: owner && board.contains(owner) ? owner : null, preview: '' };
        seen.set(el, item); items.push(item);
      }
      if (item.preview.length < 80) item.preview += node.data.trim().slice(0, 80 - item.preview.length);
    }
  }
  // Generated text and saved form values have no ordinary DOM text node.
  // Inventory them explicitly so an absent axe node cannot silently pass.
  let elementCount = 0;
  generated: for (const board of boards) {
    const walker = document.createTreeWalker(board, NodeFilter.SHOW_ELEMENT);
    let el = board;
    do {
      if (++elementCount > 2000) { facts.truncated = true; break generated; }
      if (el.closest(skip)) continue;
      const generated = ['::before', '::after'].map(p => getComputedStyle(el, p).content)
        .filter(v => !['none', 'normal', '""'].includes(v)).join(' ');
      const value = el.matches('input:not([type=hidden]),textarea,select') ? (el.value || el.getAttribute('placeholder') || '') : '';
      if ((generated || value) && !seen.has(el)) {
        if (items.length >= LIMIT) { facts.truncated = true; break generated; }
        const owner = el.closest('[data-el]');
        const item = { board, el, owner: owner && board.contains(owner) ? owner : null, preview: (generated || value).slice(0, 80) };
        seen.set(el, item); items.push(item);
      }
    } while ((el = walker.nextNode()));
  }
  facts.seen = items.length;
  const eligible = [];
  for (const item of items) {
    if (hidden(item.el, item.board)) { facts.hidden++; continue; }
    // Disabled native controls are outside WCAG text contrast, unlike arbitrary [disabled] nodes.
    if (item.el.closest('button:disabled,input:disabled,select:disabled,textarea:disabled,option:disabled')) { facts.inapplicable++; continue; }
    if (!item.owner) facts.unmarked++;
    eligible.push(item);
  }
  let results, failure = null;
  if (eligible.length) {
    try {
      if (globalThis.axe?.version !== ENGINE.version) throw new Error('Contrast engine is unavailable.');
      results = await globalThis.axe.run({ include: eligible.map(item => item.el) }, {
        runOnly: { type: 'rule', values: [ENGINE.rule] }, elementRef: true,
        selectors: false, ancestry: false, xpath: false, iframes: false, preload: false,
      });
    } catch { failure = 'engine-failed'; }
  }
  const reports = new Map();
  for (const kind of ['passes', 'violations', 'incomplete', 'inapplicable']) {
    for (const rule of results?.[kind] || []) for (const node of rule.nodes || []) {
      const check = [...node.any, ...node.all, ...node.none].find(c => c.id === ENGINE.rule);
      if (node.element && check) reports.set(node.element, { kind, data: check.data || {} });
    }
  }
  for (const { board, el, owner, preview } of eligible) {
    const report = reports.get(el), data = report?.data || {}, s = getComputedStyle(el);
    const reason = failure || uncertainBackground(el) || (report?.kind === 'incomplete'
      ? data.messageKey === 'equalRatio' ? 'possible-same-color' : String(data.messageKey || 'engine-incomplete').slice(0, 80)
      : !report ? 'no-engine-report' : null);
    if (report?.kind === 'inapplicable' && !reason) { facts.inapplicable++; continue; }
    const unverified = !!reason;
    const low = !unverified && report.kind === 'violations';
    if (unverified) { facts.unverified++; facts.complete = false; }
    else { facts.checked++; if (low) facts.low++; }
    if (!unverified && !low) continue;
    const number = v => Number.isFinite(v) ? v : null;
    const reliableColors = !reason || reason === 'possible-same-color';
    const evidence = { page: boards.indexOf(board) + 1, text: preview, foreground: reliableColors && typeof data.fgColor === 'string' ? data.fgColor.slice(0, 64) : null,
      background: reliableColors && typeof data.bgColor === 'string' ? data.bgColor.slice(0, 64) : null,
      fontSize: parseFloat(s.fontSize), fontWeight: s.fontWeight.slice(0, 20),
      ratio: reliableColors && data.fgColor && data.bgColor && data.contrastRatio > 0 ? number(data.contrastRatio) : null, required: number(parseFloat(data.expectedContrastRatio)), reason, engine: ENGINE };
    if (low && owner?.getAttribute('data-qa-ignore')?.split(/\s+/).includes('TEXT_LOW_CONTRAST')) {
      facts.suppressed++; coverage.suppressed++;
    } else emit(unverified ? 'CONTRAST_UNVERIFIED' : 'TEXT_LOW_CONTRAST', board, owner, evidence);
  }
  if (facts.truncated) {
    facts.complete = false; output.truncated = true;
    emit('SCAN_LIMIT', null, null, { kind: 'contrast', textLimit: LIMIT, codeUnitLimit: UNITS, elementLimit: 2000 });
  }
  if (output.truncated) facts.complete = false;
  return !facts.complete;
}
