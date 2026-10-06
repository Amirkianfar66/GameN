# In-person V1 backend runtime and deployment handoff

The V1 backend runs the owner-approved 7/8/9-player base game for players physically together. It uses wire protocol 2 and the separately pinned in-person V1 rule manifest. Full remote play remains V2. The workspace retains the historical protocol-1 Officer/Protection checkpoint for its reviewed regression fixtures. The production artifact contains only protocol-2 Functions and the complete-game engine/service; it excludes the historical fixture completion adapter and legacy HTTP exports. Original Powers are off.

This repository prepares a standalone Firebase backend artifact and local acceptance checks. No cloud project, service account, queue, scheduler, IAM permission, deployment, or billable resource was created by this work. Frontend integration, the real asset manifest, target-project configuration and device/human play acceptance remain release gates.

## Client endpoints

All client operations are JSON `POST` requests to second-generation Cloud Functions in `us-central1`. Every operation derives the caller UID from a verified Firebase Auth ID token. Production also requires a verified `X-Firebase-AppCheck` token. The body cannot assign an actor or grant host authority. Requests are limited to 4,096 bytes; bearer and App Check headers to 8,192 characters. Responses are private and must not be cached.

| Export | Service operation | Purpose |
| --- | --- | --- |
| `v1CreateMatch` | `createMatch` | Create a 7/8/9-player lobby; caller owns its host capability |
| `v1RequestAdmission` | `requestAdmission` | Request a seat using the room code and Room A/B starting room |
| `v1ApproveAdmission` | `approveAdmission` | Host approves a pending identity into a specific vacant seat |
| `v1AdmitDisplay` | `admitDisplay` | Host admits an Auth UID for public tabletop projections |
| `v1StartMatch` | `startMatch` | Host starts a fully admitted roster with server-generated roles/code/order |
| `v1Command` | `submit` | Register a protocol-2 game command using a stable command ID |
| `v1Receipt` | `lookup` | Recover the caller's own receipt after a lost response |
| `v1Advance` | `advance` | An admitted client requests evaluation of the current phase after its deadline |
| `v1ServerTime` | `serverTime` | Read authoritative server time as an admitted participant |
| `v1AbortMatch` | `abortMatch` | Host terminates the match without declaring a winner |
| `v1IssueSeatRecovery` | `issueSeatRecovery` | Host issues a short-lived, single-use seat recovery token |
| `v1RedeemSeatRecovery` | `redeemSeatRecovery` | Transfer a seat to the verified replacement identity |

Payloads are strict: use `protocolVersion: 2`; lifecycle requests include a stable `requestId`, command requests use `FullCommandRequestSchema`. HTTP success can contain an accepted or rejected gameplay receipt; inspect its status. The host capability is independent of display/player membership. A host can occupy a player seat only through the same admission process.

The exported strict request/response schemas live in `packages/contracts/src/v1-service.ts`. These synthetic examples contain no real match data:

```json
{"protocolVersion":2,"requestId":"create-001","playerCount":7}
```

Send that body to `v1CreateMatch`; its successful `result` contains `matchId`, `roomCode`, `playerCount` and `status: "lobby"`. A player's `v1RequestAdmission` body is `{ "protocolVersion": 2, "requestId": "admission-001", "roomCode": "0123456789AB", "initialRoom": "Room A" }`. The host approves its returned `admissionId` with `{ "protocolVersion": 2, "matchId": "example-match", "requestId": "approve-001", "admissionId": "example-admission", "seatId": "seat-1" }`. Display admission uses the same operation context plus `displayUid`; start/abort use only that context. Use actual server-returned identifiers when integrating.

A gameplay intent and its neutral accepted receipt are:

```json
{"protocolVersion":2,"matchId":"example-match","phaseId":"neutral-phase-1","commandId":"move-001","command":{"type":"MOVE","destination":"Room B"}}
```

```json
{"ok":true,"serverTimeMs":1800000000000,"receipt":{"protocolVersion":2,"matchId":"example-match","phaseId":"neutral-phase-1","commandId":"move-001","status":"accepted","code":"REGISTERED"}}
```

