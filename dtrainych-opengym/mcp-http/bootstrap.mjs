// Run in the pinned Node image. First launch fetches only the pinned upstream source
// and locked runtime dependencies. Restarts reuse the container's working directory.
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, access, writeFile, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
const commit = '5f5832db56080837b58342ff50f78631dcc63e07';
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
  if (hash.digest('hex') !== '81b9c7f3750843073c32f7874a6614b68903adb49f3c4ad585f90e0e55330491') throw new Error('Source checksum mismatch');
  execFileSync('tar', ['-xzf', 'source.tar.gz', '--strip-components=1', ...['mcp', 'frontend/src/lib', 'frontend/package.json', 'LICENSE'].map(p => `openGym-${commit}/${p}`)], { stdio: 'inherit' });
  await unlink('source.tar.gz');
  execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: `${root}/mcp`, stdio: 'inherit' });
  await writeFile('.mcp-ready', commit);
}
await writeFile('mcp/http.mjs', Buffer.from(process.env.MCP_ADAPTER_BASE64, 'base64'));
await import(pathToFileURL(`${root}/mcp/http.mjs`).href);
