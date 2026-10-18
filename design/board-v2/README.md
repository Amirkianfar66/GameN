<!-- mothership:dev-only -->
# Board v2: fixed slots and the Hospital ward (proposal)

**What this is.** The first step of the owner's motion specification of 13 October 2026 for the board:

- Every room's fixed slots with stable ids. Rooms A and B and the Jail have five, the Command Room one, and the Hospital one per seat.
- A Hospital drawn as a ward of seven, eight or nine berths.
- A layout in which every slot is a whole 44 px press area whatever the room's occupancy.
- The compact shell the owner approved on 13 October 2026, so that the board fits at 320 × 568: drawn up to 600 px and wherever the phone kit's shell would not fit; a narrower board or a message where no shell fits.
- The Blackout's lighting window (storyboard S1) on that board: [docs/design/blackout-window.md](../../docs/design/blackout-window.md).
- ATTACK BLOCKED (storyboard S4), the same for every defense and for the target's room's occupants only: [docs/design/attack-blocked.md](../../docs/design/attack-blocked.md).
- The private-talk capsule (storyboard S2): a permanent two-person capsule beside the Command Room, half its width, where the Hack's public pair walk in, sit for the minute and walk back, as an option of the layout: [docs/design/private-capsule.md](../../docs/design/private-capsule.md).
- The real controls' places, by the owner's decision of 14 October 2026: they take turns with the board (the choosing row in the navigation's box during a character choice, the sheet over the Hospital and the Jail otherwise), and a board that does not fit says so: the same page, section 12.

**The handoff:** [docs/design/board-v2-slots.md](../../docs/design/board-v2-slots.md).

**Status.** A proposal. It is not a rule, a server contract or an adopted asset, and the owner has not seen it.

## Files

| Path | What it is |
| --- | --- |
| `scenes/hospital-ward.mjs` | The ward for a roster: the approved sick bay's shell, back wall and window around a new deck and the berths. Editable source |
| `scenes/slots.mjs` | Every room's slots and anchors for a roster, and the Designer's proposal for which slot a seat takes on entry |
| `js/fit.mjs` | How the board lays out from the phone and the roster alone, with every slot's press area |
| `scenes/lighting.mjs` | The Blackout's art: the night rule that draws a room with its lights out, the rooms' lights, sparks, the impact, the position markers. Editable source |
| `films/blackout.mjs` | The Blackout's lighting window as a film: its beats, and what the board shows at any moment from public inputs alone |
| `js/blackout-view.mjs` | The window on the review page (`&film=blackout`) |
| `fx/blocked.mjs` | ATTACK BLOCKED's art: the shield, the ring and the particles, and their colors' distance from the faction accents. Editable source |
| `films/blocked.mjs` | ATTACK BLOCKED as a film: its beats, and what it draws at any moment, the same for every defense |
| `fx/label-box.mjs` | Where ATTACK BLOCKED's label goes in its panel: the placement rule alone, pure geometry |
| `js/blocked-view.mjs` | ATTACK BLOCKED on the review page (`&film=blocked`, and in the Blackout). A controller: not to be ported |
| `scenes/capsule.mjs` | The private-talk capsule's art: the cabin, its door's four positions, its status light, the badge, its seats, doorway and paths, and how it is framed in its panel. Editable source |
| `figures/capsule.mjs` | The capsule's poses: sitting and its quiet variations, the walk, by public status (a patient's bandage and stagger, a prisoner's hands together), and the variations' seeded schedule |
| `films/capsule.mjs` | The capsule as a film: its beats in the result stage, the conversation and the exit, and what every screen draws at any moment from public inputs alone |
| `js/capsule-view.mjs` | The capsule on the review page (`?capsule=1`, `&film=capsule`) and its art sheet (`?sheet=capsule`). A controller: not to be ported |
| `js/turns.mjs` | The real controls' places: the choosing row, the sheet and its pinned actions, the bars at the match's text size, the sheet's plan. Pure functions |
| `js/turns-view.mjs` | The controls on the review page (`&ui=`, `&text=2`): stand-ins sized from Frontend's measurements. A controller: not to be ported |
| `js/fixtures.mjs` | Synthetic boards for review (test-only) |
| `js/page.js`, `index.html`, `css/page.css` | The review page: a phone-sized board, or one room's whole scene |
| `contact.html` | The contact sheet of the captures |
| `assets/` | Generated: the ward's back layer for each roster, each berth's front layer, the lighting art (`assets/lighting/`), the effects art (`assets/fx/`), the capsule's art (`assets/capsule/`), the manifest |
| `contract/slots.json` | Generated: the slot table for each roster, as data |
| `contract/films.json` | Generated: the Blackout's film, ATTACK BLOCKED and the capsule, as data |
| `review/` | Generated: the captures, `index.json` and `report.json` |

## Run

```sh
node design/tools/board-v2-assets.mjs     # rebuild assets/, contract/slots.json and contract/films.json
node design/tools/board-v2-capture.mjs    # captures and measurements (needs Chromium; CHROME_PATH)
node design/tools/board-v2-check.mjs      # the static checks
node design/tools/serve.mjs               # then open /board-v2/index.html
```

**Page options:**

| Option | What it shows |
| --- | --- |
| `?roster=7` (or 8, 9) | The roster |
| `&fixture=ward` (or mixed, stress, empty) | Who is where |
| `&markers=1` | Position numbers |
| `&press=1` | Press areas |
| `&ids=1` | Slot ids and badge anchors |
| `&hit=1` | Every slot's press area as a button, for pointer tests |
| `&safe=47,0,34,0` | Safe-area insets (top, right, bottom, left) |
| `?scene=hospital` | The whole ward scene at 1024 × 768 |
| `&film=blackout` | The Blackout's lighting window, with `&t=`, `&play=1`, `&outcome=`, `&viewer=`, `&in=`, `&motion=reduced` and the rest listed in `js/blackout-view.mjs` |
| `&film=blocked` | ATTACK BLOCKED, with `&t=`, `&play=1`, `&targets=`, `&viewer=`, `&cause=`, `&injured=1` (the fixture's Injured patient in the Hospital) and `&motion=reduced`, listed in `js/blocked-view.mjs` |
| `&capsule=1` | The private-talk capsule beside the Command Room, empty |
| `&film=capsule` | The Hack's public pair in the capsule, with `&stage=`, `&t=`, `&play=1`, `&pair=`, `&known=`, `&late=1`, `&settled=1`, `&moved=`, `&viewer=`, `&exchange=` and `&motion=reduced`, listed in `js/capsule-view.mjs` |
| `&ui=choosing\|sheet` | The real controls' places beside the board with the capsule: a character choice open, or the sheet, with the options listed in `js/turns-view.mjs` |
| `&text=2` | 200% text: the bars measured at that size, the board laid out below them |
| `?sheet=capsule` | The capsule's art on one sheet: its layers, seats and paths, and every pose by status |
