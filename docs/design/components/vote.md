# The ballot and its result window: Designer's runtime component

**Version:** `vote-0.1.0`. **Status (15 November 2026):** interface proposal, for review by the Lead Designer and then Frontend on #4. Nothing is built yet. It is stacked on the phone shell (#265) and the room scene (#261), whose `icons.mjs` it shares.

**What it is:** the phone's ballot during a Jail vote or a Captain election, and the five-second result window after it, as the phone pack draws them (sheets 35–38 and 56; #222 item 4). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers:**
- **The ballot** (sheets 35, 36, 56), in the shell's docked sheet:
  - the 3 × 3 roster, seat n always cell n; an empty cell for seats 8 and 9 in a 7- or 8-player match;
  - each cell's state: available, selected, your vote, faded (once a ballot is in), not available (with the note Frontend gives: "Injured", "In Jail", "Out", "Not in runoff");
  - "You" on this viewer's own cell;
  - above the roster: "You abstained", "Closed · result next", or "Eliminated players don't vote. You can still watch.";
  - the footer's words: Abstain and "Vote" / "Vote for Ava"; "Ballot registered", "Abstained", "Voting closed", "You can't vote";
  - a runoff ("Captain runoff", "Ava and Ben tied");
  - at large text, the roster as a list of whole names.
- **The result window** (sheets 37, 38, 56), over the stage, for the 5 s result:
  - the head on the pack's paper card: the art (`RESULT_ART`), the stamp and the headline:

    | Outcome | Stamp | Headline | Line under it |
    | --- | --- | --- | --- |
    | `CAPTAIN_ELECTED` | CAPTAIN (amber, gold head) | BEN IS CAPTAIN | 8 votes · 8 could vote |
    | `RUNOFF_REQUIRED` | RUNOFF | TIE · RUNOFF | 8 votes · 8 could vote |
    | `NO_CAPTAIN_ELECTED` | NO CAPTAIN | NO CAPTAIN | 0 votes · 8 could vote |
    | `PLAYER_JAILED` | JAILED (steel head) | GUS GOES TO JAIL | 7 votes · 4 needed of 8 |
    | `JAIL_FULL` | NO ROOM (steel head) | GUS CHOSEN · JAIL FULL | Chosen, but every Jail place is taken. Gus stays. |
    | `NO_JAIL_SELECTION` | NO ONE | NO ONE GOES TO JAIL | No one reached 4 votes. |

  - the roster: each candidate's count on the portrait's top-left corner, **0 shown as 0**, amber for the chosen or tied; the seat number beside the name; "You" top-right; seats that were not candidates faded with their note and no count;
  - each count shown once, as the badge; the cell's accessible name says "Player 7, Gus, 5 votes";
  - the foot: "Ballots stay private" and the round;
  - **compact** (the window under 14 of its own em: 320 px at 150 % and 200 %, 390 px at 200 %): the art and stamp step aside, the headline stops growing at 30 px, the whole window scrolls as one column with the foot, and the roster becomes a list of whole names with the count at the end (sheet 56).

**Not covered here:** the bars and the round button (Vote, Voted, the 5 s ring: the shell); the sheet's frame, title, close and footer buttons (the shell's sheet, to which this component gives the words); the motion of the window's arrival (Motion & Cinematics); the Release vote of the full game (no sheet).

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/`:

| Path | What |
| --- | --- |
| `vote/vote.mjs` | `mountBallot()`, `ballotSheet()`, `mountVoteResult()`, `resultWords()`, `checkBallot()`, `checkResult()`, `VOTE_VERSION`, `VOTE_WORDS` |
| `vote/vote.css` | Every style, scoped under `.ms-vote` |
| `vote/preview/` | Development only: the preview on the pack's synthetic fixtures inside the shell with the room scene, the probe (`probe.mjs`) and the agreement with the pack (`agree.mjs`) |
| `vote/review/` | The check's captures and `check.json` |
| `design/tools/vote-check.mjs` | The check: captures at 390 × 844 and 430 × 932 (and 320 × 568 at 200 %) under the production headers, the probe and the agreement |
| `packages/design-tokens/test/vote.test.mjs` | The unit test |

**Used unchanged:** `crewPortraitVariable` (as the shell), `RESULT_ART` from `apps/game/hosted/scene-drawing/phone-kit-art.mjs` (runtime-safe, already drawn by the pack), `icons.mjs`. **Waiting on:** the Lead's shared kit (`components/kit/`): the cell, the stamp, the pill and the control policy. Until it lands, only the interface and the preview's states are written; no control is styled.

## Mount, update and dispose

```js
import { mountBallot, ballotSheet, mountVoteResult } from '…/design/phone-ui/components/vote/vote.mjs';
import '…/design/phone-ui/components/vote/vote.css';

