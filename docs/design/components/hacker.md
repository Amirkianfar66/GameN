# The Hacker's Scan and final Code: Designer's runtime component

**Version:** `hacker-0.1.1`. **Status (16 November 2026):** built to the interface the Lead Designer approved on 16 November, with the answers to Q1–Q4 and Q-a, the three notes and the two details below, and posted by the Lead on #4 for Frontend. In 0.1.1, CODE WRONG says the pack's "Scan stays available" again: the owner decided on 16 November that the Hacker keeps Scan after a wrong final Code (below). Built without waiting for Frontend, as the owner decided on 16 November (recorded on #280). Frontend has not connected it: it is not in the game yet, and Integration first admits its files to the hosted build. It is not a release.

**What it is:** the Hacker's own phone during Scan and the final Code, as the phone pack draws them: sheet 42 and the pack's own `scan()` and `code()` (`design/phone-ui/prototype/screens-more.mjs`). It is #222 items 14 and 15:

> 14. **Hacker: Scan** (sheet 42). Today: choosing whom to scan opens the whole board, and the guess is three plain buttons. Drawn: the room stays, with a Scan bar. Then the person and the guess are on one card.
>
> 15. **Hacker: final Code** (sheet 42): the nine portraits with names, marked Pick 1–4, instead of nine "Player n" buttons.

**Stacked on Actions (#273),** as the private talk (#293) is, at `46a73cdc`, which carries the phone shell at `0e5a0b8a` (`phone-shell-0.2.8`, `component-kit-0.8.0`). The Lead kept this base: the results were to be play-parts' notice, which is on Actions' branch, and a branch is not rewritten. Since kit 0.7.0 the notice is the kit's, so the component is built on the kit alone and imports neither Actions nor play-parts.

## The pack's eight frames

Sheet 42 draws five of them. The pack's code draws all eight, and the agreement compares each as the pack draws it, with no word amended and nothing taken out.

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
- **The kit** (`component-kit-0.8.0`): who (the target's 64 px portrait and words), the cells and the 3 × 3 (the Vote ballot's), the segmented control, the stamp, the row and list, the group note, the inline error, the control policy, and the notice (0.7.0, from my parts module), which draws the four results, with Scan's row as its `extra`. The shell draws the buttons.
- **Actions** (`actions-0.1.0`): the Scan and Final Code tiles start them, and its `targetBar()` refuses both, naming this component's helpers. Sheet 45's "Outcome unknown" (`mountOutcomeUnknown`) says when no answer came: "Scan Gus was sent, but no answer came back." and "Final Code was sent, but no answer came back."

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
- **`mountCodeResult(body, { correct })`:** CODE CORRECT with the pack's two lines, or CODE WRONG with "Your one attempt is used" and "Scan stays available" (the owner's decision, below). Frontend gives `correct` from `abilities.shipHackUnlocked` once `abilities.codeAttempted` is true. It reads as it opens.

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

