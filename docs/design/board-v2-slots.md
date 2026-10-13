# Board v2: fixed slots and the Hospital ward

**A proposal from the Visual and Motion Designer, 13 October 2026.** It is the first production step of the owner's motion specification of 13 October 2026, as the creative brief relays it. The step covers the board's fixed positions and a Hospital with a berth for every seat: brief sections 1, 9 and 16, and work package A1 of the Designer's review.

Nothing here is a rule, a server contract or an adopted asset:

- **Slots:** which slot a seat holds is Backend's stored `slotId`, by the specification's lowest-free rule. This table allocates nothing.
- **Adoption:** each new file needs Integration's approval by name and hash.
- **The specification packet** (`GameN-owner-specification-agent-handoff-2026-10-13-v2.txt`, SHA-256 `b5b4ba2d…1590b743`: README, game-design, rules-contracts, motion-requirements, decision-register, motion-storyboards) has been read in full since the first version. Its G and Q identifiers are cited below; the Designer's earlier C-notes are reconciled with them in [motion-spec-crosswalk.md](motion-spec-crosswalk.md).

**Corrected after the Integration review of 13 October 2026** (the reviewed head was `e970eaa`; the correction is the next commit on this branch):

| Finding | What was wrong | What changed |
| --- | --- | --- |
| 3. Slot entry policy | `entrySlot()` proposed a seat-preference rule (seat 5 entering an empty Room A took A5). The specification's rule is the lowest free slot (rules-contracts, Blackout validation and resolution) | `entrySlot()` is removed: the drawing module allocates nothing. Backend's lowest-free rule fills a room in the table's numbering; existing occupants keep their slots; departures leave holes; clients read the stored `slotId` (section 2). The slot geometry is unchanged |
| 4. The 601 px shell | The shell was chosen by height alone. From 601 px up to the short shell's real need (602 to 622 px at 360 to 430 px wide) the short shell left the rooms short and the lowest targets ran under the navigation: 21 px at 430 × 601, 13 px at 390 × 601 | The shell is now chosen by what fits the usable height (the viewport less its safe-area insets): the phone kit's shell for that height at most, the next smaller one where it would not fit. Where even the compact shell does not fit the width, the board narrows to a centred column; where no width fits, the page says so instead of drawing a board. The approved compact dimensions are unchanged, no target shrinks and the board never scrolls (section 4) |

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

### Who takes which slot: Backend's lowest-free rule

The slot is **authoritative** and Backend's (G-01, G-09, Q-B03f; rules-contracts, Blackout validation and resolution):

- Existing occupants keep their slots. An entrant takes **the lowest free slot of the room**, in this table's numbering (A1 before A2, H1 before H2). A departure leaves a hole until a later entrant fills it.
- At most one occupant per slot and one slot per seat. The Eliminated keep their slot, except for EJECT's explicit off-board cleanup.
- The slot is frozen through the Blackout window, from its snapshot at the window's opening.
- It is said in the public view: a screen draws every seat at its stored `slotId` and never works a place out.

**This table allocates nothing.** It gives each room's slot ids in their numbering and their anchors; the numbering is both the order the rule fills a room in and the Blackout position number. The first version's `entrySlot()` wrote down a seat-preference rule (seat n first tried slot n); it conflicted with the specification and is removed. The check fails if the drawing module exports an allocating function again.

**The historical tuple keeps its own placement.** The current ruleset's stateless placement (the board-motion prototype's `layout.js` `assign()`, Frontend's `stations.ts`) is unchanged and pinned to its version. Fixed slots apply only to the new tuple.

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

**Shell measurements used.** Those of the phone kit at `5c9a151`, with the compact shell the owner approved for the smallest phones:

| Element | Size |
| --- | --- |
| Board padding | 5 px at the sides; above and below, 5 px, or 2 px in the compact shell |
| Gaps | 5 px |
| Spine | 10 px |
| Panel borders | 2 px |
| Captions | 44 px on a room a player moves to; 32 px on the Hospital and the Jail |
| Panel foot | 8 px |

**The shells** (`SHELL.tiers` in `fit.mjs`):

| Shell | The phone kit's choice for usable heights | Top bar | Navigation | Board padding above and below | Raised Pass |
| --- | --- | --- | --- | --- | --- |
| **Compact**: the owner's decision of 13 October 2026 | Up to 600 px | 36 px | 48 px | 2 px | 52 px, rising 8 px over the board |
| Short: the phone kit's | 601 to 640 px | 44 px | 56 px | 5 px | 58 px, rising 13 px (measured in the kit) |
| Tall: the phone kit's | Above 640 px | 52 px | 64 px | 5 px | 64 px, rising 17 px (measured in the kit) |

