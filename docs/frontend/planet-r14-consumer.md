# Requester-bound Planet admission consumer

The R14 consumer accepts an admitted display only when the authenticated read confirms its original match, room code, request ID and `display` kind. Pending, closed, declined, unavailable and mismatched reads expose no roster, role, gameplay projection or game transport. An admitted player additionally requires its assigned seat. The original request context remains UID-bound through approval and reload; a lost admitted view does not become a new pending request.

Recovery consumes the strict `{matchId, seatId}` result, checks the requested match and the next authorized snapshot's seat, and clears the old admission context only after the verified result. Recovery secrets remain in memory. This follows the separate Match ID/recovery-code presentation change at `4333fa7cb39882969d0378650c50735ccb4c7797`.

The base is `9508fa33d88a54d1e51ceee01483df1ecae0d2cf`. Integration's shared admission commit `7528d54538ffaa960094624de1122877f47975a9` was adopted as `fd30bf00e72907ccc9ad4afc2f2b09020d8d348c`; shared recovery schema `6c025628235c48e557b92e6e0b5c19b0435622e3` was adopted as `9508fa33d88a54d1e51ceee01483df1ecae0d2cf`. The rule tuple remains protocol 3 / `planet-game-1.1.0` / `in-person-planet-private-feedback-2026-11-06` / `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa` / `design-0.6.0`. There is no engine, service, game rule, approval-manifest or artwork-byte change.

## Verification

- `npm run test:frontend`: 860 passed (216 presentation, 644 game); zero failed, skipped or cancelled. Loopback test servers require local network permission.
- `npm run typecheck`, `npm run check:workspace`, `npm run check:sources`: passed.
- The five selected bootstrap contract files passed 48 tests, including R14 and typed recovery.
- `npm run test:contracts`: 26 passed. These overlap the selected contract checks and are not an additional 26 unique tests.
- Together these commands cover 53 distinct passing contract checks (21 overlap).
- Production build, production exclusion, exact art provenance and `git diff --check`: passed. The scan found 75 reachable package modules, 252 shipped/source files and 86 labeled development files; no development or emulator code was reachable from production.

The refreshed browser evidence contains **288 synthetic cases, 12 interaction flows and 246 screenshots**, all passing with zero runtime exceptions. Every matrix uses the native consumer in desktop Chromium phone emulation at 320×568 and 390×844 with normal/reduced motion. Independent synthetic scenarios clear public resume context between cases; admission/reload cases deliberately preserve the exact request and UID context.

| Matrix | Cases | Flows | Facts |
| --- | ---: | ---: | --- |
| R14 admission and recovery boundaries | 32 | 0 | [facts](evidence/planet-r14-admission/facts.json) |
| Existing consumer corrections | 16 | 0 | [facts](evidence/planet-r14-consumer/facts.json) |
| Current private feedback and art contracts | 40 | 0 | [facts](evidence/planet-r14-contract/facts.json) |
| All eight library groups and current Rescue figures | 52 | 0 | [facts](evidence/planet-r14-library/facts.json) |
| Cinematic safety | 16 | 0 | [facts](evidence/planet-r14-safety/facts.json) |
| P27 presentation/deadline/foreground behavior | 24 | 0 | [facts](evidence/planet-r14-p27/facts.json) |
| Native shell and interactions | 100 | 12 | [facts](evidence/planet-r14-shell/facts.json) |
| Recovery-code presentation | 8 | 0 | [facts](evidence/planet-r14-recovery/facts.json) |

The R14 matrix covers pending reload, unavailable reads, wrong request/kind, admitted display and reload, closed/declined requests, admitted player, recovery/context clearing/UID changes, and an admitted player with no seat. Existing media, keep-clear, stable Rescue target/name, reduced-motion and concealment checks remain passing. The browser driver releases its owned stderr/child handles after stopping Chromium so its detached crash reporter cannot hold a completed capture open.

## Real service to native UI

[Nine real smoke checkpoints](evidence/planet-r14-emulator/facts.json) passed using loopback Firebase Auth, Firestore, Functions, Tasks and Eventarc with `demo-mothership`, actual `planetApi`, the native app and four isolated authenticated browser contexts. No synthetic snapshots, server-state edits, injected clock, manual `advance` or `runBots` calls were used.

- Host created a seven-seat `design-0.6.0` match. The human and display first received redacted pending standing; host approved each separately, and the display received explicit admitted `display` standing without any player view.
- Host configured six bots and began setup. The human selected `c4`, passed the actual 30-second character-selection interval and actual minimum 30-second reading interval, revealed/concealed only their own role, then pressed the enabled Ready control. The server accepted Ready; all six bots were ready automatically. Host, player and public display reached live native engine views.
- Host issued recovery with the Match ID visible beside its private code. A fourth, new UID recovered the same seat, `c4` and own role through the typed result, with the old admission context cleared. The old UID received `FORBIDDEN`; roster/private views were concealed and it did not become pending.
- Direct storage checks on all four identities found empty local storage and only public UID-bound resume identifiers in session storage. No token, role, recovery secret or raw private snapshot was persisted or included in evidence. Recovery screenshots were taken after the secret was cleared. Zero browser exceptions occurred.

The tested service checkout was clean at `82ea5aec787362dd6b66acfc4bcbae2fb64629ed`, including service implementation `9f4af216` and Firebase wiring `74c9cb7e`. Those commits were consumed through that checkout's compiled local emulator, without importing Backend changes into the Frontend branch. Node was `22.21.1`, npm `10.9.4`, Firebase CLI `15.0.0`, and the temporary official Temurin runtime was `21.0.13+9`. Functions automatically started Tasks on 9499 and Eventarc on 9299. Auth tokens stayed in module memory; the loopback entry is explicitly development-only and refuses non-loopback origins or a port other than 5173. Its build/capture path uses the shared cross-platform `resolve(tmpdir(), 'gamen-planet-emulator-preview')` default.

