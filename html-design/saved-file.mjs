import http from 'node:http';
import path from 'node:path';
import { constants } from 'node:fs';
import { open, realpath, stat, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const LIMIT = 32 * 1024 * 1024;
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

export async function readSavedSnapshot(input, { root, baseUrl, signal } = {}) {
  signal?.throwIfAborted();
  const inputPath = await realpath(input);
  const resourceRoot = baseUrl ? null : await realpath(root || path.dirname(path.resolve(input)));
  if (resourceRoot && !inside(resourceRoot, inputPath)) throw new Error('Input is outside the resource root.');
  const beforeOpen = await stat(inputPath);
  if (!beforeOpen.isFile() || beforeOpen.size > LIMIT) throw new Error('Input must be a regular HTML file of at most 32 MiB.');
  // Reject devices/pipes before open, and never block if the path is replaced
  // by a FIFO between stat and open. NOFOLLOW also rejects a replaced symlink.
  const source = await open(inputPath, constants.O_RDONLY | (constants.O_NONBLOCK || 0) | (constants.O_NOFOLLOW || 0));
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
  return { inputPath, resourceRoot, snapshot, revision: createHash('sha256').update(snapshot).digest('hex') };
}

export function localResourceUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    !(url.hostname === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(url.hostname))) throw new Error('--base-url must use a loopback HTTP(S) IP address (127.0.0.1 or [::1]).');
  return url.href;
}
