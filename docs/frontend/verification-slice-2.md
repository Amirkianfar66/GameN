# Frontend verification — slice 2, the shot flow

Only checks that were actually run are listed as run. Everything else is under [Not run](#not-run). The record for slice 1 is [verification.md](verification.md).

## Provenance

| Item | Actual value |
| --- | --- |
| Repository | `https://github.com/Amirkianfar66/GameN.git` |
| Issue / branch | [#3](https://github.com/Amirkianfar66/GameN/issues/3) / `agent/frontend-shot-flow`, in the dedicated Frontend worktree |
| Stacked on | `agent/frontend-tabletop` at `e64016e` ([PR #15](https://github.com/Amirkianfar66/GameN/pull/15), unmerged). This slice's pull request targets that branch |
| Bootstrap base | `333c9e820f362a211352bc689372663f29b73ac4` |
| Runner | Claude Code, desktop app. Model `claude-opus-5-5` |
| Rule-source manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`, unchanged |
| Contracts / protocol | `0.1.0` / `1`, bootstrap draft, unchanged in this branch |
| Command semantics relied on | `docs/backend/contract-review-response.md` at `fd303a7` on `agent/backend-firebase-officer-slice`: a proposal on an unmerged branch, read and not run. See [contract-re-review.md](contract-re-review.md) |
| Design tokens | `0.2.0`, `proposal_for_evaluation`, unchanged |
| Environment | macOS 26.7.1 (arm64), Node `22.21.1`, npm `10.9.4` |
| Date | 6 October 2026 |

## Automated checks

All run from the repository root of the dedicated worktree, at the head of the branch.

| Command | Result |
| --- | --- |
| `npm run verify` | Passed. Workspace boundaries, source integrity, typecheck and build clean; 16 of 16 bootstrap tests |
| `npm run test --workspace @mothership/presentation` | 95 of 95 passed; 0 skipped, 0 todo |
| `npm run test --workspace @mothership/game` | 210 of 210 passed; 0 skipped, 0 todo |
| `npm run check:exclusion --workspace @mothership/game` | Passed. 29 modules reachable from the 2 production entries; 89 shipped or source files scanned; 17 development files labeled in code |
| `git diff --check` against the branch below | Clean |
| Diff against the branch below for every path outside `apps/game/`, `packages/presentation/` and `docs/frontend/` | Empty. The lockfile is unchanged; `apps/game/package.json` gained one script and no dependency |

**The 305 Frontend tests and the exclusion check still do not run in CI.** `npm run verify` covers `tests/bootstrap` only. Wiring them in is REQ-1 in [integration-requests.md](integration-requests.md) and belongs to Codex Integration. A green check on the pull request says nothing about them.

### What the new tests cover

| Area | Tests in |
| --- | --- |
| The flow by itself, against a transport whose every answer the test scripts: one confirmation and one command; the wait before a new control is active; receipts; which errors settle and which do not, on a first answer and on a retry; lookup by identifiers only; identical re-send; a late command ending as the server's stored rejection; bounded checking that never sends into silence; a stuck check not blocking a newer one; the view settling and overriding; choices dropped by a closed panel, a lost connection, an ended turn or a new phase; what is kept across a reload and when it is removed; recovery on a reloaded page, including a lookup asked too early to conclude anything; discarding a record that is malformed or another match's or seat's; a host whose storage fails; disposal in every state | `apps/game/test/shot-flow.test.mjs` |
| The same through a player's screen controller: focus per step; private speech on its own channel, never merged with public speech; nothing of the flow in any frame field once the panel is closed; intents refused where no control exists; an intent judged against the present and not a stale frame; a control becoming active as a redraw of its own; backgrounding with a choice on screen and with a command in flight; disconnect and reconnect; the clock running out; leaving an unknown result once its turn is over | `apps/game/test/player-shot.test.mjs` |
| The specification's command journeys with the real client core for three audiences against one scripted scenario: the Officer's registration with no other screen redrawn, in both fixture variants; duplicate submission; lost acknowledgment; lost request; an "unavailable" answer; rejected targeting; a command service that is down; the turn ending while an outcome is unknown; three reload cases; background and resume across a deadline; a slow request; registration not being resolution | `apps/game/test/shot-journeys.test.mjs` |
| The scripted command desk: the authored registration applied to the actor's view only; durable receipts, replay before phase or time, conflict, late arrival; safe errors that store nothing; each operator arrangement; a silent service; a slow request not consuming a later arrangement; the operator status showing no target, identifier or role; the same over HTTP | `apps/game/test/fixture-harness.test.mjs` |
| The screen's own refusal to carry a private line when the panel is not open, with an announcer that offers one anyway | `apps/game/test/screens.test.mjs` |
| The Shot card for every step: gate, target hints, wording, controls drawn as not yet active, the same card for every role and both fixture variants, nothing in a closed phone's model or document, structural accessibility of every step, focus targets, the intent parser | `packages/presentation/test/shot-card.test.mjs` |
| What is spoken about a command, when, and on which channel; what is said after a reload; a dropped choice told apart from a cancelled one | `packages/presentation/test/announcements.test.mjs` |
| Nested regions and the redraw planner: outermost first, the smallest redraw for each kind of change, text that looks like a slot not being believed | `packages/presentation/test/markup-node.test.mjs` |

**Mutation checks.** Fifty-one mutations were applied one at a time to the built code and the suites re-run: the eight changes the independent reviewer had found to pass every test, each fix made after the review, and the guards from the first version. All of them now make a named test fail. Two did not on the first run, and their tests were strengthened until they did: a private line carried with the panel closed, and an intent accepted behind a closed panel. A third had not been applied at all, because its pattern did not match the built code, and was caught once it did. A fourth, for a timer that fires a moment early, passed because the test built for it did not in fact fire the timer early; that test was rewritten. This is a spot check on those behaviors, not a mutation score.

## Independent review

A second agent reviewed the first commit of this slice (`b97441c`) from an exported copy, with no knowledge of the author's conclusions. It ran the suites, a randomized run of 12,000 sequences against the fixture, mutations of the built code and its own browser probes, and reported fourteen findings. Findings 1 to 6 and 13 were reproduced here with the reviewer's own probes before anything was changed. The rest were accepted on the reviewer's evidence and on reading the code; 7 and 8 had also shown up in this slice's own browser run. The fixes are a follow-up commit on the same branch.

| # | Finding | Disposition |
| --- | --- | --- |
| 1 | A reload while a command was in flight forgot it: the phone offered a new target, then showed "Registered" for a shot it could not account for | Fixed. The identifiers of an unresolved command are kept across a reload and the reloaded page asks about it before offering anything. See [slice-2-shot-flow.md](slice-2-shot-flow.md#across-a-page-reload) |
| 2 | The second tap of a double tap on "Register shot" acknowledged the result that replaced it; a rejection could vanish 150 ms after appearing | Fixed. A control that acknowledges is inactive for the same 400 ms as the one that sends, and is drawn that way |
| 3 | A settled result never expired: "Registered … resolved at the end of the round" stayed after the view had dropped the command, and could first be spoken rounds later | Fixed differently from the suggestion. Dropping the report would leave a player who had not seen it never told. It stays until acknowledged, and once the view no longer lists the command it reads "Was registered" and promises nothing still to come. A rejection stays until acknowledged, by choice |
| 4 | "Not registered" after a safe error stayed even when the view then listed that command | Fixed. A command the view lists is registered, whatever the device concluded earlier |
| 5 | The frame kept a shot-card element id after private content left | Fixed. A focus request made inside the panel leaves the frame with it; the test now checks every field |
| 6 | An unsent choice survived a phase change when the gate stayed open | Fixed. A choice belongs to the phase it was made in |
| 7 | A choice dropped by connection loss, time-up or turn end was not announced | Fixed. It is said to be unsent, privately; focus stays with the card |
| 8 | An activation inside the 400 ms wait was swallowed with no feedback | Fixed. The control is drawn and exposed as not yet active |
| 9 | Spoken lines stayed in the document past their stated lifetime, and contradictory ones could sit side by side | Fixed in the interim host. Each line removes itself, and the latest word about a command replaces earlier ones |
| 10 | "Result unknown" had no exit when the server kept refusing to answer | Fixed. Once the command's phase is over the result can be left, and the copy no longer blames the connection |
| 11 | A check already waiting on the server delayed "ask again at once" after a reconnect | Fixed. A newer check goes out at once and the older answer is ignored |
| 12 | Copy: "The turn had already ended" was untrue when only a retry was late; "Check again when the connection is back" appeared on a live connection; the chip "Confirm" read like a control; an unused string; the selected-card outline looked like the focus ring | All changed |
| 13 | In the fixture, a waiting slow request consumed the operator's next arrangement, and two slow requests in a row returned an empty answer | Fixed |
| 14 | Eight ways the code could be broken with every test still passing, two vacuous assertions, and no test of the interim host | The eight are now caught, as listed under mutation checks; the vacuous assertions are gone. The host's redraw order is now a tested pure function; its handling of spoken lines and focus is still exercised only by the browser script |

The reviewer found no violation, in its randomized run, of: one identifier and one payload per choice; nothing sent unless live, unexpired and with the panel open; nothing private in a closed or backgrounded page; "registered" only for a command the desk accepted at that target; every sent command settling once the server answers; nothing after disposal. It found the development server's bind, origin checks and file allowlist sound, and each statement the client makes about the game to have a source.

## Browser checks against the fixture harness

**Every observation below is fixture evidence.** The server was the scripted double. Chromium only, headless, on a desktop.

Headless Chrome 154.0.8037.98, driven over the DevTools protocol by `apps/game/dev/capture-shot-flow.mjs` with real key presses and real touch taps, with two phones and the table open against one scripted match. Its output is committed under [evidence/slice-2/](evidence/slice-2/README.md): twenty screenshots and `facts.json`, from which every figure here is taken.

| Observation | Result |
| --- | --- |
| Keyboard only: Tab to "Choose a target", Enter, Tab to Player 2, Enter | The confirm step. Focus was on the question, not on a control. Enter pressed again at once: still the confirm step, no command request |
| A double tap on a target | The confirm step for that player; no command request |
| A target tapped, then "Register shot" tapped as soon as it appeared, 61 ms after the first tap | Ignored: the control was marked not yet active, and no command request was made |
| "Register shot" tapped once active, with the request arranged to be slow | "Sending your shot to the server…" with no receipt stored on the server; then "Registered". One command request, no lookup |
| During that registration | Table document unchanged. Target phone document unchanged. The table's only control is still the reduce-motion setting |
| The panel, the role card and the card title across those steps | The same DOM nodes throughout: a step redraws the card alone |
| Another tab brought to the front with the result showing | The page became `hidden`; no word of the flow and no private spoken line remained in the document; focus was on the panel's toggle. Back in front, the panel was still closed |
| Every command and receipt request made to fail | "Checking…", then "Result unknown". The server received one command request and three lookups: nothing was sent into the silence |
| Requests answered again, "Check again" pressed | "Registered". One lookup and one identical command request; one receipt stored |
| A rejection arranged by the operator | "Not registered. The server did not allow this shot.", spoken assertively on the private channel. After "OK", focus returned to "Choose a target" |
| The next turn opened with the confirm step on screen | The choice was dropped, no command request. Spoken: "Round 2. Player 2's turn." publicly and "Your choice was not sent." privately, as two lines |
| The feed dropped with the confirm step on screen | The same, with "Connection lost…" publicly. Focus stayed on the card's title |
| A double tap on "Register shot", server accepting at once | The second tap landed on "Done". The report was still on screen afterwards; one command request |
| A double tap on "Register shot", server rejecting at once | The rejection was still on screen afterwards; one command request. In this run the second tap fell beside the smaller "OK" control, so the wait on that control was exercised by the unit tests and by the accepted case above, not here |
| The page reloaded while its request was on its way | Before the reload, session storage held one record with the fields `commandId`, `matchId`, `phaseId`, `seatId` and no mention of a target, role or command kind. After it, the closed page held nothing private; opened, it showed "Checking…" and offered no target. When the request landed: "Your shot is registered." In all the server received one command request, sent before the reload, and two lookups after it. The record was gone |
| 320 px with text doubled | No horizontal overflow at any step. Target controls 233×212, "Register shot" 233×132, labels in whole words |
| Control sizes at 390 px | Targets 286×52; "Register shot" 141×44; "Choose someone else" 207×44; "Check again" 132×44; "Choose a target" 160×44 CSS px |
| Storage at the end | No local storage, session storage, cookie, IndexedDB database or cache entry |
| Browser log | No uncaught exception, console error or content-security-policy violation. Four failed requests, all ones the fixture arranged |
| Requests the pages made | The three feeds, server time, two stylesheets, the browser's favicon request, and the command and receipt endpoints for seat 1. No operator endpoint, no fixture module, no phase-advance call |

"Sending…" was seen 29 ms after the tap, measured from outside the page and including the script's own round trips. That is not a device measurement of selection feedback and is not offered as one.

### Found by running it in a browser

None of these was caught by the unit tests first.

- **At 320 px with text doubled, labels broke apart inside words** ("Re / gis / ter / sh / ot"), and the role card and the panel toggle overflowed their panel. Four nested boxes each took a full, doubled side padding and left 50 px for a button's label. Side padding is now capped by the screen's width where boxes nest. This also affected the open private panel from slice 1, which slice 1's narrow capture had not opened.
- **Chrome re-sent one request six times.** When the fixture simulated "no answer" by closing the connection, a single `fetch` POST reached the server six times within 9 ms, once per idle connection, and the page saw one failure. Confirmed with a separate one-request probe. The fixture now answers with an empty `504` instead, which nothing retries. The finding is reported to the backend in [contract-re-review.md](contract-re-review.md): a command can arrive more than once without any client code retrying it.
- **A fault in the evidence script, not in the client, registered a shot nobody had pressed.** The script's key presses carried a native key code; with one, headless Chrome on macOS re-delivered an Enter that the page did not handle thousands of times. That phantom key activated the focused "Register shot" as soon as its 400 ms wait ended. One command was sent, not thousands. The script was fixed. It is recorded because it is the reason the first capture runs of this slice were discarded.
- The first capture used a "slow answer" that registered at once and delayed only the reply, so "Sending…" was never visible: the view arrived first and settled the card. The arrangement now delays the request itself.

## Not run

| Check | Status |
| --- | --- |
| Firebase emulator integration of any kind: authentication, Security Rules, transactions, receipts, receipt lookup, scheduled deadlines | **Not run.** The backend's emulator exists on an unmerged branch; a transport to it needs the Firebase client (REQ-7) |
| The backend's own tests and emulator suite | **Not run by Frontend.** Its command guarantees were read, not executed |
| Cross-seat denial and absence of unauthorized fields in real network payloads | **Not run.** Checked only against the fixture server, which performs no authentication |
| iOS Safari and Android Chrome on named physical devices; a physical table display | **Not run** |
| Safari, Firefox or WebKit on desktop | **Not run.** Chromium only |
| Screen readers (VoiceOver, TalkBack, NVDA) and switch access | **Not run.** Structure, focus targets and announcement text are tested; spoken output was not listened to |
| Interactive checks in a visible browser window | **Not run.** Headless only |
| The layout at 600 px and wider | **Not run for this slice.** Captures are at 390 and 320 px |
| A request that hangs until the client's eight-second limit, in a browser | **Not run.** Covered by tests with a scripted clock; the fixture's "no answer" fails at once |
| Real network conditions: throttling, a proxy that buffers, a suspended mobile tab | **Not run** |
| Selection feedback under 100 ms, frame rate, load, memory | **Not run.** No device was measured |
| R3F/Three.js board evaluation; comic motion gallery and event director | **Not started** |

## What this evidence does not establish

Passing fixture tests and desktop screenshots do not show multiplayer correctness, real authorization, or anything about balance. The scripted command desk was written from the backend owner's statement of the command contract and from reading its handler; it applies no game rule and accepts its one scripted registration whatever the target. A journey that passes against it shows the client behaving as designed when the server behaves as stated. Whether the server does is for emulator integration to show, and that is not run.

## Reproduce

```sh
npm ci
npm run verify
npm run test --workspace @mothership/presentation
npm run test --workspace @mothership/game
npm run check:exclusion --workspace @mothership/game

# Browser harness, then open http://127.0.0.1:4310/ and drive it from the operator console
npm run dev:fixture --workspace @mothership/game

# Optional: regenerate the screenshots and facts (needs a local Chromium-based browser)
npm run dev:capture:shot --workspace @mothership/game -- ../../docs/frontend/evidence/slice-2
```
