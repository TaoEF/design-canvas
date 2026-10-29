import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rm, readdir, symlink, access, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import http from 'node:http';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { createResourceServer } from './export-cli.mjs';

let dir, source, original;
const hash = value => createHash('sha256').update(value).digest('hex');
const absent = async file => assert.rejects(access(file), { code: 'ENOENT' });
function start(args, env = {}) {
  const child = spawn(process.execPath, ['html-design/export-cli.mjs', ...args], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', bytes => { stdout += bytes; });
  child.stderr.on('data', bytes => { stderr += bytes; });
  const done = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('CLI did not terminate within 60 seconds')); }, 60_000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', (code, signal) => { clearTimeout(timeout); resolve({ code, signal, stdout, stderr }); });
  });
  return { child, done };
}
async function command(args, env) { return start(args, env).done; }
function success(result) {
  assert.equal(result.code, 0, result.stderr); assert.equal(result.stderr, '');
  assert.equal(result.stdout.trim().split('\n').length, 1);
  const json = JSON.parse(result.stdout); assert.equal(json.status, 'ok'); return json;
}
function failure(result) {
  assert.notEqual(result.code, 0); assert.equal(result.stdout, '');
  const json = JSON.parse(result.stderr); assert.equal(json.status, 'error'); return json;
}
before(async () => {
  dir = await realpath(await mkdtemp(path.join(tmpdir(), 'dom-export-cli-')));
  await mkdir(path.join(dir, '资料 目录')); await mkdir(path.join(dir, '资源 目录'));
  await copyFile('demos/assets/bricks.jpg', path.join(dir, '资源 目录', '图片.jpg'));
  const assets = 'node_modules/playwright-core/lib/vite/recorder/assets';
  const font = (await readdir(assets)).find(name => /^codicon.*\.ttf$/.test(name));
  assert.ok(font, 'locked Playwright includes its test font');
  await copyFile(path.join(assets, font), path.join(dir, '资源 目录', '字体.ttf'));
  await writeFile(path.join(dir, '资源 目录', '样式.css'), '@font-face{font-family:CliIcons;src:url("字体.ttf")} [data-artboard]{width:600px;height:300px;position:relative} p{margin:0;font:20px/28px Arial}.card{position:absolute;left:20px;top:50px;width:300px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px}img{width:80px;height:60px;object-fit:cover}');
  original = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../资源 目录/样式.css"></head><body><main data-stage><section data-artboard="p1"><p data-el="title">Saved snapshot</p><div data-el="card" class="card"><p data-el="body">Editable card <span style="font-family:CliIcons">\ueab5</span></p><img data-el="photo" src="../资源 目录/图片.jpg"></div></section><section data-artboard="p2"><p data-el="second">Second page</p></section></main><script>document.querySelector('[data-stage]').remove();</script></body></html>`;
  source = path.join(dir, '资料 目录', '中文 设计.html'); await writeFile(source, original);
});
after(async () => { await rm(dir, { recursive: true, force: true }); });

test('CLI exports saved Chinese/space paths to grouped native PPTX and PDF with relative CSS, image and font resources', async () => {
  for (const format of ['pptx', 'pdf']) {
    const output = path.join(dir, `导出 结果.${format}`);
    const result = success(await command([format, source, '--root', dir, '--output', output, '--title', 'CLI snapshot']));
    assert.equal(result.format, format); assert.equal(result.input, source); assert.equal(result.output, output);
    assert.equal(result.revision, hash(Buffer.from(original))); assert.equal(result.pages, 2);
    const bytes = await readFile(output); assert.equal(result.bytes, bytes.length);
    if (format === 'pptx') {
      const zip = await JSZip.loadAsync(bytes);
      const first = await zip.file('ppt/slides/slide1.xml').async('string');
      assert.match(first, /<p:grpSp>/); assert.match(first, /Saved snapshot|Editable card/);
      assert.equal((first.match(/<p:pic>/g) || []).length, 1);
      assert.match(first, /<a:bodyPr[^>]*wrap="square"/);
      assert.match(first, /FFF7ED/); assert.match(first, /FED7AA/);
      assert.match(await zip.file('ppt/slides/slide2.xml').async('string'), /Second page/);
    } else {
      const pdf = await PDFDocument.load(bytes); assert.equal(pdf.getPageCount(), 2); assert.equal(pdf.getTitle(), 'CLI snapshot');
      assert.ok(Math.abs(pdf.getPage(0).getWidth() - 450) < .5); assert.ok(Math.abs(pdf.getPage(0).getHeight() - 225) < .5, 'Chromium PDF dimensions permit sub-point CSS-pixel quantization');
    }
    // An open temporary HTTP listener would keep this real child process alive.
    assert.equal(result.pages, 2, 'CLI completed and released its resource listener');
  }
  assert.equal(await readFile(source, 'utf8'), original);
});

