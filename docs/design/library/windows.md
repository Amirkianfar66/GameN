# Library group 5: windows and drawing

Designer delivery, 5 November 2026. This group covers the brief's "Windows and drawing" row, drawn from the candidate contract's views:

- three framed windows, each seen from either end;
- four drawing stations, marked on the board;
- the local drawing pad and its Show;
- the feed of immutable drawings in their shown order, with author and expiry;
- the Blackout's shade.

This is a proposal: nothing is adopted until Integration review, and the words are proposals for Frontend.

- **Contract:** protocol 3 candidate, `packages/contracts/src/planet-game.ts` at `79418e7` (not adopted):
  - `PlanetWindowId` (`A_B`, `A_HOSPITAL`, `B_JAIL`), `PlanetDrawing` (bounded vector strokes) and `PlanetWindowDrawing`;
  - the command `SHOW_WINDOW` and `offers[].windowIds`;
  - the view's `windows[]` and its endpoint, station and round audience check.
- **Rules read:**
  - successor `game-design.md` ("Promises and windows");
  - `owner-decisions.md` P04 and P26, and the examples under them;
  - `rules-contracts.md` (shown window images);
  - `implementation.md`;
  - `motion-requirements.md` (Windows; Movement);
  - `designer-production-brief.md` (the Windows row; drawings are claims; Blackout).
