# openGym MCP over HTTP

This package adds a read-only Streamable HTTP MCP service alongside the existing
Umbrel app. It uses the unmodified MCP tools and training calculations from
[openGym v1.4.2](https://github.com/DuarteSantos8/openGym/tree/v1.4.2/mcp).

## Activate after pushing

1. Push the package changes to your community App Store repository.
2. Refresh the store in Umbrel and update **openGym** to `1.4.2-patch.2`.
3. Copy the password from openGym's **Umbrel app credentials**. The username label
   is **MCP bearer token**. This credential belongs to MCP; your existing profile
   password and passkeys continue to work as before.
4. Configure your MCP client with **Streamable HTTP**, URL
   `http://umbrel.local:3487/mcp`, and the header
   `Authorization: Bearer <copied password>`.
   On your current network, `http://192.168.1.188:3487/mcp` also works.
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
do not port-forward it or publish it through a tunnel. The service publishes port
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
194 MB; unused media is not extracted and the archive is deleted after extraction.
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

Local checks completed using Node 22.23.4 on Linux amd64:

- 95 upstream MCP tests passed.
- The minimal extracted source's complete MCP import graph loads under Node.
- SDK client integration passed initialization, discovery of nine read-only
  tools, and `list_routines` against synthetic profile data.
- Missing and incorrect bearer tokens and browser Origin requests were rejected.
- Manifest/compose consistency, pinned image platforms, and `git diff --check`
  were checked.

Live Umbrel update/restart/storage verification is pending the push and app
update. The repo has no `package.json` or `lint:apps` script, so the skills'
standard `npm run lint:apps` check is unavailable here. No live HTTP endpoint is
claimed yet. The temporary failed Portainer bridge stack was removed.

`smoke.mjs` uses the MCP SDK installed in upstream's `mcp` directory. To check a
running endpoint, copy it beside upstream's `mcp/package.json`, then run:

```sh
OPENGYM_MCP_URL=http://umbrel.local:3487/mcp MCP_TOKEN='<token>' node smoke.mjs
```

It reports only success and tool count, without printing profile data or tokens.
