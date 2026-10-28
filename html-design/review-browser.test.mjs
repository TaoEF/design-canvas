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
  const show = async () => { await page.locator('.review-trigger').waitFor({ state: 'visible' }); if (await page.locator('.review-panel').isHidden()) await page.locator('.review-trigger').click(); };
  return { page, file, call, ai, load, row, show, ctx };
}

test('F01/F02/F03/C04/C05: owner preview reviews pages, before is isolated, accept preserves bytes and undo resets history', async t => {
  const f = await fixture(t, 'basic'); await f.load();
  await f.ai(h => h.replace('Original one', 'AI one').replace('Original two', 'AI two'));
  await f.page.locator('[data-el=p1-title]').filter({ hasText: 'AI one' }).waitFor(); await f.show();
  assert.equal(await f.page.locator('.review-item').count(), 2);
  const bytes = await readFile(f.file, 'utf8');
  await f.row('p1').getByRole('button', { name: '修改前', exact: true }).click();
  await f.page.locator('.review-preview:not([hidden])').waitFor();
  const frame = f.page.frameLocator('iframe[title="AI 修改前，只读预览"]');
  await frame.locator('[data-el=p1-title]').filter({ hasText: 'Original one' }).waitFor();
  assert.equal(await frame.locator('[data-artboard]').count(), 1);
  assert.equal(await f.page.locator('main [data-el=p1-title]').textContent(), 'AI one');
  assert.equal(await frame.locator('base').getAttribute('href'), `${origin}/demos/basic.html`);
  assert.equal(await frame.locator('[data-el=p1-relative]').evaluate(n => n.complete && n.naturalWidth), 20);
  assert.equal(await frame.locator('body').evaluate(n => getComputedStyle(n).getPropertyValue('--review-asset').trim()), 'loaded');
  assert.equal(await f.page.locator('iframe[title="AI 修改前，只读预览"]').getAttribute('sandbox'), 'allow-same-origin');
  await f.page.keyboard.press('Escape'); assert.ok(await f.page.locator('.review-preview').isHidden());
  await f.row('p1').getByRole('button', { name: '接受', exact: true }).click();
  await f.page.waitForFunction(() => document.querySelector('html-design-editor').shadowRoot.querySelectorAll('.review-item').length === 1);
  assert.equal(await readFile(f.file, 'utf8'), bytes);
  await f.row('p2').getByRole('button', { name: '撤回', exact: true }).click();
  await f.page.locator('.review-trigger').waitFor({ state: 'hidden' });
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
  await f.row('p1').getByRole('button', { name: '撤回', exact: true }).click();
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
  await viewer.locator('[data-review-command=before]').click();
  const frame = viewer.frameLocator('iframe[title="AI 修改前，只读预览"]');
  await frame.locator('[data-el=p1-title]').waitFor();
  assert.equal(await frame.locator('script,iframe,object,form,meta[http-equiv=refresh],[onclick],[autofocus]').count(), 0);
  assert.equal(await viewer.evaluate(() => window.baselineRan), undefined);
  assert.equal(await f.page.evaluate(() => window.baselineRan), undefined);
  await f.show(); await f.page.locator('[data-review-command=before]').click();
  await f.page.locator('[data-act=export]').click();
  const event = f.page.waitForEvent('download'); await f.page.locator('[data-act=download]').click();
  const download = await event, downloaded = await readFile(await download.path(), 'utf8');
  // Exclude bundled source from markup assertions.
  const content = downloaded.replace(/<script data-editor(?:="")?>[\s\S]*?<\/script>/, '');
  assert.match(content, /Safe after/); assert.doesNotMatch(content, /baselineRan|data-editor-connection|review-preview|Original one|html-design-editor/);
  for (const format of ['pdf', 'pptx']) {
    await f.page.locator('[data-act=export]').click();
    const [output] = await Promise.all([f.page.waitForEvent('download'), f.page.locator(`[data-act=${format}]`).click()]);
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
  assert.ok(await offlinePage.locator('.review-trigger').isHidden());
  await offlinePage.locator('[data-act=edit]').click(); await offlinePage.locator('html[data-editing]').waitFor();
  assert.equal((await fetch(`${origin}/.html-design/reviews/state.json`)).status, 403);
});

test('F01/F03: deleted page can be restored; global changes expose a single document review; narrow panel remains operable', async t => {
  const f = await fixture(t, 'deleted'); await f.load();
  await f.ai(h => h.replace(pageHTML('p2', 'Original two'), ''));
  await f.show(); assert.match(await f.row('p2').textContent(), /删除/);
  await f.row('p2').getByRole('button', { name: '撤回', exact: true }).click();
  await f.page.locator('.review-trigger').waitFor({ state: 'hidden' });
  assert.equal(await f.page.locator('[data-artboard]').count(), 2);
  await f.ai(h => h.replace('background:#eee', 'background:#ddd'));
  await f.show(); assert.equal(await f.page.locator('.review-item').count(), 1); assert.match(await f.page.locator('.review-message').textContent(), /整份文档/);
  await f.page.locator('[data-review-command=before]').click();
  await f.page.waitForFunction(() => {
    const area = document.querySelector('html-design-editor').shadowRoot.querySelector('.review-frame');
    return area.scrollHeight > area.clientHeight;
  });
  assert.equal(await f.page.frameLocator('iframe[title="AI 修改前，只读预览"]').locator('[data-artboard]').count(), 2);
  await f.page.setViewportSize({ width: 390, height: 844 });
  await f.page.waitForFunction(() => {
    const s = document.querySelector('html-design-editor').shadowRoot, canvas = s.querySelector('.review-scaled').getBoundingClientRect(), area = s.querySelector('.review-frame').getBoundingClientRect();
    return canvas.x >= area.x && canvas.right <= area.right;
  });
  await f.page.keyboard.press('Escape');
  const panel = await f.page.locator('.review-panel').boundingBox(); assert.ok(panel.x >= 0 && panel.x + panel.width <= 390);
  await f.page.locator('[data-review-command=accept-all]').click(); await f.page.locator('.review-trigger').waitFor({ state: 'hidden' });
});

test('B01/F05: latest unsaved human text is yielded into the actual before baseline', async t => {
  const f = await fixture(t, 'latest'); await f.load();
  await f.page.locator('[data-act=edit]').click(); await f.page.locator('[data-el=p1-title]').dblclick();
  await f.page.locator('[contenteditable=true]').fill('Latest human before handoff');
  await f.ai(h => h.replace('Latest human before handoff', 'Latest human plus AI'));
  await f.page.locator('[data-el=p1-title]').filter({ hasText: 'Latest human plus AI' }).waitFor(); await f.show();
  await f.row('p1').getByRole('button', { name: '修改前', exact: true }).click();
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
    await f.row('p1').getByRole('button', { name: '撤回', exact: true }).click(); await response;
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
