# Update OpenGym app and MCP together

Read this reference for `dtrainych-opengym`, including requests such as “update
opengym app and mcp”. Use the parent update skill for release discovery, image
verification, versioning, and update safety, and `umbrel-test-app` for live tests.
This reference adds this store's integration contract; inspect current source
rather than treating the versions or tool counts recorded in docs as targets.

## Scope and discovery

- Package: `dtrainych-opengym/`; stable app ID `dtrainych-opengym`.
- Upstream: https://github.com/DuarteSantos8/openGym. Check stable releases,
  self-hosting docs, release notes, image publishers, and the release's `mcp/`.
- Inventory API/web image tags and digests in `docker-compose.yml`, the source
  commit and archive SHA-256 in `mcp-http/bootstrap.mjs`, and the Node image in
  `mcp-http/render.py`. The embedded scripts in compose are generated output.
- Update the app and MCP source to the same stable upstream release when
  compatible. Review data schema and calculation changes; do not independently
  advance MCP to upstream main while leaving API/web on an unrelated release.
- Prefer Git and `gh` CLI for GitHub operations (user preference). Check installed
  tools and auth first; never assume plugin auth also authenticates shell Git.
  Update requests alone do not authorize publishing or production lifecycle changes;
  use the user's current requested scope. Do not inherit historical push permission
  or credentials from this reference.

## Runtime contract

The web UI uses Umbrel's HTTPS app route on port 3486. Its existing profile login
is separate from MCP authentication. Preserve app ID, service names, storage,
existing login behavior, and user settings unless an upstream change requires a
reviewed migration.

The `mcp` service serves stateless Streamable HTTP POST requests at port 3487,
path `/mcp`. `http.mjs` registers upstream `TOOLS` over the MCP SDK HTTP transport;
it does not run upstream's stdio entrypoint. Preserve bearer authentication,
Host/Origin checks, and read-only behavior. Do not automatically expose new write
capabilities when upstream adds them; that needs an explicit scope decision.

`volumes_from: api:ro` inherits the API's actual data mounts, including Umbrel
custom `/data` mounts. Do not replace it with the default app-data path: that can
silently point MCP at an unused directory. The sidecar currently needs UID 0 for
upstream private files owned by root; it drops capabilities and disallows
privilege escalation. Re-evaluate ownership if upstream changes its runtime user.

`MCP_TOKEN` is `${APP_PASSWORD}`. `deterministicPassword` makes Umbrel display this
stable per-install MCP bearer token in app credentials. It is not the user's
OpenGym profile password. `OPENGYM_UID` selects a profile for multi-profile data;
a single profile is auto-detected. Never commit tokens or profile data.

## Updating the bootstrap and adapter

1. Resolve the chosen release tag to its exact commit (dereference annotated
   tags). Download that commit's source archive from the canonical upstream.
   Compute the archive SHA-256 from its bytes; do not reuse an old checksum.
2. Update the commit and matching archive checksum in `bootstrap.mjs`. Review
   extracted paths and imports: MCP reuses `frontend/src/lib/` and needs the
   frontend package metadata for ESM. Adjust extraction only if upstream needs it.
3. Use upstream's committed MCP lockfile (`npm ci --omit=dev --ignore-scripts`).
   Review SDK/API changes against `http.mjs`; don't infer its dependencies from
   the bridge's displayed implementation version or only update the Node image.
4. If updating Node, edit its tag and matching multi-architecture digest in
   `render.py`, then regenerate. Editing only compose would be undone by rendering.
5. Run from repository root:
   `python3 dtrainych-opengym/mcp-http/render.py`.
   Review decoded source and generated changes together; never hand-edit Base64.
6. Update manifest version/release notes using the generic skill, and refresh
   `mcp-http/README.md` when versions, behavior, setup, or test evidence change.

Base64 embeds reviewed JavaScript into compose so Umbrel updates receive it;
arbitrary files in `mcp-http/` are not copied on app updates. It is encoding, not
secret storage. Keep the final dynamic import as a file URL (`pathToFileURL`):
this module runs from a `data:` URL, and a bare absolute path previously failed
with `ERR_UNSUPPORTED_RESOLVE_REQUEST` on the real device.

The bootstrap downloads the pinned archive and locked packages when a container
is recreated; a restart of the same container can reuse its ready marker. Assess
both startup paths. A dedicated prebuilt MCP image is a possible future change,
not an existing implementation or an automatic part of an ordinary update.

## Validation

Prerequisites: Node 22 or a reviewed compatible runtime, npm, Python 3/PyYAML,
GitHub/npm connectivity for bootstrap testing, and a free local port 3487.
Install repo lint dependencies with `npm ci --ignore-scripts`.

```sh
npm run lint:apps -- dtrainych-opengym --check-images
python3 dtrainych-opengym/mcp-http/test-startup.py
git diff --check
```

Run upstream MCP tests in an isolated checkout of the chosen release using its
lockfile. The startup test executes the actual compose-embedded entrypoint with
synthetic data, both fresh bootstrap and cached restart. It includes SDK discovery,
a read-only tool call, and authentication/Host/Origin rejection tests. Adapter-only
checks missed the bootstrap import bug; do not substitute them for this test.
Verify rendering is deterministic and the encoded adapter/bootstrap match source.

For live testing follow `umbrel-test-app`, using the actual installed community
store rather than its example official-store path. Discover device details,
installed version, settings, custom mounts, and available grants each session.
After a user-authorized update, verify UI login/data, MCP initialization/discovery,
a representative read-only call, then restart/persistence and settled logs.
Umbrel's `ready` state alone has previously hidden a crashing MCP sidecar.

`mcp-http/smoke.mjs` runs beside an upstream `mcp/package.json` with installed SDK
dependencies. Set `OPENGYM_MCP_URL` and `MCP_TOKEN` via the execution environment;
obtain credentials securely in the current session. Do not log the token or
private tool results. Report the currently observed tests; historical success is
not evidence that a new release works. State unavailable checks explicitly.

## Portainer / ChatGPT tunnel

There is a separate `chatgpt-mcp-tunnel` stack with an `opengym-tunnel` service.
It forwards outbound Secure MCP Tunnel traffic to the Umbrel HTTP endpoint, not
to Portainer's separate OpenGym app. The tunnel supplies the bearer token through
`MCP_EXTRA_HEADERS` and `MCP_DISCOVERY_EXTRA_HEADERS`; its environment uses
`OPENGYM_TUNNEL_ID`, `OPENGYM_MCP_TOKEN`, and the existing `TUNNEL_API_KEY`.

Discover the current stack and environment through Portainer (read its guidance
first); do not rely on old stack IDs, IPs, or temporary `/tmp` compose files.
The LAN HTTP endpoint is unencrypted. The user's chosen OpenAI secure outbound
tunnel is supported; do not replace it with public unauthenticated ingress.
Ordinary app/MCP updates need no tunnel edit if URL, auth, and protocol stay
compatible. Updating the tunnel client, deploying stack changes, creating tunnels,
or enabling Renovate is separate work unless requested. Preserve existing stack
secrets; redacted values are placeholders, never deployable credentials.
