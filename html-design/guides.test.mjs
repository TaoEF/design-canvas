import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { snapMove } from "./src/guides.js";
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
      near(r.x, narrow ? 0 : 208);
      near(r.y, 52);
      await p.screenshot({ path: `.export-test/guides-${name}.png` });
      await p.mouse.up();
      assert.deepEqual(p.errors, []);
    } finally {
      await p.close();
    }
  }
});
