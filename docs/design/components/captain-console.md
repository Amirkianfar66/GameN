# Captain console: Designer's runtime component

**Version:** `captain-console-0.1.0`. **Status (16 November 2026):** the interface, approved by the Lead Designer with the answers below (#302). The build has started, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

**What it is:** the Captain's console in the Command Room, as sheets 22 and 24 draw it (the pack's `captain()` in its `console`, `used`, `release` and `eject` states):
- two plates, Release and Eject, each "Once a match";
- each one's confirm, with the who block and the facts;
- the note "Each command works once a match, whoever is Captain."

It covers #222 item 17's console note: today the console's labels are drawn over the plates' lock icons (`docs/design/phone-ui-native-review.md`, sheet 40). The pack puts each plate's name and line under its art, so nothing covers it. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**When it opens:** from the Command Room's own chip ("Captain console"), on the Captain's turn. The chip is the room scene's; the moment the sheet opens and closes is Frontend's.

**Audience:** the Captain's phone only. The contract's projection gives `abilities.captainCommands` to the Captain alone (its audience check).

**Covers:**

| View | Sheet (the shell's frame) | Body (this component) |
| --- | --- | --- |
| **Console** (`console`) | "Captain console", "Command Room · your turn", ✕ | The two plates side by side: each its art, its name ("Release", "Eject") and its line ("Once a match", "Used", or Frontend's reason, "No one in Jail"); then the note "Each command works once a match, whoever is Captain." |
| **Release · confirm** (`release`) | "Captain console", no ✕; footer: Cancel, Release | The who block: the release icon on its paper tile, "Release the Jail", and who is in Jail ("Fay and Ike are in Jail"); then the facts: "Once a match, on your turn in the Command Room", "Frees everyone physically in Jail now", "Hospital detention is not affected" |
| **Eject · confirm** (`eject`) | As above; footer: Cancel, Eject (the warning button) | As above, with the eject icon, "Eject the Jail" and "Ejects everyone physically in Jail now" |

The "Commands used" frame (sheet 22) is the console with Release used and Eject unavailable.

**What changes from today:**
- **Today:** the plates are buttons in Actions with "RELEASE · USED"-style labels drawn over their art; there is no confirm.
- **Drawn:** the console sheet with the plates' art clear, their names and lines under it, and a confirm for each command.

**Comparison parts:** none of the native comparison's current parts covers the console. The component's own captures and agreement are its evidence until Frontend's PR mounts it.

**Not in it:**
- **The sheet's frame:** its title, line, ✕, glass and footer are the phone shell's. The module gives Frontend each view's frame and footer (`captainConsoleSheet`), so the words stay in Designer's source.
- **The Command Room's chip:** the room scene's.
- **The facts:** whether each command is used, whether it is offered now and why not, and who is in Jail are Frontend's, from the projection (`abilities.captainCommands`, the offers, the board). The component never works one out.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/captain-console/`:

| Path | What |
| --- | --- |
| `captain-console.mjs` | `mountCaptainConsole()`, `captainConsoleSheet()`, `nextCaptainConsoleInput()`, `CAPTAIN_CONSOLE_DEFAULTS`, `CAPTAIN_CONSOLE_VERSION`, `CAPTAIN_CONSOLE_SHEET_ID`, `CAPTAIN_CONSOLE_WORDS`, `PLATE_STATES` |
| `captain-console.css` | Every style, under `.ms-captain-console`; starts with the kit's stylesheet. Its own: the plates' two columns at the pack's 150 px, and the plate art's box (100 % wide, at most 140 px, 78 px tall, kept whole), as the pack sizes its `<img>` |
| `preview/` | Development only: the preview (in the phone shell's sheet over the Command Room, as sheets 22 and 24 draw it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `captain` in its `console`, `used`, `release` and `eject` states) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/captain-console-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/captain-console.test.mjs`.

**Uses unchanged:**
- **The kit (0.7.1):** `tile` for each plate, with its `art` as a node (the component's picture of the plate) and the `spent` state for a used command (decision 1); `who` (the confirm's icon, title and line), `facts`, `groupNote`, and the control policy.
- **The plates' art:** the game's existing film art bundle (`apps/game/hosted/board-v2-film-art/captain/plate-{release,eject}-{available,used,unavailable}.svg`, `catalog.json`), through the CSS properties it defines (`--board-v2-film-captain-plate-release-available` and the rest), as today's game draws them. The component names the property; it fetches nothing. The bundle's `plate-*-pressed.svg` stays unused, as the pack leaves it (decision 2).
- **The phone shell (0.2.7):** its sheet, with footer actions (`local` for Cancel) and its banner, opened by Frontend; the component does not import the shell.

## Mount, update and dispose

```js
import { mountCaptainConsole, captainConsoleSheet } from '…/design/phone-ui/components/captain-console/captain-console.mjs';
import '…/design/phone-ui/components/captain-console/captain-console.css';

shell.update({ sheet: captainConsoleSheet(input) });       // the frame and footer for the view
const console = mountCaptainConsole(shell.sheetBody, input, handlers);
console.update({ ...changes });                            // each key given replaces that key; the rest stay
console.dispose();                                         // safe twice; afterwards nothing fires
```

- **One sheet id (`captain-console`) for every view,** so the shell keeps its body from the console to a confirm and back.
- **On update,** each plate keeps its element and the focus.

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `view` | This phone | `console`, `release` or `eject`: Frontend's, from the plate tapped and Cancel |
| `status`, `interactive`, `viewer`, `versions` | This phone | As the shell's |
| `captain` | Public | The Captain's seat. Every view is refused unless the viewer is the Captain |
| `plates` | The Captain's | `{ release, eject }`, each `{ state, reason }`. `state` is `available` (offered now), `used` (`captainCommands.releaseUsed` or `ejectUsed`) or `unavailable` (not used, not offered); `reason` is Frontend's line for an unavailable plate: the server's reason, or "Not available now" (T3). Drawn: "No one in Jail". The component never works a state or a reason out, not even from an empty `jailed` (decision 3) |
| `jailed` | Public | The names of who is in Jail now, in seat order, for the confirm's line: "Fay is in Jail", "Fay and Ike are in Jail", "Fay, Ike and Gus are in Jail" (decision 3) |
| `command` | The Captain's | `{ enabled, busy, reason }` for the confirm's Release or Eject: the offer, and Frontend's state while it is sent |

## Callbacks

| Callback | When |
| --- | --- |
| `onPlate('release' \| 'eject')` | An available plate: Frontend sets `view` to its confirm |
| The shell's `onSheetAction(id)` | `cancel` (this phone's own: back to the console), `release` (Frontend sends `CAPTAIN_RELEASE`), `eject` (`CAPTAIN_EJECT`) |
| `onFocusReturn({ intent, value })` | As the other components' |

The commands carry nothing else: the contract's `CAPTAIN_RELEASE` and `CAPTAIN_EJECT` have no fields.

## Drawn

| Part | Drawn |
| --- | --- |
| The plates | Two of the kit's tiles side by side (10 px apart), each at least 150 px tall: the plate's art (up to 140 px wide, 78 px tall, kept whole), its name, and its line ("Once a match", "Used", or Frontend's reason). An available plate is offered; a used one is the kit's `spent` tile and an unavailable one its `unavailable` tile, dimmed and not choosable. The art is the state's own: available, used or unavailable |
| The note | The kit's group note: "Each command works once a match, whoever is Captain." |
| The confirm | The kit's who block (the release or eject icon on its 64 px paper tile, "Release the Jail" or "Eject the Jail", who is in Jail), then the kit's facts, each with the amber "i" |
| The footer | Cancel (secondary, this phone's own), then Release (primary) or Eject (the warning button), the commands |

**Words that state a rule** (decision 4, as the office decisions' decision 7). These fixed words are the component's: the pack's, the same every time, and they must change with the rules:
- "Once a match";
- "Each command works once a match, whoever is Captain.";
- "Once a match, on your turn in the Command Room";
- "Frees everyone physically in Jail now", "Ejects everyone physically in Jail now";
- "Hospital detention is not affected".

"Used" is the component's fixed word too. Names come from Frontend (`jailed`), in the pack's words.

**Motion:** none of its own.

## Frontend's connection

1. Open the shell's sheet with `captainConsoleSheet(input)` from the Command Room's chip on the Captain's turn, and mount `mountCaptainConsole` in `shell.sheetBody`.
2. Give `plates` from `abilities.captainCommands` and the offers (`CAPTAIN_RELEASE`, `CAPTAIN_EJECT`), with the server's reason or "Not available now" for an unavailable plate; `jailed` from the board.
3. On `onPlate`, set `view`; on `cancel`, return to `console`; on `release` or `eject`, send the command, and on its answer return to `console` (the plate now used) or close the sheet.
4. Today's plates in Actions leave the screen.

## Decisions (the Lead Designer, 16 November 2026, #302)

1. **The plate is the kit's tile.** Kit 0.7.1 adds:
   - **`spent`:** the pack's `.tile[data-state="spent"]`, which Actions' "Used" uses too. It takes the unavailable look and is not choosable.
   - **`art` as a node** as well as markup. The component passes its own picture node, with the film bundle's CSS property as its image, sized in its CSS as the pack sizes its `<img>`: 100 % wide, at most 140 px, 78 px tall, `contain`.

   It is built last, on 0.7.1.
2. **`plate-*-pressed.svg`** stays unused, as the pack leaves it.
3. **The names:** Frontend gives `jailed`. The component writes "Fay and Ike are in Jail", or "Fay, Ike and Gus are in Jail" for three or more.
   - A plate's state and its unavailable reason are Frontend's (T3). The pack's "No one in Jail" is that reason, so the component never works it out from an empty `jailed`.
   - "Once a match" and "Used" stay the component's fixed words.
4. **The rule-stating fixed words** are the component's, listed under "Drawn".
5. **Privacy:** every view is refused unless the viewer is the Captain.
6. **Reconnecting:** opening a confirm and Cancel keep working. Release and Eject wait with the banner's words.

## Not in this version

Everything: this is the interface. Next:
- the module and its styles;
- the preview's states:
  - the console;
  - the commands used;
  - each confirm;
  - a command in flight;
  - reconnecting;
  - the Largest text;
- the probe;
- the check at 390 × 844 and 430 × 932 under the production headers;
- the agreement with the pack;
- the test;
- the owner's test page.
