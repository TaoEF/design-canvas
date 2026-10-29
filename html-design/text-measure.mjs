import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { browserOptions } from './export.mjs';

export function validateTextRequest(input) {
  const allowed = ['text', 'font', 'lineHeight', 'widths', 'maxHeight', 'letterSpacing', 'whiteSpace', 'wordBreak'];
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !allowed.includes(k))) throw new Error('Unknown text measurement fields.');
  if (typeof input.text !== 'string' || input.text.length > 20000) throw new Error('text must be a string of at most 20000 UTF-16 units.');
  if (typeof input.font !== 'string' || !input.font.trim() || input.font.length > 500) throw new Error('font must be a Canvas font string with a px font size.');
  if (!/(?:^|\s)(?:\d+(?:\.\d+)?|\.\d+)px(?:\s|\/)/.test(input.font)) throw new Error('font size must use px.');
  if (!Number.isFinite(input.lineHeight) || input.lineHeight <= 0 || input.lineHeight > 1024) throw new Error('lineHeight must be greater than 0 and at most 1024 CSS px.');
  if (!Array.isArray(input.widths) || !input.widths.length || input.widths.length > 32 || input.widths.some(w => !Number.isFinite(w) || w <= 0 || w > 16384)) throw new Error('widths must contain 1–32 positive CSS pixel widths, at most 16384 each.');
  if (input.maxHeight !== undefined && (!Number.isFinite(input.maxHeight) || input.maxHeight < 0 || input.maxHeight > 16384)) throw new Error('maxHeight must be 0–16384 CSS px.');
  if (input.letterSpacing !== undefined && (!Number.isFinite(input.letterSpacing) || Math.abs(input.letterSpacing) > 100)) throw new Error('letterSpacing must be -100–100 CSS px.');
  if (input.whiteSpace !== undefined && !['normal', 'pre-wrap'].includes(input.whiteSpace)) throw new Error('whiteSpace must be normal or pre-wrap.');
  if (input.wordBreak !== undefined && !['normal', 'keep-all'].includes(input.wordBreak)) throw new Error('wordBreak must be normal or keep-all.');
}

// Trusted browser code is evaluated separately; document scripts never run.
export async function measureDocumentText({ mode, input, html = '<!doctype html><html lang="zh-CN"><head></head><body></body></html>', baseUrl = 'http://127.0.0.1:8876/' }, { signal } = {}) {
  if (!['measure', 'check', 'qa'].includes(mode)) throw new Error('mode must be measure, check or qa.');
  signal?.throwIfAborted();
  if (mode === 'measure') validateTextRequest(input);
  if (typeof html !== 'string' || Buffer.byteLength(html) > 32 * 1024 * 1024) throw new Error('HTML must be at most 32 MiB.');
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw new Error('baseUrl must use a local HTTP preview address.');
  const browser = await chromium.launch(browserOptions());
  const abort = () => { void browser.close().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  let blockedNavigation = false;
  try {
    signal?.throwIfAborted();
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, acceptDownloads: false, javaScriptEnabled: false });
    const page = await context.newPage(), resourceErrors = [];
    page.setDefaultTimeout(10000);
    page.on('requestfailed', r => {
      if (['stylesheet', 'font'].includes(r.resourceType())) resourceErrors.push({ type: r.resourceType(), url: r.url(), error: r.failure()?.errorText });
    });
    page.on('response', r => {
      const type = r.request().resourceType();
      if (r.status() >= 400 && ['stylesheet', 'font'].includes(type)) resourceErrors.push({ type, url: r.url(), status: r.status() });
    });
    const url = new URL(`/__html-design/text/${randomUUID()}`, base).href;
    await page.route('**/*', route => {
      if (route.request().isNavigationRequest()) { blockedNavigation = true; return route.abort(); }
      return route.continue();
    });
    const tag = `<base href="${base.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">`;
    const content = /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, m => m + tag) : tag + html;
    await page.route(url, r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: content,
      headers: { 'Content-Security-Policy': "script-src 'none'; object-src 'none'; frame-src 'none'" } }));
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    if (blockedNavigation || page.url() !== url) throw new Error('Document navigation is not supported during text measurement.');
    await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
    await page.evaluate(await readFile(new URL('./text-measure.js', import.meta.url), 'utf8'));
    let timer, result;
    try {
      result = await Promise.race([
        page.evaluate(async ({ mode, input }) => mode === 'measure'
          ? globalThis.__htmlDesignText.measureText(input) : globalThis.__htmlDesignText.checkDocument({ qa: mode === 'qa' }), { mode, input }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Text measurement exceeded 30 seconds.')), 30000); }),
      ]);
    } finally { clearTimeout(timer); }
    if (blockedNavigation || page.url() !== url) throw new Error('Document navigation is not supported during text measurement.');
    if (resourceErrors.length) result.status = 'issues';
    if (mode === 'qa') {
      for (const resource of resourceErrors.slice(0, 100)) {
        if (result.issues.length >= 500) { result.truncated = true; result.coverage.issuesOmitted++; continue; }
        result.issues.push({ code: 'RESOURCE_FAILED', severity: 'error', pageId: null, elementId: null,
          evidence: { ...resource, url: resource.url.slice(0, 200) } });
      }
      if (resourceErrors.length > 100) { result.truncated = true; result.coverage.issuesOmitted += resourceErrors.length - 100; }
      return result;
    }
    return { ...result, resourceErrors, ...(mode === 'check' ? { revision: createHash('sha256').update(html).digest('hex') } : {}) };
  } catch (error) {
    if (blockedNavigation) throw new Error('Document navigation is not supported during text measurement.');
    throw error;
  } finally { signal?.removeEventListener('abort', abort); await browser.close(); }
}
