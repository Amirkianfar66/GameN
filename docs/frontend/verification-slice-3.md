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
| `npm run test --workspace @mothership/presentation` | 120 of 120 passed; 0 skipped, 0 todo |
| `npm run test --workspace @mothership/game` | 262 of 262 passed; 0 skipped, 0 todo |
| `npm run check:exclusion --workspace @mothership/game` | Passed. 31 modules reachable from the 2 production entries; 95 shipped or source files scanned; 17 development files labeled in code |
| `git diff --check` against the branch below | Clean |
| Diff against the branch below for every path outside `apps/game/`, `packages/presentation/` and `docs/frontend/` | Empty. The lockfile and every manifest are unchanged |

**The 382 Frontend tests and the exclusion check still do not run in CI.** `npm run verify` covers `tests/bootstrap` only. Wiring them in is REQ-1 in [integration-requests.md](integration-requests.md) and belongs to Codex Integration. A green check on the pull request says nothing about them.

### What the new tests cover

| Area | Tests in |
| --- | --- |
| The director by itself, on views and events built from the authored fixture: the first view as history; an event with its view in either order; repeats; an event the view passed, waiting or late, even when still true; suspension and what the feed resumes on; agreement with the view; no cue without a change shown on this device; each cue kind and what it carries; a move drawn from this screen's own past; a round transition only when seen; stream order kept; a registration by event, by receipt and by both; another seat, another match and the other kind of audience refused; the table's director having no private cue; a vocabulary with no attack, cause or identifier; bounded memory | `packages/presentation/test/director.test.mjs` |
| The event reader: each audience's own schema; a seat's event refused on the table's route and the reverse; unlisted facts and fields; another protocol version; garbage; another match; the caller's object not retained | `apps/game/test/event-reader.test.mjs` |
| The session: checked events handed on in feed order and in step with the state; a bad event changing nothing and raising no problem; the table never handing on a seat's event; no events after an integrity failure, from a replaced feed or after disposal | `apps/game/test/audience-session.test.mjs` |
| Cues through the real screen controllers, against a transport whose every delivery the test scripts: the cue in the very frame that shows its fact; numbering; nothing scheduled and input taken at once; repeats; reconnecting, the reconnect control and a view the feed cannot vouch for; an unreadable update; a hidden page and a recovery screen; reduced motion; a registration inside the open panel only, withdrawn on close and on backgrounding, never played later; receipt, view and event in either order; a rejection and an unknown result not being cues; and the screen's own refusal, with a director that misbehaves | `apps/game/test/cues.test.mjs` |
| The motion direction's named risks with the real client core for three audiences against one scripted scenario: a registration with no effect on the table or the other phone, by frame and by document; a public change as one cue everywhere; events before their view; repeats; a reconnect that replays nothing while the stream is handed over again; a move and a status change that say nothing the words on screen do not; the turn clock and a shot unaffected by a cue; the motion setting changing with the next frame; bad events changing nothing; and a whole script whose cues name no attack, block or role | `apps/game/test/cue-journeys.test.mjs` |
| The scripted streams: every event valid against the shared contract and agreeing with the view of its revision; the authored registration fact on the registering seat's stream and on no other; **two runs, with and without a registration, indistinguishable to the table and to the other seat, identifiers included**; a stream kept and handed over again, and nothing delivered while a feed is down; either delivery order; the two synthetic facts touching only two bystanders; bad events aimed at one feed, never private on the public stream, never kept; nothing server-only in any event or status line; both fixture variants identical; the same controls over HTTP | `apps/game/test/fixture-harness.test.mjs` |

### Mutation checks

Sixty-six mutations were applied one at a time to the built director, screen controller, session, event reader and development fixture, and the suites re-run. Sixty-two make a named test fail. The other four change nothing a test could see: three are guards that a second guard already covers (events after disposal, listeners released on disposal), and one only keeps events in a bounded list a little longer. Five did not fail on the first run and their tests were strengthened until they did: an event still true on screen after the view had passed it, in both arrival orders; an event for the view on screen while the feed is not current; the same view told twice and then its event; and an event of the other kind of audience.

