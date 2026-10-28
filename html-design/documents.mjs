import { createHash, randomUUID } from 'node:crypto';
import { readFile, realpath, stat, mkdir, open, rename, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';

export const revisionOf = html => createHash('sha256').update(html).digest('hex');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const validHTML = html => typeof html === 'string' && /<html[\s>]/i.test(html) && /\bdata-stage\b/.test(html) && /\bdata-artboard\b/.test(html) && /<\/html\s*>/i.test(html);

// One queue per canonical file: revision checks, lease changes and writes are indivisible.
export function createDocumentStore(root, { leaseMs = 15000, aiLeaseMs = 600000, now = Date.now } = {}) {
  const documents = new Map(), queues = new Map();
  async function resolve(documentPath) {
    if (typeof documentPath !== 'string') fail(400, '缺少文件路径');
    const relative = decodeURIComponent(documentPath).replace(/^\/+/, '') || 'demos/toy-history.html';
    if (relative.split('/').some(p => !p || p.startsWith('.') || ['node_modules', 'recovered'].includes(p))) fail(403, '无法编辑此路径');
    const file = await realpath(path.resolve(root, relative)).catch(() => fail(404, '文件不存在'));
    if (!file.startsWith(root + path.sep) || !/\.html?$/i.test(file) || !(await stat(file)).isFile()) fail(403, '只能编辑项目中的 HTML 文件');
    return file;
  }
  async function exclusive(documentPath, fn) {
    const file = await resolve(documentPath), previous = queues.get(file) || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      let d = documents.get(file);
      if (!d) { d = { file, sessions: new Map(), owner: null, pending: null, ai: null }; documents.set(file, d); }
      const html = await readFile(file, 'utf8');
      if (!validHTML(html)) fail(400, 'HTML 缺少完整画板结构');
      d.html = html; d.revision = revisionOf(html);
      if (d.owner && d.owner.expires <= now()) d.owner = null;
      if (d.ai && d.ai.expires <= now()) resume(d);
      if (d.pending?.expires <= now()) d.pending = null;
      if (d.pending && !d.owner && !d.ai) grant(d);
      for (const [token, session] of d.sessions) if (session.seen < now() - aiLeaseMs && token !== d.owner?.token) d.sessions.delete(token);
      return fn(d);
    });
    queues.set(file, task);
    try { return await task; } finally { if (queues.get(file) === task) queues.delete(file); }
  }
  function resume(d) {
    const token = d.ai?.resume; d.ai = null;
    if (token && d.sessions.has(token)) d.owner = { token, expires: now() + leaseMs };
  }
  function grant(d) {
    const p = d.pending; d.pending = null;
    if (p.kind === 'ai') d.ai = { token: p.token, resume: p.resume, expires: now() + aiLeaseMs };
    else if (d.sessions.has(p.token)) d.owner = { token: p.token, expires: now() + leaseMs };
  }
  function session(d, token) {
    const s = d.sessions.get(token); if (!s) fail(401, '连接已失效，请重新连接；当前修改仍保留在页面中');
    s.seen = now(); return s;
  }
  function view(d, token) {
    return { revision: d.revision, role: d.owner?.token === token ? 'owner' : 'viewer',
      locked: !!d.ai, ownerPresent: !!d.owner, pending: d.pending ? { id: d.pending.id, kind: d.pending.kind, mine: d.pending.token === token } : null,
      leaseMs, aiExpires: d.ai?.expires || null };
  }
  async function write(d, expected, html) {
    if (!validHTML(html)) fail(400, '无法保存：HTML 缺少完整画板结构');
    const next = revisionOf(html);
    // A lost response may cause an identical retry. It must not overwrite a newer revision.
    if (next === d.revision) return;
    if (expected !== d.revision) fail(409, '原文件已有新版本，已阻止旧页面覆盖；当前修改仍保留，可下载 HTML');
    const directory = path.join(root, '.html-design', 'history', revisionOf(d.file).slice(0, 20));
    await mkdir(directory, { recursive: true });
    const backup = await open(path.join(directory, `${d.revision}.html`), 'wx', 0o600).catch(e => { if (e.code !== 'EEXIST') throw e; });
    if (backup) { try { await backup.writeFile(d.html); await backup.sync(); } finally { await backup.close(); } }
    const temp = path.join(path.dirname(d.file), `.${path.basename(d.file)}.${randomUUID()}.tmp`);
    try {
      const handle = await open(temp, 'wx', (await stat(d.file)).mode);
      try { await handle.writeFile(html); await handle.sync(); } finally { await handle.close(); }
      // Detect external writes during the backup/temp-file phase as well.
      if (revisionOf(await readFile(d.file)) !== d.revision) fail(409, '文件刚被其他程序修改，已停止保存并保留当前修改');
      await rename(temp, d.file);
      d.html = html; d.revision = next;
      // Keep bounded recovery history; it is not another editable document.
      try {
      const history = await Promise.all((await readdir(directory)).filter(n => n.endsWith('.html')).map(async name => ({ name, time: (await stat(path.join(directory, name))).mtimeMs })));
      await Promise.all(history.sort((a, b) => b.time - a.time).slice(10).map(item => unlink(path.join(directory, item.name))));
      } catch {}
    } finally { await unlink(temp).catch(() => {}); }
  }
  return {
    async handle(action, body) {
      return exclusive(body.path, async d => {
        const token = body.token;
        if (action === 'open') {
          const newToken = randomUUID();
          d.sessions.set(newToken, { seen: now() });
          if (!d.owner && !d.ai && !d.pending && body.revision === d.revision) d.owner = { token: newToken, expires: now() + leaseMs };
          return { token: newToken, ...view(d, newToken) };
        }
        if (action === 'read') return { revision: d.revision, html: d.html };
        if (action.startsWith('ai/')) {
          if (action === 'ai/begin') {
            if (d.ai || d.pending) fail(409, '已有编辑接管任务，请稍后再试');
            const next = randomUUID();
            d.pending = { kind: 'ai', id: randomUUID(), token: next, resume: d.owner?.token, expires: now() + 30000 };
            if (!d.owner) grant(d);
            return { token: next, ready: d.ai?.token === next, revision: d.revision };
          }
          if (action === 'ai/cancel') {
            if (d.ai?.token === token) resume(d);
            else if (d.pending?.token === token) d.pending = null;
            else fail(409, '接管已结束或已过期');
            return { ok: true, revision: d.revision };
          }
          if (d.pending?.token === token) return { ready: false, revision: d.revision };
          if (!d.ai || d.ai.token !== token) fail(409, 'AI 修改权限已结束或过期；请重新同步后再修改');
          if (action === 'ai/status') return { ready: true, revision: d.revision, html: d.html, expires: d.ai.expires };
          if (action === 'ai/commit') {
            await write(d, body.revision, body.html); resume(d);
            return { ok: true, revision: d.revision };
          }
          fail(404, '未知协作操作');
        }
        session(d, token);
        if (action === 'sync') {
          if (d.owner?.token === token) d.owner.expires = now() + leaseMs;
          return view(d, token);
        }
        if (action === 'takeover') {
          if (body.revision !== d.revision) fail(409, '请先同步最新文件再接管');
          if (d.ai || d.pending) fail(409, '正在交接编辑权限，请稍后再试');
          if (!d.owner) d.owner = { token, expires: now() + leaseMs };
          else if (d.owner.token !== token) d.pending = { kind: 'browser', id: randomUUID(), token, expires: now() + 30000 };
          return view(d, token);
        }
        if (action === 'save') {
          if (d.owner?.token !== token || d.ai) fail(409, '此窗口已失去编辑权限；修改仍保留，可下载 HTML');
          await write(d, body.revision, body.html);
          d.owner.expires = now() + leaseMs;
          return view(d, token);
        }
        if (action === 'yield') {
          if (d.owner?.token !== token || d.pending?.id !== body.requestId) fail(409, '交接请求已失效');
          if (body.revision !== d.revision) fail(409, '交接前文件发生变化，已停止交接');
          d.owner = null; grant(d); return view(d, token);
        }
        if (action === 'release') {
          if (d.owner?.token === token) d.owner = null;
          if (d.pending?.token === token) d.pending = null;
          d.sessions.delete(token); return { ok: true };
        }
        fail(404, '未知协作操作');
      });
    },
  };
}
