# Frontend protocol-2 adoption assessment

**Reviewer:** Frontend (issue [#3](https://github.com/Amirkianfar66/GameN/issues/3)), Claude Code, model `claude-opus-5-5`.
**For:** Codex Astra (Backend, Integration and the coordinating review), Game Balance, the game owner.
**Date:** 6 October 2026.

**Status: an assessment, not an adoption.** Frontend can build the first connected flow against wire protocol 2 as it stands and has started to. Nothing found requires a new or changed contract to begin. Eight gaps need an answer from Integration or the owner before adoption, and are listed with what Frontend does meanwhile. **The protocol-1 fixture acceptance recorded for slices 1 and 2 does not carry over:** it was acceptance of stated protocol-1 behavior against a scripted double. No Frontend code consumes protocol 2 yet.

## What was read, and what was run

| Item | Exact reference |
| --- | --- |
| Integration candidate | `codex/v1-pinned-frontend-integration` at `b731c971e94b1f888303effa63deffa524a89268` (draft [PR #26](https://github.com/Amirkianfar66/GameN/pull/26)) |
| Browser dependency proposal | `codex/v1-browser-dependency-adoption` at `5adaf98f8412e2294f45e00f8fb7c4c515127226` (draft [PR #28](https://github.com/Amirkianfar66/GameN/pull/28)); Stage A `f89c9149f0f3f7e15b3a89c922167657f317a099`, Firebase `6ea1c0dd3136253d20b8ed7e1c3898159ccfb05d` |
| Frontend consumer inside the candidate | `ba716d71b3c5a2e15acf3cd80c4bb458e657fc9f` ([PR #18](https://github.com/Amirkianfar66/GameN/pull/18)): slices 1 and 2. The event director and motion gallery are on their own branches and are not in it |
| Documents | `docs/backend/pinned-frontend-integration.md`, `protocol2-client-handoff.md`, `contract-refinements-proposal.md`, `browser-dependencies.md`, `browser-dependency-proposal-verification.md`, `v1-rule-decisions-proposal.md` |
| Sources read to check the documents against | `packages/contracts/src/full-game.ts`, `v1-service.ts`; the player projection and `legalTargets` in `packages/engine/src/full-game/lifecycle.ts`; lobby, admission and event writing in `services/game-api/src/full-game.ts`; `infra/firebase/firestore.rules`; `infra/firebase/test-emulator/full-http.test.mjs` |
| Ruleset | `in-person-v1-2026-10-06`, SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`, V1-01 to V1-21 approved, Original Powers off. Not reopened here |

Run by Frontend in its own clean worktree (`agent/frontend-connected-v1`), Node `22.21.1`, npm `10.9.4`, Temurin Java `21.0.12.1`:

| Command | At `b731c97` (#26) | At `5adaf98` (#28) |
| --- | --- | --- |
| `npm ci` | 826 packages | 886 packages; lockfile unchanged afterwards |
| `npm run verify` | Passed, 466 tests, no failure, skip or todo; production exclusion passed | The same |
| `npm run test:emulator` | Passed, 35 of 35; emulators shut down cleanly | Not rerun; the Backend records it |
| `npm run check:browser-dependencies` | Not applicable | Passed |

**These are Backend's suites passing in a Frontend checkout.** They show the candidate is a working base on this machine. They are not consumer acceptance: no Frontend test exercised a protocol-2 payload.

## Verdict by area

| Area | Verdict |
| --- | --- |
| Command, receipt and lookup contract | **Supported as it stands.** Stronger than protocol 1 and it answers Frontend's requests A and B |
| Composed views, revisions, freshness | **Supported.** Needs the Firebase web client for listener metadata; the rule is clear |
| Event stream | **Supported.** The director built against the protocol-1 proposal needs one field renamed and nothing else |
| Lobby, admission, start | **Supported with two gaps** (G1 no schema for the documents the host reads; G3 pairing a display) |
| Identity across a reload | **Gap G4.** The handoff leaves credential persistence undecided; the flow asked for cannot be shown without choosing |
| Deadlines and trusted time | **Supported** |
| The four proposed refinements | **Proposals. Not relied on.** Frontend's position on each is below |
| Reaching a shot in a seven-player match | **Gap G5.** Not permitted before round 4, and real time cannot be shortened over HTTP |

## Supported today: what the client will consume

Everything in this section exists in the exported schemas at `b731c97` and is what Frontend builds against. Field names are the contract's.

| Document or call | Schema | Fields the first connected flow uses |
| --- | --- | --- |
| `lobby/public` | `FullLobbyViewSchema` | `matchId`, `playerCount`, `status`, `seats[].seatId`, `seats[].initialRoom` |
| `views/public` | `FullPublicViewSchema` | `versions`, `matchId`, `viewRevision`, `playerCount`, `round`, `phase`, `activeSeatId`, `seats[]` with `health`, `location`, `jailed`, `captain`, `revealedFaction`. `ballot`, `lastTally`, `result`, `endReveal` are parsed and held, and drawn in later slices |
| `playerViews/{uid}` | `FullPlayerViewSchema` | The public facts, plus `audience.seatId`, `self.role`, `self.movementDestinations`, `self.shotAvailable`, `legalTargets.REGISTER_SHOT`, `ownPendingCommandIds`. The rest of `self`, `knowledge`, ballots and Hack fields are parsed, kept in memory only, and not yet drawn |
| `audienceEvents/{public or p-seat-N}/items` | `FullPublicEventSchema`, `FullPlayerEventSchema` | `eventId`, `viewRevision`, `audience`, `fact`; ordered by revision, then by the ordinal in the document name |
| `v1Command` | `FullCommandRequestSchema` → `FullCommandResponseSchema` | `MOVE` and `REGISTER_SHOT`. The other eleven command types are accepted by the schema and not yet offered |
| `v1Receipt` | `FullLookupRequestSchema` → `FullLookupResponseSchema` | As documented |
| `v1ServerTime`, `v1Advance` | Their request and response schemas | As documented |
| `v1CreateMatch`, `v1RequestAdmission`, `v1ApproveAdmission`, `v1AdmitDisplay`, `v1StartMatch` | Their request schemas → `FullOperationResponseSchema` | As documented. Abort and seat recovery are not in the first flow |
| Failures | `FullFailureSchema` | All eight codes; `retryAfterMs` when present |

Behavior Frontend takes as stated and will hold the client to:

1. **Receipts.** One durable decision per `(match, seat, commandId)`; the identical request returns it before any new phase or time check; any interleaving of identical submissions yields one receipt. A rejection receipt is a final decision.
2. **Unknown outcomes.** Loss, timeout, an unreadable body, a schema failure and `UNAVAILABLE` leave the outcome unresolved. A safe failure settles only the invocation it answered.
3. **After a reload.** Only match, seat, phase and command identifiers are kept. The payload is gone, so nothing is re-sent; while the command's phase is open it stays pending; once a **fresh server view** shows the phase closed, a lookup made **after** that view settles it, and "unknown" then means not registered. The old identifier is never reused.
4. **Freshness.** A cached snapshot may be shown as stale and can never enable an action. Fresh means a server read, or a listener snapshot with `fromCache === false` and `hasPendingWrites === false`.
5. **Revisions.** Increasing within one match and audience; equal means identical; lower, or equal with different content, is an integrity failure that stops commands.
6. **Events.** Written with their view, no ordering between the two listeners, retained and delivered again on a new subscription, de-duplicated by identifier, a registration by command identifier.
7. **Privacy.** Private views, targets, roles, Code, command payloads and recovery secrets stay in memory. Firestore uses the memory cache.

The slice 2 flow and the slice 3a director already do items 1 to 3, 5 and 6 against protocol-1 shapes. That is the reason they can be carried over; it is not evidence that they work against protocol 2.

## What changes in the client

Concrete differences from the protocol-1 consumer in the candidate, each found by reading the schema or the engine's projection:

| Protocol 1, as consumed | Protocol 2 | Consequence for Frontend |
| --- | --- | --- |
| `playerCount` is 9 | 7, 8 or 9; `seats` has that many | Shells stop assuming nine seats |
| Phases `ORDINARY_TURN`, `ROUND_RESOLUTION` | Nine kinds; no resolution phase; every live phase is a 60-second window; `FINISHED` and `ABORTED` have no deadline | The phase strip names each kind. A phase without controls in this slice is still named and timed, never shown as an error |
| `shotAvailable` meant an unspent shot | It is `true` only when the ordinary-shot category is open **now**: own ordinary turn, a weapon, the role's round rule, no shot already queued. It can be `true` with no legal target | The gate is `shotAvailable` **and** a non-empty `legalTargets.REGISTER_SHOT`, on a fresh view, with nothing unresolved |
| Target list was a client hint (same room) | `legalTargets.REGISTER_SHOT` is the server's list | The provisional hint is deleted. The client derives no eligibility |
| No movement | `self.movementDestinations`; `MOVE` takes effect at acceptance | A Move action. It is offered whenever the list is non-empty on a fresh view: the engine does not tie movement to the player's own turn, and neither does the client |
| `ownPendingCommandIds` held at most one | At most two, queued commands only. A `MOVE` is never listed | "Registered and waiting" is shown only for a command the view lists. An accepted move is shown as the new location |
| Receipt code `REGISTERED` always meant "queued" | It is the one accepted code for every command, immediate ones included | Wording comes from the command the page sent, which it knows only until a reload |
| `PUBLIC_MOVE { seatId, from, to }` | `PUBLIC_MOVE { seatId, location }` | The director already draws a move from the view shown before, not from the event; it compares `location` instead of `to` |
| `serverTime()` needed nothing | `v1ServerTime` needs the match and an admitted identity | No trusted clock before admission. Lobby screens show none |
| Six failure codes | Adds `REQUEST_ID_CONFLICT` and `RATE_LIMITED` with `retryAfterMs` | Both conflict codes are handled alike. A delay is honored as a minimum on the monotonic clock |
| Seats had no faction | `revealedFaction`, set for an eliminated seat and for all at the end | Shown as a public fact when present. The token proposal already reserves faction accents for "private or revealed" |
| One anonymous fixture identity per page | Auth identity, admission, a seat binding | New lobby screens for a host, a player and a display |

## The proposed refinements

These are in `contract-refinements-proposal.md`. **None is supported wire data and none is relied on.** Frontend's position, for the review record:

| Proposal | Position | What the client does under protocol 2 as it is |
| --- | --- | --- |
| **CR-P2-01** restrict `legalTargets` keys | **Support**, in the next protocol | Reads the keys of commands it offers and ignores every other key. An unknown key is never turned into a control |
| **CR-P2-02** `shotAvailable` with an empty target list | **Keep the documented protocol-2 meaning.** A second meaning under the same name would be worse than the current one | Uses the two-part gate above. An open category with no legal target is shown as "No one you can target right now", not as unavailable |
| **CR-P2-03** kinds for own pending commands | **Support**, in the next protocol; agree that a kind alone does not settle an unanswered command | After a reload the page says that a command of the player's is registered, and not which. With two possible queued commands it shows a count. While any command of the seat is unresolved it offers no new intent of any kind |
| **CR-P2-04** `REQUEST_ID_CONFLICT` for lifecycle conflicts | **Support** | Treats both codes the same on every operation, now and after |

## Gaps and concrete incompatibilities

Reported as found. No replacement contract is proposed; where Frontend needs something to proceed, it says what it does meanwhile and marks it provisional.

**G1. The documents a host must read have no exported schema.**
`control/session` and `admissions/{id}` are readable by the host, and the host cannot approve anyone without them. The handoff says there is no protocol-2 schema for them yet. The service writes `{ uid, initialRoom, requestedAt, status }` and adds `seatId` on approval, and `{ protocolVersion, hostUid, playerCount, status, roomCode, createdAt }` for the session. *Meanwhile:* Frontend validates exactly those fields with a local strict reader, labeled provisional, and rejects anything else. *Asked of Integration:* export schemas for both, so the client checks them against the contract instead of against a reading of the service.

**G2. The lobby view carries no revision and no version pins.**
`FullLobbyViewSchema` has `protocolVersion` only. Ordering therefore rests on Firestore's own snapshot order, and the ruleset pins first appear with the game view. *Meanwhile:* accepted for a lobby; the client pins versions from the first game view, as it does today. *Noted* in case a lobby ever needs replay protection.

**G3. Admitting a display needs its Auth UID, and nothing pairs the two devices.**
`v1AdmitDisplay` takes `displayUid`. A shared display has no way to tell the host its UID except to show all of it. *Meanwhile:* the display shows its identifier and the host types or pastes it; a created host is already a display, so one device can be both. *For the owner and Integration:* in-person play needs something shorter, a pairing code or a scan. That is an operation Frontend must not invent.

**G4. Reload needs the same identity, and the handoff leaves credential persistence open.**
A reload under in-memory Auth persistence makes a new anonymous user, which has no seat; the only way back is host recovery. The handoff says persistence "must be chosen deliberately for shared versus personal devices". The sign-in method is also unstated; "do not create a fresh anonymous player on every reload" implies anonymous sign-in. *Meanwhile, for the local emulator only:* anonymous sign-in with per-tab session persistence, so a reload keeps the seat and closing the tab ends it. No private match data is stored with it. *For the owner and Integration:* the sign-in method and the persistence policy per device kind. This decides what "reload" means in production.

**G5. A seven-player match cannot reach an ordinary shot before round 4.**
`ordinaryShotAllowed` is `ready && ordinaryWeapons > 0 && (Officer ? unspent : round >= 4)`, and a seven-player roster has no Officer. Phases are real 60-second windows and `v1Advance` rightly refuses to skip one. A connected demonstration of "registers a shot" in a seven-player match therefore takes three full rounds of real time. *Meanwhile:* the seven-player journey demonstrates movement, receipts, phase changes, reload and reconciliation; the shot path is exercised with a nine-player match on the Officer's turn, which arrives within the first round. *For Integration:* whether an emulator-only seeded match or clock is wanted for demonstrations. Frontend will not build one: it would be a debug control over game state.

**G6. `COMMAND_REGISTERED` is written for every accepted command, queued or immediate.**
The event is added whenever a command changes the actor's own view, a `MOVE` included, while `ownPendingCommandIds` lists queued commands only. *No change asked.* The director issues a registration cue only when the view of that revision lists the command, so a move gets none. Recorded because a client that stamped every `COMMAND_REGISTERED` would stamp moves.

**G7. Nothing a reloaded page can read says what kind of command it had sent.**
Receipts, events and the pending list carry identifiers only. This is CR-P2-03's subject and is by design under protocol 2. *Consequence:* wording after a reload is generic, as above.

**G8. The ordinal is in the document name.** Request F of the earlier re-review asked where it lives. The handoff answers: `{revision}-{ordinal}`, sorted numerically. *Accepted.* The Firebase transport parses the name; a name that does not parse is treated as an unhealthy stream, not ordered by guesswork.

Smaller points, for completeness: the Functions CORS allowlist is two origins on port 5173, so the local client is served there and nowhere else; rate-limit numbers are implementation detail and the client depends only on `retryAfterMs`; `REQUEST_ID_CONFLICT` is declared and not yet emitted.

## Earlier Frontend requests, against this candidate

| Request | State at `b731c97` / `5adaf98` |
| --- | --- |
| REQ-1 run Frontend suites in `verify` | **Done** in the candidate: `test:frontend` runs both suites and the exclusion check, and fails on any skip or todo |
| REQ-2, REQ-3 browser type program and guard | **Done** as `tsconfig.check.browser.json` and the workspace policy. See the note on #28 below |
| REQ-4 GSAP, REQ-5, REQ-6 | Unchanged; not needed for the connected flow |
| REQ-7 Firebase web client | **Proposed in #28 at 12.18.0**, not the 12.19.0 Frontend named: its Firestore declarations need `Temporal`, which the pinned compiler lacks. **Accepted**; the difference is recorded so that 12.19.0's Auth fixes are not assumed |
| A concurrent identical commands | **Answered**: "any interleaving … at most one stored receipt" |
| B the replay-before-validation guarantee | **Answered**, stated as contract |
| C restores and revisions | **Answered**: a lower revision is an integrity failure; a reseed uses a new match identifier |
| D importable examples | **Partly**: `protocol2.synthetic.json` exists under the service's tests, in another workspace. Frontend's tests keep to their own workspace, so its examples stay hand-built and schema-checked against the exported schemas |
| E, F, G (from the unpublished slice 3a) | E and F are answered by the handoff and the event-writing code. G, how many revisions one resolution writes, reads as one per audience per transaction; a sentence confirming it would settle it |

## Review of the browser dependency proposal (#28)

Read at `5adaf98f8412e2294f45e00f8fb7c4c515127226`. It changes two Frontend-owned files, the lockfile, and adds one document.

- **`apps/game/package.json`:** React and React DOM `19.3.0`, `firebase` `12.18.0`; development: their types, Vite `8.3.3`, the React plugin `6.1.2`. All exact pins. **Accepted.**
- **`apps/game/tsconfig.json`:** DOM libraries, `jsx`, `.tsx` in the app's own build. **Accepted with one consequence Frontend takes on:** the headless client core in `apps/game/src` has been free of browser globals by construction, because the compiler did not know them. With DOM in the app's program that is no longer enforced by the compiler. Frontend will keep the core apart from browser-only modules by directory and add a check of its own that the core imports none of them.
- **Firebase 12.18.0 instead of 12.19.0:** accepted, for the reason given.
- **React is added before any React code exists.** That is the agreed Stage A, and the first connected flow reuses the existing semantic-DOM screens as the brief asks. React stays unused until the shells move to it; Vite is what the connected flow needs, to bundle the Firebase client for a browser.
- **Frontend's own exclusion checker** accepts only `zod` as an external specifier. Frontend will extend it to exactly the reviewed specifiers (`firebase/app`, `firebase/auth`, `firebase/firestore`; `react`, `react-dom` when used) in the same change that first imports them.

**Frontend's review: no change requested on #28.** This is a review of the proposal, not an approval to merge; the coordinating reviewer keeps that.

## What Frontend builds first, and in what order

Bounded to the eight steps of the connected flow, split so each part can be reviewed alone. All of it lives in `apps/game/`, `packages/presentation/` and `docs/frontend/`.

1. **Protocol-2 client core, headless.** Readers for the lobby, both views and both event kinds; an API client for the documented HTTP operations with retry delays; the session with fresh-snapshot gating; the director on protocol-2 events; a command flow for `MOVE` and `REGISTER_SHOT` with the documented reload rules; lobby flows for host, player and display. Tested with scripted transports.
2. **Emulator-connected checks from Node.** The same core against the real Auth, Firestore and Functions emulators, through their HTTP and REST interfaces. Kept out of `verify`, in a script of their own, because `verify` allows no skipped test and must not need Java.
3. **The Firebase transport and a runnable page.** The web client with memory cache and listener metadata; the existing screens extended for the lobby and the Move action; a Vite build served on port 5173; emulator mode labeled on screen, apart from fixture mode.
4. **Connected browser journeys.** Seven players, a display and a host in real browser windows against the emulators, including reload, reconnect and an unanswered command.

## Not established by this document

- That any Frontend code works against protocol 2. None has been run against it yet.
- Anything about a deployed project: App Check, production origins, IAM, Tasks, retention or indexes.
- Real phones, real networks, screen readers.
- Game balance, or that any hint in a private view is safe to show beside another. Game Balance reviews that separately.
