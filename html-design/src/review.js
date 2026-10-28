import { icon } from './icons.js';

// A static, sandboxed view. Never insert the baseline into the editable stage.
export function beforeHTML(html, scope, baseURL) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,iframe,frame,object,embed,base,meta[http-equiv],[data-editor-ui],[data-editor-connection],style[data-editor-style]').forEach(n => n.remove());
  doc.querySelectorAll('form').forEach(n => n.replaceWith(...n.childNodes));
  for (const n of [doc.documentElement, ...doc.querySelectorAll('*')]) {
    for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /^data-editor-/.test(a.name) || ['data-editing', 'contenteditable', 'autofocus', 'srcdoc'].includes(a.name) || /^(?:javascript|vbscript):/i.test(a.value.trim())) n.removeAttribute(a.name);
    if (n.matches('a,area')) { n.removeAttribute('href'); n.removeAttribute('target'); }
  }
  if (scope !== 'document' && scope !== 'all') for (const page of doc.querySelectorAll('[data-artboard]')) if (page.dataset.artboard !== scope) page.remove();
  const base = doc.createElement('base'); base.href = baseURL;
  const csp = doc.createElement('meta'); csp.httpEquiv = 'Content-Security-Policy';
  csp.content = `default-src 'none'; script-src 'none'; style-src 'unsafe-inline' http: https:; img-src data: blob: http: https:; font-src data: http: https:; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri ${new URL(baseURL).origin}`;
  doc.head.prepend(csp, base);
  doc.body.inert = true;
  const style = doc.createElement('style'); style.textContent = 'html,body{margin:0!important;min-height:100%!important}body{pointer-events:none!important}*,*::before,*::after{animation:none!important;transition:none!important}'; doc.head.append(style);
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}

