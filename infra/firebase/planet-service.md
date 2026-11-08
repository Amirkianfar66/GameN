# Planet service Firebase adapter

The protocol-3 adapter runs the recorded `planet-game-1.1.0` engine through the authenticated `planetApi` operation endpoint. It does not alter the gameplay tuple, historical match pins or V1 release configuration. Full state, receipts, admission bindings, journals and outbox records use the server-only `planetDocuments` and `planetChunks` collections. The existing catch-all Firestore rule denies every direct client read and write to these collections. Audience data is composed by the service after Firebase Auth verification on every HTTP read.

`planet-production.ts` is an isolated artifact entrypoint. Its exports are `planetApi`, `planetDeadlineTask`, `planetDispatchDeadline`, `planetRepairDeadlines` and `planetRunBots`. Integration's standalone artifact must narrow the service/engine indexes to the explicit Planet exports below. `index.ts` also registers these functions for the development Emulator Suite, without registering a second `onInit` callback.

## Configuration

Before any Admin SDK initialization, the existing exact project, loopback Emulator Suite and origin validation is applied. Planet has three independent creation settings:

- `MOTHERSHIP_PLANET_CREATION_ENABLED=true` enables new matches. Default is false. Invalid values fail startup.
- `MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.6.0` selects the approved candidate artwork for newly created matches. Production requires an explicit valid asset identity; historical sessions retain their saved identity. The emulator alone defaults to `0.0.0-no-assets`.
- `MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=2` selects the R17 boarding flow for new sessions only. Unset or `1` preserves historical setup; unsupported values fail startup. Deploy capable code to every worker before selecting `2` on the API. See the R17 release/rollback section below.

Use the existing `MOTHERSHIP_ALLOWED_ORIGINS` canonical HTTPS allowlist in production. The endpoint verifies revoked Firebase ID tokens and App Check. App Check bypass is available only after the complete exact loopback `demo-mothership` environment guard succeeds. Caller UID is obtained from Auth and never accepted from JSON. Requests are strict shared operation envelopes, JSON POST only, up to 16,384 raw bytes; responses use `no-store, private`. There is no player-facing task callback.

## Private workers

`planetDeadlineTask` has `invoker: private`, stable hashed task IDs, exact `{matchId, phaseId, deadlineToken, kind}` payloads and absolute schedule times. Duplicate accepted enqueue IDs acknowledge safely. Early delivery throws for retry; stale delivery acknowledges. Worker errors use generic messages. Ten attempts use 1–60 second retry backoff with at most ten simultaneous task dispatches.

`planetDispatchDeadline` observes newly created server-only metadata with namespace `deadline`, validates the private outbox reference and asks the service to dispatch it. `planetRepairDeadlines` evaluates a bounded pending page each minute, including lost/overdue tasks. `planetRunBots` observes session authority writes and invokes the private transactional bot method; an unchanged bot pass must not rewrite the session. Timer selection remains the engine's `planetDeadlineAt` helper, including Blackout's first five-second boundary. No client clock or animation controls advancement.

Before separately authorized deployment, Integration must review the existing service identities and supply only the necessary permissions: the runtime enqueues the regional `planetDeadlineTask` Cloud Tasks queue, its task identity can invoke that private function, Firestore/Eventarc can deliver the two server-only triggers, and Cloud Scheduler can invoke the repair worker. The runtime requires its existing Firestore authority access and Auth/App Check verification capability. This change creates no IAM policy, queue, scheduler, deployment or project configuration.

## Packaging handoff

The existing root `scripts/package-backend.mjs` is V1-only and does not package these endpoints. Integration owns its extension or a separate Planet artifact. Required changes are concrete:

- Firebase artifact main: `dist/planet-production.js`; include compiled `planet-production`, `planet`, `planet-runtime` and `runtime` modules/declarations.
- The game-api package includes `planet-game`, `planet-store` and `planet-engine` plus an explicit index exporting the production Planet factory, store and required types. Its engine dependency must include all `planet-game/` modules and their explicit public exports, instead of only `full-game/`.
- Required engine runtime exports are `createPlanetGame`, `applyPlanetCommand`, `advancePlanetDeadline`, `planetDeadlineAt`, `abortPlanetGame`, `projectPlanetPublic`, `projectPlanetPlayer` and `assertPlanetGameState`. Include `encodePlanetGameState`/`decodePlanetGameState` for saved-state tooling. Planet lifecycle also imports the pure `full-game/votes.js` tally helpers; retaining that file does not enable the legacy runtime. Required service runtime exports are `createProductionPlanetService` and `createFirestorePlanetStore`; include `createPlanetService`/`choosePlanetBotCommand` only when the artifact's validation tooling uses them.
- Preserve standalone tarball installation, source/credential/fixture exclusion, exact lockfile reuse and fresh artifact hashes. Isolated discovery must assert only the five Planet endpoint exports and the private task invoker metadata.
- Add `infra/firebase/test-emulator/planet-functions.test.mjs` to `httpSuites` in `scripts/test-emulator.mjs`; otherwise automatic discovery classifies it as a data-only test. Run data tests with Auth/Firestore alone, and Functions tests in a fresh suite because real triggers cannot process fixtures with injected clocks.

## Verification

