# Hosted V1 playtest preparation

The owner requested publication on 7 October 2026. This branch prepares a hosted client
from Frontend's full-match commit `4b6dc327104f099051a71bb9e71adbf71390a2a5`. It is a
separate integration proposal: the existing worktrees, local emulator entry, rules,
contracts and historical Canvas are unchanged. Firebase project
`gamen-mothership-staging` was created on 7 October 2026 for this preview. The
application has not been deployed.

## What is ready locally

`apps/game/hosted/` is a separate static entry using the existing protocol-2 controllers,
presentation markup and lifecycle reconciliation. Its lobby and browser mount are
promoted from the tested connected preview; neither imports the development harness.
It retains the current functional screens, not the Designer's final visual treatment.
A permanent banner labels it as a playtest. Session closure can still lose an anonymous
identity; the host should keep its tab open, and host-only identity recovery is unfinished.

`apps/game/src/browser/hosted-transport.ts` connects to real Firebase services. It pins one
project and its exact `https://PROJECT_ID.web.app` origin, uses session Auth and memory-only
Firestore snapshots, initializes reCAPTCHA Enterprise App Check before Firebase access,
and obtains current Auth and App Check tokens for every JSON operation. Redirects,
emulator targets, mixed-project configuration and debug attestation are rejected.
The SDK manages credentials; custom persistence remains limited to nonsecret context and
reconciliation identifiers. No role, target, view or recovery token is added to storage.

Hosted Firestore permission/identity errors now suspend authorization instead of declaring
seat revocation. Held views and announcements disappear immediately, cached snapshots
cannot restore them, and nonsecret unresolved command identifiers survive reconnect or
reload. A reconnect refreshes Auth and App Check credentials before opening listeners.
Only a fresh authorized server view restores the screen. Definitive refusal still clears
the command and permanently denies the old session. Quarantine preserves the revision
floor while discarding held private view bytes.