export function createReview({ ui, persistence, navigate, dimensions, toast }) {
  const trigger = ui.querySelector('.review-trigger');
  const panel = ui.querySelector('.review-panel');
  const list = panel.querySelector('.review-list');
  const preview = ui.querySelector('.review-preview');
  const message = panel.querySelector('.review-message');
  let state = { review: { items: [], generation: 0 } }, drawnGeneration = -1, busy = false, returnFocus, readEpoch = 0, previewResize;
  function closePreview() {
    readEpoch++; previewResize?.disconnect(); preview.hidden = true; preview.querySelector('.review-frame').replaceChildren();
    (returnFocus?.isConnected && !returnFocus.closest('[hidden]') ? returnFocus : trigger.hidden ? ui.querySelector('[data-act=edit]') : trigger)?.focus();
  }
  function close() { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); (trigger.hidden ? ui.querySelector('[data-act=edit]') : trigger).focus(); }
  function button(text, command, id) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.dataset.reviewCommand = command; b.dataset.reviewId = id;
    return b;
  }
  function update(next) {
    state = next;
    const review = state.review, count = review.items.length;
    trigger.hidden = !count && !review.conflict;
    trigger.textContent = review.conflict ? 'AI 审阅异常' : `AI 修改 ${count}`;
    if (drawnGeneration !== review.generation || list.childElementCount !== count) {
      drawnGeneration = review.generation; list.replaceChildren();
      for (const item of review.items) {
        const row = document.createElement('div'); row.className = 'review-item';
        const heading = document.createElement('div'); heading.className = 'review-item-heading';
        const title = document.createElement('strong'); title.textContent = item.title;
        const kind = document.createElement('span'); kind.textContent = { added: '新增', updated: '修改', deleted: '删除' }[item.kind];
        heading.append(title, kind); row.append(heading);
        const actions = document.createElement('div'); actions.className = 'review-item-actions';
        if (item.kind !== 'added') actions.append(button('修改前', 'before', item.id));
        if (review.scope === 'pages' && item.kind !== 'deleted') actions.append(button('定位', 'locate', item.id));
        actions.append(button('撤回', 'undo', item.id), button('接受', 'accept', item.id));
        row.append(actions); list.append(row);
      }
      if (!preview.hidden) closePreview();
    }
    message.textContent = review.conflict ? '文件在审阅之外被修改。恢复基线已保留，已阻止撤回，请先下载副本并排查外部修改。' : review.scope === 'document' ? `影响整份文档：${review.reasons.join('；')}。撤回会恢复全部未接受的修改。` : state.canReview ? '人工修改并保存某页，会接受该页的 AI 改动。' : '只读查看。取得编辑权限后可接受或撤回。';
    for (const b of panel.querySelectorAll('[data-review-command=accept],[data-review-command=undo],[data-review-command=accept-all]')) b.disabled = !state.canReview || busy || review.conflict;
    panel.setAttribute('aria-busy', String(busy));
    if (!count && !review.conflict && !panel.hidden) close();
  }
  trigger.addEventListener('click', () => { panel.hidden = !panel.hidden; trigger.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) panel.querySelector('button')?.focus(); });
  panel.addEventListener('click', async event => {
    const b = event.target.closest('[data-review-command]'); if (!b || busy) return;
    const command = b.dataset.reviewCommand, id = b.dataset.reviewId;
    if (command === 'close') return close();
    if (command === 'locate') { navigate(id); return; }
    if (command === 'before') {
      const epoch = ++readEpoch; b.disabled = true;
      try {
        const result = await persistence().reviewRead(id, state.review.generation);
        if (epoch !== readEpoch) return;
        returnFocus = b; preview.hidden = false;
        preview.querySelector('.review-preview-title').textContent = `${state.review.items.find(i => i.id === id)?.title || '整份文档'} · 修改前`;
        const frame = document.createElement('iframe'); frame.title = 'AI 修改前，只读预览'; frame.setAttribute('sandbox', 'allow-same-origin'); frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true');
        const area = preview.querySelector('.review-frame'), canvas = document.createElement('div'); canvas.className = 'review-scaled'; canvas.append(frame); area.replaceChildren(canvas);
        const size = dimensions(id), documentView = id === 'document' || id === 'all';
        function layout() {
          const scale = Math.min(1, (area.clientWidth - 24) / size.width, documentView ? 1 : (area.clientHeight - 24) / size.height);
          Object.assign(canvas.style, { width: `${size.width * scale}px`, height: `${size.height * scale}px` });
          Object.assign(frame.style, { width: `${size.width}px`, height: `${size.height}px`, transform: `scale(${scale})` });
        }
        layout(); previewResize?.disconnect(); previewResize = new ResizeObserver(layout); previewResize.observe(area);
        frame.addEventListener('load', async () => {
          await frame.contentDocument?.fonts?.ready;
          if (epoch !== readEpoch) return;
          size.width = Math.max(size.width, frame.contentDocument.documentElement.scrollWidth);
          size.height = Math.max(size.height, frame.contentDocument.documentElement.scrollHeight);
          layout();
        }, { once: true });
        frame.srcdoc = beforeHTML(result.html, id, location.href);
        preview.querySelector('[data-review-close-preview]').focus();
      } catch (e) { toast(e.message, 6000); }
      finally { b.disabled = false; }
      return;
    }
    busy = true; update(state);
    try { await persistence().reviewAction(command === 'accept-all' ? 'accept' : command, command === 'accept-all' ? 'all' : id, state.review.generation); }
    catch (e) { toast(e.message, 6000); }
    finally { busy = false; update(state); }
  });
  preview.querySelector('[data-review-close-preview]').addEventListener('click', closePreview);
  function key(e) {
    if (preview.hidden && panel.hidden) return false;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (!preview.hidden) closePreview(); else close(); return true; }
    if (e.key === 'Tab' && !preview.hidden) {
      e.preventDefault(); e.stopImmediatePropagation(); preview.querySelector('[data-review-close-preview]').focus(); return true;
    }
    return false;
  }
  return { update, key };
}

export function reviewHTML() {
  return `<section id="ai-review" class="review-panel" role="region" aria-label="AI 修改审阅" hidden><div class="review-heading"><strong>AI 修改</strong><button type="button" data-review-command="close" class="icon-only" aria-label="关闭审阅">${icon('X')}</button></div><p class="review-message"></p><div class="review-list"></div><div class="review-footer"><button type="button" data-review-command="accept-all" class="primary">全部接受</button><span>审阅记录保存在本地服务</span></div></section><section class="review-preview" role="dialog" aria-modal="true" aria-label="修改前只读预览" hidden><div class="review-preview-bar"><strong class="review-preview-title"></strong><span>只读 · 正式画布保留修改后结果</span><button type="button" data-review-close-preview>返回修改后 ${icon('X')}</button></div><div class="review-frame"></div></section>`;
}
