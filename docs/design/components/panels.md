# Panels: Designer's runtime component

**Version:** `panels-0.1.0`. **Status (16 November 2026):** the interface, proposed for the Lead Designer's review. Nothing is built. The build starts when the Lead approves it, without waiting for Frontend (the owner's 16 November decision, `docs/design/owner-decisions.md`, #280).

**What it is:** the Panels tab's sheets, as sheet 32 draws them: the Panels list, Players and Round order. It covers #222 items 29, 30 and 31 (P3):
- **Panels:** "each row says what it shows and who can use it".
- **Players:** "portraits, names, Captain and Officer badges, and injuries".
- **Round order:** "each phase on its own row with its timing".

The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Audience:** this phone only. Every fact on it is public (seats, rooms, health and offices), but the sheet is opened on one phone.

**Covers:**

| View | Sheet (the shell's frame) | Body (this component) |
| --- | --- | --- |
| **Panels** (`list`) | "Panels", ✕ | The destinations, each with what it shows or who can use it: "Windows" ("Room A ↔ Room B · Room A ↔ Hospital"), "Navigation" ("Captain and Officer only"), "Hospital panel" ("Patients only"). Then "Players" ("Seats, rooms and public status") and "Round order" ("Phases and timings"). A destination this player can't use is dimmed. |
| **Players** (`players`) | "Players", Back, ✕, large | A row per seat: the portrait, "1 · Ava" ("4 · Dev (you)" for this phone), the room and any injury ("Hospital · Injured"), and the Captain or Officer badge. Then "Public facts only: seats, rooms, health and offices." |
| **Round order** (`round-order`) | "Round order", Back, ✕, large | A row per phase, in the ruleset's order: its icon on steel, its name ("Jail vote") and its timing ("60 s, then 5 s result") |

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
- **The destinations themselves:** Windows (sheet 34), Navigation (sheet 41) and the Hospital panel (sheet 43). Here only the rows that open them; Frontend opens each.
- **Promises and Settings:** they open from the top bar now (Promises is the next part; Settings is #294).
- **The sheet's frame:** its title, Back, ✕ and glass are the phone shell's (#265). As with Host controls (#295), the module gives Frontend each view's frame (`panelsSheet`), so the words stay in Designer's source.
- **The facts:** who can use a destination, where each player is, and the phases and their timings are Frontend's, from the projection and the ruleset. The component never works one out, and never hardcodes the round's order.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/panels/`:

| Path | What |
| --- | --- |
| `panels.mjs` | `mountPanels()`, `panelsSheet()`, `nextPanelsInput()`, `PANELS_DEFAULTS`, `PANELS_VERSION`, `PANELS_SHEET_ID`, `PANELS_WORDS`, `ROUND_STEP_ICONS` |
| `panels.css` | Every style, under `.ms-panels`; starts with the kit's stylesheet. Little of its own: the badges' row and the gap between the two lists |
| `preview/` | Development only: the preview (the body in the phone shell's sheet over Room A, as sheet 32 draws it), `probe.mjs`, and `agree.mjs` (beside the frozen pack's `panels`, `players` and `rules`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/panels-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/panels.test.mjs`.

**Uses unchanged:**
- **The kit (0.5.1):** `list` and `row` (the icon tile, the portrait as the lead, the chevron, a non-interactive `div` row), `pill` (the badges, `paper` with the captain and officer icons), `groupNote`, and the control policy.
- **The phone shell (0.2.6):** its sheet, opened by Frontend; the component does not import the shell.

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
- **On update,** each row keeps its element and the focus. A seat that leaves the list while it has the focus returns the focus once (`onFocusReturn`).

## Inputs

| Input | Audience | What |
| --- | --- | --- |
| `view` | This phone | `list`, `players` or `round-order`: Frontend's, from the taps and Back |
| `status`, `interactive`, `viewer`, `versions` | This phone | `live`, `stale` or `concealed`, as the shell's; `versions` for the portraits |
| `windows` | This phone | `null` (no row), or `{ enabled, reason, rooms }`. `rooms` are the windows of this player's room as pairs of room names (`[['Room A', 'Room B'], ['Room A', 'Hospital']]`), from the projection's windows (question 3) |
| `navigation`, `hospital` | This phone | `null` (no row), or `{ enabled, reason }`: whether this player can open it now, from the projection |
| `players` | Public | `[{ seat, name, character, location, health, jailed, captain, officer }]`, in seat order. Any other key is refused, so a private fact can't reach this sheet (question 4) |
| `steps` | Public | `[{ kind, title, timing }]`, in the ruleset's order: each phase's name and timing in Frontend's words (question 5) |

## Callbacks

| Callback | When |
| --- | --- |
| `onOpen(destination)` | A row is tapped: `windows`, `navigation`, `hospital`, `players` or `round-order`. For the first three, Frontend opens that sheet. For the last two, Frontend sets `view` |
| `onFocusReturn({ intent, value })` | As the other components' |

The shell's `onSheetBack` and `onSheetClose` are Frontend's, as for every sheet. Each callback reports a tap, and only that.

## Drawn

| Part | Drawn |
| --- | --- |
| Panels | Two lists, 14 px apart. First list: **Windows** (the window icon on paper, the room pairs), **Navigation** (the course icon on slate, "Captain and Officer only"), **Hospital panel** (the panel icon on teal, "Patients only"). Second list: **Players** (the players icon on steel, "Seats, rooms and public status") and **Round order** (the rules icon on steel, "Phases and timings"). Each has a chevron |
| A destination this player can't use | Dimmed, its line unchanged; still focusable; a tap reports nothing, and Frontend's reason is its accessible description (question 2) |
| Players | One list, a row per seat, not buttons: the 36 px portrait, "Seat · Name" ("(you)" after this phone's name), the line, and at the end the Captain badge (the captain icon) or the Officer badge (the officer icon). Then the note |
| The Players line | The room, then "Injured" or "Eliminated" when so ("Hospital · Injured") (question 4) |
| Round order | One list, a row per step, not buttons: the step's icon on a steel tile, its name, and its timing as the line |
| Larger text | The rows' words wrap; the badges stay whole at the row's end; at the Largest text the sheet scrolls |

**Motion:** none of its own. The sheet's arrival and the view changes are the shell's.

## Frontend's connection

1. On the Panels tab, open the shell's sheet with `panelsSheet({ view: 'list', … })`, and mount `mountPanels` in `shell.sheetBody`; dispose it when the sheet closes.
2. Give `windows`, `navigation` and `hospital` from the projection, as today's Panels decides whether each opens; give `players` from `board.seats[]`, the identities and the offices; give `steps` from the ruleset (today's `planetRoundOrderText` and `PLANET_PHASE_DURATIONS`).
3. On `onOpen`, open Windows, Navigation or the Hospital panel as today, or set `view` for Players and Round order; route the shell's Back and ✕.
4. Today's Panels buttons and the Players and Round order text leave the screen.

## Questions for the Lead

1. **One module, three views, one sheet:** as Host controls (#295), the body is the component's, the frame is the shell's through `panelsSheet(input)`, and the view is Frontend's. Panels has ✕ only, at the shell's default height. Players and Round order have Back and ✕, and are large, as drawn. Is that the split you want?
2. **A destination that can't be used:**
   - Who can use each destination is in its line, in Designer's words: "Captain and Officer only", "Patients only".
   - Whether this player can use it now is Frontend's `enabled`.
   - A row this player can't use is dimmed, with its line unchanged and Frontend's reason as its accessible description. The words on screen don't change.

   This differs from Host controls, where the reason replaced the line. It does so because the line here already says who can use it. Agreed?
3. **The Windows line:**
   - It lists the windows of this player's room, as Frontend gives them: "Room A ↔ Room B · Room A ↔ Hospital".
   - With none (the Command Room), I propose sheet 34's "No window here" as the line. The row still opens Windows, which draws its own "No window here".
   - Or should the row be dimmed there?
4. **Players' line and privacy:**
   - The line is the room, then "Injured" or "Eliminated" when so.
   - A jailed player's room is "Jail", so I propose no second word. The pack's "In Jail" would read "Jail · In Jail".
   - With no room (`location: null`), the line is the health word alone, or nothing.
   - `players` takes only the eight keys above and refuses any other, such as a role or a revealed faction, so nothing private can reach this sheet.
   - The Food release's "Away on the Food Supply Task" stays in the frozen Food release.
5. **Round order's words:**
   - Each step's name and timing are Frontend's, from the ruleset: for example "Jail vote" and "60 s, then 5 s result". A Food match adds Food Supply, and older rulesets have another order.
   - The component draws them in the order given, with the icon from its own map by `kind`: `pre-turn` hourglass, `turns` actions, `sync` blackhole, `jail-vote` vote, `blackout` dark, `navigation` course, and so on. An unknown kind gets the Round order icon, so a new phase still draws.
   - The preview uses the pack's six steps.
   - **The note:** as you said, the pack's note on the pending Blackout order is the rules' business, so the component draws no note. The agreement records that one difference against the pack.
   - Or should the step words be the component's, keyed by `kind`?
6. **Reconnecting:** the rows only open a sheet on this phone, so they keep taking taps while the match is reconnecting, as Settings does (#294). The commands inside Windows, Navigation and the Hospital panel are those sheets'. A destination that isn't enabled stays refused. Only `interactive: false` refuses everything, and concealed draws no sheet.
7. **The Food release's Tasks row:** today's Panels shows "Tasks" in a Food match. Food is the frozen release, and the pack doesn't draw that row, so this component doesn't either. The frozen release keeps its own Panels. Agreed?

## Not in this version

Everything: this is the interface. Next, once the Lead approves it:
- the module and its styles;
- the preview's states:
  - the list as a passenger, and as the Captain;
  - Players with the badges, an injury and a jailed player;
  - Round order;
  - the Largest text;
  - reconnecting;
- the probe;
- the check at 390 × 844 and 430 × 932 under the production headers;
- the agreement with the pack;
- the test;
- the owner's test page.
