# Ordinary-turn Pass backend handoff

Issue [#85](https://github.com/Amirkianfar66/GameN/issues/85). Branch `codex/backend-pass-turn`; exact deployed base `90f079d113e014a0cc0d3a337ae69b020abe1ce7`. Authority and tuple policy are in the [8 October owner decision](../decisions/2026-10-08-pass-turn.md). Historical canon/source lock and Frontend remain outside this backend change.

## Runtime and wire contract

The only new command is strict targetless `{ "type": "PASS_TURN" }` inside the existing protocol-2 `matchId`, `phaseId`, `commandId` envelope. For example: `{ "protocolVersion": 2, "matchId": "example-match", "phaseId": "ordinary-001", "commandId": "pass-001", "command": { "type": "PASS_TURN" } }`. A success remains the neutral accepted `REGISTERED` receipt with the original match/phase/command IDs; no role, Code or queued target is exposed. Invalid extra command fields fail request validation.

The pure engine requires the current active living actor's ordinary phase, exact Pass-enabled pins and trusted `startedAt <= now < endsAt`. Injury/Jail preserve eligibility. The existing ordinary deadline and Pass share the same turn-closing routine. A pending Hack opens its full separate minute; otherwise the next living ordinary speaker or normal release/vote phase begins for a fresh full minute. The next phase ID and deadline token must differ from the old values.

Pass neither enters the action queue nor spends a weapon/main action. Previously registered actions retain their targets, resource state, order and round-end resolution. The current actor's legal target map contains `PASS_TURN: [self seat ID]`; other actors, other phases, eliminated actors and legacy states get no such key. This is a capability hint, not a new public/private view field or client authority.

The service uses the existing authenticated active binding, caller-seat receipt IDs, canonical payload digest, transaction journal, projections and scheduling outbox. Receipt replay precedes fresh phase/time/rate checks after binding authorization. Repeated or lost-ack Pass delivery cannot advance twice; changed payloads under the same command ID conflict. Pass and deadline transactions serialize on the same engine state. A delivered old phase/token callback cannot advance the replacement phase; old outbox enqueue acknowledgment does not promise cancellation of an already queued task.

## Version exports and rollout

`@mothership/engine` exports `FULL_ENGINE_VERSION`, `FULL_RULESET_VERSION`, `FULL_RULESET_HASH`, `FULL_GAME_VERSION_PINS`, `LEGACY_FULL_GAME_VERSION_PINS`, `isSupportedFullGameVersions`, `passTurnEnabled` and type `FullGameplayVersions`. The current tuple is engine `full-game-1.1.0`, ruleset `in-person-v1-pass-2026-10-08`, hash `a25cec290370a3140829292b3cb8bdda3fb4402e0b529b56c6ef9692f7870183`, protocol 2. The immutable overlay references exact legacy parent hash `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`.

`createFullGame` accepts optional recorded full `versions`; validation requires an exact supported tuple and the same asset pin as its explicit asset argument. With no recorded versions it creates the new tuple. New matches pin gameplay versions at creation in denied server-only `engine/gameplayPins`; the strict host-readable `control/session` keys stay unchanged. Missing pins mean the exact legacy 1.0.1 tuple, so old lobbies/choosing stages remain legacy. Existing prepared-deal launch, journal replay, recovery, deadlines and bot processing accept either known tuple without migration or rewriting. Legacy states never advertise or accept Pass. Unsupported/mixed tuples and 1.0.0 service states remain rejected.

Practice policy accepts the two reviewed tuples while continuing to generate only its established commands, never `PASS_TURN`. It retains its current pace. Packaging's existing engine-subtree/model wildcard exports include the new helpers; no packaging allowlist change is needed.

Integration must adopt the exact new engine/ruleset/hash in root/Balance expected pins and new-match frontend expectations; retain explicit legacy compatibility fixtures. Do not rewrite historical source-lock bytes or assume the old hash alone describes new matches. Frontend/presentation owns the Pass action flow and character target selection. Backend updates to create-match, setup deal/launch, commands, deadlines, recovery and bot processing require the integrated backend release, rather than the previous two-method admission-only deployment.

## Verification record

Checks completed on 8 October 2026 with Node 22.21.1 / npm 10.9.4:

| Check actually run | Result |
| --- | --- |
| `npm run check:toolchain`, `npm run check:workspace`, `npm run check:sources` | Passed; explicit workspace/runtime boundaries and historical source bytes preserved |
| `npm run build`, `npm run typecheck:pure`, `npm run typecheck:browser` | Passed |
| `node --test tests/bootstrap/*.test.mjs` | 53 passed, 0 failed/skipped |
| `node --test packages/engine/test/*.test.mjs` | 148 passed, 0 failed/skipped; includes 51 new Pass cases |
| `node --test services/game-api/test/*.test.mjs infra/firebase/test/*.test.mjs` | 130 passed, 0 failed/skipped |
| Fresh Auth/Firestore data group, all 11 files from `emulatorTestGroups` | 118 passed, 0 failed/skipped; includes 15 new Pass cases |
| `node scripts/package-backend.mjs` | Passed forbidden-source/legacy fixture scans; standalone install verification was not run |
| `git diff --check` | Passed |

The actual data invocation was `node /private/tmp/gamen-backend-pass-run.mjs data`. That temporary runner imported the repository's complete data inventory and used the same rules/index files with fresh demo-only Auth `127.0.0.1:29199`, Firestore `127.0.0.1:28180`, hub `24500` and logging `24600`. Logs confirm only Auth/Firestore started; the suite exited 0 and shut its processes down. Standard ports and the existing Claude harness were left running. The final log is `/private/tmp/gamen-backend-pass-data-final.log`; unit, engine, bootstrap and package logs use the `/private/tmp/gamen-backend-pass-` prefix.

Engine tests cover 7/8/9 players, strict timing/targetless shape, active living actor and all excluded phases, injury/Jail/elimination, queued resources/effects, pending Hack, skipped eliminated seats, last-turn release/vote routing, stale identities, version mixing and replay. The persisted service suite covers authenticated binding/receipt ownership, audience events, atomic state/projections/journal/outbox, duplicate and competing delivery, expired Pass versus duplicate deadlines, response loss after a real committed transaction, recovery/restart, stale callbacks and exact legacy lobby/deal/running replay. Retryable contention is reconciled with bounded retries of the identical command or deadline job; persistent failure still fails the tests, and one durable transition remains required.

The three injury/Jail/elimination service cases deliberately use labeled local Admin state/view fixtures to isolate eligibility. Normal, Hack, queued action/shot, retry and legacy launch cases use actual service commands and staged workers. The Rules suite denies the creation-pin document to host/player/display/outsider reads and writes, and every new-match harness checks that strict host-session keys remain unchanged.

This is injected-clock Auth/Firestore evidence. Real Functions/Tasks smokes, full integrated `npm run verify` including root/Balance pin adoption, Frontend UI acceptance and cloud deployment were not run here. They belong to CI/integration. The Functions runtime's standard-port guard is unchanged; no IAM, merge or deployment action was performed. There are no unresolved Pass game-rule decisions in this backend handoff.
