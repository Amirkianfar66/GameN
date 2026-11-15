# The ballot and its result window: Designer's runtime component

**Version:** `vote-0.1.0`. **Status (15 November 2026):** built on the shared kit (`component-kit-0.1.0`, at `07596ba`) to the interface proposed in #267, for the Lead Designer's review and then Frontend's on #4. It is not in the game yet. Integration first admits its files to the hosted build. It is not a release. It is stacked on the phone shell (#265) and the room scene (#261).
- **Still waiting on the kit:** the cells on the result's paper card. Until then the result window's cells draw in the kit's dark form; see [Not in this version yet](#not-in-this-version-yet).

**What it is:** the phone's ballot during a Jail vote or a Captain election, and the five-second result window after it, as the phone pack draws them (sheets 35–38 and 56; #222 item 4). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers:**
- **The ballot** (sheets 35, 36, 56), in the shell's docked sheet:
  - the 3 × 3 roster, seat n always cell n; an empty frame for seats 8 and 9 in a 7- or 8-player match;
  - each cell's state: available, selected, your vote, faded (once a ballot is in), not available (saying the server's reason, "Not in runoff" in a runoff, or "Not available now": the owner's T3);
  - "You" on this viewer's own cell;
  - above the roster: "You abstained", "Closed · result next", or why this viewer can't vote and "You can still watch.";
  - the sheet's words for the shell: its title, "8 players" under nine, and the footer: Abstain and "Vote" / "Vote for Ava"; "Ballot registered", "Abstained", "Voting closed", "You can't vote";
  - a runoff ("Captain runoff", "Ava and Ben tied");
  - at large text, the roster as a list of whole names (the kit's 3 × 3).
- **The result window** (sheets 37, 38, 56), over the stage, for the 5 s result:
  - the head: the art (`RESULT_ART`), the stamp and the headline:

    | Outcome | Head | Stamp | Headline | Line under it |
    | --- | --- | --- | --- | --- |
    | `CAPTAIN_ELECTED` | gold | CAPTAIN (amber) | BEN IS CAPTAIN | 8 votes · 8 could vote |
    | `RUNOFF_REQUIRED` | paper | RUNOFF | TIE · RUNOFF | 8 votes · 8 could vote |
    | `NO_CAPTAIN_ELECTED` | paper | NO CAPTAIN | NO CAPTAIN | 0 votes · 8 could vote |
    | `PLAYER_JAILED` | steel | JAILED | GUS GOES TO JAIL | 7 votes · 4 needed of 8 |
    | `JAIL_FULL` | steel | NO ROOM | GUS CHOSEN · JAIL FULL | Chosen, but every Jail place is taken. Gus stays. |
    | `NO_JAIL_SELECTION` | paper | NO ONE | NO ONE GOES TO JAIL | No one reached 4 votes. |

  - the roster: each candidate's count on the portrait's top-left corner, **0 shown as 0**, amber for the chosen or the tied; the seat number beside the name; "You"; a seat that was not a candidate faded, with no count and no note unless the server gives a reason (T3);
  - each count shown once, as the badge; the cell's accessible name says "Player 7, Gus, 5 votes";
  - the foot: "Ballots stay private" and the round;
  - **compact** (the window under 14 of its own em: 320 px at 150 % and 200 %, 390 px at 200 %): the art and stamp step aside, the headline stops growing at 30 px, the whole window scrolls as one column with the foot, and the roster becomes a list of whole names with the count at the end (sheet 56).

**Not covered here:** the bars and the round button (Vote, Voted, the 5 s ring: the shell); the sheet's frame, title, close and footer buttons (the shell's sheet, to which this component gives the words); the motion of the window's arrival (Motion & Cinematics); the Release vote of the full game (no sheet).