The generated CSP now permits the installed SDK's actual App Check exchange host,
`content-firebaseappcheck.googleapis.com`. Permanent tests compare the generated policy
with the installed SDK and exercise unanswered accepted commands, ambiguous denial,
reconnect/reload reconciliation, repeated denial, late callbacks, refresh failure and
revision integrity. These changes address the two findings in
[PR #55](https://github.com/Amirkianfar66/GameN/pull/55); independent review and live cloud
acceptance remain required.

`scripts/prepare-hosted-preview.mjs` creates the static bundle, public configuration,
hash manifest and exact-site Hosting configuration. Its source boundary rejects the
development emulator transport, fixtures, server code and other unapproved workspace
paths. The existing production exclusion scan also checks the resulting bundle. No
source maps, raw source directories or service credentials are published by this build.

## Build inputs

Use the public web configuration returned by Firebase for the selected staging project.
Do not put an ID token, refresh token, service-account key or App Check debug token in
this file. The reCAPTCHA site key is public and must be registered for the same Firebase
web app and hosting domain.

```json
{
  "projectId": "SELECTED_PROJECT_ID",
  "apiKey": "FIREBASE_PUBLIC_WEB_API_KEY",
  "appId": "FIREBASE_WEB_APP_ID",
  "messagingSenderId": "FIREBASE_PROJECT_NUMBER",
  "authDomain": "SELECTED_PROJECT_ID.firebaseapp.com",
  "pageOrigin": "https://SELECTED_PROJECT_ID.web.app",
  "recaptchaEnterpriseSiteKey": "REGISTERED_PUBLIC_SITE_KEY"
}
```

These placeholders intentionally do not pass configuration validation. With the pinned
Node 22.21.1/npm 10.9.4 toolchain, and the actual public configuration in a local file:

```sh
npm ci
npm run verify
node scripts/prepare-hosted-preview.mjs /absolute/path/to/public-preview-config.json
node scripts/package-backend.mjs --verify-install
```

The outputs are `dist/hosted-preview/`, `dist/firebase-hosting.json`, and `dist/backend/`.
The browser manifest's `assetManifestVersion` must also be the Backend runtime's
`MOTHERSHIP_ASSET_MANIFEST_VERSION`. Set `MOTHERSHIP_ALLOWED_ORIGINS` to a JSON array
containing the one selected page origin. Regenerate the artifact from a committed,
clean source before deployment; the manifest records the commit and dirty state.

## Verification performed on 7 October

- Clean pinned installation: 886 packages.
- Typechecks and build passed. `npm run verify`: **635 tests passed**, no failures,
  skips or todos. Five new checks cover hosted configuration, credentialed requests,
  current tokens, redirect/cache policy and failures without manufactured success.
- A synthetic public configuration built 151 modules into five hashed static files plus
  a release manifest. The main
  JavaScript chunk is about 205 kB gzipped; Vite reports its normal 500 kB raw-chunk
  warning. Real-phone loading and performance are not measured.
- The bundle passed production exclusion and contains no local emulator configuration
  or fixture marker. A local browser loaded it and showed the expected failure message
  because the local origin was not its configured hosted origin. This is a startup and
  origin-guard check, not a successful cloud session.
- The standalone Backend artifact passed isolated installation/import and forbidden
  source checks. Artifact SHA-256:
  `ddce0f22c7b9c9dbd620f384a7e9ebd6cddb3b19c364f86c9d84fea16a4da4ba`.
  Runtime/source SHA-256:
  `d24c051049a212376239603a4286c360c176125475c3927239e65b6b4553592c`.

The local build uses a clearly synthetic project and keys solely to check bundling.
That configuration is not a deployment destination and must be replaced with verified
project metadata. No cloud sign-in, Rules, App Check, task delivery, live match or physical
device behavior has been verified by these checks. The original 45-minute full-match
browser evidence belongs to the local emulator client at the pinned Frontend commit.

## Remaining publication inputs and checks

The emulator default remains `demo-mothership`. The owner selected a separate personal
account and authorized creation and configuration of **Mothership V1 Staging**, project ID
`gamen-mothership-staging`, project number `742846764120`. Fresh Firebase and IAM
readbacks confirmed the project is `ACTIVE` and the selected account has `roles/owner`.

Cloud setup verified on 7 October 2026:

- Web app `1:742846764120:web:318965fbc3aa7adcb4e62d` is active. Hosting's default site
  is `gamen-mothership-staging`, origin `https://gamen-mothership-staging.web.app`.
- Standard/Native `(default)` Firestore exists in `us-central1`, matching the runtime.
  Delete protection is enabled; point-in-time recovery is disabled.
- Firestore, Firebase App Check and reCAPTCHA Enterprise APIs are enabled. A real SCORE
  key is limited to the project's `web.app` and `firebaseapp.com` domains, registered for
  the web app with 3,600-second token TTL and the default 0.5 risk threshold.
- Firestore App Check enforcement is `ENFORCED`. This is configuration readback, not a
  successful browser attestation or authorization test.
- Billing linkage awaits the owner's choice between two existing active billing accounts.
  Auth initialization returned `BILLING_NOT_ENABLED`; anonymous Auth and Auth App Check
  enforcement remain pending. No billing account has been linked or game deployed.

After the hosted fixes, pinned `npm run verify` passed **643 tests** with no failures,
skips or todos (25 bootstrap/contracts, 79 engine, 46 Backend, 12 tooling, 140 presentation,
341 game). A build with the actual public web configuration transformed 152 modules and
passed production exclusion; main JavaScript is about 205 kB gzipped. These results do
not establish live Auth, private task delivery, real-device performance or human acceptance.

Use explicit project and account flags for cloud operations; preserve the emulator
default. The existing standalone Backend configuration at `dist/backend/firebase.json`
owns its Functions and copied Rules/indexes; `dist/firebase-hosting.json` owns the static
site. Both must come from the reviewed clean source, and the Backend environment must
pin the exact browser asset manifest as described above.

[Open the staging Firebase project](https://console.firebase.google.com/project/gamen-mothership-staging/overview).

A real preview needs the selected Firebase project, its web app, anonymous Auth,
Firestore Rules/indexes, App Check registration, and the packaged Functions/Tasks setup.
Firebase requires the [Blaze plan to deploy Functions](https://firebase.google.com/docs/functions/get-started).
Project/billing ownership must be established before provisioning. App Check setup
follows [Firebase's web provider instructions](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider).

Before giving out a playable link, verify the hosted file hashes, anonymous sign-in,
Auth/App Check denial cases, host/admission/display permissions, a real accepted move,
reload/reconciliation, a real unattended deadline and private-task invocation. Backend's
new staging handoff owns exact target IAM/configuration. Keep G17 (missing Supplier
resolved-grant disclosure), the other recorded gameplay feedback gaps, final visual
integration and human playtesting visible as preview limitations. Publication is not
approval to merge the implementation stack or a claim of complete V1 acceptance.