**Choosing the shell** (`fitBoardV2(viewport, roster, { insets })`). From the space the phone leaves the page, never from who is where:

1. **The usable box** is the viewport less its safe-area insets. The bars are drawn inside it; their backgrounds fill the insets.
2. **The phone kit's shell for the usable height** (`shellFor()`) is the largest drawn. Where the rooms would not fit in it at the usable width, the next smaller one, down to the compact one.
3. **Fallback `narrow`:** where not even the compact shell fits the width (a wide, short window: a tablet or a desktop browser), the compact shell and the board as a centred column, the widest down to 320 px at which the rooms fit.
4. **Fallback `too-short`:** where no width fits the usable height (under 568 px: a phone on its side, or browser bars on the smallest phone), no board is drawn. The board's place says "This board needs a taller screen. Turn the phone upright, or make the window taller." Nothing is pressable under it.
5. **Fallback `too-narrow`:** where the usable width is under 320 px and the board does not fit it (a folding phone's cover screen, 280 px: Room B's and the Hospital's slots cannot fit 121 px), the same, asking for a wider screen: "This board needs a wider screen. Unfold the phone, or make the window wider." 

No target shrinks below 44 px, the board never scrolls (the owner's decision ruled out a scrolling board), and the rooms never run under the navigation: `fits: false` is never drawn as a board.

**Where each shell starts to fit**, the same for 7, 8 and 9 players (usable height; from `fitBoardV2`):

| Width | Compact from | Short from | Tall from |
| --- | --- | --- | --- |
| 320 px | 568 px | 590 px | 606 px |
| 360 px | 580 px | 602 px | 618 px |
| 375 px | 586 px | 608 px | 624 px |
| 390 px | 592 px | 614 px | 630 px |
| 393 px | 594 px | 616 px | 632 px |
| 412 and 414 px | 598 px | 620 px | 636 px |
| 428 and 430 px | 600 px | 622 px | 638 px |

So the phone kit's short shell is kept from its own threshold (601 px) only where it fits, and the compact shell holds the band between: at 430 px wide, 601 to 621 px. The tall shell always fits from 641 px on phones up to 430 px wide. The first version chose by height alone, which left the review's 430 × 601 21 px short and 390 × 601 13 px short.

**Each band's smallest height**, with every slot pressable (from `fitBoardV2`, the same for 7, 8 and 9 players):

| Phone | Shell | Command / A and B / Hospital and Jail | Board height left | Spare |
| --- | --- | --- | --- | --- |
| 320 × 568 | Compact | 100 / 192 / 178 | 470 | **0 px** |
| 360 × 640 | Short | 100 / 200 / 182 | 520 | 38 px |
| 360 × 740 | Tall | 100 / 200 / 182 | 604 | 122 px |
| 375 × 667 | Tall | 100 / 202 / 186 | 531 | 43 px |
| 390 × 844 | Tall | 100 / 204 / 190 | 708 | 214 px |
| 393 × 852 | Tall | 100 / 204 / 192 | 716 | 220 px |
| 414 × 896 | Tall | 100 / 208 / 192 | 760 | 260 px |
| 430 × 932 | Tall | 100 / 210 / 192 | 796 | 294 px |

The first version of this table gave the Hospital and Jail band at 414 × 896 and 430 × 932 as 194 px. That was a copying error: `fitBoardV2` gave 192 px then too.

**Why the smallest phone has its own shell.** Rooms A and B need 192 px each once all five of their reviewed places are pressable at once. Today's board only reserves room for the characters actually offered as targets. In the phone kit's short shell, the three bands needed 22 px more than the shell left the board at 320 × 568. This was not the ward's doing.

**The owner's decision.** Three options were put to the owner:

1. A 22 px more compact shell on phones up to 600 px tall (recommended).
2. Press areas of 40 px on that size only, below the project's 44 px rule.
3. The board scrolling by 22 px, against the brief's "fits normal phone viewports without page scrolling".

On 13 October 2026 the owner approved the recommendation, the compact shell ([owner-decisions.md](owner-decisions.md#13-october-2026-the-fixed-slots-the-ward-and-the-smallest-phone)). Every target stays at 44 px and no game art changes.

**What the compact shell takes, and from where.** It saves 22 px:

| Part | Saving |
| --- | --- |
| Top bar, 44 → 36 px | 8 px |
| Navigation, 56 → 48 px | 8 px |
| Board padding above and below, 5 → 2 px | 6 px |

At the sides the board keeps 5 px. Padding of 2 px there would widen Rooms A and B by 3 px, and their five places would then need 194 px: 2 px more than the compact shell frees (measured with `fitBoardV2`).

**No spare height at 320 × 568.** Each band gets exactly what it needs. Anything else that takes height from the board on such a phone puts the lowest rooms' press areas under the navigation. The check fails on any change of that kind.

**The raised Pass.** The navigation's Pass rises above the navigation's top edge, over the spine between the Hospital and the Jail. `fit.mjs` places it as a circle (`pass`), and `passClearance()` gives each slot's distance from it:

- **Compact shell:** it rises 8 px. The lowest press areas end 12 px above the navigation (2 px padding, a 2 px border and the 8 px foot), so it clears every slot whatever its shape. The nearest slot is H3, 9.2 px away.
- **The phone kit's shells**, as measured in the kit: the short phone's Pass rises 13 px and the tall phone's 17 px, the second past the lowest press areas' line. Their circles still clear every slot, at 8.4 px or more (H3 at 360 × 740). That is more than the kit's 4.5 px ring round the Pass.
- **The panel corners:** in every shell the Pass overlaps the lower inner corners of the Hospital's and the Jail's panels, where there is no press area. The Hospital close-ups show its edge there.

The check requires every phone size to fit in its shell with no shortfall, and every slot clear of the Pass, at every width from 320 to 430 px, one pixel either side of every shell's boundary, with and without safe-area insets. The captures measure both in the DOM, and press every slot with a real pointer (section 7).

## 5. For Frontend

Frontend has reviewed none of this, and nothing has been adopted.

**Proposed pure drawing modules.** These are new files. Each needs Integration's approval by name and hash; there is no directory exemption (issue #115).

| Module | Exports |
| --- | --- |
| `design/board-v2/scenes/hospital-ward.mjs` | `wardScene(roster)` in the shape of the existing scenes (`room`, `source`, `under`, `floor`, `over`, `props`, `inner`, `focus`, `layers`, `slots`); `WARD_BERTHS`, `wardBerths(roster)`, `WARD_ROSTERS` |
| `design/board-v2/scenes/slots.mjs` | `slotsOf(room, roster)`, `boardSlots(roster)`, `slotCount`, `sceneOf`, `slotProblems`. No allocation: read the stored `slotId` |
| `design/board-v2/js/fit.mjs` | `fitBoardV2(viewport, roster, { insets })`: the shell, the fallback (`null`, `narrow`, `too-short` or `too-narrow`), the board's column, bands, panels, each room's box, the navigation's top and the Pass. Also `shellFor(height)`, `insetsOf`, `MIN_BOARD_WIDTH`, `FALLBACKS`, `SHELL`, `SHELL_TIERS`, `slotRects(room, roster, panel)`, `slotsFit`, `needHeight`, `passClearance`, `pressSide`, `MARKER_RADIUS`, `BANDS` |

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

**Choosing the shell on the phone** (section 4): measure the usable height from the visual viewport less `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`, take the kit's shell for it, and step down while the rooms would not fit; then the `narrow` and `too-short` fallbacks. Measure again on resize, rotation, and when the browser's bars show or hide. Never draw a board that does not fit, and never shrink a target to make one fit. The bars' backgrounds fill the insets; their contents stay inside.

**The compact shell** (the owner's decision, section 4), drawn up to 600 px and wherever the short shell would not fit:

| Part | Short phone (the kit, up to 640 px) | Compact (up to 600 px) |
| --- | --- | --- |
| Top bar | 44 px | 36 px, with the same content: portrait, round, phase line and detail, timer. The phase line stays on one line |
| Navigation | 56 px | 48 px plus the bottom safe area. Every button is still a 44 px target |
| Raised Pass | 58 px, rising 13 px | 52 px, its top no more than 8 px above the navigation's top edge |
| Board padding | 5 px | 2 px above and below; 5 px at the sides |

From 601 to 640 px the kit's short phone (`data-short`) is drawn wherever it fits, and the compact shell elsewhere: at 430 px wide, 601 to 621 px. The board-motion prototype and the phone kit are not edited, so their reviewed captures stay valid. The compact shell is drawn only on the board-v2 review page, with stand-ins for the bars and the Pass, so its real content is for Frontend to try: long names, and enlarged text.

**Not to port:** `design/board-v2/js/page.js` and `js/fixtures.mjs`. They are a review page and synthetic fixtures, not a client.

**What Frontend keeps owning:** phase and exchange identity, audience, fresh view, trusted deadlines, foreground checks, private-content concealment and receipt recovery. Nothing here touches them.

## 6. For Backend and Integration (proposals; nothing accepted)

1. **A stored, public `slotId` per on-board seat**, assigned by the specification's lowest-free rule (rules-contracts, Blackout validation and resolution) in this table's numbering, and never reflowed. This is the dependency that blocks Blackout. A historical tuple keeps today's stateless placement.
2. **A new ruleset tuple in which the Hospital holds the whole roster** and every Injured character is in it. It supersedes CAPACITY-01's five for the Hospital and CAPACITY-04's waiting outside it.
3. **Medical detention from existing facts.** An Injured prisoner is in the Hospital with `jailed` still true; the detention tag reads `location === 'Hospital' && jailed`. No new field is needed.
4. **The roster for the ward** is `seats.length` (7–9) at match creation, fixed for the match.

## 7. Verification

These were run on this branch in this container after the review's corrections. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **7 / 7.** Fence and development marks; every pinned drawing source and proposed pin byte for byte; the ward built from the approved source, current, in the drawing vocabulary; the slot rules for 7, 8 and 9 players, the reviewed places unmoved, the berths' layering, **no allocating function in the drawing module** and every fixture one seat per slot; at the eight phone sizes, each in its shell, the board fitting and every slot a whole 44 px press area clear of the Pass; **the shell choice at 2 955 boards** (11 widths from 320 to 430 px, one pixel either side of every shell's boundary and of the kit's 600 and 640 px steps, 7, 8 and 9 players, five safe-area cases): the largest shell up to the kit's that fits, a narrower board or the too-short or too-narrow message where none does, and never a room under the navigation; the captures current and passing |
| `node design/tools/board-v2-capture.mjs` | **33 pictures + a contact sheet, 0 with problems**, five new: 430 × 601 in the compact shell, 390 × 844 with safe-area insets, and the `narrow`, `too-short` and `too-narrow` fallbacks. On each board it measures, from the DOM, what the first version did, and now also **presses every slot with a real pointer**: `document.elementFromPoint` at its centre and 3 px inside each corner must land on that slot's own button |
| The same run: **186 pointer probes, 0 with problems** | At nine widths from 320 to 430 px, the heights one pixel either side of every shell's boundary and of 600 and 640 px, for 7 and 9 players, and with safe-area insets at 390 and 430 px: the page's shell and fallback are `fit.mjs`'s and 4 428 slots were each pressed at five points |
| `node design/tools/board-v2-assets.mjs --check` | 14 files current |
| `npm test --workspace @mothership/design-tokens` | **229 / 229**, 10 of them in `board-v2.test.mjs` (two new: the shell chosen by fit at the review's sizes, safe areas and both fallbacks; every boundary at eight widths and three rosters) |

**What the pointer test found besides.** Its first run found every room's caption over the upper corners of its top row's press areas (C1, A5, B5, H7, H8, J1, J2), at every size: the review page drew the caption as an `h2` whose own top margin pushed it 10 px below its 3 px place, over press areas that start at the caption's 44 or 32 px. The caption's margin is now 0, as the prototype's tag; the second run found nothing. This was the review page's stand-in caption, not `fit.mjs`, but a client must keep the same rule: nothing over a press area.

**The accepted drawing candidates are unchanged.** `hospital-ward.mjs` and the 12 ward SVGs are byte for byte the bytes the review accepted (their hashes in `GameN-designer-stack-hashes-2026-10-13.json`); only `slots.mjs` and `fit.mjs`, whose acceptance was withheld, and the evidence files `contract/slots.json` and `assets/manifest.json` changed.

**Not run:**

- Real phones, a screen reader, enlarged text on this page.
- A match.
- `npm run verify` as a whole: see the PR. Its capacity gate's time limit is Integration's (PR comment).

The memory game itself (whether people can remember positions in five seconds) is not something a capture can show.

## 8. Unresolved

- **Backend's slot field and the new tuple** (section 6). Until they exist, nothing here ships to players.
- **Phones whose usable height is under 568 px**, such as a 320 × 568 phone with its browser's bars showing, get the `too-short` message rather than a board. Whether to ask for full-screen play (an installed web app, or a minimal browser interface) on the smallest phones is for the owner and Frontend; the owner's decision rules out a scrolling board.
- **The compact shell's real bars** (section 5): their content at 36 and 48 px, with long names and enlarged text, is Frontend's to try. The review page draws stand-ins.
- **The ward's states**, which come with the Hospital scenes: monitor states, deadline badge, detention tag, drone, flatline.
- **The owner has not seen the ward.**
