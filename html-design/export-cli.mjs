#!/usr/bin/env node
import path from 'node:path';
import { open, realpath, lstat, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { exportDocument } from './export.mjs';
import { createResourceServer, readSavedSnapshot, localResourceUrl } from './saved-file.mjs';
export { createResourceServer } from './saved-file.mjs';

const help = `Export a saved HTML snapshot without opening the editor or a persistent server.
Usage: node html-design/export-cli.mjs <pptx|pdf> <input.html> --output <out.pptx|out.pdf>
Options:
  --root <directory>       Temporary read-only resource root (default: input directory).
  --base-url <local-url>   Existing loopback file URL for original resources; no temporary server.
                          With this option --root is not used; useful for AI work copies.
  --title <title>          Document title (default: input filename).
  --help                  Show help; no browser required.
Reads saved bytes only, not unsaved browser DOM. Active files require normal save/AI handoff first.
Never overwrites the input or an existing output. Success prints one JSON summary, not a fidelity report.`;
function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return null;
  const [format, input, ...rest] = args;
  if (!['pptx', 'pdf'].includes(format) || !input || input.startsWith('--')) throw new Error('Expected <pptx|pdf> <input.html> --output <file>. Use --help.');
  const options = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i], value = rest[i + 1];
    if (!['--output', '--root', '--base-url', '--title'].includes(key) || !value || value.startsWith('--') || options[key] !== undefined) throw new Error('Invalid or duplicate command options. Use --help.');
    options[key] = value;
  }
  if (!options['--output']) throw new Error('--output is required.');
  if (!/\.html?$/i.test(input)) throw new Error('Input must be an HTML file.');
  if (path.extname(options['--output']).toLowerCase() !== `.${format}`) throw new Error('Output extension must match the requested format.');
  if (options['--base-url']) options['--base-url'] = localResourceUrl(options['--base-url']);
  return { format, input, output: options['--output'], root: options['--root'], baseUrl: options['--base-url'], title: options['--title'] };
}

export async function exportFile({ format, input, output, root, baseUrl, title }, { signal } = {}) {
  signal?.throwIfAborted();
  const inputPath = await realpath(input);
  const outputPath = path.join(await realpath(path.dirname(path.resolve(output))), path.basename(output));
  if (inputPath === outputPath) throw new Error('Input and output must differ.');
  try { await lstat(outputPath); throw new Error('Output already exists; choose a new path.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const { resourceRoot, snapshot, revision } = await readSavedSnapshot(inputPath, { root: root || path.dirname(path.resolve(input)), baseUrl, signal });
  let resources, handle, owned;
  try {
    if (!baseUrl) {
      resources = await createResourceServer(resourceRoot);
      const relative = path.relative(resourceRoot, inputPath).split(path.sep).map(encodeURIComponent).join('/');
      baseUrl = `${resources.origin}/${relative}`;
    }
    const result = await exportDocument({ html: snapshot.toString('utf8'), baseUrl, title: title || path.basename(inputPath, path.extname(inputPath)), format }, { signal });
    signal?.throwIfAborted();
    handle = await open(outputPath, 'wx', 0o600);
    owned = await handle.stat();
    await handle.writeFile(result.bytes);
    await handle.sync();
    signal?.throwIfAborted();
    const current = await lstat(outputPath);
    if (current.dev !== owned.dev || current.ino !== owned.ino) throw new Error('Output changed during export; no replacement was made.');
    await handle.close(); handle = null;
    return { status: 'ok', format, input: inputPath, revision, output: outputPath, pages: result.pages, bytes: result.bytes.length };
  } catch (error) {
    await handle?.close().catch(() => {}); handle = null;
    if (owned) {
      const current = await lstat(outputPath).catch(() => null);
      if (current?.dev === owned.dev && current.ino === owned.ino) await unlink(outputPath);
    }
    throw error;
  } finally { await resources?.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const controller = new AbortController();
  let interrupted;
  const onSignal = signal => { interrupted = signal; controller.abort(new Error(`Export interrupted by ${signal}.`)); };
  const sigint = () => onSignal('SIGINT'), sigterm = () => onSignal('SIGTERM');
  process.once('SIGINT', sigint); process.once('SIGTERM', sigterm);
  try {
    const options = parseArgs(process.argv.slice(2));
    if (!options) console.log(help);
    else console.log(JSON.stringify(await exportFile(options, { signal: controller.signal })));
  } catch (error) {
    console.error(JSON.stringify({ status: 'error', error: { code: interrupted ? 'EXPORT_INTERRUPTED' : 'EXPORT_FAILED', message: error.message } }));
    process.exitCode = interrupted === 'SIGINT' ? 130 : interrupted ? 143 : 1;
  } finally { process.removeListener('SIGINT', sigint); process.removeListener('SIGTERM', sigterm); }
}
