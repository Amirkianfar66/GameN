# Hosted V1 playtest staging record

The owner requested publication on 7 October 2026. This branch prepares a hosted client
from Frontend's full-match commit `4b6dc327104f099051a71bb9e71adbf71390a2a5`. It is a
separate integration proposal: the existing worktrees, local emulator entry, rules,
contracts and historical Canvas are unchanged. Firebase project
`gamen-mothership-staging` was created on 7 October 2026 for this preview. The
[hosted preview](https://gamen-mothership-staging.web.app) is published and its host
screen signs in successfully. Match creation and full live play are not accepted yet;
the remaining staging IAM changes await owner approval.

## Hosted client

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
floor and a memory-only SHA-256 comparison digest while discarding held private view
bytes. A changed payload at the same revision remains an integrity failure, including a
conflicting pending-command list; an identical fresh payload can restore the screen.
The portable digest uses pinned `@noble/hashes` 2.4.0 through the exact reviewed
`@noble/hashes/sha2.js` entry. Neither the digest nor private content is persisted.

The generated CSP now permits the installed SDK's actual App Check exchange host,
`content-firebaseappcheck.googleapis.com`. Permanent tests compare the generated policy
with the installed SDK and exercise unanswered accepted commands, ambiguous denial,
reconnect/reload reconciliation, repeated denial, late callbacks, refresh failure and
revision integrity. These changes address the two findings in
[PR #55](https://github.com/Amirkianfar66/GameN/pull/55); independent review passed.
Complete live cloud acceptance remains required.

The hosted build deduplicates `@firebase/app` to the client SDK's registry. Without this,
the mixed client/Admin dependency tree bundles two registries and App Check cannot find
the app created by the client. A build guard rejects anything except one registry. Three
regression checks inspect the actual hosted bundle, deliberately remove deduplication,
and initialize a synthetic App Check provider against the same app with no token or
network calls. Production errors remain generic and do not expose SDK diagnostics.

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

- Clean Node 22.21.1/npm 10.9.4 installation: 887 packages. At application commit
  `89f4a881733096a320b8365973e4540b82392ae4`, `npm run verify` passed **651 tests** with
  no failures, skips or todos: 25 bootstrap/contracts, 79 engine, 46 Backend, 16 tooling,
  140 presentation and 345 game. Typechecks and builds passed. The new registry test
  failed against the duplicate-registry bundle before the fix and passes afterward.
- Independent Backend review found no blocking issue in `89f4a88`, following its earlier
  successful review of the CSP and quarantine corrections. [GitHub CI at that exact
  application commit passed](https://github.com/Amirkianfar66/GameN/actions/runs/37563946374/job/112607284393),
  including the Backend and Frontend emulator checks and standalone packaging.
- The browser release was built from clean commit `89f4a88` with the actual public staging
  configuration. Production exclusion passed: no development harness, fixtures, server
  source, source maps or credentials are published. Vite's normal 500 kB raw-chunk warning
  remains; the main JavaScript is 698,700 bytes, about 207 kB gzip. Real-phone performance
  is unmeasured.
- The standalone Backend artifact passed isolated installation/import and forbidden-source
  checks. Artifact SHA-256 is
  `9de6404368c0556367559767f16f7d52ba18964517f53b90746f42b78b15ea24`;
  runtime/source SHA-256 is
  `d24c051049a212376239603a4286c360c176125475c3927239e65b6b4553592c`.
  The registry fix changes no Backend source or dependency lockfile.

## Published release and cloud readback

The emulator default remains `demo-mothership`. The owner authorized the separate staging
project and selected its payer. Personal account and billing identifiers are not recorded
here. Readbacks on 7 October 2026 established:

- Project `gamen-mothership-staging` (`742846764120`) is ACTIVE. Web app
  `1:742846764120:web:318965fbc3aa7adcb4e62d` and the matching Hosting site exist.
- Billing is enabled on the approved existing payer. A project-only **EUR 10 monthly
  alert budget** has thresholds at 50%, 90% and 100% of actual spend. An alert budget
  is not a spending cap.
- Anonymous Auth is enabled. The authorized domains are only this project's `web.app`
  and `firebaseapp.com` domains. Auth and Firestore App Check enforcement are ENFORCED.
  A real reCAPTCHA Enterprise SCORE key is restricted to those two domains, registered
  for the web app with a 3,600-second token TTL and the default 0.5 risk threshold.
- Standard/Native `(default)` Firestore exists in `us-central1`. Delete protection is
  enabled; point-in-time recovery is disabled. Deployed Rules match SHA-256
  `08785716d97164ee6c76070c99efbe08894c1279a6e3285d7fcf8cc5b9ae6e3d`.
  The required outbox collection-group index is READY.
- All 15 Node 22 Functions are ACTIVE in `us-central1`. The reviewed production runtime
  is packaged separately from the emulator entry. The task queue is RUNNING; its retry
  settings and the enabled one-minute repair schedule were read back. These resource
  states do not establish delivery or application correctness.
- Hosting release `5abe153f4cc9fc9b` serves application commit
  `89f4a881733096a320b8365973e4540b82392ae4`, with `sourceDirty: false` and asset manifest
  `v1-preview-8fe4549758cad334`. Bundle SHA-256 is
  `8fe4549758cad334aa54000cbf7db5d70a569e5c842ebebdfb26310056755647`.
  All five published files matched their local SHA-256 hashes; the manifest matched;
  HTTP 200, no-store caching, CSP and the other configured security headers were verified.
- Each Function now pins that exact asset manifest and only
  `https://gamen-mothership-staging.web.app` as its allowed origin. All 15 environment-only
  update operations completed successfully. They changed no code or IAM policy.

The first Functions deployment encountered a not-yet-available `gcf-artifacts` repository
on four builds. A targeted retry produced all 15 ACTIVE functions, but both CLI attempts
ended with a generic nonzero deployment status. The verified cloud readbacks above are
the evidence of the resulting state; the CLI runs are not reported as passing deployments.

Live browser verification after the registry correction reached both the signed-in device
selector and host lobby with enforced Auth/App Check. The host screen retained the same
anonymous identity across navigation. Six negative checks returned the expected results:
missing Auth on server-time/command operations returned 401, an unapproved origin returned
403, and all three private background endpoints returned 403 to unauthenticated callers.
No private game state or credential was recorded in the public evidence.

## Remaining access configuration and acceptance

The exact staging IAM plan is prepared for owner approval. Three browser-facing services
(`v1CreateMatch`, `v1Advance`, `v1RedeemSeatRecovery`) still lack the platform invocation
binding that lets requests reach their application Auth/App Check checks. Background
service invocation, queue enqueue/OIDC, build storage/repository access and replacement
of automatic Editor grants with scoped roles also remain pending. No changes from the
blocked IAM command were applied. See [Backend's staging review](https://github.com/Amirkianfar66/GameN/pull/55).

Before describing this link as playable, complete and read back the approved IAM plan,
then verify host creation, player admission, display isolation, an accepted command,
reload/reconciliation, recovery denial and a real unattended deadline delivered to the
private task handler. No hosted match, complete hosted game, phone session or human
playtest has been accepted. The existing 45-minute full-match evidence belongs to the
local emulator client at the pinned Frontend commit, not this cloud deployment.

The hosted lobby still leaves its initial "Connecting to the playtest…" line above the
signed-in controls; this is a presentation issue, not evidence of failed sign-in. Keep
G17 (missing Supplier resolved-grant disclosure), final Designer integration, host-only
identity recovery and human playtesting visible as preview limitations. Contracts,
protocol 2 and approved V1 rules are unchanged. Publication does not approve merging
the implementation stack or establish complete V1 acceptance.

Use explicit project and account flags for cloud operations and preserve the emulator
default. `dist/backend/firebase.json` owns Functions and copied Rules/indexes;
`dist/firebase-hosting.json` owns the static site. Later documentation-only commits do
not change the immutable application release pin recorded above.

[Open the staging Firebase project](https://console.firebase.google.com/project/gamen-mothership-staging/overview).
