import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createPreviewServer } from "./server.mjs";
import { chromium } from "playwright";
import JSZip from "jszip";
import { browserOptions, exportDocument } from "./export.mjs";
import { measureDocumentText } from "./text-measure.mjs";
import { cropGeometry } from './src/crop-geometry.js';
import { cropModel, cropPan, cropResize } from "./src/crop.js";
import { elementGeometry, mappedDelta } from "./src/geometry.js";
let browser, editor;
before(async () => {
  browser = await chromium.launch(browserOptions());
  editor = await readFile("html-design/editor.js", "utf8");
});
after(async () => browser?.close());
const near = (a, b, t = 0.15) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
const image = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#f5b542"/><rect width="200" height="300" fill="#d63939"/><rect x="400" width="200" height="300" fill="#239b68"/><path d="M0 150H600M100 0V300M300 0V300M500 0V300" stroke="#111" stroke-width="4"/><g font-family="Arial" font-size="52" fill="white"><text x="70" y="85">1</text><text x="270" y="85">2</text><text x="470" y="85">3</text><text x="70" y="235">4</text><text x="270" y="235">5</text><text x="470" y="235">6</text></g></svg>`)}`;
const wrap = (style = "", container = "", extra = "") => `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}[data-artboard]{width:800px;height:600px;position:relative;background:#faf9f6}.layout{position:absolute;left:230px;top:180px;width:520px;${container}}.photo{width:300px;height:200px;object-fit:contain;border:4px solid #275b97;border-radius:22px;${style}}</style></head><body><main data-stage><section data-artboard="p1" data-mode="artboard"><div class="layout"><a href="https://example.com/photo"><img data-el="photo" id="original-photo" class="photo" alt="六格编号图" src="${image}"></a>${extra}</div></section><section data-artboard="p2" data-mode="flow" style="display:none"></section></main></body></html>`;
async function open(style = "", container = "", extra = "", narrow = false) {
  const p = await browser.newPage({ viewport: narrow ? { width: 390, height: 844 } : { width: 1440, height: 1e3 } });
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  await p.setContent(wrap(style, container, extra));
  await p.locator("img").evaluate((n) => n.decode());
  await p.addScriptTag({ content: editor });
  await p.locator("[data-act=edit]").click();
  await p.keyboard.press("Control+0");
  return p;
}
async function select(p) {
  const g = await p.locator("[data-el=photo]").evaluate(elementGeometry);
  await p.mouse.click(g.cx, g.cy);
}
async function start(p) {
  await select(p);
  await p.locator("[data-act=image-crop]").click();
  assert.equal(await p.locator(".crop-panel").isVisible(), true);
}
async function zoom(p, z) {
  await p.locator(".crop-zoom-value").fill(String(z));
  await p.locator(".crop-zoom-value").press("Tab");
}
const imgState = (p) => p.locator("#original-photo").evaluate((n) => ({ outer: n.outerHTML, parent: n.parentElement.outerHTML, fit: getComputedStyle(n).objectFit, z: getComputedStyle(n).scale, pos: getComputedStyle(n).objectPosition }));
async function snapshot(p) {
  return p.evaluate(() => {
    const d = document.documentElement.cloneNode(true);
    d.querySelectorAll("[data-editor-ui],[data-editor-style],script").forEach((n) => n.remove());
    [...d.attributes].filter((a) => a.name.startsWith("data-edit")).forEach((a) => d.removeAttribute(a.name));
    d.querySelectorAll("[data-editor-current]").forEach((n) => n.removeAttribute("data-editor-current"));
    return "<!doctype html>" + d.outerHTML;
  });
}
async function pointer(p, dx, dy, handle = null, finish = "up") {
  const g = await p.locator("[data-el=photo]").evaluate(elementGeometry);
  let x = g.cx, y = g.cy;
  if (handle) {
    const r = await p.locator(`[data-h=${handle}]`).boundingBox();
    x = r.x + r.width / 2;
    y = r.y + r.height / 2;
  }
  const d = mappedDelta(g.matrix, dx, dy);
  await p.mouse.move(x, y);
  await p.mouse.down();
  await p.mouse.move(x + d.x, y + d.y, { steps: 5 });
  if (finish === "cancel") {
    await p.evaluate(() => window.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true })));
    await p.mouse.up();
  } else if (finish === "back") {
    await p.mouse.move(x, y, { steps: 5 });
    await p.mouse.up();
  } else await p.mouse.up();
}
test("crop math covers aspect extremes, finite values, clamping and every resize anchor without shrinking the source", () => {
  for (const [nw, nh] of [[600, 300], [300, 600], [400, 400], [1e4, 1], [1, 1e4]]) {
    let m = cropModel(240, 160, nw, nh, 2);
    assert.ok(m.pw >= m.w && m.ph >= m.h);
    for (const [dx, dy] of [[1e8, 1e8], [-1e8, -1e8], [0, 0]]) {
      const n = cropPan(m, dx, dy);
      assert.ok(n.left <= 1e-3 && n.top <= 1e-3 && n.left + n.pw >= n.w - 1e-3 && n.top + n.ph >= n.h - 1e-3);
    }
    for (const [dx, dy] of [[0, 0], [20, 0], [0, 20], [20, 20]]) {
      const n = cropResize(m, 220, 140, dx, dy);
      near(n.pw, m.pw);
      near(n.ph, m.ph);
    }
    const big = cropResize(m, 1e3, 700, 0, 0);
    assert.ok(big.pw >= 1e3 && big.ph >= 700);
  }
  for (const v of [NaN, Infinity, 0, -1]) assert.throws(() => cropModel(v, 10, 10, 10));
  assert.throws(() => cropModel(10, 10, 0, 10));
});
test("no-op/Fit sessions and cancel preserve exact source; local Undo/Redo spans migration, finished gestures merge separately", async () => {
  const p = await open();
  try {
    const original = await imgState(p);
    await start(p);
    await p.locator("[data-act=crop-done]").click();
    assert.equal((await imgState(p)).outer, original.outer);
    assert.equal(await p.locator("[data-crop-frame]").count(), 0);
    await start(p);
    await pointer(p, 0, 0);
    await pointer(p, 40, 0, null, "back");
    assert.equal(await p.locator("[data-crop-frame]").count(), 0);
    await zoom(p, 170);
    assert.equal(await p.locator("[data-crop-frame]").count(), 1);
    await p.locator("[data-act=undo]").click();
    assert.equal(await p.locator("[data-crop-frame]").count(), 0);
    assert.equal(await p.locator(".crop-panel").isVisible(), true);
    await p.locator("[data-act=redo]").click();
    near(parseFloat((await imgState(p)).z), 1.7);
    await pointer(p, 30, 20);
    await p.locator("[data-act=crop-cancel]").click();
    assert.equal((await imgState(p)).outer, original.outer);
    await start(p);
    await zoom(p, 170);
    await pointer(p, 30, 20);
    const last = await imgState(p);
    await p.locator("[data-act=crop-done]").click();
    await p.keyboard.press("Control+z");
    near(parseFloat((await imgState(p)).z), 1.7);
    assert.notEqual((await imgState(p)).pos, last.pos);
    await p.keyboard.press("Control+z");
    assert.equal((await imgState(p)).outer, original.outer);
    await p.keyboard.press("Control+Shift+z");
    assert.equal(await p.locator("[data-crop-frame]").count(), 1);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});
test("real pan and eight frame anchors remain covered at 50/100/200%, preserve rotation and cancel each gesture", async () => {
  for (const scale of [0.5, 1, 2]) {
    const p = await open("rotate:25deg;transform:scale(1.1);transform-origin:5px 15px");
    try {
      await start(p);
      for (let i = 0; i < (scale === 0.5 ? 4 : scale === 2 ? 5 : 0); i++) await p.keyboard.press(scale === 0.5 ? "Control+-" : "Control+=");
      await zoom(p, 160);
      const first = await imgState(p);
      await pointer(p, 25, 15);
      assert.notEqual((await imgState(p)).pos, first.pos);
      const before2 = await p.locator("[data-el=photo]").evaluate(elementGeometry);
      for (const dir of ["n", "ne", "e", "se", "s", "sw", "w", "nw"]) {
        const attrs = await p.locator("[data-el=photo]").getAttribute("style");
        await pointer(p, dir.includes("w") ? 20 : dir.includes("e") ? -20 : 0, dir.includes("n") ? 20 : dir.includes("s") ? -20 : 0, dir);
        const g = await p.locator("[data-el=photo]").evaluate(elementGeometry);
        near(g.angle, before2.angle);
        assert.ok(g.w <= before2.w + 0.2 && g.h <= before2.h + 0.2);
        const ax = dir.includes("w") ? 0.5 : dir.includes("e") ? -0.5 : 0, ay = dir.includes("n") ? 0.5 : dir.includes("s") ? -0.5 : 0, oldAnchor = mappedDelta(before2.matrix, before2.w * ax, before2.h * ay), newAnchor = mappedDelta(g.matrix, g.w * ax, g.h * ay);
        near(g.cx + newAnchor.x, before2.cx + oldAnchor.x, 0.2);
        near(g.cy + newAnchor.y, before2.cy + oldAnchor.y, 0.2);
        await p.locator("[data-act=undo]").click();
        assert.equal(await p.locator("[data-el=photo]").getAttribute("style"), attrs);
      }
      const current = await imgState(p);
      await pointer(p, 40, 20, null, "cancel");
      assert.equal((await imgState(p)).outer, current.outer);
      await p.keyboard.press("Escape");
      assert.equal(await p.locator("[data-crop-frame]").count(), 0);
      assert.deepEqual(p.errors, []);
    } finally {
      await p.close();
    }
  }
});
test("percentage auto-height, inline baseline, Grid/Flex ordering, authored IDs/classes/links survive responsive migration and offline reopen", async () => {
  for (const [style, container] of [["width:50%;height:auto", ""], ["width:45%;height:auto", "display:flex;gap:12px"], ["width:100%;height:auto;grid-column:2;order:2", "display:grid;grid-template-columns:1fr 1fr"], ["position:absolute;left:10%;top:20px;width:50%;height:160px;padding:8px", ""]]) {
    const p = await open(style, container, '<span data-el="sibling">Sibling</span>');
    try {
      const original = await imgState(p);
      const b = await p.locator("[data-el=photo]").boundingBox(), s = await p.locator("[data-el=sibling]").boundingBox();
      await start(p);
      await zoom(p, 150);
      const a = await p.locator("[data-el=photo]").boundingBox(), ss = await p.locator("[data-el=sibling]").boundingBox();
      for (const k of ["x", "y", "width", "height"]) {
        near(a[k], b[k]);
        near(ss[k], s[k]);
      }
      assert.equal(await p.locator("img").getAttribute("id"), "original-photo");
      assert.equal(await p.locator("img").getAttribute("class"), "photo");
      assert.equal(await p.locator("img").evaluate((n) => n.closest("a").href), "https://example.com/photo");
      await p.locator("[data-act=crop-done]").click();
      const html = await snapshot(p), q = await browser.newPage();
      await q.setContent(html);
      await q.locator("img").evaluate((n) => n.decode());
      assert.equal(await q.locator("[data-crop-frame]").count(), 1);
      const values = await q.locator("[data-crop-frame]").evaluate((n) => {
        const before2 = n.getBoundingClientRect();
        n.closest(".layout").style.width = "400px";
        return { before: before2.width, after: n.getBoundingClientRect().width, width: n.style.width };
      });
      if (style.includes("%")) {
        assert.ok(values.after < values.before);
        assert.match(values.width, /%/);
      }
      await q.close();
      await p.keyboard.press("Control+z");
      assert.equal((await imgState(p)).outer, original.outer);
      assert.deepEqual(p.errors, []);
    } finally {
      await p.close();
    }
  }
});
test("unsupported structural CSS or missing Typed OM rejects migration without mutating the original; page finish and explicit Fit reset remain usable", async () => {
  const p = await open();
  try {
    await start(p);
    const original = await imgState(p);
    await p.locator("img").evaluate((n) => n.computedStyleMap = void 0);
    await zoom(p, 160);
    assert.equal(await p.locator("[data-crop-frame]").count(), 0);
    assert.equal((await imgState(p)).outer, original.outer);
    await p.locator("img").evaluate((n) => delete n.computedStyleMap);
    await zoom(p, 160);
    await p.locator("[data-act=next]").first().click();
    assert.equal(await p.locator(".crop-panel").isVisible(), false);
    await p.locator("[data-act=prev]").first().click();
    await select(p);
    await p.locator("[data-act=image-fit]").click();
    assert.equal((await imgState(p)).fit, "contain");
    near(parseFloat((await imgState(p)).z), 1);
    await p.keyboard.press("Control+z");
    near(parseFloat((await imgState(p)).z), 1.6);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});
test("native PPTX retains full source, exact srcRect, real roundRect mask/rotation/link/group; QA ignores expected crop overflow", async () => {
  const p = await open("rotate:30deg");
  try {
    await start(p);
    await zoom(p, 180);
    await pointer(p, 25, -10);
    await p.locator("[data-act=crop-done]").click();
    await mkdir(".export-test/issue6-test", { recursive: true });
    const html = await snapshot(p);
    await writeFile(".export-test/issue6-test/crop.html", html);
    const facts = await p.locator("[data-crop-frame]").evaluate((n) => {
      const i = n.querySelector("img"), c = getComputedStyle(i), f = getComputedStyle(n), w = n.clientWidth - parseFloat(f.paddingLeft) - parseFloat(f.paddingRight), h = n.clientHeight - parseFloat(f.paddingTop) - parseFloat(f.paddingBottom), k = Math.max(w / i.naturalWidth, h / i.naturalHeight) * parseFloat(c.scale), pos = c.objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      return { crop: { l: pos[0] * (1 - w / (i.naturalWidth * k)), r: (1 - pos[0]) * (1 - w / (i.naturalWidth * k)), t: pos[1] * (1 - h / (i.naturalHeight * k)), b: (1 - pos[1]) * (1 - h / (i.naturalHeight * k)) } };
    });
    const out = await exportDocument({ html, baseUrl: "http://127.0.0.1:1/crop.html", format: "pptx" });
    await writeFile(".export-test/issue6-test/crop.pptx", out.bytes);
    const zip = await JSZip.loadAsync(out.bytes), xml = await zip.file("ppt/slides/slide1.xml").async("string");
    assert.equal((xml.match(/<p:pic>/g) || []).length, 1);
    assert.equal((xml.match(/<p:grpSp>/g) || []).length, 1);
    assert.match(xml, /rot="1800000"/);
    assert.match(xml, /<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 9000"/);
    const rect = xml.match(/<a:srcRect ([^>]+)\/>/)[1];
    for (const [k, v] of Object.entries(facts.crop)) near(Number(rect.match(new RegExp(`${k}="(\\d+)"`))[1]), Math.round(v * 1e5), 2);
    assert.match(await zip.file("ppt/slides/_rels/slide1.xml.rels").async("string"), /https:\/\/example.com\/photo/);
    const qa = await measureDocumentText({ mode: "qa", html });
    assert.ok(!qa.issues.some((i) => i.code === "ELEMENT_OUT_OF_BOUNDS"), JSON.stringify(qa));
    const pdf = await exportDocument({ html, baseUrl: "http://127.0.0.1:1/crop.html", format: "pdf" });
    await writeFile(".export-test/issue6-test/crop.pdf", pdf.bytes);
    assert.equal(pdf.pages, 2);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});
test("managed crop previews never autosave; AI handoff finishes once and viewer/AI cannot enter crop", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "dom-crop-")), file = path.join(dir, "crop.html");
  await writeFile(file, wrap() + `<script data-editor>${editor}<\/script>`);
  const server = await createPreviewServer({ root: dir, port: 0 }), origin = `http://127.0.0.1:${server.address().port}`, ctx = await browser.newContext(), p = await ctx.newPage();
  const call = async (action, body = {}) => {
    const r = await fetch(`${origin}/__html-design/document/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: "/crop.html", ...body }) });
    assert.equal(r.status, 200);
    return r.json();
  };
  let ai;
  try {
    await p.goto(`${origin}/crop.html`);
    await p.locator(".state-text").filter({ hasText: /^已保存$/ }).waitFor();
    const viewer = await ctx.newPage();
    await viewer.goto(`${origin}/crop.html`);
    await viewer.locator(".state-text").filter({ hasText: /预览中/ }).waitFor();
    await viewer.locator("[data-act=image-crop]").evaluate((n) => n.click());
    assert.equal(await viewer.locator(".crop-panel").isVisible(), false);
    await p.locator("[data-act=edit]").click();
    await p.keyboard.press("Control+0");
    await select(p); await p.keyboard.press("ArrowRight");
    await start(p);
    await zoom(p, 160);
    await new Promise((r) => setTimeout(r, 1e3));
    await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await p.waitForFunction(async () => {
      const db = await new Promise((resolve,reject) => {const r=indexedDB.open('html-design-drafts',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      try {const rows=await new Promise(resolve => {const r=db.transaction('drafts','readonly').objectStore('drafts').getAll();r.onsuccess=()=>resolve(r.result);});return rows.length>0;}finally{db.close();}
    });
    const draft = await p.evaluate(async () => {
      const db=await new Promise(resolve=>{const r=indexedDB.open('html-design-drafts',1);r.onsuccess=()=>resolve(r.result);});
      try {const rows=await new Promise(resolve=>{const r=db.transaction('drafts','readonly').objectStore('drafts').getAll();r.onsuccess=()=>resolve(r.result);});const d=new DOMParser().parseFromString(rows[0].html,'text/html');return {frames:d.querySelectorAll('[data-crop-frame]').length,translate:d.querySelector('#original-photo').style.translate};}finally{db.close();}
    });
    assert.equal(draft.frames,0); const translation=draft.translate.split(/\s+/).map(parseFloat); near(translation[0],1); near(translation[1]||0,0);
    assert.doesNotMatch((await readFile(file, "utf8")).replace(/<script[\s\S]*?<\/script>/g, ""), /data-crop-frame="1"/);
    ai = await call("ai/begin");
    await p.locator("[data-act=retry]").evaluate((n) => n.click());
    let ready = false;
    for (let i = 0; i < 50; i++) {
      if ((await call("ai/status", { token: ai.token })).ready) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready);
    assert.equal(await p.locator(".crop-panel").isVisible(), false);
    assert.equal(await p.locator("html").getAttribute("data-editing"), null);
    assert.match((await readFile(file, "utf8")).replace(/<script[\s\S]*?<\/script>/g, ""), /data-crop-frame="1"/);
    const saved = await readFile(file, "utf8");
    await p.locator("[data-act=image-crop]").evaluate((n) => n.click());
    assert.equal(await p.locator(".crop-panel").isVisible(), false);
    assert.equal(await readFile(file, "utf8"), saved);
  } finally {
    if (ai) await call("ai/cancel", { token: ai.token });
    await ctx.close();
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
test("replacement decodes before mutation and resets valid source crop; duplicate keeps one selectable frame and undo covers outer resizing", async () => {
  const p = await open("width:50%;height:auto");
  try {
    await start(p);
    await zoom(p, 160);
    await p.locator("[data-act=crop-done]").click();
    const before2 = await imgState(p);
    await p.locator("[data-act=image-replace]").click();
    await p.locator("input.file").setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
    await p.locator(".toast").filter({ hasText: /已保留原图/ }).waitFor();
    assert.equal((await imgState(p)).outer, before2.outer);
    await p.locator("[data-act=image-replace]").click();
    await p.locator("input.file").setInputFiles({ name: "new.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><rect width="100" height="200" fill="blue"/></svg>') });
    await p.waitForFunction(() => document.querySelector("#original-photo").naturalWidth === 100);
    near(parseFloat((await imgState(p)).z), 1);
    await p.keyboard.press("Control+z");
    assert.equal((await imgState(p)).outer, before2.outer);
    const initial = await p.locator("[data-el=photo]").getAttribute("style");
    await pointer(p, 30, 20, "se");
    assert.equal(await p.locator("img").evaluate((n) => n.style.height), "100%");
    await p.keyboard.press("Control+z");
    assert.equal(await p.locator("[data-el=photo]").getAttribute("style"), initial);
    assert.equal(await p.locator("img").evaluate((n) => n.style.height), "auto");
    await p.keyboard.press("Control+d");
    assert.equal(await p.locator("[data-crop-frame]").count(), 2);
    assert.equal(await p.locator("[data-crop-image][data-el]").count(), 0);
    const ids = await p.locator("img").evaluateAll((nodes) => nodes.map((n) => n.id));
    assert.equal(new Set(ids).size, 2);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.close();
  }
});
test("crop panel and source bounds stay legible in one desktop/narrow visual pass", async () => {
  await mkdir(".export-test/issue6-test", { recursive: true });
  for (const narrow of [false, true]) {
    const p = await open("rotate:15deg", "", "", narrow);
    try {
      if (narrow) await p.keyboard.press("Control+1");
      await start(p);
      await zoom(p, 150);
      const r = await p.locator(".crop-panel").boundingBox();
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= (narrow ? 390 : 1440) && r.y + r.height <= (narrow ? 844 : 1e3));
      await p.screenshot({ path: `.export-test/issue6-test/crop-${narrow ? "narrow" : "desktop"}.png` });
      assert.deepEqual(p.errors, []);
    } finally {
      await p.close();
    }
  }
});
test("direct Grid/Flex children preserve item CSS and structural sibling selectors reject before committing", async () => {
  for (const layout of ["display:flex;gap:12px;align-items:start", "display:grid;grid-template-columns:1fr 1fr;gap:12px"]) {
    const p2 = await browser.newPage({ viewport: { width: 1440, height: 1e3 } });
    try {
      await p2.setContent(wrap("width:50%;height:auto;order:2;grid-column:2;align-self:start", layout, '<span data-el="sib">Sibling</span>').replace('<a href="https://example.com/photo">', "").replace("</a>", ""));
      await p2.locator("img").evaluate((n) => n.decode());
      await p2.addScriptTag({ content: editor });
      await p2.locator("[data-act=edit]").click();
      await p2.keyboard.press("Control+0");
      const before2 = await p2.locator("[data-el=photo]").boundingBox(), sib = await p2.locator("[data-el=sib]").boundingBox();
      await start(p2);
      await zoom(p2, 150);
      const after2 = await p2.locator("[data-el=photo]").boundingBox(), ss = await p2.locator("[data-el=sib]").boundingBox();
      assert.equal(await p2.locator("[data-crop-frame]").count(), 1);
      for (const k of ["x", "y", "width", "height"]) {
        near(before2[k], after2[k]);
        near(sib[k], ss[k]);
      }
      assert.equal(await p2.locator("[data-crop-frame]").evaluate((n) => getComputedStyle(n).order), "2");
    } finally {
      await p2.close();
    }
  }
  const p = await browser.newPage();
  try {
    await p.setContent(wrap("", "", '<span data-el="sib">Sibling</span>').replace('<a href="https://example.com/photo">', "").replace("</a>", "").replace("</style>", ".layout>img+span{margin-left:40px}</style>"));
    await p.addScriptTag({ content: editor });
    await p.locator("[data-act=edit]").click();
    await p.keyboard.press("Control+0");
    const original = await imgState(p);
    await start(p);
    await zoom(p, 150);
    assert.equal(await p.locator("[data-crop-frame]").count(), 0);
    assert.equal((await imgState(p)).outer, original.outer);
    await p.locator(".toast").filter({ hasText: /布局无法无损转换/ }).waitFor();
  } finally {
    await p.close();
  }
});

test('actual CSS controls crop trust: visible overflow, changed inner transforms or offsets cannot pass QA or silently export a clipped picture', async () => {
  const p = await open();
  try {
    await start(p); await zoom(p, 180); await p.locator('[data-act=crop-done]').click();
    const original = await snapshot(p);
    for (const css of ['frame', 'transform', 'offset']) {
      const q = await browser.newPage();
      try {
        await q.setContent(original); await q.locator('img').evaluate(n => n.decode());
        await q.locator('[data-crop-frame]').evaluate((n, kind) => {
          if (kind === 'frame') n.style.setProperty('overflow','visible','important');
          else n.querySelector('img').style.setProperty(kind === 'transform' ? 'transform' : 'translate', kind === 'transform' ? 'skewX(12deg)' : '20px 0','important');
        }, css);
        const html = await snapshot(q), qa = await measureDocumentText({mode:'qa',html});
        assert.equal(qa.status,'issues'); assert.ok(qa.issues.some(i => i.code === 'GEOMETRY_UNSUPPORTED'),JSON.stringify(qa));
        await assert.rejects(exportDocument({html,baseUrl:'http://127.0.0.1:1/crop.html',format:'pptx'}),/裁切 CSS 无法可靠导出/);
      } finally { await q.close(); }
    }
  } finally { await p.close(); }
});


test('review: effective edits after Fit cover the frame; no-op, cancel and local/main history preserve exact Fit state',async()=>{
  const p=await open();try{
    await start(p);await zoom(p,150);await p.locator('[data-act=crop-done]').click();await p.locator('[data-act=image-fit]').click();
    const fit=await imgState(p);assert.equal(fit.fit,'contain');
    await start(p);await zoom(p,100);await p.locator('[data-act=crop-done]').click();assert.equal((await imgState(p)).outer,fit.outer);
    await start(p);await p.locator('.crop-zoom').evaluate(n=>{n.value='120';n.dispatchEvent(new Event('input',{bubbles:true}));n.value='100';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});await p.locator('[data-act=crop-done]').click();assert.equal((await imgState(p)).outer,fit.outer);
    await start(p);await pointer(p,0,20);await p.locator('[data-act=crop-done]').click();assert.equal((await imgState(p)).outer,fit.outer);
    for(const action of ['zoom','pan','resize']){
      await start(p);
      if(action==='zoom')await zoom(p,120);else await pointer(p,20,0,action==='resize'?'e':null);
      const changed=await imgState(p);assert.equal(changed.fit,'cover',action);
      const paint=await p.locator('img[data-crop-image]').evaluate(n=>{const cs=getComputedStyle(n),w=parseFloat(cs.width),h=parseFloat(cs.height),k=Math.max(w/n.naturalWidth,h/n.naturalHeight)*Number(cs.scale);return{w,h,pw:n.naturalWidth*k,ph:n.naturalHeight*k};});
      assert.ok(paint.pw>=paint.w-.01&&paint.ph>=paint.h-.01);
      await p.locator('[data-act=undo]').click();assert.equal((await imgState(p)).outer,fit.outer);
      await p.locator('[data-act=redo]').click();assert.equal((await imgState(p)).outer,changed.outer);
      await p.locator('[data-act=crop-done]').click();await p.keyboard.press('Control+z');assert.equal((await imgState(p)).outer,fit.outer);
      await p.keyboard.press('Control+Shift+z');assert.equal((await imgState(p)).outer,changed.outer);
      await p.keyboard.press('Control+z');
    }
    await start(p);await zoom(p,120);await p.locator('[data-act=crop-cancel]').click();assert.equal((await imgState(p)).outer,fit.outer);
    await start(p);await zoom(p,120);await p.locator('[data-act=crop-done]').click();
    const out=await exportDocument({html:await snapshot(p),baseUrl:'http://127.0.0.1:1/crop.html',format:'pptx'}),zip=await JSZip.loadAsync(out.bytes),xml=await zip.file('ppt/slides/slide1.xml').async('string');
    const rect=xml.match(/<a:srcRect ([^>]+)\/>/)[1];for(const[k,v]of Object.entries({l:18750,r:18750,t:8333,b:8333}))near(Number(rect.match(new RegExp(`${k}="(\\d+)"`))[1]),v,2);
    assert.deepEqual(p.errors,[]);
  }finally{await p.close();}
});

test('review: non-square 50-percent crop uses the same native ellipse for border and picture mask',async()=>{
  const p=await open();try{await start(p);await zoom(p,150);await p.locator('[data-act=crop-done]').click();await p.locator('[data-crop-frame]').evaluate(n=>n.style.setProperty('border-radius','50%','important'));
    const out=await exportDocument({html:await snapshot(p),baseUrl:'http://127.0.0.1:1/crop.html',format:'pptx'}),zip=await JSZip.loadAsync(out.bytes),xml=await zip.file('ppt/slides/slide1.xml').async('string');
    const geometries=await p.evaluate(xml=>{const d=new DOMParser().parseFromString(xml,'application/xml'),ns='http://schemas.openxmlformats.org/presentationml/2006/main',a='http://schemas.openxmlformats.org/drawingml/2006/main';return ['sp','pic'].map(kind=>{const n=d.getElementsByTagNameNS(ns,kind)[0],g=n.getElementsByTagNameNS(a,'prstGeom')[0],e=n.getElementsByTagNameNS(a,'ext')[0];return{shape:g.getAttribute('prst'),w:Number(e.getAttribute('cx')),h:Number(e.getAttribute('cy')),adjustments:g.getElementsByTagNameNS(a,'gd').length};});},xml);
    assert.equal(geometries[0].shape,'ellipse');assert.equal(geometries[1].shape,'ellipse');assert.notEqual(geometries[1].w,geometries[1].h);assert.equal(geometries[1].adjustments,0);near(geometries[1].w,300*9525,1);near(geometries[1].h,200*9525,1);
  }finally{await p.close();}
});

test('review: raw contain zoom and hidden/collapsed internal images are explicitly unreliable and never revealed in native export',async()=>{
  const p=await open();try{await start(p);await zoom(p,150);await p.locator('[data-act=crop-done]').click();const original=await snapshot(p);
    for(const kind of['contain','hidden','collapse']){const q=await browser.newPage();try{await q.setContent(original);await q.locator('img').evaluate(n=>n.decode());await q.locator('img').evaluate((n,kind)=>n.style.setProperty(kind==='contain'?'object-fit':'visibility',kind,'important'),kind);
      const actual=await q.evaluate(`(${cropGeometry.toString()})(document.querySelector('[data-crop-frame]'),${elementGeometry.toString()})`);assert.equal(actual.supported,false,kind);
      const html=await snapshot(q),qa=await measureDocumentText({mode:'qa',html});assert.equal(qa.status,'issues');assert.ok(qa.coverage.elements.unsupported>0||qa.coverage.elements.hidden>0,JSON.stringify(qa));
      await assert.rejects(exportDocument({html,baseUrl:'http://127.0.0.1:1/crop.html',format:'pptx'}),/裁切 CSS 无法可靠导出/);
    }finally{await q.close();}}
  }finally{await p.close();}
});
