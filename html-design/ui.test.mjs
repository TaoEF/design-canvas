import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import JSZip from "jszip";
import { exportDocument, browserOptions } from "./export.mjs";

let browser, editor;
const fixture = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>Editor UI</title><style>
body{margin:0}[data-stage]{display:flex;flex-direction:column;padding:70px;gap:40px}[data-artboard]{position:relative;box-sizing:border-box;width:800px;height:450px;background:#fff;padding:50px;flex-shrink:0}h1{font:64px/1.2 Arial;margin:0;width:300px;min-height:160px}h1 span{font-size:32px;line-height:1.4;letter-spacing:2px}img{position:absolute;right:40px;bottom:40px;width:180px;height:80px;object-fit:cover}p{font:30px Arial}</style></head><body><main data-stage><section data-artboard="p1" data-title="First" data-mode="flow"><h1 data-el="p1-title">Scale<br><span>small text</span></h1><img data-el="p1-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='red'/%3E%3C/svg%3E" alt="test image"></section><section data-artboard="p2" data-title="Second" data-mode="flow"><p data-el="p2-title">Second page</p></section><section data-artboard="p3" data-title="Third" data-mode="flow"><p data-el="p3-title">Third page</p></section></main></body></html>`;
before(async () => {
  editor = await readFile("html-design/editor.js", "utf8");
  browser = await chromium.launch(browserOptions());
});
after(async () => {
  await browser?.close();
});
async function open(viewport = { width: 1440, height: 900 }, editing = true) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.errors = errors;
  await page.setContent(fixture);
  await page.addScriptTag({ content: editor });
  if (editing) await page.locator("[data-act=edit]").click();
  return page;
}
const order = (p) =>
  p
    .locator("[data-artboard]")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.artboard));
const near = (a, b, t = 0.05) =>
  assert.ok(Math.abs(a - b) < t, `${a} differs from ${b}`);
async function current(p) {
  return p.locator("[data-editor-current]").getAttribute("data-artboard");
}
async function dragHandle(p, handle, dx, dy) {
  const r = await p.locator(`[data-h=${handle}]`).boundingBox();
  assert.ok(r);
  await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await p.mouse.down();
  await p.mouse.move(r.x + r.width / 2 + dx, r.y + r.height / 2 + dy, {
    steps: 8,
  });
  await p.mouse.up();
}