**The independent reviewer then applied 122 mutations of its own and found 27 that no test catches**, among them six it judged meaningful. Those are listed under [Independent review](#independent-review) and are not fixed yet. The paragraph above is a spot check by the author, not a mutation score, and the reviewer's result is the better measure.

## Independent review

A second agent reviewed the code commit of this slice (`f071edc`) from an exported copy, with the requirements and no knowledge of the author's conclusions. It ran the suites, wrote its own probes, ran a randomized test of 1,500 sequences of 200 steps through the real player controller, and applied 122 mutations.

**Its findings are recorded here as open. None is fixed in this branch yet.** The work was parked when the Firebase-connected prototype became the priority, and this slice is published as a draft so that it is preserved and can be reviewed; it should not be merged before findings 1 to 5 are dealt with.

It found **no hidden-information leak in production code**, and the director's ordering held under everything it tried. The problems are in the frame contract a renderer will consume, one development-fixture defect, and tests that cannot fail.

| # | Finding | Severity | Author's reading | State |
| --- | --- | --- | --- | --- |
| 1 | When a view arrives before its events, each event replaces the frame's cue list. A renderer that samples the latest frame once per paint, as a React host would, gets only the last cue; the same facts delivered events-first arrive as one list | Medium now, high with such a host | **Correct.** Which cues a renderer receives must not depend on delivery order. The list should hold every cue issued for the view on screen | **Open** |
| 2 | Development fixture: a synthetic fact followed by the operator's "registered" step republishes the authored views at their authored revisions. Revisions go backward, the "hidden" step writes to the other feeds, and every screen ends up on the data-check screen | Medium, development only | **Correct**, and it contradicts the fixture's own comments. The step should be derived from the current views, as a command's registration already is | **Open** |
| 3 | Public cues are never withdrawn from the frame. A renderer that mounts later cannot tell an old cue from a new one, and a cue stays in the frame of a recovery screen | Medium | **Correct.** Cues should leave with the view they belong to, and when no match is on screen | **Open** |
| 4 | One counter numbers public and private cues. After a private cue, the numbers in the public list show that one was issued, even with the panel closed. A renderer with a single high-water mark can also skip a cue when both lists are filled at once | Low to medium | **Correct, and the one finding that touches hidden information.** No number is put in a document, but a frame should not record it. Separate counters. The spoken-line counter from slice 2 has the same property | **Open** |
| 5 | An event identifier is remembered before the event is checked for audience, so a misdelivered event can make the seat's own event with the same identifier look like a repeat. And a redelivery of more than 256 events while the feed stays current makes repeats look new | Low | **Correct.** Identifiers should be remembered per audience and only for events that could still be played; the bound then stops being behavior | **Open** |
| 6 | The registration cue issued from the command flow has no freshness rule: it plays for a receipt found minutes later, on a reloaded page, or while the feed is stale, where the event path would call the same thing history | Low | **A decision, not yet made.** The likely rule: no cue once the report reads "was registered" | **Open** |
| 7 | An event arriving just after a feed blip is dropped as history, and one arriving a minute after its view still plays | Low | Follows the delivery proposal to the letter. **For the owner and the Designer** | Noted |
| 8 | Where the code is stricter or looser than the proposal, and where it relies on something not promised: a round transition inferred from the round number rising; the revision of a registration event; the transport doing the ordering | Low | The reliance is requests E and F in the contract re-review. The rest is documented in the slice notes | Noted |
| 9 | Four tests that cannot fail for what they claim, and six meaningful mutants no test catches: a suppressed cue still taking a number; a refused command reported as registered; waiting events discarded on suspension; private cues accumulating; the browser transport and one fixture path untested | — | **Correct** | **Open** |
| 10 | Nine comments that say more than the code does, among them "no identifier" on cues that carry a seat, and "never kept for later" beside finding 3 | — | **Correct** | **Open** |

What the reviewer checked and found sound: the reader and the session (strict schema, protocol probe, match check, audience separation, integrity gating, stale-feed and disposal guards); the director in both arrival orders, with repeats, overtaken events, history at a first view and after suspension, and receipt, view and event in every order; no cue on a refusal and exactly one when the view then lists the command; private cues only with the panel open in the foreground and withdrawn on close, hide or block; a registration behind a closed panel producing no frame, no cue and no number; no command, event, phase or match identifier in any frame; no timer added by a cue. Its randomized run produced about 7,300 cues with no violation of seven safety rules.

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
