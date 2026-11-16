# Captain console: Designer's runtime component

**Version:** `captain-console-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

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

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/captain-console/`:

| Path | What |
| --- | --- |
| `captain-console.mjs` | `mountCaptainConsole()`, `captainConsoleSheet()`, `nextCaptainConsoleInput()`, `CAPTAIN_CONSOLE_DEFAULTS`, `CAPTAIN_CONSOLE_VERSION`, `CAPTAIN_CONSOLE_SHEET_ID`, `CAPTAIN_CONSOLE_WORDS`, `PLATE_STATES` |
| `captain-console.css` | Every style, under `.ms-captain-console`; starts with the kit's stylesheet. Its own: the plates' two columns, and (question 1) the plate |
| `preview/` | Development only: the preview (in the phone shell's sheet over the Command Room, as sheets 22 and 24 draw it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `captain` in its `console`, `used`, `release` and `eject` states) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/captain-console-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/captain-console.test.mjs`.

**Uses unchanged:**
- **The kit (0.7.0):** `who` (the confirm's icon, title and line), `facts`, `groupNote`, and the control policy. The plate: question 1.
- **The plates' art:** the game's existing film art bundle (`apps/game/hosted/board-v2-film-art/captain/plate-{release,eject}-{available,used,unavailable}.svg`, `catalog.json`), through the CSS properties it defines (`--board-v2-film-captain-plate-release-available` and the rest), as today's game draws them. The component names the property; it fetches nothing.
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
| `plates` | The Captain's | `{ release, eject }`, each `{ state, reason }`. `state` is `available` (offered now), `used` (`captainCommands.releaseUsed` or `ejectUsed`) or `unavailable` (not used, not offered); `reason` is Frontend's line for an unavailable plate: the server's reason, or "Not available now" (T3). Drawn: "No one in Jail" |
| `jailed` | Public | The names of who is in Jail now, in seat order, for the confirm's line ("Fay and Ike are in Jail"). Question 3 |
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
| The plates | Two tiles side by side (10 px apart), each at least 150 px tall: the plate's art (up to 140 px wide, 78 px tall, kept whole), its name, and its line. An available plate is a button; a used or unavailable one isn't, and its name dims, as the pack's `spent` and `unavailable` tiles. The art is the state's own: available, used or unavailable |
| The note | The kit's group note: "Each command works once a match, whoever is Captain." |
| The confirm | The kit's who block (the release or eject icon on its 64 px paper tile, "Release the Jail" or "Eject the Jail", who is in Jail), then the kit's facts, each with the amber "i" |
| The footer | Cancel (secondary, this phone's own), then Release (primary) or Eject (the warning button), the commands |

**Words that state a rule** (as the office decisions' decision 7, to confirm in question 4). These fixed words are the pack's, the same every time, and must change with the rules:
- "Once a match";
- "Each command works once a match, whoever is Captain.";
- "Once a match, on your turn in the Command Room";
- "Frees everyone physically in Jail now", "Ejects everyone physically in Jail now";
- "Hospital detention is not affected".

**Motion:** none of its own.

## Frontend's connection

1. Open the shell's sheet with `captainConsoleSheet(input)` from the Command Room's chip on the Captain's turn, and mount `mountCaptainConsole` in `shell.sheetBody`.
2. Give `plates` from `abilities.captainCommands` and the offers (`CAPTAIN_RELEASE`, `CAPTAIN_EJECT`), with the server's reason or "Not available now" for an unavailable plate; `jailed` from the board.
3. On `onPlate`, set `view`; on `cancel`, return to `console`; on `release` or `eject`, send the command, and on its answer return to `console` (the plate now used) or close the sheet.
4. Today's plates in Actions leave the screen.

## Questions for the Lead

1. **The plate:**
   - The pack's plate is its `.tile` with an `<img>` of the plate's art in place of the icon, at least 150 px tall, and a `spent` state for a used command.
   - The kit's tile (0.7.0) takes art as markup (`art`, for the private talk's cards) and has no `spent` state; the plates are files, through the film bundle's CSS properties.
   - Into the kit (a tile's picture by CSS property, and `spent`), or scoped here as `.ms-cc-plate`?
2. **The `pressed` art:** the bundle also has `plate-*-pressed.svg`, which the pack doesn't draw. I propose leaving it unused rather than adding a pressed look the sheets don't show.
3. **Who is in Jail:**
   - The confirm's line names who is in Jail ("Fay and Ike are in Jail").
   - I propose Frontend gives the names (`jailed`), and the component puts them in the pack's words, as decision 7 settled for the office decisions: "Fay is in Jail", "Fay and Ike are in Jail", "Fay, Ike and Gus are in Jail".
   - With no one in Jail, neither command is offered, so no confirm opens.
4. **The rule-stating words** (listed under "Drawn"): the component's, as the office decisions' decision 7?
5. **Privacy:** every view is refused unless the viewer is the Captain, as the contract keeps `captainCommands` to the Captain. The plates and the jailed names leave the page on a viewer change or when concealed.
6. **Reconnecting:**
   - Opening a confirm and Cancel are this phone's own, and keep working.
   - Release and Eject wait with the banner's words.
   - The ✕ is the shell's.

## Not in this version

Everything: this is the interface. Next, once the Lead approves it:
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