- **Base:** stacked on library group 4 (#178).
- **Review page:** `npm run dev:review --workspace @mothership/design-tokens`, then `/library/windows/index.html` (`?w=320`, `&text=2`, `&motion=reduced`, `&only=stations|pad|viewers|board|motion`).
- **No film or video.** The windows are seen only by players at their ends and play short motions only, so this group adds nothing to the cinematic stage, gallery or exports.

## What the rules ask, and what is drawn

| Rule | Drawn as |
| --- | --- |
| Only A↔B, A↔Hospital and B↔Jail, each seen from either end, with no transitive view and no new voice (game design; brief) | Three windows, each titled with the room at its other end ("Window to Room B"). Each has its own lintel emblem, so none depends on a hue: two joined portholes, the ward's rounded cross, three bars. The pad has no text tool |
| A1 and B1 draw into A↔B, A2 into A↔Hospital, B2 into B↔Jail; only the current occupant can Show; Hospital and Jail have no station (game design; contract) | The pad appears only under the window whose station this seat occupies (`canDraw`). Every other window says "Only the player at this window's drawing station can show drawings here." In the Hospital and the Jail it says "There is no drawing station here." The board marks the four stations with a floor plate |
| Draw locally; Show an immutable image, appended with author and order; no erase or replace (game design; motion requirements) | Inks, widths, Undo and Clear act only on this phone. Show asks first: "… Everyone in Room A and Room B sees it, and it cannot be erased or replaced." The feed numbers each drawing in shown order with its author ("#2 · Player 6, Fay"). No control acts on a shown drawing |
| Drawings expire at the round's end; they survive Sync with window-only access (game design; P04) | "Shown drawings stay until the end of Round 4." The next round's feed is empty ("Nothing shown yet this round.") |
| Viewing, drawing and Show are free; a movement block does not stop a seated artist (P26) | No cost is drawn anywhere. The pad depends only on the station and the offer |
| Windows cannot bypass the Blackout's darkness (brief; motion requirements) | During `BLACKOUT` a shade lowers over every pane: "Lights out: the Blackout darkens every window until the lights return." No pad is drawn |
| Drawings are claims, not verified evidence (brief; P25) | Every window says "Drawings are claims. The app does not check them." No word calls a drawing proof, evidence or fact |
| Bounded vector strokes only; never script, HTML, SVG markup or remote URLs (contract) | `drawingPaths()` keeps only `#RRGGBB` colours, widths 1 to 24 and points inside 0 to 1, and emits numbers. A test feeds it hostile strokes. The pad's ink meter counts toward the contract's 4,096 points |

## State maps (from `states.mjs`)

Every state is a pure function of the seat's own view and of the client's own memory:
- the local drawing;
- whether Show was pressed (review);
- a command still pending;
- an acceptance or a refusal, with its phase.

`windows[]` and `offers[]` are the only authority.

### `windowsFor(view)`

This seat's windows, in the view's order. Each carries:
- the room at its other end (`facing`);
- `station`: this seat is at its drawing station (`canDraw`);
- `canShow`: `SHOW_WINDOW` is offered for it;
- its drawings, sorted by `order`.

### The pad: `padState(view, windowId, { local, reviewing, pending, accepted, rejected })`

| State | When | Drawn |
| --- | --- | --- |
| `none` | the seat does not see this window | nothing |
| `dark` | the `BLACKOUT` phase | the shade over the pane, no pad |
| `view-only` | not at this window's station | the pane and its notes |
| `blank` | at the station, nothing drawn | "You are at this window's drawing station…", the pad, inks, widths, "Draw with your finger. Nothing is sent until you press Show." |
| `drawing` | a local drawing in progress | the pad, the ink meter, Show (primary), Undo and Clear (quiet) |
| `full` | the drawing has reached 128 lines or 4,096 points | "Your drawing is full. Show it, or undo a line to make room." |
| `review` | Show pressed, offered, and the drawing valid | the drawing, the warning, Show and Back |
| `sending` | `SHOW_WINDOW` sent, no receipt | SENDING |
| `shown` | accepted in this phase, the pad blank again | SHOWN; "Shown. It stays in the window until the end of Round 4." |
| `refused` | refused in this phase | "… Nothing was shown, and your drawing is still here." |
| `closed` | at the station, but Show is not offered now | the drawing stays local; "Show opens when the server allows it." |

### What a view brings once

- `newDrawings(previous, view)` returns drawings first seen on this screen. `windows[].drawings[]` has no `publishedAt` (R7), so a drawing stamps in on first sight only and never on a reconnect.
- `darkChange(previous, view)` returns `dark` or `light` when the Blackout starts or ends.

## Assets

`design/library/windows/assets/` is generated by `node design/tools/library-assets.mjs` from `art.mjs`; `--check` fails on drift. Each picture is also a custom property in `windows.art.css` (`--wn-asset-<name>`), drawn only behind `[data-art~="windows"]`.

| Asset | Size | SHA-256 | Used for |
| --- | --- | --- | --- |
| `wn-station.svg` | 40×40 | `16984012c76967b0…` | public: the board's drawing-station marker (A1, B1, A2, B2) |
| `wn-pad.svg` | 320×240 | `351eed1cfe8e2f2d…` | station-private: the drawing pad's paper |
| `wn-shade.svg` | 320×120 | `1abd18df9fd8421d…` | window audience: the Blackout's shade |
| `wn-icon-window.svg` | 48×48 | `95369f7d06585011…` | window audience: tray mark |
| `wn-lintel-a-b.svg` | 320×48 | `6620f2dc5f4912a5…` | window audience: the A_B window's lintel |
| `wn-lintel-a-hospital.svg` | 320×48 | `402c85aa4b171db0…` | window audience: the A_HOSPITAL window's lintel |
| `wn-lintel-b-jail.svg` | 320×48 | `b6f98973b1fb1146…` | window audience: the B_JAIL window's lintel |
| `windows.art.css` | 6,600 bytes | `c94a85643f8a5b8d…` | all of the above as custom properties |

Full hashes and bytes are in `assets/manifest.json`.

- **Palette:** the board's steel, navy and plate, the dossier's ink, paper and yellow, and a night colour for the shade. A test holds every colour at least `MIN_ACCENT_DISTANCE` from each faction accent.
- **Inks:** the pad offers five, `INKS`: Ink, Chalk, Yellow, Cyan and Green, each named on its swatch. None is close to a faction accent, so the offered inks suggest no side. The contract still accepts any colour a client sends.
- **Widths:** Fine 3, Medium 7, Bold 14.
- **Words:** no picture holds a word.

## Mounting

- **Where:**
  - The windows mount in the seat's own sheet, for the windows in its view only (the contract already limits `windows[]` to the seat's endpoints).
  - The pad mounts only under the window whose station the seat occupies.
  - The station marker is drawn on the public board at the slot's `feet` anchor (`design/board-v2/contract/slots.json`), under the figure, on A1, B1, A2 and B2. It is shown even when the slot is empty, so anyone choosing a slot sees the stations.