test("canvas preview preserves document interactions; Edit exposes page-local layout toggles and Done/Escape return to preview", async () => {
  const p = await open(undefined, false);
  try {
    assert.equal(await p.locator("html").getAttribute("data-editing"), null);
    assert.ok(await p.locator("[data-act=edit]").isVisible());
    assert.equal(await p.locator(".tools").isVisible(), false);
    await p.evaluate(() => {
      const b = document.querySelector("[data-artboard=p1]");
      b.insertAdjacentHTML(
        "beforeend",
        `<button data-el="native" style="position:absolute;left:50px;top:270px">互动按钮</button><input id="native-input" style="position:absolute;left:50px;top:325px;width:200px;height:30px"><div id="native-scroll" style="position:absolute;left:380px;top:80px;width:120px;height:100px;overflow:auto"><div style="height:500px">滚动内容</div></div>`,
      );
      window.nativeClicks = 0;
      window.nativeKeys = 0;
      b.querySelector("[data-el=native]").addEventListener(
        "click",
        () => window.nativeClicks++,
      );
      window.addEventListener("keydown", (e) => {
        if (["ArrowRight", " "].includes(e.key)) window.nativeKeys++;
      });
    });
    await p.locator("[data-el=native]").click();
    assert.equal(await p.evaluate(() => window.nativeClicks), 1);
    await p.locator("#native-input").fill("HTML input");
    await p.locator("#native-input").press("ArrowRight");
    await p.locator("body").press("Space");
    assert.equal(await p.evaluate(() => window.nativeKeys), 2);
    assert.equal(await current(p), "p1");
    const scroll = await p.locator("#native-scroll").boundingBox();
    await p.mouse.move(
      scroll.x + scroll.width / 2,
      scroll.y + scroll.height / 2,
    );
    await p.mouse.wheel(0, 180);
    await p.waitForFunction(
      () => document.querySelector("#native-scroll").scrollTop > 0,
    );
    await p.locator("[data-el=p1-title]").dblclick();
    assert.equal(
      await p.locator("[data-el=p1-title]").getAttribute("contenteditable"),
      null,
    );
    const untouched = await p
      .locator("[data-artboard=p2]")
      .evaluate((n) => n.outerHTML);
    await p.locator("[data-act=edit]").click();
    assert.equal(await p.locator("html").getAttribute("data-editing"), "");
    assert.ok(await p.locator(".layout-toggle").isVisible());
    await p.locator("[data-act=artboard]").click();
    assert.equal(
      await p.locator("[data-artboard=p1]").getAttribute("data-mode"),
      "artboard",
    );
    assert.equal(
      await p.locator("[data-artboard=p2]").evaluate((n) => n.outerHTML),
      untouched,
    );
    p.once("dialog", (dialog) => dialog.accept());
    await p.locator("[data-act=flow]").click();
    assert.equal(
      await p.locator("[data-artboard=p1]").getAttribute("data-mode"),
      "flow",
    );
    assert.equal(
      await p.locator("[data-artboard=p2]").evaluate((n) => n.outerHTML),
      untouched,
    );
    await p.locator("[data-el=native]").click();
    assert.equal(
      await p.evaluate(() => window.nativeClicks),
      1,
      "editing intercepts document clicks",
    );
    await p.locator("[data-el=p1-title]").dblclick();
    await p.locator("[data-el=p1-title]").fill("Updated title");
    await p.locator("[data-act=done]").click();
    assert.equal(await p.locator("html").getAttribute("data-editing"), null);
    assert.equal(
      await p.locator("[data-el=p1-title]").getAttribute("contenteditable"),
      null,
    );
    assert.equal(await p.locator(".sel").isVisible(), false);
    await p.locator("[data-el=native]").click();
    assert.equal(await p.evaluate(() => window.nativeClicks), 2);
    await p.locator("[data-act=edit]").click();
    await p.locator("[data-el=p1-title]").dblclick();
    await p.keyboard.press("Escape");
    assert.equal(await p.locator("html").getAttribute("data-editing"), "");
    await p.keyboard.press("Escape");
    assert.equal(await p.locator("html").getAttribute("data-editing"), "");
    await p.keyboard.press("Escape");
    assert.equal(await p.locator("html").getAttribute("data-editing"), null);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});

test("layer actions change actual paint order across containers, survive save/reopen, and undo without moving elements", async () => {
  const p = await open();
  try {
    await p.evaluate(() => {
      document
        .querySelector("[data-artboard=p1]")
        .insertAdjacentHTML(
          "beforeend",
          `<div id="stack-a" style="position:absolute;left:100px;top:220px;width:220px;height:140px;transform:translateZ(0)"><div data-el="layer-a" style="position:absolute;inset:0;background:#ff5555">A</div></div><div id="stack-b" style="position:absolute;left:180px;top:250px;width:220px;height:140px;z-index:20"><div data-el="layer-b" style="position:absolute;inset:0;background:#55bb88">B</div></div>`,
        );
    });
    const hit = (page) =>
      page.evaluate(() => {
        const b = document.querySelector("[data-artboard=p1]"),
          r = b.getBoundingClientRect(),
          s = r.width / b.offsetWidth;
        return document
          .elementsFromPoint(r.left + 230 * s, r.top + 290 * s)
          .find((n) => n.dataset.el)?.dataset.el;
      });
    const a = p.locator("[data-el=layer-a]");
    const initial = await a.boundingBox();
    assert.equal(await hit(p), "layer-b");
    await a.click({ position: { x: 15, y: 15 } });
    await p.locator("[data-act=element-more]").click();
    await p.locator("[data-act=element-front]").click();
    assert.equal(await hit(p), "layer-a");
    await p.locator("[data-act=undo]").click();
    assert.equal(await hit(p), "layer-b");
    await p.locator("[data-act=redo]").click();
    assert.equal(await hit(p), "layer-a");
    await p.locator("[data-act=element-more]").click();
    await p.locator("[data-act=element-back]").click();
    assert.equal(await hit(p), "layer-b");
    const after = await a.boundingBox();
    for (const key of ["x", "y", "width", "height"])
      near(after[key], initial[key]);
    await p.locator("[data-act=more]").click();
    await p.locator("[data-act=source]").click();
    const source = await p.locator("textarea").inputValue();
    const reopened = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    try {
      await reopened.setContent(
        source.replace(/<script[\s\S]*?<\/script>/g, ""),
      );
      assert.equal(await hit(reopened), "layer-b");
    } finally {
      await reopened.close();
    }
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});

test("artboard conversion only touches the current page and preserves positioned wrappers and element transforms", async () => {
  const p = await open();
  try {
    await p.evaluate(() => {
      const title = document.querySelector("[data-el=p1-title]"),
        wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;margin-left:60px;padding:20px";
      title.before(wrap);
      wrap.append(title);
      title.style.transform = "scale(.8)";
    });
    const title = p.locator("[data-el=p1-title]"),
      before = await title.boundingBox();
    const original = await p
      .locator("[data-artboard=p2]")
      .evaluate((n) => n.outerHTML);
    await p.locator("[data-act=artboard]").click();
    const after = await title.boundingBox();
    for (const key of ["x", "y", "width", "height"])
      near(after[key], before[key]);
    assert.equal(
      await p.locator("[data-artboard=p2]").evaluate((n) => n.outerHTML),
      original,
    );
    assert.equal(
      await p.locator("[data-artboard=p3]").getAttribute("data-mode"),
      "flow",
    );
    await p.locator("[data-act=undo]").click();
    const restored = await title.boundingBox();
    for (const key of ["x", "y", "width", "height"])
      near(restored[key], before[key]);
  } finally {
    await p.close();
  }
});

// This test is geometry/interaction verification; visual review is done separately in one batch.
test("single page is centered in the available work area, footer owns navigation, and zoom never enters a saved file", async () => {
  const p = await open();
  try {
    const geometry = await p.locator("[data-editor-current]").evaluate((b) => {
      const r = b.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    near(geometry.x + geometry.w / 2, 208 + (1440 - 208) / 2);
    near(geometry.y + geometry.h / 2, 52 + (900 - 52 - 40) / 2);
    assert.equal(await p.locator("[data-artboard]:visible").count(), 1);
    assert.equal(await p.locator("[data-act=single]").count(), 0);
    assert.equal(await p.locator(".head [data-act=save]").count(), 0);
    assert.equal(await p.locator(".footer .pageno").textContent(), "1 / 3");
    await p.locator(".footer [data-act=next]").click();
    assert.equal(await current(p), "p2");
    assert.equal(await p.locator(".page-title").textContent(), "Second");
    await p.keyboard.press("Control+0");
    near(
      await p
        .locator("[data-editor-current]")
        .evaluate((b) => b.getBoundingClientRect().width),
      800,
    );
    await p.locator("[data-act=more]").click();
    await p.locator("[data-act=source]").click();
    const source = await p.locator("textarea").inputValue(),
      content = source.replace(/<script[\s\S]*?<\/script>/g, "");
    assert.doesNotMatch(
      content,
      /data-editor-current|data-editor-playing|data-editor-on|<html-design-editor|position:fixed|transform:scale/,
    );
    assert.match(content, /data-el="p1-title"/);
    assert.match(content, /data-artboard="p3"/);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});

test("page add/copy/rename/reorder/delete are undoable and IDs are never reused", async () => {
  const p = await open();
  try {
    await p.locator(".nav-head [data-act=page-add]").click();
    assert.deepEqual(await order(p), ["p1", "p4", "p2", "p3"]);
    await p.locator(".thumb.active .thumb-more").click();
    await p.locator("[data-act=page-copy]").click();
    assert.deepEqual(await order(p), ["p1", "p4", "p5", "p2", "p3"]);
    await p.locator(".thumb.active .thumb-more").click();
    await p.locator("[data-menu=page] [data-act=page-rename]").click();
    await p.locator(".rename-input").fill("Renamed page");
    await p.locator(".rename-input").press("Enter");
    assert.equal(
      await p.locator("[data-artboard=p5]").getAttribute("data-title"),
      "Renamed page",
    );
    await p.locator(".thumb.active .thumb-more").click();
    await p.locator("[data-act=page-up]").click();
    assert.deepEqual(await order(p), ["p1", "p5", "p4", "p2", "p3"]);
    await p.locator("[data-act=undo]").click();
    assert.deepEqual(await order(p), ["p1", "p4", "p5", "p2", "p3"]);
    await p.locator(".thumb.active .thumb-more").click();
    await p.locator("[data-act=page-delete]").click();
    assert.deepEqual(await order(p), ["p1", "p4", "p2", "p3"]);
    await p.locator("[data-act=undo]").click();
    assert.equal(
      await p.locator("[data-artboard=p5]").getAttribute("data-title"),
      "Renamed page",
    );
    await p.locator("[data-act=redo]").click();
    await p.locator(".nav-head [data-act=page-add]").click();
    assert.ok((await order(p)).includes("p6"));
    const first = p.locator(".thumb[data-page-id=p1] .thumb-main"),
      last = p.locator(".thumb[data-page-id=p3] .thumb-main");
    const a = await first.boundingBox(),
      b = await last.boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + 20);
    await p.mouse.down();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height - 1, { steps: 14 });
    await p.mouse.up();
    assert.equal((await order(p)).at(-1), "p1");
    await p.locator("[data-act=undo]").click();
    assert.equal((await order(p))[0], "p1");
    await p.locator(".thumb[data-page-id=p1] .thumb-more").click();
    await p.locator("[data-act=page-copy]").click();
    const ids = await p
      .locator("[data-el]")
      .evaluateAll((ns) => ns.map((n) => n.dataset.el));
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});

test("deleting all pages leaves an actionable empty state and undo restores content", async () => {
  const p = await open();
  try {
    for (let i = 0; i < 3; i++) {
      await p.locator(".thumb.active .thumb-more").click();
      await p.locator("[data-act=page-delete]").click();
    }
    assert.equal(await p.locator("[data-artboard]").count(), 0);
    assert.ok(await p.locator(".empty-canvas").isVisible());
    assert.equal(await p.locator(".footer .pageno").textContent(), "0 / 0");
    assert.equal(await p.locator("[data-act=pdf]").isEnabled(), false);
    await p.locator("[data-act=undo]").click();
    assert.equal(await p.locator("[data-artboard]").count(), 1);
    assert.ok(await p.locator("[data-editor-current]").isVisible());
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});

test("text corners scale nested typography at 50% and 200%; side handles only resize the frame", async () => {
  for (const zoom of [0.5, 2]) {
    const p = await open();
    try {
      const title = p.locator("[data-el=p1-title]");
      await title.click();
      await p.keyboard.press("Control+0");
      for (let i = 0; i < (zoom === 0.5 ? 4 : 5); i++)
        await p.keyboard.press(zoom === 0.5 ? "Control+-" : "Control+=");
      const before = await title.evaluate((el) => ({
        w: el.offsetWidth,
        h: el.offsetHeight,
        font: parseFloat(getComputedStyle(el).fontSize),
        small: parseFloat(getComputedStyle(el.querySelector("span")).fontSize),
        line: parseFloat(getComputedStyle(el.querySelector("span")).lineHeight),
      }));
      await dragHandle(p, "se", before.w * 0.5 * zoom, before.h * 0.5 * zoom);
      const after = await title.evaluate((el) => ({
        w: el.offsetWidth,
        h: el.offsetHeight,
        font: parseFloat(getComputedStyle(el).fontSize),
        small: parseFloat(getComputedStyle(el.querySelector("span")).fontSize),
        line: parseFloat(getComputedStyle(el.querySelector("span")).lineHeight),
      }));
      near(after.w, before.w * 1.5, 1);
      near(after.h, before.h * 1.5, 1);
      near(after.font, 96);
      near(after.small, 48);
      near(after.line, before.line * 1.5);
      await p.locator("[data-act=undo]").click();
      near(
        await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        64,
      );
      await title.click();
      await dragHandle(p, "e", 40 * zoom, 0);
      near(
        await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
        64,
      );
      assert.equal(await title.evaluate((el) => el.offsetWidth), 340);
      assert.deepEqual(p.errors, []);
    } finally {
      await p.close();
    }
  }
});

test("Fit/Cover keep the image frame and source, and undo restores the mode", async () => {
  const p = await open();
  try {
    const image = p.locator("[data-el=p1-image]"),
      src = await image.getAttribute("src");
    await image.click();
    const before = await image.boundingBox();
    await p.locator("[data-act=image-fit]").click();
    assert.equal(
      await image.evaluate((n) => getComputedStyle(n).objectFit),
      "contain",
    );
    const fit = await image.boundingBox();
    for (const k of ["x", "y", "width", "height"]) near(before[k], fit[k]);
    await p.locator("[data-act=image-cover]").click();
    assert.equal(
      await image.evaluate((n) => getComputedStyle(n).objectFit),
      "cover",
    );
    await p.locator("[data-act=undo]").click();
    assert.equal(
      await image.evaluate((n) => getComputedStyle(n).objectFit),
      "contain",
    );
    assert.equal(await image.getAttribute("src"), src);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});

test("play menu offers scrolling and fullscreen; exiting either returns to canvas preview on the current page", async () => {
  const p = await open();
  try {
    assert.equal(await p.locator(".head [data-act=fullscreen]").count(), 0);
    await p.locator("[data-act=preview]").click();
    assert.equal(await p.locator("[data-menu=play]").isVisible(), true);
    await p.locator("[data-act=scroll-play]").click();
    assert.equal(await p.locator(".head").isVisible(), false);
    assert.equal(await p.locator(".nav").isVisible(), false);
    assert.equal(await p.locator("[data-artboard]:visible").count(), 3);
    assert.equal(
      await p.locator("html").getAttribute("data-editor-scrolling"),
      "",
    );
    await p.keyboard.press("Space");
    assert.equal(await current(p), "p2");
    await p.mouse.move(800, 450);
    await p.mouse.wheel(0, 600);
    await p.waitForFunction(
      () =>
        document.querySelector("[data-editor-current]")?.dataset.artboard ===
        "p3",
    );
    await p.mouse.wheel(0, -600);
    await p.waitForFunction(
      () =>
        document.querySelector("[data-editor-current]")?.dataset.artboard ===
        "p2",
    );
    await p.keyboard.press("Escape");
    assert.equal(await current(p), "p2");
    assert.ok(await p.locator(".head").isVisible());
    assert.equal(await p.locator("html").getAttribute("data-editing"), null);
    assert.equal(await p.locator("[data-artboard]:visible").count(), 1);
    assert.ok(await p.locator("[data-act=edit]").isVisible());
    await p.locator("[data-act=preview]").click();
    await p.locator("[data-act=fullscreen]").click();
    assert.equal(
      await p.locator("html").getAttribute("data-editor-playing"),
      "",
    );
    assert.ok(await p.evaluate(() => !!document.fullscreenElement));
    await p.keyboard.press("ArrowRight");
    assert.equal(await current(p), "p3");
    await p.locator(".play-controls [data-act=stop]").click();
    assert.equal(await current(p), "p3");
    assert.equal(await p.evaluate(() => !!document.fullscreenElement), false);
    assert.equal(await p.locator("html").getAttribute("data-editing"), null);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});

test("menus are keyboard accessible, source keeps focus, numeric font size and space-pan work", async () => {
  const p = await open();
  try {
    await p.locator("[data-el=p1-title]").click();
    await p.locator(".fs").fill("80");
    await p.locator(".fs").press("Enter");
    assert.equal(
      await p
        .locator("[data-el=p1-title]")
        .evaluate((n) => getComputedStyle(n).fontSize),
      "80px",
    );
    await p.keyboard.press("Escape");
    await p.locator("[data-act=more]").focus();
    await p.keyboard.press("Enter");
    await p.keyboard.press("ArrowDown");
    assert.equal(
      await p.evaluate(
        () =>
          document.querySelector("html-design-editor").shadowRoot.activeElement
            .dataset.act,
      ),
      "source",
    );
    await p.keyboard.press("Enter");
    assert.ok(await p.locator(".modal").isVisible());
    await p.locator("textarea").focus();
    await p.keyboard.press("Tab");
    assert.equal(
      await p.evaluate(
        () =>
          document.querySelector("html-design-editor").shadowRoot.activeElement
            .dataset.act,
      ),
      "src-copy",
    );
    await p.keyboard.press("Escape");
    assert.equal(await p.locator(".modal").isVisible(), false);
    const before = await p.locator("[data-editor-current]").boundingBox();
    await p.keyboard.press("Escape");
    await p.locator("[data-act=edit]").click();
    await p.mouse.move(
      before.x + before.width - 15,
      before.y + before.height - 15,
    );
    await p.keyboard.down("Space");
    await p.mouse.down();
    await p.mouse.move(
      before.x + before.width + 35,
      before.y + before.height + 15,
      { steps: 5 },
    );
    await p.mouse.up();
    await p.keyboard.up("Space");
    const after = await p.locator("[data-editor-current]").boundingBox();
    near(after.x - before.x, 50);
    near(after.y - before.y, 30);
    assert.equal(await p.locator("html").getAttribute("data-editing"), "");
    await p.locator("[data-act=zoom-fit]").click();
    const reset = await p.locator("[data-editor-current]").boundingBox();
    near(reset.x, before.x);
    near(reset.y, before.y);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});

test("scaled text and image Fit export as editable PPTX objects in the current page order", async () => {
  const p = await open();
  try {
    await p.locator("[data-el=p1-title]").click();
    await p.keyboard.press("Control+0");
    await dragHandle(p, "se", 150, 80);
    await p.locator("[data-el=p1-image]").click();
    await p.locator("[data-act=image-fit]").click();
    await p.locator(".thumb.active .thumb-more").click();
    await p.locator("[data-act=page-down]").click();
    await p.locator("[data-act=more]").click();
    await p.locator("[data-act=source]").click();
    const html = await p.locator("textarea").inputValue();
    const result = await exportDocument({
      html,
      baseUrl: "http://127.0.0.1:8876/demos/toy-history.html",
      title: "Current editable state",
      format: "pptx",
    });
    const zip = await JSZip.loadAsync(result.bytes),
      first = await zip.file("ppt/slides/slide1.xml").async("string"),
      second = await zip.file("ppt/slides/slide2.xml").async("string");
    assert.match(first, /Second page/);
    assert.match(second, /Scale/);
    assert.match(second, /sz="7200"/);
    assert.match(second, /sz="3600"/);
    assert.equal((second.match(/<p:pic>/g) || []).length, 1);
    assert.doesNotMatch(second, /<a:srcRect l="[1-9]/);
    assert.equal(result.pages, 3);
  } finally {
    await p.close();
  }
});
