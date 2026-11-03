# openGym MCP over HTTP

This package adds a read-only Streamable HTTP MCP service alongside the existing
Umbrel app. It uses the unmodified read tools and training calculations from
[openGym v1.4.4](https://github.com/DuarteSantos8/openGym/tree/v1.4.4/mcp).
The HTTP adapter registers only upstream `TOOLS`, including `get_programme`;
upstream `WRITE_TOOLS` and workout-writing credentials are not exposed.

## Activate after pushing

1. Push the package changes to your community App Store repository.
2. Refresh the store in Umbrel and update **openGym** to `1.4.4`.
3. Copy the password from openGym's **Umbrel app credentials**. The username label
   is **MCP bearer token**. This credential belongs to MCP; your existing profile
   password and passkeys continue to work as before.
4. Configure your MCP client with **Streamable HTTP**, URL
   `http://umbrel.local:3487/mcp`, and the header
   `Authorization: Bearer <copied password>`.
 5. Ask the client to list your routines or recent workouts.

For clients supporting URL/header configuration, the common configuration shape
is:

```json
{
  "mcpServers": {
    "opengym": {
      "url": "http://umbrel.local:3487/mcp",
      "headers": { "Authorization": "Bearer <MCP bearer token>" }
    }
  }
}
```

Exact configuration keys depend on the client. A browser GET is not an MCP test:
unauthenticated requests return 401, and authenticated GET requests return 405.
The endpoint serves MCP POST requests. It supports clients running on the LAN;
a hosted client requires its own network connectivity to that LAN.

HTTP sends the token and results unencrypted. Keep this port on your trusted LAN;
do not port-forward it or publish it through a public tunnel. The configured
OpenAI Secure MCP Tunnel uses an authenticated outbound connection and is supported.
The service publishes port
3487 on the device's interfaces, accepts the device hostname and literal private
IPv4 addresses, rejects browser Origin headers, and requires the token for every
request. Additional DNS aliases must be explicitly added to MCP_ALLOWED_HOSTS.
The token permits reading the selected profile's training data.

## Profiles and storage

The `mcp` service inherits the `api` service's data mounts **read-only** using
`volumes_from: api:ro`. This also follows Umbrel's custom `/data` mount and moved
storage, instead of accidentally reading the unused default data directory.
It has no Docker socket, host mounts, write tools, or connection to a separate
Portainer OpenGym installation.

One profile is auto-detected. For multiple profiles, select `OPENGYM_UID` in
Umbrel's app settings; the ID is the matching `users[].id` in your data's
`db.json`. The MCP service fails closed until a profile can be selected and read.
A fresh installation must create a profile before MCP can start. Logs report
ambiguous profile IDs for the owner; these IDs are not included in tool errors.

The sidecar runs as UID 0 because the upstream API owns its private data files as
UID 0. Its Linux capabilities are dropped, privilege escalation is disabled, and
all inherited data mounts are read-only. It reads `db.json` internally for profile
selection; only the upstream training-tool results cross the MCP interface.

## Deployment details

The runtime is a public Node 22.23.4 image pinned to its multi-architecture index
(supporting amd64 and arm64). The bootstrap downloads the exact OpenGym v1.4.2
commit, verifies its archive SHA-256, extracts the MCP and shared calculation
sources, and installs dependencies with the upstream lockfile using
`npm ci --omit=dev --ignore-scripts`.

GitHub and npm access are needed whenever Umbrel recreates the sidecar, including
app lifecycle operations that recreate containers. The upstream archive is about
196 MB; unused media is not extracted and the archive is deleted after extraction.
A normal process restart in the same container reuses the installed code.
A download failure affects MCP; the existing web and API services remain separate.
This bootstrap is a practical custom-store deployment; a prebuilt MCP image would
remove these downloads if upstream publishes one later.

The adapter and bootstrap are embedded into `docker-compose.yml` because Umbrel
copies compose during updates but does not update arbitrary subdirectories.
After editing either source file, regenerate with Python 3 and PyYAML:

```sh
python3 dtrainych-opengym/mcp-http/render.py
```

No new persistent directory or migration is required. `APP_PASSWORD` provides a
stable per-install MCP credential through Umbrel's deterministic-password feature.
No generated token or user data is stored in this repository.

## Verification

Checks for the 1.4.2-patch.3 → 1.4.4 package update completed using Node
22.23.4 on Linux arm64:

- 133 upstream MCP tests passed; five API-backed write integration tests were
  skipped because the separate upstream API test dependencies were not installed.
- The complete MCP import graph loads under plain Node.
- Exact embedded compose startup and cached restart passed using a clean
  temporary runtime and synthetic data (`test-startup.py`).
- SDK client integration passed initialization, discovery of ten read-only
  tools, and `list_routines` against synthetic profile data.
- Missing and incorrect bearer tokens, untrusted Host headers, and browser
  Origin requests were rejected.
- Rendering is deterministic and both embedded scripts match their source files.
- Public API/web image indexes support linux/amd64 and linux/arm64; both
  architectures' image labels identify version 1.4.4 and source commit
  `5f5832db56080837b58342ff50f78631dcc63e07`.
- `npm run lint:apps -- dtrainych-opengym --check-images` passed with zero errors
  and two warnings: the unchanged pinned Node image's tag has been rebuilt, and
  the MCP sidecar deliberately uses `no-new-privileges:true`. The existing Node
  digest remains pinned; all Linux capabilities remain dropped.
- `git diff --check` passed.

Live Umbrel update, browser login, restart, and real-data persistence verification
were not performed for this release. These local checks do not establish the
Umbrel update path. The API still runs as root with `/data` persistence; upstream's
web image now runs as UID 101 and retains port 80 as its Docker default. No
package mount, authentication, permission, or environment change was required.

Install the repository's locked lint dependency with `npm ci --ignore-scripts`
before repeating the linter.

`smoke.mjs` uses the MCP SDK installed in upstream's `mcp` directory. To check a
running endpoint, copy it beside upstream's `mcp/package.json`, then run:

```sh
OPENGYM_MCP_URL=http://umbrel.local:3487/mcp MCP_TOKEN='<token>' node smoke.mjs
```

It reports only success and tool count, without printing profile data or tokens.

To repeat the embedded startup regression test with Node 22 on PATH:

```sh
python3 dtrainych-opengym/mcp-http/test-startup.py
```
