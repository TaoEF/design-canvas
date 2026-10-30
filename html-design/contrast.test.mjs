import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { chromium } from 'playwright';
import { browserOptions } from './export.mjs';
import { measureDocumentText } from './text-measure.mjs';
const html = (body, css = '') => `<!doctype html><html><head><style>body{margin:0;color:black;background:white}[data-artboard]{position:relative;width:900px;height:1200px;background:white}p{margin:0;font:20px/28px Arial;width:350px} ${css}</style></head><body><main data-stage><section data-artboard="p1">${body}</section></main></body></html>`;
const p = (id, top, text, style = '', attrs = '') => `<p data-el="${id}" style="position:absolute;left:40px;top:${top}px;${style}" ${attrs}>${text}</p>`;
const qa = source => measureDocumentText({ mode: 'qa', html: source });
const contrast = r => r.issues.filter(i => ['TEXT_LOW_CONTRAST', 'CONTRAST_UNVERIFIED'].includes(i.code));

test('contrast finds inherited white labels independently of unsupported layout; black fixes remove only those diagnostics', async () => {
  const source = color => html(`<div style="color:white">${p('yellow', 40, 'Local expression', `display:flex;align-items:center;background:#ffce32;${color}`)}${p('same', 100, 'Budget gate', `background:white;${color}`)}</div>${p('rotated', 220, 'Rotated text', 'rotate:12deg;color:#aaa')}`);
  const bad = await qa(source(''));
  const yellow = contrast(bad).find(i => i.elementId === 'yellow'), same = contrast(bad).find(i => i.elementId === 'same');
  assert.equal(yellow.code, 'TEXT_LOW_CONTRAST'); assert.equal(yellow.evidence.foreground, '#ffffff'); assert.equal(yellow.evidence.background, '#ffce32'); assert.ok(yellow.evidence.ratio < 2);
  assert.equal(same.code, 'CONTRAST_UNVERIFIED'); assert.equal(same.evidence.reason, 'possible-same-color'); assert.equal(same.evidence.ratio, 1);
  assert.equal(same.evidence.page, 1); assert.equal(same.evidence.required, 4.5);
  assert.ok(contrast(bad).some(i => i.elementId === 'rotated'), 'rotated layout does not skip contrast');
  assert.ok(bad.issues.some(i => ['LINE_UNSUPPORTED', 'TEXT_UNSUPPORTED'].includes(i.code)));
  const fixed = await qa(source('color:black;'));
  assert.ok(!contrast(fixed).some(i => ['yellow', 'same'].includes(i.elementId)));
  assert.equal(fixed.coverage.contrast.checked, 3); assert.equal(fixed.coverage.contrast.low, 1);
});

test('axe classifies AA thresholds, alpha/ancestor backgrounds and design-size large text across all pages and stage zoom', async () => {
  const body = p('normal-fail', 20, 'Normal fail', 'color:#777') + p('normal-pass', 80, 'Normal pass', 'color:#767676') +
    p('large-pass', 140, 'Large pass', 'font-size:24px;color:#949494') + p('large-fail', 200, 'Large fail', 'font-size:24px;color:#959595') +
    p('bold-pass', 260, 'Bold large pass', 'font-size:19px;font-weight:700;color:#949494') + p('small-fail', 320, 'Not large', 'font-size:23px;color:#949494') +
    `<div style="background:white">${p('alpha', 380, 'Alpha foreground', 'color:rgba(0,0,0,.5);background:transparent')}</div>` +
    p('offscreen', 1000, 'Below viewport', 'color:#aaa');
  const results = [];
  for (const scale of [.5, 2]) results.push(await qa(html(body, `[data-stage]{transform:scale(${scale});zoom:${scale}}`).replace('</main>', `<section data-artboard="p2">${p('second', 40, 'Second page', 'color:#bbb')}</section></main>`)));
  assert.deepEqual(results[0], results[1]);
  const r = results[0], low = contrast(r).filter(i => i.code === 'TEXT_LOW_CONTRAST');
  assert.deepEqual(low.map(i => i.elementId).sort(), ['alpha', 'large-fail', 'normal-fail', 'offscreen', 'second', 'small-fail'].sort());
  assert.equal(low.find(i => i.elementId === 'large-fail').evidence.required, 3);
  assert.equal(low.find(i => i.elementId === 'normal-fail').evidence.required, 4.5);
  assert.equal(low.find(i => i.elementId === 'second').evidence.page, 2);
  assert.equal(r.coverage.contrast.checked, 9); assert.equal(r.coverage.contrast.low, 6);
});

test('uncertain backgrounds, overlap and unreported visible text stay incomplete; hidden and disabled controls are counted separately', async () => {
  const r = await qa(html(p('gradient', 20, 'Gradient', 'background:linear-gradient(white,black);color:black') +
    p('image', 80, 'Image background', 'background-image:url(data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E)') +
    p('blend', 140, 'Blend', 'mix-blend-mode:multiply') + p('covered', 200, 'Covered') +
    '<div data-el="cover" style="position:absolute;left:40px;top:200px;width:350px;height:28px;background:white"></div>' +
    p('hidden', 260, 'Hidden', 'opacity:0;color:white') + '<button disabled style="position:absolute;top:320px">Disabled</button>' +
    '<p style="position:absolute;top:380px;color:#aaa">Unmarked visible</p>' +
    p('empty-report', 440, 'Ignored by accessibility engine', '', 'aria-hidden="true"')));
  assert.equal(r.status, 'issues'); assert.equal(r.coverage.contrast.complete, false);
  assert.equal(r.coverage.contrast.hidden, 1); assert.equal(r.coverage.contrast.inapplicable, 1); assert.equal(r.coverage.contrast.unmarked, 1);
  for (const id of ['gradient', 'image', 'blend', 'covered']) assert.ok(contrast(r).some(i => i.elementId === id && i.code === 'CONTRAST_UNVERIFIED'), JSON.stringify(r));
  assert.ok(!contrast(r).some(i => ['hidden', 'empty-report'].includes(i.elementId)));
  assert.equal(r.coverage.contrast.checked, 2, 'aria-hidden does not exclude visually present text');
  assert.ok(contrast(r).some(i => i.elementId === null));
});

test('contrast exemptions are scoped to known low contrast; same-color unknowns and invalid identifiers cannot become clean', async () => {
  const long = '界'.repeat(20000);
  const r = await qa(html(p('ignore', 20, 'Deliberate low', 'color:#aaa', 'data-qa-ignore="TEXT_LOW_CONTRAST"') +
    p('unknown', 80, 'Same', 'color:white', 'data-qa-ignore="CONTRAST_UNVERIFIED TEXT_LOW_CONTRAST"') +
    p('duplicate', 140, 'Duplicate one', 'color:#aaa') + p('duplicate', 200, 'Duplicate two', 'color:#aaa') + p(long, 260, 'Long identifier', 'color:#aaa')));
  assert.equal(r.coverage.contrast.suppressed, 1); assert.equal(r.coverage.suppressed, 1);
  assert.ok(!contrast(r).some(i => i.elementId === 'ignore'));
  assert.ok(contrast(r).some(i => i.elementId === 'unknown' && i.code === 'CONTRAST_UNVERIFIED'));
  assert.equal(contrast(r).filter(i => i.elementId === null).length, 3);
  assert.ok(!JSON.stringify(r).includes(long)); assert.ok(Buffer.byteLength(JSON.stringify(r)) < 160 * 1024);
  const many = await qa(html(Array.from({ length: 501 }, (_, i) => p(`t${i}`, i * 30, 'Low', 'color:#aaa')).join('')));
  assert.equal(many.truncated, true); assert.equal(many.coverage.contrast.truncated, true); assert.equal(many.coverage.contrast.complete, false);
  assert.ok(many.coverage.issueBytes <= 128 * 1024); assert.ok(many.issues.length <= 500); assert.ok(Buffer.byteLength(JSON.stringify(many)) < 160 * 1024);
});

test('QA CSP blocks inline/external/module/event scripts and frames despite content CSP; original text is still diagnosed', async () => {
  const requests = [];
  const server = http.createServer((req, res) => { requests.push(req.url); res.writeHead(200, { 'content-type': req.url === '/image.svg' ? 'image/svg+xml' : 'text/javascript' }); res.end(req.url === '/image.svg' ? '<svg xmlns="http://www.w3.org/2000/svg"/>' : 'document.body.remove();fetch("/executed")'); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/deck.html`;
    const source = html(p('unsafe', 20, 'Must remain white', 'color:white') + `<script>document.body.remove();fetch('/inline')</script><script src="external.js"></script><script type="module" src="module.js"></script><img style="position:absolute;left:600px;top:800px" src="image.svg" onload="document.body.remove();fetch('/event')"><iframe style="position:absolute;left:600px;top:900px" src="frame.html"></iframe><iframe style="position:absolute;left:600px;top:1000px" srcdoc="<script>parent.document.body.remove()</script>"></iframe>`).replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="script-src * \'unsafe-inline\' \'unsafe-eval\'">');
    const r = await measureDocumentText({ mode: 'qa', html: source, baseUrl });
    assert.ok(contrast(r).some(i => i.elementId === 'unsafe' && i.evidence.reason === 'possible-same-color'));
    assert.ok(requests.includes('/image.svg')); assert.deepEqual(requests.filter(v => v !== '/image.svg'), []);
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});

// Exercise failure normalization in the real trusted browser bundle without changing
// the public CLI contract or supplying an untrusted engine from the document.
test('missing contrast engine and visible text without engine nodes produce incomplete coverage; javascript URLs remain blocked', async () => {
  const browser = await chromium.launch(browserOptions());
  try {
    const page = await browser.newPage();
    await page.route('http://127.0.0.1/fixture', r => r.fulfill({ body: html(p('text', 20, 'Visible') + '<a id="js" href="javascript:document.body.remove()">Link</a>'), contentType: 'text/html', headers: { 'Content-Security-Policy': "script-src 'none'; object-src 'none'; frame-src 'none'" } }));
    await page.goto('http://127.0.0.1/fixture');
    await page.evaluate(() => document.querySelector('#js').click());
    await page.evaluate(await readFile(new URL('./text-measure.js', import.meta.url), 'utf8'));
    const missing = await page.evaluate(() => globalThis.__htmlDesignText.checkDocument({ qa: true }));
    assert.equal(missing.coverage.contrast.checked, 0); assert.equal(missing.coverage.contrast.unverified, 2);
    assert.ok(contrast(missing).every(i => i.evidence.reason === 'engine-failed'));
    await page.evaluate(() => { globalThis.axe = { version: '4.10.3', run: async () => ({ passes: [], violations: [], incomplete: [], inapplicable: [] }) }; });
    const absent = await page.evaluate(() => globalThis.__htmlDesignText.checkDocument({ qa: true }));
    assert.equal(absent.coverage.contrast.complete, false); assert.ok(contrast(absent).every(i => i.evidence.reason === 'no-engine-report'));
  } finally { await browser.close(); }
});

test('generated/SVG text and saved form values do not disappear from the contrast inventory', async () => {
  const r = await qa(html('<span data-el="generated" class="generated" style="position:absolute;left:40px;top:20px"></span><svg data-el="vector" style="position:absolute;left:40px;top:100px;width:300px;height:60px"><text x="0" y="30">Vector text</text></svg><input data-el="value" value="Saved value" style="position:absolute;left:40px;top:200px;color:#aaa;background:white;font-size:20px">', '.generated::before{content:"Generated text";color:#aaa}'));
  assert.equal(r.coverage.contrast.seen, 3);
  for (const id of ['generated', 'vector']) assert.ok(contrast(r).some(i => i.elementId === id && i.code === 'CONTRAST_UNVERIFIED'));
  assert.ok(contrast(r).some(i => i.elementId === 'value'), JSON.stringify(r));
  assert.equal(r.coverage.contrast.complete, false);
});
