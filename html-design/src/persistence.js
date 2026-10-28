import { createDrafts } from './drafts.js';

export function createPersistence({ config, serialize, pause, isBusy, hasPendingSource, applyHTML, changed, render, reload, download, historyBoundary = () => {}, prepareReview = pause }) {
  let token, revision = config?.revision, role = 'viewer', blocked = false, frozen = false, connected = false;
  let dirty = false, generation = 0, timer, saving, polling = false, lastContact = 0, leaseMs = 15000, recovery;
  let draftQueue = Promise.resolve(), refreshing = false, opening = false;
  let review = { generation: 0, items: [], reasons: [] }, locked = false, pending = false, reviewing = false;
  const managed = !!config, drafts = managed && createDrafts(config.path);
  const canEdit = () => !managed || (connected && role === 'owner' && !frozen && !blocked && !reviewing && !refreshing);
  function show(message, options = {}) { render({ message, revision, canEdit: canEdit(), managed, dirty, review, canReview: canEdit() && !locked && !pending && !reviewing, reviewing, ...options }); }
  function markDirty() {
    dirty = true; generation++; changed(true);
    show(managed ? '尚未保存' : '离线 · 尚未下载');
    clearTimeout(timer); timer = setTimeout(() => flush().catch(() => {}), 800);
  }
  async function request(action, body = {}) {
    const response = await fetch(`/__html-design/document/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: config.path, token, ...body }), signal: AbortSignal.timeout(12000) });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || '保存失败'), { status: response.status });
    lastContact = Date.now(); return result;
  }
  function backup(html = serialize(false), base = revision) {
    const job = draftQueue.catch(() => {}).then(() => drafts.put(html, base));
    draftQueue = job;
    return job;
  }
  async function flush(reviewFlush = false) {
    if (!managed) return;
    if (reviewing && !reviewFlush) return;
    if (saving) { await saving; if (dirty && !blocked) return flush(reviewFlush); return; }
    if (!dirty) return;
    if (isBusy()) { clearTimeout(timer); timer = setTimeout(() => flush().catch(() => {}), 300); return; }
    saving = (async () => {
      const html = serialize(false), version = generation;
      let backedUp = true;
      try { await backup(html); } catch { backedUp = false; }
      if (!connected || role !== 'owner' || blocked) {
        show(backedUp ? '修改已保留 · 等待连接或接管' : '尚未保存 · 请下载 HTML 备份', { retry: true }); return;
      }
      show('正在保存…');
      try {
        const result = await request('save', { revision, html }); revision = result.revision; adopt(result);
        if (version === generation) {
          dirty = false; changed(false);
          await draftQueue.catch(() => {}); await drafts.remove().catch(() => {});
        }
        show(dirty ? '尚未保存' : result.implicitAccepted?.length ? '已保存 · 人工修改已接受对应 AI 改动' : '已自动保存');
      } catch (error) {
        if (error.status === 409) { blocked = true; pause(); }
        if (error.status === 401) { connected = false; pause(); }
        if (!error.status) { connected = false; pause(); }
        show(error.status ? error.message : '保存失败 · 修改已保留，将重试', { retry: true, conflict: blocked });
        throw error;
      }
    })();
    try { await saving; } finally { saving = null; }
    if (dirty && canEdit()) { clearTimeout(timer); timer = setTimeout(() => flush().catch(() => {}), 800); }
  }
  function adopt(result) { role = result.role; leaseMs = result.leaseMs || leaseMs; review = result.review || review; locked = !!result.locked; pending = !!result.pending; connected = true; }
  async function refresh() {
    if (refreshing) return;
    if (dirty || hasPendingSource() || isBusy()) return false;
    refreshing = true;
    // Release only on actual pagehide. beforeunload can cancel navigation, so
    // never invalidate the live document's token before the navigation commits.
    try { reload(); } catch (error) { refreshing = false; throw error; }
    setTimeout(() => { refreshing = false; }, 500);
    return true;
  }
  async function sync() {
    if (polling || saving || reviewing || !token || refreshing) return;
    polling = true;
    try {
      const result = await request('sync'); if (saving || reviewing) return; adopt(result);
      if (result.revision !== revision) {
        // Never refresh away unsaved DOM or apply a stale draft over a newer file.
        if (hasPendingSource()) { frozen = true; show('源码有未应用修改，请先下载源码备份'); return; }
        if (dirty) { blocked = true; pause(); await backup().catch(() => {}); show('版本冲突 · 修改已保留，请下载 HTML', { retry: true, conflict: true }); return; }
        await refresh(); return;
      }
      if (role !== 'owner' && dirty && !blocked && !result.ownerPresent && !result.locked && !result.pending) {
        adopt(await request('takeover', { revision }));
        if (role === 'owner') frozen = false;
      }
      if (role !== 'owner') { frozen = true; pause(); }
      if (role === 'owner' && result.pending && !result.pending.mine) {
        frozen = true;
        if (pause() === false) { frozen = false; show('请先应用或关闭源码，再交接编辑'); return; }
        show('正在保存并交接…');
        await flush();
        if (dirty) return; // A failed save must not acknowledge the handoff.
        adopt(await request('yield', { requestId: result.pending.id, revision }));
      } else if (role === 'owner' && !result.locked && !result.pending && !blocked) frozen = false;
      if (dirty && canEdit()) await flush();
      if (blocked) show('版本冲突 · 修改已保留，请下载 HTML', { retry: true, conflict: true });
      else if (dirty) show('尚未保存 · 修改已保留', { retry: true, conflict: role !== 'owner' });
      else if (recovery) show('发现未保存草稿', { recover: true, takeover: role !== 'owner' && !result.locked });
      else if (result.locked) show('AI 正在修改 · 只读同步');
      else if (result.pending) show('正在交接编辑权限…');
      else show(role === 'owner' ? '已自动保存' : '其他窗口编辑中 · 只读', { takeover: role !== 'owner' });
    } catch (error) {
      if (error.status === 401) {
        connected = false; frozen = true; pause();
        if (dirty) await backup().catch(() => {});
        // Re-register after a service restart, but never silently rebase dirty content.
        try {
          const result = await request('open', { revision }); token = result.token; adopt(result);
          if (result.revision !== revision && dirty) blocked = true;
        } catch {}
      }
      if (Date.now() - lastContact > leaseMs / 2) { connected = false; frozen = true; pause(); }
      show('连接中断 · 修改已保留，将重试', { retry: true });
    } finally { polling = false; }
  }
  async function start() {
    if (!managed) { show('离线 · 保存将下载 HTML'); return; }
    if (opening || refreshing) return; opening = true;
    show('正在连接自动保存…');
    try {
      recovery = await drafts.latest().catch(() => null);
      const result = await request('open', { revision }); token = result.token; adopt(result);
      frozen = role !== 'owner';
      if (result.revision !== revision) { await refresh(); return; }
      await sync();
    } catch { show('无法连接 · 自动保存未启用', { retry: true }); }
    finally { opening = false; }
  }
  const heartbeat = managed && setInterval(() => token ? sync() : start(), 2000);
  if (managed) {
    addEventListener('pagehide', () => {
      if (dirty) backup().catch(() => {});
      // A dirty window keeps its lease until expiry instead of admitting a competing writer early.
      if (token && !dirty) navigator.sendBeacon('/__html-design/document/release', new Blob([JSON.stringify({ path: config.path, token })], { type: 'application/json' }));
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) flush().catch(() => {}); });
  }
  return {
    start, canEdit, markDirty, flush,
    async reviewRead(scope, expectedGeneration) {
      if (!managed) throw new Error('AI 审阅需要本地服务；下载的 HTML 不包含审阅基线');
      return request('review/read', { revision, generation: expectedGeneration, scope });
    },
    async reviewAction(action, scope, expectedGeneration) {
      if (!managed || !canEdit() || locked || pending || reviewing) throw new Error('请先取得编辑权限并等待交接结束');
      if (prepareReview() === false) throw new Error('请先应用或关闭源码，再处理 AI 修改');
      reviewing = true;
      show('正在处理 AI 修改…');
      try {
        await flush(true);
        if (dirty) throw new Error('当前修改尚未保存，请先完成保存');
        const latest = await request('sync'); adopt(latest);
        if (latest.revision !== revision || review.generation !== expectedGeneration) throw new Error('修改或审阅已有更新，请重新选择；当前内容保持不变');
        const writeGeneration = generation;
        const result = await request(`review/${action}`, { revision, generation: expectedGeneration, scope, requestId: crypto.randomUUID() });
        adopt(result);
        if (result.revision !== revision) {
          if (dirty || generation !== writeGeneration || hasPendingSource() || isBusy()) {
            blocked = true; frozen = true; clearTimeout(timer);
            await backup().catch(() => {});
            show('撤回已完成，但期间出现新修改 · 内容已保留，请下载副本后同步', { conflict: true, retry: true });
            return result;
          }
          historyBoundary(); await refresh();
        } else show('已接受 AI 修改');
        return result;
      } finally {
        reviewing = false;
        if (!refreshing) show(blocked ? '版本冲突 · 修改已保留，请下载 HTML' : dirty ? '尚未保存' : '已保存', { conflict: blocked, retry: blocked });
      }
    },
    async save() {
      if (!managed) { download(serialize()); dirty = false; changed(false); show('已下载 HTML'); return; }
      try { await flush(); if (!dirty) show('已保存到原文件'); } catch {}
    },
    async conflict() {
      await backup().catch(() => {}); download(serialize(), 'unsaved-copy.html');
      dirty = false; changed(false); await refresh();
    },
    async takeover() {
      try {
        if (dirty || blocked) { show('当前有未保存修改，请先下载 HTML 备份'); return false; }
        adopt(await request('takeover', { revision })); await sync();
        return true;
      } catch (error) { show(error.message, { retry: true }); return false; }
    },
    async retry() { if (!token) await start(); else { await sync(); if (dirty && canEdit()) await flush().catch(() => {}); } },
    async restore() {
      if (!recovery) return;
      if (!canEdit()) return show('请先点击「编辑」，再恢复草稿', { takeover: true, recover: true });
      if (recovery.revision !== revision) { download(recovery.html, 'recovered-draft.html'); show('草稿基于旧版本，已下载；原文件保持最新版本'); return; }
      const draft = recovery; recovery = null;
      applyHTML(draft.html); markDirty();
      await flush().catch(() => {});
      if (!dirty) await drafts.remove(draft.id).catch(() => {});
    },
  };
}
