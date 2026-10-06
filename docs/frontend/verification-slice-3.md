# Frontend verification — slice 3a, the event director

Only checks that were actually run are listed as run. Everything else is under [Not run](#not-run). The records for the earlier slices are [verification.md](verification.md) and [verification-slice-2.md](verification-slice-2.md).

## Provenance

| Item | Actual value |
| --- | --- |
| Repository | `https://github.com/Amirkianfar66/GameN.git` |
| Issue / branch | [#3](https://github.com/Amirkianfar66/GameN/issues/3) / `agent/frontend-event-director`, in the dedicated Frontend worktree |
| Stacked on | `agent/frontend-shot-flow` at `ba716d7` ([PR #18](https://github.com/Amirkianfar66/GameN/pull/18), unmerged), itself on `agent/frontend-tabletop` ([PR #15](https://github.com/Amirkianfar66/GameN/pull/15), unmerged). This slice's pull request targets the first of these |
| Bootstrap base | `333c9e820f362a211352bc689372663f29b73ac4` |
| Runner | Claude Code, desktop app. Model `claude-opus-5-5` |
| Rule-source manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`, unchanged |
| Contracts / protocol | `0.1.0` / `1`, bootstrap draft, unchanged in this branch |
| Event delivery relied on | `docs/backend/contract-review-response.md` on `agent/backend-firebase-officer-slice` (committed in `fd303a7`; branch head `ad976db` when read): a proposal on an unmerged branch, read and not run. See [contract-re-review.md](contract-re-review.md#follow-up-the-event-director-slice-3a) |
| Design tokens | `0.2.0`, `proposal_for_evaluation`, unchanged and not read by this slice |
| Environment | macOS 26.7.1 (arm64), Node `22.21.1`, npm `10.9.4` |
| Date | 6 October 2026 |

## Automated checks

All run from the repository root of the dedicated worktree, at the head of the branch, after `npm run clean`.

| Command | Result |
| --- | --- |
| `npm run verify` | Passed. Workspace boundaries, source integrity, typecheck and build clean; 16 of 16 bootstrap tests |
| `npm run test --workspace @mothership/presentation` | 124 of 124 passed; 0 skipped, 0 todo (120 before the review fixes, 123 before finding 12) |
| `npm run test --workspace @mothership/game` | 273 of 273 passed; 0 skipped, 0 todo (262 before the review fixes, 270 before finding 11, 272 before finding 12) |
| `npm run check:exclusion --workspace @mothership/game` | Passed. 31 modules reachable from the 2 production entries; 95 shipped or source files scanned; 17 development files labeled in code. (An earlier figure of 97 files included two build outputs left behind by another branch in the same worktree; this one is from a clean build) |
| `git diff --check` against the branch below | Clean |
| Diff against the branch below for every path outside `apps/game/`, `packages/presentation/` and `docs/frontend/` | Empty. The lockfile and every manifest are unchanged |

**On this branch the 393 Frontend tests and the exclusion check still do not run in CI.** `npm run verify` covers `tests/bootstrap` only. Wiring them in is REQ-1 in [integration-requests.md](integration-requests.md) and belongs to Codex Integration. A green check on the pull request says nothing about them.

### What the new tests cover

| Area | Tests in |
| --- | --- |
| The director by itself, on views and events built from the authored fixture: the first view as history; an event with its view in either order; repeats; an event the view passed, waiting or late, even when still true; suspension and what the feed resumes on; agreement with the view; no cue without a change shown on this device; each cue kind and what it carries; a move drawn from this screen's own past; a round transition only when seen; stream order kept; a registration by event, by receipt and by both; another seat, another match and the other kind of audience refused; the table's director having no private cue; a vocabulary with no attack, cause or identifier; bounded memory | `packages/presentation/test/director.test.mjs` |
| The event reader: each audience's own schema; a seat's event refused on the table's route and the reverse; unlisted facts and fields; another protocol version; garbage; another match; the caller's object not retained | `apps/game/test/event-reader.test.mjs` |
| The session: checked events handed on in feed order and in step with the state; a bad event changing nothing and raising no problem; the table never handing on a seat's event; no events after an integrity failure, from a replaced feed or after disposal | `apps/game/test/audience-session.test.mjs` |
| The frame contract after the review fixes: every cue of the view on screen in the latest frame, view first, events first and mixed; a cue leaving when its time is up, each at its own time; an event long after its view playing nothing and taking no number; cues leaving with the match on a recovery screen, a hidden page and a stale feed, public and private, and not coming back; public and private cues numbered apart, with and without a private cue issued; spoken lines numbered apart; a registration cue only while it is the present; a refusal that is no receipt | `apps/game/test/cues.test.mjs` |
| Cues through the real screen controllers, against a transport whose every delivery the test scripts: the cue in the very frame that shows its fact; input taken at once, and the one timer a cue has; repeats; reconnecting, the reconnect control and a view the feed cannot vouch for; an unreadable update; a hidden page and a recovery screen; reduced motion; a registration inside the open panel only, withdrawn on close and on backgrounding, never played later; receipt, view and event in either order; a rejection and an unknown result not being cues; and the screen's own refusal, with a director that misbehaves | `apps/game/test/cues.test.mjs` |
| The motion direction's named risks with the real client core for three audiences against one scripted scenario: a registration with no effect on the table or the other phone, by frame and by document; a public change as one cue everywhere; events before their view; repeats; a reconnect that replays nothing while the stream is handed over again; a move and a status change that say nothing the words on screen do not; the turn clock and a shot unaffected by a cue; the motion setting changing with the next frame; bad events changing nothing; and a whole script whose cues name no attack, block or role | `apps/game/test/cue-journeys.test.mjs` |
| The harness pages' own transport, run in Node against the real development server with stand-ins for `EventSource` and page-relative addresses: views and presentation events handed over whole and in order, either order, an unreadable event, the endpoints, a dropped feed, and silence after stopping | `apps/game/test/http-transport.test.mjs` |
| The scripted streams: every event valid against the shared contract and agreeing with the view of its revision; the authored registration fact on the registering seat's stream and on no other; **two runs, with and without a registration, indistinguishable to the table and to the other seat, identifiers included**; a stream kept and handed over again, and nothing delivered while a feed is down; either delivery order; the two synthetic facts touching only two bystanders; bad events aimed at one feed, never private on the public stream, never kept; nothing server-only in any event or status line; both fixture variants identical; the same controls over HTTP | `apps/game/test/fixture-harness.test.mjs` |

### Mutation checks

Before the reviews: sixty-six mutations were applied one at a time to the built director, screen controller, session, event reader and development fixture, and the suites re-run. Sixty-two made a named test fail. The independent reviewer then applied 122 of its own and found 27 that no test caught, six of them meaningful. That was the better measure, and its six are dealt with below.

After the review fixes: thirty-eight hand-written mutations of the changed code (21 in the screen's cue lists and numbering, 7 in the director's de-duplication and waiting list, 5 in the flow's registration report, 3 in the fixture's registered step, 3 in the page transport). **Thirty-seven make a named test fail.** Six did not at first, and tests were added or repaired until they did; one clause they showed to be redundant was removed instead. The one left changes nothing a test could see: the fixture's registered step names the Officer as the only audience to receive its fact, and the fixture already writes a fact only for an audience whose view changed, which a test pins.

This is still a spot check by the author, not a mutation score.

## Review findings and what was done

Two reviews looked at this slice. Both found the same core defects; the second confirmed them independently.

**The independent review** (a second agent, from an exported copy of `f071edc`, with the requirements and no knowledge of the author's conclusions) ran the suites, wrote its own probes, ran a randomized test of 1,500 sequences of 200 steps through the real player controller, and applied 122 mutations. It found **no hidden-information leak in production code**, and the director's ordering held under everything it tried. Its ten findings were recorded as open when the work was parked.

**The integration review of 6 October 2026** (`docs/reviews/2026-10-06-all-agents.md` in the coordinating checkout, at `11c9b55`) reproduced findings 1, 3 and 4 with probes of its own and assigned them to Frontend as R3, R4 and R5.

**The follow-up integration review of 6 October 2026** (`docs/reviews/2026-10-06-follow-up.md` in the coordinating checkout, at `19de97d`) found that R3, R4 and R5 now have their safe outcomes, and found one more defect with a probe of its own: R6, finding 11 below.

The first ten are dealt with in the commit after `11c9b55`, the eleventh in the commit after `19de97d`, and a twelfth, found while fixing the eleventh, in the commit after that. The follow-up review re-ran its probes for R3 to R5 against the fixes. **The fixes for the eleventh and twelfth have not been re-reviewed by the integration reviewer.** An independent review of the eleventh by a separate session was asked for by Frontend; what it found is recorded in the pull request.

| # | Finding | Review | State |
| --- | --- | --- | --- |
| 1 | When a view arrived before its events, each event replaced the frame's cue list, so a page sampling the latest frame got only the last cue; the same facts events-first arrived as one list | R3 | **Fixed.** A frame's list holds every cue issued for the view on screen, in whichever order its facts arrived. Tested view first, events first and mixed, reading only the final frame |
| 2 | Development fixture: a synthetic fact followed by the operator's "registered" step republished the authored views at their authored revisions; revisions went backward and every screen ended on the data-check screen | — | **Fixed.** The step is derived from the Officer's view as it stands and touches no other audience. From the authored start it is byte for byte the authored step |
| 3 | Public cues were never withdrawn: a frame of a recovery screen still carried the last cue, and a page mounted later could not tell old from new | R4 | **Fixed.** A cue leaves when the fact it belongs to changes again (see finding 11 for what that replaced), when the match is not on screen in the foreground on a current feed, or when its lifetime is over, and never comes back |
| 4 | One counter numbered public and private cues, so the public list showed that a private cue had been issued; the spoken-line counter had the same property | R5 | **Fixed.** Each list and each spoken channel has its own counter from 1. The public list and the public line are identical with and without private activity, which is tested both ways. The harness page keeps a mark per channel |
| 5 | An event identifier was remembered before the audience was checked, so a misdelivered event could shadow the seat's own; and a redelivery of more than 256 events made repeats look new | — | **Fixed.** Identifiers are remembered per match and audience, and only for events that can still be played. A whole stream handed over again replays nothing at any length (tested to 1,000). A flood past the bound gets no more cues until the screen moves on, and never one twice |
| 6 | The registration cue from the command flow had no freshness rule: it played for a receipt found minutes later, on a reloaded page, or on a stale feed | — | **Fixed, as a provisional rule.** Only the page that sent the command reports it as a cue, and only while the phase it was sent in is on screen. No cue is issued on a feed that is not current. For the Designer to confirm |
| 7 | An event just after a feed blip is dropped as history; one a minute after its view still played | — | **Half addressed, half kept.** An event later than a bound after its view no longer plays; the bound is now the 1 s the Designer proposed. The blip case follows the delivery proposal to the letter and is kept |
| 8 | Where the code is stricter or looser than the proposal, and what it relies on that is not promised: a round transition inferred from the round number rising; the revision of a registration event; the transport doing the ordering | — | **Unchanged, documented.** The reliance is requests E and F in the contract re-review; under wire protocol 2 the handoff answers both. The inference of a round transition stays, with its limits, in the slice notes |
| 9 | Four tests that could not fail for what they claimed, and six meaningful mutants no test caught | — | **Fixed.** The four tests are repaired: the session test now hands over the very object the feed holds; the down-feed redelivery runs with events in the stream; the misdelivery test uses an event that would play but for its audience; the single-numbering assertion is replaced by the two-counter tests. The six mutants are caught: a suppressed cue taking a number; a refused command reported as registered; waiting events discarded on suspension; private cues replacing one another; the page transport, which now has a test; and the registered step, pinned by the fixture test of finding 2 |
| 10 | Nine comments that said more than the code did | — | **Fixed**, each where it stood: what a cue carries; what authorizes one; what the memory bounds are; when a cue is added to a frame; "shown now or not at all"; the fixture's two comments, now true; the injected event's; the journey helper's; and the citations of a document that is not in this tree, which now say so |
| 11 | **A public cue was withdrawn whenever the view changed at all**, also when nothing public had: a seat's own registration, which changes only that seat's view, emptied the public list on its phone. A renderer following the frame could stop a public animation short because of private activity | R6 | **Fixed.** A public cue belongs to one public fact (the phase, or one seat's place or health) and leaves early only when that fact changes again. A view that changes no public fact, or only another seat's, leaves the list exactly as it was: the same cues, the same numbers, the same list. Tested by taking two phones through the same public moments with one of them registering a command in between and comparing the lists. Of nine deliberate faults in the fix, the tests caught eight, the defect as it was among them; the ninth was the agreed lateness value, which is now pinned too |
| 12 | **A private-only view arriving between a public view and its event made that phone skip the public cue**, because the director counted any newer view as having overtaken the event; and the lateness of a public event was measured from the latest view, so a private-only view could make an old public fact new again. Either way what a seat did in private could show in public | Found by Frontend while fixing 11; not in a review | **Fixed.** The director counts a public fact as overtaken only by a view that changes something public, and the screen keeps two clocks: for a public fact, since the view that last changed something public; for a registration, since the view that brought it. Tested in the director and at the screen with two phones, one of which registers in between, in time and too late. Of thirteen deliberate faults, the tests caught nine at first; four more cases were added and all thirteen are caught |

What the independent reviewer checked and found sound still holds and is still tested: the reader and the session (strict schema, protocol probe, match check, audience separation, integrity gating, stale-feed and disposal guards); the director in both arrival orders, with repeats, overtaken events, history at a first view and after suspension, and receipt, view and event in every order; no cue on a refusal and exactly one when the view then lists the command; private cues only with the panel open in the foreground and withdrawn on close, hide or block; a registration behind a closed panel producing no frame, no cue and no number; no command, event, phase or match identifier in any frame.

**One of its statements no longer holds as written:** "no timer added by a cue". A cue now has one timer, which takes it out of the frame when its lifetime is over. Nothing waits for it and input is still taken at once; both are tested.

**What changed for a renderer.** The frame contract is different from the one the motion gallery branch was written against: lists accumulate and expire instead of being replaced, and each list has its own numbers. The gallery branch has to be rebased onto this one and its page host adapted before its cues are trusted again.

## Browser checks

This slice draws nothing, so there is nothing new to see in a browser. The harness did change underneath the pages: its feed now carries events, and the operator console has new controls. As a regression check, the slice 2 capture script was run again against the changed harness in headless Chrome 154 with real key and touch input (`npm run dev:capture:shot`, output to a scratch directory). **Every measured fact matched the committed slice 2 record** apart from two timings that moved by one and two milliseconds, and the browser log held no exception, console error or content-security-policy violation. That run includes the registration during which the table's and the target phone's documents must not change; with the registration event now delivered to the registering page, they still did not.

The operator console's new controls were exercised over HTTP by the tests, not by hand in a browser. The slice 2 images in [evidence/slice-2](evidence/slice-2/README.md) remain an accurate picture of every audience screen.

## Not run

| Check | Status |
| --- | --- |
| Firebase emulator integration of any kind, including a real event stream, its ordering, its retention and its Security Rules | **Not run.** The backend's emulator exists on an unmerged branch; a transport to it needs the Firebase client (REQ-7) |
| The backend's own tests and emulator suite | **Not run by Frontend.** Its statements about event delivery were read, not executed |
| That another seat cannot read a seat's event stream | **Not run.** That is the backend's rules to enforce and its tests to show; the client's part is to refuse what it is wrongly handed, and that part is tested |
| Any drawing of a cue, in any browser or on any device | **Not built in this slice** |
| A second independent review, of the review fixes | **Not run.** They are covered by the tests and the mutation check above, which is this author checking this author's work |
| The director against wire protocol 2 and a real event feed | **Not run, not built.** It still consumes protocol-1 shapes. The connected flow ([connected work, draft #29](https://github.com/Amirkianfar66/GameN/pull/29)) consumes views only |
| Whether a real listener skips revisions, and how often | **Not run.** It decides how often a cue is dropped as obsolete; see request G in [contract-re-review.md](contract-re-review.md#requests) |
| A long match's stream replayed on reconnect: time and memory | **Not run.** Memory in the director is bounded by construction; a transport's cost of re-reading a long stream is not measured |
| iOS Safari, Android Chrome, a physical table display; Safari, Firefox or WebKit on desktop | **Not run** |
| Screen readers and switch access | **Not run.** This slice adds nothing spoken and nothing focusable |
| Frame rate, load, memory on a device | **Not run.** No device was measured |
| Motion gallery; coordinated timelines; R3F/Three.js board evaluation | **Not started** |

## What this evidence does not establish

The director was tested against streams Frontend scripted from the backend owner's written proposal. A journey that passes shows the client behaving as designed when events arrive as proposed. Whether a backend delivers them so — atomically with their view, at the revision that first states their fact, to their own audience only — is for emulator integration to show, and that is not run. Passing fixture tests do not show multiplayer correctness, real authorization, or anything about balance.

Nothing here shows that a cue *looks* right, is comfortable to watch, or performs on a phone. No cue is drawn yet.

## Reproduce

```sh
npm ci
npm run verify
npm run test --workspace @mothership/presentation
npm run test --workspace @mothership/game
npm run check:exclusion --workspace @mothership/game

# Browser harness, then open http://127.0.0.1:4310/ and drive it from the operator console.
# The console's "Presentation events" section sends events; a page draws nothing for them yet.
npm run dev:fixture --workspace @mothership/game
```
