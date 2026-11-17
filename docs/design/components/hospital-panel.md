# The Hospital panel: Designer's runtime component

**Version:** `hospital-panel-0.1.0`. **Status (17 November 2026):** built to the interface the Lead Designer approved on 16 November, with the answers to Q1–Q6 and the privacy note below. The Lead accepted it at `3cb149b4` on 17 November, with one fix to the preview's sample words for a rejection (below). The owner approved its branch, `claude/designer-hospital-panel`, on 16 November ("All three branches", recorded by the Lead on #280 at `d54c15bd`). Frontend has not connected it: it is not in the game yet, and Integration first admits its files to the hosted build. It is not a release.

**What it is:** the patient's own Hospital panel, as the phone pack draws it on sheets 23 and 43 and in its own `panel()` (`design/phone-ui/prototype/screens-more.mjs`). A patient keeps the room view and has the panel. They get one attempt in the match to enter the Doctor's player number. A correct number reserves one of the two shared injections and queues a request for Rescue; a wrong one uses the attempt. #222 item 1 names the Hospital's own room control, "Hospital panel", which opens it; the panel itself is part of #222's PHONE-PARITY.

**Sheet 43's rule:** "Patient-private. An empty injection pool must not confirm the Doctor's number." Its Unavailable frame: "Neutral words: no hint about the pool or the number."

