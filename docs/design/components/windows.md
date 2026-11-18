# Windows: Designer's runtime component

**Version:** `windows-0.1.1`. **Status (18 November 2026):** 0.1.1 shows the drawing box's focus ring for the keyboard only, never while a finger draws (decision 9), and decision 4 says how long the draft is kept, as the Lead decided. 0.1.0 (16 November) was built to the interface the Lead Designer approved with the answers below (#299), without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280). Its check's record is at the end.

**What it is:** the Windows sheet, as sheet 34 draws it: the drawings shown at the windows of this player's room, and, at a window's station, a drawing to show. It covers the Windows half of #222 item 32 (P3): "names and portraits instead of player numbers". It is the destination that the Panels row opens (#296). The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Audience:** this phone. The drawings are shown to the players at the window's two rooms (the projection gives this player only the windows of their own room). A drawing being made is this phone's own until it is shown.

**Covers:**

| View | Sheet (the shell's frame) | Body (this component) |
| --- | --- | --- |
| **View** (`windows`, no station) | "Windows", Back, ✕, large | For each window of this room: its head ("Room A ↔ Room B", and "Ends with the round"), then each drawing shown there this round, in order, each in its dark box with its line ("1 · Hana · Round 3", and "Unverified") |
| **Draw at your station** (`windows`, at a station) | As above; footer: Show | The station's window: its head ("Room A ↔ Hospital", and "Your station · A2"); the drawing box to draw in; the four inks (Gold, Paper, Teal, Pink); Undo stroke and Clear drawing. Then "Shown this round" and that window's drawings |
| **Shown** (`shown`) | As above; footer: Done | The station's window head; the drawing just shown, with the amber "SHOWN" stamp and its line ("2 · Dev · Round 3", and "Can't be changed"); then "Shown this round" and the others |
| **No window here** (`windows`, none given) | As above | The pack's small waiting block: the window icon, and Frontend's title and line (drawn: "No window here", "The Command Room has no window") |

**What changes from today:**
- **Today:** a drawing's line names a number ("1. Player 8 · Round 3"); the drawing tools are a colour picker and a width list; "No window is visible from your current location."
- **Drawn:** names ("1 · Hana · Round 3"); the four inks with Undo and Clear; Show, then the shown drawing stamped "SHOWN"; "No window here" with its line.

**Comparison part:** `windows` (sheet 34, the view state) in `design/tools/lib/phone-ui-native-parts.mjs`. It applies when Frontend's PR mounts this component; until then, the component's own captures are its evidence.

**Not in it:**
- **The sheet's frame:** its title, Back, ✕, glass and footer are the phone shell's. The module gives Frontend each view's frame and footer (`windowsSheet`), so the words stay in Designer's source.
- **The facts:** which windows this player sees and where they can draw, every drawing with its author and order, and when the windows are open are Frontend's, from the projection (`windows`). The component never works one out.
- **The Blackout's window** (sheet 30, `SELECT_BLACKOUT_SLOT`): a different part.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/windows/`:

| Path | What |
| --- | --- |
| `windows.mjs` | `mountWindows()`, `windowsSheet()`, `nextWindowsInput()`, `WINDOWS_DEFAULTS`, `WINDOWS_VERSION`, `WINDOWS_SHEET_ID`, `WINDOWS_WORDS`, `INKS` (the pack's four), `PEN_WIDTH` (6), `DRAWING_BOX` (512 × 280), `DRAWING_LIMITS` (the contract's), `checkStrokes()` (a drawing's strokes checked against them), `drawingSvg(document, drawing)` (a drawing as the pack's SVG, in its box) |
| `windows.css` | Every style, under `.ms-windows`; starts with the kit's stylesheet. Its own: the drawing's dark box, the drawing box's pen, the inks, the drawing's line, the stamp's place, and the 12 px between windows |
| `preview/` | Development only: the preview (the body in the phone shell's sheet over Room A with the Panels tab open, as sheet 34 draws it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `windows` in its four states). Its drawings are the pack's own sketches (Hana's face, Eli's arrow, Dev's "13") turned into the contract's strokes: a line's corners exactly, a curve sampled every 3 units along it |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/windows-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/windows.test.mjs`.

**Uses unchanged:**
- **The kit (0.7.0):** `groupLabel`, `stamp` (amber "SHOWN"), `iconButton` (Undo, Clear), `wait` (`size: 'small'`, "No window here"), and the control policy.
- **The kit's section head (0.7.0):** `sectionHead({ title, aside })`, the pack's `.section-head`: the window's rooms in capitals, and its line at the right. It moves into the kit because Actions and Windows both draw it (decision 1).
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
| `windows` | The window's rooms | `[{ windowId, rooms, station, drawings }]`, from the projection's `windows`, all the room's windows. `rooms` are the window's two rooms by name, this player's first (`['Room A', 'Hospital']`); `station` is this player's place when they can draw there (`'A2'`, from `canDraw` and the seat's place), or `null`, on one window at most; `drawings` are `[{ id, order, round, author: { seat, name }, drawing: { strokes } }]`, this round's, drawn by `order` (then `id`), each `drawing` the contract's and checked against it |
| `none` | This phone | `{ title, line }`, both Frontend's, when no window is given. The component can't tell a room with no window from closed windows, and doesn't guess (decision 3). Drawn: `{ title: 'No window here', line: 'The Command Room has no window' }` |
| `draft` | This phone, private | The drawing being made: `{ windowId, ink, strokes }`, Frontend's to keep between mounts; `ink` one of the four (Gold until chosen), `strokes` none or more within the limits. A draft for another window isn't this one's: the box starts blank. Kept for its round, window and place; dropped as decision 4 says |
| `show` | This phone | `{ enabled, busy, reason }`: the projection's `SHOW_WINDOW` offer, and Frontend's state while it is sent; the reason drawn as given |
| `shown` | This phone | In `shown`: the id of the drawing just shown (one of the station window's drawings, by this player) |

## Callbacks

| Callback | When |
| --- | --- |
| `onDraft({ windowId, ink, strokes })` | A stroke ends (the finger lifts, Shift is let go, another arrow or Space, or the box loses the focus), Undo or Clear is tapped, or another ink is chosen: the whole draft, a new copy, as the contract's drawing takes it. A stroke still being drawn when the station, the viewer or the status changes ends unreported |
| The shell's `onSheetAction(id)` | `show` (Frontend sends `SHOW_WINDOW { windowId, drawing }` with the draft's strokes), `done` (from `shown`: back to `windows`, a new blank draft) |
| `onFocusReturn({ intent, value })` | As the other components' |

## Drawn

| Part | Drawn |
| --- | --- |
| A window's head | The rooms in capitals ("ROOM A ↔ HOSPITAL"), and at its right "Ends with the round", or "Your station · A2" |
| A drawing | Its dark box at the pack's 512 × 280 proportion, the strokes as SVG paths in their colours and widths (a one-point stroke as a dot); under it, "order · name · Round n" and "Unverified" (or "Can't be changed" for this player's own) |
| The drawing box (at a station) | The same box, taking a finger or a pen; the current stroke drawn as it is made, in the chosen ink at the pack's width (6 in 512). It is focusable, named for its window ("Drawing for Room A ↔ Hospital") and described by its keys: the arrow keys move the pen, Shift with an arrow draws, Space makes a dot. The pen's mark shows only while the keyboard draws, so the box looks as drawn otherwise (decision 6) |
| The inks | Four round swatches, a radio group named "Ink": Gold `#F7D886`, Paper `#F4EBDD`, Teal `#57BBA8`, Pink `#C2408F`; the chosen one ringed in amber. Then Undo stroke and Clear drawing, the kit's icon buttons |
| Shown | The drawing just shown, with the kit's amber "SHOWN" stamp at its top right |
| No window here | The kit's small waiting block: the window icon, "No window here", Frontend's line |

**The contract's limits:** the box keeps a drawing within `PlanetDrawingSchema` (up to 128 strokes, 512 points a stroke, 4096 in all, points from 0 to 1, colours as `#rrggbb`). Points closer than a pixel are dropped as they're drawn, and a stroke past the limits ends.
- The numbers are kept inside the component: it doesn't import the contracts at run time.
- The test reads `PlanetDrawingSchema`'s numbers from `packages/contracts/src/planet-game.ts` and fails if they differ.
- Show is off while the draft is empty: the form's own state, not a game rule.

**Motion:** none of its own.

**Not drawn by the pack, and how they're drawn** (each the nearest the pack allows, with no words of their own):
- **Two drawings at one window:** 12 px between them, as between windows.
- **A window with no drawing yet:** its head alone; at a station, "Shown this round" is left out.
- **Nothing drawn:** Undo and Clear dimmed and refused, without words; Show off.
- **Show in flight:** the shell's busy footer button.
- **The keyboard's pen:** a ring in the chosen ink (9 in 512, 3 wide) where the pen is.
- **The inks' radio group:** it holds the four inks only, as radios do. The pack's group also holds Undo and Clear, and its inks also carry `aria-pressed`, which a radio doesn't take. The agreement records both.
- **The drawing box:** `role="application"`, so a screen reader passes the arrows and Space to it.

## Frontend's connection

1. Open the shell's sheet with `windowsSheet(input)` from the Panels row (`onOpen('windows')`, #296), and mount `mountWindows` in `shell.sheetBody`.
2. Give `windows` from the projection: each window's rooms, the station when `canDraw`, and its drawings with each author's name. When the list is empty, give `none: { title, line }`, saying which applies: a room with no window, or windows closed now (after the ship moves, during navigation, in the Blackout's dark).
3. Keep the draft from `onDraft` and give it back as `draft`. On `show`, send `SHOW_WINDOW { windowId, drawing: { strokes } }`; once it's accepted, set `view: 'shown'` with `shown`. On `done`, return to `windows` with an empty draft.
4. Today's Windows panel leaves the screen.

## Decisions (the Lead Designer, 16 November 2026, #299)

1. **The section head goes into the kit.** Actions and Windows both draw it, so it moves in under L2: kit 0.7.0's `sectionHead({ title, aside })`, compared with the pack plain and on glass. Windows uses it, and it is built last.
2. **The draw view is exactly as drawn.** At a station, the sheet shows that window only; the room's other windows are seen from the view state. Adding them below would change a drawn state, which needs the owner's approval. The gap is recorded below.
3. **No window here: both words are Frontend's,** as `none: { title, line }`. The component draws the pack's waiting block with the window icon. The drawn example is "No window here" and "The Command Room has no window".
4. **Frontend keeps the draft.** The component reports it with `onDraft` on each stroke, Undo, Clear or ink. Decided by the Lead on 18 November (#310): it is kept for its round, window and place, between openings of the sheet, and through the dark and a phase run out. It is dropped when the page is hidden or blurred, when concealed, for another viewer, on a shared display, at dispose, at the round's end, for another window or place, and when the sheet shuts while a Show of it is under way.
5. **The pen is the pack's:** its width (6 in 512) and its four inks, Gold first. Today's colour picker and width list go.
6. **The keyboard stays.** The pen's mark shows only while the keyboard draws, so the look is unchanged otherwise. The box has an accessible name and a description of the keys.
7. **Names only, as drawn:** "1 · Hana · Round 3". Item 32's "names and portraits" covers the two sheets together; sheet 33.1 has the portraits.
8. **Reconnecting:** drawing, the inks, Undo, Clear and Done keep working. Show waits with the banner's words, as the other commands do.
9. **The box's focus ring is the keyboard's** (the Lead, 18 November; `windows-0.1.1`). A focus the pointer gives the box shows no ring, even after the keyboard was used, so none shows while a finger draws. The box marks such a focus (`data-pointer`), and its next key or a blur takes the mark away: the very next key brings the ring back, and so does Tab back in after the box lost focus. A player who uses only the keyboard always sees it.

**The limits** stay inside the component, and the test checks them against the contract (above). **Show off for an empty draft** is the form's own state.

## Known gap

**At a station, the room's other window isn't on the sheet.**
- At A2, sheet 34's "Draw at your station" shows Room A ↔ Hospital and its drawings only; Room A ↔ Room B isn't drawn.
- That window's drawings are seen from the view state, away from a station.
- Showing them below would change a drawn state, which needs the owner's approval (decision 2). The component follows the pack.

## The check

`node design/tools/windows-check.mjs` bundles the preview as the game bundles the component, serves it with the hosted game's production headers, and writes `design/phone-ui/components/windows/review/`:
- **18 captures:** sheet 34's four states, nothing drawn yet, Show in flight, the keyboard's pen, reconnecting and the Largest text, at 390 × 844 and 430 × 932;
- **the probe, 19 checks:** drawing by finger and by keyboard, the inks, Undo and Clear, the limits, the footer, the views, privacy, a stroke through updates, reconnecting, focus, the layout at both sizes and the Largest text, dispose, and motion (also with the device's Reduce motion);
- **the agreement, 9 cases:** the sheet beside the frozen pack's `windows` in its four states at both sizes, and drawing at the Largest text: the same words, states, look and boxes to within half a pixel, each stroke by its box, ink, width, ends and joins;
- **the ring, 8 cases** (the Lead, 18 November), with Chrome's own touch, mouse and key input rather than the page's events, at 390 × 844, each looking at the box where it says: no ring while a finger or a mouse draws, nor after the stroke, also after Tab; the ring when Tab reaches the box; the very next key after a finger's stroke, with Tab first or not, brings it back; a tap away blurs the box and takes the pointer's mark, and Tab back in shows the ring; and a keyboard-only player sees it at every look: on arrival, as an arrow moves the pen, while Shift and the arrows draw, with the line drawn, after Space's dot, and on Tab back after Shift+Tab out. Each look also counts the box's reports, so every stroke reached it.

**Recorded against `b0cf0e08` (clean; `windows-0.1.1`, with the shell 0.2.12, kit 0.8.2 and room scene 0.5.1, #265 at `5616928e`):** 18 of 18 captures, the probe 19 of 19, the agreement 9 of 9 and the ring 8 of 8, with no unexpected policy report and no page problem. The headers' SHA-256 is `424e5dec…`. The record is `review/check.json`.
- **Against the record on `2521fa99`** (the ring's first six cases): every recorded field of the 18 captures, the probe's 19 checks and the agreement's 9 is the same; only the ring changed, to the eight cases above. 14 captures differ only below the noise of the pictures' compression and 3 are byte for byte the same; `showing` at 430 × 932 differs in the busy Show button's spinner, at another frame. The sheet is unchanged.
- **Each case fails without the part of the fix it covers,** each run with one change to the source, then restored: without the `data-pointer` rule in `windows.css`, or with the box's pointerdown no longer marking it, the six cases with a pointer fail (the ring shows while a finger or a mouse draws, with or without Tab first, since nothing before the stroke in the preview is a pointer's); with the keydown no longer taking the mark away, the two next-key cases fail; with the blur no longer taking it, the tap-away case fails; with the rule hiding the ring for every focus, the five cases that want the ring fail; and with Shift and the arrows marking the box as a pointer would, the keyboard-only case fails at its two looks while the keys draw. The Tab and keyboard-only cases pass with each of the pointer's changes.
- **The record on `2521fa99`, against the one on `dabd6f21`** (0.1.0): every recorded field of the 18 captures, the probe's 19 checks and the agreement's 9 is the same, but for the bundle's file name in the known Zod report; the ring is new. 16 captures differ only below the noise of the pictures' compression and one is byte for byte the same; `showing`, at both sizes, differs in the busy Show button's spinner, at another frame. The sheet is unchanged.
- **The record on `dabd6f21`, against the one on `96729d1b`** (kit 0.7.0, shell 0.2.7): every recorded field the same, but for the bundle's file name in the known Zod report. 14 captures differed only below the noise of the pictures' compression; the other 4 in two places outside the sheet: the busy Show button's spinner (`showing`) and the room's name tags behind the sheet's glass, drawn as room scene 0.5.1 draws them (`largest`).

## Not in this version

- **Frontend's connection** (#284 is not started by Designer).
- **The owner's test page:** built from the preview, published once the owner gives the go-ahead.