For `v1Receipt`, send protocol/match/command IDs; `v1Advance` takes protocol/match/phase IDs; `v1ServerTime` takes protocol/match IDs. Recovery issuance takes operation context plus `seatId`; redemption takes operation context plus the exact one-time `recoveryToken` from the host. Never put that token in a display URL, log or public event.

Persist each command ID with its original payload before sending. Retry the identical request or look up its own receipt after a lost response. IDs belong to the seat for the entire match; reusing an ID with a different payload returns a conflict, including across phases or identity recovery. Operation request IDs similarly deduplicate caller-specific lifecycle changes. A recovery-issuance replay deliberately returns a null token; the host must issue a new request if the original secret response is lost. Use server time and snapshot `phase.endsAt` for display; animation completion is never a transition trigger. A rate-limit failure includes retry delay, while backend unavailability remains retryable. Do not infer roles or effect causes from a registration receipt.

The host reads `control/session` and admission requests, which contain administrative lobby facts and no hidden role/code setup. Public/display clients read `lobby/public`, `views/public`, and public audience events. Active players read their own UID projection and seat-scoped events. Direct client writes are denied everywhere.

## Configuration before SDK initialization

`assertRuntimeEnvironment` executes before the Firebase Admin SDK initializes. Function discovery registers metadata without initializing Admin; the supported Functions `onInit` callback validates and initializes the runtime on first invocation. The same lazy context backs HTTP, task, trigger and scheduled handlers. Production needs one unambiguous project ID from the runtime's `GCLOUD_PROJECT`, `GCP_PROJECT` and inline JSON `FIREBASE_CONFIG`; supplied values must agree. A file-path `FIREBASE_CONFIG` is deliberately rejected. Production must also set:

- `MOTHERSHIP_ASSET_MANIFEST_VERSION`: a 1–128 character identifier beginning with an ASCII letter/digit and otherwise containing letters, digits, dots, underscores or hyphens, identifying the reviewed asset manifest. The local placeholder `0.0.0-no-assets` is rejected in production. This is a configuration pin; it does not create or verify real design assets.
- `MOTHERSHIP_ALLOWED_ORIGINS`: an optional JSON array of at most 16 unique, exact canonical HTTPS origins. No paths, wildcards or credentials are accepted. The production default is empty: requests carrying any browser `Origin` are denied until their exact origin is configured. Requests without `Origin` still require Auth and App Check.

Do not copy demo environment variables into a deployed runtime. The presence of any emulator environment variable requires the complete local `demo-mothership` suite: Auth 9199, Firestore 8180, Functions 5101, and `FUNCTIONS_EMULATOR=true`. Every host must be loopback. Only the Firebase CLI's known optional Tasks 9499, Eventarc 9299, hub 4500, logging 4600 and Firestore address alias 8180 are allowed; unknown emulator variables, mixed production/demo project IDs and remote emulator hosts fail closed. Enqueue additionally requires the validated Tasks 9499 host in demo mode; a missing Tasks emulator leaves a retryable outbox failure instead of falling back to the cloud Tasks API.

The local default browser origins are `http://localhost:5173` and `http://127.0.0.1:5173`. Frontend sessions using another local port must explicitly configure `MOTHERSHIP_ALLOWED_ORIGINS` with their exact loopback origins before starting the suite. A local custom origin remains restricted to loopback. Demo assets default to `0.0.0-no-assets`.

## Deadlines and durable dispatch

The game transaction writes its new state, projections, journal and durable outbox intent together. Network enqueue happens outside that transaction. Client clock and phase overrides cannot advance the game early.

- `v1DispatchDeadline` reacts only to protocol-2 outbox documents and dispatches the phase's deterministic task ID. Repeated delivery and an enqueue/acknowledgement gap are safe: an already-created task is acknowledged.
- `v1DeadlineTask` is private and validates exactly `matchId`, `phaseId` and `deadlineToken`; no seed, timestamp, actor or override is accepted. It checks the current pinned state and trusted deadline. Stale/duplicate tasks are no-ops. Backend unavailability fails retryably.
- `v1RepairDeadlines` runs every minute and processes at most 100 due pending or expired-lease intents. It uses bounded backoff and durable leases; failed acknowledgement remains repairable. The next due page is eligible on later runs. The service also exposes a bounded cursor for trusted operational repair, without a public HTTP repair endpoint.

