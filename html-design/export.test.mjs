import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { createPreviewServer } from './server.mjs';

let server, origin;
before(async () => {
  server = await createPreviewServer({ port: 0 });
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

const fixture = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>Snapshot test</title>
<style>body{margin:40px}[data-stage]{padding:80px;transform:scale(.5)}[data-artboard]{display:flex;flex-direction:column;box-sizing:border-box;width:600px;height:300px;background:#a23c2a;color:white;padding:30px;margin:40px}h1{font:40px Arial;margin:0}.second{width:800px;height:400px;background:#d9e7ec;color:#111}</style></head><body>
<header data-editor-ui>EDITOR MUST NOT BE EXPORTED</header><main data-stage>
<section data-artboard="p1" data-title="Unsaved title"><h1 data-el="p1-title" style="translate:20px 10px">LATEST UNSAVED <span style="font-weight:bold;color:#ffcc00">EDIT</span></h1></section>
<section data-artboard="p2" data-title="Second" class="second"><h1 data-el="p2-title">SECOND PAGE</h1><img data-el="p2-image" src="/demos/assets/bricks.jpg" style="width:80px;height:60px;object-fit:cover"></section>
</main><script>document.querySelector('[data-stage]').remove();</script></body></html>`;

async function request(format, html = fixture, headers = {}) {
  return fetch(`${origin}/__html-design/export/${format}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers },
    body: JSON.stringify({ html, baseUrl: `${origin}/demos/toy-history.html`, title: 'Latest DOM snapshot', filename: '玩具简史' }),
  });
}

test('PDF exports every submitted board at its own dimensions, with scripts disabled', async () => {
  const response = await request('pdf');
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(response.headers.get('x-html-design-pages'), '2');
  assert.match(response.headers.get('content-disposition'), /filename\*=UTF-8/);
  const bytes = await response.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 2);
  assert.equal(pdf.getTitle(), 'Latest DOM snapshot');
  for (const [i, expected] of [[0, [450, 225]], [1, [600, 300]]]) {
    const { width, height } = pdf.getPage(i).getSize();
    assert.ok(Math.abs(width - expected[0]) < 1 && Math.abs(height - expected[1]) < 1);
  }
});

test('PPTX contains editable text runs and separate source images, not flattened slides', async () => {
  const response = await request('pptx');
  assert.equal(response.status, 200, await response.clone().text());
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const slides = Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  assert.equal(slides.length, 2);
  const first = await zip.file('ppt/slides/slide1.xml').async('string');
  const second = await zip.file('ppt/slides/slide2.xml').async('string');
  assert.match(first, /<a:t>LATEST UNSAVED/);
  assert.match(first, /<a:t>EDIT<\/a:t>/);
  assert.match(first, /FFCC00/);
  assert.match(first, /b="1"/);
  assert.equal((first.match(/<p:pic>/g) || []).length, 0);
  assert.equal((second.match(/<p:pic>/g) || []).length, 1);
  assert.match(second, /SECOND PAGE/);
  assert.match(second, /p2-image/);
  assert.match(second, /<a:srcRect l="[1-9]\d*"/, 'cover images retain their crop instead of stretching');
  const xml = await zip.file('ppt/presentation.xml').async('string');
  assert.match(xml, /cx="5715000" cy="2857500"/);
  assert.match(await zip.file('ppt/notesSlides/notesSlide1.xml').async('string'), /可编辑元素/);
});

test('invalid export requests and cross-origin writes are rejected without touching files', async () => {
  assert.equal((await request('pdf', fixture, { Origin: 'https://example.com' })).status, 403);
  assert.equal((await request('exe')).status, 404);
  assert.equal((await request('pdf', '<html>empty</html>')).status, 400);
  assert.equal((await fetch(`${origin}/node_modules/playwright/package.json`)).status, 403);
  assert.equal((await fetch(`${origin}/demos/recovered/tab-v5-snapshot.json`)).status, 403);
  assert.deepEqual(await (await fetch(`${origin}/__html-design/health`)).json(), { exports: ['pdf', 'pptx'] });
});

test('PPTX reports incompatible page ratios rather than stretching slides', async () => {
  const response = await request('pptx', fixture.replace('width:800px;height:400px', 'width:800px;height:600px'));
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /相同比例/);
});
