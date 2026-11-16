# Recover: Designer's runtime component

**Version:** `recover-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

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

## Files (proposed)

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
recover.dispose();              // safe twice; afterwards nothing fires and layout() is null
```

## Inputs

**Audience: this phone only.** The recovery code is private to the seat it returns. The screen never shows it (the box draws dots), never reports it except as below (question 1), and leaves no copy in the page once disposed.

| Input | What |
| --- | --- |
| `interactive`, `reducedMotion`, `insets` | As the other components' |
| `view` | `'form'` or `'recovered'` |
| `matchId` | The match ID as Frontend keeps it |
| `codeLength` | How long an issued code is, for the code box's hint ("32 characters"), from Frontend (question 3) |
| `codeError` | `null`, or words under the code's box, which is then ringed in paper: `RECOVER_WORDS.refused` |
| `recover` | `{ enabled, busy, reason }`: Recover seat. Busy reads "Checking…" and shows the spinner |
| `error` | `null`, or Frontend's words over the foot (question 2) |
| `seat` | Recovered: the seat now yours again, "Seat 4 is yours again" |

**The screen decides nothing:** it never works out whether a code was accepted, how long one lasts, or why it was refused.

## Callbacks

| Callback | When |
| --- | --- |
| `onBack()` | "Menu". Frontend goes back to the menu |
| `onMatchId(text)` | Each keystroke in the Match ID box, with what it holds. Frontend gives it back as `matchId` |
| `onCode(…)` | Each keystroke in the code's box (question 1) |
| `onRecover(…)` | Recover seat, or Return in a box, when it is available. Frontend sends today's `redeemRecovery` |
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
2. Keep the Match ID as today's draft, give it back as `matchId`, with `codeLength` from the issued codes. Route `onRecover` to today's `redeemRecovery` with the Match ID and the code (question 1).
3. Give `codeError` from the server's one refusal, in the pack's words (`RECOVER_WORDS.refused`); `recover` from the draft and `model.busy`.
4. Once accepted, give `view: 'recovered'` and the seat; route `onContinue` to the match, where the shell's reconnecting banner shows until the current state returns.

## Questions for the Lead

1. **How the code travels.** Join's model gives every keystroke to Frontend and takes it back. For a secret, I propose the code stays in the box instead: each keystroke reports only `onCode({ length })`, so Frontend can decide Recover seat's availability, and `onRecover({ matchId, recoveryCode })` hands the code over once, at the tap. Frontend never echoes it back; `clearCode()` empties the box when Frontend wants (after a refusal, the pack keeps the dots, so not then). Or should it follow join's model exactly?
2. **Connection lost:** as join's decision 4. Frontend's words over the foot ("No connection. Recover returns when you are back online."), and Recover seat refused with that reason; the words alone refuse nothing.
3. **The code's hint:** the pack writes "32 characters", but the contract accepts 16 to 128. I propose Frontend gives `codeLength` from the issued codes, and the hint says that number.
4. **Reconnecting** (sheet 14's fourth phone) is the shell's banner over the room, not this screen. Agreed?

## Not in this version

Everything: this is the interface. Next, once the Lead approves it: the module and its styles, the preview's states, the probe, the check at 390 × 844 and 430 × 932 under the production headers, the agreement with the pack, the test, and the owner's test page.
