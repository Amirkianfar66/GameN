# Panels: Designer's runtime component

**Version:** `panels-0.1.1`. **Status (16 November 2026):** built to the interface the Lead Designer approved on #296, with the Lead's seven answers below, against the phone shell 0.2.6. **Since 18 November** it is on the phone shell 0.2.12 and kit 0.8.2 (#265 at `5616928e`, merged at `58c38232`), and it looks and reads as before; it belongs to the Designer's Gameplay UI builder. **`panels-0.1.1` (18 November):** the Round order row's line follows the steps given, the Lead's fix from the review of the game's Panels ([below](#the-round-order-rows-line)). Built without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280). It does not activate a native interface: that is Frontend's PR, under the phone merge gate.

**What it is:** the Panels tab's sheets, as sheet 32 draws them: the Panels list, Players and Round order. It covers #222 items 29, 30 and 31 (P3):
- **Panels:** "each row says what it shows and who can use it".
- **Players:** "portraits, names, Captain and Officer badges, and injuries".
- **Round order:** "each phase on its own row with its timing".

The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Audience:** this phone only. Every fact on it is public (seats, rooms, health and offices), but the sheet is opened on one phone.

**Covers:**

| View | Sheet (the shell's frame) | Body (this component) |
| --- | --- | --- |
| **Panels** (`list`) | "Panels", ✕, the shell's own height | The destinations, each with what it shows or who can use it: "Windows" ("Room A ↔ Room B · Room A ↔ Hospital"), "Navigation" ("Captain and Officer only"), "Hospital panel" ("Patients only"). Then "Players" ("Seats, rooms and public status") and "Round order" ("Phases and timings", or "The phases, in order" while no step has its timing). A destination this player can't use is dimmed. |
| **Players** (`players`) | "Players", Back, ✕, large | A row per seat: the portrait, "1 · Ava" ("4 · Dev (you)" for this phone), the line ("Hospital · Injured", "In Jail"), and the Captain or Officer badge. Then "Public facts only: seats, rooms, health and offices." |
| **Round order** (`round-order`) | "Round order", Back, ✕, large | A row per phase, in the ruleset's order: its icon on steel, its name ("Jail vote") and its timing ("60 s, then 5 s result"), in Frontend's words |

**What changes from today:**
- **Today:**
  - Panels is a list of tall buttons with names only.
  - Players are text lines ("Player 1 · Crew 1 · Room A · Healthy").
  - Round order is one run-on sentence, with no timings.
- **Drawn:**
  - The Panels rows say what each shows and who can use it.
  - Players has portraits, names, badges and injuries.
  - Round order has a row per phase with its timing.

**Comparison parts:** `panels`, `players` and `round-order`, all sheet 32, in `design/tools/lib/phone-ui-native-parts.mjs`. They apply when Frontend's PR mounts this component; until then, the component's own captures are its evidence.

**Not in it:**
- **The destinations themselves:** Windows (sheet 34), Navigation (sheet 41) and the Hospital panel (sheet 43) are other components. Here only the rows that open them; Frontend opens each.
- **Promises and Settings:** they open from the top bar (Promises is #297; Settings is #294).
- **The sheet's frame:** its title, Back, ✕ and glass are the phone shell's (#265). The module gives Frontend each view's frame (`panelsSheet`), so the words stay in Designer's source.
- **The facts:** who can use a destination now, where each player is, and the phases with their names and timings are Frontend's, from the projection and the ruleset. The component never works one out, and never holds the round's order or its words.
- **The frozen Food release's Tasks row and "Away on the Food Supply Task":** they stay in the frozen release (answers 4 and 7).

## The Lead's answers (#296)

1. **The split:** one module, three views, one sheet, as Host controls. "Panels" has ✕ at the shell's default height; Players and Round order have Back and ✕, and are large. Each destination row only reports `onOpen(destination)`; Windows, Navigation and the Hospital panel are other components.
2. **A destination this player can't use:**
   - It is dimmed and refused, with its line unchanged and Frontend's reason as its description.
   - "Captain and Officer only" and "Patients only" are the owner-approved words of item 29, so they are the component's own.
   - Whether the row is enabled is only ever Frontend's `enabled`; the component never decides it from the line.
3. **Windows:**
   - The line lists the pairs as given ("Room A ↔ Room B · Room A ↔ Hospital").
   - With no window, the line is "No window here". The row stays enabled and opens Windows, whose sheet 34 has its own "No window here" state.
   - It is dimmed only when Frontend says `enabled: false`.
4. **Players' line:**
   - When `jailed`, "In Jail" takes the room's place: "In Jail" alone, or "In Jail · Injured". Jailed stays distinct from simply being in that room, so the line never depends on that rule.
   - Otherwise it is the room, then "Injured" or "Eliminated".
   - With no room, the health word alone.
   - The closed key set refuses a role or a revealed faction.
   - The viewer's own row reads as the pack's ("4 · Dev (you)"), from `viewer`.
   - The badges are the kit's paper pills.
5. **Round order:**
   - The step words and timings are Frontend's, from the ruleset, and the component holds no step words.
   - The icon comes from the component's map by kind; an unknown kind gets the Round order icon.
   - There is no note: the pending Blackout-before-voting order is the rules' business. Its absence is the one difference recorded against the pack.
6. **Reconnecting:** the rows only open a sheet on this phone, so they keep taking taps, as Settings does. A destination that isn't enabled stays refused, and `interactive: false` refuses everything.
7. **The frozen Food release's Tasks row** stays out.

### The Round order row's line

The Lead's fix of 18 November, from the review of the game's Panels (#310): the row says what the view will show.
- **"Phases and timings"** (the pack's) once a step is given with its timing.
- **"The phases, in order"** (the Lead's words) while none is. The game gives no timings yet (#222).

The line follows the steps given (`roundOrderLine(steps)`), never a fixed string. When Frontend gives timings, it goes back to "Phases and timings" with no change here.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/panels/`:

| Path | What |
| --- | --- |
| `panels.mjs` | `mountPanels()`, `panelsSheet()`, `nextPanelsInput()`, `playerLine()`, `roundOrderLine()`, `PANELS_DEFAULTS`, `PANELS_VERSION`, `PANELS_SHEET_ID`, `PANELS_WORDS`, `PANEL_DESTINATIONS`, `ROUND_STEP_ICONS` |
| `panels.css` | Every style, under `.ms-panels`; starts with the kit's stylesheet. Its own: the 14 px between the Panels list's two lists, and the badges' row at a player's end |
| `preview/` | Development only: the preview (the body in the phone shell's sheet over Room A, with the Panels tab open, as sheet 32 draws it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `panels`, `players` and `rules`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/panels-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/panels.test.mjs`.

**Uses unchanged:**
- **The kit (0.8.2; built on 0.5.1):** `list` and `row` (the icon tile, the portrait as the lead, the chevron, a non-interactive `div` row), `pill` (the badges, `paper` with the captain and officer icons), `portrait`, `groupNote`, and the control policy.
- **The phone shell (0.2.12; built on 0.2.6):** its sheet, opened by Frontend; the component does not import the shell.

## Mount, update and dispose

```js
import { mountPanels, panelsSheet } from '…/design/phone-ui/components/panels/panels.mjs';
import '…/design/phone-ui/components/panels/panels.css';

shell.update({ sheet: panelsSheet(input) });          // the frame for the view
const panels = mountPanels(shell.sheetBody, input, handlers);
panels.update({ ...changes });                        // each key given replaces that key; the rest stay
shell.update({ sheet: panelsSheet(nextInput) });      // as the view changes
panels.dispose();                                     // safe twice; afterwards nothing fires
```

- **One sheet id (`panels`) for the three views,** so the shell keeps its body (and this content) as the view changes. Back is the shell's (`onSheetBack`): Players and Round order go back to the list, and Frontend sets `view: 'list'`.
- **On update,** each row keeps its element and the focus. A destination or seat that leaves while it has the focus returns the focus once (`onFocusReturn`), as does a view that ends.

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `view` | This phone | `list`, `players` or `round-order`: Frontend's, from the taps and Back |
| `status`, `interactive`, `viewer`, `versions` | This phone | `live`, `stale` or `concealed`, as the shell's; `viewer` is this phone's seat, for "(you)"; `versions` for the portraits |
| `windows` | This phone | `null` (no row), or `{ enabled, reason, rooms }`. `rooms` are the windows of this player's room as pairs of room names (`[['Room A', 'Room B'], ['Room A', 'Hospital']]`), from the projection's windows |
| `navigation`, `hospital` | This phone | `null` (no row), or `{ enabled, reason }`: whether this player can open it now, from the projection |
| `players` | Public | `[{ seat, name, character, location, health, jailed, captain, officer }]`, in seat order, from `board.seats[]`, the identities and the offices. Every field is public: the seat, the name, the character's portrait, the room, the health (`Healthy`, `Injured`, `Eliminated`), whether jailed, and the two offices. Any other key is refused |
| `steps` | Public | `[{ kind, title, timing }]`, in the ruleset's order: each phase's kind (for its icon), its name and its timing, in Frontend's words |

## Callbacks

| Callback | When |
| --- | --- |
| `onOpen(destination)` | A row is tapped: `windows`, `navigation`, `hospital`, `players` or `round-order`. For the first three, Frontend opens that sheet. For the last two, Frontend sets `view` |
| `onFocusReturn({ intent, value })` | As the other components' |

The shell's `onSheetBack` and `onSheetClose` are Frontend's, as for every sheet. Each callback reports a tap, and only that.

## Drawn

| Part | Drawn |
| --- | --- |
| Panels | Two lists, 14 px apart. First list: **Windows** (the window icon on paper, the room pairs), **Navigation** (the course icon on slate, "Captain and Officer only"), **Hospital panel** (the panel icon on teal, "Patients only"). Second list: **Players** (the players icon on steel, "Seats, rooms and public status") and **Round order** (the rules icon on steel, "Phases and timings", or "The phases, in order" while no step has its timing). Each has a chevron. With no destination given, the first list and the gap go |
| A destination this player can't use | Dimmed, its line unchanged; still focusable; a tap reports nothing; Frontend's reason is its accessible description |
| Players | One list, a row per seat, not buttons: the 36 px portrait, "Seat · Name" ("(you)" after this phone's name), the line, and at the end the Captain badge (the captain icon) or the Officer badge (the officer icon), the kit's paper pills. Then the note |
| The Players line | "In Jail" in the room's place when jailed; otherwise the room. Then "Injured" or "Eliminated" when so. With no room, the health word alone |
| Round order | One list, a row per step, not buttons: the step's icon on a steel tile, its name, and its timing as the line. No note |
| Step icons (`ROUND_STEP_ICONS`) | `food-supply` supply, `officer-appointment` officer, `pre-turn` hourglass, `turns` actions, `private-talk` talk, `hack` code, `sync` blackhole, `blackout` dark, `hospital` hospital, `jail-vote` vote, `captain-election` captain, `result` vote, `resolution` rescue, `navigation` course; any other kind, the Round order icon (rules) |
| Larger text | The rows' words wrap; the badges stay whole at the row's end; at the Largest text the sheet scrolls |

**Motion:** none of its own. The sheet's arrival and the view changes are the shell's.

## Frontend's connection

1. On the Panels tab, open the shell's sheet with `panelsSheet({ view: 'list', … })`, and mount `mountPanels` in `shell.sheetBody`; dispose it when the sheet closes.
2. Give `windows`, `navigation` and `hospital` from the projection, as today's Panels decides whether each opens. Give `players` from `board.seats[]`, the identities and the offices. Give `steps` from the ruleset (today's `planetRoundOrderText` order and `PLANET_PHASE_DURATIONS`), each with its `kind`.
3. On `onOpen`, open Windows, Navigation or the Hospital panel as today, or set `view` for Players and Round order; route the shell's Back and ✕.
4. Today's Panels buttons and the Players and Round order text leave the screen.

## Against the pack

The agreement draws the frozen pack's `panels`, `players` and `rules` screens beside the sheet (at both sizes, and Players at the Largest text) and compares, to within half a pixel: the sheet, its title and body; the lists, the rows, their mains, icon tiles and drawings, portraits (by file), titles, lines and chevrons; the badges and their icons; and the note. It compares their boxes, words, looks (including the dimmed rows' opacity), states (`aria-disabled`, names, roles) and drawings. The room behind the sheet, the top bar and the tabs are the room scene's and the shell's own agreements'; what the pack does not draw (the Captain's Navigation, no window, players in Jail, reconnecting) is the probe's and the captures'.

- The preview gives the pack's steps with their timings, so its list says the pack's "Phases and timings"; the probe checks the Lead's line without timings.
- **Recorded, in Round order only (answer 5):** the pack's note under the steps ("Current order. The owner's Blackout-before-voting order is an Integration proposal, pending the rules update.") is the rules' business, so the component draws no note. Those two cases record the note's absence; everything else is compared as usual.

## Check

`node design/tools/panels-check.mjs` bundles the preview with Vite and serves it with the production headers. It captures 8 states at 390 × 844 and 430 × 932: the list as a passenger, the list as the Captain, no window, Players, Fay and Ike in Jail (Dev, the viewer, stays in Room A, the room behind the sheet), Round order, reconnecting, and Players at the Largest text, each with the Panels tab open. Then it runs the probe (as the page comes and with the device's Reduce motion) and the agreement.

**Recorded against `58c38232` (clean, with the shell 0.2.12 and kit 0.8.2, #265 at `5616928e`):** 16 of 16 captures, the probe 19 of 19 checks (18 as the page comes, the motion check with the device's Reduce motion), and the agreement 7 of 7, with Round order's note recorded as absent, no unexpected policy report and no page problem. The headers' SHA-256 is `424e5dec…`. The record is `review/check.json`.
- **Against the record on `b53f66be`** (shell 0.2.6, kit 0.5.1): every recorded field of the 16 captures, the probe's 19 checks and the agreement's 7 is the same, but for the bundle's file name in the known Zod report. 6 captures are byte for byte the same: Players, players in Jail and the Largest text, at both sizes. The other 10 differ only in the room behind the sheet, a crew member's ambient motion, in one area of at most 87 × 78 pixels; the sheet itself is unchanged.

## Not in this version

- The destinations' own sheets (Windows, Navigation, the Hospital panel): other components.
- A highlight of the current phase in Round order: the pack does not draw one.
