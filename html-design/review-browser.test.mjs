import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createPreviewServer } from './server.mjs';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
const pageHTML = (id, text) => `<section data-artboard="${id}" data-title="${id}" data-mode="flow"><h1 data-el="${id}-title">${text}</h1></section>`;
let root, server, origin, browser, editor;
before(async () => {
  root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'review-browser-'))); await mkdir(path.join(root, 'demos'));
  editor = await readFile('html-design/editor.js', 'utf8');
  server = await createPreviewServer({ root, port: 0 }); origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'chrome' } : {});
});
after(async () => { await browser?.close(); if (server) await new Promise(r => server.close(r)); if (root) await rm(root, { recursive: true, force: true }); });
async function fixture(t, name, extra = '') {
  const source = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Review fixture</title><style>body{margin:0}[data-artboard]{width:800px;height:450px;padding:50px;background:#eee}h1{font:40px Arial}</style></head><body><main data-stage>${pageHTML('p1', 'Original one')}${pageHTML('p2', 'Original two')}</main>${extra}<script data-editor>${editor}</script></body></html>`;
  const file = path.join(root, 'demos', name + '.html');
  await writeFile(path.join(root, 'demos', name + '-asset.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>');
  await writeFile(path.join(root, 'demos', name + '-asset.css'), 'body{--review-asset:loaded}');
  await writeFile(file, source.replace('</head>', `<link rel="stylesheet" href="${name}-asset.css"></head>`).replace('</h1>', `</h1><img data-el="p1-relative" src="${name}-asset.svg" width="20" height="20">`));
  const ctx = await browser.newContext(), page = await ctx.newPage(); t.after(() => ctx.close());
  const call = async (action, body = {}) => { const r = await fetch(`${origin}/__html-design/document/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: `/demos/${name}.html`, ...body }) }); assert.equal(r.status, 200, await r.clone().text()); return r.json(); };
  const ai = async transform => {
    const started = await call('ai/begin'); let ready;
    for (let i = 0; i < 100; i++) { ready = await call('ai/status', { token: started.token }); if (ready.ready) break; await new Promise(r => setTimeout(r, 100)); }
    assert.ok(ready.ready);
    return call('ai/commit', { token: started.token, revision: ready.revision, html: transform(ready.html) });
  };
  const load = async () => { await page.goto(`${origin}/demos/${name}.html`); await page.locator('.state-text').filter({ hasText: /^已保存$/ }).waitFor(); };
  const row = id => page.locator('.review-item').filter({ has: page.locator(`[data-review-id="${id}"]`) });
  const show = async () => { await page.locator('.review-actions:not([hidden]),.review-summary:not([hidden])').first().waitFor(); if (await page.locator('.review-summary').isVisible() && await page.locator('.review-panel').isHidden()) await page.locator('.review-trigger').click(); };
  const action = (id, command) => page.locator(`.review-actions:not([hidden]) [data-review-id="${id}"][data-review-command=${command}],.review-panel:not([hidden]) [data-review-id="${id}"][data-review-command=${command}]`).first();
  return { page, file, call, ai, load, row, show, ctx, action };
}

test('F01/F02/F03/C04/C05: owner preview reviews pages, before is isolated, accept preserves bytes and undo resets history', async t => {
  const f = await fixture(t, 'basic'); await f.load();
  await f.ai(h => h.replace('Original one', 'AI one').replace('Original two', 'AI two'));
  await f.page.locator('[data-el=p1-title]').filter({ hasText: 'AI one' }).waitFor(); await f.show();
  assert.equal(await f.page.locator('.review-item').count(), 2);
  const bytes = await readFile(f.file, 'utf8');
  await f.action('p1', 'undo').hover();
  await f.page.locator('.review-before:not([hidden])').waitFor();
  const frame = f.page.frameLocator('iframe[title="AI 修改前，只读预览"]');
  await frame.locator('[data-el=p1-title]').filter({ hasText: 'Original one' }).waitFor();
  assert.equal(await frame.locator('[data-artboard]').count(), 2, 'retain sibling DOM for contextual CSS; project only the target');
  assert.equal(await f.page.locator('main [data-el=p1-title]').textContent(), 'AI one');
  assert.equal(await frame.locator('base').getAttribute('href'), `${origin}/demos/basic.html`);
  assert.equal(await frame.locator('[data-el=p1-relative]').evaluate(n => n.complete && n.naturalWidth), 20);
  assert.equal(await frame.locator('body').evaluate(n => getComputedStyle(n).getPropertyValue('--review-asset').trim()), 'loaded');
  assert.equal(await f.page.locator('iframe[title="AI 修改前，只读预览"]').getAttribute('sandbox'), 'allow-same-origin');
  await f.page.keyboard.press('Escape'); assert.ok(await f.page.locator('.review-before').isHidden());
  await f.action('p1', 'accept').click();
  await f.page.waitForFunction(() => document.querySelector('html-design-editor').shadowRoot.querySelectorAll('.review-item').length === 1);
  assert.equal(await readFile(f.file, 'utf8'), bytes);
  await f.action('p2', 'undo').click();
  await f.page.locator('.review-summary').waitFor({ state: 'hidden' }); await f.page.locator('.review-actions').waitFor({ state: 'hidden' });
  assert.equal(await f.page.locator('[data-el=p1-title]').textContent(), 'AI one');
  await f.page.locator('[data-act=edit]').click();
  assert.ok(await f.page.locator('[data-act=undo]').isDisabled());
  await f.page.locator('[data-act=next]').first().click();
  assert.equal(await f.page.locator('[data-el=p2-title]').textContent(), 'Original two');
  await f.page.locator('[data-el=p2-title]').dblclick(); await f.page.locator('[contenteditable=true]').fill('Human after undo'); await f.page.keyboard.press('Escape');
  assert.ok(await f.page.locator('[data-act=undo]').isEnabled());
});

test('C01/C03: active typing flushes before review; stale target never overwrites manual text', async t => {
  const f = await fixture(t, 'manual'); await f.load();
  await f.ai(h => h.replace('Original one', 'AI one').replace('Original two', 'AI two'));
  await f.page.locator('[data-el=p1-title]').filter({ hasText: 'AI one' }).waitFor(); await f.show();
  await f.page.locator('[data-act=edit]').click();
  await f.page.locator('[data-el=p1-title]').dblclick(); await f.page.locator('[contenteditable=true]').fill('Manual wins');
  await f.action('p1', 'undo').click();
  await f.page.locator('.toast').filter({ hasText: /已有更新/ }).waitFor();
  assert.match(await readFile(f.file, 'utf8'), /Manual wins/); assert.doesNotMatch(await readFile(f.file, 'utf8'), /Original one/);
  assert.equal(await f.page.locator('.review-item').count(), 1);
  assert.ok(await f.row('p2').isVisible());
});

test('D01/D04/F04: viewer can read sanitized before; scripts/navigation/forms cannot run; download stays after-only', async t => {
  const malicious = `<script>window.baselineRan=true</script><meta http-equiv="refresh" content="0;url=/evil.html"><div onclick="window.clicked=true"><form><input autofocus><button>Submit</button></form><iframe src="/evil.html"></iframe><object data="/evil.html"></object><a href="javascript:alert(1)">Link</a></div>`;
  const f = await fixture(t, 'safe', malicious);
  await f.ai(h => h.replace(malicious, '').replace('Original one', 'Safe after'));
  await f.load();
  const viewer = await f.ctx.newPage(); await viewer.goto(`${origin}/demos/safe.html`); await viewer.locator('.state-text').filter({ hasText: /只读/ }).waitFor();
  await viewer.locator('.review-trigger').click();
  assert.ok(await viewer.locator('[data-review-command=accept-all]').isDisabled());
  let viewerWrites = 0; viewer.on('request', r => { if (/document\/review\/(undo|accept)$/.test(r.url())) viewerWrites++; });
  await viewer.locator('.review-actions [data-review-command=undo]').focus();
  await viewer.keyboard.press('Enter'); await viewer.keyboard.press('Space'); await viewer.locator('.review-actions [data-review-command=undo]').evaluate(n => n.click()); assert.equal(viewerWrites, 0);
  const frame = viewer.frameLocator('iframe[title="AI 修改前，只读预览"]');
  await frame.locator('[data-el=p1-title]').waitFor();
  assert.equal(await frame.locator('script,iframe,object,form,meta[http-equiv=refresh],[onclick],[autofocus]').count(), 0);
  assert.equal(await viewer.evaluate(() => window.baselineRan), undefined);
  assert.equal(await f.page.evaluate(() => window.baselineRan), undefined);
  await f.show(); await f.page.locator('.review-actions [data-review-command=undo]').focus();
  await f.page.locator('[data-act=export]').evaluate(n => n.click());
  const event = f.page.waitForEvent('download'); await f.page.locator('[data-act=download]').evaluate(n => n.click());
  const download = await event, downloaded = await readFile(await download.path(), 'utf8');
  // Exclude bundled source from markup assertions.
  const content = downloaded.replace(/<script data-editor(?:="")?>[\s\S]*?<\/script>/, '');
  assert.match(content, /Safe after/); assert.doesNotMatch(content, /baselineRan|data-editor-connection|review-preview|Original one|html-design-editor/);
  for (const format of ['pdf', 'pptx']) {
    await f.page.locator('[data-act=export]').evaluate(n => n.click());
    const [output] = await Promise.all([f.page.waitForEvent('download'), f.page.locator(`[data-act=${format}]`).evaluate(n => n.click())]);
    const bytes = await readFile(await output.path());
    if (format === 'pdf') assert.equal((await PDFDocument.load(bytes)).getPageCount(), 2);
    else {
      const zip = await JSZip.loadAsync(bytes), slides = await Promise.all(Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).map(n => zip.file(n).async('string')));
      assert.equal(slides.length, 2); assert.match(slides.join(''), /Safe after/); assert.doesNotMatch(slides.join(''), /Original one|baselineRan/);
    }
  }
  const offline = path.join(root, 'downloaded-offline.html'); await writeFile(offline, downloaded);
  const offlinePage = await f.ctx.newPage(); await offlinePage.goto('file://' + offline);
  await offlinePage.locator('.state-text').filter({ hasText: /离线/ }).waitFor();
  assert.ok(await offlinePage.locator('.review-summary').isHidden()); assert.ok(await offlinePage.locator('.review-actions').isHidden());
  await offlinePage.locator('[data-act=edit]').click(); await offlinePage.locator('html[data-editing]').waitFor();
  assert.equal((await fetch(`${origin}/.html-design/reviews/state.json`)).status, 403);
});

test('F01/F03: deleted page can be restored; global changes expose a single document review; narrow panel remains operable', async t => {
  const f = await fixture(t, 'deleted'); await f.load();
  await f.ai(h => h.replace(pageHTML('p2', 'Original two'), ''));
  await f.show(); assert.match(await f.row('p2').textContent(), /删除/);
  await f.action('p2', 'undo').click();
  await f.page.locator('.review-summary').waitFor({ state: 'hidden' }); await f.page.locator('.review-actions').waitFor({ state: 'hidden' });
  assert.equal(await f.page.locator('[data-artboard]').count(), 2);
  await f.ai(h => h.replace('background:#eee', 'background:#ddd'));
  await f.show(); assert.equal(await f.page.locator('.review-item').count(), 1); assert.match(await f.page.locator('.review-message').textContent(), /整份文档/);
  await f.action('document', 'undo').hover();
  await f.page.frameLocator('iframe[title="AI 修改前，只读预览"]').locator('[data-review-projection-target]').waitFor();
  assert.equal(await f.page.frameLocator('iframe[title="AI 修改前，只读预览"]').locator('[data-review-projection-target]').count(), 1, 'document review projects the current page without pretending the action is page-scoped');
  await f.page.setViewportSize({ width: 390, height: 844 });
  await f.page.waitForFunction(() => {
    const s = document.querySelector('html-design-editor').shadowRoot, canvas = s.querySelector('.review-actions').getBoundingClientRect();
    return canvas.x >= 0 && canvas.right <= innerWidth;
  });
  await f.page.keyboard.press('Escape');
  if (await f.page.locator('.review-panel').isHidden()) await f.page.locator('.review-trigger').click();
  const panel = await f.page.locator('.review-panel').boundingBox(); assert.ok(panel.x >= 0 && panel.x + panel.width <= 390);
  await f.page.locator('[data-review-command=accept-all]').click(); await f.page.locator('.review-summary').waitFor({ state: 'hidden' }); await f.page.locator('.review-actions').waitFor({ state: 'hidden' });
});

test('B01/F05: latest unsaved human text is yielded into the actual before baseline', async t => {
  const f = await fixture(t, 'latest'); await f.load();
  await f.page.locator('[data-act=edit]').click(); await f.page.locator('[data-el=p1-title]').dblclick();
  await f.page.locator('[contenteditable=true]').fill('Latest human before handoff');
  await f.ai(h => h.replace('Latest human before handoff', 'Latest human plus AI'));
  await f.page.locator('[data-el=p1-title]').filter({ hasText: 'Latest human plus AI' }).waitFor(); await f.show();
  await f.action('p1', 'undo').hover();
  await f.page.frameLocator('iframe[title="AI 修改前，只读预览"]').locator('[data-el=p1-title]').filter({ hasText: 'Latest human before handoff' }).waitFor();
  assert.match(await readFile(f.file, 'utf8'), /Latest human plus AI/);
});

test('F05: delayed pre-takeover heartbeat cannot cancel one-click editing intent while the old save is gated', async t => {
  const f = await fixture(t, 'handoff'); await f.load();
  await f.page.locator('[data-act=edit]').click(); await f.page.locator('[data-el=p1-title]').dblclick();
  const b = await f.ctx.newPage(); await b.goto(`${origin}/demos/handoff.html`); await b.locator('.state-text').filter({ hasText: /只读/ }).waitFor();
  let releaseSave, saveStarted, releaseSync, syncStarted, repeated;
  const saveGate = new Promise(r => releaseSave = r), saving = new Promise(r => saveStarted = r), syncGate = new Promise(r => releaseSync = r), synced = new Promise(r => syncStarted = r), repeat = new Promise(r => repeated = r);
  let held = false, takeovers = 0;
  await f.page.route('**/__html-design/document/save', async route => { saveStarted(); await saveGate; await route.continue(); });
  await b.route('**/__html-design/document/sync', async route => {
    if (held) return route.continue(); held = true;
    const response = await route.fetch(); syncStarted(); await syncGate; await route.fulfill({ response });
  });
  await b.route('**/__html-design/document/takeover', async route => { takeovers++; await route.continue(); if (takeovers === 2) repeated(); });
  try {
    await f.page.locator('[data-el=p1-title]').fill('Latest gated human text'); await saving;
    await synced; // Hold a viewer heartbeat whose server result predates takeover.
    await b.locator('[data-act=edit]').click();
    await b.waitForFunction(() => document.querySelector('html-design-editor').shadowRoot.querySelector('[data-act=edit]').getAttribute('aria-busy') === 'true');
    releaseSync(); await repeat; releaseSave();
    await b.waitForFunction(() => document.documentElement.hasAttribute('data-editing'), null, { timeout: 10000 });
    assert.equal(await b.locator('[data-el=p1-title]').textContent(), 'Latest gated human text');
    assert.match(await readFile(f.file, 'utf8'), /Latest gated human text/);
  } finally { releaseSave(); releaseSync(); }
});

test('H02: newline-to-space between inline pages actually changes layout and creates document review', async t => {
  const { reviewDiff } = await import('./review-html.mjs');
  const ctx = await browser.newContext(), p = await ctx.newPage(); t.after(() => ctx.close());
  const before = '<!DOCTYPE html><html><head><style>section{display:inline-block;width:100px;height:30px}</style></head><body><main data-stage style="white-space:pre"><section data-artboard="p1"></section>\n<section data-artboard="p2"></section></main></body></html>', after = before.replace('</section>\n<section', '</section> <section');
  await p.setContent(before); const old = await p.locator('[data-artboard=p2]').boundingBox();
  await p.setContent(after); const next = await p.locator('[data-artboard=p2]').boundingBox();
  assert.notEqual(old.y, next.y); assert.notEqual(old.x, next.x); assert.equal(reviewDiff(before, after).scope, 'document');
});

test('H03: pending Undo freezes edit, gestures and source apply until response; connection remains usable afterward', async t => {
  const f = await fixture(t, 'undo-gated'); await f.load();
  await f.ai(h => h.replace('Original one', 'AI gated'));
  await f.page.locator('[data-el=p1-title]').filter({ hasText: 'AI gated' }).waitFor(); await f.show();
  let release, received; const gate = new Promise(r => release = r), response = new Promise(r => received = r);
  await f.page.route('**/__html-design/document/review/undo', async route => { const result = await route.fetch(); received(); await gate; await route.fulfill({ response: result }); });
  try {
    await f.action('p1', 'undo').click(); await response;
    assert.ok(await f.page.locator('[data-act=edit]').isDisabled());
    assert.ok(await f.page.locator('[data-act=page-add]').first().isDisabled());
    await f.page.locator('[data-el=p1-title]').dblclick();
    assert.equal(await f.page.locator('[contenteditable=true]').count(), 0);
    const box = await f.page.locator('[data-el=p1-title]').boundingBox();
    await f.page.mouse.move(box.x + 10, box.y + 10); await f.page.mouse.down(); await f.page.mouse.move(box.x + 60, box.y + 20); await f.page.mouse.up();
    await f.page.locator('[data-act=more]').click(); await f.page.locator('[data-act=source]').click();
    assert.ok(await f.page.locator('textarea').isEditable() === false); assert.ok(await f.page.locator('[data-act=src-apply]').isDisabled());
    await f.page.locator('[data-act=src-close]').click();
    release(); await f.page.locator('[data-el=p1-title]').filter({ hasText: 'Original one' }).waitFor();
    await f.page.locator('[data-act=edit]').click(); await f.page.locator('html[data-editing]').waitFor();
    await f.page.locator('[data-el=p1-title]').dblclick(); await f.page.locator('[contenteditable=true]').fill('Human after gated undo');
    await f.page.waitForFunction(() => document.querySelector('html-design-editor').shadowRoot.querySelector('.state-text').textContent === '已保存');
    assert.match(await readFile(f.file, 'utf8'), /Human after gated undo/);
  } finally { release(); }
});

for (const forced of ['dirty', 'source']) {
  test(`H04: forced ${forced} while Undo response is held keeps draft/DOM and live token without navigation`, async t => {
    const f = await fixture(t, `forced-${forced}`);
    await f.ai(h => h.replace('Original one', 'AI pending'));
    const current = await f.call('read');
    await mkdir(path.join(root, 'runtime'), { recursive: true });
    for (const name of ['persistence.js', 'drafts.js']) await writeFile(path.join(root, 'runtime', name), await readFile(`html-design/src/${name}`));
    await f.page.goto(`${origin}/__html-design/health`);
    await f.page.evaluate(async ({ config, html }) => {
      const { createPersistence } = await import('/runtime/persistence.js');
      window.hSnapshot = html; window.hStates = []; window.hNavigations = 0; window.hDirty = false; window.hSource = false;
      document.body.innerHTML = '<h1>AI pending</h1><textarea></textarea>';
      window.hHarness = createPersistence({ config, serialize: () => window.hSnapshot, pause: () => true, prepareReview: () => true, isBusy: () => false, hasPendingSource: () => window.hSource,
        applyHTML: () => {}, changed: dirty => window.hDirty = dirty, render: state => window.hStates.push(state), reload: () => window.hNavigations++, download: () => {} });
      await window.hHarness.start();
    }, { config: { path: `/demos/forced-${forced}.html`, revision: current.revision }, html: current.html });
    let release, received, saves = 0, releases = 0, badTokens = 0, syncs = 0;
    const gate = new Promise(r => release = r), response = new Promise(r => received = r);
    f.page.on('response', r => { if (r.url().includes('/__html-design/document/') && r.status() === 401) badTokens++; });
    await f.page.route('**/__html-design/document/save', async route => { saves++; await route.continue(); });
    await f.page.route('**/__html-design/document/sync', async route => { syncs++; await route.continue(); });
    await f.page.route('**/__html-design/document/release', async route => { releases++; await route.continue(); });
    await f.page.route('**/__html-design/document/review/undo', async route => { const result = await route.fetch(); received(); await gate; await route.fulfill({ response: result }); });
    try {
      await f.page.evaluate(() => {
        const s = window.hStates.at(-1);
        window.hOutcome = window.hHarness.reviewAction('undo', 'p1', s.review.generation).then(() => 'ok', e => e.message);
      });
      await response;
      await f.page.evaluate(forced => {
        window.hSnapshot = window.hSnapshot.replace('AI pending', 'Forced preserved text');
        document.querySelector('h1').textContent = 'Forced preserved text';
        window.hHarness.markDirty();
        if (forced === 'source') { window.hSource = true; document.querySelector('textarea').value = 'Unapplied source must stay'; }
      }, forced);
      await f.page.waitForTimeout(900); assert.equal(saves, 0, 'automatic save must not race an in-flight review');
      release(); assert.equal(await f.page.evaluate(() => window.hOutcome), 'ok');
      assert.deepEqual(await f.page.evaluate(() => ({ dirty: window.hDirty, navigations: window.hNavigations, conflict: window.hStates.at(-1).conflict, canEdit: window.hHarness.canEdit() })), { dirty: true, navigations: 0, conflict: true, canEdit: false });
      assert.equal(await f.page.locator('h1').textContent(), 'Forced preserved text');
      if (forced === 'source') assert.equal(await f.page.locator('textarea').inputValue(), 'Unapplied source must stay');
      const draftPreserved = await f.page.evaluate(async () => new Promise(resolve => {
        const request = indexedDB.open('html-design-drafts', 1); request.onsuccess = () => { const rows = request.result.transaction('drafts').objectStore('drafts').getAll(); rows.onsuccess = () => resolve(rows.result.some(d => d.html.includes('Forced preserved text'))); };
      }));
      assert.ok(draftPreserved); const previousSyncs = syncs; await f.page.evaluate(() => window.hHarness.retry());
      assert.ok(syncs > previousSyncs, 'retry must still reach the server, rather than remain stuck refreshing');
      assert.equal(releases, 0); assert.equal(badTokens, 0); assert.equal(await f.page.evaluate(() => window.hNavigations), 0);
      assert.match(await readFile(f.file, 'utf8'), /Original one/); assert.doesNotMatch(await readFile(f.file, 'utf8'), /Forced preserved text/);
    } finally { release(); }
  });
}

test('I01/I05/I08: automatic page actions compare on hover/focus without writes or heartbeat flicker', async t => {
  const f = await fixture(t, 'inline-single'); await f.load(); await f.ai(h => h.replace('Original one', 'AI inline'));
  await f.page.locator('[data-el=p1-title]').filter({ hasText: 'AI inline' }).waitFor();
  await f.page.locator('.review-actions:not([hidden])').waitFor();
  assert.ok(await f.page.locator('.review-summary').isHidden()); assert.equal(await f.page.locator('.head .review-trigger').count(), 0);
  const bytes = await readFile(f.file, 'utf8'), before = await f.page.locator('main').evaluate(n => n.outerHTML), revision = (await f.call('read')).revision;
  await f.action('p1', 'undo').hover(); await f.page.locator('.review-before').waitFor({ state: 'visible' });
  await f.page.waitForFunction(() => parseFloat(document.querySelector('html-design-editor').shadowRoot.querySelector('.review-projection').style.width) > 0);
  const source = await f.page.locator('[data-artboard=p1]').boundingBox(), projection = await f.page.locator('.review-projection').boundingBox();
  assert.ok(Math.abs(source.x - projection.x) < 1 && Math.abs(source.y - projection.y) < 1);
  await f.action('p1', 'accept').hover(); assert.ok(await f.page.locator('.review-before').isHidden());
  await f.action('p1', 'undo').focus(); await f.page.locator('.review-before').waitFor({ state: 'visible' });
  await f.page.evaluate(() => window.previewIdentity = document.querySelector('html-design-editor').shadowRoot.querySelector('.review-before iframe'));
  await f.page.waitForTimeout(4200);
  assert.ok(await f.page.evaluate(() => window.previewIdentity === document.querySelector('html-design-editor').shadowRoot.querySelector('.review-before iframe')));
  assert.equal(await f.page.locator('main').evaluate(n => n.outerHTML), before); assert.equal(await readFile(f.file, 'utf8'), bytes); assert.equal((await f.call('read')).revision, revision);
  await f.page.keyboard.press('Tab'); assert.ok(await f.page.locator('.review-before').isHidden());
  await f.action('p1', 'undo').focus(); await f.page.locator('.review-before').waitFor({ state: 'visible' }); await f.page.keyboard.press('Escape'); assert.ok(await f.page.locator('.review-before').isHidden());
  await f.action('p1', 'accept').focus(); await f.action('p1', 'undo').focus(); await f.page.locator('.review-before').waitFor({ state: 'visible' });
  await f.page.locator('[data-act=preview]').evaluate(n => n.click()); await f.page.locator('[data-act=scroll-play]').evaluate(n => n.click());
  await f.page.locator('.review-actions').waitFor({ state: 'hidden' }); assert.ok(await f.page.locator('.review-before').isHidden());
  await f.page.keyboard.press('Escape'); await f.page.locator('.review-actions').waitFor({ state: 'visible' });
  await f.action('p1', 'accept').click(); await f.page.locator('.review-actions').waitFor({ state: 'hidden' }); assert.equal(await readFile(f.file, 'utf8'), bytes);
});

test('I02/I06: controls clamp at fixed pixel size through zoom/pan/sidebar; before keeps second-page CSS and natural size', async t => {
  const f = await fixture(t, 'geometry');
  await writeFile(f.file, (await readFile(f.file, 'utf8')).replace('h1{font:40px Arial}', 'h1{font:40px Arial}[data-stage]{--inherited:rgb(1, 2, 3)}[data-artboard]:nth-child(2)>h1{color:var(--inherited)}[data-artboard]+[data-artboard]{border-left:7px solid green}'));
  await f.load(); await f.ai(h => h.replace('Original two', 'Changed second'));
  await f.page.locator('[data-act=next]').first().click(); await f.page.locator('.review-actions:not([hidden])').waitFor();
  const height = (await f.page.locator('.review-actions').boundingBox()).height;
  async function fits() { await f.page.waitForFunction(() => { const s = document.querySelector('html-design-editor').shadowRoot, r = s.querySelector('.review-actions').getBoundingClientRect(), nav = document.documentElement.hasAttribute('data-editor-nav') ? parseFloat(getComputedStyle(s.host).getPropertyValue('--nav')) || 0 : 0; return r.x >= nav + 7 && r.right <= innerWidth - 7 && r.y >= 59 && r.bottom <= innerHeight - 47; }); assert.equal((await f.page.locator('.review-actions').boundingBox()).height, height); }
  for (const width of [1280, 390]) {
    await f.page.setViewportSize({ width, height: 844 });
    for (const zoom of [.5, 2]) {
      await f.page.locator('[data-act=zoom-reset]').click(); for (let n = 0; n < (zoom === .5 ? 4 : 5); n++) await f.page.locator(`[data-act=zoom-${zoom === .5 ? 'out' : 'in'}]`).click();
      await fits();
      const anchor = await f.page.locator('[data-artboard=p2]').boundingBox();
      await f.action('p2', 'undo').hover(); await f.page.locator('.review-before').waitFor({ state: 'visible' });
      const projected = await f.page.locator('.review-projection').boundingBox(); assert.ok(Math.abs(projected.x - anchor.x) < 1 && Math.abs(projected.y - anchor.y) < 1);
      const frame = f.page.frameLocator('iframe[title="AI 修改前，只读预览"]');
      assert.equal(await frame.locator('[data-artboard=p2]>h1').evaluate(n => getComputedStyle(n).color), 'rgb(1, 2, 3)');
      assert.equal(await frame.locator('[data-artboard=p2]').evaluate(n => getComputedStyle(n).borderLeftWidth), '7px');
      assert.equal(await frame.locator('[data-artboard]').count(), 2);
      await f.action('p2', 'accept').hover();
      await f.page.locator('[data-act=edit]').click();
      for (const [x, y] of [[3000, 0], [-6000, 0], [3000, 3000], [0, -6000]]) { await f.page.mouse.move(width - 25, 300); await f.page.mouse.wheel(x, y); await fits(); }
      await f.page.locator('[data-act=done]').click(); await f.page.locator('[data-act=nav]').click(); await fits(); await f.page.locator('[data-act=nav]').click(); await fits();
    }
  }
  // A global dimension change must show the actual old page width, never stretch it to after.
  await f.page.setViewportSize({ width: 1280, height: 844 }); await f.page.locator('[data-act=zoom-fit]').click();
  await f.ai(h => h.replace('width:800px;height:450px', 'width:1000px;height:450px'));
  await f.page.locator('.review-actions[data-review-scope=document]').waitFor();
  const after = await f.page.locator('[data-artboard=p2]').boundingBox(); await f.action('document', 'undo').hover(); await f.page.locator('.review-before').waitFor({ state: 'visible' });
  const old = await f.page.locator('.review-projection').boundingBox(); assert.ok(old.width < after.width - 50); assert.ok(Math.abs(old.x - after.x) < 1);
});

test('I03/I04: collapsed summary discovers another singleton, supports scrolling rows and retains deleted-last recovery', async t => {
  const f = await fixture(t, 'summary'); await f.load(); await f.ai(h => h.replace('Original two', 'AI other page'));
  await f.page.locator('.review-summary:not([hidden])').waitFor(); assert.ok(await f.page.locator('.review-panel').isHidden()); assert.ok(await f.page.locator('.review-actions').isHidden());
  await f.page.locator('.review-trigger').click(); await f.row('p2').locator('[data-review-command=locate]').click();
  await f.page.locator('.review-actions[data-review-id=p2]').waitFor(); assert.ok(await f.page.locator('.review-summary').isHidden());
  await f.action('p2', 'accept').click(); await f.page.locator('.review-actions').waitFor({ state: 'hidden' });
  await f.ai(h => h.replace('</main>', Array.from({ length: 18 }, (_, i) => pageHTML(`p${i + 3}`, 'A long page title '.repeat(10))).join('') + '</main>'));
  await f.page.locator('.review-summary:not([hidden])').waitFor(); assert.equal(await f.page.locator('.review-trigger').getAttribute('aria-expanded'), 'false');
  await f.page.setViewportSize({ width: 390, height: 844 }); await f.page.locator('.review-trigger').click();
  assert.ok(await f.page.locator('.review-panel').evaluate(n => n.scrollHeight > n.clientHeight));
  const box = await f.page.locator('.review-summary').boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y >= 52 && box.y + box.height <= 804);
  await f.page.locator('[data-review-command=accept-all]').click(); await f.page.locator('.review-summary').waitFor({ state: 'hidden' });
  await f.ai(h => h.replace(/<section data-artboard="p\d+"[\s\S]*?<\/section>/g, ''));
  await f.show();
  for (let id = 2; id <= 20; id++) await f.action(`p${id}`, 'accept').click();
  await f.page.waitForFunction(() => { const s = document.querySelector('html-design-editor').shadowRoot; return s.querySelectorAll('.review-row').length === 1 && s.querySelector('.review-row [data-review-command=undo]').getAttribute('aria-disabled') === 'false'; });
  assert.equal(await f.page.locator('[data-artboard]').count(), 0); assert.ok(await f.page.locator('.review-summary').isVisible());
  await f.action('p1', 'undo').hover(); await f.page.locator('.review-before').waitFor({ state: 'visible' });
  await f.action('p1', 'undo').click(); await f.page.locator('[data-artboard=p1]').waitFor(); assert.equal(await f.page.locator('[data-artboard]').count(), 1);
  assert.equal(await f.page.locator('[data-artboard][data-editor-current]').getAttribute('data-artboard'), 'p1');
});

test('I05: late hover responses after leave/page/generation cannot appear; failures never label after as before', async t => {
  const f = await fixture(t, 'hover-late'); await f.load(); await f.ai(h => h.replace('Original one', 'AI first').replace('Original two', 'AI second')); await f.show();
  let release, received; const gate = new Promise(r => release = r), started = new Promise(r => received = r), generations = [];
  await f.page.route('**/__html-design/document/review/read', async route => {
    generations.push(route.request().postDataJSON().generation); const response = await route.fetch();
    if (generations.length === 1) { received(); await gate; } await route.fulfill({ response });
  });
  try {
    await f.action('p1', 'undo').hover(); await started; await f.action('p1', 'accept').hover();
    await f.action('p2', 'accept').click(); release(); await f.page.waitForTimeout(200); assert.ok(await f.page.locator('.review-before').isHidden());
    await f.action('p1', 'undo').hover(); await f.page.locator('.review-before').waitFor({ state: 'visible' }); assert.ok(generations.at(-1) > generations[0]);
    await f.page.locator('[data-act=next]').first().click(); assert.ok(await f.page.locator('.review-before').isHidden());
  } finally { release(); }
  await f.page.unroute('**/__html-design/document/review/read');
  await f.ai(h => h.replace('AI first', 'AI first again'));
  await f.page.locator('[data-el=p1-title]').filter({ hasText: 'AI first again' }).waitFor({ state: 'attached' });
  await f.page.locator('[data-act=prev]').first().click();
  await f.page.route('**/__html-design/document/review/read', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"before unavailable"}' }));
  await f.action('p1', 'undo').hover(); await f.page.locator('.toast').filter({ hasText: 'before unavailable' }).waitFor(); assert.ok(await f.page.locator('.review-before').isHidden());
  await f.page.unroute('**/__html-design/document/review/read');
  let releasePage, receivedPage; const pageGate = new Promise(r => releasePage = r), pageRead = new Promise(r => receivedPage = r);
  await f.page.route('**/__html-design/document/review/read', async route => { const response = await route.fetch(); receivedPage(); await pageGate; await route.fulfill({ response }); });
  try {
    await f.action('p1', 'accept').hover(); await f.action('p1', 'undo').hover(); await pageRead;
    await f.page.locator('[data-act=next]').first().click(); releasePage(); await f.page.waitForTimeout(150); assert.ok(await f.page.locator('.review-before').isHidden());
    await f.page.locator('[data-act=prev]').first().click(); await f.action('p1', 'undo').hover(); await f.page.locator('.review-before').waitFor({ state: 'visible' });
  } finally { releasePage(); }
});

test('I04/I08: added pages have no fictitious before; touch owners can discard directly', async t => {
  const f = await fixture(t, 'touch-added'); await f.ai(h => h.replace('</main>', pageHTML('p3', 'Added page') + '</main>'));
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } }); t.after(() => ctx.close());
  const p = await ctx.newPage(); let reads = 0; p.on('request', r => { if (r.url().endsWith('/document/review/read')) reads++; });
  await p.goto(`${origin}/demos/touch-added.html`); await p.locator('.state-text').filter({ hasText: /^已保存$/ }).waitFor();
  await p.locator('.review-trigger').tap(); await p.locator('.review-row [data-review-command=locate]').tap();
  await p.locator('.review-actions[data-review-id=p3]').waitFor();
  await p.locator('.review-actions [data-review-command=undo]').focus(); assert.equal(reads, 0); assert.ok(await p.locator('.review-before').isHidden());
  await p.locator('.review-actions [data-review-command=undo]').tap();
  await p.locator('[data-artboard=p3]').waitFor({ state: 'detached' }); assert.equal(await p.locator('[data-artboard]').count(), 2); assert.equal(reads, 0);
});
