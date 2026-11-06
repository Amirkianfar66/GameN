# Planet service verification — 6 November 2026

Clean actual start: `97a4c0ec83bb8113f4ca87610acbdce5a133c6fc`, branch `codex/backend-planet-engine`. Work is confined to Backend service, Firebase, service-contract additions and their tests/docs. Root Integration's draft was read/copied and its worktree preserved.

## Reviewable commits

| Commit | Change |
| --- | --- |
| `7528d54538ffaa960094624de1122877f47975a9` | Required requester-bound admission standing, denied/display audience guards and three initial contract cases |
| `6c025628235c48e557b92e6e0b5c19b0435622e3` | Typed recovery match/seat response and fourth contract case |
| `9f4af216fbe78efd47750203c152c130afba9ab3` | Real-engine transactional service, durable chunk store, private bot orchestration, replay/recovery/deadline tests |
| `74c9cb7e3eade8953a4d34c708567da41bd439f4` | Authenticated Firebase API, private workers, runtime, emulator tests and packaging/configuration handoff |
| `b2775b3117c7219ebaa6b226b8065fa2133fb8b2` | Six original Planet 1.0.0/1.0.1 saved-tuple service regressions |

Tested runtime source is the tree at `74c9cb7e3eade8953a4d34c708567da41bd439f4`. `b2775b31` only records an already tested historical test file; it changes no runtime. This verification document is a subsequent documentation-only commit. Integration owns combining these commits and the final PR/release; no service PR was opened from this worktree.

## Actual local results

Node `22.21.1`, npm `10.9.4`, existing installed dependencies; a fresh `npm ci` was not run. Java 21 was used for the loopback `demo-mothership` Emulator Suite. All reported passing runs have zero failures, skips, cancellations or todos.

| Verification | Actual result |
| --- | --- |
| `npm run build` | Passed |
| `npm run typecheck` | Passed, pure and browser programs |
| `npm run test:backend` | **311/311 passed**, 20396.114459ms |
| `node --test tests/bootstrap/*contract*.test.mjs` | **145/145 passed**, 620.101042ms |
| New real-engine service unit/privacy/replay/compatibility cases | **40/40 passed**, 34206.390875ms |
| Auth/Firestore emulator, both `services/game-api/test-emulator/planet-*.test.mjs` files | **13/13 passed**, 49209.832333ms |
| Three additional nine-player duplicate-command contention repetitions | **3/3 passed**, approximately 6–7 seconds each |
| Firebase unit/regression tests | **133/133 passed**, includes 14 new HTTP/runtime/private-worker cases |
| Real Auth/Firestore/Functions/Tasks, `infra/firebase/test-emulator/planet-functions.test.mjs` | **2/2 passed** in the final committed-runtime rerun, 84811.334459ms (initial run also passed) |
| Toolchain and immutable source-integrity checks | Passed |
| `npm run check:workspace` | **Failed** on the intentional new server-only `services/game-api -> node:buffer` import; Integration owns and has prepared the reviewed root allowlist update |

The two real Functions cases use actual authenticated HTTP, automatic private Firestore/Tasks triggers and all three player counts in parallel. They observe both real 30000ms setup windows and native bot commands without a manual advance/bot call, injected service clock or private-state mutation. The service data cases separately use injected time with genuine Firestore transactions, including persisted native P27/P28 controls.

The final 40 service cases cover setup/Ready and durable character identity, pending/closed/display denial, recovery and old-UID revocation, original receipt reconciliation, accepted and rejected command retries, actor-scoped IDs, original request standing, saved-art configuration changes, cross-match corruption refusal, retry-stable recorded setup randomness, abort replay, creation-disable retry, repair backoff and canonical exact engine replay. Seven/eight/nine all-bot histories reproduce the old same-batch Hack declaration identity failure and now replay full authority plus every audience exactly. The original Planet 1.0.0/1.0.1 cases use explicitly pinned original constructors, not relabelled successor state.

P27/P28 cases persist native whole-world histories, selected costs/private patient feedback, actual six-second Sync presentation, delayed full sixty-second vote opening, fixed navigation timing and immutable deadline metadata after a private Officer choice. They explicitly distinguish Meet evaluation at vote opening from Jail Promise evaluation at vote closure. No new common voting-start Promise checkpoint is assumed.

## Failure history and practical limits

The first data emulator run passed six of seven cases. Concurrent nine-player submission of an identical `PASS_TURN` returned one accepted response and one `UNAVAILABLE`. Its underlying exception was swallowed by the draft's generic error boundary, so the exact cause was not recovered. A diagnostic wrapper now reports only exception code/message in the synthetic test if it recurs. A fresh seven-case run, two complete thirteen-case runs and three focused nine-player repetitions passed with the original strict duplicate-response assertion. This transient remains unexplained; it is not presented as a proven fixed defect. The supported uncertain-response path is independently tested: look up the durable receipt or retry the identical command, never invent a replacement ID.

Initial P28 display-control tests attempted admission after setup had closed; those three fixtures were corrected to request/admit the display in the lobby. Gameplay/authorization expectations were not relaxed. An independent audit reproduced the draft's bot transition-identity failure against the real engine before the fix and confirmed corrected 7/8/9 histories afterward.

Root isolated packaging/install/discovery, Frontend consumer review, human Balance signoff, combined browser/device multiplayer, production App Check attestation, live IAM/queue/scheduler behavior, load/soak and cloud deployment were **not run in this Backend worktree**. The complete legacy engine suite and long capacity playouts were not rerun because engine/rules/capacity code is unchanged; prior engine evidence is documented separately and is not counted as this service run. `npm run verify` is not claimed to pass: the local root allowlist and Planet Functions-suite discovery update remain Integration dependencies.

New-creation gameplay pins remain protocol 3 / `planet-game-1.1.0` / `in-person-planet-private-feedback-2026-11-06`, hash `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa`. New artwork is configurable for Integration's approved `design-0.6.0`; historical matches retain their recorded tuple/art. No cloud, IAM, access, asset publication or deployment change was performed.

Final real-Functions run used the committed runtime source above. Compiled `planet-game.js` SHA-256 was `ebead170e417729aad8aa2a020e570bdf2b8fcabfdb51af9b9e24a54e5918b03`; `planet-store.js` was `238831fb916f415af9cb1b49bb4e583b4ded64fb755efe7d98e46a44d1fe83db`. All emulators shut down successfully.

See [implementation and replay details](planet-service-implementation.md) and [the exact Firebase exports/configuration/packaging handoff](../../infra/firebase/planet-service.md).