test('CLI existing loopback base URL resolves original resources for an AI work copy outside that root', async () => {
  const resources = await createResourceServer(dir);
  try {
    const copyDir = await mkdtemp(path.join(tmpdir(), 'dom-work-copy-'));
    try {
      const copy = path.join(copyDir, 'work.html'); await writeFile(copy, original);
      const output = path.join(copyDir, 'work.pptx');
      const base = `${resources.origin}/` + '资料 目录/中文 设计.html'.split('/').map(encodeURIComponent).join('/');
      success(await command(['pptx', copy, '--base-url', base, '--output', output]));
      assert.equal(await readFile(copy, 'utf8'), original);
      const zip = await JSZip.loadAsync(await readFile(output));
      assert.match(await zip.file('ppt/slides/slide1.xml').async('string'), /<p:pic>/);
      assert.equal((await fetch(`${resources.origin}/资源%20目录/图片.jpg`)).status, 200, 'CLI does not close an existing external server');
    } finally { await rm(copyDir, { recursive: true, force: true }); }
  } finally { await resources.close(); }
});

test('CLI validates arguments before browser launch and preserves existing output/input, including symlinks', async () => {
  const output = path.join(dir, 'invalid.pptx');
  for (const args of [[], ['jpg', source, '--output', output], ['pptx', source], ['pptx', source, '--output', output, '--unknown', 'x'], ['pptx', source, '--output', output, '--output', output], ['pptx', source, '--output', path.join(dir, 'wrong.pdf')], ['pptx', source, '--output', output, '--base-url', 'https://example.com/file.html'], ['pptx', source, '--output', output, '--base-url', 'file:///tmp/file.html'], ['pptx', path.join(dir, 'missing.html'), '--output', output], ['pptx', source, '--root', path.join(dir, '资源 目录'), '--output', output]]) {
    const result = failure(await command(args, { HTML_DESIGN_CHROME: '/nonexistent-browser' }));
    assert.doesNotMatch(result.error.message, /browserType\.launch/);
    await absent(output);
  }
  const existing = path.join(dir, 'existing.pptx'); await writeFile(existing, 'keep');
  failure(await command(['pptx', source, '--output', existing])); assert.equal(await readFile(existing, 'utf8'), 'keep');
  const linked = path.join(dir, 'linked.pptx'); await symlink(source, linked);
  failure(await command(['pptx', source, '--output', linked])); assert.equal(await readFile(source, 'utf8'), original);
  failure(await command(['pptx', source, '--output', source])); assert.equal(await readFile(source, 'utf8'), original);
  const huge = path.join(dir, 'huge.html'); await writeFile(huge, Buffer.alloc(32 * 1024 * 1024 + 1));
  failure(await command(['pdf', huge, '--output', path.join(dir, 'huge.pdf')], { HTML_DESIGN_CHROME: '/nonexistent-browser' })); await absent(path.join(dir, 'huge.pdf'));
  const help = await command(['--help'], { HTML_DESIGN_CHROME: '/nonexistent-browser' }); assert.equal(help.code, 0); assert.match(help.stdout, /saved HTML/); assert.equal(help.stderr, '');
});

test('CLI render failures leave no output and release their temporary resource service', async () => {
  const cases = [
    ['no-boards', '<html><body>no boards</body></html>'],
    ['missing-image', original.replace('../资源 目录/图片.jpg', '../资源 目录/missing.jpg')],
    ['ratios', original.replace('data-artboard="p2"', 'data-artboard="p2" style="width:400px;height:400px"')],
  ];
  for (const [name, html] of cases) {
    const input = path.join(dir, '资料 目录', `${name}.html`), output = path.join(dir, `${name}.pptx`);
    await writeFile(input, html);
    failure(await command(['pptx', input, '--root', dir, '--output', output])); await absent(output);
  }
});

