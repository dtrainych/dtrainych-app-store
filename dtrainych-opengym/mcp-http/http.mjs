// HTTP adapter for the unmodified read-only openGym v1.4.2 tools.
// Copied beside upstream mcp/package.json by the deployment bootstrap.
import http from 'node:http';
import { isIP } from 'node:net';
import { timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TOOLS } from './src/tools.js';
import { init } from './src/state.js';

const token = process.env.MCP_TOKEN || '';
if (token.length < 32) throw new Error('MCP_TOKEN must contain at least 32 characters');
const expected = Buffer.from(`Bearer ${token}`);
const hosts = new Set((process.env.MCP_ALLOWED_HOSTS || 'localhost:3487,127.0.0.1:3487,umbrel.local:3487').split(','));
const port = Number(process.env.MCP_PORT || 3487);
// Fail closed instead of exposing a server wired to missing/ambiguous data.
init();

const app = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const authority = req.headers.host || '';
  const numericHost = authority.endsWith(`:${port}`) ? authority.slice(0, -String(port).length - 1) : '';
  // Literal LAN IPs cannot be DNS-rebinding names. Custom DNS names must be listed.
  const privateIPv4 = isIP(numericHost) === 4 && /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(numericHost);
  if (!hosts.has(authority) && !privateIPv4) { res.writeHead(403).end(); return; }
  // This service is for MCP clients, not cross-origin browser access.
  if (req.headers.origin) { res.writeHead(403).end(); return; }
  const supplied = Buffer.from(req.headers.authorization || '');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Bearer realm="opengym-mcp"' }).end(); return;
  }
  if (req.url !== '/mcp') { res.writeHead(404).end(); return; }
  if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }).end(); return; }
  const server = new McpServer({ name: 'opengym', version: '0.1.0-http.1' });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { void transport.close(); void server.close(); });
  try {
    for (const t of TOOLS) {
      server.registerTool(t.name, {
        description: t.description, inputSchema: t.schema,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
      }, async (params) => {
        try {
          return { content: [{ type: 'text', text: JSON.stringify(t.handler(params || {}), null, 2) }] };
        } catch (err) {
          return { isError: true, content: [{ type: 'text', text: `${err.code || 'ERROR'}: ${err.message}` }] };
        }
      });
    }
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch {
    if (!res.headersSent) res.writeHead(500).end();
    else res.end();
    console.error('[opengym-mcp-http] request failed');
  }
});
app.requestTimeout = 30_000;
app.headersTimeout = 10_000;
app.listen(port, '0.0.0.0', () => console.error(`[opengym-mcp-http] listening on port ${port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => app.close(() => process.exit(0)));
