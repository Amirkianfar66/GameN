# The Hacker's Scan and final Code: Designer's runtime component

**Version:** `hacker-0.1.0`, proposed. **Status (16 November 2026):** the interface the Lead Designer approved on 16 November, with the answers to Q1–Q4 and three notes (below). It is for Frontend's review on #4 before it is built. Nothing here is built yet; it is not in the game, and it is not a release.

**What it is:** the Hacker's own phone during Scan and the final Code, as the phone pack draws them: sheet 42 and the pack's own `scan()` and `code()` (`design/phone-ui/prototype/screens-more.mjs`). It is #222 items 14 and 15:

> 14. **Hacker: Scan** (sheet 42). Today: choosing whom to scan opens the whole board, and the guess is three plain buttons. Drawn: the room stays, with a Scan bar. Then the person and the guess are on one card.
>
> 15. **Hacker: final Code** (sheet 42): the nine portraits with names, marked Pick 1–4, instead of nine "Player n" buttons.

**Stacked on Actions (#273),** as the private talk (#293) is. The results are play-parts' notice, which is on Actions' branch, and that branch carries the phone shell at `f04ab116` (`phone-shell-0.2.7`, `component-kit-0.6.1`). The Lead approved the shell's branch as the base (Q4); the change of base is with the Lead.

## The pack's eight frames

Sheet 42 draws five of them. The pack's code draws all eight, and the agreement compares each, with no word amended.

| Frame | On sheet 42 | What the pack draws |
| --- | --- | --- |
| Scan · choose | Yes | The room stays. The shell's target bar: the Scan icon, "Scan", "Choose a player in your room", and Cancel. The room scene rings the people the offer gives |
| Scan · guess | Yes | A sheet, "Scan · Only on this phone", no ✕. The target's portrait, "Scan Gus" and "Guess a side. A wrong guess also blocks your next round."; Blue, Red and Alien as one radio group. Cancel and Scan |
| Scan · matched | Yes | The MATCHED stamp (amber), "Gus · Blue guess", and a row: the Code icon on paper, "In the Code", "Yes". Done |
| Scan · no match | No | The NO MATCH stamp, "Gus · Red guess", and a row: the lock on steel, "Scan", "Blocked in Round 4". Done |
| Code · pick | No | A large sheet, "Final Code · Only on this phone", no ✕. The nine portraits with names in the 3 × 3; each pick selected, with a check and "Pick 1"–"Pick 4"; "You" on this phone's own seat. "Choose four players. Order doesn't matter." Next |
| Code · four players | Yes | The same grid. "One attempt for the whole match. It can't be retried." Back and Submit Code |
| Code · correct | Yes | The CODE CORRECT stamp (amber), "Hack Spaceship is unlocked" and "Using it is a separate action on your turn". Done |
| Code · wrong | No | The CODE WRONG stamp, "Your one attempt is used" and "Scan stays available". Done |

## Built on, not redrawn

- **The phone shell** (#265): the sheet's frame (title, sub, no ✕, the large detent for the Code), its footer with each button's busy state and the local actions, the target bar with its Cancel (T2), the reconnecting banner. This component fills the sheet's body and gives the frame's words.
- **The room scene** (#261): the rings on the people Scan reaches and on the one picked (`targets: { seats, picked }`), as Actions' targets.
- **The kit** (`component-kit-0.6.1`): who (the target's 64 px portrait and words), the cells and the 3 × 3 (the Vote ballot's), the segmented control, the stamp, the row and list, the group note, the inline error, and the control policy. The shell draws the buttons.
- **My parts module** (`play-parts-0.1.1`, L2): the notice, which draws the four results, as its header already lists ("Scan and the Code's results, 42").
- **Actions** (`actions-0.1.0`): the Scan and Final Code tiles start them; sheet 45's "Outcome unknown" (`mountOutcomeUnknown`) says when no answer came: "Scan Gus was sent, but no answer came back." and "Final Code was sent, but no answer came back."

**Not in this component:**
- Hack Spaceship, once unlocked: Actions' tile and its check (L7).
- The other phones and the shared display: they never draw any of these parts (below).

## Interface

```js
import { scanBar, scanSheet, codeSheet, mountScanGuess, mountScanResult, mountFinalCode, mountCodeResult, HACKER_VERSION }
  from 'design/phone-ui/components/hacker/hacker.mjs';
// with design/phone-ui/components/hacker/hacker.css, which imports the kit's and the parts' styles
const part = mountScanGuess(shell.sheetBody, input, handlers);
// → { element, update(partial), suspend(), resume(), dispose() }
```

Each part is mounted in the shell's `sheetBody` for its step, as Actions' are, with a pure helper for the shell's words.

| Part | Frame | Inputs (all this viewer's) | Callbacks |
| --- | --- | --- | --- |
| `scanBar()` | Scan · choose | — | — (the target bar's Cancel is the shell's `onCancelTarget`) |
| `mountScanGuess` + `scanSheet({ step: 'guess', guess, phase })` | Scan · guess | `target`, `guess`, `phase`, `error` | `onGuess(side)`; Cancel and Scan through the shell's `onSheetAction` |
| `mountScanResult` + `scanSheet({ step: 'result' })` | Scan · matched, no match | `target`, `guess`, `matched`, `inCode`, `blockedRound` | — (Done through the shell) |
| `mountFinalCode` + `codeSheet({ step, count, phase })` | Code · pick, four players | `people`, `picks`, `step`, `phase`, `offered`, `error` | `onPick(seat)`; Next, Back and Submit Code through the shell |
| `mountCodeResult` + `codeSheet({ step: 'result' })` | Code · correct, wrong | `correct` | — (Done through the shell) |

**Every part** also takes the phone's `status` (`'live'`, `'stale'` or `'concealed'`), `interactive`, `reducedMotion` and `versions`, this viewer's `viewer` (the seat), and `onFocusReturn(detail)`, as Actions' parts do. Each input has a checker (`checkScanGuess()` and so on). An unknown key is an error. `update(partial)` changes only what it is given; `dispose()` removes the part, and afterwards `update()` does nothing.

### Scan

- **`scanBar()`** gives the shell's `target`: `{ icon: 'scan', title: 'Scan', sub: 'Choose a player in your room' }`. Frontend gives the room scene the SCAN offer's `targetSeatIds` as its targets; a tap on one of them opens the guess.
- **`mountScanGuess(body, { target, guess, phase, error })`:**
  - `target`: `{ seat, name, character }`. Who draws the portrait, "Scan Gus" and the pack's line.
  - `guess`: `'Blue'`, `'Red'`, `'Alien'` or `null`. The three are one radio group, "Guess", in that order; the given one is chosen. The pack draws Blue chosen; with `null`, none is.
  - `onGuess(side)` reports a tap. The guess is Frontend's.
  - `phase`: `'ready'` or `'sending'`. While it sends, the guess takes no taps.
  - `error`: Frontend's words when the server did not accept it: the kit's inline note, as Actions' check (L6).
- **`scanSheet({ step: 'guess', guess, phase })`:** "Scan", "Only on this phone", no ✕.
  - Cancel (local) and Scan, with the Scan icon.
  - Scan is off until a guess is given. While it sends, it is busy and says "Scanning…" (Q3).
- **`mountScanResult(body, { target, guess, matched, inCode, blockedRound })`:** from the projection's latest `knowledge.scanResults` entry.
  - Matched: MATCHED (amber), "Gus · Blue guess", and the row "In the Code · Yes", or "No" when `inCode` is `false` (Q2).
  - Not matched: NO MATCH, "Gus · Red guess", and the row "Scan · Blocked in Round 4" from `blockedRound` (`abilities.scanBlockedThroughRound`). With no round, the row is left out.
  - It reads as it opens (the notice's `status`).
- **`scanSheet({ step: 'result' })`:** the same frame, with Done (local).

### The final Code

- **`mountFinalCode(body, { people, picks, step, phase, offered, error })`:**
  - `people`: the match's seats, `[{ seat, name, character }]`. Seat n is cell n; in a 7- or 8-player match the rest are empty, as the kit's 3 × 3 draws them.
  - `picks`: up to four seats, in the order picked. Each is selected, with a check and "Pick 1"–"Pick 4". The rest stay available at four picks: the pack doesn't dim them (Q1).
  - "You" on this phone's own seat.
  - `offered`: the SUBMIT_CODE offer's `targetSeatIds`. A seat not offered says "Not available now" (T3) and takes no tap. Today's engine offers every seat.
  - `onPick(seat)` reports a tap on an offered cell, picked or not, the seat as Frontend gave it. `picks` is Frontend's, and so is whether a fifth tap does anything (Q1).
  - `step`: `'pick'` or `'confirm'`; the line under the grid is the pack's for each. In `'confirm'` the cells take no taps: Back returns to the picks.
  - `phase` and `error`: as Scan's.
- **`codeSheet({ step, count, phase })`:** "Final Code", "Only on this phone", the large detent, no ✕.
  - `'pick'`: Next (local), off until `count` is four.
  - `'confirm'`: Back (local) and Submit Code, with the Code icon. While it sends, Submit Code is busy and says "Submitting…" (Q3), and Back is off.
  - `'result'`: Done (local).
- **`mountCodeResult(body, { correct })`:** CODE CORRECT or CODE WRONG, with the pack's two lines. Frontend gives `correct` from `abilities.shipHackUnlocked` once `abilities.codeAttempted` is true. It reads as it opens.

## The steps, and who draws what

| Step | The shell | The room scene | This component |
| --- | --- | --- | --- |
| The Scan tile (Actions' `onTile('SCAN')`) | `target: scanBar()`, with Cancel | `targets: { seats: offer.targetSeatIds, picked: [] }` | — |
| A person tapped | `sheet: scanSheet({ step: 'guess', guess, phase })` | `targets: { seats: [target], picked: [target] }` | `mountScanGuess` |
| Scan accepted | `sheet: scanSheet({ step: 'result' })` | as above | `mountScanResult` |
| The Final Code tile (`onTile('SUBMIT_CODE')`) | `sheet: codeSheet({ step: 'pick', count })` | — | `mountFinalCode` |
| Next | `sheet: codeSheet({ step: 'confirm', phase })` | — | `update({ step: 'confirm' })` |
| Submit Code accepted | `sheet: codeSheet({ step: 'result' })` | — | `mountCodeResult` |
| No answer, for either command | Actions' `unknownSheet()` | — | Actions' `mountOutcomeUnknown({ type: 'SCAN', targets: [target] })` or `({ type: 'SUBMIT_CODE' })` |

**The Scan tile in Actions** (the Lead's note 2): `targetBar({ type: 'SCAN' })` will refuse in #273, naming this component's `scanBar()`. The bar's words then exist once, here, and neither component imports the other.

## Undrawn states

1. **"In the Code · No"** (Q2): matched, not in the Code. The same row, with "No".
2. **Sending** (Q3): "Scanning…" and "Submitting…", as Actions' "Registering…".
3. **No guess yet:** none of the three chosen, and Scan off.
4. **Not accepted:** the kit's inline note with Frontend's words, under the guess or under the grid; Scan or Submit Code again while it is still offered (L6).
5. **No answer:** Actions' sheet 45 (above).
6. **A seat not offered** for the Code: "Not available now" (T3).
7. **No match with no round blocked:** the row is left out.
8. **While sending:** the guess and the cells take no taps; Cancel and Back are off. The answer comes straight back to the same sheet. *(For the Lead: proposed here; the pack draws no sending frame.)*
9. **The confirm step:** the cells take no taps until Back. *(For the Lead: proposed here.)*
10. **Reconnecting:** the guess and the cells take no taps. Cancel, Next, Back and Done only change this phone, so they are local and still work; Scan and Submit Code stand for commands, and the shell refuses them with the banner's words.
11. **The Largest text and 320 × 568:** the 3 × 3 becomes the kit's list of whole names, as the Vote ballot's; the three guesses stay one row.

## Privacy and audiences

Everything here is the Hacker's own phone's (the Lead's note 3):

- A guess, a pick, a result, `inCode` and the blocked round exist on the Hacker's phone only.
- **None of them reaches an attribute, the console, the shell's `onLayout`, or any callback but `onGuess` and `onPick`.** The three guesses are kept by their place, not their side. A cell's accessible name is its player number and name, and its pressed state says whether it is picked.
- **Concealed, or for a new viewer,** every part drops its inputs and empties itself. Nothing comes back until it is given again.
- **Another phone's view and the shared display draw none of these parts:** they get the shell and the room only. The contract already keeps Scan's and the Code's knowledge off every other role's view.

## Accessibility

- The guess is one radio group, "Guess"; each option is a radio with its word.
- Each cell is a toggle button: "Player 2, Ben", pressed when picked, "You" on this phone's own. A seat not offered is refused by the control policy, with its line.
- Each result reads as it opens (`role="status"`).
- A focused control keeps its element and its focus through updates. When it goes, the focus returns to the part's root, and `onFocusReturn` reports the control's place, never a guess or a pick.

## The Lead's answers (16 November)

- **Q1. A fifth pick: Frontend's.** The component draws `picks` and `offered` as given; the unpicked cells stay available at four picks; a tap on a picked cell reports `onPick` too, so Frontend can unpick it.
- **Q2. "In the Code · No":** yes, the same row with "No", from `inCode`. Recorded as an undrawn state.
- **Q3.** "Scanning…" and "Submitting…", as Actions' "Registering…".
- **Q4.** Its own draft PR, stacked like Actions. *(The base is now Actions' branch, for the notice: with the Lead.)*
- **Note 1. The sheets as the pack draws them:** Scan has no ✕; its footer is Cancel and Scan, then Done. The Final Code: Next, then Back and Submit Code, then Done. Both subs read "Only on this phone". The agreement holds the sheet frames to the pack's.
- **Note 2. The Scan tile:** wired to `scanBar()` in #273, with no second copy of the target bar (above).
- **Note 3. Privacy:** as above, with a probe check that another phone's view and the shared display draw none of these parts.

## How it will be checked

- **Captures** under the production headers, at 390 × 844 and 430 × 932, plus 320 × 568 at the Largest text.
- **A lifecycle probe:**
  - the guess;
  - the picks, kept in order;
  - the refusals;
  - the result words;
  - privacy, leaks and audience;
  - the inputs;
  - focus;
  - the text sizes;
  - dispose;
  - motion, with the game's and the device's Reduce motion.
- **Agreement with the pack's eight frames,** each part to within half a pixel: the target bar, the sheet frames and footers, who, the guesses, the cells, the notes, the stamps, the lines and the rows.
- **An owner test page,** sent with the PR.

## Files (to be built)

Designer's, runtime-safe, in `design/phone-ui/components/hacker/`: `hacker.mjs`, `hacker.css`, `preview/` (development only) and `review/`. Also `design/tools/hacker-check.mjs`, `packages/design-tokens/test/hacker.test.mjs`, and this page.
