#!/usr/bin/env node
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { open, realpath, stat, lstat, readFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { exportDocument } from './export.mjs';

const LIMIT = 32 * 1024 * 1024;
const help = `Export a saved HTML snapshot without opening the editor or a persistent server.
Usage: node html-design/export-cli.mjs <pptx|pdf> <input.html> --output <out.pptx|out.pdf>
Options:
  --root <directory>       Temporary read-only resource root (default: input directory).
  --base-url <local-url>   Existing loopback file URL for original resources; no temporary server.
                          With this option --root is not used; useful for AI work copies.
  --title <title>          Document title (default: input filename).
  --help                  Show help; no browser required.
Reads saved bytes only, not unsaved browser DOM. Active files require normal save/AI handoff first.
Never overwrites the input or an existing output. Success prints one JSON summary, not a fidelity report.`;
const inside = (root, file) => file !== root && !path.relative(root, file).startsWith(`..${path.sep}`) && path.relative(root, file) !== '..' && !path.isAbsolute(path.relative(root, file));
const mime = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };

// Separate from the preview server: no document, save, takeover or export APIs.
export async function createResourceServer(root) {
  root = await realpath(root);
  if (!(await stat(root)).isDirectory()) throw new Error('Resource root must be a directory.');
  const server = http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
      if (req.headers.host !== `127.0.0.1:${server.address().port}`) { res.writeHead(403); return res.end(); }
      const url = new URL(req.url, 'http://127.0.0.1');
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (relative.split(/[\\/]/).some(part => part.startsWith('.') || part === 'node_modules')) { res.writeHead(403); return res.end(); }
      const file = await realpath(path.resolve(root, relative));
      if (!inside(root, file)) { res.writeHead(403); return res.end(); }
      if (!(await stat(file)).isFile()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Security-Policy': "script-src 'none'; object-src 'none'; frame-src 'none'" });
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); }),
  };
}

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  const [format, input, ...rest] = args;
  if (!['pptx', 'pdf'].includes(format) || !input || input.startsWith('--')) throw new Error('Expected <pptx|pdf> <input.html> --output <file>. Use --help.');
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i], value = rest[i + 1];
    if (!['--output', '--root', '--base-url', '--title'].includes(key) || !value || value.startsWith('--') || options[key] !== undefined) throw new Error('Invalid or duplicate command options. Use --help.');
    options[key] = value;
  }
  if (!options['--output']) throw new Error('--output is required.');
  if (!/\.html?$/i.test(input)) throw new Error('Input must be an HTML file.');
  if (path.extname(options['--output']).toLowerCase() !== `.${format}`) throw new Error('Output extension must match the requested format.');
  if (options['--base-url']) {
    const url = new URL(options['--base-url']);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      !(url.hostname === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(url.hostname))) throw new Error('--base-url must use a loopback HTTP(S) IP address (127.0.0.1 or [::1]).');
    options['--base-url'] = url.href;
  }
  return { format, input, output: options['--output'], root: options['--root'], baseUrl: options['--base-url'], title: options['--title'] };
}

export async function exportFile({ format, input, output, root, baseUrl, title }, { signal } = {}) {
  signal?.throwIfAborted();
  const inputPath = await realpath(input);
  const outputPath = path.join(await realpath(path.dirname(path.resolve(output))), path.basename(output));
  if (inputPath === outputPath) throw new Error('Input and output must differ.');
  try { await lstat(outputPath); throw new Error('Output already exists; choose a new path.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const resourceRoot = baseUrl ? null : await realpath(root || path.dirname(path.resolve(input)));
  if (resourceRoot && !inside(resourceRoot, inputPath)) throw new Error('Input is outside the resource root.');
  const source = await open(inputPath, 'r');
  let snapshot;
  try {
    const info = await source.stat();
    if (!info.isFile() || info.size > LIMIT) throw new Error('Input must be a regular HTML file of at most 32 MiB.');
    // A fixed-size read bounds memory even if another process grows the file.
    const buffer = Buffer.alloc(info.size + 1);
    let length = 0;
    while (length < buffer.length) {
      signal?.throwIfAborted();
      const part = await source.read(buffer, length, buffer.length - length, length);
      if (!part.bytesRead) break;
      length += part.bytesRead;
    }
    if (length > info.size) throw new Error('Input changed while reading; save and retry.');
    snapshot = buffer.subarray(0, length);
  } finally { await source.close(); }
  let resources, handle, owned;
  try {
    if (!baseUrl) {
      resources = await createResourceServer(resourceRoot);
      const relative = path.relative(resourceRoot, inputPath).split(path.sep).map(encodeURIComponent).join('/');
      baseUrl = `${resources.origin}/${relative}`;
    }
    const result = await exportDocument({ html: snapshot.toString('utf8'), baseUrl, title: title || path.basename(inputPath, path.extname(inputPath)), format }, { signal });
    signal?.throwIfAborted();
    handle = await open(outputPath, 'wx', 0o600);
    owned = await handle.stat();
    await handle.writeFile(result.bytes);
    await handle.sync();
    signal?.throwIfAborted();
    const current = await lstat(outputPath);
    if (current.dev !== owned.dev || current.ino !== owned.ino) throw new Error('Output changed during export; no replacement was made.');
    await handle.close(); handle = null;
    return { status: 'ok', format, input: inputPath, revision: createHash('sha256').update(snapshot).digest('hex'), output: outputPath, pages: result.pages, bytes: result.bytes.length };
  } catch (error) {
    await handle?.close().catch(() => {}); handle = null;
    if (owned) {
      const current = await lstat(outputPath).catch(() => null);
      if (current?.dev === owned.dev && current.ino === owned.ino) await unlink(outputPath);
    }
    throw error;
  } finally { await resources?.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const controller = new AbortController();
  let interrupted;
  const onSignal = signal => { interrupted = signal; controller.abort(new Error(`Export interrupted by ${signal}.`)); };
  const sigint = () => onSignal('SIGINT'), sigterm = () => onSignal('SIGTERM');
  process.once('SIGINT', sigint); process.once('SIGTERM', sigterm);
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) console.log(help);
    else console.log(JSON.stringify(await exportFile(options, { signal: controller.signal })));
  } catch (error) {
    console.error(JSON.stringify({ status: 'error', error: { code: interrupted ? 'EXPORT_INTERRUPTED' : 'EXPORT_FAILED', message: error.message } }));
    process.exitCode = interrupted === 'SIGINT' ? 130 : interrupted ? 143 : 1;
  } finally { process.removeListener('SIGINT', sigint); process.removeListener('SIGTERM', sigterm); }
}
