# Board v2: the four-berth Hospital (the owner's decision of 18 October 2026)

**A proposal from the Visual and Motion Designer, 18 October 2026.** On 18 October the owner decided that a successor match has four Hospital beds whatever its roster, and that an incoming player who finds all four occupied is permanently eliminated and off the board ([#155](https://github.com/Amirkianfar66/GameN/issues/155), `HOSPITAL-4-2026-10-18`). This is the successor's Hospital, drawn beside the current one: the four-berth ward, its slots and its layout, #158's medical films on its berths, and the overflow victim's beat. The roster-sized ward, #158's films and every existing hash are unchanged; the current release keeps them.

Nothing here is a rule, a server contract or an adopted asset:

- **Rules:** who is admitted and who overflows, and in what order (H4-ORDER-01), are Backend's and Integration's. The board draws the server's facts; it allocates no bed and infers no admission or death from a full ward.
- **The successor's contract is a draft:** Backend's plan on [#157](https://github.com/Amirkianfar66/GameN/pull/157) (`full-game-1.11.0` proposed and unallocated). Its overflow event (H4-CLINICAL-01) is undecided; the beat here is a proposal on Backend's preferred choice A, whose occurrence is still unallocated, with labelled synthetic inputs. The Designer's review of #157 is on [#155](https://github.com/Amirkianfar66/GameN/issues/155#issuecomment-6252817010).
- **Adoption:** each new file needs Integration's approval by name and hash (section 10). The layout's identity (`board-v2-four-0.1.0` here) is a proposal for Integration to allocate with the successor's tuple.

| | |
| --- | --- |
| Branch | `claude/designer-hospital-four`, stacked on #159 (`claude/designer-captain-films`) at `7f3344e`, itself on #158, #144, #130, #129, #128, #127 and the integration baseline `abb6839` |
| Why stacked | The successor reuses #159's off-board record (the grey cut-outs, the plaque, the Code cards), #158's films and #128's rooms, slots and layout |
| Toolchain | Node 22.21.1, npm 10.9.4, headless Chromium 141 |
| New files | `design/board-v2/scenes/hospital-ward-four.mjs`, `scenes/slots-four.mjs`, `js/fit-four.mjs`, `js/turns-four.mjs`, `fx/medical-four.mjs`, `fx/overflow.mjs`, `films/overflow.mjs`, `js/layout.mjs`, `js/overflow-fixtures.mjs`, `js/overflow-view.mjs`, eight SVGs (`assets/scenes/hospital-ward-four.*`, `assets/lighting/hospital-ward-four.dark.svg`), `contract/slots-four.json`, `packages/design-tokens/test/four.test.mjs`, this page |
| Changed | The review page (`js/page.js` and its views, which now take their layout from `js/layout.mjs`; `css/page.css`, `contact.html`), the asset tool, the capture tool, the static check, `contract/films.json` and the manifest (now `board-v2-0.7.0`). No current scene, slot table, layout, film or figure module changes, and the approved rooms are unchanged. Nothing outside `design/board-v2/`, `design/tools/board-v2-*`, `packages/design-tokens/test/` and `docs/design/` |

## 1. The four-berth ward

**The drawing.** The room is the approved sick bay, as in the roster-sized ward: its shell, its back wall (with its monitor, medicine cabinet and window) and its edges are lifted unchanged from `design/source/board/board-hospital.svg` around the same deck, and the drone's dock is the same. Four berths stand in two rows of two, seen end on as the approved beds are:

```
H3 H4   the back row, at the foot of the wall
H1 H2   the front row, cut by the panel's lower edge
```

Nothing is set into the wall, so the approved back wall shows whole and no berth is under the room's caption on any phone. The berths are larger than the roster-sized ward's: the front row at 1.3 times its front row, the back row at 1.2 times its middle row. Each berth is the same public furniture: a headboard, a pillow, a blanket, a dark monitor, a status lamp, a bed light and a plate for a status tag. The front row's headboards are their own layer, drawn over the back row's berths and under their own patients, so the back berths' feet go behind them. The numbers follow the proposed filling order, front row first, as in the roster-sized ward.

**The same for 7, 8 and 9 players.** The drawing does not depend on the roster: the asset tool composes it for each roster and refuses any difference. Nothing is cropped from the roster-sized ward, renumbered, or drawn for a roster of four.

**The art.** `assets/scenes/hospital-ward-four.back.svg` (the room and the back row), six layers (`.berth-four-h1-head`, `.berth-four-h2-head`, and the four blankets `.berth-four-h1` to `-h4`) and the Blackout's dark art, `assets/lighting/hospital-ward-four.dark.svg` (the lit files by the night rule, the layers in depth order).

**The board is the current one, panel for panel.** `js/fit-four.mjs` re-exports `fit.mjs`, `fitBoardV2()` included, the same function. So every band, panel, box, shell, Pass and fallback is the current board's, and so is every placement drawn from them: the capsule, the Captain's console and pulse, the Blackout's lighting, the controls' choosing row and sheet. The successor changes nothing outside the Hospital's panel. `fit-four.mjs` redefines only the four functions that read the slot table (`slotRects()`, `slotsFit()`, `boardRects()`, `passClearance()`), as `fit.mjs`'s own code over the successor's table, and the check holds them to that. `js/turns-four.mjs` is `turns.mjs` with its two imports changed, line for line.

The four berths need less height than the roster-sized ward's nine. A layout that shrank the Hospital's band would have shrunk the controls' sheet, which covers the Hospital and the Jail, below its 160 px floor (to 122 px). Keeping the current bands keeps the sheet, its budgets and every film exactly as reviewed. The four berths fit every Hospital panel the current board draws: at every width, inset case and shell boundary the shell check visits, with and without the capsule, for every roster (section 9).

**The slots.** `scenes/slots-four.mjs` gives the successor's table with the same exports as `slots.mjs`: the Hospital's berths `H1` to `H4`, every other room `slots.mjs`'s own slots, unchanged. `contract/slots-four.json` writes it out. A Blackout position in the Hospital is H1 to H4, numbered as the berths are.

## 2. #158's films on the four berths

The films are #158's, unchanged; only the berths' geometry is the four-berth ward's (`fx/medical-four.mjs`):

| Function | What it gives |
| --- | --- |
| `fourBerthKit(id)` | A berth's monitor, lamp, plate, bed light, bed, chest and the drone's hover point, in the shape of #158's `berthKit()`, as the four-berth ward draws them. The check holds the numbers to the ward's own SVG elements |
| `fourRescueFrame(t, berth)` | #158's `rescueFrame()`, every field as it gives it, but the drone's lens over this ward's berth (its path from the same dock, the same timings and bob). The check compares the two every 10 ms in both motion modes |
| `fourClinicalBerth(anchor)` | The bed an anchor names: `HVn` for `Hn`, n from 1 to 4. The Designer's proposal on #155, not a contract |
| `fourFilmBerth(anchor, seats, subject)` | #158's rule: the film plays at that bed unless another seat holds it in the published snapshot; then the outcome's words stand alone |

**One place per bed is enough.** An admission plays at the patient's own `slotId`. A rescue (S5) or a flatline (S10) plays at its anchor's bed only when no other seat holds it. So the healed-first case of #157 needs no fifth place: when P7 is healed out of a bed and P1 admitted to it in the same batch, P1's arrival plays at the bed and P7's rescue is said in words. The Designer draws no fifth berth and no clinical place off a bed.

## 3. The overflow victim's beat

A proposal on Backend's preferred event choice A (H4-CLINICAL-01): a non-bed occurrence (illustratively `HOSPITAL_OVERFLOW_REMOVED { phaseId, round, seatId }`, unallocated), with the existing health and placement facts and no `MEDICAL_OUTCOME`. The victim never had a bed, so the beat is not clinical: no bed, berth, monitor, drone or flatline. It plays where the victim was and ends with the victim off the board, as the snapshot published with it has it (`films/overflow.mjs`, 2.8 s):

| Beat | ms | What it draws |
| --- | --- | --- |
| Full | 0–300 | The Hospital's FULL stamp appears beside its caption: the four beds are taken. It is the page's text, as USED is |
| Grey | 300–1100 | At the victim's place (the snapshot before), its figure becomes the grey cut-out of #159's off-board record, the same whatever its side |
| Lift | 1100–2200 | The cut-out leaves the board on a short arc to the plaque, shrinking to a third of its size; its place is empty. The client's words from 1 100 ms |
| Counted | 2200–2800 | The plaque takes it: a small pop, its count the published snapshot's; the FULL stamp fades |

Reduced motion (1.56 s): two still panels, each faded in over 80 ms. They show the cut-out at its place with FULL, then the place empty and the plaque counting it. There is no travel, pop or fade beyond the panels.

**The plaque moves to the spine.** In the successor a character can be off the board for two reasons, the Captain's EJECT and a Hospital found full. So the plaque that counts them leaves the Jail's caption, where it would suggest the airlock, for the spine between the Hospital and the Jail: beside both rooms, neither's (`spinePlaqueBox()`). It counts the seats whose `location` is null, whatever took them off, and the number is the page's text. On the successor board the Captain's EJECT ends at the same place.

**The FULL stamp** goes right of the Hospital's caption in its band. Where it does not fit there whole (the 320 px phone), it goes just below the band under the caption's left end, clear of every bed's press area. Where neither is clear, no stamp is drawn and the words say it alone (`fullStampBox()`).

**The characters off the board stay choosable,** as #159 made them: a Code may name any seat, and an overflow victim gets the same card in the sheet the choosing row's tab opens. The check fits up to eight cards: an EJECT's five plus three overflows.

## 4. The inputs

| Input | From |
| --- | --- |
| The beds | The successor's stored `slotId`s, `H1` to `H4` (#157, proposed) |
| A patient's state | #158's: `location`, `slotId`, `health`, `jailed` and the server's `medical` facts |
| A medical film's place | Its clinical anchor, read as `HVn` for bed `Hn` (the Designer's proposal; the successor's anchor contract is Backend's) |
| The overflow beat | The non-bed occurrence's `seatId`; the victim's room and slot in the snapshot before it (when the client held it); the snapshot published with it (`location: null`, `slotId: null`, Eliminated) |
| `t` | Milliseconds from the event's presentation start; live only |

Not an input: an attacker, a role, a side, a faction, a cause beyond the occurrence itself, a bed for the victim, or a local clock.

## 5. Audiences

Everything here is public: every phone and the display draw the same, from public facts and events. The capture compares the display's page with a player's (section 9). Nothing in the beat says more than the occurrence.

## 6. For Frontend

Frontend has reviewed none of this. Please review it before anything is ported.

1. Select the four-berth ward and its table only for a successor match whose tuple names it; never infer four beds from a roster or a full ward. The current release keeps the roster-sized ward.
2. The board's geometry is the current one: keep `fit.mjs`'s bands, panels and sheet. Take the Hospital's slots, press areas and markers from `slots-four.mjs` and `fit-four.mjs`.
3. Play #158's films on the four berths with `fx/medical-four.mjs`. Play the overflow beat only for a live, fresh occurrence, over the snapshot published with it, and never on a reconnect or for an expired, duplicate or baseline-suppressed one. The removal itself comes from the snapshot, so it holds when the occurrence is missed.
4. Draw the victim at its earlier place only where the client held the snapshot before; otherwise the beat draws nothing of it.
5. Keep every slot's target live and on top. Stop the beat at once for a newer snapshot that moves anyone, the Blackout's window, or a hidden page.
6. Say the occurrence once, in the client's words; time them to `announce` if they are timed to the beat. The review page uses the hosted board's elimination words as a stand-in.
7. On the successor board, draw the off-board plaque in the spine (`spinePlaqueBox()`).

**Not to port:** `js/layout.mjs`, `js/overflow-view.mjs`, `js/overflow-fixtures.mjs` and the other review controllers and fixtures.

**Review page options** (`design/board-v2/index.html?roster=9&beds=4&…`):

| Option | What it shows |
| --- | --- |
| `&beds=4` | The successor's board: the four-berth ward, its slots and the plaque in the spine |
| `&fixture=ward\|mixed\|stress\|empty` | As on the current board; `ward` is the four beds full |
| `&film=critical\|rescue\|flatline` | #158's films on the four berths (`&outcome=` the mixed board's examples) |
| `&film=blackout`, `&film=capsule&ui=…`, `&film=release\|eject` | The other films and the controls, on the successor board |
| `&film=overflow&t=` | The overflow beat (default 700 ms); `&motion=reduced`, `&play=1` |
| `?scene=hospital&beds=4` | The whole four-berth scene |

## 7. For Backend

1. **Anchors.** The films need one place per bed (section 2). If the successor keeps one distinct anchor per subject, a fifth anchor has no bed to be drawn at, and that subject's outcome would be words only.
2. **The occurrence.** The beat needs only `seatId`, with the placement facts. Under choice A no clinical record is drawn for the victim.

## 8. For Integration

1. **Approval by name and hash** of the scene, the slot table, the two layout modules, the two medical and overflow modules, the film module and the eight SVGs (section 10).
2. **The layout's identity** (`board-v2-four-0.1.0`, proposed) and its pairing with the successor's tuple, art and Ready agreement are Integration's.
3. **`fit-four.mjs` is `fit.mjs`'s `fitBoardV2()` itself.** A port can import the current layout and add the successor's four slot functions; nothing else differs.
4. **No playable build** until the successor contract is adopted and Frontend has implemented it. This page is not evidence that anything is implemented or deployed.

## 9. Verification

These were run on this branch in this container. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **14 / 14.** #159's thirteen and the successor's own. `fit-four.mjs` exports `fit.mjs`'s own `fitBoardV2()`, bands, shell and fallbacks, the same functions, and its four slot functions are `fit.mjs`'s code over the successor's table; `turns-four.mjs` is `turns.mjs` line for line but its two imports. Four berths, `H1` to `H4`, for 7, 8 and 9 players, the same drawing for each; every other room has the current table's own slots. Each blanket is over its own patient and under nobody else; each front headboard is between the back row and its patient. The berths' monitors, plates and lamps are the ward's own SVG elements, each badge is at its plate, each chest at its press point, and the drone comes from the dock, hovers over each berth while it scans and goes back. #158's rescue, every 10 ms in both motion modes, is #158's frame on each of the four berths, field for field, except for where the drone is; in the reduced variant the drone stays at its berth. `HVn` names bed `Hn` and nothing else, and no film plays over a bed another seat holds. The four berths are whole, apart and 44 px or more in every Hospital panel the current board draws (5 610 boards: every width, inset case and shell boundary the shell check visits, with the capsule and without, for every roster), and clear of the Pass; every other room's press areas are exactly the current board's. #158's tags, insets (186 placed) and drone are clear at the 8 phone sizes, the ward full or empty. The controls' sheet and choosing row are the current board's (42 layouts, normal and 200% text), with up to eight off-board cards of 44 px or more (285 decks). The overflow beat, every 10 ms in both motion modes: 2.8 s, nothing drawn outside it, the words never withdrawn, still reduced panels, and no input but the moment and the setting changes it. The plaque fits the spine at every phone size (48 boards), and the FULL stamp is whole in the panel, over neither the caption nor a bed's press area. The example has the server's shape: the ward full, the victim an incoming Healthy player and off the board afterwards, nobody else moved. The contracts name no role. It also checks that the captures are current |
| `node design/tools/board-v2-capture.mjs` | **326 pictures and eight contact sheets, 0 with problems**, 52 of them the four-berth board's. Each four-berth picture is measured as the current board's are, with `fit-four.mjs`'s expectations: no scroll; every room's press areas and position numbers where `fit-four.mjs` puts them; a real pointer landing on every slot's target. #158's films on the four berths are measured against `fx/medical-four.mjs` as #158's are against `fx/medical.mjs`: the tags, the inset, the drone and its lens, the light; the Blackout's dark at its four positions; the controls' sheet; the Captain's films with the plaque in the spine. Every overflow picture is checked for: the page at the beat's stage and the live region's words at the beat; no side or role word; the FULL stamp where `fullStampBox()` puts it and at the frame's opacity, over neither the caption nor a bed's press area; the victim's own figure and grey cut-out at its place alone, as the frame has them; one plaque, where `spinePlaqueBox()` puts it, its count the snapshot's; the flyer on `overflowWay()` from the victim's press point to the plaque's centre (to 1.5 px); nothing of the beat on the page before or after it |
| The same run: **391 whole-page comparisons, 0 differing** | #159's 376, and 15 for the successor. Every room but the Hospital on the four-berth board and on the current one, at 390 × 844 and 320 × 568, with the capsule and without: 4. The page after the overflow beat and before it, in both motion modes: 4. The display's page and a player's, during the beat (2) and the rescue on four berths (1): 3. The rooms the beat never touches (the Command Room, Room A and the Jail) during it and before it: 3. The rooms the rescue never touches during it and before it: 1 |
| The same run: **230 pointer probes, 23 press tests (129 presses), 12 label placements** | 0 problems |
| Pictures byte for byte the same | Every review picture and contact sheet made before the successor (274 pictures, seven sheets) re-rendered byte for byte the same; only `index.json` and `report.json` changed, with the new pictures |
| `node design/tools/board-v2-assets.mjs --check` | 127 files current |
| `npm test --workspace @mothership/design-tokens` | **305 / 305**, 12 of them in `four.test.mjs` |
| `npm run verify` | Passed through `test:balance`'s static gate: toolchain, workspace and sources checks, both typechecks, bootstrap 55 / 55, engine 253 / 253, backend 187 / 187, tooling 130 / 130, frontend 194 / 194 and 448 / 448, design 305 / 305, balance static 103 / 103. `test:scenarios` refuses an uncommitted tree, so it was re-run on `8f615f0` in a clean checkout of that commit, clean before and after. Its catalogue passed (555 ids: 516 passed, 33 reviewed blocked, 6 explicit manual, zero errors), and its engine controls detected all 4490 (1419, 1418 and 1653 in modes 7, 8 and 9; none undetected), every listed leak caught. The gate then stopped at its 20-minute limit in this container, with no failure in its logs. `test:capacity` was not run here. Neither gate touches this PR's files; the PR's CI runs both |
| A mutation of the beat's clock (this session, not committed) | Measuring each overflow picture against the frame 150 ms later than its query made 6 of the 10 fail: on the stage, the FULL stamp's opacity, the victim's figures and the flyer's place |

The captures' inputs hash is `1da609e974f2505a7c867b6ce0a7d61939f3269dd8c45b3f0506f67c038107ae`.

**Not run:**

- Real phones, a screen reader, a phone's own text-size setting, or reduced motion set on a device: the review page takes `&motion=reduced` from its query.
- A match or any server: the four beds' patients, the anchors and the overflow occurrence come from the review page's synthetic fixtures, not from #157, which is a plan.
- An overflow beat cut by a newer snapshot or the Blackout's window: specified (section 6), not pictured.
- Two overflow victims in one batch: not pictured, and how their beats follow each other is open (section 11).
- The owner's review.

Whether players read the overflow beat as an elimination and not as a transfer, and the plaque in the spine as a count of both reasons, is for a table of players, not a capture.

## 10. The exact files

Read every file at this PR's commit. Every file carries the `mothership:dev-only` mark and stays fenced until Integration ports it in a separate, versioned review; the Designer changes no fence and no pin.

**Proposed for import:** seven pure modules and the eight SVGs.

| Module | What it is | Exports |
| --- | --- | --- |
| `design/board-v2/scenes/hospital-ward-four.mjs` | The four-berth ward's drawing and its berths | `FOUR_ROSTERS`, `FOUR_BEDS`, `FOUR_COLUMNS`, `FOUR_ROWS`, `FOUR_BERTHS`, `FOUR_BACK`, `FOUR_FRONT`, `fourBerths`, `fourPlateCentre`, `wardFourScene` |
| `design/board-v2/scenes/slots-four.mjs` | The successor's slot table, `board-v2-four-0.1.0` (proposed) | `slots.mjs`'s exports: `BOARD_ROOMS`, `LOCATION_OF`, `SCENE_UNITS`, `SLOTS_VERSION`, `SLOT_TABLE_VERSION`, `ROSTERS`, `slotCount`, `sceneOf`, `slotsOf`, `boardSlots`, `slotProblems` |
| `design/board-v2/js/fit-four.mjs` | The successor's layout: `fit.mjs` re-exported, its four slot functions over the successor's table | `fit.mjs`'s exports but `needHeight` |
| `design/board-v2/js/turns-four.mjs` | `turns.mjs` with its two imports changed | `turns.mjs`'s exports |
| `design/board-v2/fx/medical-four.mjs` | #158's films on the four berths, `board-v2-medical-four-0.1.0` | `MEDICAL_FOUR_VERSION`, `fourBerthKit`, `fourBerthKits`, `fourClinicalBerth`, `fourFilmBerth`, `fourDronePosition`, `fourRescueFrame` |
| `design/board-v2/fx/overflow.mjs` | The plaque in the spine, the FULL stamp, the victim's way, `board-v2-overflow-0.1.0` | `OVERFLOW_FX_VERSION`, `spinePlaqueBox`, `fullStampBox`, `overflowWay` |
| `design/board-v2/films/overflow.mjs` | The overflow victim's beat, `board-v2-overflow-films-0.1.0` | `OVERFLOW_FILMS_VERSION`, `OVERFLOW_FILM`, `overflowEnd`, `overflowFrame`, `overflowContract` |

`hospital-ward-four.mjs` imports the approved `design/board-motion/scenes/kit.mjs`, `frame.mjs`, `figures/body.mjs` and `gestures.mjs`, unchanged. `slots-four.mjs` imports it and `slots.mjs`; `fit-four.mjs` imports `slots-four.mjs` and `fit.mjs`; `turns-four.mjs` imports `fit-four.mjs`, `slots-four.mjs` and `capsule.mjs`; `medical-four.mjs` imports #158's `fx/medical.mjs` and `films/medical.mjs`, unchanged; `fx/overflow.mjs` imports `fx/label-box.mjs`. Nothing imports a controller, fixture or tool.

The eight SVGs: `assets/scenes/hospital-ward-four.back.svg` (1024 × 768), its six layers (`.berth-four-h1-head`, `.berth-four-h1`, `.berth-four-h2-head`, `.berth-four-h2`, `.berth-four-h3`, `.berth-four-h4`, each 1024 × 768 with its depth in the manifest) and `assets/lighting/hospital-ward-four.dark.svg`. The manifest's `four` section lists each with its hash, and the berths' kits.

To check every file proposed for import, and the generated contracts, run `sha256sum -c` on this block from the repository root:

```
005311acdcefc0b33e42212621feae2a88a1b24ede432e2ab1d5fb60574f8157  design/board-v2/scenes/hospital-ward-four.mjs
268d53c7a807df9f465b9c632ec6f962f94551cdeabcfa06475af21fff1df085  design/board-v2/scenes/slots-four.mjs
9091cee28f6265675ea33f2d59e3598773ba714a8240997140b5c35a44c1c1ca  design/board-v2/js/fit-four.mjs
a1099fee5c44ddbc147d6f8b58ec38ba3d7e1e022e31bfc02a0b62dff1ef1e6e  design/board-v2/js/turns-four.mjs
c289a932a955a28ef9a1be4635bfb1632badc77b42c06e9c062fc42970fd166b  design/board-v2/fx/medical-four.mjs
916d17bb81dcadb18a71f2e4ac044853c7067522ba02c91df9a22c3f4a413a8f  design/board-v2/fx/overflow.mjs
074df18a98baeb57fbead94f3be22d544530dc1950518b1e2be0264cc3f67428  design/board-v2/films/overflow.mjs
d6e47a6b16f44dc125066a65a51cb12ddd0d7af0a932c7057cab44dfd71b3f73  design/board-v2/assets/scenes/hospital-ward-four.back.svg
ec7386ac6dc41968fe45c91635041d58af892c321e2dff38d5aedacb67e0aad8  design/board-v2/assets/scenes/hospital-ward-four.berth-four-h1-head.svg
80527027da742c9c54ed7c592a8990bfb859dd5f9ccf3f372b6809b43b2c0595  design/board-v2/assets/scenes/hospital-ward-four.berth-four-h1.svg
1b35cf49bde0f877eafa3a7104e3ecac47506f96e9665ca64bae057324e96b24  design/board-v2/assets/scenes/hospital-ward-four.berth-four-h2-head.svg
71fc859413829f9e815715dbc2fd383b0226fa3c913a9775a915d203f3e8c082  design/board-v2/assets/scenes/hospital-ward-four.berth-four-h2.svg
09a9029eefd0986eb864292104938953a1f75342919326a294c8c05e0b2ffcf3  design/board-v2/assets/scenes/hospital-ward-four.berth-four-h3.svg
c1750f7c8c2ed967063b37e9814466a30746bb6aecf8c7fd807c9028d49f02a1  design/board-v2/assets/scenes/hospital-ward-four.berth-four-h4.svg
1965030a05caeaff8f778317bcc687789aa40728a164dd5a8340a07e4132f542  design/board-v2/assets/lighting/hospital-ward-four.dark.svg
4f74c8112c5e6434e6e81e224d30140a46ecb67289f7e29b37119a3d464c4cfd  design/board-v2/contract/slots-four.json
b570c7700a425857664a1b7839473f22eb980a7b0d2e942851902fb409159283  design/board-v2/contract/films.json
1ba7d642fedd017fdad02885465305e776dc7108e4c73118270e52a64a59668b  design/board-v2/assets/manifest.json
```

**Review only, not to port:**

```
8135e84200d70d9c89b3a255ba89c2b283af496e58ba20b52d557996c7aa36bd  design/board-v2/js/layout.mjs
8acf90859afe85e4dc21d26c4d6d1ac0378cbd96b8f9bb430f4d61c99e5078f5  design/board-v2/js/overflow-view.mjs
f3f07a3c49e80ab2b4b2c01daf6a64d4b5f43a6ad0329fcfbe98a4a86726f262  design/board-v2/js/overflow-fixtures.mjs
a340041000d9b3ce01db896bfe64523a5d093cb7dfef21bb3cfb7cb7c5bc87bd  design/board-v2/js/page.js
1689ae8dff12a59b98f58e2e786c1eb0f22b9194a5f746240908625582d1fae1  design/board-v2/js/medical-view.mjs
4d09fe24a4530b81c6884323ae8a6d688664cb7c7841596e0dfd8a600e8c9ce3  design/board-v2/js/medical-fixtures.mjs
ba46ec99d074c0076fb111caeca1f43f50be81b104aba99f896bd2c5188300f6  design/board-v2/js/captain-view.mjs
094ab866130ee7102f3bb91273fa6f6e092ab93248b6ed10fa21cca5ea92649d  design/board-v2/js/captain-fixtures.mjs
fa4e51d42418d8b5fed200450bf289f92dbc7dc29798b8e9c615dfdfc93fe099  design/board-v2/js/blackout-view.mjs
8569cb10368ba4dfbf78316631c485dcb73c298177931616e727be2c2205ff7b  design/board-v2/js/blocked-view.mjs
764160057202d0d7897b0257e4ea7c52714768ac3d2ddb46783057cbaae94779  design/board-v2/js/capsule-view.mjs
7176033d735ee2306db965099f52345734d22901820c2b2e3f6446b39005cdc4  design/board-v2/js/turns-view.mjs
a049f7719f1bf3d1c72f072ba918d7a034c964f0aec8b9453c8004c4023fef0a  design/board-v2/js/fixtures.mjs
bb97d48f750a2eb4dcde63d207301461f321e1756adeba0868ec7efe1e8847d8  design/board-v2/css/page.css
acc3f635d714c3b23b4a07ebcb6eaaebe70409b9fc546778b25ab9d21963fa7a  design/board-v2/contact.html
49a311593f7a9bb79f955ee2fa04ddd788bab2309e0076d8946a914863c9f470  design/tools/board-v2-assets.mjs
c8513a63c4fa730b376d497247e473fe548826a490bcbea13e2fb9da88df579c  design/tools/board-v2-capture.mjs
a1b865c4e9f580f6e7a07509f16559acd4de78cd37e4c196c380a28c00094c39  design/tools/board-v2-check.mjs
3c79fdc0610fb3113764054482d6dd419443335dce5034a4f1e464e191644d74  packages/design-tokens/test/four.test.mjs
336abc9ce5c9b01070d8a9bbf2ea0708426119501b0545aa38ab0ccb256f63ce  design/board-v2/review/contact-four.png
ce1abab54d0e0c0e6afb06440b5a789048a9053c8f509fe1ee6416a3a1f268d1  design/board-v2/review/index.json
94792a4d58550268f05e11c5ac014e5b42191d4da392db55326b7dd6dca5b54c  design/board-v2/review/report.json
```

The complete list of every path this PR changes, its pictures included, with each SHA-256 at the PR's first head, is in the [deliverables index](deliverables.md), version 5.

## 11. Unresolved

| Question | Owner | Meanwhile |
| --- | --- | --- |
| Admission order at the last bed (H4-ORDER-01) | Integration, Balance, Backend | The board draws whatever the server places |
| The overflow event (H4-CLINICAL-01): A or B | Integration, Frontend, Designer, Backend | The beat is a proposal on A, with labelled synthetic inputs |
| The successor's clinical anchors | Backend, Integration | `HVn` read as bed `Hn` (the Designer's proposal) |
| The occurrence's words | Frontend | The review page uses the elimination words as a stand-in |
| Two overflow victims in one batch: one beat after the other, or together | Frontend, Designer, after H4-ORDER-01 | Not pictured; the plaque's count is the snapshot's |
| The layout's identity and the Ready mapping | Integration | `board-v2-four-0.1.0`, proposed |
| Real phones, a screen reader, the owner's review | — | Not run |