**Stacked on the phone shell (#265)** at `bb567d7e` (`phone-shell-0.2.9`, `component-kit-0.8.0`, `room-scene-0.5.0`), as the Lead asked. It is built on the kit alone, as the Hacker is: it imports neither Actions nor play-parts nor any other component.

## The pack's six frames

The agreement compares all six as the pack draws them, with no word amended and nothing taken out.

| Frame | Sheet | What the pack draws |
| --- | --- | --- |
| Enter | 23, 43 | A large sheet, "Hospital panel", with the sub "Only on this phone" and ✕ (back to the room). The number display shows "_". Under it, the keypad: 1–9 in a 3 × 3, and the line "One attempt: the Doctor’s player number." No footer |
| Number entered | 23 | The display shows "3", key 3 is pressed (amber), and the footer has one button: "Submit 3", with the panel icon |
| Registered | 23, 43 | The REGISTERED stamp (amber), "Your request is queued for Rescue" and "Nothing happens until then". No footer |
| Wrong number | 43 | The WRONG NUMBER stamp (paper) and "Your attempt is used". No footer |
| Unavailable | 43 | The panel icon and "The panel is unavailable right now". No footer |
| Attempt used | 43 | The lock icon (filled) and "Your attempt is used". No footer |

## Built on, not redrawn

- **The phone shell** (#265): the sheet's frame (the title, the sub, ✕ as a local close, the large detent), its footer with the button's busy state, and the reconnecting banner. This component fills the sheet's body and gives the frame's words.
- **The kit** (`component-kit-0.8.0`): the notice (a stamp or an icon over its lines), the stamp, the group note, the inline error and the control policy. The display and the keys are this component's own: the pack's `.display-num` and `.keypad`, which no other part draws.
- **The room scene** (#261): the Hospital's own control, "Hospital panel" (the pack's `roomInteraction`), which opens the panel. So does the Panels tab's row, "Hospital panel · Patients only" (#296).
- **Actions** (#273): sheet 45's "Outcome unknown" when no answer comes (Q3, below).

## Interface

```js
import { panelSheet, mountPanelKeypad, mountPanelStatus, PANEL_WORDS, PANEL_RESULTS, HOSPITAL_PANEL_VERSION }
  from 'design/phone-ui/components/hospital-panel/hospital-panel.mjs';
// with design/phone-ui/components/hospital-panel/hospital-panel.css, which imports the kit's styles
const part = mountPanelKeypad(shell.sheetBody, input, handlers);
// → { element, update(partial), suspend(), resume(), dispose() }
```

Each part is mounted in the shell's `sheetBody` for its step, as the Hacker's are, with a pure helper for the shell's words.

| Part | Frames | Inputs (all this viewer's) | Callbacks |
| --- | --- | --- | --- |
| `mountPanelKeypad` + `panelSheet({ step: 'keypad', picked, phase })` | Enter, Number entered, and the undrawn sending and not-accepted states | `keys`, `picked`, `phase`, `error` | `onPick(seat)`; Submit through the shell's `onSheetAction('submit', 'hospital-panel')` |
| `mountPanelStatus` + `panelSheet({ step: 'status' })` | Registered, Wrong number, Unavailable, Attempt used, and the undrawn TREATED, NO EFFECT and DISCARDED | `result` | none: the sheet closes with ✕ |

**Every part** also takes the phone's `status` (`'live'`, `'stale'` or `'concealed'`), `interactive`, `reducedMotion` and `versions`, this viewer's `viewer` (the seat), and `onFocusReturn(detail)`, as Actions' and the Hacker's parts do. Each input has a checker (`checkPanelKeypad()`, `checkPanelStatus()`); an unknown key is an error. `update(partial)` changes only what it is given; `dispose()` removes the part, and afterwards `update()` does nothing.

### The keypad

- **`keys`:** the PANEL_CODE offer's `targetSeatIds`, in order, each as `{ seat, number }`: the seat in Frontend's own form, which `onPick` reports back, and the number on the key. The contract checks that they are exactly `seat-1`…`seat-N`, every original player's number, so the patient's own number and eliminated players' numbers are always there and hint at nothing. Up to nine; a number or a seat twice is an error.
- **Each number n is in place n of the 3 × 3,** at every player count. At 8 players, 9's place is empty; at 7, 8's and 9's are. An empty place is not a key (Q5).
- **`picked`:** a seat from `keys`, or `null`. The pick is Frontend's: a tap reports `onPick(seat)` and changes nothing until `picked` comes back. Then the display shows the number and the key is pressed. A tap on the picked key reports it too. The checker gives `picked` back as the matching key's seat, in the form the keys were given. A pick not among the keys is an error that names no number.
- **`phase`:** `'ready'` or `'sending'`. While Submit sends, the keys take no taps and the display keeps the number (Q1). Sending needs a pick.
- **`error`:** `{ text, detail }` or `null`: Frontend's words when the server did not accept it, as the kit's inline note under the line. The keypad and the pick stay (Q2). **Frontend's words for a rejection must not suggest that the number caused it:** a rejection is never about the number (a wrong number is accepted and recorded as WRONG NUMBER, and no injection is the uniform Unavailable), so words that send the patient back to their number would hint that it was wrong. The preview's sample is "The server did not accept it." with "Nothing was queued. Submit again." (the Lead, 17 November).
- **`panelSheet({ step: 'keypad', picked, phase })`:** `{ id: 'hospital-panel', title: 'Hospital panel', sub: 'Only on this phone', detent: 'large', close: true, actions }`. With no number picked, no footer. With one, `picked` being the number on the picked key: `[{ id: 'submit', label: 'Submit 3', kind: 'primary', icon: 'panel', busy: false }]`. While it sends, "Submitting…" and busy. Submit stands for the command, so the shell refuses it while reconnecting; ✕ is local and always closes.

### The status

- **`result`:** one of `PANEL_RESULTS`, or `null` (nothing drawn):

  | `result` | From the view | Drawn |
  | --- | --- | --- |
  | `'QUEUED'` | `abilities.panelRequest.status` | REGISTERED (amber) · "Your request is queued for Rescue" · "Nothing happens until then" |
  | `'WRONG'` | the same | WRONG NUMBER (paper) · "Your attempt is used" |
  | `'TREATED'` | the same | "TREATED" (amber) · "You were treated" · "Your attempt is used" |
  | `'NO_EFFECT'` | the same | "NO EFFECT" (paper) · "Your request had no effect" · "Your attempt is used" |
  | `'DISCARDED'` | the same | "DISCARDED" (paper) · "Your request was discarded" · "Your attempt is used" |
  | `'spent'` | `abilities.panelAttemptSpent` with no record (a historical version) | the lock (filled) · "Your attempt is used" |
  | `'unavailable'` | no PANEL_CODE offer, or the server's `NO_INJECTION` | the panel icon · "The panel is unavailable right now" |

- It reads as it opens (the kit's notice is a status).
- **`panelSheet({ step: 'status' })`:** the same frame, with no footer.

## Frontend's steps

| The view | Opens |
| --- | --- |
| `abilities.panelRequest` is set | `mountPanelStatus` with its `status` |
| `panelAttemptSpent` with no record | `'spent'` |
| A PANEL_CODE offer, and no `NO_INJECTION` this phase | `mountPanelKeypad` |
| Otherwise, or after `NO_INJECTION` | `'unavailable'` |

A tap on a key gives `onPick(seat)`. Frontend sets `picked`, so the display shows the number, the key is pressed, and "Submit 3" appears; another key replaces it. Submit sends `PANEL_CODE { doctorSeatId }` with the picked seat and sets `phase: 'sending'`. Then:

- **Accepted:** the view's `panelRequest` arrives, `QUEUED` or `WRONG`, and Frontend opens the status part.
- **Rejected with `NO_INJECTION`:** `'unavailable'`, with the same words whatever number was entered.
- **Rejected for any other reason:** the keypad with `error`, the number still picked, in words that don't suggest the number caused it; "Submit 3" works again while the offer stands.
- **No answer:** Actions' sheet 45 (Q3).

The command is Frontend's. The component never sees the Doctor, the pool or anyone's health.

## The undrawn states, as the Lead answered them (16 November)

- **Q1. Sending.** "Submitting…" and busy, as the Hacker's Submit Code. The keys take no taps, and the display keeps the number. ✕ only closes the sheet: the command already sent stays sent, as Actions' L5 has it, and the outcome waits in the panel, which the room's control opens again.
- **Q2. Not accepted.** Whether the attempt is spent comes only from the server. A rejection produces no attempt, so the keypad stays with the kit's note, in words that don't suggest the number caused it (above). "Your attempt is used" comes only from the view (`panelAttemptSpent` or a record). `NO_INJECTION` is uniform: the overlay `rules/overlays/planet-private-feedback-implementation-2026-11-06.json` reports an empty pool "before correctness is checked", with no attempt. It opens the pack's Unavailable frame, with the same words whatever number was entered, as sheet 43 asks.
  - Today the game says "No injection was available. Your panel attempt was not spent." (`apps/game/src/planet/controller.ts:315`). That names the pool, which sheet 43's note rules out. The Lead puts it to Frontend (P2 in the release-3 plan).
- **Q3. No answer.** Actions' sheet 45, as for the Hacker's Scan and Code: `mountOutcomeUnknown` and `unknownSheet()` with `type: 'PANEL_CODE'`. Actions 0.2.1 adds PANEL_CODE's look with #273's next code change: the panel icon, "Panel request was sent, but no answer came back." and "Check before doing anything else.", naming no number. Actions' other parts refuse PANEL_CODE and name this component.
- **Q4. TREATED, NO EFFECT and DISCARDED.** The pack's tones: a good outcome amber (as REGISTERED, CODE CORRECT and MATCHED), the rest paper (as WRONG NUMBER, CODE WRONG and NO MATCH). The words state only the record, never a reason, the pool or the Doctor: TREATED is the request causing Injured to Healthy at its Rescue step; NO_EFFECT still spends its reservation; DISCARDED comes only after an actual Sync and doesn't restore the attempt (the overlay, BH-ATTEMPT-04). Filled as the other states; no toast when the record changes.
- **Q5. 7 and 8 players.** The pack's 3 × 3 with every number in its place; the missing places are empty, not disabled keys, so no empty place looks like a refused number.
- **Q6. The Largest text.** The keys are single digits, so the 3 × 3 stays at every text size and needs no list form. The display's height is a minimum (the pack's 74 px) with room that grows with its number; the line wraps. The large sheet's body scrolls when it must, and the shell's footer wraps "Submit 3" as it wraps every footer.
- **Two parts and `panelSheet()`,** as proposed.

## Privacy and audiences

The Lead's note: **"The picked number never appears in an attribute's value."**

- **Patient-private:** only the patient's own phone mounts it. The shared display never does, and a part given no viewer draws nothing.
- **The pick** is the display's words and the pressed key's `aria-pressed`, as the pack's. Each key's `data-value` is its own number, a public identity, the same on every phone. From a pick of 3 to a pick of 5, the only attributes that change are the two keys' pressed states. The pick never reaches the console or the shell's `onLayout`, and an input's error never names it. `onPick` reports a tapped key's seat; `onFocusReturn` reports the key that had the focus by its number, as the control policy reports every control.
- **The record's words** are in no attribute's value.
- **Concealed, or for a new viewer,** each part empties itself and drops this viewer's inputs: no number, no pressed key, no note, no stamp. Nothing comes back until it is given again.
- **The component never reads** the Doctor's identity, the pool (`injectionsRemaining` is the Doctor's) or anyone's health. "The panel is unavailable right now" is the same, word for word, whatever the reason.
- **While reconnecting,** the keys take no taps and say the banner's words, Submit is refused by the shell (a command), and ✕ still closes (local).

## Accessibility

- The keys are one group, named by the line under them ("One attempt: the Doctor’s player number."). Each key is a button named by its digit, pressed when picked.
- The display is `aria-live="polite"`, as the pack's.
- Each status reads as it opens.
- A focused key keeps its element and its focus as the pick changes. When it goes, the focus returns to the part's root, and `onFocusReturn` reports which key, as above.

## Motion

- **Each record's stamp snaps in** (Q4): REGISTERED, WRONG NUMBER, TREATED, NO EFFECT and DISCARDED, as REGISTERED does in the handoff's motion table. Over 120 ms, from transparent at 1.3 times its size, with the kit's ease. The result's notice carries the component's own class (`ms-hp-result`), under which the kit's stamp animates, as the Hacker's results do.
- **With Reduce motion,** the game's (`reducedMotion`, which sets `data-motion="reduced"` on the part's root) or the device's, the stamp is there at once.
- The icons, the display and the keys don't move. The sheet's slide is the shell's.

## Found while building

For the Lead. Nothing here changes the agreed interface:

- **Box sizing.** The pack's pages set `* { box-sizing: border-box }`, and the kit sets it for its own elements only. Without it, the display's padding made it 86 px tall at the Standard text instead of the pack's 74. The agreement page loads the pack's styles, so it could not see this; the probe did. The component sets border-box for its own elements, as the kit does for its.
- **The display's halo and the keys'.** The sheet's glass gives text a halo. The pack's display keeps it; its keys have none, a button's own default in the browser, and the pack's glass rule for the pressed key. The component takes the halo off its keys itself, so it does not rest on a browser's default, and the agreement compares `text-shadow`.
- **The icons are compared by their drawing.** The pack's `ic()` marks no name on its SVG, so the agreement compares each shape's path, fill and stroke.
- **The Largest text on 320 × 568.** With the sheet's title on two lines and "Submit 3" in the footer, the body shows the display and the top of the keypad; the rest of the keypad is reached by scrolling the body, whole and three to a row. A status's second line is reached the same way. This is the scroll Q6 allows.

## Checks run on this version

- **Tests:**

  | Check | Result |
  | --- | --- |
  | `packages/design-tokens/test/hospital-panel.test.mjs` | 8 of 8: the runtime-safe graph on the kit alone (no other component); every style under the root at two classes, the kit's parts only inside the component's own, its one rule on glass and its one box-sizing rule, its only colours the pack's display's three, and one motion, the records' stamp snap (120 ms, stopped by the game's and the device's Reduce motion); the pinned pack unchanged; the pack's words and the Lead's additions, with no word but the pack's line naming the pool, the Doctor, a digit or a reason; the inputs' checks and normalization, with no error naming a pick; every preview state a valid input and the six compared frames; the sheet's frame and footers; and the check's record, with Q1's sending, Q5's empty places, Q6's three to a row, the privacy note and Q4's snap |
  | `npm run test:design` | 394 of 394 |
  | `npm run test:tooling` | 356 of 356 |
  | `npm run build`, `check:toolchain`, `check:workspace`, `check:sources`, `typecheck` | Pass |
  | `node design/tools/check-assets.mjs` | 15 passed |
- **`node design/tools/hospital-panel-check.mjs`:** recorded on `f9108d0d`, with the source clean.
  - **Against `4211f770`'s record** (the one the Lead accepted at `3cb149b4`): the only recorded field that changed is `rejected`'s note at both sizes, now "The server did not accept it. Nothing was queued. Submit again." The probe's 14 checks and the agreement's 6 pass as before. The two `rejected` captures differ in the note's words; 3 captures are byte for byte the same, 28 have no pixel that differs by more than 40 levels, and `430x932-sending` differs by 27 pixels (the spinner's angle).
  - **The setup:** the preview is bundled by Vite and served with the hosted game's production response headers, including the Content Security Policy, through the shared `design/tools/lib/component-check.mjs`. The headers' SHA-256 is `424e5dec8d595ac44d179f0e22f7bb42d51a1e84f8c7982676606e850754dcbb`, the same as the other components'. Each part is mounted in the shell's sheet body, over the Hospital's room scene, as Frontend would.
  - **Captures:** 34 of 34 pass, each drawing what its state asks: the part, the sheet, its sub and ✕, the footer and its busy button, the display, the keys and the pressed one, the empty places, the keys to a row, the line, the error, the stamp and its tone, the icon, the lines, the banner, and the room's patients behind.
    - 15 states at 390 × 844 and 430 × 932;
    - 320 × 568 at the Standard text, Large text at 390 × 844, and the Largest at 320 × 568 for the keypad and a status.
    - Concealed, no private word is in the page.
  - **The lifecycle probe** (`preview/probe.mjs`): 14 of 14 checks pass.
    - **As the page comes (13):** keys, refused, status, words, footer, audience, leaks, inputs, private, focus, text, dispose and motion.
      - **keys:** each key reports its seat; the pick is Frontend's; at 8 and 7 players every key is where it is at 9, and the missing places are empty, hidden from assistive technology, and not keys.
      - **footer:** in the real shell, Submit and ✕ are taken while live; reconnecting, only ✕, and Submit says the banner's words; while Submit sends, ✕ only closes.
      - **leaks:** from a pick of 3 to a pick of 5, only the two keys' `aria-pressed` change; no record's words in an attribute; nothing in the console or the layout; no other callback.
      - **text:** at the Largest text on 320 × 568 and Large on 390 × 844, three keys to a row, each at least 58 px, the display 96 px and 74 px tall, every word whole.
      - **motion:** each record's stamp has one animation, `ms-hp-stamp-in`, of 120 ms, and none with the game's Reduce motion; the icons, the display and the keys have none.
    - **With the device's Reduce motion (1):** motion, with no animation anywhere.
  - **Agreement with the pinned pack's own frames** (`preview/agree.mjs`): 6 of 6, with no differing part, every part to within half a pixel. It compares the top bar, the sheet's title, sub, close, place, body and footer (words, boxes, looks and icon); the display (words, live region, box, look); the keypad and each key (words, pressed state, element, box, look); the line; and each status's stamp (words, tone, box, look), icon (drawing and boxes) and lines.
  - **The checks bite:**
    - A 4 px wider gap between the keys, and "WRONG CODE" for "WRONG NUMBER", each fail the agreement.
    - The pick in a data attribute fails the leak check.
    - A 200 ms snap fails the motion check.
    - The missing numbers drawn as disabled keys fail the keys check (Q5).
    - Keys that take taps while Submit sends fail the refused check (Q1).
    - The pick kept through concealment fails the private check.

    Each was tried, then undone.
- **Not run:** physical phones, Safari, screen readers, frame rate, the real app's connection.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/hospital-panel/`:

| Path | What |
| --- | --- |
| `hospital-panel.mjs` | `HOSPITAL_PANEL_VERSION`, `PANEL_WORDS`, `PANEL_RESULTS`; each part's defaults and check (`PANEL_KEYPAD_DEFAULTS` and `checkPanelKeypad()`, `PANEL_STATUS_DEFAULTS` and `checkPanelStatus()`); the shell's words (`panelSheet()`); and the two parts |
| `hospital-panel.css` | The parts' own layout (the display and the keypad) and the records' stamp snap, scoped under `.ms-hospital-panel`. It imports the kit's styles |
| `preview/` | Development only: the preview on the pack's synthetic fixtures (`states.mjs`: 19 states), in the shell over the Hospital's room scene; the lifecycle probe (`probe.mjs`); the agreement with the pack (`agree.mjs`) |
| `review/` | The check's captures (JPEG at 2× pixels) and `check.json` |

Also `design/tools/hospital-panel-check.mjs` (on the shared `component-check.mjs`), `packages/design-tokens/test/hospital-panel.test.mjs`, and this page.

**Used unchanged:** `icons.mjs`, `kit/kit.mjs` and `kit.css`. Nothing imports a prototype, preview, fixture or development module.
