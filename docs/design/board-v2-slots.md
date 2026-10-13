# Board v2: fixed slots and the Hospital ward

**A proposal from the Visual and Motion Designer, 13 October 2026.** It is the first production step of the owner's motion specification of 13 October 2026, as the creative brief relays it. The step covers the board's fixed positions and a Hospital with a berth for every seat: brief sections 1, 9 and 16, and work package A1 of the Designer's review.

Nothing here is a rule, a server contract or an adopted asset:

- **Slots:** which slot a seat takes is the server's to decide.
- **Adoption:** each new file needs Integration's approval by name and hash.
- **Not readable here:** the specification packet itself (README, game-design, rules-contracts, motion-requirements, decision-register, motion-storyboards), so this follows the brief. Re-check it against the packet.

| | |
| --- | --- |
| Branch | `claude/designer-board-slots-ward`, stacked on PR #127 (`claude/designer-phone-polish` at `5c9a151`), on the integration baseline `abb6839` |
| Why stacked | The ward's patients wear the gown of `design/board-motion/figures/wardrobe.mjs`, which PR #127 adds |
| Toolchain | Node 22.21.1, npm 10.9.4, headless Chromium 141 |
| New files | `design/board-v2/`, four tools under `design/tools/`, one test file, this page. Three scripts are added to `packages/design-tokens/package.json` |
| Changed elsewhere | Nothing. The pinned drawing sources, the proposed wardrobe and art pins, the pinned ability stylesheet, the board-motion scenes, their exports and every capture are byte for byte as before, checked by `design/tools/board-v2-check.mjs` |

## 1. What it changes for a player

**Fixed positions.** Every room has fixed positions:

| Room | Positions |
| --- | --- |
| Room A, Room B, the Jail | Five each |
| Command Room | One |
| Hospital | One per seat of the match: seven, eight or nine |

A character keeps their position while they stay in a room, and nobody steps aside when someone arrives or leaves. That is what the Blackout's memory targeting needs: the person remembered at position 4 is still there in the dark, on every phone, on the display, and after a reconnect.

**The Hospital becomes a ward.** Its berths are in three rows:

| Berths | Row |
| --- | --- |
| H7 H8 H9 | Upper berths, recessed in the back wall |
| H4 H5 H6 | The middle row, at the foot of the wall |
| H1 H2 H3 | The front row |

**How a patient is drawn.** Every patient lies or sits up in a berth in the approved Hospital gown. They wear their bandage while Injured, and lie still when Eliminated.

**Smaller matches.** A seven-player ward has no H8 or H9; their places show the approved medicine cabinet of the back wall and a vitals board. An eight-player ward has no H9.

**What a berth is.** Public furniture only: headboard, pillow, blanket, a dark monitor, a status lamp, a bed light and a blank plate for a status tag. Nothing on a berth belongs to a role or a side.

## 2. The slots

`design/board-v2/scenes/slots.mjs` gives every slot, and `design/board-v2/contract/slots.json` holds the same table as data for each roster.

- **Rooms A, B, the Jail and the Command Room:** their slots are the reviewed scenes' places, unmoved (A1–A5, B1–B5, J1–J5, C1).
- **The Hospital:** its slots are the ward's berths (H1 to H7, H8 or H9).
- **Anchors:** each slot's anchors are normalized to its room's 1024 × 768 scene, `[x / 1024, y / 768]`:

| Anchor | What it is |
| --- | --- |
| `feet` | Where the figure stands: its anchor in the figure rig |
| `press` | The centre of the slot's press area: its place's gesture's press point. It **never moves**, whatever the character there is drawn doing |
| `badge` | Where a status tag hangs: a berth's plate on its headboard; elsewhere above the head |
| `fx` | Where an impact or a shield is centred (the press point) |

**Position numbers.** A slot's Blackout position number is its index in its room, 1 to n in id order. It is drawn inside the upper right corner of the slot's press area, so it is always on the target and never over the face it numbers.

### Who takes which slot: a proposal for Backend

The slot must be **authoritative**:

- Assigned by the server when a seat enters a room.
- Kept unchanged while the seat stays.
- Frozen through the lighting window.
- Said in the public view.

Today both the board-motion prototype (`layout.js` `assign()`) and Frontend (`stations.ts`) work places out from who is in the room now. That is reconnect-safe, but people step aside when someone arrives or leaves. Backend recorded on #96 that stable places with fresh-client agreement "would need separately reviewed authoritative state" (`docs/backend/room-capacity.md` lines 45–47).

`entrySlot()` writes down the Designer's proposal for the rule, applied once at entry:

