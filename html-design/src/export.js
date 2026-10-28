export function createExporter({ ui, serialize, toast, download, fileName }) {
    let exporting = false;
    async function exportFile(format) {
      if (exporting) return;
      if (!/^https?:$/.test(location.protocol)) return toast('请通过项目的本地预览打开后导出；离线时可以使用浏览器打印 PDF。', 6000);
      exporting = true;
      const buttons = [...ui.querySelectorAll('[data-act="pdf"],[data-act="pptx"]')];
      buttons.forEach(b => { b.disabled = true; });
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 180000);
      try {
        // Capture the latest DOM, including edits that have not been saved to disk.
        const snapshot = serialize();
        toast(`正在生成 ${format.toUpperCase()}，请稍候…`, 180000);
        const response = await fetch(`/__html-design/export/${format}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ html: snapshot, baseUrl: location.href, title: document.title, filename: fileName().replace(/\.html?$/i, '') }),
        });
        if (!response.ok) {
          const problem = await response.json().catch(() => null);
          throw new Error(problem?.error || '本地预览未启用文件导出，请启动新版预览服务后再试。');
        }
        const type = response.headers.get('content-type') || '';
        if (!type.includes(format === 'pdf' ? 'application/pdf' : 'presentationml.presentation')) throw new Error('本地预览未启用文件导出，请启动新版预览服务后再试。');
        download(await response.blob(), `${fileName().replace(/\.html?$/i, '')}.${format}`);
        toast(`${format.toUpperCase()} 已生成，已开始下载。`, 4000);
      } catch (error) {
        toast(error.name === 'AbortError' ? '导出超时，请减少页面或图片体积后重试。' : error.message === 'Failed to fetch' ? '无法连接本地导出服务，请确认预览服务正在运行。' : error.message, 7000);
      } finally {
        clearTimeout(timeout); exporting = false;
        buttons.forEach(b => { b.disabled = false; });
      }
    }
    return exportFile;
}
