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

test('PPTX paragraphs reflow at the textbox width while authored breaks and rich styles survive', async () => {
  const paragraph = '中文段落可以随文本框宽度重新换行。English words keep their spaces across soft wraps.';
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    [data-artboard]{width:600px;height:900px} [data-el]{width:120px;font:20px/28px Arial;margin:0}
    </style></head><body><main data-stage><section data-artboard="reflow">
    <p data-el="soft">${paragraph}</p>
    <p data-el="rich">Before <span style="font-weight:bold;color:#ffcc00;font-size:26px">bold words</span> after.</p>
    <p data-el="br">First<br><span style="font-weight:bold">Second</span><br><br>Fourth</p>
    <div data-el="blocks"><div>One <span style="color:#ff0000">red</span></div><div>Two</div><p>Three</p></div>
    <p data-el="normal">  Source\n indentation <span>  and </span> spaces  </p>
    <p data-el="pre-line" style="white-space:pre-line">First\n   Second\n\nFourth</p>
    <p data-el="pre-wrap" style="white-space:pre-wrap">  First\n  Second  line</p>
    <p data-el="invisible">Visible<span style="display:none">HIDDEN</span><span style="visibility:hidden">HIDDEN</span> text</p>
    <p data-el="case" style="text-transform:uppercase">small <span>words</span></p>
    <p data-el="spans">one<span> </span><b>two </b><span> three</span>&nbsp;four</p>
    <p data-el="trailing">First<br></p>
    <div data-el="flex" style="display:flex;width:500px;gap:10px"><span>Price:</span><span>$20</span></div>
    <div data-el="grid" style="display:grid;width:500px;grid-template-columns:1fr 1fr;gap:10px"><span>Grid</span><span>items</span></div>
    <div data-el="column" style="display:flex;flex-direction:column"><span>Top</span><span>Bottom</span></div>
    </section></main></body></html>`;
  const response = await request('pptx', html);
  assert.equal(response.status, 200, await response.clone().text());
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const xml = await zip.file('ppt/slides/slide1.xml').async('string');
  const textboxes = [...xml.matchAll(/<p:sp>.*?<\/p:sp>/gs)].map(match => match[0]).filter(s => s.includes('<p:txBody>'));
  assert.equal(textboxes.length, 14, 'each original text element remains one editable textbox');
  const box = name => {
    const shape = textboxes.find(s => s.includes(`name="${name}"`));
    assert.ok(shape, `textbox ${name} exists`);
    assert.match(shape, /<a:bodyPr[^>]*wrap="square"/);
    assert.doesNotMatch(shape, /<a:(?:normAutofit|spAutoFit)/, 'resizing keeps the authored font size');
    return shape;
  };
  const paragraphs = name => [...box(name).matchAll(/<a:p>.*?<\/a:p>/gs)].map(match =>
    [...match[0].matchAll(/<a:t>(.*?)<\/a:t>/gs)].map(text => text[1]).join(''));
  assert.deepEqual(paragraphs('soft'), [paragraph], 'soft wraps must not become hard paragraph breaks');
  assert.deepEqual(paragraphs('rich'), ['Before bold words after.']);
  assert.match(box('rich'), /b="1"/);
  assert.match(box('rich'), /FFCC00/);
  assert.match(box('rich'), /sz="1950"/);
  assert.deepEqual(paragraphs('br'), ['First', 'Second', '', 'Fourth']);
  assert.deepEqual(paragraphs('blocks'), ['One red', 'Two', 'Three']);
  assert.deepEqual(paragraphs('normal'), ['Source indentation and spaces']);
  assert.deepEqual(paragraphs('pre-line'), ['First', 'Second', '', 'Fourth']);
  assert.deepEqual(paragraphs('pre-wrap'), ['  First', '  Second  line']);
  assert.deepEqual(paragraphs('invisible'), ['Visible text']);
  assert.deepEqual(paragraphs('case'), ['SMALL WORDS']);
  assert.deepEqual(paragraphs('spans'), ['one two three\u00a0four']);
  assert.deepEqual(paragraphs('trailing'), ['First', '']);
  assert.deepEqual(paragraphs('flex'), ['Price: $20'], 'blockified row items are not separate paragraphs');
  assert.deepEqual(paragraphs('grid'), ['Grid items']);
  assert.deepEqual(paragraphs('column'), ['Top', 'Bottom']);
});

// Synthetic fixtures only: no user attachment content is stored in the repository.
const shapesOf = xml => [...xml.matchAll(/<p:sp>.*?<\/p:sp>/gs)].map(match => match[0]);
const namedShape = (xml, name) => {
  const shape = shapesOf(xml).find(s => s.includes(`name="${name}"`));
  assert.ok(shape, `shape ${name} exists`);
  return shape;
};
async function slideXml(html) {
  const response = await request('pptx', html);
  assert.equal(response.status, 200, await response.clone().text());
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  return { xml: await zip.file('ppt/slides/slide1.xml').async('string'), zip };
}

test('PPTX uniform rounded cards use one native fill/stroke shape each, with editable reflowing children', async () => {
  const html = `<!doctype html><html><head><style>
    [data-artboard]{width:960px;height:540px;position:relative}
    .card{position:absolute;top:100px;width:240px;height:180px;box-sizing:border-box;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:18px}
    h1,p{margin:0;font:20px/28px Arial} h1{font-size:32px}
    </style></head><body><main data-stage><section data-artboard="p1">
    <h1 data-el="title">Synthetic cards</h1>
    ${[0, 1, 2].map(i => `<div data-el="card${i}" class="card" style="left:${40 + i * 280}px"><p data-el="card${i}-title">Card ${i + 1}</p><p data-el="card${i}-body">An editable paragraph with enough text to wrap at the authored width.</p></div>`).join('')}
    </section></main></body></html>`;
  const { xml } = await slideXml(html);
  assert.equal(shapesOf(xml).length, 10, 'three containers plus seven textboxes, formerly 22 fragments');
  assert.doesNotMatch(xml, /-border"|<p:pic>|<p:grpSp>/);
  for (let i = 0; i < 3; i++) {
    const shape = namedShape(xml, `card${i}`);
    assert.match(shape, /<a:solidFill><a:srgbClr val="FFF7ED"/);
    assert.match(shape, /<a:ln w="9525"[^>]*>.*?<a:srgbClr val="FED7AA"/s);
    assert.match(shape, /<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 6425"/);
    assert.match(shape, new RegExp(`<a:off x="${Math.round((40 + i * 280 + .5) * 9525)}" y="957263"`));
    assert.match(shape, /<a:ext cx="2276475" cy="1704975"/);
    assert.doesNotMatch(shape, /<p:txBody>/);
    for (const suffix of ['title', 'body']) assert.match(namedShape(xml, `card${i}-${suffix}`), /<a:bodyPr[^>]*wrap="square"/);
    const body = namedShape(xml, `card${i}-body`);
    assert.equal((body.match(/<a:p>/g) || []).length, 1, 'soft wraps remain a single native paragraph');
  }
});

test('PPTX container mapping preserves transparent, absent and differing borders without false unification', async () => {
  const definitions = [
    ['transparent-fill', 'background:transparent;border:2px solid rgba(20,40,60,.5);border-radius:10px'],
    ['no-border', 'background:#abcdef;border:0;border-radius:0'],
    ['transparent-border', 'background:#abcdef;border:4px solid transparent;border-radius:8px'],
    ['invisible', 'background:transparent;border:4px solid transparent'],
    ['different-color', 'background:#abcdef;border:2px solid red;border-left-color:blue'],
    ['different-width', 'background:#abcdef;border:2px solid red;border-left-width:4px'],
    ['different-style', 'background:#abcdef;border:2px solid red;border-left-style:dashed'],
    ['different-corners', 'background:#abcdef;border:2px solid red;border-radius:12px 4px'],
    ['pill', 'background:#abcdef;border:2px solid red;border-radius:999px'],
    ['small-radius', 'background:#abcdef;border:1px solid red;border-radius:2px'],
    ['alpha', 'background:rgba(171,205,239,.5);border:2px solid rgba(20,40,60,.5);border-radius:10px;opacity:.5'],
    ['ellipse', 'background:#abcdef;border:2px solid red;border-radius:50%'],
    ['elliptic-corners', 'background:#abcdef;border:2px solid red;border-radius:20%'],
    ['transformed', 'background:#abcdef;border:2px solid red;transform:scale(.8)'],
    ['tiny-radius', 'background:#abcdef;border:4px solid red;border-radius:1px'],
  ];
  const html = `<!doctype html><html><head><style>[data-artboard]{width:800px;height:600px;position:relative}.box{position:absolute;width:100px;height:60px;box-sizing:border-box}</style></head><body><main data-stage><section data-artboard="p1">${definitions.map(([id, style], i) => `<div class="box" data-el="${id}" style="left:${20 + i % 5 * 140}px;top:${20 + Math.floor(i / 5) * 150}px;${style}"></div>`).join('')}</section></main></body></html>`;
  const { xml, zip } = await slideXml(html);
  const transparent = namedShape(xml, 'transparent-fill');
  assert.match(transparent, /<a:ln w="19050"[^>]*>.*?<a:srgbClr val="14283C"><a:alpha val="50000"/s);
  assert.doesNotMatch(xml, /name="transparent-fill-border"|name="transparent-border-border"|name="no-border-border"|name="invisible(?:-border)?"/);
  assert.match(namedShape(xml, 'no-border'), /<a:prstGeom prst="rect"/);
  assert.match(namedShape(xml, 'transparent-border'), /<a:off x="2857500" y="190500"/);
  for (const id of ['different-color', 'different-width', 'different-style', 'different-corners', 'elliptic-corners', 'transformed', 'tiny-radius']) {
    assert.equal(shapesOf(xml).filter(s => s.includes(`name="${id}-border"`)).length, 4, `${id} keeps its side-specific fallback`);
    assert.match(namedShape(xml, id), /<a:ln[^>]*>.*?<a:alpha val="0"/s, 'fallback fill must not add a uniform stroke');
  }
  assert.match(namedShape(xml, 'pill'), /<a:prstGeom prst="roundRect"/);
  assert.match(namedShape(xml, 'pill'), /fmla="val 50000"/);
  assert.match(namedShape(xml, 'small-radius'), /<a:prstGeom prst="roundRect"/);
  assert.equal((namedShape(xml, 'alpha').match(/<a:alpha val="25000"/g) || []).length, 2, 'fill and stroke combine CSS alpha with element opacity');
  assert.match(namedShape(xml, 'ellipse'), /<a:prstGeom prst="ellipse"/);
  assert.match(namedShape(xml, 'different-corners'), /<a:prstGeom prst="rect"/, 'unsupported corners do not masquerade as precise rounding');
  assert.match(namedShape(xml, 'elliptic-corners'), /<a:prstGeom prst="rect"/);
  assert.match(await zip.file('ppt/notesSlides/notesSlide1.xml').async('string'), /different-corners/);
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
