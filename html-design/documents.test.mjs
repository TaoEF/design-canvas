import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  readdir,
  rm,
  realpath,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDocumentStore, revisionOf } from "./documents.mjs";
import { createPreviewServer } from "./server.mjs";
import { chromium } from "playwright";

const html = (text, editor = "") =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Autosave</title><style>body{margin:0}[data-artboard]{width:800px;height:450px;padding:50px;background:#eee}h1{font:40px Arial}</style></head><body><main data-stage><section data-artboard="p1" data-mode="flow"><h1 data-el="p1-title">${text}</h1><img data-el="p1-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='red'/%3E%3C/svg%3E" width="20" height="20"></section></main>${editor && `<script data-editor>${editor}</script>`}</body></html>`;
let root, server, origin, browser;
before(async () => {
  root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "html-design-save-")),
  );
  await mkdir(path.join(root, "demos"));
  await writeFile(
    path.join(root, "demos/test.html"),
    html("Original", await readFile("html-design/editor.js", "utf8")),
  );
  server = await createPreviewServer({ root, port: 0 });
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(
    process.platform === "darwin" ? { channel: "chrome" } : {},
  );
});
after(async () => {
  await browser?.close();
  await new Promise((r) => server.close(r));
  await rm(root, { recursive: true, force: true });
});
const rejects = (p, code) => assert.rejects(p, (e) => e.status === code);

test("CAS, canonical paths, atomic backup, and single-owner takeover protect newer edits", async () => {
  const file = path.join(root, "protocol.html");
  await writeFile(file, html("one"));
  let clock = 1000;
  const store = createDocumentStore(root, { now: () => clock, leaseMs: 100 });
  const call = (action, body = {}) =>
    store.handle(action, { path: "/protocol.html", ...body });
  const revision = revisionOf(await readFile(file));
  const a = await call("open", { revision }),
    b = await call("open", { revision });
  assert.equal(a.role, "owner");
  assert.equal(b.role, "viewer");
  await rejects(
    call("save", { token: b.token, revision, html: html("bad") }),
    409,
  );
  const pending = await call("takeover", { token: b.token, revision });
  assert.ok(pending.pending.mine);
  const saved = await call("save", {
    token: a.token,
    revision,
    html: html("two"),
  });
  await call("yield", {
    token: a.token,
    requestId: pending.pending.id,
    revision: saved.revision,
  });
  await rejects(
    call("save", {
      token: a.token,
      revision: saved.revision,
      html: html("stale owner"),
    }),
    409,
  );
  await rejects(
    call("save", { token: b.token, revision, html: html("stale revision") }),
    409,
  );
  assert.match(await readFile(file, "utf8"), />two</);
  const directories = await readdir(path.join(root, ".html-design/history"));
  assert.ok(directories.length);
  clock += 101;
  await rejects(
    call("save", {
      token: b.token,
      revision: saved.revision,
      html: html("expired"),
    }),
    409,
  );
  await rejects(store.handle("open", { path: "/../package.json" }), 403);
  await rejects(call("open", { path: "/protocol.html/../package.json" }), 403);
});

test("AI waits for flush/yield, commits latest revision, and detects direct external writes", async () => {
  const file = path.join(root, "ai.html");
  await writeFile(file, html("base"));
  const store = createDocumentStore(root),
    call = (action, body = {}) =>
      store.handle(action, { path: "/ai.html", ...body });
  const rev = revisionOf(await readFile(file));
  const owner = await call("open", { revision: rev });
  const ai = await call("ai/begin");
  assert.equal(ai.ready, false);
  assert.equal((await call("ai/status", { token: ai.token })).ready, false);
  const pending = (await call("sync", { token: owner.token })).pending;
  const latest = await call("save", {
    token: owner.token,
    revision: rev,
    html: html("manual"),
  });
  await call("yield", {
    token: owner.token,
    requestId: pending.id,
    revision: latest.revision,
  });
  const ready = await call("ai/status", { token: ai.token });
  assert.match(ready.html, />manual</);
  await rejects(
    call("save", {
      token: owner.token,
      revision: latest.revision,
      html: html("late browser"),
    }),
    409,
  );
  await call("ai/commit", {
    token: ai.token,
    revision: ready.revision,
    html: ready.html.replace(">manual<", ">manual + AI<"),
  });
  assert.match(await readFile(file, "utf8"), />manual \+ AI</);
  assert.equal((await call("sync", { token: owner.token })).role, "owner");
  await writeFile(file, html("external"));
  await rejects(
    call("save", {
      token: owner.token,
      revision: ready.revision,
      html: html("lost external"),
    }),
    409,
  );
  assert.match(await readFile(file, "utf8"), />external</);
});

