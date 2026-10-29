import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { snapMove, spacingCandidates } from "./src/guides.js";
import { browserOptions } from "./export.mjs";

const rect = { x: 100, y: 80, w: 100, h: 60 };
test("guides choose the nearest edge/center on each axis and release outside the magnetic range", () => {
  const board = { x: 0, y: 0, w: 800, h: 450 };
  const centered = snapMove(rect, [board], { x: 248, y: 117 }, 6);
  assert.equal(centered.x, 250);
  assert.equal(centered.y, 115);
  assert.equal(centered.matches.length, 2);
  const peer = { x: 520, y: 260, w: 100, h: 60 };
  const result = snapMove(rect, [board, peer], { x: 416, y: 178 }, 6);
  assert.equal(result.x, 420);
  assert.equal(result.y, 180);
  const free = snapMove(rect, [peer], { x: 390, y: 140 }, 6);
  assert.equal(free.x, 390);
  assert.equal(free.y, 140);
  assert.equal(free.matches.length, 0);
});

test("spacing geometry supports horizontal/vertical centering and repeated gaps with different sizes", () => {
  const moving = { x: 166, y: 100, w: 100, h: 60 };
  const peers = [{ x: 40, y: 100, w: 60, h: 60 }, { x: 340, y: 110, w: 80, h: 40 }];
  const center = snapMove(moving, peers, { x: 0, y: 0 }, 6);
  assert.equal(center.x, 4); assert.equal(center.matches.find(m => m.axis === "x").gap, 70);
  const flip = r => ({ x: r.y, y: r.x, w: r.h, h: r.w });
  const vertical = snapMove(flip(moving), peers.map(flip), { x: 0, y: 0 }, 6);
  assert.equal(vertical.y, 4); assert.equal(vertical.matches.find(m => m.axis === "y").kind, "spacing");
  const references = [{ x: 40, y: 100, w: 60, h: 60 }, { x: 170, y: 100, w: 100, h: 60 }];
  const after = spacingCandidates({ x: 336, y: 100, w: 80, h: 60 }, references, "x", 6);
  assert.equal(after[0].mode, "after"); assert.equal(after[0].offset, 4); assert.equal(after[0].gap, 70);
  const before = spacingCandidates({ x: -106, y: 100, w: 80, h: 60 }, references, "x", 6);
  assert.equal(before[0].mode, "before"); assert.equal(before[0].offset, -4); assert.equal(before[0].gap, 70);
});

test("spacing candidates stay local, ignore negative gaps/unrelated projections, honor threshold and allow touching", () => {
  const moving = { x: 166, y: 100, w: 100, h: 60 };
  const a = { x: 40, y: 100, w: 60, h: 60 }, b = { x: 340, y: 100, w: 80, h: 60 };
  assert.equal(spacingCandidates(moving, [a, b], "x", 4).length, 1);
  assert.equal(spacingCandidates(moving, [a, b], "x", 3.999).length, 0);
  assert.equal(spacingCandidates(moving, [a, { ...b, y: 160 }], "x", 6).length, 0);
  assert.equal(spacingCandidates(moving, [{ ...a, y: 90, h: 20 }, { ...b, y: 140, h: 20 }], "x", 6).length, 0, "all three objects must share a row");
  assert.equal(spacingCandidates(moving, [a, { ...b, x: 180 }], "x", 6).length, 0, "overlapping final gaps never snap");
  assert.equal(spacingCandidates(moving, [a, b, { x: 130, y: 100, w: 20, h: 60 }], "x", 6).length, 0, "an intervening local neighbor prevents a remote pair match");
  const touch = spacingCandidates({ x: 98, y: 100, w: 100, h: 60 }, [{ x: 0, y: 100, w: 100, h: 60 }, { x: 200, y: 100, w: 100, h: 60 }], "x", 6);
  assert.ok(touch.some(m => m.mode === "between" && m.gap === 0 && m.offset === 2));
});

