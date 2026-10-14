# dtrainych App Store

Community Umbrel App Store for testing openGym on umbrelOS 2.0 or newer.

## Test openGym

1. Push this repository to `https://github.com/dtrainych/dtrainych-app-store`.
2. In Umbrel, add `https://github.com/dtrainych/dtrainych-app-store` as a Community App Store.
3. Install **openGym** from the dtrainych App Store. Its community app ID is `dtrainych-opengym`.
4. Open it through the Umbrel home screen using the HTTPS device hostname. Anyone who can reach the URL can see the sign-in and guest screens. Create your profile before sharing access; the first profile becomes admin.
5. Save a body-weight entry or workout, restart the app through Umbrel, and confirm the profile and entry persist. Check the app logs for errors.

The community ID is different from the official `opengym` package ID. Their data is stored separately and will not automatically transfer between installs. Umbrel login is disabled for this app so mobile clients can connect directly; openGym's own authentication protects account data. Guest mode stores data only in the browser.
