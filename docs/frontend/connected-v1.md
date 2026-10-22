# The first Firebase-connected flow: handoff

**Issue:** [#3](https://github.com/Amirkianfar66/GameN/issues/3) · **Branch:** `agent/frontend-connected-v1` (draft [PR #29](https://github.com/Amirkianfar66/GameN/pull/29)), in its own clean worktree
**Base:** the browser dependency proposal `codex/v1-browser-dependency-adoption` at `5adaf98f8412e2294f45e00f8fb7c4c515127226` ([#28](https://github.com/Amirkianfar66/GameN/pull/28)), on the integration candidate `b731c971e94b1f888303effa63deffa524a89268` ([#26](https://github.com/Amirkianfar66/GameN/pull/26)). Both are unmerged and under review; this branch is stacked on them and changes neither.
**Wire protocol 2 · ruleset `in-person-v1-2026-10-06`** (SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`), V1-01 to V1-21 approved, unchanged.
**Code and checks at:** `1297cd11024d2121b0b8d956ac76b17e8a52f7fe`. The PR description carries the head after this document was committed.

This is the handoff for the connected work: what exists, what was actually run, what is not done and what is undecided. Start with [protocol2-adoption-assessment.md](protocol2-adoption-assessment.md).

**This is the first connected flow, not the complete V1 game.** A phone can move and, when the server permits it, register an ordinary shot. Every other phase of the game is named and timed on screen and has no controls yet. The lobby is a development console, not a designed screen. Everything runs against emulators on one machine; nothing is deployed and no phone has been used.

## Status against the flow that was asked for

| Step of the first connected flow | State | Where it is shown |
| --- | --- | --- |
| 1. Host creates a seven-player lobby | **Works in a browser against the emulators** | Journey step 1 |
| 2. Players authenticate and request admission | **Works in a browser against the emulators** | Journey step 2 |
| 3. Host approves seats and starts the match | **Works in a browser against the emulators**, by keyboard alone | Journey step 3 |
| 4. Each player receives only their authorized private view | **Works in a browser against the emulators.** Each phone listens to its own view document and no other; the rules refusing every other read are asserted in the Node suite | Journey step 4; `test-emulator/connected-lobby.test.mjs` |
| 5. The shared display receives only public information | **Works in a browser against the emulators** | Journey step 5 |
| 6. A player performs a legal movement | **Works in a browser against the emulators**, by touch and by keyboard | Journey step 6 |
| 6b. …and, when permitted, registers a shot | **Works in a browser against the emulators, in a nine-player match.** Not permitted in a seven-player match before round 4 (G5), so the seven-player journey asserts that no shot is offered there | Nine-player journey, step 6b |
| 7. Real receipts and authoritative phase changes | **Works in a browser against the emulators.** The backend's own receipts; a phase that ends when the server's 60 seconds are up and not before | Journey steps 6 and 7 |
| 8. Reload, reconnect and unresolved-command reconciliation | **Works in a browser against the emulators**: an answer lost, a request lost, a reload with a command unresolved, a phone taken offline and brought back | Journey steps 8a to 8d |

"Works in a browser against the emulators" means exactly this: headless desktop Chrome, one browser context per device, the real Firebase web client, real anonymous identities, real Security Rules, the real protocol-2 service with its real 60-second phases, on one machine. It does **not** mean phones, people, a screen reader, a real network or a deployed project.

## Run it

```sh
npm ci
npm run verify                                   # needs neither Java nor the emulators

# The emulator-connected checks. They need Java 21 on the PATH and the fixed loopback ports
# free: Auth 9199, Firestore 8180, Functions 5101, hub 4500, logging 4600, and 5173 for the page.
npm run test:emulator --workspace @mothership/game                # the client core from Node
npm run dev:connected:journey --workspace @mothership/game        # the browser journey, seven players
MOTHERSHIP_JOURNEY=shot npm run dev:connected:journey --workspace @mothership/game   # nine players, a shot; about ten minutes

# The preview, by hand: two terminals, then open http://127.0.0.1:5173/
npm run dev:emulators --workspace @mothership/game
npm run dev:connected --workspace @mothership/game
```

How to use the preview, tab by tab, is in [`apps/game/dev/connected/README.md`](../../apps/game/dev/connected/README.md). Two things to know before trying it by hand:

- **One browser profile holds five live tabs per host name.** A browser opens six connections to a host and every tab keeps one to the Firestore emulator. Measured: a host tab and eight player tabs in one profile, all opened as `127.0.0.1`: five players learned their seat. Split between `http://127.0.0.1:5173/` and `http://localhost:5173/`: all of them did. The page reaches the emulators under the name it was opened with for this reason. This is a property of browsers and of the emulator, not of the client or the backend.
- **Stop the emulators afterwards.** The ports are the backend's own; its emulator tests cannot run while they are taken. Frontend chose no port: they are those of `infra/firebase/firebase.json`, and 5173 is the only origin the local Functions accept.

On the machine this was written on, Java 21 is not installed system-wide; a Temurin JRE put in `/private/tmp/mothership-java` by the coordinating session was used through `JAVA_HOME` and `PATH`. The emulator binaries were already cached, so nothing was downloaded.

## What exists

| Path | Contents |
| --- | --- |
| `apps/game/src/connected/transport.ts` | The boundary to a real backend: nine documented operations and five documented listener paths, each named. A snapshot says whether the server confirmed it |
| `apps/game/src/connected/api.ts` | Every answer parsed with the shared strict protocol-2 schema whatever the HTTP status, and believed only about the request it names. Failures carry the retry delay the server named |
| `apps/game/src/connected/readers.ts`, `paths.ts` | Stores for the public view and for the approved seat's own view; a lobby reader; provisional strict readers for the two host documents that have no exported schema (G1); the documented listener paths, built from checked identifiers only |
| `apps/game/src/connected/session.ts` | The same session engine as the fixture's, over a view document. A view is current only when the server confirmed the snapshot. A confirmed snapshot with a lower revision than the one held is an integrity failure: the screen stops and nothing can be sent |
| `apps/game/src/connected/action-flow.ts` | One command at a time for the seat, `MOVE` or `REGISTER_SHOT`, chosen only from the server's own destinations and legal targets on a current view with a trusted, running countdown. Its identifiers are stored, and read back, before anything is sent. Lookup, identical re-send, attempts counted while they are out, receipts that settle whenever they arrive, waits the server names kept until they have passed, checks never closer than a second apart, and the documented rules after a reload. A command whose outcome is unknown cannot be put away |
| `apps/game/src/connected/deadline-catch-up.ts` | Added after the flow first ran in a browser (G9). When a device's trusted countdown has ended on a current view, it asks the server to look at the deadline (`v1Advance`), as the handoff allows. Asking decides nothing: the server answers "advanced" or "unchanged", and the screen changes only with the next view. A display asks first; phones later, each seat at its own moment; a refusal stops it for that phase; a wait the server names is kept until it has passed, whatever restarts the asking; and it needs a trusted clock to say the deadline has passed. While an ended phase stays on screen it asks at most once a minute |
| `apps/game/src/connected/screens.ts` | Headless controllers for a connected phone and a connected table. Views only: no event stream is consumed on this branch |
| `apps/game/src/browser/firebase-transport.ts` | The Firebase web client behind the boundary, **for the local emulators only**: memory cache, listener metadata, anonymous sign-in, plain JSON operations with the SDK's ID token. It refuses any host that is not loopback and any project but the demo one. Not part of the headless package entry |
| `packages/presentation/src/model/connected-player.ts`, `markup/connected-player.ts` | The connected phone: the same screen outside the private panel, and inside it one card for the player's own command |
| `apps/game/dev/connected/` | **Development only.** The emulator-connected preview page, its lobby console, the Vite configuration, the browser journey and a README |
| `apps/game/test/` | Unit tests against scripted transports, part of `npm run verify`: `connected-api`, `connected-readers`, `action-flow`, `deadline-catch-up`, `connected-screens`, `firebase-transport-guards`, `core-boundary` |
| `apps/game/test-emulator/` | The client core from Node against the emulators, and the test-only transport. **Not** part of `verify` |
| `docs/frontend/evidence/connected-v1/` | What the browser journeys wrote: `facts.json`, `journey-log.txt` and screenshots, per scenario |

Changes outside the connected modules, all inside Frontend's directories: the session engine and the snapshot store are shared by both protocols without a change in behavior; `shell.css` gained functional placement for the action card's offers and the accepted and not-accepted marks (**not designed: for the Designer to replace**); the development host passes two more parameters a control can carry; the capture driver can open a page in a browser context of its own. `apps/game/package.json` gained scripts only. Nothing outside `apps/game/`, `packages/presentation/` and `docs/frontend/` is changed: no contract, rule, manifest dependency, lockfile, CI file, backend file or Designer asset. The protocol-1 fixture harness and its tests are untouched and still pass.

## What was actually run

Node `22.21.1`, npm `10.9.4`, Temurin Java `21.0.12.1`, firebase-tools `15.0.0`, Chrome `154.0.8037.98` headless, macOS, 6 October 2026, at `1297cd11024d2121b0b8d956ac76b17e8a52f7fe`.

| Command | Result |
| --- | --- |
| `npm run verify` | Passed: 558 tests, no failure, skip or todo (25 bootstrap, 79 engine, 46 backend, 11 tooling, 106 presentation, 291 game). Production exclusion passed: 41 modules reachable from 2 production entries, 124 files scanned, 23 development files labeled |
| `npm run test:emulator --workspace @mothership/game` | Passed: 4 of 4 in 74 seconds, most of it one real 60-second phase |
| `npm run dev:connected:journey --workspace @mothership/game` (seven players) | Passed in 76 seconds: steps 1 to 9, every assertion. Emulators started and stopped by the command; the page served by the script itself |
| `MOTHERSHIP_JOURNEY=shot npm run dev:connected:journey --workspace @mothership/game` (nine players) | Passed in 319 seconds. The Officer was Player 1; its own turn was the sixth phase |
| Mutation checks: hand-written mutants of the compiled modules, run against the unit tests | Command flow: 25 of 25 caught. Deadline catch-up: 23 of 23. Integrity, trusted-clock and wording fixes: 10 of 10. Each ended at zero survivors after tests were added for the ones that first survived (three, four and one) |

All four were run again after the review fixes below, on the tree the code head records. The journeys were first green on `8be7eb7`, before those fixes.

### Independent review, and what was done about it

A separate reviewer, given the code at `8be7eb7` and the required behavior but none of the author's conclusions, read the connected core and confirmed its findings with probes against the built modules. It found nothing in the API client, the readers, the paths, the markup, the announcer, or what is persisted, and it found the reload path lookup-only as claimed. What it did find was real, and is fixed in the commit after `8be7eb7` unless marked open:

| # | Finding | State |
| --- | --- | --- |
| 1 | A later "safe" failure settled a command while an identical attempt at it was still on its way, which could then be accepted unseen | **Fixed.** Attempts are counted while they are out. A safe failure settles the command only if none went unanswered and none is out. A receipt settles the command whenever it arrives, even to a check a newer one has overtaken |
| 2 | "Stop checking" let a command of unknown outcome be put away once its phase was over, with no lookup ever answered | **Fixed by removing it.** Such a command can be asked about again and nothing else, on a reloaded page too. When the server can be reached, asking always ends in an answer |
| 3 | A wait the server named was cut short by a feed flap, a hide and show, a phase change, or "Check again"; in deadline catch-up, by any blink of the view | **Fixed in both.** The wait is kept until it has passed and holds everything: lookups, re-sends, and the first send of the next command. Checks never start within a second of each other, whatever starts them |
| 4 | A snapshot the server confirmed with a lower revision was dropped silently; the screen stayed live with actions enabled | **Fixed.** It is an integrity failure, as the handoff says: the screen stops and nothing can be sent. A lower revision from a cache is still just dropped |
| 5 | If the identifiers could not be stored, the command was sent anyway | **Fixed.** They are stored and read back first. If that fails nothing is sent, and the card says so |
| 6 | Re-sends ignored every gate: sent on a stale view, after the countdown, on a blocked screen | **Fixed, with one deliberate exception.** No command goes out on a view the server has not confirmed. A command the server never looked at goes again only if what was confirmed is still allowed. A command that may already have been decided is still sent again, identically, on a confirmed view whatever the clock says: that is how its stored decision is fetched |
| 7 | The countdown gate was open while the device had no trusted clock | **Fixed for the connected screens:** actions are paused until the device has the server's time, at the start and after returning to the page. **Open:** the protocol-1 shot gate on the fixture branches has the same property and is not changed here |
| 8 | An accepted move was worded as its outcome ("Moved to Room B.") from the receipt alone | **Fixed.** "Move to Room B accepted.", and where the player is, is said to be under "Your location", from the view |
| 9 | Minor: the same jitter on every phone; catch-up asking every 15 seconds without end; a POST that would follow a redirect; a listener refused before any view leaves "Connecting" with no control | The first three **fixed** (jitter by seat number; one ask a minute at most; redirects refused). The last is **open**: no way to reach it was found in this flow |

Ten tests were found to assert less than their names said. Five are corrected; one, which compared a constant with a copy of itself, is removed; and for the other four, the cases they did not cover (a context that changes under the flow) now have tests of their own. Eleven comments that claimed more than the code did are corrected.

**The fixes themselves have not been independently reviewed.** They are covered by 13 new unit tests, by the mutation checks above, and by the emulator suite and both journeys run again afterwards. That is this author checking this author's work.

In every emulator run firebase-tools printed one warning, that Application Default Credentials exist on this machine and that non-emulated services would use them. The project is `demo-mothership`, the client reaches loopback hosts only, and nothing in Frontend's code addresses a service that is not emulated. Whether the Functions code can is Backend's to confirm; it is reported here as seen.

### What the seven-player browser journey established

Each line is an assertion in `apps/game/dev/connected/journey.mjs`; the run's own words are in [`evidence/connected-v1/movement/journey-log.txt`](evidence/connected-v1/movement/journey-log.txt) and `facts.json` beside it.

- **Lobby.** One `v1CreateMatch`; the host console read a room code, "0 of 7 seated" and status "lobby" from its own documents. Nine browser contexts signed in anonymously and hold nine identities. Seven asked to join and showed nothing of a match. The host seated all seven with Tab and Enter; each phone learned its seat from its own admission document. The display was admitted by the identifier it shows and showed no match before the start. One `v1StartMatch`.
- **Private views.** Seven phones show seven seats and, with the private panel open, the seven roles of the seven-player roster, each once; closed, nothing private was in the page or its model. Each phone asked Firestore to listen to three paths in all: its own admission request, the lobby, and `playerViews/{its own uid}`. Every phone says "Local emulator" and nothing on it says "fixture".
- **Public display.** It listens to the lobby and `views/public` only, shows seven seats, the phase and the countdown, has no role name anywhere in its page or model, no private panel and no control that sends a command. It never called `v1Command` or `v1Receipt`.
- **Movement.** Once the phone had the server's time, a move was offered. By touch, a player chose from the server's own destinations and confirmed: one `v1Command` (`MOVE`), and the backend's receipt, accepted and `REGISTERED`, carrying the page's command identifier. The card says the move was accepted, not where the player is. Choosing sent nothing. By keyboard alone, a second player did the same; focus went to the card's own prompt at each step and rested on the card's title while the request was out. The display and the mover's own screen then showed the new location, and the mover was offered no second move.
- **Answer lost.** Dropped in the browser after the server had decided. The page asked `v1Receipt`, found the accepted receipt and showed the move. It sent no second command.
- **Request lost.** Dropped before it left the browser. The page asked, was told "unknown", sent the identical request under the same identifier, and it was accepted once.
- **Reload with a command unresolved.** With the answer and every lookup dropped, the tab held exactly four identifiers for the command (match, seat, phase, command) and nothing about the move, and the card offered no way to start another action. After the reload the same identity and seat came back; nothing private was shown until asked; the page sent **no** command, said the result was unknown and that it could not send the action again; with lookups let through, "Check again" found the receipt. The page says the action was accepted and that it no longer knows what it was.
- **Phase change.** The first phase ended no earlier than 60 seconds after the host pressed Start. The display asked the server to look at the deadline after its own countdown ended, and the server advanced the phase once. A player who had chosen a destination and not confirmed lost the choice at the phase change, sent nothing, was told "Your choice was not sent.", and had not moved.
- **Reconnect.** A phone taken offline in the browser said the connection was lost and that what it showed might be out of date, paused its actions, called its last offer "Paused", and offered nothing to start. Back online it was current again by itself, showed a move made while it was away, and its own move was then accepted.
- **Retry delay.** *Injected by the script, not given by the backend:* a "slow down, retry after 3000 ms" answer. The page sent nothing more for that command for at least those 3 seconds, then the identical request, which the backend accepted.
- **At the end.** Seven players, seven accepted moves, seven command identifiers; every seat is where its one move put it in the authoritative public view. No tab holds anything of the match but its sign-in and which match it is in: both storages, IndexedDB, the cache store, cookies and service workers were read. IndexedDB holds one database, the Firebase SDK's own heartbeat record.

### What the nine-player browser journey established

Run because a seven-player match opens no ordinary shot before round 4. The words of the run are in [`evidence/connected-v1/shot/journey-log.txt`](evidence/connected-v1/shot/journey-log.txt).

- Nine players were seated and the match started as in the seven-player journey. Nine phones hold nine different roles; one is the Officer (Player 1 in this run).
- **When the match started nobody else was offered a shot**, and the Officer was offered none outside its own turn.
- The journey then waited for the Officer's own turn in real 60-second phases. It came as the sixth phase the display showed: "Round 1, Player 7’s turn", "Round 1, Player 2’s turn", "Round 1, Player 8’s turn", "Round 1, Player 9’s turn", "Round 1, Player 6’s turn", "Round 1, Player 1’s turn".
- **On its own turn**, once the phone had the server's time, it offered a shot and listed the server's legal targets (4 in this run). Choosing one sent nothing. One confirmation sent one `v1Command` (`REGISTER_SHOT`), and the backend's receipt was accepted and `REGISTERED`, carrying the page's command identifier.
- The phone says the shot is registered, that **this is not a result**, and that registered shots are resolved at the end of the round.
- **Registration is not damage.** Two seconds later the shared display's board was identical to what it was before the shot, the target was as healthy as before, and no other phone had been told anything or had sent anything.
- Put away, the card says one action is registered and waiting, which it reads from the server's own view, and the server offers the Officer no second shot.
- After a reload the card says the same, and does not know or say who the target was. Nothing about the shot, the target or any role is stored in any tab.
- **Not run:** the resolution of that shot at the end of the round, or anything after it.


### What the Node suite established

Unchanged from the earlier commits and rerun here: the lobby journey, command reconciliation, a real 60-second phase change and the Firebase SDK transport, driven from Node. It is where the Security Rules refusing other audiences' documents are asserted (a pending requester, a display and another player each get `403`), where a conflicting payload under a used identifier and a second move in a round are shown to be stored decisions, and where a reloaded page's command is shown *not* accepted after its phase closed.

## Findings for Backend and Integration

Listed in full in the assessment as G1 to G11. New since the assessment was first written:

| Finding | Evidence | What Frontend did |
| --- | --- | --- |
| **G9. Under the local emulators nothing runs at a phase's deadline.** The Cloud Tasks emulation dispatches `v1DeadlineTask` within a second of its being enqueued, not at its `scheduleTime`. The handler finds the deadline not yet due and completes, so it is not retried | The emulator's debug log: nine of nine tasks ran 0.04 to 1.0 s after "Enqueueing task". A match with no client asking stayed on its first phase for 110 seconds after the start | Implemented the handoff's deadline catch-up. Without it no phase changes locally. **Not checked:** what a deployed queue does |
| **G10. No phone can reach the preview.** The emulators, the page and the transport are loopback-only by design, and the Functions accept two loopback origins | `infra/firebase/firebase.json`; the CORS allowlist; the transport's own guard | Nothing. What the first in-person session runs on is a decision for the owner and Integration |
| **G11. `v1AbortMatch` and seat recovery exist and are not consumed.** | `infra/firebase/src/index.ts`; the handoff's operation table | The client names nine of the twelve client operations and refuses to send any other. Abort and recovery are for a later slice |

## Unresolved integration decisions

| Decision | Who | What Frontend does meanwhile |
| --- | --- | --- |
| Exported schemas for `control/session` and `admissions/*` (G1) | Integration | Provisional strict readers for exactly the fields the service writes |
| How a display is paired with a host (G3) | Owner, Integration | The display shows its identifier and takes the match identifier; the host pastes one and reads out the other. Workable on one machine, not at a table |
| Sign-in method and credential persistence per kind of device (G4) | Owner, Integration | Emulator only: anonymous sign-in, kept per tab. A reload keeps the seat; closing the tab ends it |
| How a demonstration reaches a shot (G5) | Integration | Seven players for everything else; nine players and real waiting for the shot |
| Whether deadlines are expected to fire locally (G9), and whether client catch-up is the intended fallback in production | Backend | Catch-up as the handoff describes it, with waits that keep a table of devices from asking at once |
| What the first in-person session runs on (G10) | Owner, Integration | Nothing is deployed or exposed |
| Designed lobby screens, and the action card's layout | Designer | A development console for the lobby; functional placement for the card |
| Where the event stream comes back in | Integration, Frontend | This branch consumes views only. Cues belong to the event director, parked for separate review (draft [#30](https://github.com/Amirkianfar66/GameN/pull/30)); it consumes protocol-1 shapes and needs one field renamed |

## Not established

- Anything on a phone, with a screen reader, with people, or on a real network. The journeys are headless desktop Chrome with phone-sized pages.
- Anything about a deployed project: App Check, production origins, Cloud Tasks at a real deadline, IAM, retention.
- The resolution of a registered shot, or any phase other than an ordinary turn, beyond being named and timed.
- Cue replay: no cue is issued on this branch.
- Reduced motion in the connected page. The setting and its behavior are the shells', unchanged and covered by their own tests; no journey step exercises it.
- Abort, seat recovery, eight-player matches, more than one match in a tab.
- The review fixes under a second independent review, and review finding 9's last item (a listener refused before any view arrived).
- The protocol-1 fixture shot flow against review finding 7. It lives on the fixture branches and is not changed by this branch.
- A reload between pressing "Ask to join" and its answer: the tab then has no record of the request and asks again, leaving the first request pending on the host console.
- That the scripted fixture harness says anything about the backend. It does not, and nothing here describes it as integration.