// The ballot: its frame is the shell's sheet; its body is this component.
shell.update({ sheet: ballotSheet(ballotInput) });          // { id: 'ballot', title, sub, close, detent: 'large', actions }
const ballot = mountBallot(shell.sheetBody, ballotInput, { onSelect });
ballot.update({ ...changes });   // each key given replaces that key; the rest stay
ballot.dispose();                // when the sheet closes or the phase ends

// The result: over the stage, above the room scene, for the 5 s result phase.
const result = mountVoteResult(shell.stage, resultInput);
result.update({ ...changes });
result.dispose();                // when the phase leaves VOTE_RESULT
```

Both are synchronous, keep no timers, and survive any number of updates. `suspend()` / `resume()` exist for symmetry with the shell; nothing runs between them.

**Open point for the Lead:** the result window sits over the stage, not in a sheet. Mounting it as the last child of `shell.stage` works with today's shell. A named overlay slot in the shell (`shell.slot('overlay')`) would keep the stage for the scene alone; that is the shell's change, so it is the Lead's call.

## Inputs

### The ballot

| Input | Audience | What |
| --- | --- | --- |
| `status` | Phone | `'live'`, `'stale'` or `'concealed'`, as the shell |
| `interactive` | Phone | `false`: no cell takes taps |
| `reducedMotion` | Phone | The game's Reduce motion; the device's is honoured as well |
| `viewer` | Phone | This phone's seat number, or `null`. A change drops this viewer's inputs unless the same update gives the new viewer's |
| `versions` | Public | The match's art versions, for the portraits |
| `kind` | Public | `'jail'` or `'captain'` |
| `runoff` | Public | `null`, or `{ tied: [seat, …] }`: "Captain runoff", "Ava and Ben tied" |
| `roster` | Public | `[{ seat, name, character, note, candidate, reason }]`, one per seat in the match (7–9). `seat` is the number, or the `'seat-n'` id (as the shell). `candidate`: in `ballot.eligibleTargets` (public). `note`: the public status Frontend words ("Injured", "In Jail", "Out"), or `null`. `reason`: an unavailable reason where the projection gives one, else `null` |
| `selected` | This viewer's | The seat picked and not yet sent, or `null`. Frontend holds it; the component only draws it |
| `own` | This viewer's | `null` (no ballot yet), `{ seat }` (sent), or `{ abstained: true }`, from `ownBallot` for this phase |
| `mode` | This viewer's | `'open'` (the `VOTE` offer is there), `'closed'` (the clock reached 0; result next) or `'cannot'` (this viewer may not vote: not in `ballot.eligibleVoters`) |
| `busy` | This viewer's | `'vote'` or `'abstain'` while that request is sending, else `null` |

**Each cell, from these inputs alone:**
- **available:** a candidate, `mode: 'open'`, no ballot sent; **selected** when it is `selected`;
- **not available** (dimmed, focusable, `aria-disabled`): not a candidate, while the ballot is open. Its note is `reason`; else, in a runoff, "Not in runoff" (the runoff's pair is the server's `runoff.tied`); else the public `note`; else "Not available now";
- **your vote:** the seat in `own`; **faded:** every other cell once a ballot is sent, the vote is closed, or this viewer can't vote. A faded non-candidate keeps its note.

`ballotSheet(input)` returns the shell's `sheet` input with the pack's words: title "Jail vote", "Captain election" or "Captain runoff"; sub "7 players" / "8 players" under 9, or the runoff's tie; and the actions:
- open, no ballot: Abstain (`id: 'abstain'`, secondary) and Vote (`id: 'vote'`, primary), Vote unavailable until a seat is selected, then "Vote for Ava";
- sent: one unavailable "Ballot registered" with a check; abstained: "Abstained"; closed: "Voting closed"; cannot: "You can't vote".

The footer's taps arrive through the shell's `onSheetAction('abstain' | 'vote', 'ballot')`. Frontend sends `VOTE` with `selected` or `null`.

### The result window

| Input | Audience | What |
| --- | --- | --- |
| `status`, `reducedMotion`, `viewer`, `versions` | As the ballot | Concealed, the window keeps the public totals and drops "You" |
| `tally` | Public | `lastTally` exactly as the projection gives it: `{ kind, outcome, counts, eligibleVoterCount, selectedSeatId, tiedSeatIds }`, with its `'seat-n'` ids. The component reads each id's seat number, as the shell's `seatNumber()` does; Frontend does not reshape it. `phaseId` is ignored |
| `roster` | Public | As the ballot's; `candidate` on each seat that could be chosen in that vote. No count is drawn on a non-candidate |
| `needed` | Public | The number of votes a Jail vote needed, for "4 needed of 8" and "No one reached 4 votes.", or `null` |
| `round` | Public | For the foot's "Round 3" |

`resultWords(input)` returns the stamp, the headline and its line, so the preview, the test and Frontend's screen-reader announcement use the same words.

**Questions (1 and 2 for Integration and Backend on #222; please don't infer):**
1. **The Jail threshold.** `lastTally` carries `eligibleVoterCount` but not the votes needed. The component will not work it out from the rules. With `needed: null`, the line reads "7 votes · 8 could vote" and `NO_JAIL_SELECTION` reads "No one was chosen."; the pack's words need the threshold in the projection.
2. **Candidates with no votes.** Item 4 asks for zero shown as 0. If `counts` leaves out a candidate with no votes, Frontend needs the closed vote's candidates (`ballot.eligibleTargets` of that phase) to mark `candidate: true`; the component draws 0 for a candidate missing from `counts`, and no count for a seat that was not a candidate.
3. **For the Lead: a non-candidate's note and T3.** The pack writes the public status ("Injured", "In Jail", "Out") under a cell that can't be chosen, and only there: an injured Eli has no note in the Jail vote, where he can be chosen, and "Injured" in the election, where he can't. The owner's T3 says the phone uses the server's reason or "Not available now", and never works a reason out from the rules. The component only prints what it is given: `reason`, the runoff's words, the public status, or "Not available now". Is the public status acceptable under T3 here, as a fact about the person rather than a reason? If not, Frontend passes `note: null` and the cell says "Not available now" until the projection carries reasons.

## Callbacks

| Callback | When |
| --- | --- |
| `onSelect(seat)` (ballot) | An available cell is tapped. Tapping the selected cell again reports it again; Frontend decides whether that clears it |
| `onFocusReturn()` (ballot) | The focused cell was removed (the roster changed): focus is on the ballot's root for Frontend to move on |

The result window has no controls and no callbacks. It shows no ballots: no list of who voted for whom, ever.

**The controls** follow the shell's policy: one delegated listener; an unavailable cell keeps its focus with `aria-disabled="true"` and its reason as its description; while `stale` every cell refuses taps, described by "Controls return when the match is current"; after a ballot is in, cells fade and refuse.

## States

| Sheet | State | Drawn |
| --- | --- | --- |
| 35 | Open, selected, sent, abstained, closed | As the table above |
| 36 | Election (9), runoff, 8 players, 7 players, can't vote | Empty cells are `aria-hidden` |
| 37 | Elected, runoff, no Captain | Gold, paper, paper heads |
| 38 | Jailed, Jail full, no one, 8 players | Steel, steel, paper heads |
| 56 | Each at 320 × 568, 200 % text | The list form; compact window |
| — | Reconnecting | Ballot: cells refused, look kept. Result: unchanged (public) |
| — | Concealed | Ballot: nothing (no names, picks or own ballot), nothing for a screen reader. Result: the public totals, without "You" |

**Privacy:** `selected`, `own`, `mode` and `busy` are this viewer's. Concealed, they are dropped and not kept for when the phone shows again; a change of `viewer` drops them unless the same update gives the new viewer's. The result window receives only the public tally.

**Motion:** a selected cell's ring and check (120 ms); nothing else of its own. The window's arrival belongs to Motion & Cinematics; under Reduce motion everything is still.

## Frontend's connection (proposed)

| Input | From |
| --- | --- |
| Ballot shown | `phase.kind` `JAIL_VOTE` or `CAPTAIN_ELECTION`, and the player opened it with the shell's Vote |
| `roster` | `identities`; `note` from the public status (Hospital, Jail, eliminated) |
| `candidate` | `ballot.eligibleTargets` (public); for the result, the closed vote's |
| `reason` | The projection's unavailable reason, where it gives one; none today |
| `own` | `ownBallot` when its `phaseId` is the phase's |
| `mode` | `'cannot'` when the viewer is not in `ballot.eligibleVoters`; `'closed'` at 0 before the result |
| Result shown | `phase.kind` `VOTE_RESULT` with `lastTally` |

## Evidence planned

The preview inside the shell with the room scene; the probe (focus, refused taps, concealment and viewer change dropping picks, the result showing no ballots, dispose); `vote-check.mjs` capturing every sheet state at 390 × 844 and 430 × 932, and sheet 56's at 320 × 568 with 200 % text, under the production headers; the agreement with the pinned pack's `screens-vote.mjs` drawing (words, cell states, counts and positions); `vote.test.mjs`.