## Files

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `vote/vote.mjs` | `mountBallot()`, `ballotSheet()`, `ballotBar()`, `ballotCells()`, `checkBallot()`, `nextBallotInput()`, `mountVoteResult()`, `resultWords()`, `resultBar()`, `checkResult()`, `nextResultInput()`, `BALLOT_DEFAULTS`, `RESULT_DEFAULTS`, `VOTE_VERSION`, `VOTE_WORDS` |
| `vote/vote.css` | Every style, under the component's two roots, `.ms-vote-ballot` and `.ms-vote-result`; it starts from the kit (`@import url("../kit/kit.css")`) |
| `vote/preview/` | Development only: the preview on the pack's synthetic fixtures inside the shell, with the room scene in its stage (`states.mjs`: 26 states), the lifecycle probe (`probe.mjs`) and the agreement with the pack (`agree.mjs`) |
| `vote/review/` | The check's captures and `check.json` |

Elsewhere:
- **The check:** `design/tools/vote-check.mjs` (development only).
- **The unit test:** `packages/design-tokens/test/vote.test.mjs`.

**Used unchanged:**
- the kit (`kit/kit.mjs`, `kit/kit.css`): cells, the 3 × 3, stamp, pill, group note and the control policy;
- `RESULT_ART` from `apps/game/hosted/scene-drawing/phone-kit-art.mjs`: the pack's own result pictures, already runtime-safe;
- through the kit: `icons.mjs` and `crew-runtime.mjs`'s `crewPortraitVariable`.

The component imports neither the shell nor the room scene: Frontend mounts it in the shell's sheet body or stage.

## Mount, update and dispose

```js
import { mountBallot, ballotSheet, ballotBar, mountVoteResult, resultBar, resultWords } from '…/design/phone-ui/components/vote/vote.mjs';
import '…/design/phone-ui/components/vote/vote.css';

// The ballot: its frame is the shell's sheet; its body is this component.
shell.update({ bar: { ...ballotBar(input), round, timer }, sheet: ballotSheet(input) });
const ballot = mountBallot(shell.sheetBody, input, { onSelect, onFocusReturn });
ballot.update({ ...changes });   // each key given replaces that key; the rest stay
// Each change of the ballot's input: ballot.update(changes) and shell.update({ sheet: ballotSheet(next) }).
ballot.dispose();                // when the sheet closes, the shell drops it, or the phase ends

// The result: in the shell's cover layer over the stage, for the 5 s result phase.
shell.update({ bar: { ...resultBar(input), round, timer: { remainingMs, ring, urgentAtMs: -1 } } });
const result = mountVoteResult(shell.slot('cover'), input);
announce(resultWords(input).announce);   // Frontend's own live region, once
result.update({ ...changes });
result.dispose();                // when the phase leaves VOTE_RESULT
```

- **Synchronous, with no timers:** both survive any number of updates. `suspend()` and `resume()` exist, as on the shell; a suspended ballot takes no taps.
- **The ballot lives in the shell's sheet body.** When the shell drops the sheet (it is concealed, the sheet closes or another opens), the body goes with it: dispose the ballot then, and mount it again in the new `sheetBody` when the ballot's sheet comes back.
- **The result window** mounts in the shell's cover layer, `shell.slot('cover')`: exactly over the stage, above the room scene's tags and presses, under the shell's target bar, chip, banner, toast and sheet (the Lead's decision; it comes with the shell's next update on #265). It sits inset 8 px under the top bar, 10 px above the tabs and 10 px from each side, as the pack draws it, and takes the taps over it, so the room under it takes none. Until the cover lands, the preview mounts it in `shell.stage`.
- **The result's clock:** pass `urgentAtMs: -1` to the shell's timer. The pack's result ring is never amber (sheets 37 and 38).

## Inputs

### The ballot

