# The first Firebase-connected flow: handoff

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-v1` (draft [PR #29](https://github.com/Amirkianfar66/GameN/pull/29)), in its own clean worktree
**Base:** the browser dependency proposal `codex/v1-browser-dependency-adoption` at `5adaf98f8412e2294f45e00f8fb7c4c515127226` ([#28](https://github.com/Amirkianfar66/GameN/pull/28)), on the integration candidate `b731c971e94b1f888303effa63deffa524a89268` ([#26](https://github.com/Amirkianfar66/GameN/pull/26))
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`** (SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`), V1-01 to V1-21 approved, unchanged.

This document is the running handoff for the connected work: what exists, what was actually run, what is not done, and what is undecided. It is updated with each commit. Start with [protocol2-adoption-assessment.md](protocol2-adoption-assessment.md).

**This is not the complete V1 game, and it is not yet a playable page.** Read the status table before anything else.

## Status against the flow that was asked for

| Step of the first connected flow | State | Evidence |
| --- | --- | --- |
| 1. Host creates a seven-player lobby | **Works through the client core against the emulators** | `test-emulator/connected-lobby.test.mjs` |
| 2. Players authenticate and request admission | **The same** | The same |
| 3. Host approves seats and starts the match | **The same** | The same |
| 4. Each player receives only their authorized private view | **The same**, including the rules refusing every other read | The same |
| 5. The shared display receives only public information | **The same** | The same |
| 6. A player performs a legal movement | **The same** | The same |
| 6b. …and, when permitted, registers a shot | **Not yet.** Not permitted in a seven-player match before round 4 (assessment, G5) | — |
| 7. Real receipts and authoritative phase changes | **Works through the client core against the emulators.** Receipts accepted, replayed, looked up, conflicting and rejected; a phase that changes at the server's 60-second deadline and not before | Both emulator test files |
| 8. Reload and unresolved-command reconciliation | **Works through the command flow against the emulators**: a lost answer, a lost request, and a page reloaded with only identifiers kept, before and after its phase closed | `test-emulator/connected-commands.test.mjs` |
| 8b. Reconnect | **Not yet.** The flow asks again at once when a feed is fresh again (unit-tested); a real listener dropping and returning needs the browser transport | — |
| A browser page for any of it | **Not yet.** No screen consumes protocol 2 | — |

"Works through the client core against the emulators" means: Frontend's own API client, stores and readers, driven from Node, talking to the real local Auth, Firestore and Functions emulators through a test-only HTTP transport. Real identities, real Security Rules, the real service. **It is not a browser, and the test transport polls where a browser listens.**

## What exists

| Path | Contents |
| --- | --- |
| `apps/game/src/connected/transport.ts` | The boundary to a real backend: nine documented operations and five documented listener paths, each named. A snapshot says whether the server confirmed it |
| `apps/game/src/connected/api.ts` | Every answer parsed with the shared strict protocol-2 schema whatever the HTTP status, and believed only about the request it names. Failures carry the retry delay the server named |
| `apps/game/src/connected/readers.ts` | Stores for the public view and for the approved seat's own view; a lobby reader; provisional strict readers for the two host documents that have no exported schema (G1) |
| `apps/game/src/connected/paths.ts` | The documented listener paths, built from checked identifiers only |
| `apps/game/src/connected/action-flow.ts` | One command at a time for the seat, `MOVE` or `REGISTER_SHOT`, chosen only from the server's own destinations and legal targets on a fresh view. Lookup, identical re-send, bounded checking, retry delays, and the documented rules after a reload |
| `apps/game/test/connected-*.test.mjs`, `action-flow.test.mjs` | Unit tests against scripted transports. Part of `npm run verify` |
| `apps/game/test-emulator/` | Emulator-connected tests and the test-only transport. **Not** part of `verify` |

Nothing outside `apps/game/`, `packages/presentation/` and `docs/frontend/` is changed. The protocol-1 fixture harness and its tests are untouched and still pass.

## What was actually run

Node `22.21.1`, npm `10.9.4`, Temurin Java `21.0.12.1`, macOS, 6 October 2026.

| Command | Result |
| --- | --- |
| `npm run verify` | Passed: 506 tests, no failure, skip or todo (25 bootstrap, 79 engine, 46 backend, 11 tooling, 95 presentation, 250 game); production exclusion passed |
| `npm run test:emulator --workspace @mothership/game` | Passed: 3 of 3, about 76 seconds, most of it one real 60-second phase. After the last test the emulator logged one warning that the backend's own deadline task could not reach Functions, which were already shutting down |

What the lobby journey established against the real backend, each by assertion:

- Creating a lobby is idempotent for one request. A wrong room code is refused without a reason.
- A pending requester can read its own admission and nothing else of the match.
- The host's admission list and session document are readable with the provisional readers; a player cannot start the match.
- After approval each player reads the lobby; after the start the display reads a public view with no private field, and cannot read a private view, the host's session or anything server-only.
- Seven players hold the seven roles of the seven-player roster, each exactly once, each in a view only that player can read.
- No ordinary shot is open to anyone in round 1 of a seven-player match.
- A move to a destination from the server's own list gets an accepted receipt; the identical command again gets the same receipt; a lookup finds it; another payload under the same identifier conflicts; another seat's lookup of it finds nothing.
- The move is then in the public view and in the mover's own view, which offers no further destination and lists nothing pending.
- A second move in the round is a stored rejection, found again by lookup.
- Server time is inside the open phase; an unexpired phase cannot be advanced; someone never admitted gets no time.

What the command journeys established, each by assertion:

- **The answer is lost.** The service decided the move; the client was told nothing. The flow looked the receipt up and showed it accepted, having sent one command.
- **The request is lost.** No receipt existed, so the flow sent the identical command again and it was accepted once.
- **A reload with the answer lost.** What was kept is four identifiers and nothing about the move. The new page asked, sent nothing, and showed the command accepted without knowing what it had been.
- All three players are then in their new places in the authoritative public view, each moved once.
- **A reload with the request lost.** While its phase was open, "no receipt" settled nothing: the command stayed pending, nothing new was offered and it could not be dismissed.
- **The phase changed only when the server said so.** Before the deadline neither the display nor a player could advance it. After the server's deadline the next 60-second window opened, in a higher revision.
- The reloaded page then saw a fresh view of the later phase, asked after it, and learned the command had not been accepted. The player had indeed not moved.
- A command for the closed phase that arrived afterwards was a stored `PHASE_CLOSED` rejection, found again by lookup.
- A new intent for the current phase, with a new identifier, was accepted.

"Lost" is arranged in the test's own API wrapper, and "reload" makes a new flow over the one string the old one kept. Neither is a browser.

## Run it

```sh
npm ci
npm run verify

# Emulator-connected tests. Needs Java 21 on the PATH and the fixed loopback ports free
# (Auth 9199, Firestore 8180, Functions 5101, hub 4500, logging 4600).
npm run test:emulator --workspace @mothership/game
```

On the machine this was written on, Java 21 is not installed system-wide; a Temurin JRE put in `/private/tmp/mothership-java` by the coordinating session was used, by setting `JAVA_HOME` and `PATH`. The emulator binaries were already cached, so nothing was downloaded.

**There is no runnable local preview yet.** One will be served on port 5173, the only origin the local Functions accept.

## Next, in order

1. ~~The command flow for protocol 2, and emulator-connected tests of an unanswered command, a reload and a phase change.~~ Done. The shot path is unit-tested only: no emulator match has reached a turn where a shot is open (G5).
2. The Firebase web transport: memory cache, listener metadata for freshness, anonymous sign-in with per-tab persistence (provisional, G4).
3. The existing screens on protocol-2 views: nine phase kinds, seven to nine seats, a Move action, the server's legal targets; and new lobby screens for a host, a player and a display.
4. A Vite page on port 5173, labeled as emulator-connected, apart from fixture mode.
5. Browser journeys with a host, seven players and a display.

The event stream is **not** consumed on this branch. Cues are the event director's work, which is parked on its own branch for separate review (draft [#30](https://github.com/Amirkianfar66/GameN/pull/30)) and consumes protocol-1 shapes; the views alone carry every fact this flow shows.

## Unresolved integration decisions

Listed in full in the assessment as G1 to G8. The ones this flow runs into first:

| Decision | Who | What Frontend does meanwhile |
| --- | --- | --- |
| Exported schemas for `control/session` and `admissions/*` (G1) | Integration | Provisional strict readers for exactly the fields the service writes |
| How a display is paired with a host (G3) | Owner, Integration | The display shows its identifier; a host is already a display |
| Sign-in method and credential persistence per device kind (G4) | Owner, Integration | Emulator only: anonymous sign-in, per-tab persistence |
| How a demonstration reaches a shot (G5) | Integration | Seven players for movement; a nine-player match for the shot path |

## Not established

- Anything in a browser, on a phone, or with a screen reader.
- Listener behavior: caching, metadata, reconnection. The test transport polls.
- A real listener dropping and reconnecting, and a shot registered against the backend.
- Anything about a deployed project.
- That the scripted fixture harness says anything about the backend. It does not, and nothing here describes it as integration.
