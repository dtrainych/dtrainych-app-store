# dtrainych App Store

Community Umbrel App Store for umbrelOS 2.0 or newer.

## Apps

| App | Community ID | Details |
| --- | --- | --- |
| openGym | `dtrainych-opengym` | Workout planning, tracking and read-only MCP access |
| Open Wearables | `dtrainych-open-wearables` | Wearable health data, provider integrations and hosted MCP access |

See the [Open Wearables package guide](dtrainych-open-wearables/README.md) for
setup, API/MCP connections, migration instructions and test evidence.

## Add the store

In Umbrel, add `https://github.com/dtrainych/dtrainych-app-store` as a Community
App Store. Packages become available after their changes are committed and
pushed to that repository.

## Test openGym

1. Install **openGym** from the dtrainych App Store. Its community app ID is `dtrainych-opengym`.
2. Open it through the Umbrel home screen using the HTTPS device hostname. Anyone who can reach the URL can see the sign-in and guest screens. Create your profile before sharing access; the first profile becomes admin.
3. Save a body-weight entry or workout, restart the app through Umbrel, and confirm the profile and entry persist. Check the app logs for errors.

The community ID is different from the official `opengym` package ID. Their data is stored separately and will not automatically transfer between installs. Umbrel login is disabled for this app so mobile clients can connect directly; openGym's own authentication protects account data. Guest mode stores data only in the browser.