test("spacing competes by minimum correction, preserves edge ties, and drops a row lost to orthogonal snapping", () => {
  const moving = { x: 166, y: 100, w: 100, h: 60 };
  const peers = [{ x: 40, y: 100, w: 60, h: 60 }, { x: 340, y: 100, w: 80, h: 60 }];
  const tie = snapMove(moving, [...peers, { x: 170, y: 300, w: 50, h: 50 }], { x: 0, y: 0 }, 6, peers);
  assert.equal(tie.x, 4); assert.notEqual(tie.matches.find(m => m.axis === "x").kind, "spacing");
  const closer = snapMove(moving, [...peers, { x: 168, y: 300, w: 50, h: 50 }], { x: 0, y: 0 }, 6, peers);
  assert.equal(closer.x, 2);
  const spacingWins = snapMove(moving, [...peers, { x: 172, y: 300, w: 50, h: 50 }], { x: 0, y: 0 }, 6, peers);
  assert.equal(spacingWins.x, 4); assert.equal(spacingWins.matches.find(m => m.axis === "x").kind, "spacing");
  const thin = { ...moving, y: 99, h: 2 }, row = peers.map(p => ({ ...p, y: 100, h: 1 }));
  const final = snapMove(thin, [...row, { x: 700, y: 96, w: 10, h: 2 }], { x: 0, y: 0 }, 6, row);
  const moved = { ...thin, x: thin.x + final.x, y: thin.y + final.y };
  for (const m of final.matches.filter(m => m.kind === "spacing")) assert.ok(Math.min(moved.y + moved.h, ...m.peers.map(p => p.y + p.h)) > Math.max(moved.y, ...m.peers.map(p => p.y)));
  assert.deepEqual(snapMove(moving, peers, { x: 0, y: 0 }, 6), snapMove(moving, peers, { x: 0, y: 0 }, 6), "stable candidate ordering");
});

test("spacing does not scan past a peer overlapping a reference edge or occupied gap", () => {
  const moving = { x: 336, y: 100, w: 80, h: 60 };
  const a = { x: 40, y: 100, w: 60, h: 60 }, b = { x: 170, y: 100, w: 100, h: 60 };
  const blocker = { x: 125, y: 100, w: 90, h: 60 };
  const mirror = r => ({ ...r, x: 500 - r.x - r.w });
  const flip = r => ({ x: r.y, y: r.x, w: r.h, h: r.w });
  for (const [axis, transform] of [["x", r => r], ["x", mirror], ["y", flip], ["y", r => flip(mirror(r))]]) {
    const m = transform(moving), peers = [a, b, blocker].map(transform);
    // Both axes and both continuation directions retain visible overlapping peers.
    assert.deepEqual(spacingCandidates(m, peers, axis, 6), []);
    assert.equal(snapMove(m, peers, { x: 0, y: 0 }, 6)[axis], 0);
  }
  const center = { x: 166, y: 100, w: 100, h: 60 }, right = { ...b, x: 340, w: 80 };
  assert.deepEqual(spacingCandidates(center, [a, right, { ...blocker, x: 85, w: 40 }], "x", 6), [], "a peer straddling the left edge occupies the centering gap");
  assert.ok(spacingCandidates(moving, [a, b, { ...blocker, y: 160 }], "x", 6).some(m => m.mode === "after"), "objects outside the common row do not obstruct the gap");
});

let browser, editor;
before(async () => {
  editor = await readFile("html-design/editor.js", "utf8");
  browser = await chromium.launch(browserOptions());
});
after(async () => browser?.close());
async function open(mode = "artboard", dark = false, narrow = false) {
  const p = await browser.newPage({
    viewport: narrow
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
  });
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  await p.setContent(`<!doctype html><html><head><title>对齐辅助线</title><style>
  body{margin:0}[data-artboard]{position:relative;width:800px;height:450px;background:${dark ? "#181818" : "#fff"};color:${dark ? "#fff" : "#222"};font:20px Arial}
  [data-el=group]{position:absolute;inset:0}[data-el=a],[data-el=b],[data-el=hidden]{position:absolute;width:100px;height:60px;box-sizing:border-box;padding:16px;background:${dark ? "#363636" : "#ededed"}}
  [data-el=child]{position:absolute;left:4px;top:4px;width:20px;height:15px}
  </style></head><body><main data-stage><section data-artboard="p1" data-title="对齐测试" data-mode="${mode}"><div data-el="group"><div data-el="a" style="position:absolute;left:160px;top:80px">标题<span data-el="child"></span></div><div data-el="b" style="left:520px;top:260px">图片</div><div data-el="hidden" style="left:513px;top:140px;visibility:hidden"></div></div></section></main></body></html>`);
  await p.addScriptTag({ content: editor });
  await p.locator("[data-act=edit]").click();
  return p;
}
async function zoom(p, value) {
  await p.keyboard.press("Control+0");
  for (let i = 0; i < (value === 0.5 ? 4 : value === 2 ? 5 : 0); i++)
    await p.keyboard.press(value === 0.5 ? "Control+-" : "Control+=");
}
async function start(p) {
  const r = await p.locator("[data-el=a]").boundingBox();
  const at = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  await p.mouse.move(at.x, at.y);
  await p.mouse.down();
  return at;
}
async function position(p) {
  return p.locator("[data-el=a]").evaluate((el) => {
    const board = el.closest("[data-artboard]"),
      r = el.getBoundingClientRect(),
      b = board.getBoundingClientRect(),
      s = b.width / board.offsetWidth;
    return { x: (r.x - b.x) / s, y: (r.y - b.y) / s };
  });
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.05, `${a} != ${b}`);