`planet-http.test.mjs`, `planet-runtime.test.mjs` and `planet-tasks.test.mjs` cover Auth/App Check, strict caller binding, origins, input limits, safe errors, private task validation, retry/duplicate behavior, repair failure and isolated SDK metadata. The actual Functions emulator suite observes both real 30-second setup windows, 7/8/9 bot launch, requester-bound display admission, audience denial and automatic private Tasks/Firestore execution. Record the executed counts and limitations in the Backend handoff; emulator acceptance does not prove deployed IAM, App Check attestation, physical device behavior or live multiplayer.

Executed on 6 November 2026 with Node 22.21.1, npm 10.9.4 and Java 21.0.13:

- Firebase build passed.
- All 133 Firebase unit/regression tests passed, including the 14 new Planet cases; zero failed/skipped (1,170.954ms).
- The fresh real-time Functions suite passed both cases; zero failed/skipped (84,698.765ms). All three player counts automatically reached the real engine and accepted bot commands. Early local task delivery was rejected for retry and never shortened either setup window.

The separate first service Auth/Firestore run passed six of seven cases; one nine-player concurrent duplicate command returned `UNAVAILABLE` while its partner succeeded. The service owner is investigating that transaction failure separately; the Functions result does not resolve it. No standalone Planet package install or deployed IAM test was run here.

## Versioned boarding setup flow (R17)

`MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=2` selects the separately versioned boarding flow for **newly created** Planet sessions. Unset or `1` retains the historical flow and its omitted version field; any other value fails runtime initialization. This setting does not enable creation or select artwork. `MOTHERSHIP_PLANET_CREATION_ENABLED` and `MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION` retain their independent meanings. A saved session's creation-pinned `setupFlowVersion` controls its later processing even if the worker's current setting changes.

All five existing Functions must run code that understands saved flow 2 before Integration enables it on `planetApi`; only the API's creation setting needs to be `2`. Workers can retain legacy creation defaults while processing saved flow-2 sessions. No new endpoint, queue, task payload kind, gameplay phase, artwork manifest or IAM role is introduced. Existing setup outbox records carry the boarding identity, private token and scheduled end. Their immutable identity, retry, stale refusal and repair behavior continue through the same private workers.

The actual Functions acceptance file remains `test-emulator/planet-functions.test.mjs`. The normal root emulator runner does not set the new flow switch, so its existing acceptance remains a legacy regression. Run the same file in a separate fresh, fully guarded Functions suite with `MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=2` to exercise the real 30000ms selection, 30000ms minimum reading and 10000ms boarding intervals for 7/8/9 all-bot sessions. It asserts no game state or private role projection during boarding, identical admitted display timing/roster, one recorded stage/initialization, an ordinary setup outbox record and a fresh full 15000ms PRE_TURN after automatic initialization. It makes no manual advance/bot calls and does not inject service time. Recorded test results belong in the Backend verification handoff; this paragraph does not claim a run occurred.

Run from the repository root with the pinned Node/npm and Java 21 available (the emulator command is local and uses only the guarded demo project):

```sh
MOTHERSHIP_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5101 \
MOTHERSHIP_PLANET_CREATION_ENABLED=true \
MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.6.0 \
MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=2 \
node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec \
  --config infra/firebase/firebase.json --project demo-mothership \
  --only auth,firestore,functions \
  "node --test --test-concurrency=1 infra/firebase/test-emulator/planet-functions.test.mjs"
```

For a later authorized release, Integration must publish the compatible consumer and deploy saved-flow-capable code to every worker before selecting flow 2 for new creation. Capture existing environment/revision identities, retain both setup consumers and historical artwork, and read back the private queue/task grants after final deployment. Rollback selects `MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=1` or unsets that flow setting on the API; it must not relabel or migrate sessions already pinned to 2. Those sessions still need capable workers and their corresponding consumer until they end. Aborting and recovering a session remain normal authorized operations and never restart or shorten boarding. Client Skip, completion, load and tab callbacks grant no authority.

### R17 local acceptance evidence, 8 November 2026

With the pinned Node 22.21.1/npm 10.9.4 toolchain and Java 21.0.13:

- Build passed.
- All **135 Firebase unit/regression tests passed**, including the two new creation-flow configuration cases; zero failed/skipped (1,338.56075ms).
- A fresh Auth/Firestore/Functions/Tasks suite with explicit flow `2` passed **2/2 cases**, zero failed/cancelled/skipped/todo (101,616.873167ms). All three roster sizes automatically traversed selection, minimum reading, boarding and initialization. Shared timing/roster matched, authority remained uninitialized during boarding, one stage/initialization was recorded, and the existing PRE_TURN received its full 15 seconds.
- A separate fresh suite with explicit flow `1` passed **2/2 cases**, zero failed/cancelled/skipped/todo (86,272.890458ms). Saved version fields remained omitted and no boarding record was introduced.

Both suite processes exited successfully and all local emulators shut down. Early task delivery was refused for retry. Outstanding task requests logged connection refusal only during emulator shutdown after acceptance finished. No client manually advanced a stage or ran bots, no service clock was injected, and no cloud resource or IAM setting changed. These results do not establish live IAM, hosted consumer acceptance, physical-phone performance or human readiness/balance.

Compiled service bytes stayed constant through both real-time suites: `planet-game.js` SHA-256 `a4ef2c85ff41ecd5993a95f809457c011d221bbd6f91a0e82dce1bbbfb054771`; contracts `planet-service.js` `49f71e46a7e6510727da31ed4676f6d0a0325dcc1c408090e9241166cb8cec75`; runtime `planet-runtime.js` `7af7c4c55dad8cfbf6dd35618481d91e38aa408a1c775ba28d2dbce133ae0eec`. The verification document records the final committed source identity.
