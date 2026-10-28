import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { exportDocument } from './export.mjs';
import { createDocumentStore, revisionOf } from './documents.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const LIMIT = 32 * 1024 * 1024;

export async function createPreviewServer({ root = process.cwd(), port = 8876 } = {}) {
  const rootPath = await realpath(root);
  let busy = false;
  const documents = createDocumentStore(rootPath);
  const server = http.createServer(async (req, res) => {
    const address = server.address();
    const host = `127.0.0.1:${address.port}`;
    const origin = `http://${host}`;
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    try {
      if (req.headers.host !== host) return json(403, { error: '请通过本地预览地址访问' });
      const url = new URL(req.url, origin);
      if (req.method === 'POST' && url.pathname.startsWith('/__html-design/document/')) {
        if (req.headers.origin && req.headers.origin !== origin) return json(403, { error: '不允许跨站写入请求' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: '请求格式不正确' });
        let length = 0, chunks = [];
        for await (const chunk of req) {
          length += chunk.length;
          if (length > LIMIT) return json(413, { error: '文件超过 32 MB，当前修改仍保留在页面中' });
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString()); }
        catch { return json(400, { error: '请求格式不正确' }); }
        if (!body || typeof body !== 'object') return json(400, { error: '请求格式不正确' });
        return json(200, await documents.handle(url.pathname.slice('/__html-design/document/'.length), body));
      }
      if (req.method === 'POST' && url.pathname.startsWith('/__html-design/export/')) {
        if (req.headers.origin && req.headers.origin !== origin) return json(403, { error: '不允许跨站导出请求' });
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: '请求格式不正确' });
        const format = url.pathname.split('/').pop();
        if (!['pdf', 'pptx'].includes(format)) return json(404, { error: '不支持的导出格式' });
        if (busy) return json(409, { error: '已有导出任务，请完成后再试' });
        let length = 0, chunks = [];
        for await (const chunk of req) {
          length += chunk.length;
          if (length > LIMIT) return json(413, { error: '文件超过 32 MB，请减少图片体积后重试' });
          chunks.push(chunk);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString()); }
        catch { return json(400, { error: '请求格式不正确' }); }
        if (typeof body.html !== 'string' || !body.html.includes('data-artboard')) return json(400, { error: '没有找到可导出的画板' });
        const baseUrl = new URL(body.baseUrl || '/', origin);
        if (baseUrl.origin !== origin) return json(400, { error: '导出来源必须是当前本地预览' });
        if (busy) return json(409, { error: '已有导出任务，请完成后再试' });
        busy = true;
        try {
          const result = await exportDocument({ html: body.html, baseUrl: baseUrl.href, title: String(body.title || 'design'), format });
          const name = `${String(body.filename || 'design').replace(/[\\/\r\n\x00-\x1f]/g, '_').slice(0, 180)}.${format}`;
          res.writeHead(200, {
            'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': `attachment; filename="design.${format}"; filename*=UTF-8''${encodeURIComponent(name)}`,
            'Cache-Control': 'no-store', 'X-HTML-Design-Pages': String(result.pages),
          });
          res.end(result.bytes);
        } finally { busy = false; }
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(405, { error: '不支持的请求方式' });
      if (url.pathname === '/__html-design/health') return json(200, { exports: ['pdf', 'pptx'] });
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'demos/toy-history.html';
      if (relative.split('/').some(p => p.startsWith('.') || p === 'node_modules' || p === 'recovered')) return json(403, { error: '无法访问此文件' });
      let file;
      try { file = await realpath(path.resolve(rootPath, relative)); }
      catch { return json(404, { error: '文件不存在' }); }
      if (!file.startsWith(rootPath + path.sep) || !(await stat(file)).isFile()) return json(403, { error: '无法访问此文件' });
      let bytes = await readFile(file);
      // The revision belongs to the bytes that were actually loaded, never to a later fetch.
      if (/\.html?$/i.test(file) && /<script\b[^>]*\bdata-editor(?:[\s=>])/i.test(bytes.toString())) {
        const config = JSON.stringify({ path: '/' + path.relative(rootPath, file).split(path.sep).map(encodeURIComponent).join('/'), revision: revisionOf(bytes) });
        bytes = Buffer.from(bytes.toString().replace(/(<script\b[^>]*\bdata-editor(?:[\s=>]))/i,
          `<script type="application/json" data-editor-connection>${config}</script>$1`));
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      console.error('Export error:', error.message);
      if (!res.headersSent) json(error.status || 500, { error: error.message.includes('Executable doesn\'t exist') ? '导出浏览器尚未安装，请先完成项目的浏览器安装步骤' : error.message });
      else res.end();
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 8876);
  const server = await createPreviewServer({ port });
  console.log(`HTML Design: http://127.0.0.1:${server.address().port}/demos/toy-history.html`);
}
