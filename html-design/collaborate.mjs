#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Edits happen in a work copy. Only commit may write the canonical HTML through CAS.
const [command, argument, ...rest] = process.argv.slice(2);
const base = process.env.HTML_DESIGN_ORIGIN || 'http://127.0.0.1:8876';
async function request(action, body) {
  const response = await fetch(`${base}/__html-design/document/ai/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '协作失败');
  return result;
}
try {
  if (command === 'begin' && argument) {
    const documentPath = '/' + argument.replace(/^\/+/, '').split(path.sep).map(encodeURIComponent).join('/');
    const { token } = await request('begin', { path: documentPath });
    try {
      let result;
      for (let attempt = 0; attempt < 70; attempt++) {
        result = await request('status', { path: documentPath, token });
        if (result.ready) break;
        await delay(500);
      }
      if (!result.ready) throw new Error('页面未能完成保存，已停止接管。请检查页面保存状态。');
      const dir = path.resolve('.html-design/work', token); await mkdir(dir, { recursive: true });
      const workFile = path.join(dir, 'document.html'), sessionFile = path.join(dir, 'session.json');
      await writeFile(workFile, result.html);
      await writeFile(sessionFile, JSON.stringify({ path: documentPath, token, revision: result.revision, workFile, origin: base }, null, 2));
      console.log(JSON.stringify({ session: sessionFile, workFile, revision: result.revision, expires: new Date(result.expires).toISOString() }, null, 2));
    } catch (error) { await request('cancel', { path: documentPath, token }).catch(() => {}); throw error; }
  } else if (['commit', 'cancel'].includes(command) && argument) {
    const session = JSON.parse(await readFile(argument, 'utf8'));
    if (session.origin !== base) throw new Error('服务地址与接管时不同，请设置 HTML_DESIGN_ORIGIN 后重试');
    const html = command === 'commit' ? await readFile(session.workFile, 'utf8') : undefined;
    console.log(JSON.stringify(await request(command, { ...session, html }), null, 2));
  } else throw new Error('用法：node html-design/collaborate.mjs begin demos/toy-history.html | commit <session.json> | cancel <session.json>');
} catch (error) { console.error(error.message); process.exitCode = 1; }