| Input | Audience | What |
| --- | --- | --- |
| `status` | Phone | `'live'`, `'stale'` or `'concealed'`, as the shell |
| `interactive` | Phone | `false`: no cell takes taps |
| `reducedMotion` | Phone | The game's Reduce motion; the device's is honoured as well |
| `viewer` | Phone | This phone's seat (a number or `'seat-n'`), or `null`. A change drops this viewer's inputs unless the same update gives the new viewer's |
| `versions` | Public | The match's art versions, for the portraits |
| `kind` | Public | `'jail'` or `'captain'` |
| `runoff` | Public | `null`, or `{ tied: [seat, …] }`: "Captain runoff", "Ava and Ben tied" |
| `roster` | Public | `[{ seat, name, character, candidate, reason }]`, one per seat in the match (7–9). `seat` is the number or the `'seat-n'` id. `candidate`: in `ballot.eligibleTargets` (public). `reason`: the server's reason this seat can't be chosen, where the projection gives one, else `null`. A public status ("Injured", "In Jail", "Out") is not an input: under T3 it is not drawn there |
| `selected` | This viewer's | The seat picked and not yet sent, or `null`. Frontend holds it; the component only draws it. It must be a candidate |
| `own` | This viewer's | `null` (no ballot yet), `{ seat }` (sent), or `{ abstained: true }`, from `ownBallot` for this phase |
| `mode` | This viewer's | `'open'` (the `VOTE` offer is there), `'closed'` (the clock reached 0; result next) or `'cannot'` (this viewer may not vote: not in `ballot.eligibleVoters`). Left out, `'closed'`: no choice until one is given |
| `busy` | This viewer's | `'vote'` or `'abstain'` while that request is sending, else `null` |
| `reason` | This viewer's | With `mode: 'cannot'`: why, from the projection ("Eliminated players don't vote."). Left out, "You can't vote in this ballot." Then "You can still watch." |