test("drag snapping is zoom independent in flow and artboard modes; guides clear, undo restores, and saved HTML stays clean", async () => {
  for (const mode of ["flow", "artboard"])
    for (const z of [0.5, 2]) {
      const p = await open(mode);
      try {
        await zoom(p, z);
        const at = await start(p);
        // Four screen pixels away from the target: same magnetic range at every zoom.
        await p.mouse.move(at.x + 360 * z - 4, at.y + 60 * z, { steps: 6 });
        near((await position(p)).x, 520);
        near((await position(p)).y, 140);
        assert.equal(await p.locator(".guide-line").count(), 1);
        assert.equal(
          await p
            .locator(".sel")
            .evaluate((n) => getComputedStyle(n).borderColor),
          "rgb(37, 139, 255)",
        );
        assert.equal(
          await p
            .locator(".guide-line")
            .evaluate((n) => getComputedStyle(n).stroke),
          "rgb(16, 185, 129)",
        );
        await p.mouse.up();
        assert.equal(await p.locator(".guide-line").count(), 0);
        await p.keyboard.press("Control+z");
        near((await position(p)).x, 160);
        await p.keyboard.press("Control+Shift+z");
        near((await position(p)).x, 520);
        await p.locator("[data-act=more]").click();
        await p.locator("[data-act=source]").click();
        const html = (await p.locator("textarea").inputValue()).replace(
          /<script[\s\S]*?<\/script>/g,
          "",
        );
        assert.doesNotMatch(
          html,
          /guide-line|guide-halo|class="guides"|html-design-editor/,
        );
        assert.match(html, /data-bbox="520,140,100,60"/);
        assert.deepEqual(p.errors, []);
      } finally {
        await p.close();
      }
    }
});

