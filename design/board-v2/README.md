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
- The Hospital's medical films (storyboards S9, S5 and S10): a patient's critical state on the berth (monitor, lamp, the rescue round and the detention tag), the medical drone's rescue, and the flatline and life-support shutdown, from the server's public facts and outcomes alone: [docs/design/hospital-films.md](../../docs/design/hospital-films.md). On 18 October 2026 the owner approved four beds for the successor ([#155](https://github.com/Amirkianfar66/GameN/issues/155)); the four-berth ward is drawn beside this one, which stays as it is.
- The Captain's films (storyboards S6, S7 and S8): RELEASE (the console, the green pulse down the board's gutters, the Jail's door opening, the prisoners walking out to their new places) and EJECT (the protected red button, the emergency light, the airlock, the prisoners taken out as silhouettes and the bodies as grey cut-outs, the exterior, the memorial plaque), and the Captain's command plates in every state, from the public outcome and snapshots alone: [docs/design/captain-films.md](../../docs/design/captain-films.md).
- The successor's four-berth Hospital, by the owner's decision of 18 October 2026 (four beds whatever the roster; an incoming player who finds them full is off the board): the four-berth ward beside the current one, the current board panel for panel, #158's films on its berths, and the overflow victim's beat (`&beds=4`): [docs/design/hospital-four.md](../../docs/design/hospital-four.md).

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
| `fx/medical.mjs` | The Hospital's medical art: the drone, the vitals inset and a berth's screen for each trace, the lamp's states, the rescue and detention tags, the scan line, the hologram and the revival pulse; where a berth's furniture is (`berthKit()`); and where the tags, the inset and the drone go in the panel (`tagBox()`, `insetBox()`, `droneFit()`). Editable source and pure geometry |
| `films/medical.mjs` | The medical films: the critical state, the rescue and the flatline, their beats and what each draws at any moment from public inputs alone; the rescue tag from the server's values; where a film may play (`filmBerth()`) |
| `js/medical-fixtures.mjs` | Synthetic medical facts and outcomes for review (test-only), with Backend's two rules copied for the review page alone |
| `js/medical-view.mjs` | The medical films on the review page (`&film=critical\|rescue\|flatline`). A controller: not to be ported |
| `fx/captain.mjs` | The Captain's art: the command plates in every state (S8), the safety cover, the glove and the press accents, the console inset; the Jail's door, lamp and keypad drawn again from the room's own elements; the airlock, the suction, the debris, the emergency light, the exterior; the memorial plaque and the grey cut-outs; and where the inset and the pulse go (`consoleBox()`, `conduitPoints()`). Editable source and pure geometry |
| `films/captain.mjs` | The Captain's films: RELEASE and EJECT, their beats and what each draws at any moment from public inputs alone; S8's states from the Captain's own view (`captainButtonStates()`) |
| `figures/captain.mjs` | The Captain at the console, and a prisoner's start, brace and tumble, as skeletons in the shared figure frame |
| `js/captain-fixtures.mjs` | Synthetic Captain outcomes for review (test-only); the released prisoners' places written by hand |
| `js/captain-view.mjs` | The Captain's films on the review page (`&film=release\|eject`) and the art sheet (`?sheet=captain`). A controller: not to be ported |
| `scenes/hospital-ward-four.mjs` | The successor's four-berth ward: the approved sick bay's shell, back wall and window around the deck and four larger berths, the same for every roster. Editable source |
| `scenes/slots-four.mjs` | The successor's slot table: `slots.mjs` with the Hospital's four berths, H1 to H4 |
| `js/fit-four.mjs` | The successor's layout: `fit.mjs`'s `fitBoardV2()` itself (the current board panel for panel) and its four slot functions over the successor's table |
| `js/turns-four.mjs` | `turns.mjs` with its two imports changed, for the successor's board |
| `fx/medical-four.mjs` | #158's films on the four berths: each berth's furniture, the drone's hover, the anchor read as a bed |
| `fx/overflow.mjs` | Where the successor draws its off-board plaque (the spine between the Hospital and the Jail), the FULL stamp and the overflow victim's way |
| `films/overflow.mjs` | The overflow victim's beat: its beats and what it draws at any moment, from public inputs alone (a proposal on an unallocated occurrence) |
| `js/layout.mjs` | The review page's layout, the current one or with `&beds=4` the successor's. Review controller, not to port |
| `js/overflow-fixtures.mjs`, `js/overflow-view.mjs` | The overflow beat's synthetic example and its review controller (`&film=overflow&beds=4`). Not to port |
| `js/fixtures.mjs` | Synthetic boards for review (test-only) |
| `js/page.js`, `index.html`, `css/page.css` | The review page: a phone-sized board, or one room's whole scene |
| `contact.html` | The contact sheet of the captures |
| `assets/` | Generated: the ward's back layer for each roster, each berth's front layer, the lighting art (`assets/lighting/`), the effects art (`assets/fx/`), the capsule's art (`assets/capsule/`), the medical art (`assets/medical/`), the Captain's art (`assets/captain/`), the manifest |
| `contract/slots.json` | Generated: the slot table for each roster, as data |
| `contract/films.json` | Generated: the Blackout's film, ATTACK BLOCKED, the capsule, the three medical films and the Captain's two films and plates, as data |
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
| `&film=critical` | The critical state on the mixed board's patients, with `&fixture=ward` (every seat Injured), `&round=3\|5`, `&entry=<seat>`, `&t=` and `&motion=reduced`, listed in `js/medical-view.mjs` |
| `&film=rescue\|flatline` | One synthetic outcome's film over the snapshot published with it, with `&outcome=` (`js/medical-fixtures.mjs`), `&t=`, `&play=1` and `&motion=reduced` |
| `&film=release\|eject` | One synthetic Captain outcome's film over the snapshot published with it, with `&outcome=` (`js/captain-fixtures.mjs`), `&t=`, `&play=1`, `&motion=reduced` and `&capsule=1` |
| `?sheet=captain` | The Captain's art and S8's plates on one sheet, for the art review (no board) |