test('temporary service rejects writes, hidden/traversal paths and root-external symlink resources; CLI really fails to load them', async () => {
  const outside = await mkdtemp(path.join(tmpdir(), 'dom-export-outside-'));
  try {
    await copyFile('demos/assets/bricks.jpg', path.join(outside, 'outside.jpg'));
    await symlink(path.join(outside, 'outside.jpg'), path.join(dir, '资源 目录', 'escape.jpg'));
    const resources = await createResourceServer(dir);
    try {
      const allowed = `${resources.origin}/` + '资源 目录/图片.jpg'.split('/').map(encodeURIComponent).join('/');
      assert.equal((await fetch(allowed)).status, 200);
      assert.equal((await fetch(allowed, { method: 'HEAD' })).status, 200);
      assert.equal((await fetch(allowed, { method: 'POST' })).status, 405);
      assert.equal((await fetch(`${resources.origin}/资源%20目录/escape.jpg`)).status, 403);
      assert.equal((await fetch(`${resources.origin}/%2e%2e%2foutside.jpg`)).status, 403);
      assert.equal((await fetch(`${resources.origin}/.env`)).status, 403);
      assert.equal((await fetch(`${resources.origin}/__html-design/document/save`, { method: 'POST' })).status, 405);
      const font = await fetch(`${resources.origin}/资源%20目录/字体.ttf`); assert.equal(font.status, 200); assert.equal(font.headers.get('content-type'), 'font/ttf');
    } finally { await resources.close(); }
    await assert.rejects(fetch(resources.origin));
    const input = path.join(dir, '资料 目录', 'symlink.html'), output = path.join(dir, 'symlink.pptx');
    await writeFile(input, original.replace('../资源 目录/图片.jpg', '../资源 目录/escape.jpg'));
    const result = failure(await command(['pptx', input, '--root', dir, '--output', output]));
    assert.match(result.error.message, /图片加载失败/); await absent(output);
  } finally { await rm(outside, { recursive: true, force: true }); }
});

test('SIGTERM during a pending browser resource exits with JSON and no partial output', async () => {
  let requested; const waiting = new Promise(resolve => { requested = resolve; });
  const hold = http.createServer((req, res) => { if (req.url === '/hold.jpg') requested(); else { res.writeHead(404); res.end(); } });
  await new Promise(resolve => hold.listen(0, '127.0.0.1', resolve));
  const input = path.join(dir, 'interrupt.html'), output = path.join(dir, 'interrupt.pdf');
  await writeFile(input, `<html><body><main data-stage><section data-artboard="p1" style="width:600px;height:300px"><img src="/hold.jpg"></section></main></body></html>`);
  const run = start(['pdf', input, '--base-url', `http://127.0.0.1:${hold.address().port}/input.html`, '--output', output]);
  try {
    await Promise.race([waiting, run.done.then(result => { throw Error(`CLI exited before held image: ${JSON.stringify(result)}`); }), new Promise((_, reject) => setTimeout(() => reject(Error('browser did not request held resource')), 10_000).unref())]);
    run.child.kill('SIGTERM');
    const completed = await run.done; const result = failure(completed); assert.equal(completed.code, 143); assert.equal(result.error.code, 'EXPORT_INTERRUPTED'); await absent(output);
  } finally { run.child.kill('SIGKILL'); hold.closeAllConnections(); await new Promise(resolve => hold.close(resolve)); }
});


test('CLI rejects non-regular HTML inputs without opening a FIFO, and interruption cannot leave it blocked', { skip: process.platform === 'win32' }, async () => {
  const fifo = path.join(dir, 'pipe.html'), output = path.join(dir, 'pipe.pdf');
  await promisify(execFile)('mkfifo', [fifo]);
  const run = start(['pdf', fifo, '--output', output], { HTML_DESIGN_CHROME: '/nonexistent-browser' });
  const timer = setTimeout(() => { run.child.kill('SIGTERM'); }, 1000);
  let result;
  try {
    result = await Promise.race([run.done, new Promise((_, reject) => setTimeout(() => reject(Error('non-regular input blocked after SIGTERM')), 2500).unref())]);
  } finally { clearTimeout(timer); run.child.kill('SIGKILL'); }
  assert.equal(result.code, 1, result.stderr);
  assert.match(failure(result).error.message, /regular HTML file/);
  await absent(output);
  const directory = path.join(dir, 'directory.html'); await mkdir(directory);
  const notFile = failure(await command(['pdf', directory, '--output', output], { HTML_DESIGN_CHROME: '/nonexistent-browser' }));
  assert.match(notFile.error.message, /regular HTML file/); await absent(output);
});
