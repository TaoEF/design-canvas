#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { measureDocumentText } from './text-measure.mjs';

const help = `Read-only local text measurement. Prints JSON; no document scripts or writes.
Usage:
  node html-design/text.mjs measure <request.json> [--document <file.html>] [--base-url <local-url>]
  node html-design/text.mjs check <file.html> [--base-url <local-url>]
measure requires text, font (Canvas shorthand, px), lineHeight (px), widths (px array).
Optional: maxHeight (px), letterSpacing (px), whiteSpace, wordBreak.
--document supplies CSS/web fonts. --base-url resolves its relative resources.
check reads saved bytes only, not unsaved browser edits. Reports overflow and unmeasurable text by stable IDs.
Exit: 0=ok, 2=layout/resource issues, 1=invalid request or execution failure.`;

try {
  const [mode, argument, ...rest] = process.argv.slice(2);
  if (mode === '--help' && !argument) { console.log(help); }
  else {
    if (!['measure', 'check'].includes(mode) || !argument) throw new Error(help);
    const options = {};
    for (let i = 0; i < rest.length; i += 2) {
      const key = rest[i];
      if (!['--document', '--base-url'].includes(key) || !rest[i + 1] || options[key] !== undefined) throw new Error('Invalid command options.');
      options[key] = rest[i + 1];
    }
    if (mode === 'check' && options['--document']) throw new Error('--document is only valid for measure.');
    const file = mode === 'check' ? argument : options['--document'];
    const origin = process.env.HTML_DESIGN_ORIGIN || 'http://127.0.0.1:8876';
    const baseUrl = options['--base-url'] || new URL(file ? path.relative(process.cwd(), path.resolve(file)).split(path.sep).map(encodeURIComponent).join('/') : '/', origin + '/').href;
    const html = file ? await readFile(file, 'utf8') : undefined;
    const input = mode === 'measure' ? JSON.parse(await readFile(argument, 'utf8')) : undefined;
    const result = await measureDocumentText({ mode, input, html, baseUrl });
    console.log(JSON.stringify({ ...result, ...(file ? { source: { kind: 'saved-file', path: path.resolve(file), revision: createHash('sha256').update(html).digest('hex') } } : {}) }, null, 2));
    if (result.status !== 'ok') process.exitCode = 2;
  }
} catch (error) {
  console.log(JSON.stringify({ status: 'error', error: { code: 'TEXT_MEASUREMENT_FAILED', message: error.message } }, null, 2));
  process.exitCode = 1;
}
