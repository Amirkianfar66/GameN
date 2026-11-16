# Host controls: Designer's runtime component

**Version:** `host-controls-0.1.0`. **Status (16 November 2026):** built to the interface the Lead Designer approved on #295, with the Lead's six answers below, against the phone shell 0.2.5. Built without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280). It does not activate a native interface: that is Frontend's PR, under the phone merge gate.

**What it is:** the host's controls in a match, as sheet 15 draws them: their own sheet, opened from the Settings sheet's Host controls row (#294), in plain words, with a recovery code for each seat. It is #222 item 28, P3. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Audience:** the host's own phone only. The sheet, and above all the code view, never reaches the shared display: Frontend opens it only on the host's phone, and the code is private to that phone (the Lead's privacy note on #295).

**Covers** (sheet 15):

| View | Sheet (the shell's frame) | Body (this component) | Footer (the shell's actions) |
| --- | --- | --- | --- |
| **Host controls** (`list`) | "Host controls", Back (to Settings), ✕ | Two rows: "Check the deadline" ("Asks the server to move on if time is up") and "Run bots" ("Bots act if they can"). "Recovery codes": a row per seat, its portrait, "1 · Ava", "New code", the chevron. Then "Abort match" ("Ends with no winner"), the chevron | None |
| **Code · hidden** (`code`) | "Recovery code", "Private to this phone", Back (to the list), ✕ | The code card: "Recovery for Player 4 · Dev", "Match ID" and the ID in the mono face, "Code" and the pack's dots, "Works once · 15 minutes" with the timer icon. Then "Show it only to Player 4. It never appears on the shared display." | Reveal (the eye) · Copy (amber) |
| **Code · revealed** (`code`) | As above | The same, the code in the mono face | Hide · Copy; "Copied" in the shell's toast after a copy |
| **Abort · confirm** (`abort`) | "Host controls", Back (to the list), ✕ | The warning tile, "Abort the match?", "It ends now for everyone, with no winner." | Keep playing · Abort match |

**What changes from today:**
- **Today:** inside the Settings panel: "Check server deadline", "Run eligible bots", "Issue recovery for Player 6" for each seat, and "Abort match", which turns into "Confirm abort · No winner". An issued code shows under them with its Match ID, behind "Reveal recovery code".
- **Drawn:** their own sheet in plain words, a code for each seat with its own card, and the abort's own confirm step (#222 item 28).

**Comparison part:** `host-controls` ("Host controls in a match", sheet 15), in `design/tools/lib/phone-ui-native-parts.mjs`. It applies when Frontend's PR mounts this component; until then, the component's own captures are its evidence.

**Not in it:**
- **The commands and their answers:** checking the deadline (today's `advance`), running bots (`runBots`), issuing a seat's code (`issueRecovery`) and aborting (`abort`) are Frontend's to send and the server's to answer. The component reports a tap; Frontend gives each command's state and the issued code.
- **The sheet's frame and footer:** the title, Back, ✕ and the footer's buttons are the phone shell's (0.2.5). Frontend opens the sheet and mounts this body in `shell.sheetBody`; the module gives Frontend the sheet's words, icons and buttons for each view (`hostControlsSheet`, answer 1), so they stay in Designer's source.
- **The host's lobby controls** (seats, bots before the start, admitting players): the host room (#287).

## The Lead's answers (#295)

1. **The split:** the body is the component's; the frame and footer are the shell's through `hostControlsSheet(input)`; the view is Frontend's, from the taps and Back. The same pattern as the private talk's `declareSheet()` and `claimSheet()`.
2. **In flight and refused:** in flight, the row busy with the kit's spinner at its end, and Abort match busy in the footer; refused, the row dimmed, Frontend's reason in place of its line and as its description; receipts in the shell's toast. While a command is in flight only that row is busy; the others keep their own state as Frontend gives it. The component never infers one command's state from another's.
3. **Abort match:** the shell draws it. Shell 0.2.4's sheet actions take `kind: 'warn'`, the kit's warn button (the pack's `.btn-warn`: a paper outline, no fill, the same on glass). The confirm's footer is Keep playing (secondary) and Abort match (warn).
4. **The code:** the server issues it with `expiresAt` 15 minutes ahead, and a `used` flag makes it single-use (`services/game-api/src/planet-game.ts`), so "Works once" is the server's fact. `minutes` are the minutes left, which Frontend works out from `expiresAt` and the trusted clock, rounded up and updated as they change; without them the line is dropped, and the component never counts down. Once it expires, Frontend drops the code. The value is in the page only while revealed, never in an attribute, a report or the layout, and it is dropped on a viewer change and when concealed; the probe checks each.
5. **Reconnecting:** shell 0.2.4 adds `local: true` to a footer action: this phone's own, like Back, ✕ and the head actions, working while reconnecting and standing for no command. Reveal, Hide, Copy and Keep playing are local, so Hide always works (the probe checks it: the code revealed, then reconnecting, Hide is taken, and once Frontend hides the code it leaves the page); Abort match stays a command, refused while reconnecting with the banner's words, as the command rows are. `interactive: false` still refuses everything, and concealed draws no sheet.
6. **The seats:** Frontend lists them, and the component draws only what it is given: names given, portraits by character. Whether the host's own seat or a bot's seat is listed is Frontend's and the server's call.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/host-controls/`:

| Path | What |
| --- | --- |
| `host-controls.mjs` | `mountHostControls()`, `hostControlsSheet()`, `nextHostControlsInput()`, `HOST_CONTROLS_DEFAULTS`, `HOST_CONTROLS_VERSION`, `HOST_SHEET_ID`, `HOST_WORDS`, `CODE_MASK` |
| `host-controls.css` | Every style, under `.ms-host-controls`; starts with the kit's stylesheet. Its own: the code card (only sheet 15 draws it, in the pack's values and inline styles) and the 14 px before Abort match |
| `preview/` | Development only: the preview (the body in the phone shell's sheet over Room A, as sheet 15 draws it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `host-controls`, its `code`, `reveal` and `abort` states) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/host-controls-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/host-controls.test.mjs`.

**Uses unchanged:**
- **The kit (0.5.1):** `list` and `row` (icon tiles, portraits as leads, the chevron, the spinner as a trail), `groupLabel`, `groupNote`, `wait` (`size: 'small'`, the abort's warning tile and its 1.25rem title), and the control policy.
- **The phone shell (0.2.5):** its sheet (`back`, `sub`, `detent: 'large'`, `actions` with `kind: 'warn'` and `local: true`), its toast ("Copied", and Frontend's receipts) and its reconnecting banner. The component does not import the shell.

## Mount, update and dispose

```js
import { mountHostControls, hostControlsSheet } from '…/design/phone-ui/components/host-controls/host-controls.mjs';
import '…/design/phone-ui/components/host-controls/host-controls.css';

shell.update({ sheet: hostControlsSheet(input) });          // the frame and footer for the view
const host = mountHostControls(shell.sheetBody, input, handlers);
host.update({ ...changes });                                // each key given replaces that key; the rest stay
shell.update({ sheet: hostControlsSheet(nextInput) });      // as the view, the code or abort's state change
host.dispose();                                             // safe twice; afterwards nothing fires
```

- **On update,** each row keeps its element and the focus, by its id (`deadline`, `bots`, `abort`, each seat), through every ordinary update.
- **The footer's buttons** report through the shell's `onSheetAction(id)`: `reveal`, `hide`, `copy` in the code view; `keep`, `abort` in the confirm.

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `view` | The host's | `list`, `code` or `abort`: Frontend's, from the taps (answer 1) |
| `status` | Phone | `live`, `stale` or `concealed`: while reconnecting, the commands are refused with the banner's words, not dimmed, and the confirm still opens (answer 5); concealed drops the code |
| `interactive`, `viewer`, `versions` | Phone | As the shell's; `versions` for the portraits |
| `deadline`, `bots` | The host's | `{ enabled, busy, reason }`: Check the deadline's and Run bots' states, from Frontend; not offered until given (answer 2) |
| `seats` | The host's | `[{ seat, name, character, enabled, busy, reason }]`: the seats Frontend lists for a code, each offered unless Frontend says otherwise (answer 6) |
| `abort` | The host's | `{ enabled, busy, reason }`: the abort's state; the row opens the confirm, the footer's Abort match sends it |
| `code` | The host's, private | `null`, or `{ seat, name, matchId, revealed, value, minutes }`: the issued code. `value` only while `revealed` (given hidden, it is refused); `minutes` left, from the server's `expiresAt` (answer 4) |

**The component decides nothing:** it never works out whether a deadline has passed, whether a bot can act, who may have a code, how long a code lasts, or whether the match may end. Frontend gives each state from the session; the reasons and receipts are Frontend's words.

**When the viewer changes,** the code is dropped unless the same update gives the new viewer's (the shell also drops the whole sheet, as a sheet is this viewer's own).

## Callbacks

| Callback | When |
| --- | --- |
| `onDeadline()` | Check the deadline: Frontend sends today's `advance` |
| `onBots()` | Run bots: Frontend sends `runBots` |
| `onIssueRecovery(seat)` | A seat's row: Frontend sends `issueRecovery`, and shows the code view with the issued code |
| `onAbortAsk()` | The Abort match row: Frontend shows the confirm view (nothing is sent) |
| `onFocusReturn({ intent, value })` | As the other components' |
| The shell's `onSheetAction(id)` | `reveal` / `hide`: Frontend shows or hides the code; `copy`: Frontend copies the code and shows "Copied"; `keep`: back to the list; `abort`: Frontend sends `abort` |

Each reports a tap, and only that.

## Drawn

| Part | Drawn (sheet 15) |
| --- | --- |
| The list | On the sheet's glass: the kit's rows with steel icon tiles (the timer, the bot), "Recovery codes" and the seats' rows (portrait, "n · Name", "New code", chevron), 14 px, then the Abort match row (the warning on paper, chevron) |
| A command in flight | That row only refused (`aria-busy`), the kit's spinner at its end (the pack draws none; answer 2) |
| A command refused | The row dimmed and refused, Frontend's reason as its line in place of the usual one and as its description (answer 2) |
| The code card | Sheet 15's own: "Recovery for Player 4 · Dev" in capitals, "Match ID" and the ID, "Code" and the dots or the code (mono, broken anywhere), the timer and "Works once · 15 minutes" |
| The note | "Show it only to Player 4. It never appears on the shared display." |
| The confirm | The kit's waiting block: the warning tile, "Abort the match?", "It ends now for everyone, with no winner." |
| Larger text | The rows' words wrap; the card's code breaks anywhere; the sheet scrolls |

**Motion:** the spinner while a command is in flight; with Reduce motion it stands still. The sheet's and the toast's are the shell's.

**The code's privacy:** the code is on the page only while revealed. Hidden, the card shows the pack's fixed dots, so neither the code nor its length is there; it is never in an attribute, a report or the layout, and it leaves the page when hidden, when the view changes, when the viewer changes and on dispose.

### Against the pack

The agreement draws the frozen pack's `host-controls` screen beside the sheet (its list, the code hidden and revealed, the copy's toast, and the abort's confirm; at both sizes and the Largest text) and compares, to within half a pixel: the sheet, its title, line and body; the footer and its buttons and icons; the toast; the group label, the lists, the rows, their icon tiles and drawings, portraits (by file), titles, lines and chevrons; the code card and each of its six lines and its timer icon; the note; and the confirm's tile, icon, title and line: their boxes, words, looks, states (`aria-disabled`, `aria-busy`, names, roles) and drawings. The room behind the sheet, the top bar and the tabs are the room scene's and the shell's own agreements'; what the pack does not draw (a command in flight or refused, reconnecting) is the probe's.

- **The shell, as it is:** compared with shell 0.2.5, which draws the pack's sheet head with Back (18 px at its left, the title at 72) and the footer's two equal halves at the Larger text; nothing is patched and nothing is recorded as the shell's. (This build's first record found both under 0.2.4; the Lead settled them in the shell.)
- **Accepted, at the Largest text only:** beside the long "Works once · 15 minutes" the pack's timer icon shrinks to under 24 px; the card's keeps its 24 px, as the kit's icons never shrink (`.ms-k-ic`, `flex: none`). That case compares the icon's place and height, and records its width.

## Check

`node design/tools/host-controls-check.mjs` bundles the preview with Vite and serves it with the production headers. It captures 10 states at 390 × 844 and 430 × 932: the list, Run bots in flight, Check the deadline refused, the code hidden, revealed and copied, the confirm, the abort in flight, reconnecting, and the revealed code at the Largest text; each asserts the code is in the page only while revealed. Then it runs the probe (as the page comes and with the device's Reduce motion) and the agreement.

**Recorded against `56d35ed7` (clean, with the shell 0.2.4):** 20 of 20 captures, the probe 22 of 22 checks (21 as the page comes, the motion check with the device's Reduce motion), and the agreement 9 of 9, with no unexpected policy report and no page problem; the code in the page only in the revealed captures. The headers' SHA-256 is `424e5dec…`. The record is `review/check.json`.

## Frontend's connection

1. Show the Settings sheet's Host controls row to the host (#294's `hostControls`); on `onHostControls`, open this sheet: `shell.update({ sheet: hostControlsSheet(input) })` and mount the body in `shell.sheetBody`.
2. Give `deadline`, `bots`, `seats` and `abort` from the session (today's `model.status`, `model.members`, `model.busy`), `busy` while each command is in flight, and the issued code from the server's answer.
3. Route the callbacks and the shell's `onSheetAction` and `onSheetBack` (code and confirm back to the list; the list back to Settings) as above; show each receipt in the shell's toast in Frontend's words.
4. Today's host controls inside Settings leave the screen.

## Not in this version

The comparison through Frontend's native build (the `host-controls` part) waits for Frontend's PR that mounts it.