The Firestore collection-group index on outbox `protocolVersion`, `status`, `nextAttemptAt` and document name is included in the artifact. Deploy it with the matching Rules before depending on scheduled repair; a missing index is not a healthy repair runner.

The task configuration uses `us-central1`, ten attempts, 1–60-second retry backoff and at most ten concurrent dispatches. Before staging, verify the selected runtime service identity can enqueue on the intended Cloud Tasks queue and that only the configured task delivery identity can invoke the private task function. Verify Eventarc delivery, scheduler execution, required indexes and bounded repair in the target project. These actual identities and permissions are target-project setup, not values to infer from the repository. Local emulators do not prove cloud IAM or reliable deployed delivery.

## Seat recovery and Rules

A player read requires matching membership and reverse seat binding: UID, seat ID and binding revision must agree. Recovery updates both sides and removes the old identity's player membership/view. A stale membership, old UID or mismatched revision cannot read the transferred seat. The private event namespace is `p-seat-N`; it cannot collide with an Auth UID such as `public`. Its retained history is available only to the currently active binding for that seat. A display or host-only identity does not gain private knowledge.

The one-time recovery token is returned only in the original host response; request replay does not reproduce it. Keep it within the physically supervised recovery workflow and out of public projections, events and logs. The host reissues a token if the original response is lost.

## Reproducible local checks and standalone artifact

Use Node `22.21.1` and npm `10.9.4`. At the repository root:

```sh
npm ci
npm run verify
npm run test:emulator
npm run package:backend -- --verify-install
```

`package:backend -- --verify-install` builds and validates the generated `dist/backend` artifact with a clean `npm ci --omit=dev --ignore-scripts` in a temporary directory outside the monorepo. It imports contracts, engine, service and the Firebase entrypoint there, with a synthetic non-demo project ID and test asset pin. It neither deploys nor contacts a cloud Firebase project.

The artifact uses `dist/production.js` as its Firebase entrypoint and contains only production/runtime/V1 Firebase modules and their declarations. The staged service and engine indexes explicitly export the full-game implementation; they do not copy or rewrite the old fixture adapter. It contains compiled Firebase code, `npm pack` tarballs for contracts/engine/game-api, a standalone manifest and lockfile using the committed transitive resolutions/integrities, Rules, indexes and `firebase.json`. It excludes fixture exports/code, Canvas, reference sources, tests, credentials and private files. Both packed content and installed internal packages are scanned for forbidden paths, key material, forbidden fixture/reference imports and known fixture harness symbols. The isolated import also asserts legacy engine/service functions and protocol-1 HTTP exports are absent, while all 15 V1 endpoints retain SDK metadata. Installation requires the selected npm cache or registry access; it does not require sibling workspace folders. The packer can also be invoked directly with `node scripts/package-backend.mjs --verify-install` or `--out DIRECTORY`.

`backend-artifact.json` records compiled-runtime and complete-artifact SHA-256 fingerprints, the toolchain and whether isolated installation/import verification passed. Use these artifact fingerprints together with the reviewed Git commit when preparing a deployment. Generated output is not committed.

Unit checks verify transport/Auth/App Check boundaries, exact origin handling, the pre-SDK environment guard, explicit asset pins, stable task IDs and task retry failures. Emulator checks include real Auth tokens through the actual V1 Functions exports, a seven-player lobby/start/MOVE/receipt flow, refreshed-token retry, forbidden display commands, host abort, admission query privacy, direct-write denial and recovered-seat Rules. The service/engine checks separately cover full lifecycle, commands, votes, victory and durable outbox failure/replay cases.

Record exact aggregate results and the tested commit in the PR. A local artifact import is packaging evidence, and Emulator Suite results are local Firebase integration evidence. Production deployment/IAM/App Check, real device behavior, completed human games and social-deduction balance remain unverified until their separate release acceptance runs.

Actual final aggregate counts and artifact fingerprints are recorded in [V1 verification](v1-verification.md).