- **A window:**
  - **Lintel:** stretched to the window's width, its emblem at the left and the title as page text.
  - **Pane:** the feed as a grid of thumbnails, each 4:3 with tape, its drawing and its caption. One column on narrow sheets and at large text.
  - **Notes:** the claim and the expiry under the pane.
- **The pad:**
  - A 4:3 box with `touch-action: none`, over the paper.
  - Below it: the inks (44 px swatches, named), the widths (named, 44 px tall), the ink meter, and the tools.
  - Show is the one primary action; Undo and Clear are quiet. A blank pad shows no tools.
- **Drawing:**
  - Strokes are sampled from pointer moves into 0..1 points and rendered with `drawingPaths()`.
  - Strokes follow the finger with no animation of their own.
  - At the budget, new strokes are refused locally with the "full" words. The local drawing is kept until Show is accepted, Clear is pressed, or the round ends.
- **Rendering shown drawings:** build them from `drawingPaths()` with `createElementNS`, never `innerHTML`. The output is numbers and a checked colour only.
- **Large text:** every word follows the reader's text size; at 200% the feed is one column, the lintel's title wraps, and nothing is clipped or wider than the phone.

## Motion (`motion.mjs`)

Each motion plays once, from the moment its cause first arrives in a view this screen has already drawn, and never on a reconnect.

| Motion | Full | Beats | Reduced |
| --- | --- | --- | --- |
| `show` | 760 ms | on the artist's accepted receipt: the drawing lifts off the pad into the pane and shrinks 0–480; the new image lands 360–560; SHOWN 480–760 | fades, 160 ms |
| `arrive` | 420 ms | a drawing first seen (R7): it drops into the end of the feed 0–360; its tape presses down 240–420 | fades, 160 ms |
| `dark` | 420 ms | the Blackout begins: the shade lowers over the pane 0–320; "Lights out" 240–420 | fades, 160 ms |
| `light` | 320 ms | the Blackout ends: the shade rises 0–320 | fades, 160 ms |

## Sound and vibration

None. A sound would tell the table that someone drew or showed something.

## Privacy-safe preload

`windows.art.css` (6.6 KB) loads whole on every player phone with the ability art, whatever the seat's place.

## Contract requests

- **R7** (existing): a shown drawing has no `publishedAt`. Until it has one, a new drawing stamps in on first sight only, never on a reconnect.

R7 is in the motion bible's request table (`cinematic-catalogue-0.6.0`), whose "Windows and drawing" entry now points here.

## Checks

- `node --test packages/design-tokens/test/library-windows.test.mjs`, 10 tests:
  - three windows with two ends each, none transitive; four stations, none in the Hospital, the Jail or the Command Room;
  - the pad only at the station, Show only with the offer, nothing sent before Show, the Blackout darkening every window;
  - the budget and validity matching `PlanetDrawingSchema`: 4,096 points, 128 lines, 512 per line, hex colours, widths 1 to 24, points in 0..1;
  - the renderer under hostile strokes (markup, script, links, `NaN`, out-of-range points): numbers and a checked colour only;
  - first-sight stamping (R7), the feed in shown order, the shade's changes;
  - words: claims, never facts or views, no text channel, the Show warning;
  - the art: one palette off every faction accent (the inks too), three distinct lintels, no words or links;
  - generated-asset drift;
  - motion bounds and reduced fades;
  - the review report.
- `node design/tools/library-assets.mjs --check`: the generated files are current (all five groups).
- `node design/tools/library-capture.mjs --group windows`: 117 captures in `review/`, 0 problems.
  - Every state at 390 and 320 px, and the four state sections at 200% text, with a contact sheet each.
  - Every motion as six frames, full and reduced.
  - Measured: no sideways overflow, every sheet exactly its phone width, game buttons at least 44 px, no page error, and at 200% no visible sheet text under 24 px.

Not tested: real phones, real finger drawing (the review page draws synthetic strokes), screen readers, the runtime itself, and the contract's adopted revision.
