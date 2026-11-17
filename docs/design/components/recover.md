# Recover: Designer's runtime component

**Version:** `recover-0.1.1` (17 November: it calls the kit's `followTextSize`, [below](#the-text-size-after-the-screen-is-mounted)). **Status (16 November 2026):** the interface is approved by the Lead Designer (#291 at `c7840a9e`), with the decisions below, and posted on #4 for Frontend. It is built on kit 0.5.1 and entry-parts 0.3.0, now merged to kit 0.8.0, shell 0.2.8 and entry-parts 0.4.0 (#265 at `0e5a0b8a`, through #287 and #289 at `2f501780`), with its preview, probe, agreement with the pack, check and test, as the owner's 16 November decision has each part built without waiting for Frontend (`docs/design/owner-decisions.md`, #280). It is not in the game yet: Integration first admits its files with the kit's graph. It is not a release.

**What it is:** the screen a player uses to take their seat back with the host's code, as sheet 14 draws it. It is #222 item 25, P3. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers** (sheet 14):

| State | Drawn |
| --- | --- |
| Entry | "Menu" back and "Recover"; "Recover your seat"; "Match ID" (the mono face, "From the host"); "Recovery code" (hidden as dots, "32 characters"); the note "The host makes a code for your seat in Host controls. It is never shown on the shared display."; **Recover seat** at the foot with the key, unavailable |
| Refused (wrong, used or expired) | The code's field ringed in paper, and "That code was not accepted. A code works once, for 15 minutes. Ask the host for a new one." under it; the server answers one refusal for all three cases |
| Checking | Recover seat busy: "Checking…" to screen readers, the spinner |
| Seat recovered | The check tile; "Seat 4 is yours again"; "Back to the match where it is now"; **Continue** at the foot |

**Not in it:**
- **Reconnecting,** sheet 14's fourth phone: the shell's banner over the last room (#265), which Continue leads back to.
- **The host's side,** making a code for a seat (sheet 15, #222 item 28): its own component.
- **The rules:** whether a code was accepted, how long one lasts, and how long it is are the server's and Frontend's. The screen never works them out.

**What changes from today:**
- **Today:** the menu's Recover tab, with "Match ID", a "Recovery code" password box and a button.
- **Drawn:** the screen above, with the line #222 item 25 asks for: the host makes the code, and it is never shown on the shared display.

**Comparison part:** `recover` (sheet 14), in `design/tools/lib/phone-ui-native-parts.mjs`. It applies when Frontend's PR mounts this screen; until then, the component's own captures are its evidence.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/recover/`:

| Path | What |
| --- | --- |
| `recover.mjs` | `mountRecover()`, `nextRecoverInput()`, `RECOVER_DEFAULTS`, `RECOVER_VERSION`, `RECOVER_WORDS` |
| `recover.css` | Every style, under `.ms-recover`; starts with the kit's and the entry parts' stylesheets |
| `preview/` | Development only: the preview on the pack's fixtures, `probe.mjs`, and `agree.mjs` (the screen beside the frozen pack's `ENTRY_SCREENS.recover`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/recover-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/recover.test.mjs`.

**Uses unchanged:**
- **The kit (0.5.1):** `field` for both boxes (the Match ID `mono`, the code `secret`), `errorNote`, `groupNote`, `wait` for the check tile, the block primary button (the key; Continue), the spinner and the control policy.
- **Entry parts (0.3.0):** `navBar`, `screen` and its foot, `largeTitle`.
- **`ms-k-phone`** on the root, with `ms-kit` and `ms-entry-parts`. No phone shell.

## Mount, update and dispose

```js
import { mountRecover } from '…/design/phone-ui/components/recover/recover.mjs';
import '…/design/phone-ui/components/recover/recover.css';

const recover = mountRecover(host, input, handlers);
recover.layout();               // { size, safe: { top, bottom } }
recover.update({ ...changes }); // each key given replaces that key; the rest stay
recover.focus('matchId');       // or 'code': the focus in that box, where Frontend wants it
recover.clearCode();            // empties the code's box, when Frontend wants it
recover.dispose();              // safe twice, and empties the code's box; afterwards nothing fires and layout() is null
```

## Inputs

**Audience: this phone only.** The recovery code is private to the seat it returns, and stays in its box (decision 1):
- the box is the kit's secret field: a password box (dots), with no autocomplete, autocapitalize or spellcheck;
- each keystroke reports only the code's length, `onCode({ length })`; `onRecover({ matchId, recoveryCode })` hands it over once, at the tap;
- Frontend never gives it back: an input named `recoveryCode` or `code` is refused;
- it is never put in an attribute, a report, a log or the layout;
- the box is emptied once the seat is recovered, at `clearCode()` and on dispose.

| Input | What |
| --- | --- |
| `interactive`, `reducedMotion`, `insets` | As the other components' |
| `view` | `'form'` or `'recovered'` |
| `matchId` | The match ID as Frontend keeps it |
| `codeLength` | The length the host's code is generated at, for the code box's hint ("32 characters"), from Frontend; without it, the hint drops the count (decision 3) |
| `codeError` | `null`, or words under the code's box, which is then ringed in paper: `RECOVER_WORDS.refused` |
| `recover` | `{ enabled, busy, reason }`: Recover seat. Busy reads "Checking…" and shows the spinner |
| `error` | `null`, or Frontend's words over the foot: `RECOVER_WORDS.offline` ("No connection. Recover returns when you are back online.", decision 2) |
| `seat` | Recovered: the seat now yours again, "Seat 4 is yours again" |

**The screen decides nothing:** it never works out whether a code was accepted, how long one lasts, or why it was refused.

## Callbacks

| Callback | When |
| --- | --- |
| `onBack()` | "Menu". Frontend goes back to the menu |
| `onMatchId(text)` | Each keystroke in the Match ID box, with what it holds. Frontend gives it back as `matchId` |
| `onCode({ length })` | Each keystroke in the code's box, with its length only |
| `onRecover({ matchId, recoveryCode })` | Recover seat, or Return in a box, when it is available: the one place the code leaves its box. Frontend sends today's `redeemRecovery` |
| `onContinue()` | Continue, once recovered. Frontend returns to the match where it is now |
| `onLayout(layout)`, `onFocusReturn({ intent, value })` | As the other components' |

## Drawn

| Part | Drawn (sheet 14) |
| --- | --- |
| The screen | The pack's `.screen`, under the safe areas; it scrolls, and the foot follows the content |
| Nav bar | "Menu" with the chevron, and "Recover" |
| The boxes | The kit's fields: "Match ID" in the mono face with "From the host"; "Recovery code" as dots with "32 characters"; ringed amber while typing, in paper when refused |
| The note | The kit's group note, under the boxes |
| Refused | The kit's inline error under the code's box |
| Recover seat | Block primary with the key; unavailable, dimmed; busy, the spinner |
| Recovered | The kit's waiting block with the check, "Seat 4 is yours again", "Back to the match where it is now", and Continue at the foot |
| Larger text | The boxes and words grow; the screen scrolls |

**Motion:** only the spinner, while checking; with Reduce motion it stands still.

## Frontend's connection

1. Mount the screen when the menu's "Recover my seat" is tapped; dispose it on leaving.
2. Keep the Match ID as today's draft, give it back as `matchId`, with `codeLength` from the issued codes. Decide Recover seat's availability from the Match ID and `onCode`'s length. Route `onRecover` to today's `redeemRecovery` with the Match ID and the code it hands over, and keep no copy of the code.
3. Give `codeError` from the server's one refusal, in the pack's words (`RECOVER_WORDS.refused`); `recover` from the draft and `model.busy`.
4. Once accepted, give `view: 'recovered'` and the seat; route `onContinue` to the match, where the shell's reconnecting banner shows until the current state returns.

## Decisions (the Lead's review of #291, 16 November)

1. **The code stays in the box:** each keystroke reports only `onCode({ length })`; `onRecover({ matchId, recoveryCode })` hands it over once, at the tap; Frontend never echoes it back. The box is emptied once the seat is recovered and on dispose; it keeps the kit's secret field's attributes; the code is never in a data attribute, the log or `onLayout`. The test and the probe check that no callback but `onRecover` carries it.
2. **A lost connection,** as Join's decision 4: Frontend's words over the foot, and Recover seat refused with that reason. The words alone refuse nothing.
3. **The hint:** Frontend gives `codeLength`, the length the host's code is generated at, and the hint says that number. Without it, the hint drops the count rather than guessing "32".
4. **Reconnecting** is the shell's banner over the room, not this screen.

**Added in the build:** `focus('matchId' | 'code')`, as join's form, where Frontend wants the focus (the sheet draws the Match ID's box ringed while typing); and `clearCode()`, as the interface proposed.

## The text size, after the screen is mounted

The Lead, 17 November (`recover-0.1.1`): in Chromium a phone root's container re-reads its em only while something inside it uses one of its queries, so a part opened after the text size changes could keep the old size's layout. Recover calls the kit's `followTextSize(root)` (kit 0.8.1, #265) once it is mounted, and disposes it with the screen. The probe's **text later** check mounts it at the Standard text, sets the Largest, then opens a part (the code refused under its box; the recovered seat), and holds every box to Recover mounted at the Largest. Nothing is drawn differently.

## Checks

`node design/tools/recover-check.mjs` bundles the preview with Vite, serves it with the production headers (SHA-256 `424e5dec…`, `lib/component-check.mjs`), and in desktop Chromium at 2× pixels:

- captures the nine states at 390 × 844 and 430 × 932: 18 captures, each with no policy violation, failed request or page error, on the pack's canvas, drawing what its state asks, and the typed sample code in no attribute of the page;
- runs the probe as the page comes and with the device's Reduce motion: the form, the secret code, typing, the refusal, Recover seat, recovered, offline, not interactive, insets, the Largest text, input, dispose, motion;
- runs the agreement: seven cases, the screen beside the frozen pack's, the same words, states, look, icon drawings and boxes to within half a pixel; the Match ID and the placeholders by their words, and the code by whether the box holds one.

### Checks run on this version

**On `e6314827` (`recover-0.1.1`), clean,** with the main menu (#278 at `56ff22fe`: kit 0.8.2) merged, headers SHA-256 `424e5dec…`: **18 of 18 captures pass**, 17 byte-identical to the last record's; the Checking… capture at 390 × 844 changes only where its spinner turns. The probe passes **15 of 15**, with the new **text later** check. The agreement passes **7 of 7**.

Before that: On `a20f6f72`, clean: #289 merged at `2f501780` (kit 0.8.0 and shell 0.2.8, #265 at `0e5a0b8a`; `entry-parts-0.4.0`); the check on the shared `component-check.mjs`, headers SHA-256 `424e5dec…`. 18 of 18 captures, the probe 14 of 14 and the agreement 7 of 7 pass. Against `e31ee89f`'s record, 17 captures are byte-identical; "Checking…" at 390 × 844 differs only by the busy spinner's frame.

Before, on `e31ee89f`, clean (kit 0.5.1 at `3fb12935`; `entry-parts-0.3.0`):
- **Captures:** **18 of 18 pass**: the nine states at 390 × 844 and 430 × 932. Each asserts:
  - the pack's words and note, the mono Match ID, the code's box a password box with no autocomplete, autocapitalize or spellcheck, and the canvas;
  - its state: the Match ID ringed while typed; the hint from Frontend's length, and none without one; the code kept in its box (32 dots) when refused, with the box ringed in paper and the words under it; Recover seat refused, busy ("Checking…") or open as Frontend gives it; recovered, with no box left; offline, with Frontend's refusal;
  - the typed sample code in no attribute of the page.
- **The lifecycle probe:** 14 of 14 (13 as the page comes, 1 with the device's Reduce motion). Its secret check fails when the code leaks into a keystroke's report, as a deliberate break showed.
- **The agreement with the frozen pack:** **7 of 7 cases** agree to within half a pixel in every part compared, in their look, their icon drawings and their states.
- **Not run:** physical phones, Safari, screen readers, password managers and the real app's connection.

`packages/design-tokens/test/recover.test.mjs` checks the runtime-safe graph, that the styles are the root only, the three places the code box's value is read (handed over at the tap, counted at a keystroke, emptied), the secret field's attributes, the pack's words, the inputs (the code is refused as an input), and the check's record.

## Not in this version

- The connection to the game (Frontend's): the four steps above.
- The host's side (sheet 15) and Reconnecting (the shell's): their own components.
- A phone, Safari, a password manager or a performance measure: the check is desktop Chromium at each phone's CSS size.
