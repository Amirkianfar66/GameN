# Windows: Designer's runtime component

**Version:** `windows-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

**What it is:** the Windows sheet, as sheet 34 draws it: the drawings shown at the windows of this player's room, and, at a window's station, a drawing to show. It covers the Windows half of #222 item 32 (P3): "names and portraits instead of player numbers". It is the destination that the Panels row opens (#296). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Audience:** this phone. The drawings are shown to the players at the window's two rooms (the projection gives this player only the windows of their own room). A drawing being made is this phone's own until it is shown.

**Covers:**

| View | Sheet (the shell's frame) | Body (this component) |
| --- | --- | --- |
| **View** (`windows`, no station) | "Windows", Back, ✕, large | For each window of this room: its head ("Room A ↔ Room B", and "Ends with the round"), then each drawing shown there this round, in order, each in its dark box with its line ("1 · Hana · Round 3", and "Unverified") |
| **Draw at your station** (`windows`, at a station) | As above; footer: Show | The station's window: its head ("Room A ↔ Hospital", and "Your station · A2"); the drawing box to draw in; the four inks (Gold, Paper, Teal, Pink); Undo stroke and Clear drawing. Then "Shown this round" and that window's drawings |
| **Shown** (`shown`) | As above; footer: Done | The station's window head; the drawing just shown, with the amber "SHOWN" stamp and its line ("2 · Dev · Round 3", and "Can't be changed"); then "Shown this round" and the others |
| **No window here** (`windows`, none given) | As above | The waiting block: the window icon, "No window here", and Frontend's line ("The Command Room has no window") |

**What changes from today:**
- **Today:** a drawing's line names a number ("1. Player 8 · Round 3"); the drawing tools are a colour picker and a width list; "No window is visible from your current location."
- **Drawn:** names ("1 · Hana · Round 3"); the four inks with Undo and Clear; Show, then the shown drawing stamped "SHOWN"; "No window here" with its line.

**Comparison part:** `windows` (sheet 34, the view state) in `design/tools/lib/phone-ui-native-parts.mjs`. It applies when Frontend's PR mounts this component; until then, the component's own captures are its evidence.

**Not in it:**
- **The sheet's frame:** its title, Back, ✕, glass and footer are the phone shell's. The module gives Frontend each view's frame and footer (`windowsSheet`), so the words stay in Designer's source.
- **The facts:** which windows this player sees and where they can draw, every drawing with its author and order, and when the windows are open are Frontend's, from the projection (`windows`). The component never works one out.
- **The Blackout's window** (sheet 30, `SELECT_BLACKOUT_SLOT`): a different part.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/windows/`:

