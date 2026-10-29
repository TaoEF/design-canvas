import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPreviewServer } from './server.mjs';
import { chromium } from 'playwright';
import { browserOptions } from './export.mjs';
import { elementGeometry, mappedDelta, normalizedAngle, snappedAngle } from './src/geometry.js';

let browser, editor;
before(async () => { browser = await chromium.launch(browserOptions()); editor = await readFile('html-design/editor.js', 'utf8'); });
after(async () => browser?.close());
const near = (a, b, tolerance = .08) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const geometry = (p, id) => p.locator(`[data-el="${id}"]`).evaluate(elementGeometry);
const rect = g => ({ x: g.cx, y: g.cy });
async function open({ parent = '', first = '', second = '', mode = 'artboard', narrow = false } = {}) {
  const p = await browser.newPage({ viewport: narrow ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
  p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  await p.setContent(`<!doctype html><html><head><style>body{margin:0}[data-artboard]{position:relative;width:800px;height:600px;background:#faf9f6}[data-el=parent]{position:absolute;left:80px;top:80px;width:600px;height:400px;${parent}}[data-el=a],[data-el=b]{box-sizing:border-box;margin:0;font:20px/28px Arial;background:#e4edf5;border:2px solid #b0c6da;border-radius:12px;padding:14px}</style></head><body><main data-stage><section data-artboard="p1" data-title="旋转" data-mode="${mode}"><div data-el="parent"><p data-el="a" style="position:absolute;left:80px;top:90px;width:160px;height:84px;${first}">中文 <span style="font-size:16px;color:#47617b">Rich text</span></p><p data-el="b" style="position:absolute;left:360px;top:210px;width:120px;height:70px;${second}">Second</p></div></section><section data-artboard="p2" data-mode="flow" style="display:none"></section></main></body></html>`);
  const script = await p.addScriptTag({ content: editor }); await script.evaluate(n => n.setAttribute('data-editor', ''));
  await p.locator('[data-act=edit]').click(); await zoom(p, 1); return p;
}
async function zoom(p, scale) {
  await p.keyboard.press('Control+0');
  for (let i = 0; i < (scale === .5 ? 4 : scale === 2 ? 5 : 0); i++) await p.keyboard.press(scale === .5 ? 'Control+-' : 'Control+=');
}
async function select(p, id = 'a', shift = false) {
  const g = await geometry(p, id), d = mappedDelta(g.matrix, -g.w / 2 + 5, -g.h / 2 + 5);
  if (shift) await p.keyboard.down('Shift');
  await p.mouse.click(g.cx + d.x, g.cy + d.y);
  if (shift) await p.keyboard.up('Shift');
}
async function rotate(p, delta, { alt = true, shift = false, finish = true } = {}) {
  const frame = await p.locator('.sel').boundingBox(), center = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
  const h = await p.locator('.rotate-handle').boundingBox();
  const radius = Math.hypot(h.x + h.width / 2 - center.x, h.y + h.height / 2 - center.y);
  const initial = Math.atan2(h.y + h.height / 2 - center.y, h.x + h.width / 2 - center.x);
  if (alt) await p.keyboard.down('Alt'); if (shift) await p.keyboard.down('Shift');
  await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await p.mouse.down();
  for (let i = 1; i <= Math.max(4, Math.ceil(Math.abs(delta) / 20)); i++) {
    const angle = initial + delta * i / Math.max(4, Math.ceil(Math.abs(delta) / 20)) * Math.PI / 180;
    await p.mouse.move(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle));
  }
  if (finish) await p.mouse.up();
  if (alt) await p.keyboard.up('Alt'); if (shift) await p.keyboard.up('Shift');
}
async function angleInput(p, value) {
  await p.locator('[data-act=rotation]').click(); await p.locator('.rotation-angle').fill(String(value)); await p.locator('.rotation-angle').press('Enter'); await p.keyboard.press('Escape');
}

test('rotation snap rules keep Alt free, Shift at 15 degrees, and common-angle capture at 3 degrees', () => {
  assert.equal(snappedAngle(88, {}), 90); assert.equal(snappedAngle(-181, {}), -180); assert.equal(snappedAngle(86, {}), 86);
  assert.equal(snappedAngle(37, { shiftKey: true }), 30); assert.equal(snappedAngle(37, { shiftKey: true, altKey: true }), 37);
  assert.equal(normalizedAngle(359), -1); assert.equal(normalizedAngle(-361), -1);
});

test('real rotation handle preserves transformed centers, authored transform/origin, history and exact numeric reset at 50/100/200%', async () => {
  for (const scale of [.5, 1, 2]) {
    const p = await open({ parent: 'rotate:25deg;scale:1.1;transform-origin:10px 20px', first: 'transform:rotate(12deg) scale(1.2);rotate:8deg;transform-origin:10px 50px' });
    try {
      await zoom(p, scale); await select(p); const before = await geometry(p, 'a'), style = await p.locator('[data-el=a]').getAttribute('style');
      near(before.angle, 45); near(before.w, 160); near(before.h, 84);
      await rotate(p, -30); const changed = await geometry(p, 'a'); near(changed.angle, 15); near(changed.cx, before.cx); near(changed.cy, before.cy);
      assert.equal(await p.locator('[data-el=a]').evaluate(n => n.style.transform), 'rotate(12deg) scale(1.2)');
      assert.equal(await p.locator('[data-el=a]').evaluate(n => n.style.transformOrigin), '10px 50px');
      await p.keyboard.press('Control+z'); assert.equal(await p.locator('[data-el=a]').getAttribute('style'), style);
      await p.keyboard.press('Control+Shift+z'); near((await geometry(p, 'a')).angle, 15);
      await angleInput(p, 90); near((await geometry(p, 'a')).angle, 90);
      await p.locator('[data-act=rotation]').click(); await p.locator('[data-act=rotation-reset]').click(); near((await geometry(p, 'a')).angle, 0);
      near((await geometry(p, 'a')).cx, before.cx); near((await geometry(p, 'a')).cy, before.cy); assert.deepEqual(p.errors, []);
    } finally { await p.close(); }
  }
});

test('multi-selection orbits one shared visual center and semantic-container rotation carries descendants', async () => {
  const p = await open();
  try {
    await select(p, 'a'); await select(p, 'b', true);
    const a = await geometry(p, 'a'), b = await geometry(p, 'b'), frame = await p.locator('.sel').boundingBox();
    const c = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
    await rotate(p, 90); const aa = await geometry(p, 'a'), bb = await geometry(p, 'b');
    for (const [old, now] of [[a, aa], [b, bb]]) { near(now.cx, c.x - (old.cy - c.y)); near(now.cy, c.y + old.cx - c.x); near(now.angle, 90); }
    await p.keyboard.press('Control+z'); near((await geometry(p, 'a')).cx, a.cx); near((await geometry(p, 'b')).cy, b.cy);
    await p.keyboard.press('Escape'); await select(p, 'parent'); await rotate(p, -45);
    near((await geometry(p, 'a')).angle, -45); near((await geometry(p, 'b')).angle, -45);
    assert.deepEqual(p.errors, []);
  } finally { await p.close(); }
});

test('rotated resize uses local dimensions and fixes the opposite anchor; later drag/nudge use each parent inverse without inflation', async () => {
  for (const mode of ['flow', 'artboard']) {
    const p = await open({ mode, parent: 'rotate:25deg;scale:1.25', first: 'rotate:35deg;transform:scale(1.2);transform-origin:5px 12px' });
    try {
      await select(p); const initial = await geometry(p, 'a'); near(initial.angle, 60);
      for (const amount of [20, -20, 20, -20]) {
        const old = await geometry(p, 'a'), offset = mappedDelta(old.matrix, -old.w / 2, 0), anchor = { x: old.cx + offset.x, y: old.cy + offset.y };
        const h = await p.locator('[data-h=e]').boundingBox(), delta = mappedDelta(old.matrix, amount, 0);
        await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await p.mouse.down(); await p.mouse.move(h.x + h.width / 2 + delta.x, h.y + h.height / 2 + delta.y, { steps: 4 }); await p.mouse.up();
        const changed = await geometry(p, 'a'), end = mappedDelta(changed.matrix, -changed.w / 2, 0);
        near(changed.w, old.w + amount); near(changed.cx + end.x, anchor.x); near(changed.cy + end.y, anchor.y);
      }
      const resized = await geometry(p, 'a'); near(resized.w, initial.w); near(resized.h, initial.h);
      await p.keyboard.press('ArrowRight'); const nudged = await geometry(p, 'a'); near(nudged.cx, resized.cx + 1); near(nudged.cy, resized.cy);
      const at = { x: nudged.cx, y: nudged.cy };
      await p.keyboard.down('Alt'); await p.mouse.move(at.x, at.y); await p.mouse.down(); await p.mouse.move(at.x + 31, at.y + 13, { steps: 4 }); await p.mouse.up(); await p.keyboard.up('Alt');
      const moved = await geometry(p, 'a'); near(moved.cx, nudged.cx + 31); near(moved.cy, nudged.cy + 13); near(moved.w, 160); assert.deepEqual(p.errors, []);
    } finally { await p.close(); }
  }
});

test('rotation cancellation, full-turn no-op, page/edit exit and unsupported transforms preserve original state', async () => {
  const p = await open();
  try {
    await select(p); const style = await p.locator('[data-el=a]').getAttribute('style');
    await rotate(p, 37, { finish: false }); assert.equal(await p.locator('.rotation-feedback').isVisible(), true); await p.keyboard.press('Escape'); await p.mouse.up();
    assert.equal(await p.locator('[data-el=a]').getAttribute('style'), style); assert.ok(await p.locator('[data-act=undo]').isDisabled());
    await rotate(p, 360); assert.equal(await p.locator('[data-el=a]').getAttribute('style'), style); assert.ok(await p.locator('[data-act=undo]').isDisabled());
    await rotate(p, 23, { finish: false }); await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel'))); await p.mouse.up(); assert.equal(await p.locator('[data-el=a]').getAttribute('style'), style);
    await rotate(p, 20, { finish: false }); await p.keyboard.press('PageDown'); await p.mouse.up(); assert.equal(await p.locator('[data-el=a]').getAttribute('style'), style); assert.equal(await p.locator('.rotate-handle').isVisible(), false);
    assert.deepEqual(p.errors, []);
  } finally { await p.close(); }
  const skew = await open({ first: 'transform:skewX(20deg)' });
  try { await select(skew); assert.ok(await skew.locator('[data-act=rotation]').isDisabled()); assert.equal(await skew.locator('.rotate-handle').isVisible(), false); assert.equal(await skew.locator('[data-h=e]').isVisible(), false); } finally { await skew.close(); }
});

test('real pointer snapping and precise-input cancellation preserve no-op history; flow occupancy and inline Undo stay reversible', async () => {
  const p = await open({ mode: 'flow' });
  try {
    await p.evaluate(() => {
      const parent = document.querySelector('[data-el=parent]'); parent.style.display = 'flex'; parent.style.gap = '40px';
      for (const el of parent.children) { el.style.position = 'static'; el.style.left = ''; el.style.top = ''; }
    });
    await select(p); const before = await p.locator('[data-el=a]').getAttribute('style'), other = await geometry(p, 'b');
    const occupancy = () => p.locator('[data-el=a]').evaluate(n => [n.offsetLeft, n.offsetTop, n.offsetWidth, n.offsetHeight]);
    const occupied = await occupancy();
    await angleInput(p, 0); assert.equal(await p.locator('[data-el=a]').getAttribute('style'), before); assert.ok(await p.locator('[data-act=undo]').isDisabled());
    await p.locator('[data-act=rotation]').click(); await p.locator('.rotation-angle').fill('77'); await p.locator('.rotation-angle').press('Escape');
    assert.equal(await p.locator('[data-el=a]').getAttribute('style'), before); assert.ok(await p.locator('[data-act=undo]').isDisabled());
    await rotate(p, 88, { alt: false }); near((await geometry(p, 'a')).angle, 90); await p.keyboard.press('Control+z');
    await rotate(p, 37, { alt: false, shift: true }); near((await geometry(p, 'a')).angle, 30);
    assert.deepEqual(await occupancy(), occupied); near((await geometry(p, 'b')).cx, other.cx); near((await geometry(p, 'b')).cy, other.cy);
    await p.keyboard.press('Control+z'); await rotate(p, -37, { alt: true, shift: true }); near((await geometry(p, 'a')).angle, -37);
    assert.deepEqual(p.errors, []);
  } finally { await p.close(); }
  const inline = await open({ mode: 'flow' });
  try {
    await inline.locator('[data-el=a]').evaluate(n => { n.innerHTML = '<span data-el="inline">Inline title</span>'; });
    await inline.locator('[data-el=inline]').click(); const g = await geometry(inline, 'inline'), before = await inline.locator('[data-el=inline]').getAttribute('style');
    assert.equal(g.inline, true); await rotate(inline, 45); const changed = await geometry(inline, 'inline');
    near(changed.angle, 45); near(changed.cx, g.cx); near(changed.cy, g.cy);
    await inline.keyboard.press('Control+z'); assert.equal(await inline.locator('[data-el=inline]').getAttribute('style'), before);
    await inline.keyboard.press('ArrowRight'); near((await geometry(inline, 'inline')).cx, g.cx + 1);
    await inline.keyboard.press('Control+z'); assert.equal(await inline.locator('[data-el=inline]').getAttribute('style'), before);
    await inline.keyboard.down('Alt'); await inline.mouse.move(g.cx, g.cy); await inline.mouse.down(); await inline.mouse.move(g.cx + 23, g.cy + 11, { steps: 4 }); await inline.mouse.up(); await inline.keyboard.up('Alt');
    const dragged = await geometry(inline, 'inline'); near(dragged.cx, g.cx + 23); near(dragged.cy, g.cy + 11);
    await inline.keyboard.press('Control+z'); assert.equal(await inline.locator('[data-el=inline]').getAttribute('style'), before);
  } finally { await inline.close(); }
});

test('rotated rich-text corner resize respects minimum font and cancellation; copy and saved/offline reopen retain native CSS', async () => {
  const p = await open({ first: 'rotate:30deg;transform:scale(1.1);transform-origin:8px 20px' });
  try {
    await select(p); const g = await geometry(p, 'a'), h = await p.locator('[data-h=se]').boundingBox();
    const d = mappedDelta(g.matrix, -g.w * .9, -g.h * .9);
    await p.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await p.mouse.down(); await p.mouse.move(h.x + h.width / 2 + d.x, h.y + h.height / 2 + d.y, { steps: 5 });
    assert.ok(await p.locator('[data-el=a] span').evaluate(n => parseFloat(getComputedStyle(n).fontSize)) >= 6);
    await p.keyboard.press('Escape'); await p.mouse.up(); near((await geometry(p, 'a')).w, 160); near(await p.locator('[data-el=a] span').evaluate(n => parseFloat(getComputedStyle(n).fontSize)), 16);
    await rotate(p, 15); await p.keyboard.press('Control+d');
    const copy = await p.locator('[data-el]').evaluateAll(nodes => nodes.find(n => n.dataset.el !== 'a' && n.tagName === 'P' && n.textContent.includes('中文')).dataset.el);
    near((await geometry(p, copy)).angle, 45);
    await p.locator('[data-act=more]').click(); await p.locator('[data-act=source]').click(); const html = await p.locator('textarea').inputValue();
    const markup = html.replace(/<script[\s\S]*?<\/script>/g, ''); near(Number(markup.match(/rotate: ([\d.]+)deg/)[1]), 45); assert.doesNotMatch(markup, /rotation-feedback|rotate-handle|class="sel"/);
    const offline = await browser.newPage();
    try { await offline.setContent(html); await offline.locator('[data-act=edit]').click(); near((await geometry(offline, 'a')).angle, 45); assert.ok(await offline.locator('.state-text').textContent().then(s => s.includes('离线'))); } finally { await offline.close(); }
    assert.deepEqual(p.errors, []);
  } finally { await p.close(); }
});

test('owner handoff safely finishes an in-flight rotation; AI lock and viewer preview keep controls unavailable', async () => {
  const template = await open();
  await template.locator('[data-act=more]').click(); await template.locator('[data-act=source]').click(); const html = await template.locator('textarea').inputValue(); await template.close();
  const dir = await mkdtemp(path.join(tmpdir(), 'dom-rotation-')), file = path.join(dir, 'rotation.html'); await writeFile(file, html);
  const server = await createPreviewServer({ root: dir, port: 0 }), origin = `http://127.0.0.1:${server.address().port}`;
  const ctx = await browser.newContext(), p = await ctx.newPage(), errors = []; p.on('pageerror', e => errors.push(e.message));
  const call = async (action, body = {}) => { const r = await fetch(`${origin}/__html-design/document/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: '/rotation.html', ...body }) }); assert.equal(r.status, 200); return r.json(); };
  let ai;
  try {
    await p.goto(`${origin}/rotation.html`); await p.locator('.state-text').filter({ hasText: /^已保存$/ }).waitFor();
    const viewer = await ctx.newPage(); await viewer.goto(`${origin}/rotation.html`); await viewer.locator('.state-text').filter({ hasText: /预览中/ }).waitFor(); assert.equal(await viewer.locator('.rotate-handle').isVisible(), false);
    await p.locator('[data-act=edit]').click(); await zoom(p, 1); await select(p); await rotate(p, 37, { finish: false });
    ai = await call('ai/begin'); await p.locator('[data-act=retry]').evaluate(n => n.click());
    let state;
    for (let i = 0; i < 50; i++) { state = await call('ai/status', { token: ai.token }); if (state.ready) break; await new Promise(r => setTimeout(r, 100)); }
    assert.ok(state.ready); await p.mouse.up(); assert.equal(await p.locator('html').getAttribute('data-editing'), null); assert.equal(await p.locator('.rotate-handle').isVisible(), false);
    assert.match(await readFile(file, 'utf8'), /rotate: 37deg/); assert.deepEqual(errors, []);
    const saved = await readFile(file, 'utf8'); await p.locator('[data-act=rotation-reset]').evaluate(n => n.click()); assert.equal(await readFile(file, 'utf8'), saved);
  } finally { if (ai) await call('ai/cancel', { token: ai.token }); await ctx.close(); await new Promise(r => server.close(r)); await rm(dir, { recursive: true, force: true }); }
});

// One combined visual pass; no existing authored demo is rebuilt or reused.
test('rotation controls and feedback fit desktop, 200-percent and narrow workspaces', async () => {
  await mkdir('.export-test/issue19-test', { recursive: true });
  for (const [name, narrow, scale] of [['desktop', false, 1], ['large', false, 2], ['narrow', true, null]]) {
    const p = await open({ narrow });
    try {
      if (scale) await zoom(p, scale); else await p.keyboard.press('Control+1');
      await select(p); await rotate(p, 37, { finish: false });
      const h = await p.locator('.rotate-handle').boundingBox(); assert.ok(h.x >= (narrow ? 0 : 170) && h.y >= 52 && h.x + h.width <= (narrow ? 390 : 1440) && h.y + h.height <= (narrow ? 804 : 960));
      await p.screenshot({ path: `.export-test/issue19-test/rotation-${name}.png` }); await p.mouse.up();
      await p.locator('[data-act=rotation]').click(); const panel = await p.locator('.rotation-panel').boundingBox(); assert.ok(panel.x >= 0 && panel.x + panel.width <= (narrow ? 390 : 1440));
      if (narrow) await p.screenshot({ path: '.export-test/issue19-test/rotation-narrow-input.png' });
      assert.deepEqual(p.errors, []);
    } finally { await p.close(); }
  }
});

test('an element CSS zoom participates in its own positioning basis as well as local dimensions', async () => {
  const p = await open({ first: 'zoom:1.25;rotate:20deg' });
  try {
    await select(p); const before = await geometry(p, 'a');
    await p.keyboard.press('ArrowRight'); const after = await geometry(p, 'a');
    near(after.cx, before.cx + 1); near(after.cy, before.cy); near(after.w, before.w);
    await rotate(p, 15); const rotated = await geometry(p, 'a'); near(rotated.cx, after.cx); near(rotated.cy, after.cy);
  } finally { await p.close(); }
});
