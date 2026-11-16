# Host controls: Designer's runtime component

**Version:** `host-controls-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

**What it is:** the host's controls in a match, as sheet 15 draws them: their own sheet, opened from the Settings sheet's Host controls row (#294), in plain words, with a recovery code for each seat. It is #222 item 28, P3. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

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
- **The sheet's frame and footer:** the title, Back, ✕ and the footer's buttons are the phone shell's (0.2.3). Frontend opens the sheet and mounts this body in `shell.sheetBody`; the module gives Frontend the sheet's words, icons and buttons for each view (`hostControlsSheet`, question 1), so they stay in Designer's source.
- **The host's lobby controls** (seats, bots before the start, admitting players): the host room (#287).

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/host-controls/`:

| Path | What |
| --- | --- |
| `host-controls.mjs` | `mountHostControls()`, `hostControlsSheet()`, `nextHostControlsInput()`, `HOST_CONTROLS_DEFAULTS`, `HOST_CONTROLS_VERSION`, `HOST_WORDS`, `CODE_MASK` |
| `host-controls.css` | Every style, under `.ms-host-controls`; starts with the kit's stylesheet. Its own: the code card (only sheet 15 draws it) |
| `preview/` | Development only: the preview (the body in the phone shell's sheet over Room A, as sheet 15 draws it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `host-controls`, its `code`, `reveal` and `abort` states) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/host-controls-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/host-controls.test.mjs`.

**Uses unchanged:**
- **The kit (0.5.1):** `list` and `row` (icon tiles, portraits as leads, the chevron), `groupLabel`, `groupNote`, `wait` (the abort's warning tile), the spinner, and the control policy.
- **The phone shell (0.2.3):** its sheet (`back`, `sub`, `detent: 'large'`, `actions`), its toast ("Copied", and Frontend's receipts) and its reconnecting banner. The component does not import the shell.

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
| `view` | The host's | `list`, `code` or `abort`: Frontend's, from the taps (question 1) |
| `status` | Phone | `live` or `stale`: while reconnecting, the commands are refused with the banner's words (question 5) |
| `interactive`, `viewer`, `versions` | Phone | As the shell's; `versions` for the portraits |
| `deadline`, `bots` | The host's | `{ enabled, busy, reason }`: Check the deadline's and Run bots' states, from Frontend (question 2) |
| `seats` | The host's | `[{ seat, name, character, enabled, busy, reason }]`: the seats Frontend lists for a code (today, every human seat; question 6) |
| `abort` | The host's | `{ enabled, busy, reason }`: the abort's state; the row opens the confirm, the footer's Abort match sends it |
| `code` | The host's, private | `null`, or `{ seat, name, matchId, revealed, value, minutes }`: the issued code. `value` only while `revealed`; `minutes` from the server's code (question 4) |

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
| A command in flight | The row refused (`aria-busy`), the kit's spinner at its end (the pack draws none; question 2) |
| A command refused | The row dimmed and refused, Frontend's reason as its line in place of the usual one and as its description (question 2) |
| The code card | Sheet 15's own: "Recovery for Player 4 · Dev" in capitals, "Match ID" and the ID, "Code" and the dots or the code (mono, broken anywhere), the timer and "Works once · 15 minutes" |
| The note | "Show it only to Player 4. It never appears on the shared display." |
| The confirm | The kit's waiting block: the warning tile, "Abort the match?", "It ends now for everyone, with no winner." |
| Larger text | The rows' words wrap; the card's code breaks anywhere; the sheet scrolls |

**Motion:** the spinner while a command is in flight; with Reduce motion it stands still. The sheet's and the toast's are the shell's.

**The code's privacy:** the code is on the page only while revealed. Hidden, the card shows the pack's fixed dots, so neither the code nor its length is there; it is never in an attribute, a report or the layout, and it leaves the page when hidden, when the view changes, when the viewer changes and on dispose.

## Frontend's connection

1. Show the Settings sheet's Host controls row to the host (#294's `hostControls`); on `onHostControls`, open this sheet: `shell.update({ sheet: hostControlsSheet(input) })` and mount the body in `shell.sheetBody`.
2. Give `deadline`, `bots`, `seats` and `abort` from the session (today's `model.status`, `model.members`, `model.busy`), `busy` while each command is in flight, and the issued code from the server's answer.
3. Route the callbacks and the shell's `onSheetAction` and `onSheetBack` (code and confirm back to the list; the list back to Settings) as above; show each receipt in the shell's toast in Frontend's words.
4. Today's host controls inside Settings leave the screen.

## Questions for the Lead

1. **The split:** the component draws the sheet's body for its three views; the sheet's frame and footer stay the shell's. The module exports `hostControlsSheet(input)`, which gives Frontend the shell's sheet for the view (the title, "Private to this phone", Back, `detent: 'large'`, and the footer's buttons with the pack's words and icons and Frontend's states), so the words stay in Designer's source. The view is Frontend's, from the taps. Is that the split you want?
2. **Commands, in flight and refused:** each of the four commands is `{ enabled, busy, reason }` from Frontend, sent by Frontend, answered by the server. The pack draws none of these states. I propose:
   - **in flight:** the row refused (`aria-busy`) with the kit's spinner at its end; the confirm's Abort match busy in the shell's footer;
   - **refused:** the row dimmed and refused, Frontend's reason as its line in place of the usual one and as its description, as your decision 3 on #294;
   - **receipts:** Frontend's words in the shell's toast; the component adds none.
3. **Abort match's look:** the pack draws the confirm's Abort match as the kit's `warn` button (outlined in paper). Shell 0.2.3's sheet actions take only `primary` and `secondary`. Would you add `kind: 'warn'` to the shell's sheet actions (a shell change, yours), or should the confirm draw it another way?
4. **The code:** given only while revealed (`value` with `revealed: true`; hidden, `value: null`), so the page never holds it hidden. Hidden shows the pack's fixed dots. Frontend copies it to the clipboard and shows "Copied" in the shell's toast. "Works once · 15 minutes" takes the minutes from the server's code (`minutes`), and drops the line without them, rather than the component stating the rule. Agreed?
5. **Reconnecting:** the command rows are refused with the banner's words, as the shell refuses commands; opening the confirm, Back and ✕ stay this phone's. The shell also refuses its footer's buttons while reconnecting, which includes Reveal and Copy. Is that acceptable for this version?
6. **The seats:** Frontend lists the seats a code can be issued for (today, every human seat, the host's own included), with names given and portraits from the crew runtime by character, as character selection does.

## Not in this version

Everything: this is the interface. Next, once the Lead approves it: the module and its styles, the preview's states (the list, a command in flight and refused, the code hidden and revealed, the confirm, reconnecting, Largest), the probe, the check at 390 × 844 and 430 × 932 under the production headers, the agreement with the pack, the test, and the owner's test page.
