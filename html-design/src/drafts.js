// IndexedDB has room for embedded images that exceed localStorage's small quota.
export function createDrafts(path) {
  let dbPromise;
  const id = crypto.randomUUID();
  function db() {
    return dbPromise ||= new Promise((resolve, reject) => {
      const r = indexedDB.open('html-design-drafts', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('drafts', { keyPath: 'id' });
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
  }
  async function run(mode, fn) {
    const database = await db();
    return new Promise((resolve, reject) => {
      const tx = database.transaction('drafts', mode), r = fn(tx.objectStore('drafts'));
      tx.oncomplete = () => resolve(r.result); tx.onerror = tx.onabort = () => reject(tx.error || new Error('草稿备份失败'));
    });
  }
  return {
    put: (html, revision) => run('readwrite', s => s.put({ id, path, html, revision, updated: Date.now() })),
    remove: (draftId = id) => run('readwrite', s => s.delete(draftId)),
    async latest() { return (await run('readonly', s => s.getAll())).filter(d => d.path === path).sort((a, b) => b.updated - a.updated)[0]; },
  };
}
