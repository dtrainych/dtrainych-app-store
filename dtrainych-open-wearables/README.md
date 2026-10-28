# Open Wearables for Umbrel

Community app ID: `dtrainych-open-wearables`. Requires umbrelOS 2.0.
Upstream: [Open Wearables](https://github.com/the-momentum/open-wearables), MIT license.
This package pins release **0.10.0**, commit
`d18304f8076a7710c48a4b279f8e8abd5a16887e`.

## Install and connect

Install from the dtrainych community store after this package is published there.
Open it through Umbrel over HTTPS. Sign in as `admin@admin.com` with the initial
password in Umbrel's app credentials, then change the password in the portal.
The portal uses Open Wearables' own login; Umbrel's additional login is disabled.
Umbrel generates this 64-character hexadecimal bootstrap password. Copy it for
the first login, then choose your own password in the portal. The displayed
Umbrel credential remains the bootstrap value after you change it.
The initial password is only seeded into an empty database; it does not reset
an existing account on restart or after a database restore.

### Existing browser sessions

If the portal shows a 500 error after installing alongside another Open Wearables
instance, try a private browser window. Upstream 0.10.0 uses a fixed `ow_session`
cookie name. Browser cookies are shared across ports on the same hostname, so a
session from the Portainer instance can reach this separate backend. That backend
rejects the token with 401, which the frontend can surface as a 500.

Use separate browser profiles/private windows while running both instances, or
serve them on distinct hostnames. Clearing cookies for the shared hostname also
clears the stale session, but signs you out of other apps on that hostname and
does not prevent another collision. This does not require reinstalling the app
or resetting its database.

| Service | Address | Authentication |
| --- | --- | --- |
| Portal | `https://umbrel.local:3490` | Open Wearables login |
| REST API | `http://umbrel.local:3491` | Open Wearables API keys / application tokens |
| MCP | `http://umbrel.local:3492/mcp` | Bearer token containing an Open Wearables API key |

Replace `umbrel.local` with your device's hostname. The raw API and MCP ports
are intentionally separate from Umbrel's browser login for SDKs, provider
callbacks and AI clients. PostgreSQL and Redis have no host-published ports.
Ports 3490–3492 do not overlap this repo's openGym package or the inspected
Portainer Open Wearables stack's default ports.

Create an API key in **Settings → Credentials** and configure your HTTP MCP
client with:

```json
{
  "mcpServers": {
    "open-wearables": {
      "url": "http://umbrel.local:3492/mcp",
      "headers": {
        "Authorization": "Bearer REPLACE_WITH_YOUR_API_KEY"
      }
    }
  }
}
```

This example uses a common client configuration shape; individual clients can
use different field names. Select Streamable HTTP transport. The endpoint is
stateless: POST is supported; GET/SSE subscriptions are not required or offered.
The upstream tools query users, sleep, activity, workouts, time series, and
menstrual cycles. They do not modify health data. Treat an API key as access to
all data that the backend authorizes for that key; the bridge does not add
per-user filtering or reduce the scope of an instance-wide key.

Each HTTP request validates its key against the API, and the tool uses the same
key. Credentials are isolated with a request-local context, not a mutable shared
key. Deleting a key in the portal rejects subsequent MCP requests. There is no
second MCP password, credential file, or setup command.

Use the raw HTTP endpoints on a trusted LAN. For remote clients, terminate HTTPS
at your reverse proxy. Forward MCP's original `Host` to an allowed LAN authority
(for example `umbrel.local:3492`); the adapter rejects unknown DNS Host values
and all browser Origin headers. It accepts the configured device names and
literal RFC1918 IPv4 addresses on port 3492. It does not trust forwarding headers.
Clients that only support OAuth-based MCP connections cannot use this bearer-key
endpoint without additional integration.

## Provider setup

Set provider credentials in the portal rather than editing Compose. Providers
may require their own developer account, approved integration, and public HTTPS
OAuth/webhook URLs. A local Umbrel hostname alone does not satisfy those requirements.

For an existing public API hostname, point its reverse proxy at the new API port
and keep its public URL unchanged during migration. In Umbrel's app settings set
`API_BASE_URL` and `VITE_API_URL` to that same public API origin, and
`FRONTEND_URL` to the portal origin used for invitation links. Local defaults work
for exploring the portal and using the API/MCP on your LAN. API URL changes must
be applied to the app, worker and scheduler; the manifest settings handle this.

S3-dependent Apple XML import, raw-payload archival and SDK payload offload are
not configured by this package. Outgoing Svix webhooks are disabled, and Svix
and Flower are omitted. Incoming provider callbacks and normal sync workers are
included. Configure storage/email or outgoing delivery deliberately in a future
package change if needed; no provider/cloud credentials are bundled.

## Package implementation

The API, worker and scheduler reuse upstream's production backend image. The
frontend uses upstream's production SvelteKit image. PostgreSQL 18 and Redis 8
persist under `data/postgres` and `data/redis`, and have independent per-install
passwords derived by Umbrel. The JWT secret is independently derived, and the
bootstrap admin password is Umbrel's `APP_PASSWORD`. Anonymous upstream telemetry
and Sentry reporting are disabled.

The MCP container reuses the same pinned backend image's Python and uv runtime,
runs as UID/GID 1000, drops capabilities and sets `no-new-privileges`. The lint
warning for `security_opt` is intentional: this restricts privileges. It has no
database volume, database password, admin password, signing secret or Docker socket.

Upstream does not publish an MCP image. `mcp-bootstrap.py.template` downloads the
exact release archive, verifies its SHA256, extracts only regular files in `mcp/`,
and uses upstream's lockfile with `uv sync --locked` and no dev groups. It then
runs the unmodified tools with `mcp-http.py.template`. These top-level templates
are rendered/copied by Umbrel on install and update; they contain no interpolated
secrets. No local image build or private registry is needed.

Source, the MCP venv and dependency cache live in `/tmp` inside the container.
An ordinary process restart reuses that preparation; recreating the container
downloads it again. GitHub and the locked dependency sources must be reachable
for that preparation. A failed checksum or dependency install prevents the MCP
listener from starting. Other app services remain independent of MCP readiness.
A future prebuilt MCP image could remove this network dependency.

## Migration and testing

- [Portainer migration guide](MIGRATION.md): version checks, backups, secrets,
  database transfer, cutover and rollback. Migration has not been performed.
- [Validation and live test evidence](TESTING.md): local checks, Umbrel fresh
  installation, UI/MCP checks, restart/persistence and completed test cleanup.
