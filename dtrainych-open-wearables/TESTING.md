# Open Wearables package validation

```sh
npm run lint:apps -- dtrainych-open-wearables --check-images
git diff --check
python3 dtrainych-open-wearables/tests/test_mcp.py
```

The MCP test needs Python 3.13+, uv on PATH, network access for bootstrap, and
local port 3492 free. It launches the actual bootstrap/adapter with the pinned
upstream source and a fake API, then checks initialization, six tool definitions,
concurrent key isolation, revocation, and Host/Origin/auth rejection. It uses no
real health data. It does **not** verify the full app's database or provider sync.

Static/package/image checks passed. The pinned image indexes publish
`linux/amd64` and `linux/arm64`; the isolated MCP integration tests passed on
Linux amd64/Python 3.14.4 with uv 0.11.1.

### Umbrel runtime verification — 0.10.0, 2026-10-28

Fresh installation was tested through Umbrel's app lifecycle on a physical
amd64 device running umbrelOS 2.0.0. The unpublished package was temporarily
copied into the existing dtrainych community store; all test data was synthetic.

- Umbrel recognized the package, its three declared settings and its generated
  credentials. Installation completed with the expected seven runtime services.
- The real `https://umbrel.local:3490` route redirected unauthenticated visitors
  to Umbrel login. For browser automation only, outer Umbrel authentication was
  temporarily disabled on this disposable test app. Open Wearables' own login
  remained active, and the seeded credentials worked.
- A headless Chromium browser created a synthetic user and an API key in the
  portal. The app queued synthetic health-data generation, and the Celery worker
  produced two workouts and two sleep records. Both data pages rendered through
  the HTTPS route with no browser page errors.
- The hosted MCP endpoint initialized and listed all six upstream tools. It
  returned the synthetic users, workouts and sleep records. Missing/invalid
  keys returned 401; unapproved Host and browser Origin headers returned 403.
- Changing `VITE_API_URL` through Umbrel's declared settings restarted the app.
  The changed API address appeared in the portal. Existing browser sessions,
  users, API keys, two workouts and two sleep records survived; both browser
  data pages and MCP queries worked again after the restart.
- Revoking the actual test API key immediately caused MCP requests with that
  key to return 401. Default Umbrel authentication was restored and its redirect
  verified before uninstalling.
- Cleanup completed: Umbrel reported `not-installed`, its test app-data
  directory was removed, ports 3490–3492 were released, and the temporary package
  directory in the community store was removed. Local test credentials and
  browser sessions were deleted. The source package in this repository remains.

Settled logs showed no blocking runtime errors. Expected warnings include
unconfigured optional AWS storage, upstream duplicate Oura OpenAPI operation
IDs, upstream Celery running as root, Redis host memory-overcommit settings,
and uv ignoring the backend image's different virtualenv. Upstream's MCP
configuration also warns about a missing static API key; the HTTP bridge
deliberately supplies request-specific keys instead. The expected 401 from the
revocation check is logged as an API error. Host settings were not changed.

Actual provider OAuth/live sync, external S3 imports, arm64 runtime behavior,
and migration of the existing Portainer data remain untested. This was a fresh
installation, not an upgrade-path or data-migration test. The running Portainer
deployment was not changed.

### Follow-up: browser session collision

After installation alongside the existing Portainer instance, an ordinary browser
session produced a portal 500 while the backend remained healthy. Read-only logs
showed 401 responses to dashboard/user requests. The owner confirmed that a private
window opened the Open Wearables login page normally. Upstream's fixed `ow_session`
cookie name and frontend session handling explain the conflict between instances
on different ports of the same hostname. The isolated browser contexts used above
did not cover this coexistence case. See the package README for workarounds.

### Package update — 0.10.0-patch.1

The default outer Umbrel login is now disabled through `PROXY_AUTH_ADD: "false"`.
Open Wearables' own login remains enabled. This matches the authentication mode
used for the successful HTTPS UI, API-key and persistence checks above. The
installed-app update path has not been rerun for this patch. Disabling outer
Umbrel login does not resolve the separate session-cookie collision described
above.