test("Alt bypass, page centering, Escape and pointer cancellation leave no stale guides or unwanted history", async () => {
  const p = await open();
  try {
    await zoom(p, 1);
    const at = await start(p);
    await p.keyboard.down("Alt");
    await p.mouse.move(at.x + 356, at.y + 60);
    near((await position(p)).x, 516);
    assert.equal(await p.locator(".guide-line").count(), 0);
    await p.keyboard.up("Alt");
    // At this point the moving frame's center approaches the page center.
    await p.mouse.move(at.x + 188, at.y + 112);
    near((await position(p)).x, 350);
    near((await position(p)).y, 195);
    assert.equal(await p.locator(".guide-line").count(), 1);
    await p.keyboard.press("Escape");
    near((await position(p)).x, 160);
    near((await position(p)).y, 80);
    assert.equal(await p.locator(".guide-line").count(), 0);
    await p.mouse.up();
    assert.ok(await p.locator("[data-act=undo]").isDisabled());
    const again = await start(p);
    await p.mouse.move(again.x + 356, again.y + 60);
    await p.evaluate(() =>
      window.dispatchEvent(new PointerEvent("pointercancel")),
    );
    near((await position(p)).x, 160);
    assert.equal(await p.locator(".guide-line").count(), 0);
    await p.mouse.up();
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});

// Focused visual evidence: both backgrounds and narrow layout in one bounded pass.
test("guide overlay stays within the workspace on light, dark and narrow canvases", async () => {
  await mkdir(".export-test", { recursive: true });
  for (const [name, dark, narrow] of [
    ["light", false, false],
    ["dark", true, false],
    ["narrow", true, true],
  ]) {
    const p = await open("artboard", dark, narrow);
    try {
      if (!narrow) await zoom(p, 1);
      const scale = await p
        .locator("[data-artboard]")
        .evaluate((b) => b.getBoundingClientRect().width / b.offsetWidth);
      const at = await start(p);
      await p.mouse.move(at.x + 360 * scale - 2, at.y + 60 * scale);
      assert.equal(await p.locator(".guide-line").count(), 1);
      // Thumbnail refresh runs after 250ms; holding a drag must keep its guide.
      await new Promise((resolve) => setTimeout(resolve, 350));
      assert.equal(await p.locator(".guide-line").count(), 1);
      const r = await p.locator(".guides").boundingBox();
      near(r.x, narrow ? 0 : 170);
      near(r.y, 52);
      await p.screenshot({ path: `.export-test/guides-${name}.png` });
      await p.mouse.up();
      assert.deepEqual(p.errors, []);
    } finally {
      await p.close();
    }
  }
});

async function openSpacing(mode = "artboard", multiple = false, narrow = false) {
  const p = await browser.newPage({ viewport: narrow ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
  p.errors = []; p.on("pageerror", error => p.errors.push(error.message));
  const shift = mode === 'flow' ? ' style="translate:-60px 0"' : '';
  const movable = multiple
    ? `<div class="holder" data-el="holder"><div class="piece" data-el="a"${shift}>A</div><div class="piece" data-el="b"${shift}>B</div></div>`
    : `<div class="piece" data-el="a"${shift}>拖动<span data-el="child"></span></div>`;
  await p.setContent(`<!doctype html><html><head><title>等距吸附试用</title><style>
    body{margin:0}[data-artboard]{position:relative;width:800px;height:450px;background:#fff;font:20px Arial}
    .row{position:absolute;left:80px;top:120px;display:flex;gap:110px}.row>[data-el],.holder{width:100px;height:60px;box-sizing:border-box;flex-shrink:0}
    .piece,[data-el=left],[data-el=right]{background:#ededed;padding:16px;box-sizing:border-box}
    .holder{display:flex;gap:20px}.holder .piece{width:40px;flex-shrink:0;padding:16px 8px}
    ${mode === 'flow' ? '' : `.row{display:block;inset:0}.row>[data-el]{position:absolute;top:120px}[data-el=left]{left:80px}[data-el=right]{left:500px}${multiple ? '.holder' : '[data-el=a]'}{left:230px}`}
    [data-el=child]{position:absolute;width:10px;height:10px;left:4px;top:4px}
    .ghost{position:absolute;left:286px;top:120px;width:100px;height:60px}
    </style></head><body><main data-stage><section data-artboard="p1" data-title="等距居中" data-mode="${mode}"><div data-el="ancestor"><div class="row"><div data-el="left">左</div>${movable}<div data-el="right">右</div></div></div><div data-el="transparent-parent" style="opacity:0;pointer-events:none"><div data-el="ghost" class="ghost"></div></div></section><section data-artboard="p2" data-title="清理测试" data-mode="flow"><p data-el="p2-text">第二页</p></section></main></body></html>`);
  await p.addScriptTag({ content: editor }); await p.locator("[data-act=edit]").click(); await p.waitForSelector('html[data-editing]');
  return p;
}

test("equal-spacing dragging respects screen threshold in flow/artboard at 50/100/200 percent, including multi-select and one Undo", async () => {
  for (const mode of ['flow', 'artboard']) for (const z of [.5, 1, 2]) {
    const multiple = z === 1, p = await openSpacing(mode, multiple);
    try {
      await zoom(p, z);
      if (multiple) {
        await p.locator('[data-el=a]').click(); await p.locator('[data-el=b]').click({ modifiers: ['Shift'] });
        assert.equal(await p.locator('.selection-member').count(), 2);
      }
      const at = await start(p);
      await p.keyboard.down('Alt'); await p.mouse.move(at.x + 60 * z - 4, at.y, { steps: 5 });
      near((await position(p)).x, 290 - 4 / z); assert.equal(await p.locator('.guide-distance').count(), 0);
      await p.keyboard.up('Alt'); await p.mouse.move(at.x + 60 * z - 4, at.y + .1);
      near((await position(p)).x, 290);
      assert.deepEqual(await p.locator('.guide-distance').allTextContents(), ['110', '110']);
      assert.equal(await p.locator('[data-el=left]').evaluate(el=>el.getBoundingClientRect().width), 100 * z);
      await p.mouse.up(); assert.equal(await p.locator('.guide-distance').count(), 0);
      await p.keyboard.press('Control+z'); near((await position(p)).x, 230); assert.ok(await p.locator('[data-act=undo]').isDisabled());
      await p.keyboard.press('Control+Shift+z'); near((await position(p)).x, 290);
      if (multiple) near(await p.locator('[data-el=b]').evaluate(el=>{ const r=el.getBoundingClientRect(),b=el.closest('[data-artboard]').getBoundingClientRect();return (r.x-b.x)/(b.width/800);}), 350);
      assert.equal(await p.locator('.row').evaluate(el=>getComputedStyle(el).gap), '110px', 'original layout gap stays untouched');
      await p.locator('[data-act=more]').click(); await p.locator('[data-act=source]').click();
      const html = (await p.locator('textarea').inputValue()).replace(/<script[\s\S]*?<\/script>/g, '');
      assert.doesNotMatch(html, /guide-distance|guide-line|guide-halo|class="guides"/); assert.deepEqual(p.errors, []);
    } finally { await p.close(); }
  }
});

test("spacing guides cancel cleanly on Escape, pointer cancellation and page change without adding history", async () => {
  const p = await openSpacing();
  try {
    await zoom(p, 1);
    for (const cancel of ['Escape', 'pointercancel', 'PageDown']) {
      const at = await start(p); await p.mouse.move(at.x + 56, at.y, { steps: 5 });
      assert.equal(await p.locator('.guide-distance').count(), 2);
      if (cancel === 'pointercancel') await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel')));
      else await p.keyboard.press(cancel);
      assert.equal(await p.locator('.guide-distance').count(), 0); await p.mouse.up();
      if (cancel !== 'PageDown') { near((await position(p)).x, 230); assert.ok(await p.locator('[data-act=undo]').isDisabled()); }
      else assert.ok(await p.locator('[data-artboard=p2]').isVisible());
    }
    assert.deepEqual(p.errors, []);
  } finally { await p.close(); }
});

test("live spacing supports interval continuation and vertical centering", async () => {
  for (const vertical of [false, true]) {
    const p = await openSpacing();
    try {
      await zoom(p, 1);
      await p.evaluate(vertical => {
        const left = document.querySelector('[data-el=left]'), right = document.querySelector('[data-el=right]'), moving = document.querySelector('[data-el=a]');
        if (vertical) {
          for (const el of [left, right, moving]) el.style.left = '300px';
          left.style.top = '20px'; right.style.top = '300px'; moving.style.top = '100px';
        } else { right.style.left = '290px'; moving.style.left = '430px'; }
      }, vertical);
      const at = await start(p); await p.mouse.move(at.x + (vertical ? 0 : 66), at.y + (vertical ? 56 : 0), { steps: 5 });
      const result = await position(p); near(vertical ? result.y : result.x, vertical ? 160 : 500);
      assert.deepEqual(await p.locator('.guide-distance').allTextContents(), vertical ? ['80', '80'] : ['110', '110']);
      await p.mouse.up(); await p.keyboard.press('Control+z');
      near(vertical ? (await position(p)).y : (await position(p)).x, vertical ? 100 : 430);
      assert.deepEqual(p.errors, []);
    } finally { await p.close(); }
  }
});

test("equal-spacing labels retain fixed screen typography in desktop and narrow workspaces", async () => {
  await mkdir('.export-test', { recursive: true });
  for (const narrow of [false, true]) {
    const p = await openSpacing('artboard', false, narrow);
    try {
      const z = await p.locator('[data-artboard=p1]').evaluate(el=>el.getBoundingClientRect().width/el.offsetWidth);
      const at = await start(p); await p.mouse.move(at.x + 60*z - 2, at.y, { steps: 5 });
      assert.deepEqual(await p.locator('.guide-distance').allTextContents(), ['110', '110']);
      assert.equal(await p.locator('.guide-distance').first().evaluate(el=>getComputedStyle(el).fontSize), '11px');
      await p.screenshot({ path: `.export-test/spacing-${narrow ? 'narrow' : 'desktop'}.png` });
      await p.mouse.up(); assert.deepEqual(p.errors, []);
    } finally { await p.close(); }
  }
});
