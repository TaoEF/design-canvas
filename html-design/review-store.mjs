import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

const hash = value => createHash('sha256').update(value).digest('hex');
const conflict = message => Object.assign(new Error(message), { status: 409 });
const empty = revision => ({ version: 1, generation: 0, expectedRevision: revision, baselineHTML: null, receipt: null });
// A single durable envelope keeps both the old state and a prepared next state. The
// HTML remains canonical; recovery chooses solely by the actual file revision.
export function createReviewStorage(root, file, fault = async () => {}) {
  const directory = path.join(root, '.html-design', 'reviews', hash(file).slice(0, 20));
  const stateFile = path.join(directory, 'state.json');
  async function atomic(envelope) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temp = path.join(directory, `.${randomUUID()}.tmp`);
    try {
      const handle = await open(temp, 'wx', 0o600);
      try { await handle.writeFile(JSON.stringify(envelope)); await handle.sync(); } finally { await handle.close(); }
      await rename(temp, stateFile);
      const dir = await open(directory, 'r');
      try { await dir.sync(); } finally { await dir.close(); }
    } finally { await unlink(temp).catch(() => {}); }
  }
  async function load(revision) {
    let envelope;
    try { envelope = JSON.parse(await readFile(stateFile, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return { state: empty(revision), conflict: false }; throw new Error(`无法读取 AI 审阅记录：${e.message}`); }
    if (envelope.state?.version !== 1 || typeof envelope.state.generation !== 'number' || !(envelope.state.baselineHTML === null || typeof envelope.state.baselineHTML === 'string')) throw new Error('AI 审阅记录格式无效，请保留恢复文件');
    if (envelope.prepared) {
      const p = envelope.prepared;
      if (revision === p.toRevision) { envelope = { state: p.next }; await atomic(envelope); }
      else if (revision === p.fromRevision) { envelope = { state: envelope.state }; await atomic(envelope); }
      else return { state: envelope.state, conflict: true };
    }
    return { state: envelope.state, conflict: !!envelope.state.baselineHTML && envelope.state.expectedRevision !== revision };
  }
  return {
    load,
    async metadata(state) { await fault('before-review-metadata'); await atomic({ state }); },
    async transaction(previous, next, fromRevision, toRevision, writeHTML) {
      await fault('before-review-prepare');
      await atomic({ state: previous, prepared: { fromRevision, toRevision, next } });
      await fault('after-review-prepare');
      await writeHTML();
      await fault('before-review-finalize');
      await atomic({ state: next });
      await fault('after-review-finalize');
    },
  };
}
export function checkReview(state, revision, body, conflicted) {
  if (conflicted) throw conflict('文件在审阅事务外发生变化，已保留基线并阻止撤回；请先保存副本并排查外部修改');
  if (body.revision !== revision || body.generation !== state.generation) throw conflict('审阅记录已有更新，请刷新审阅列表；当前内容未被撤回');
  if (!state.baselineHTML) throw conflict('这次 AI 修改已处理或已由人工编辑接受');
}