**The Scan tile in Actions** (the Lead's note 2): `targetBar({ type: 'SCAN' })` refuses in #273 (`81d7ae59`), naming this component's `scanBar()`, and `SUBMIT_CODE` names `codeSheet()` and `mountFinalCode()`. The bar's words exist once, here, and neither component imports the other.

## Undrawn states

1. **"In the Code · No"** (Q2): matched, not in the Code. The same row, with "No".
2. **Sending** (Q3): "Scanning…" and "Submitting…", as Actions' "Registering…".
3. **No guess yet:** none of the three chosen, and Scan off.
4. **Not accepted:** the kit's inline note with Frontend's words, under the guess or under the grid; Scan or Submit Code again while it is still offered (L6).
5. **No answer:** Actions' sheet 45 (above).
6. **A seat not offered** for the Code: "Not available now" (T3).
7. **No match with no round blocked:** the row is left out.
8. **While sending:** the guess and the cells take no taps; Cancel and Back are off. The answer comes straight back to the same sheet, as Pass's Cancel works. *(The Lead, 16 November: yes.)*
9. **The confirm step:** the cells take no taps until Back, and they are not dimmed: the pack draws the grid as it was. *(The Lead, 16 November: yes.)*
10. **Reconnecting:** the guess and the cells take no taps. Cancel, Next, Back and Done only change this phone, so they are local and still work; Scan and Submit Code stand for commands, and the shell refuses them with the banner's words.
11. **The Largest text and 320 × 568:** the 3 × 3 becomes the kit's list of whole names, as the Vote ballot's; the three guesses stay one row. The sheet's body scrolls, as the handoff says, so the guesses, the list and Scan's row can be below the fold, whole.
12. **No viewer** (the shared display): every part draws nothing.

## Privacy and audiences

Everything here is the Hacker's own phone's (the Lead's note 3):

- A guess, a pick, a result, `inCode` and the blocked round exist on the Hacker's phone only.
- **None of them reaches an attribute, the console, the shell's `onLayout`, or any callback but `onGuess` and `onPick`.** The three guesses are kept by their place, not their side. A cell's accessible name is the pack's own ("Player 2, Ben, Pick 1"), read through `aria-labelledby` from visually hidden words in the page, so the pick is in no attribute's value; its pressed state says whether it is picked.
- **Concealed, or for a new viewer,** every part drops its inputs and empties itself, the Code's visually hidden names with the rest. Nothing comes back until it is given again.
- **Another phone's view and the shared display draw none of these parts:** they get the shell and the room only, and a part given no viewer draws nothing. The contract already keeps Scan's and the Code's knowledge off every other role's view.

## Accessibility

- The guess is one radio group, "Guess"; each option is a radio with its word.
- Each cell is a toggle button named as the pack names it ("Player 2, Ben, Pick 1"; "Player 3, Cleo, Not available now"), pressed when picked, "You" on this phone's own. A seat not offered is refused by the control policy.
- Each result reads as it opens (`role="status"`).
- A focused control keeps its element and its focus through updates. When it goes, the focus returns to the part's root, and `onFocusReturn` reports the control's place, never a guess or a pick.

## Motion

- **Each result's stamp snaps in** (Q-a): MATCHED, NO MATCH, CODE CORRECT and CODE WRONG, as REGISTERED does in the handoff's motion table. Over 120 ms, from transparent at 1.3 times its size, with the kit's ease. The result's notice carries the component's own class (`ms-hk-result`), under which the kit's stamp animates, as Actions' After Register does.
- **With Reduce motion,** the game's (`reducedMotion`, which sets `data-motion="reduced"` on the part's root) or the device's, the stamp is there at once.
- Nothing else of the component's moves. The sheet's slide is the shell's.

## The Lead's answers and the owner's decision (16 November)

- **Q1. A fifth pick: Frontend's.** The component draws `picks` and `offered` as given; the unpicked cells stay available at four picks; a tap on a picked cell reports `onPick` too, so Frontend can unpick it.
- **Q2. "In the Code · No":** yes, the same row with "No", from `inCode`. Recorded as an undrawn state.
- **Q3.** "Scanning…" and "Submitting…", as Actions' "Registering…".
- **Q4.** Its own draft PR, stacked like Actions. The Lead kept it on Actions' branch (#273), where it opened.
- **Note 1. The sheets as the pack draws them:** Scan has no ✕; its footer is Cancel and Scan, then Done. The Final Code: Next, then Back and Submit Code, then Done. Both subs read "Only on this phone". The agreement holds the sheet frames to the pack's.
- **Note 2. The Scan tile:** `targetBar({ type: 'SCAN' })` refuses in #273 and names `scanBar()`, with no second copy of the target bar (above).
- **Note 3. Privacy:** as above, with a probe check that another phone's view and the shared display draw none of these parts.
- **The hidden names:** the Code's visually hidden names leave the page with the rest when it is concealed or handed to another viewer. The probe's leak check counts them in the page while the Code is drawn, then after each.
- **Q-a. The results' stamps snap in:** MATCHED, NO MATCH, CODE CORRECT and CODE WRONG snap in as REGISTERED does, 120 ms, and are there at once with Reduce motion (above). The Lead added them to the handoff's motion table (`b3e5823e`).
- **Scan after a wrong Code.** The owner decided on 16 November, on the Lead's recommendation, that the Hacker keeps Scan after a wrong final Code, under its usual cooldown and limits. The wrong Code still can't be retried and never unlocks Hack Spaceship, and nothing new is added. The Lead recorded it in [`docs/design/owner-decisions.md`](https://github.com/Amirkianfar66/GameN/blob/5f98b5383addabf03c4c38b55a3621cb2240df9c/docs/design/owner-decisions.md#16-november-2026-the-hacker-keeps-scan-after-a-wrong-final-code) (#280 at `5f98b538`).
  - So CODE WRONG says the pack's two lines again, "Your one attempt is used" and "Scan stays available" (0.1.1), and the agreement compares CODE WRONG as the pack draws it.
  - Scan's tile still follows the projection's offer alone. The line states the decision; it never turns Scan on.
  - The rule itself goes to Integration and Backend (CODE-OPEN-02 in the planet-navigation overlay). NO MATCH keeps "Scan · Blocked in Round 4", a confirmed rule (CODE-03).
  - Before the decision, the Lead's Q-b had dropped the line while the rule was open (0.1.0).

## Found while building

For the Lead. Nothing here changes the agreed interface:

- **On the kit alone.** Kit 0.7.0 took the notice, with `extra` for a node after its lines, so Scan's row is the notice's `extra`, as the pack's `.registered` holds its list. The component needs nothing else from play-parts and does not import it.
- **The cells' names.** The pack names a cell "Player 2, Ben, Pick 1" in its `aria-label`, and note 3 keeps a pick out of every attribute. The same words are kept as visually hidden text that each cell points at (`aria-labelledby`). A screen reader hears the pack's name, and no attribute's value holds a pick. The agreement compares each cell's name with the pack's `aria-label`; the probe's leak check fails if a pick goes back into `aria-label` (tried).
- **The Code at the larger text.** The pack's `code()` puts its 3 × 3 outside its `.grid-wrap`, so the pack has no list form for it. The kit's 3 × 3, as the Vote ballot's, becomes a list of whole names under 13 em, as sheet 53's larger-text lists do. At the Standard text they agree.
- **The portrait in who.** `scan()` calls `pt(…, 56)`, but the pack's own `.confirm-who .pt` rule draws it at 64 px, as the private talk found. Who draws 64, and the agreement measures it.
- **The results' motion and CODE WRONG's second line** were questions here. The Lead's Q-a and the owner's decision (above) answer them.
- **A result is measured at rest.** The probe's text check waits for the stamp's snap to finish before it measures a result, as the agreement and the captures do: mid-snap, the stamp is 1.3 times its size.

## Checks run on this version

- **Tests:**

  | Check | Result |
  | --- | --- |
  | `packages/design-tokens/test/hacker.test.mjs` | 8 of 8: the runtime-safe graph on the kit alone (no other component, no play-parts); every style scoped at two classes, with no colour of its own, the kit's parts placed only inside the component's own, and one motion, the results' stamp snap (120 ms, stopped by the game's and the device's Reduce motion; Q-a); the pinned pack unchanged; the pack's words and the decisions' additions, with "Scan stays available" the pack's and the component's again (the owner's decision); the inputs' checks, normalization and privacy rules; every preview state a valid input and the eight compared frames; the target bar and the sheets' frames; and the check's record, with Q-a's snap, CODE WRONG's two lines, no frame with anything taken out, and the hidden names leaving the page |
  | `npm run test:design` | 409 of 409 |
  | `npm run test:tooling` | 356 of 356 |
  | `npm run build`, `check:toolchain`, `check:workspace`, `check:sources`, `typecheck` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |

- **`node design/tools/hacker-check.mjs`:** recorded on `32b830b3` (hacker-0.1.1, with #273's `46a73cdc` merged in as `52cacbfa`), with the source clean.
  - **The setup:** the preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy, through the shared `design/tools/lib/component-check.mjs`. The headers' SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`, the same as the other components'. Each part is mounted in the shell's sheet body, over the room scene, as Frontend would.
  - **Captures:** 46 of 46 pass, each drawing what its state asks: the part, the sheet, its sub and footer and which buttons are off, the target bar and the people Scan reaches, who, the guesses and which is chosen, the picks and their order, "You", the seats not offered, the empty seat, the cells to a row, the line, the error, the stamp, the lines and the row, the banner, and the room's crew behind.
    - 20 states at 390 × 844 and 430 × 932;
    - 320 × 568 at the Standard text (the 3 × 3), Large text at 390 × 844, and the Largest at 320 × 568 for the guess, the Code (a list), a result and the Code's outcome.
    - Concealed, no private word is in the page.
  - **The lifecycle probe** (`preview/probe.mjs`): 15 of 15 checks pass.
    - **As the page comes (14):** guess, picks, refused, results, words, footer, audience, leaks, inputs, private, focus, text, dispose and motion.
      - **leaks** also counts the Code's visually hidden names: in the page while the Code is drawn, gone once it is concealed or handed to another viewer (14 cases).
      - **motion:** each result's stamp has one animation, `ms-hk-stamp-in`, of 120 ms, and none with the game's Reduce motion; the guess and the Code have none.
    - **With the device's Reduce motion (1):** motion, with no animation anywhere.
  - **Agreement with the pinned pack's own frames** (`preview/agree.mjs`): 8 of 8, with no differing part, every part to within half a pixel. It compares:
    - the top bar, and the sheet's title, sub, close, place, body and footer (words, boxes, looks);
    - the target bar and its Cancel;
    - who: its words, box, portrait, title and sub;
    - the guesses: the radio group, each option's words, choice, box and look;
    - the 3 × 3: each cell's state, pressed state, words, check, "You", accessible name, box and look, with its portrait, name and note;
    - the line under the grid;
    - each result's stamp, tone, lines and row, with the row's icon and tint.

    Every frame is compared as the pack draws it, CODE WRONG with both its lines.
  - **Against `c83caa3b`'s record** (0.1.0):
    - The only recorded field that changed is CODE WRONG's lines, now "Your one attempt is used" and "Scan stays available", at both sizes. So "Scan" is again among the words that capture shows on the Hacker's own phone.
    - The probe's 15 checks and the agreement's 8 pass as before.
    - 2 captures are unchanged, and CODE WRONG's two differ by the added line.
    - #273's head brings the room scene behind the sheet from 0.3.0 to 0.5.0, which keeps the crew's name tags whole and apart at the larger text (#222 item 34). So the larger-text captures and the small phone's (`largest-guess`, `largest-result`, `largest-outcome`, `largest-code` and `small-code` at 320 × 568, `large-guess` at 390 × 844) differ behind the glass sheet, where the tags moved, by up to 16,339 pixels.
    - The rest differ by at most 70 pixels, in the room's ambient motion and the sending spinner's angle.
  - **Before:** `c83caa3b` (0.1.0, Q-b's one line). Against `3480eb27`'s record, the only recorded field that changed was CODE WRONG's lines; the result captures differed inside the stamp only, by at most 465 pixels (its anti-aliasing after the snap).
  - **The checks bite:**
    - A 4 px change to the guesses' margin, a changed word in a result's line, and "Pick #1" each fail the agreement.
    - A guess in a data attribute and a pick back in `aria-label` each fail the leak check.
    - The Code's hidden names kept when concealed fail the leak check (and audience and private).
    - A 200 ms snap, or a snap without the game's Reduce motion rule, fails the motion check.
    - CODE WRONG without "Scan stays available" fails the agreement (tried on 0.1.1).

    Each was tried, then undone.
- **Not run:** physical phones, Safari, screen readers, frame rate, the real app's connection.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/hacker/`:

| Path | What |
| --- | --- |
| `hacker.mjs` | `HACKER_VERSION`, `SIDES`, `HACKER_WORDS`; each part's defaults and check (`SCAN_GUESS_DEFAULTS` and `checkScanGuess()`, `SCAN_RESULT_DEFAULTS` and `checkScanResult()`, `FINAL_CODE_DEFAULTS` and `checkFinalCode()`, `CODE_RESULT_DEFAULTS` and `checkCodeResult()`); the shell's words (`scanBar()`, `scanSheet()`, `codeSheet()`); and the four parts |
| `hacker.css` | The parts' own layout and the results' stamp snap, scoped under `.ms-hacker`. It imports the kit's styles |
| `preview/` | Development only: the preview on the pack's synthetic fixtures (`states.mjs`: 26 states), in the shell over the room scene; the lifecycle probe (`probe.mjs`); the agreement with the pack (`agree.mjs`) |
| `review/` | The check's captures (JPEG at 2× pixels) and `check.json` |

Also `design/tools/hacker-check.mjs` (on the shared `component-check.mjs`), `packages/design-tokens/test/hacker.test.mjs`, and this page.

**Used unchanged:** `icons.mjs`, `kit/kit.mjs` and `kit.css`, and the crew portraits through the kit. Nothing imports a prototype, preview, fixture or development module.