test("service injects load revision and rejects cross-origin writes and hidden work files", async () => {
  const response = await fetch(`${origin}/demos/test.html`),
    source = await response.text();
  assert.match(source, /data-editor-connection>/);
  const config = JSON.parse(
    source.match(/data-editor-connection>(.*?)<\/script>/)[1],
  );
  assert.equal(
    config.revision,
    revisionOf(await readFile(path.join(root, "demos/test.html"))),
  );
  assert.equal(
    (
      await fetch(`${origin}/__html-design/document/open`, {
        method: "POST",
        headers: {
          Origin: "https://example.com",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: "/demos/test.html" }),
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(`${origin}/.html-design/work/file.html`)).status,
    403,
  );
});

async function waitDisk(file, text) {
  for (let i = 0; i < 100; i++) {
    if ((await readFile(file, "utf8")).includes(text)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.fail(`disk did not contain ${text}`);
}
async function api(action, body) {
  const res = await fetch(`${origin}/__html-design/document/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/demos/test.html", ...body }),
  });
  assert.equal(res.status, 200, await res.clone().text());
  return res.json();
}

test("browser autosaves text mid-edit, keeps zoom out of HTML, and hands latest DOM to AI and another window", async () => {
  const ctx = await browser.newContext(),
    a = await ctx.newPage(),
    b = await ctx.newPage();
  const errors = [];
  a.on("pageerror", (e) => errors.push(e.message));
  try {
    await a.goto(`${origin}/demos/test.html`);
    await a
      .locator(".state-text")
      .filter({ hasText: /^已保存$/ })
      .waitFor();
    await b.goto(`${origin}/demos/test.html`);
    await b
      .locator(".state-text")
      .filter({ hasText: /其他窗口编辑中/ })
      .waitFor();
    assert.equal(await b.locator("[data-act=add-text]").isEnabled(), false);
    assert.equal(await a.locator("html").getAttribute("data-editing"), null);
    await a.locator("[data-act=edit]").click();
    await a.locator("[data-el=p1-title]").dblclick();
    await a.locator("[data-el=p1-title]").fill("Manual preserved");
    const file = path.join(root, "demos/test.html");
    await waitDisk(file, "Manual preserved");
    assert.equal(
      await a.locator("[data-el=p1-title]").getAttribute("contenteditable"),
      "true",
      "autosave does not end typing",
    );
    await a.keyboard.press("Escape");
    await a.locator("[data-act=zoom-out]").click();
    const saved = await readFile(file, "utf8");
    assert.doesNotMatch(
      saved.replace(/<script data-editor[\s\S]*?<\/script>/g, ""),
      /data-editor-connection|<html-design-editor|data-editor-current|transform:translateX/,
    );
    await a.locator("[data-el=p1-title]").click();
    await a.locator("[data-el=p1-image]").click({ modifiers: ["Shift"] });
    await a.keyboard.press("ArrowRight");
    assert.match(
      await a.locator("[data-el=p1-image]").getAttribute("style"),
      /translate: 1px/,
    );
    await waitDisk(file, "translate: 1px");
    await a.locator("[data-act=done]").click();
    await new Promise((resolve) => setTimeout(resolve, 2200));
    assert.equal(
      await a.locator("html").getAttribute("data-editing"),
      null,
      "save heartbeat must not re-enter editing",
    );
    const pending = await api("ai/begin");
    let ready;
    for (let i = 0; i < 50; i++) {
      ready = await api("ai/status", { token: pending.token });
      if (ready.ready) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready.ready);
    assert.match(ready.html, /Manual preserved/);
    assert.match(ready.html, /translate: 1px(?: 0px)?;/);
    assert.match(ready.html, /data-el="p1-image"[^>]*translate: 1px/);
    assert.doesNotMatch(
      ready.html.replace(/<script[\s\S]*?<\/script>/g, ""),
      /selection-member|class="marquee"/,
    );
    await api("ai/commit", {
      token: pending.token,
      revision: ready.revision,
      html: ready.html.replace("Manual preserved", "Manual preserved + AI"),
    });
    await a
      .locator("[data-el=p1-title]")
      .filter({ hasText: "Manual preserved + AI" })
      .waitFor();
    await a
      .locator(".state-text")
      .filter({ hasText: /^已保存$/ })
      .waitFor();
    assert.equal(await b.locator("[data-act=takeover]").count(), 0);
    await b.locator("[data-act=edit]").click();
    await b
      .locator(".state-text")
      .filter({ hasText: /^已保存$/ })
      .waitFor();
    await a
      .locator(".state-text")
      .filter({ hasText: /其他窗口编辑中/ })
      .waitFor();
    assert.equal(await b.locator("html").getAttribute("data-editing"), "");
    await b.locator("[data-el=p1-title]").dblclick();
    await b.locator("[data-el=p1-title]").fill("Second window");
    await waitDisk(file, "Second window");
    assert.deepEqual(errors, []);
  } finally {
    await ctx.close();
  }
});

test("one Edit click waits for the old owner's pending save and enters editing after the revision reload", async () => {
  const file = path.join(root, "demos/one-click.html");
  await writeFile(
    file,
    html("Before handoff", await readFile("html-design/editor.js", "utf8")),
  );
  const ctx = await browser.newContext(),
    a = await ctx.newPage(),
    b = await ctx.newPage(),
    errors = [];
  for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
  try {
    await a.goto(`${origin}/demos/one-click.html`);
    await a
      .locator(".state-text")
      .filter({ hasText: /^已保存$/ })
      .waitFor();
    await a.locator("[data-act=edit]").click();
    await a.locator("[data-el=p1-title]").dblclick();
    await b.goto(`${origin}/demos/one-click.html`);
    await b.locator(".state-text").filter({ hasText: /只读/ }).waitFor();
    assert.ok(await b.locator("[data-act=edit]").isVisible());
    assert.ok(await b.locator("[data-act=edit]").isEnabled());
    let releaseSave, saveStarted;
    const started = new Promise((resolve) => (saveStarted = resolve)),
      gate = new Promise((resolve) => (releaseSave = resolve));
    await a.route("**/__html-design/document/save", async (route) => {
      saveStarted();
      await gate;
      await route.continue();
    });
    await a.locator("[data-el=p1-title]").fill("Latest pending human text");
    await started;
    await b.locator("[data-act=edit]").click();
    await b.waitForFunction(
      () =>
        document
          .querySelector("html-design-editor")
          .shadowRoot.querySelector("[data-act=edit]")
          .getAttribute("aria-busy") === "true",
    );
    assert.equal(
      await b.locator("html").getAttribute("data-editing"),
      null,
      "do not edit before the pending save finishes",
    );
    releaseSave();
    await b
      .locator("[data-el=p1-title]")
      .filter({ hasText: "Latest pending human text" })
      .waitFor();
    await b.waitForFunction(() =>
      document.documentElement.hasAttribute("data-editing"),
    );
    assert.match(await readFile(file, "utf8"), /Latest pending human text/);
    assert.equal(await a.locator("html").getAttribute("data-editing"), null);
    await b.locator("[data-act=done]").click();
    await new Promise((resolve) => setTimeout(resolve, 2200));
    assert.equal(
      await b.locator("html").getAttribute("data-editing"),
      null,
      "completed editing must not resume on heartbeat",
    );
    assert.deepEqual(errors, []);
  } finally {
    await ctx.close();
  }
});

test("failed writes retain a recoverable draft and reconnect without losing pending text", async () => {
  const ctx = await browser.newContext(),
    page = await ctx.newPage();
  try {
    await page.goto(`${origin}/demos/test.html`);
    await page.waitForFunction(() => {
      const s = document.querySelector("html-design-editor").shadowRoot;
      return !s.querySelector("[data-act=edit]").disabled;
    });
    await page.locator("[data-act=edit]").click();
    await page
      .locator(".state-text")
      .filter({ hasText: /^已保存$/ })
      .waitFor();
    let failing = true;
    await page.route("**/__html-design/document/save", (route) =>
      failing ? route.abort() : route.continue(),
    );
    await page.locator("[data-el=p1-title]").dblclick();
    await page.locator("[data-el=p1-title]").fill("Offline retained");
    await page
      .locator(".state-text")
      .filter({ hasText: /保存失败/ })
      .waitFor();
    assert.doesNotMatch(
      await readFile(path.join(root, "demos/test.html"), "utf8"),
      /Offline retained/,
    );
    assert.equal(
      await page.locator("[data-el=p1-title]").textContent(),
      "Offline retained",
    );
    const hasDraft = await page.evaluate(
      async () =>
        new Promise((resolve) => {
          const r = indexedDB.open("html-design-drafts", 1);
          r.onsuccess = () => {
            const req = r.result
              .transaction("drafts")
              .objectStore("drafts")
              .getAll();
            req.onsuccess = () =>
              resolve(
                req.result.some((d) => d.html.includes("Offline retained")),
              );
          };
        }),
    );
    assert.ok(hasDraft);
    failing = false;
    await page.locator("[data-act=status]").click();
    await page.locator("[data-act=retry]").click();
    await waitDisk(path.join(root, "demos/test.html"), "Offline retained");
  } finally {
    await ctx.close();
  }
});

test("recover draft restores text, inline positions and image source without running scripts", async () => {
  const source = html(
    "Recovery base",
    await readFile("html-design/editor.js", "utf8"),
  );
  const file = path.join(root, "demos/recovery.html");
  await writeFile(file, source);
  const ctx = await browser.newContext(),
    page = await ctx.newPage();
  try {
    await page.goto(`${origin}/demos/test.html`);
    await page.evaluate(
      async ({ source, revision }) =>
        new Promise((resolve) => {
          const r = indexedDB.open("html-design-drafts", 1);
          r.onsuccess = () => {
            const tx = r.result.transaction("drafts", "readwrite");
            tx.objectStore("drafts").put({
              id: "recovery-fixture",
              path: "/demos/recovery.html",
              revision,
              updated: Date.now(),
              html: source
                .replace("Recovery base", "Recovered manual text")
                .replace(
                  '<h1 data-el="p1-title">',
                  '<h1 data-el="p1-title" style="translate:42px 18px">',
                ),
            });
            tx.oncomplete = resolve;
          };
        }),
      { source, revision: revisionOf(source) },
    );
    await page.goto(`${origin}/demos/recovery.html`);
    await page
      .locator(".state-text")
      .filter({ hasText: /发现未保存草稿/ })
      .waitFor();
    await page.locator("[data-act=status]").click();
    await page.locator("[data-act=recover]").click();
    await waitDisk(file, "Recovered manual text");
    assert.match(await readFile(file, "utf8"), /translate:42px 18px/);
    assert.equal(
      await page.locator("[data-el=p1-image]").getAttribute("src"),
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='red'/%3E%3C/svg%3E",
    );
  } finally {
    await ctx.close();
  }
});

test("browser conflict preserves pending text, downloads a copy, and never overwrites external changes", async () => {
  const file = path.join(root, "demos/conflict.html");
  await writeFile(
    file,
    html("Conflict base", await readFile("html-design/editor.js", "utf8")),
  );
  const ctx = await browser.newContext(),
    page = await ctx.newPage();
  try {
    await page.goto(`${origin}/demos/conflict.html`);
    await page
      .locator(".state-text")
      .filter({ hasText: /^已保存$/ })
      .waitFor();
    await page.locator("[data-act=edit]").click();
    await page.locator("[data-el=p1-title]").dblclick();
    await page.locator("[data-el=p1-title]").fill("Pending browser text");
    await writeFile(
      file,
      (await readFile(file, "utf8")).replace(
        "Conflict base",
        "External latest",
      ),
    );
    await page
      .locator(".state-text")
      .filter({ hasText: /版本冲突|原文件已有新版本/ })
      .waitFor();
    await page.locator("[data-act=status]").click();
    await page.locator("[data-act=conflict]").waitFor({ state: "visible" });
    assert.match(await readFile(file, "utf8"), /External latest/);
    assert.equal(
      await page.locator("[data-el=p1-title]").textContent(),
      "Pending browser text",
    );
    const downloadEvent = page.waitForEvent("download");
    await page.locator("[data-act=conflict]").click();
    const download = await downloadEvent;
    assert.match(
      await readFile(await download.path(), "utf8"),
      /Pending browser text/,
    );
    await page
      .locator("[data-el=p1-title]")
      .filter({ hasText: "External latest" })
      .waitFor();
    assert.doesNotMatch(await readFile(file, "utf8"), /Pending browser text/);
  } finally {
    await ctx.close();
  }
});
