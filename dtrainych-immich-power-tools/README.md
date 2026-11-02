# Immich Power Tools for Umbrel

Packages upstream [Immich Power Tools v0.25.0](https://github.com/immich-power-tools/immich-power-tools/releases/tag/v0.25.0)
(AGPL-3.0) for the official Umbrel `immich` app. Requires umbrelOS 2.0+
and Immich 3.0+. The observed installed Immich version was v3.3.5.

## Install and open

1. Make this package available through the dtrainych Community App Store.
2. Keep Immich installed and running, then install **Immich Power Tools**.
3. Open it from Umbrel on port **2284** and sign in with your Immich email
   and password. Umbrel login also protects the app route by default.
4. If you use a public Immich URL, set `EXTERNAL_IMMICH_URL` in this app's
   Umbrel settings, for example to your usual photos URL. This controls browser
   links; internal API requests still use Docker DNS.

No API key creation or credential entry is required for password sign-in.
OAuth-only Immich accounts are not configured by this package.
Back up Immich's database and library before bulk changes: Power Tools has
direct database access and can modify or delete library content.

## Network and credentials

Umbrel injects `umbrel_main_network` as the default network for both apps.
Power Tools uses `http://immich_server_1:2283` and `immich_postgres_1:5432`.
There is no separate network, host-network mode, database port publication,
Docker socket mount, or second Immich/database installation.

The official Immich package currently exports no database connection variables.
At app startup, `exports.sh` reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, and
`POSTGRES_DB` from the installed Immich Compose file using Umbrel's bundled
`yq`, including YAML aliases. The package uses the older-compatible
`--unwrapScalar` option rather than the newer `-r` shorthand. It reads the package configuration only and does
not change Immich. Credentials remain runtime values, never checked into Git.
Missing, empty, or interpolated values stop startup with a field-specific error
that does not print credentials. Custom dependency providers, renamed services,
or future Immich packages with interpolated credentials require adapting this
integration; do not substitute guessed or generated database passwords.

JWT signing uses a separate deterministic Umbrel secret. API-key auto-login
is deliberately left unconfigured; each user signs in to Immich.

## Persistence and migration

`data/power-tools` is mounted at `/app/data`, including the app's SQLite
database, settings and workflows. The process runs as `1000:1000`, matching
Umbrel's data ownership rather than upstream's default UID 1001. Umbrel can
move this app's data through its storage settings. Immich's existing library
and PostgreSQL data remain managed by Immich and need their own backups.

This is a separate install from the Portainer stack. If migrating an existing
Power Tools installation, stop it first, back up its `/app/data` volume, and
restore that content into this app's `data/power-tools` while this app is
stopped, preserving UID/GID `1000:1000`. Do not run both UIs on host port 2284;
stop the old stack before starting this app. Neither existing stack nor data
is modified by preparing this package.

## Verification

The runtime image is pinned to the upstream 0.25.0 multi-architecture index;
its public registry manifest includes `linux/amd64` and `linux/arm64`.
Run the repository checks with:

```sh
npm ci
npm run lint:apps -- dtrainych-immich-power-tools --check-images
git diff --check
```

Static validation on an ARM64 workspace passed with no warnings when using
a temporary combined registry containing this store and the official Immich
manifest. The repository linter currently resolves dependencies only within
this repository, so the plain command above reports `Unknown dependency app
immich` despite Immich being installed from the official store. Keep the
manifest dependency: Umbrel needs it to enforce installation order. For a
complete lint run, copy this store's packages into a temporary root, add the
official `immich/umbrel-app.yml`, and invoke `.tools/lint-apps.mjs` with
`--root <temporary-root> dtrainych-immich-power-tools --check-images`.

Credential-loading checks passed for YAML aliases, special characters, repeated
sourcing, and failure on missing dependencies, missing/empty fields, or
unresolved variable expressions. Shell syntax and whitespace checks passed.

Umbrel installation, browser login, database/API connectivity, restart, and
persistence still need device verification. Package preparation does not
deploy the app or change the existing Portainer stack.

## Install failure fixed in 0.25.0-patch.1

Umbrel logs identified `Error: unknown shorthand flag: 'r' in -r` during
credential loading. The initial check used a newer yq than the device. This
patch uses `--exit-status --unwrapScalar`, both supported by the device's
bundled yq. Refresh the community store after publishing this patch and retry
the installation. Existing successful installs can use the normal app update.
The upstream image and stored data paths are unchanged.
