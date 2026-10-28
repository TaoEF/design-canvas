#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createDocumentStore } from './documents.mjs';

// Only a newly created, undisclosed file is seeded. Existing/active documents
// must use collaborate.mjs begin/commit, never this fixture generator.
export async function createReviewDemo(root, relative = `demos/ai-review-${randomUUID().slice(0, 8)}.html`) {
  root = await realpath(root);
  if (relative.split(/[\\/]/).some(p => !p || p.startsWith('.')) || !relative.endsWith('.html')) throw new Error('请指定项目内的新 HTML 路径');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) throw new Error('样例必须位于项目内');
  const editor = await readFile(path.join(root, 'html-design/editor.js'), 'utf8');
  const before = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>AI 修改审阅 · 独立试用稿</title><style>
body{margin:0;color:#202020;font-family:Arial,"PingFang SC",sans-serif}*{box-sizing:border-box}[data-artboard]{width:1100px;height:660px;padding:64px;background:#faf9f6;display:flex;flex-direction:column;gap:28px}h1,h2,p{margin:0}h1{font-size:68px;line-height:1.12;max-width:800px}h2{font-size:48px}p{font-size:24px;line-height:1.6;max-width:850px}.note{font-size:18px;color:#646464;margin-top:auto}.rule{width:110px;height:5px;background:#202020}.steps{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:12px}.steps p{font-size:22px}.steps h3{font-size:26px;margin:0 0 16px}
</style></head><body><main data-stage data-page-seq="2" data-element-seq="8"><section data-artboard="p1" data-title="共同创作" data-mode="flow"><div class="rule" data-el="p1-rule"></div><h1 data-el="p1-title">把设计交给人和 AI。</h1><p data-el="p1-body">文档是 HTML，浏览器负责真实排版。每一次 AI 修改，都应该可以看清、接受或安全撤回。</p><p class="note" data-el="p1-note">这是独立试用稿；不会覆盖已有演示文件。</p></section><section data-artboard="p2" data-title="放心修改" data-mode="flow"><h2 data-el="p2-title">改得自由，也改得放心。</h2><div class="steps" data-el="p2-steps"><div><h3>先看清变化</h3><p>悬停页底「放弃」，原位查看隔离的修改前效果。</p></div><div><h3>再决定保留</h3><p>接受只确认结果；撤回恢复原内容。人工继续编辑后，保护你的新成果。</p></div></div><p class="note" data-el="p2-note">未接受的基线保存在本地服务，刷新后仍然存在。</p></section></main><script>/* Shared content script: changing this makes review document-wide. */window.reviewDemoReady = true;</script><script data-editor>${editor}</script></body></html>`;
  await writeFile(file, before, { flag: 'wx' });
  const store = createDocumentStore(root), documentPath = '/' + relative.split(path.sep).map(encodeURIComponent).join('/');
  const begin = await store.handle('ai/begin', { path: documentPath });
  const ready = await store.handle('ai/status', { path: documentPath, token: begin.token });
  const html = ready.html.replace('把设计交给人和 AI。', '让每次 AI 创作，都有回头的余地。').replace('未接受的基线保存在本地服务，刷新后仍然存在。', '试试：接受第一页，再放弃第二页；也可以继续手动修改文字。');
  await store.handle('ai/commit', { path: documentPath, token: begin.token, revision: ready.revision, html });
  return { file, path: documentPath, pending: 2 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await createReviewDemo(process.cwd(), process.argv[2]), null, 2)); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