| Path | What |
| --- | --- |
| `windows.mjs` | `mountWindows()`, `windowsSheet()`, `nextWindowsInput()`, `WINDOWS_DEFAULTS`, `WINDOWS_VERSION`, `WINDOWS_SHEET_ID`, `WINDOWS_WORDS`, `INKS` (the pack's four), `drawingSvg()` (a drawing's strokes as the pack's SVG, in its 512 × 280 box) |
| `windows.css` | Every style, under `.ms-windows`; starts with the kit's stylesheet. Its own: the drawing box, the inks, the drawing's line, and the stamp's place |
| `preview/` | Development only: the preview (the body in the phone shell's sheet over Room A, as sheet 34 draws it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `windows` in its four states) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/windows-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/windows.test.mjs`.

**Uses unchanged:**
- **The kit (0.6.1):** `groupLabel`, `stamp` (amber "SHOWN"), `iconButton` (Undo, Clear), `wait` (`size: 'small'`, "No window here"), and the control policy.
- **The section head** (the pack's `.section-head`: the window's rooms in capitals, and its line at the right): question 1.
- **The phone shell (0.2.7):** its sheet, with footer actions (`local` for Done) and its toast, opened by Frontend; the component does not import the shell.

## Mount, update and dispose

```js
import { mountWindows, windowsSheet } from '…/design/phone-ui/components/windows/windows.mjs';
import '…/design/phone-ui/components/windows/windows.css';

shell.update({ sheet: windowsSheet(input) });          // the frame and footer for the view
const windows = mountWindows(shell.sheetBody, input, handlers);
windows.update({ ...changes });                        // each key given replaces that key; the rest stay
windows.dispose();                                     // safe twice; afterwards nothing fires
```

- **One sheet id (`windows`) for every view.** Back is the shell's: Frontend returns to Panels.
- **On update,** each window and drawing keeps its element; the drawing box keeps its element and the focus while a stroke is drawn.

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `view` | This phone | `windows` or `shown`: Frontend's (`shown` after a Show it sent is accepted, until Done) |
| `status`, `interactive`, `viewer` | This phone | `live`, `stale` or `concealed`, as the shell's |
| `windows` | The window's rooms | `[{ windowId, rooms, station, drawings }]`, from the projection's `windows`. `rooms` are the window's two rooms by name (`['Room A', 'Hospital']`); `station` is this player's place when they can draw there (`'A2'`, from `canDraw` and the seat's place), or `null`; `drawings` are `[{ id, order, round, author: { seat, name }, drawing }]`, this round's, in order, with `drawing` the contract's strokes |
| `none` | This phone | Frontend's line when no window is given: why ("The Command Room has no window", or that the windows are closed now) (question 3) |
| `draft` | This phone, private | The drawing being made: `{ windowId, ink, strokes }`, Frontend's to keep between mounts (question 4) |
| `show` | This phone | `{ enabled, busy, reason }`: the projection's `SHOW_WINDOW` offer, and Frontend's state while it is sent |
| `shown` | This phone | In `shown`: the id of the drawing just shown (one of the station window's drawings, by this player) |

## Callbacks

| Callback | When |
| --- | --- |
| `onDraft({ windowId, ink, strokes })` | A stroke ends, Undo or Clear is tapped, or an ink is chosen: the whole draft, as the contract's drawing takes it |
| The shell's `onSheetAction(id)` | `show` (Frontend sends `SHOW_WINDOW { windowId, drawing }` with the draft's strokes), `done` (from `shown`: back to `windows`, a new blank draft) |
| `onFocusReturn({ intent, value })` | As the other components' |

## Drawn

| Part | Drawn |
| --- | --- |
| A window's head | The rooms in capitals ("ROOM A ↔ HOSPITAL"), and at its right "Ends with the round", or "Your station · A2" |
| A drawing | Its dark box at the pack's 512 × 280 proportion, the strokes as SVG paths in their colours and widths (a one-point stroke as a dot); under it, "order · name · Round n" and "Unverified" (or "Can't be changed" for this player's own) |
| The drawing box (at a station) | The same box, taking a finger or a pen; the current stroke drawn as it is made, in the chosen ink at the pack's width (6 in 512) |
| The inks | Four round swatches, a radio group named "Ink": Gold `#F7D886`, Paper `#F4EBDD`, Teal `#57BBA8`, Pink `#C2408F`; the chosen one ringed in amber. Then Undo stroke and Clear drawing, the kit's icon buttons |
| Shown | The drawing just shown, with the kit's amber "SHOWN" stamp at its top right |
| No window here | The kit's small waiting block: the window icon, "No window here", Frontend's line |

**The contract's limits:** the box keeps a drawing within `PlanetDrawingSchema` (up to 128 strokes, 512 points a stroke, 4096 in all, points from 0 to 1, colours as `#rrggbb`). Points closer than a pixel are dropped as they're drawn, and a stroke past the limits ends. Show is off while the draft is empty.

**Motion:** none of its own.

## Frontend's connection

1. Open the shell's sheet with `windowsSheet(input)` from the Panels row (`onOpen('windows')`, #296), and mount `mountWindows` in `shell.sheetBody`.
2. Give `windows` from the projection: each window's rooms, the station when `canDraw`, and its drawings with each author's name. Give `none` when the list is empty.
3. Keep the draft from `onDraft` and give it back as `draft`. On `show`, send `SHOW_WINDOW { windowId, drawing: { strokes } }`; once it's accepted, set `view: 'shown'` with `shown`. On `done`, return to `windows` with an empty draft.
4. Today's Windows panel leaves the screen.

## Questions for the Lead

1. **The section head:**
   - Sheet 34 uses the pack's `.section-head`: the rooms in capitals at the left, the line at the right.
   - The Gameplay builder's Actions draws the same head as its own (`.ms-ac-head`, sheet 28), so Windows would be its second user.
   - Should it go into the kit (yours), or should Windows scope its own?
2. **The draw view:**
   - The pack's "Draw at your station" shows only the station's window and its "Shown this round". This room's other window isn't drawn: at A2, Room A ↔ Room B is missing.
   - I propose the station's window first, then the room's other windows in view form below, so nothing visible is lost.
   - Or follow the pack exactly?
3. **No window here:**
   - The projection gives no windows both in a room without one and when the windows are closed (after the ship moves, during navigation, in the Blackout's dark).
   - I propose the component holds "No window here", and Frontend gives the line, saying which applies.
4. **The draft:**
   - The drawing being made is reported on each change (`onDraft`), and Frontend keeps it and gives it back. That way it survives a remount, as today's game keeps it per round, window and place.
   - It is dropped on a viewer change and when concealed.
   - Or should the component keep it, reporting only on Show?
5. **The pen:** the pack has no width control, so I propose the pack's width (6 in 512) and its four inks, with Gold first. Today's colour picker and width list go.
6. **The keyboard:** today's game draws with the keyboard too (arrow keys move the pen, Space draws). The pack doesn't show it. I propose keeping it: the box is focusable and named for what it does, with a visible pen mark while the keyboard draws.
7. **Names:** item 32 asks for "names and portraits". Sheet 34 draws names only ("1 · Hana · Round 3"), so I propose names, as drawn. Should a portrait be added?
8. **Reconnecting:** drawing, the inks, Undo, Clear and Done are this phone's own and keep working. Show waits with the banner's words, as the other commands do.

## Not in this version

Everything: this is the interface. Next, once the Lead approves it:
- the module and its styles;
- the preview's states:
  - view at both windows;
  - drawing at A2, with a draft;
  - shown;
  - no window;
  - Show in flight;
  - reconnecting;
  - the Largest text;
- the probe (including drawing by pointer and by keyboard, the limits, Undo and Clear, and the draft's privacy);
- the check at 390 × 844 and 430 × 932 under the production headers;
- the agreement with the pack;
- the test;
- the owner's test page.