**Each cell, from these inputs alone** (`ballotCells(input)` returns them):
- **available:** a candidate, `mode: 'open'`, no ballot sent; **selected**, with "Selected" and the check, when it is `selected`.
- **not available** (dimmed, focusable, `aria-disabled`): not a candidate. Its note (the owner's T3) is:
  1. `reason`, the server's;
  2. else, in a runoff, "Not in runoff" (the runoff's pair is the server's `runoff.tied`, so it is true by definition);
  3. else "Not available now".

  Never the person's public status: written under exactly the cells that can't be chosen, it would read as a reason worked out on the phone (the Lead's review of #267).
- **your vote:** the seat in `own`, with "Your vote" and the check.
- **faded:** every other candidate once a ballot is sent, the vote is closed, or this viewer can't vote.

`ballotSheet(input)` returns the shell's `sheet` input with the pack's words:
- **Its title:** "Jail vote", "Captain election" or "Captain runoff", and "7 players" or "8 players" under nine.
- **Its footer:**
  - Open, no ballot: Abstain (`id: 'abstain'`, secondary) and Vote (`id: 'vote'`, primary). Vote is unavailable until a seat is selected ("Choose a player first"), then reads "Vote for Ava". While `busy`, both are refused, and the one sending is busy.
  - Sent: one unavailable "Ballot registered" with a check. Abstained: "Abstained". Closed: "Voting closed". Can't vote: "You can't vote".
  - Concealed: none.

The footer's taps arrive through the shell's `onSheetAction('abstain' | 'vote', 'ballot')`. Frontend sends `VOTE` with `selected` or with none.

`ballotBar(input)` returns the shell's bar words: the vote's icon and title, and "Your ballot is private", or "Ava and Ben tied" in a runoff.

### The result window

| Input | Audience | What |
| --- | --- | --- |
| `status`, `reducedMotion`, `viewer`, `versions` | As the ballot | Concealed, the window draws nothing, as the shell and the room scene |
| `tally` | Public | `lastTally` exactly as the projection gives it: `{ kind, outcome, counts, eligibleVoterCount, selectedSeatId, tiedSeatIds }`, with its `'seat-n'` ids; Frontend does not reshape it. `phaseId` is ignored. An outcome that names a person needs `selectedSeatId` |
| `roster` | Public | As the ballot's; `candidate` on each seat that could be chosen in that vote. A non-candidate is faded, with no count, and with no note unless its `reason` is given: nothing is being chosen, so not "Not available now" either |
| `needed` | Public | The number of votes a Jail vote needed, for "4 needed of 8" and "No one reached 4 votes.", or `null` |
| `round` | Public | For the foot's "Round 3" |

- **The words:** `resultWords(input)` returns `{ stamp, title, line, announce }`. The window, the preview, the test and Frontend's announcement all use the same words; the title is drawn in capitals by the window's type.
- **No claim beyond the tally:**
  - With `needed: null`, the Jail line reads "7 votes · 8 could vote", and no one chosen reads "No one was chosen.".
  - "No one reached 4 votes." appears only when every count is under the threshold; a tie at it reads "No one was chosen.".
- **The bar:** `resultBar(input)` returns the bar words, "Jail vote · result" or "Election · result", with the short form "Vote result".

**Questions for Integration and Backend (the Lead puts them on #4 with this interface; please don't infer):**
1. **The Jail threshold.** `lastTally` carries `eligibleVoterCount` but not the votes needed. The component will not work it out from the rules; the pack's words need the threshold in the projection.
2. **Candidates with no votes.** Item 4 asks for zero shown as 0. If `counts` leaves out a candidate with no votes, Frontend needs the closed vote's candidates (`ballot.eligibleTargets` of that phase) to mark `candidate: true`. The component draws 0 for a candidate missing from `counts`, and no count for a seat that was not a candidate.
3. **Ballot ineligibility reasons.** Each non-candidate's reason, so a cell can say more than "Not available now".

**Decided by the Lead (review of #267), under the owner's T3:** the pack writes the public status ("Injured", "In Jail", "Out") under the cells that can't be chosen, and only there, so it reads as the reason. The component does not draw it: a non-candidate says the server's reason, "Not in runoff" in a runoff, or "Not available now", and on the result nothing. This is the one accepted difference from the sheets; the agreement amends the pack's drawing to these words before comparing, and records each amendment.

## Callbacks

| Callback | When |
| --- | --- |
| `onSelect(seat)` (ballot) | An available cell is tapped, with its seat number. Tapping the selected cell again reports it again; Frontend decides whether that clears it |
| `onFocusReturn(detail)` (ballot) | The focused cell ended (the roster changed, or the ballot was concealed): the focus is on the ballot's root for Frontend to move on, and `detail` is `{ intent: 'select', value }` |

The result window has no controls and no callbacks. It shows no ballots: no list of who voted for whom, ever.

**The controls** are the kit's and follow its policy:
- one delegated listener;
- every seat with a person is a button, whether it can be chosen or not;
- an unavailable cell keeps its focus, with `aria-disabled="true"` and its note in its accessible name;
- while `stale`, every cell refuses taps and keeps its look, described by "Controls return when the match is current";
- while `busy`, after a ballot is in, and when not `interactive`, every cell refuses taps.

## States

| Sheet | State | Drawn |
| --- | --- | --- |
| 35 | Open, selected, sent, abstained, closed | As above |
| 36 | Election (9), runoff, 8 players, 7 players, can't vote | Empty frames are `aria-hidden` |
| 37 | Elected, runoff, no Captain | Gold, paper, paper heads |
| 38 | Jailed, Jail full, no one, 8 players | Steel, steel, paper heads |
| 56 | At 320 × 568 with 200 % text: three results, three ballots | The list form; the compact window |
| 45 | Reconnecting | Ballot: cells refused, look kept; the shell's banner sits under the docked sheet, as the pack layers them, and the bar says "Reconnecting…". Result: unchanged |
| — | Concealed | Nothing: no names, pick, ballot or totals, and nothing for a screen reader |

**Privacy:**
- `selected`, `own`, `mode`, `busy` and `reason` are this viewer's.
- **Concealed:** they are dropped, and not kept for when the phone shows again.
- **A change of `viewer`:** drops them, unless the same update gives the new viewer's.
- **The result window** receives only the public tally.

**Motion:** none of its own. The kit's controls keep theirs, and the window's arrival belongs to Motion & Cinematics. The game's Reduce motion is `data-motion="reduced"` on each root.

## Frontend's connection

| Input | From |
| --- | --- |
| Ballot shown | `phase.kind` `JAIL_VOTE` or `CAPTAIN_ELECTION`, when the player opens it with the shell's Vote |
| `roster` | `identities`; `candidate` from `ballot.eligibleTargets`; `reason` only where the projection gives one |
| `own` | `ownBallot`, when its `phaseId` is the phase's |
| `mode` | `'open'` while `canVote`; `'cannot'` when the viewer is not in `ballot.eligibleVoters`; `'closed'` at 0 before the result |
| `runoff` | The runoff phase, with `lastTally.tiedSeatIds` |
| Result shown | `phase.kind` `VOTE_RESULT` with `lastTally`; `roster` with the closed vote's candidates |

**Captures:** take them from the deployed candidate, or under the production headers, at 390 × 844 and 430 × 932: each state above. Designer then gives visual acceptance in the PR.

## Integration's part

- **Admit the graph:** admit `vote/vote.mjs` and `vote/vote.css` with the kit's graph.
  - `phone-kit-art.mjs` is already the hosted game's.
  - The component has no pictures of its own beyond the portraits the crew bundle carries.
  - `preview/` and `review/` stay out.
- **The pinned pack:** `prototype/ui.mjs` and `kit.css` stay pinned for the Food release. The vote screens of `prototype/screens-vote.mjs` can later draw from this component.

## Not in this version yet

Listed, not omitted:

| What | Waiting on |
| --- | --- |
| The cells on the result's paper card: paper-shade cells, 74 px portraits and their padding, ink seat numbers, the chosen cell's #FBE7A1, "You" in the top-right beside the count. They draw in the kit's dark form today, and the names in the grid are dark on dark. | The kit (asked of the Lead): a `data-ms-surface="paper"` form, which the result's body already carries |
| The shell's cover layer, `slot('cover')`, where the result window mounts | The shell's next update (the Lead, #265) |
| The window's arrival | Motion & Cinematics |
| The threshold, zero-vote candidates and ineligibility reasons in the projection | Integration and Backend (questions 1–3 above) |

## Checks run on this version

- **Tests:**

  | Check | Result |
  | --- | --- |
  | `packages/design-tokens/test/vote.test.mjs` | 10 of 10: the runtime-safe graph, every style scoped (and kit controls only placed and sized), the pinned pack unchanged, the pack's words, no claim beyond the tally, each cell's rules, the sheet's footer, the inputs' refusals, the privacy rules and the check's record |
  | `npm run test:design` | 392 of 392 |
  | `npm run test:tooling` | 337 of 337 |
  | `check:toolchain`, `check:workspace`, `check:sources`, `typecheck` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |

- **`node design/tools/vote-check.mjs`:** recorded on `8530551`, with the source clean. It exits non-zero until the kit's paper cells land: the 7 result frames below.
  - **The setup:** the preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy, through the shared `design/tools/lib/component-check.mjs`. The headers' SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`, the same as the room scene's and the shell's.
  - **Captures:** 46 of 46 pass, each drawing what its state asks: every seat's cell state, the sheet's words and footer or the result's headline and line, and the room's crew behind.
    - Twenty states at 390 × 844 and 430 × 932.
    - Sheet 56's six at 320 × 568 with 200 % text.
  - **The lifecycle probe** (`preview/probe.mjs`): 11 of 11 checks pass.
    - **As the page comes (10):** select, refused, stale, focus, private, result, words, compact, dispose and motion.
    - **With the device's Reduce motion emulated (1):** motion.
  - **The agreement with the pinned pack** (`preview/agree.mjs`): 16 of 23 frames agree to within half a pixel.
    - **What is compared:** each frame drawn by the pack's own `screens-vote.mjs` beside the component, from the same fixtures: the words, each seat's state, note, count, "You" and mark, and the boxes of every part and badge.
    - **Agree:** all ten ballot frames at 390 × 844, and all six of sheet 56 at 320 × 568 with 200 % text.
    - **Differ in boxes only:** the seven result frames at 390 × 844. Each cell is 22 px taller, with the kit's 92 px portrait and padding against the paper card's 74 px, and "You" sits on the count, top-left. Not one word, state or count differs. Both wait on the kit's paper form; `vote.test.mjs` holds that list, which can only shrink.
  - **Page health:** no page errors and no failed requests. The one policy report is the known one, Zod's eval probe, which Zod catches and which the live game's own bundle also has.
  - **Where the record is:** the captures and `check.json` are in `review/`, with each check and what it saw.
- **Not run:** physical phones, Safari, screen readers, frame rate and the real app's connection.
