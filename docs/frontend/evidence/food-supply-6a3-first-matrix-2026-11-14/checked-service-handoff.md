# Normal candidate service handoff

Slot RETURNED to Integration at Saturday, 14 November 2026 at 15:23:16 CET (2026-11-14T14:23:16.523Z). Frontend's actual matrix still requires Integration authorization; no match was created here.

Exact clean source: 6a3bee398be7b433c0cce634fdfd4e2449243069
Path: /private/tmp/gamen-backend-detached-heartbeat
Project: demo-mothership. Protocol3 / planet-game-1.4.0 / in-person-planet-food-task-2026-11-12. Authority SHA256 7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333. Local creation profile food-task-1.4, setup3, artdesign-0.9.0. Default Date.now clock; no observer/preload/timing override, injected state, manual advancement or source modification.

Expected endpoint: http://127.0.0.1:5101/demo-mothership/us-central1/planetApi
Allowed local origins: http://localhost:5173 and http://127.0.0.1:5173.

Persistent temporary job: com.gamen.local-6a3-native-20261114-01. Auth/Functions PID/PGID38874, started15:19:30 CET. Firestore remains original Java PID/PGID95247, started06:04:30 CET. Lifetimes: lifetimes-final.txt. The job is left running independently of this chat terminal; no login-start plist was installed.

Readiness repeated from 2026-11-14T14:20:44.773Z through 2026-11-14T14:23:16.523Z: Auth9199 HTTP200; Firestore8180 HTTP200; normal planetApi HTTP401/UNAUTHENTICATED with plausible current server time. planetApi, planetDispatchDeadline, planetRunBots and planetDeadlineTask initialized; ordinary Planet deadline queue created. Eventarc9299/Tasks9499 listen under the new launcher.

Controlled replacement: old job com.gamen.local-d5-final-20261114-01 removed; all20 captured old owned processes stopped before candidate startup. No old/new worker overlap. Firestore was never stopped/reset/exported/imported; its loaded rules/indexes match the candidate files. Old d5 checkout/build remain clean with all14 recorded hashes unchanged; old logs retained and failed final7 packet SHA256 unchanged.

Auth was restarted because Auth/Functions share one CLI process. Use normal new identities for the later matrix. No old credentials or accounts were reconstructed. Auth/Tasks companion in-memory state is fresh; persisted Firestore data is unchanged.

Launcher: /private/tmp/gamen-6a3-service-handoff-20261114-01/launch-candidate.cjs
Launcher SHA256: 6eecab39502dd2be2481be742da014ddbf131a1913c476403ed52a28d97990da
Logs: service.out.log and service.err.log in this directory; private permissions. No source/build/install/test/match/observer was performed for this launch.

Startup limitations: the pinned CLI uses the previously reviewed non-owning registry adapter to attach existing Firestore. Scheduled planetRepairDeadlines is ignored because Pub/Sub is absent from the unchanged local config; ordinary deadline/bot/task initialization is observed. No obsolete-key/duplicate-trigger error was observed during readiness, but registration history in preserved Firestore and unique trigger delivery are not established without a normal run. Readiness is not gameplay acceptance. Job lifetime ends on explicit shutdown, logout or process/OS failure.

## Exact source hashes

| Path | SHA256 |
| --- | --- |
| services/game-api/src/planet-game.ts | `81b5c87c5103299c0e650405515a00dceab4d32d32103476f3ccfe023089d6c4` |
| services/game-api/src/planet-food-service.ts | `49d616da59cac664f5a874b2a0f96b10409004fea91e04669a618b0b05975bf6` |
| services/game-api/src/index.ts | `d9e253b11862be681d837b618ebc554706726a39693ed58310826e3151469d0e` |
| infra/firebase/src/planet.ts | `caee46b585651a9aa826e3b5f01108623937eafda44693443a1486804262b222` |
| services/game-api/src/planet-store.ts | `f95f413410c189b64f4262beacc352efaf43b10f158a9ff841390001e5499b3c` |
| services/game-api/src/food-bot-policy.ts | `23bd931b9d0a6d1b7432646468b80a1b73f9a6f7a2a006bf875e40d19bbc062b` |
| infra/firebase/src/index.ts | `aa47364d24e15d9312bdc2da3efc7e48a78ab1a23828f9b04e4ec361db9827c1` |
| infra/firebase/src/planet-runtime.ts | `a9b35f2d21d3d6a506ee7b3e566d743dfad19b5ca13daebeef7d5bfa9ce08405` |
| infra/firebase/src/planet-production.ts | `aa82db8f6051bef2911e22e7e65dc44750ab19d1ce4bf0c7906194cdbb6452f4` |
| packages/engine/src/planet-game/food.ts | `0f1eabf6b5beefdb1d46d666fe790e6735a45c1e074394260f1e38e3c62d25dd` |
| packages/engine/src/planet-game/food-machine.ts | `099197b1984deb06c46fd23cd250af8d7464fb4733881918f5b53055e8c9a512` |
| packages/engine/src/planet-game/food-meals.ts | `b079aef6b62bd2e227f968e0b9bb0db7ddff950da11194a93e2eb06396d2f2a2` |

## Exact compiled hashes

| Path | SHA256 |
| --- | --- |
| services/game-api/dist/planet-game.js | `b734cee0c5aa4d4c4c23ba73eb0287b6cc3721a5b396cbd67cf0eaaf04662560` |
| services/game-api/dist/planet-store.js | `e7cca7d56519b0c025fc4ff996174de73afdfb9c03251d8e5302e4c03abbaf11` |
| services/game-api/dist/planet-food-service.js | `a5ee1953bfd73734a5fe60788f99fbf5fbcbe9e24a8247a1242219cfc9d49205` |
| services/game-api/dist/planet-persistence-errors.js | `5b5e4a6762fb0406fd035c256c98c42a0f53010fb0236b01dcda7758d50e464e` |
| services/game-api/dist/food-bot-policy.js | `93f373ddfc9471798b2aaa6654fa06b359a6a67299fef150b926933ea0411e8f` |
| infra/firebase/dist/planet.js | `a2fdd2d2a8f57e94389c4e672eb474adcfd7d9b132761e1763ce397174f54ad0` |
| infra/firebase/dist/runtime.js | `fb831199790b103769d3eab1ca8f448907a2ffbaf241519a9f638a0d22e804e0` |
| packages/engine/dist/planet-game/food.js | `53d579ef3b2c7ff9c455582a5c5d735ec3998bb0e6ad9ad218c006546e24130f` |
| packages/engine/dist/planet-game/food-machine.js | `2bdec5120284585b571f88f5a0c0b3979015676fc87ff4157a1344ec4af7cf8e` |
| packages/engine/dist/planet-game/food-meals.js | `2eaf4222198f48b1f51ded0851ea416890d543751c8c282bba72c02e48111de3` |
| infra/firebase/dist/index.js | `687d08ae0e47e73d56aaa54da46e124074f332eca257c5384355553163c952d7` |
| infra/firebase/dist/planet-runtime.js | `596fcb451edaf2ff20475314b7648f5c1175360e5183aa1ade206797df4ce4cd` |
| infra/firebase/dist/planet-production.js | `f6389996047952707f7f5046a6ffd0a190283f2726bc0df3d660d35931531cb5` |
| services/game-api/dist/index.js | `af5ea2738261fd248c5b62cf6194cc679fb3c1075ee519d72db4bb442ff49976` |

All71 source files and71 compiled JavaScript files in the four runtime workspaces are enumerated in identity-before.json and were rechecked unchanged after startup. Exact final readiness, identity, preservation and limitations: readiness-final.json.
