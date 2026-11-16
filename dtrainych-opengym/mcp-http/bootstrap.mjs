// Run in the pinned Node image. First launch fetches only the pinned upstream source
// and locked runtime dependencies. Restarts reuse the container's working directory.
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, access, writeFile, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
const commit = '2d70e026effc6602f513555166a97443520f0572';
const root = process.env.MCP_RUNTIME_DIR || '/tmp/opengym';
await mkdir(root, { recursive: true });
process.chdir(root);
try { await access('.mcp-ready'); }
catch {
  const response = await fetch(`https://codeload.github.com/DuarteSantos8/openGym/tar.gz/${commit}`, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`Source download failed: ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream('source.tar.gz'));
  const hash = createHash('sha256');
  for await (const chunk of createReadStream('source.tar.gz')) hash.update(chunk);
  if (hash.digest('hex') !== 'e8f3c76e180424d7ba9d1db23eba85337f086c4dde7009829ee2f995f5de6990') throw new Error('Source checksum mismatch');
  // Shared frontend calculations import the API's pure streak module in 1.4.5.
  execFileSync('tar', ['-xzf', 'source.tar.gz', '--strip-components=1', ...['mcp', 'frontend/src/lib', 'frontend/package.json', 'api/coach/core/streak.js', 'api/package.json', 'LICENSE'].map(p => `openGym-${commit}/${p}`)], { stdio: 'inherit' });
  await unlink('source.tar.gz');
  execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: `${root}/mcp`, stdio: 'inherit' });
  await writeFile('.mcp-ready', commit);
}
await writeFile('mcp/http.mjs', Buffer.from(process.env.MCP_ADAPTER_BASE64, 'base64'));
await import(pathToFileURL(`${root}/mcp/http.mjs`).href);
