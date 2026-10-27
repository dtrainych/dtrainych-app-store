import assert from 'node:assert/strict';
import http from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const url = new URL(process.env.OPENGYM_MCP_URL || 'http://127.0.0.1:3487/mcp');
const token = process.env.MCP_TOKEN;
assert.ok(token, 'MCP_TOKEN is required');
const auth = { Authorization: `Bearer ${token}` };
assert.equal((await fetch(url)).status, 401);
assert.equal((await fetch(url, { headers: { Authorization: 'Bearer wrong' } })).status, 401);
assert.equal((await fetch(url, { headers: { ...auth, Origin: 'https://untrusted.example' } })).status, 403);
assert.equal((await fetch(url, { headers: auth })).status, 405);
const badHostStatus = await new Promise((resolve, reject) => {
  const req = http.get(url, { headers: { ...auth, Host: 'untrusted.example:3487' } }, res => {
    res.resume(); resolve(res.statusCode);
  });
  req.on('error', reject);
});
assert.equal(badHostStatus, 403);
const client = new Client({ name: 'opengym-http-smoke', version: '1.0.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: auth } }));
  const { tools } = await client.listTools();
  assert.ok(tools.length >= 8);
  assert.ok(tools.every(t => t.annotations?.readOnlyHint));
  const result = await client.callTool({ name: 'list_routines', arguments: {} });
  assert.ok(!result.isError, 'list_routines must successfully read the selected profile');
  assert.equal(typeof JSON.parse(result.content[0].text), 'object');
  console.log(`PASS: authentication, Origin protection, MCP initialization, ${tools.length} read-only tools, and list_routines`);
} finally { await client.close(); }