The smoke requested host abort during cleanup, disposed all clients, and closed the preview. The emulator process then stopped. [Port evidence](evidence/planet-r14-emulator/stopped-ports.json) confirms **4500, 4600, 5101, 5173, 8180, 9199, 9299 and 9499 were free at 2026-11-06 14:17:04 UTC**. No Frontend emulator or preview service is left active.

This is local service/consumer evidence with emulator App Check bypass. Hosted policy and production attestation, real devices, Safari, accessibility/performance acceptance, multiplayer correctness and human social-deduction balance remain separate checks. No deployment, profile activation or cloud mutation was performed. Integration owns the final hosted media CSP validation and release.

## Consumer inventory impact

The three changed consumer hashes from this change and `4333fa7c` were verified against Integration commit `4642bf67`, whose still-unpublished central `design-0.6.0` manifest is SHA-256 `6d4d87113161fadf5bdd35f7248efde816d5300f45aa0d3787c13a192b82c9eb`:

| Source | SHA-256 |
| --- | --- |
| `apps/game/hosted/planet/app.mjs` | `977e3259184a1515fb5ccfecb25e75e3d0ff0974575fa1cb82f8c3224b291a6b` |
| `apps/game/hosted/planet/planet.css` | `d582a3c2d29be8f23892aa1e2fc57b4e606ef6975fd16a98b309c7c57522ebe3` |
| `apps/game/src/planet/session.ts` | `3d0a5ab968766ec39eecfb03702eb98996e0858fe17842461796eaadfb74edfd` |

The exact 18 approved library outputs, their source bytes, the nine historical base bundles and the approval JSON are unchanged. Approval SHA remains `9493e29a8ce1b06c6848846b0c8932d65c42abcb24b2b43aaf35ed7239aaf228`. The original Frontend proposal remains historical, unchanged at SHA `d8dbcc979067954051629f2a37ca66196a530ef61d8b1d366726366bc3b429dc`. No review video, withdrawn EJECT proposal or Designer ancestry is adopted. No shared release file was edited from the Frontend branch.

## Reproduction

From the repository root, using the reviewed shared contracts:

```sh
npm run test:frontend
npm run typecheck
npm run check:workspace
npm run check:sources
npm run test:contracts
node --test tests/bootstrap/contracts.test.mjs tests/bootstrap/full-game-contract.test.mjs tests/bootstrap/planet-contract.test.mjs tests/bootstrap/planet-private-feedback-contract.test.mjs tests/bootstrap/planet-service-contract.test.mjs
./node_modules/.bin/vite build --config apps/game/hosted/vite.config.mjs
node apps/game/scripts/check-production-exclusion.mjs --bundle dist/hosted-preview
node apps/game/scripts/check-planet-art-adoption.mjs dist/hosted-preview
./node_modules/.bin/vite build --config apps/game/dev/planet/vite.config.mjs
node apps/game/dev/planet/capture-admission.mjs docs/frontend/evidence/planet-r14-admission
node apps/game/dev/planet/capture-consumer-fixes.mjs docs/frontend/evidence/planet-r14-consumer
node apps/game/dev/planet/capture-private-feedback.mjs docs/frontend/evidence/planet-r14-contract
node apps/game/dev/planet/capture-library.mjs docs/frontend/evidence/planet-r14-library
node apps/game/dev/planet/capture-review-safety.mjs docs/frontend/evidence/planet-r14-safety
node apps/game/dev/planet/capture-stage.mjs docs/frontend/evidence/planet-r14-p27
node apps/game/dev/planet/capture.mjs docs/frontend/evidence/planet-r14-shell
node apps/game/dev/planet/capture-recovery-presentation.mjs docs/frontend/evidence/planet-r14-recovery
```

For the real smoke, build the reviewed Backend checkout first. The actual run used a temporary `/private/tmp/gamen-native-emulator/firebase.json` with its Functions source pointing relatively to that checkout's `infra/firebase`, its Firestore rules/indexes unchanged, and loopback Auth 9199, Firestore 8180 and Functions 5101. Its temporary project contained no credentials or production configuration. With an available Java runtime, the launch command was:

```sh
JAVA_HOME='/private/tmp/gamen-native-java21/jdk-21.0.13+9-jre/Contents/Home' \
PATH='/private/tmp/gamen-native-java21/jdk-21.0.13+9-jre/Contents/Home/bin':"$PATH" \
MOTHERSHIP_FUNCTIONS_EMULATOR_HOST=127.0.0.1:5101 \
MOTHERSHIP_PLANET_CREATION_ENABLED=true \
MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION=design-0.6.0 \
node /private/tmp/gamen-planet-frontend/node_modules/firebase-tools/lib/bin/firebase.js \
  emulators:start --only auth,firestore,functions --project demo-mothership \
  --config /private/tmp/gamen-native-emulator/firebase.json --non-interactive
```

In another terminal after all local functions initialize:

```sh
./node_modules/.bin/vite build --config apps/game/dev/planet-emulator/vite.config.mjs
node apps/game/dev/planet-emulator/capture.mjs docs/frontend/evidence/planet-r14-emulator
```

Stop the emulator with Ctrl-C and verify its reserved ports are closed. [The verification manifest](planet-r14-verification.json) records exact source, production-output and evidence hashes. The local evidence cannot substitute for Integration's clean-tree, hosted policy or release gates.