| Room | Proposed rule |
| --- | --- |
| Command Room | C1, the Captain's |
| Hospital | The first free berth in order: H1, H2, H3, then H4–H6, then H7–H9 |
| A, B, Jail | The seat's own preference, as the prototype draws it today: seat n tries slot (n − 1) mod 5, then the next ones round the room. The Eliminated keep their slots |

No role, side, character or cause is an input.

## 3. The ward

**Source:** `design/board-v2/scenes/hospital-ward.mjs`.

**What is lifted from the approved sick bay** (`design/source/board/board-hospital.svg`), unchanged and recolored by the reviewed export recipe:

- The shell: ceiling, ceiling lights and side walls.
- The back wall, with its monitor, medicine cabinet and window.
- The edges.

Around them are a new deck and the berths. The sick bay's two beds and IV pole (`hospital-props-back`) are not lifted.

**The berths:**

- Each berth is seen end on, as the approved beds are.
- The patient uses the approved Hospital gestures: `bedLying` (H1's "lying, an arm across the forehead") and `bedSitting` (sitting up against the pillow).
- Patients are smaller further back: front 1.1, middle 1.0, upper 0.9.

**Layering.** Each berth's blanket, rail and sill is its own front layer, at a depth just over its patient and under the next row's. The patient lies under their blanket and the row in front hides the row behind. The back layer holds every berth's headboard, so no back part of a row overlaps a front part of the row behind (checked).

**Exported art** (`design/tools/board-v2-assets.mjs` writes it under `design/board-v2/assets/`):

- One back layer per roster: `hospital-ward-{7,8,9}.back.svg`.
- One front layer per berth: `hospital-ward.berth-h1…h9.svg`. These are the same in every roster that has the berth.

**What the monitors show.** They are dark: a patient's state (unstable, critical, flat) is the board's to draw from public facts. The monitor states, the deadline badge, the detention tag and the drone come with the Hospital scenes.

**Why three rows of three.** On the smallest phone the Hospital panel is 141 px wide. Nine whole 44 px press areas fit there only as three rows of three, so the press points sit on a 190 × 185 scene-unit grid:

- Columns at x = 290, 480, 670.
- Rows at y = 245, 430, 615.

## 4. The layout: from the phone and the roster, never from who is where

**The rule.** `design/board-v2/js/fit.mjs` lays the board out as the prototype's `fitBoard()` does, with one difference: **every fixed slot counts as a press area, occupied or not**. The Blackout needs every position pressable, empty ones included. So the band heights depend on the viewport, the roster and the captions only, and no press area moves when someone moves.

**Shell measurements used.** Those of the phone kit at `5c9a151`:

| Element | Size |
| --- | --- |
| Board padding and gaps | 5 px |
| Spine | 10 px |
| Panel borders | 2 px |
| Captions | 44 px on a room a player moves to; 32 px on the Hospital and the Jail |
| Panel foot | 8 px |
| Top bar and navigation | 44 and 56 px up to 640 px tall; 52 and 64 px above |

**Each band's smallest height**, with every slot pressable (from `fitBoardV2`, the same for 7, 8 and 9 players):

| Phone | Command / A and B / Hospital and Jail | Board height left | Fits |
| --- | --- | --- | --- |
| 320 × 568 | 100 / 192 / 178 | 448 | **No: 22 px short** |
| 360 × 640 | 100 / 200 / 182 | 520 | Yes |
| 360 × 740 | 100 / 200 / 182 | 604 | Yes |
| 375 × 667 | 100 / 202 / 186 | 531 | Yes |
| 390 × 844 | 100 / 204 / 190 | 708 | Yes |
| 393 × 852 | 100 / 204 / 192 | 716 | Yes |
| 414 × 896 | 100 / 208 / 194 | 760 | Yes |
| 430 × 932 | 100 / 210 / 194 | 796 | Yes |

**The 320 × 568 shortfall is not the ward's.** Rooms A and B already need 192 px each once all five of their reviewed places are pressable at once. Today's board only reserves room for the characters actually offered as targets. The three bands then need 22 px more than the shell leaves the board.

**The options, for Frontend and the owner's approved layout:**

1. A 22 px more compact shell on phones up to 600 px tall. For example, the navigation from 56 to 48 px, the top bar from 44 to 36 px and the board padding from 5 to 2 px. **Recommended**: it keeps every target at 44 px and changes no game art.
2. Press areas of 40 px on that size only: below the project's 44 px rule. Not recommended.
3. The board scrolling by 22 px: against the brief's "fits normal phone viewports without page scrolling". Not recommended.

The check records the 22 px exactly. Any change to it fails until it is recorded again here.

## 5. For Frontend

Frontend has reviewed none of this, and nothing has been adopted.

**Proposed pure drawing modules.** These are new files. Each needs Integration's approval by name and hash; there is no directory exemption (issue #115).

| Module | Exports |
| --- | --- |
| `design/board-v2/scenes/hospital-ward.mjs` | `wardScene(roster)` in the shape of the existing scenes (`room`, `source`, `under`, `floor`, `over`, `props`, `inner`, `focus`, `layers`, `slots`); `WARD_BERTHS`, `wardBerths(roster)`, `WARD_ROSTERS` |
| `design/board-v2/scenes/slots.mjs` | `slotsOf(room, roster)`, `boardSlots(roster)`, `slotCount`, `sceneOf`, `entrySlot` (proposal), `slotProblems` |
| `design/board-v2/js/fit.mjs` | `fitBoardV2(viewport, roster)`, `slotRects(room, roster, panel)`, `slotsFit`, `needHeight`, `pressSide`, `MARKER_RADIUS`, `SHELL`, `BANDS` |

All three read only the reviewed board-motion modules: `frame.mjs`, `kit.mjs`, `gestures.mjs`, `body.mjs` and the scene index. None reads a role, a phase, a deadline, an audience or a command.

**Data and art:**

- The slot table: `design/board-v2/contract/slots.json`.
- The ward's art and manifest: `design/board-v2/assets/`.

**Unchanged** (exact pins):

- `dressedFigureSvg(character, skeleton, { outfit, prefix, layer })` and `outfitFor(publicLocation)`. A patient's gown comes from location alone.
- `RESULT_ART` and `HACK_ART`.

**Drawing a slot** (as the review page does):

1. Frame the room with `frameScene()`.
2. Draw the figure's box at `feet` with the slot's `scale` and `mirror`.
3. Give the body z = depth × 2, and the figure's front parts 1500 + depth.
4. Draw each scene layer at its depth × 2 + 1.
5. Put the press area at `press` (`slotRects()`), clamped whole inside the panel and below the caption. It is never transformed by any animation.

**Not to port:** `design/board-v2/js/page.js` and `js/fixtures.mjs`. They are a review page and synthetic fixtures, not a client.

**What Frontend keeps owning:** phase and exchange identity, audience, fresh view, trusted deadlines, foreground checks, private-content concealment and receipt recovery. Nothing here touches them.

## 6. For Backend and Integration (proposals; nothing accepted)

1. **A stored, public `slotId` per on-board seat**, assigned on entry and never reflowed. This is the dependency that blocks Blackout; the Designer's rule proposal is in section 2. A historical tuple keeps today's stateless placement.
2. **A new ruleset tuple in which the Hospital holds the whole roster** and every Injured character is in it. It supersedes CAPACITY-01's five for the Hospital and CAPACITY-04's waiting outside it.
3. **Medical detention from existing facts.** An Injured prisoner is in the Hospital with `jailed` still true; the detention tag reads `location === 'Hospital' && jailed`. No new field is needed.
4. **The roster for the ward** is `seats.length` (7–9) at match creation, fixed for the match.

## 7. Verification

These were run on this branch in this container. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **6 / 6**: fence and development marks; every pinned drawing source and proposed pin byte for byte; the ward built from the approved source, current, in the drawing vocabulary; the slot rules for 7, 8 and 9 players, the reviewed places unmoved, the berths' layering; every slot a whole 44 px press area apart from every other at eight phone sizes, with the 320 × 568 shortfall exactly as recorded; the captures current and passing |
| `node design/tools/board-v2-capture.mjs` | **28 pictures + a contact sheet, 0 with problems.** On each board it measures, from the DOM: press areas of 44 px at least, inside their rooms, apart, and where `fit.mjs` puts them; every position number on its own press area; the page not scrolling; the board running under the navigation by exactly what `fit.mjs` reports (22 px at 320 × 568, 0 elsewhere). Pictures are in `design/board-v2/review/` |
| `node design/tools/board-v2-assets.mjs --check` | 14 files current |
| `npm test --workspace @mothership/design-tokens` | **226 / 226**, 7 of them new (`board-v2.test.mjs`); after `npm run build` |
| Existing design checks, re-run unchanged | board-motion 13 / 13; phone kit 7 / 7; ability art 12 / 12; design assets 15 / 15; shell 0 failures; board-motion and phone-kit assets current |

**Not run:**

- Real phones, a screen reader, enlarged text on this page.
- A match.
- Reading the specification packet.
- `npm run verify` as a whole: see the PR.

The memory game itself (whether people can remember positions in five seconds) is not something a capture can show.

## 8. Unresolved

- **Backend's slot field and the new tuple** (section 6). Until they exist, nothing here ships to players.
- **The 320 × 568 shortfall** (section 4), for Frontend and the owner's approved shell.
- **The ward's states**, which come with the Hospital scenes: monitor states, deadline badge, detention tag, drone, flatline.
- **The owner has not seen the ward.**
