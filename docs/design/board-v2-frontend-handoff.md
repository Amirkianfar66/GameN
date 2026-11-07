# Board v2: handoff to Frontend

**From the Visual and Motion Designer to Codex Frontend, 14 October 2026.** This page covers the whole stack: #128's slots and layout, #129's Blackout window and #130's ATTACK BLOCKED. It gives the exact commit, the modules and assets proposed for import with their SHA-256, the exports that changed, the layout and timing a client must keep, the tests a client must repeat, and what is not to be ported. It replaces the 13 October page on #129. It is a proposal: nothing here is adopted, and nothing is a rule or a server contract. Backend owns the authoritative slots, lighting deadlines, recipients, outcome events and receipts.

The specification packet (`GameN-owner-specification-agent-handoff-2026-10-13-v2.txt`, SHA-256 `b5b4ba2d…1b590743`) controls. [motion-spec-crosswalk.md](motion-spec-crosswalk.md) maps the Designer's earlier notes and each review finding to its G and Q identifiers.

## 1. The exact commit

**Read every file at `ebf0263d92cbe66c67a4ce5c64b822a3658031e8`** (`claude/designer-attack-blocked`, PR #130). The commit after it rewrites this page and changes documentation only, so every file in section 3 has the same bytes at the branch's head.

| PR | Branch | Head the 14 October review read | Now | What |
| --- | --- | --- | --- | --- |
| #127 | `claude/designer-phone-polish` | `5c9a1510d35d4b9762f9bc2a27dae3f5d53bd5d7` | unchanged | The phone kit |
| #128 | `claude/designer-board-slots-ward` | `a864f1f2d0547361e3197639dc1adf2ed4e9bd19` | unchanged | Fixed slots, the 7, 8 or 9-berth ward, the layout and its shell ([board-v2-slots.md](board-v2-slots.md)) |
| #129 | `claude/designer-blackout-window` | `e1d4e748036577e1a9fa76aa56c7e17401167e73` | unchanged | The Blackout's lighting window, S1 ([blackout-window.md](blackout-window.md)) |
| #130 | `claude/designer-attack-blocked` | `84ddef43a6cb60488d7dd109863878eef3d3ccc1` | `ebf0263d92cbe66c67a4ce5c64b822a3658031e8`, then this page | ATTACK BLOCKED, S4 ([attack-blocked.md](attack-blocked.md)) |

## 2. What changed since the 14 October review

The review confirmed the six earlier findings corrected and found one defect (P3) in #130's review page. Its already-Injured example redrew Orion, Healthy at B2, as Injured in Room B. Every Injured character is a Hospital patient (G-05, G-07). Now the example is Rigel, the fixture's Injured patient at H1, in the gown. The page reads its targets from the fixture and changes nobody's health, room or slot. The film, its art and its timing are unchanged.

- **`labelBox()` and `LABEL_MARGIN` now live in `fx/label-box.mjs`**, a pure module with no imports. Their logic is unchanged. The review said a pure helper such as `labelBox` needs its own reviewed port, not a copy out of a controller. This file separates it so that it can be reviewed and ported on its own. Import them from there.
- **`js/blocked-view.mjs` stays excluded as a whole.** It gained `blockedTargets()`, which picks the review page's example targets from a fixture. A client takes its targets from the room fact and the authoritative board.
- **Bytes:** of the 47 files in Integration's inventory at `84ddef4`, 46 are byte-identical at `ebf0263`, including all 43 source candidates. The one that changed is `js/blocked-view.mjs`, which the inventory lists as review evidence only. One file is new: `fx/label-box.mjs`.

## 3. Proposed for import: pure modules and assets

These files are proposed, not adopted. Every one carries the `mothership:dev-only` mark and stays fenced until Integration ports it in a separate, versioned review, with its own pins, its manifest entry and the source checker's provenance. The Designer changes no fence and no pin.

| Module | What it is | Exports | SHA-256 at `ebf0263` |
| --- | --- | --- | --- |
| `design/board-v2/scenes/slots.mjs` | Every room's fixed slots and the ward's berths, as normalized anchors. `SLOT_TABLE_VERSION` `board-v2-0.1.1` | `SLOTS_VERSION`, `SLOT_TABLE_VERSION`, `SCENE_UNITS`, `ROSTERS`, `BOARD_ROOMS`, `LOCATION_OF`, `slotCount`, `sceneOf`, `slotsOf`, `boardSlots`, `slotProblems` | `cf329360c86b512d83a9ab4a2df5a7147ba30d7e716c82a7ffa27c5308dadbc1` |
| `design/board-v2/scenes/hospital-ward.mjs` | The 7, 8 or 9-berth ward (an accepted candidate) | `WARD_ROSTERS`, `WARD_COLUMNS`, `WARD_ROWS`, `WARD_BERTHS`, `wardBerths`, `wardScene` | `d6af092a86322a81cc941bc41aade276063b5ba209a18a402a1c5195096dc2be` |
| `design/board-v2/scenes/lighting.mjs` | The Blackout's art: night colors, fixtures, sparks, impact and markers (an accepted candidate). `board-v2-lighting-0.1.0` | `LIGHTING_VERSION`, `SPARK`, `CORE`, `FIXTURES`, `SPARK_LIGHT`, `sparkPlan`, `luminance`, `NIGHT`, `nightFill`, `nightLine`, `nightSpace`, `nightMarkup`, `SPARK_BOX`, `SPARK_ORIGIN`, `sparkSvg`, `boltIconSvg`, `IMPACT_BOX`, `IMPACT_FLASH_RADIUS`, `impactSvg`, `MARKER_STATES`, `markerSvg` | `ed8ce0def1b0c0b965a6b59a52c91c60a0184c5ad86f042eda63108cc70968ad` |
| `design/board-v2/js/fit.mjs` | The layout: the shell, the rooms, the slot rects and the fallbacks, from the viewport, its insets and the roster. Pure, although it sits in `js/` beside the controllers | `pressSide`, `MARKER_RADIUS`, `SHELL_TIERS`, `SHELL`, `shellFor`, `MIN_BOARD_WIDTH`, `FALLBACKS`, `insetsOf`, `BANDS`, `slotRects`, `slotsFit`, `needHeight`, `fitBoardV2`, `boardRects`, `passClearance` | `637d98955361d11e067d326e4ac0a95177334c77661bc9d177edf801ad7d0be6` |
| `design/board-v2/films/blackout.mjs` | S1 as a film: its beats and what it draws at any moment. `board-v2-films-0.2.0` | `FILMS_VERSION`, `BLACKOUT`, `lightsBackAt`, `blackoutFrame`, `blackoutFlashes`, `blackoutContract` | `361c57acf83e12952fe964cd9567816623e658b36eb1413c68047da51520ef88` |
| `design/board-v2/films/blocked.mjs` | S4 as a film, the same for every defense | `STAR_SIZE`, `BLOCKED`, `blockedEnd`, `blockedStartInBlackout`, `blockedFrame`, `blockedContract` | `984cf4a53e1dfbc3984d4caabe9fa6631621824ab624e8de8502d7c13ff21b24` |
| `design/board-v2/fx/blocked.mjs` | S4's art: the shield, the ring and the particles. `board-v2-blocked-0.1.0` | `BLOCKED_VERSION`, `SHIELD`, `FACTION_ACCENTS`, `MIN_ACCENT_DISTANCE`, `cie76`, `shieldColorDistances`, `SHIELD_BOX`, `SHIELD_SIZE`, `SHIELD_RADIUS`, `SHIELD_FLASH_RADIUS`, `shieldSvg`, `blockRingSvg`, `PARTICLE_FRAMES`, `blockParticlesSvg` | `6408b5229172f157086236ec4463e73c9e0ab3aa6755d968ff2552707fd3ef0a` |
| `design/board-v2/fx/label-box.mjs` | **New.** Where S4's label goes in its panel | `LABEL_MARGIN`, `labelBox` | `86acb6f2de5fea096c34b5c336dcc327cfcc17cfda4e6cd3e0ab5a814e63d45c` |

**Assets:** 36 SVGs, generated from those modules by `design/tools/board-v2-assets.mjs`. They are 12 ward drawings, 17 lighting drawings and 7 ATTACK BLOCKED effects. Ship them in the common bundle, never fetched on demand ([attack-blocked.md](attack-blocked.md), section 5, rule 8). The 29 ward and lighting SVGs, `hospital-ward.mjs` and `lighting.mjs` are the 31 accepted candidates, byte for byte.

**What the modules import:** 13 board-motion sources, all byte-identical to the integration baseline `abb6839`. Nothing in section 3 imports a controller, a fixture or a tool.

To check every file, run `sha256sum -c` on this block from the repository root at `ebf0263`:

```
cf329360c86b512d83a9ab4a2df5a7147ba30d7e716c82a7ffa27c5308dadbc1  design/board-v2/scenes/slots.mjs
d6af092a86322a81cc941bc41aade276063b5ba209a18a402a1c5195096dc2be  design/board-v2/scenes/hospital-ward.mjs
ed8ce0def1b0c0b965a6b59a52c91c60a0184c5ad86f042eda63108cc70968ad  design/board-v2/scenes/lighting.mjs
637d98955361d11e067d326e4ac0a95177334c77661bc9d177edf801ad7d0be6  design/board-v2/js/fit.mjs
361c57acf83e12952fe964cd9567816623e658b36eb1413c68047da51520ef88  design/board-v2/films/blackout.mjs
984cf4a53e1dfbc3984d4caabe9fa6631621824ab624e8de8502d7c13ff21b24  design/board-v2/films/blocked.mjs
6408b5229172f157086236ec4463e73c9e0ab3aa6755d968ff2552707fd3ef0a  design/board-v2/fx/blocked.mjs
86acb6f2de5fea096c34b5c336dcc327cfcc17cfda4e6cd3e0ab5a814e63d45c  design/board-v2/fx/label-box.mjs
495367131022102d948829e8510add0a934fbe9402de5afefdd2f9ed23c0fb72  design/board-v2/assets/fx/fx-block-particles-1.svg
7b98b6d31a858b83427b1bc811315accff82bac96b032fc82f7d9c6a765eb180  design/board-v2/assets/fx/fx-block-particles-2.svg
e7d06d2afd9e6f974ee0b90620c070c185e2d2cd73dcdc312513c23876c08ad7  design/board-v2/assets/fx/fx-block-particles-3.svg
9cd561a8bc28ba5f5ca8441d70a15de2a9bdcb1cf7ba619872555bca45facc4f  design/board-v2/assets/fx/fx-block-ring.svg
5a2953714b267417aacc38703502f14f8e063b065e3caa0570d90b7943ce6835  design/board-v2/assets/fx/fx-shield-1.svg
87036cc95529618901f1c0d524b8794eb9938d4b2f7b12a688a28dc8c9a864c9  design/board-v2/assets/fx/fx-shield-2.svg
feb871f35592db45d452fae1ae367ae7ba8ecd3ae38eb653db49ec0d9c47367d  design/board-v2/assets/fx/fx-shield-3.svg
bdea7e82684acf648d0bb07e5b1e1b448ad1a3f2ad898d32d372f05fd37ef062  design/board-v2/assets/lighting/command-room.dark.svg
a7c8c39268fa60ff0b17a365320a2debe2b3d148851d5e2fae2722aa395256b2  design/board-v2/assets/lighting/fx-bolt.svg
89cd1c3e8a369dc469482fcc932b921cbd30c1064c7c4caf3a61b8554bdaa6d7  design/board-v2/assets/lighting/fx-impact-1.svg
270f1524b75e8e0766e6cc77fbd279788cccb25c0f8520d9be06845506144cdc  design/board-v2/assets/lighting/fx-impact-2.svg
13ae42ec493b63447589ea0408e1168597dbd44cb127aea17264025fe6228f6d  design/board-v2/assets/lighting/fx-impact-3.svg
2a9c2ed545716e798b382b0e214b1234958f1a6771203225ddd156cf01cff7cd  design/board-v2/assets/lighting/fx-spark-1.svg
e8abe0f10b6c78cbfb1bc65853192a2c9a7280ff34d292610e0b29fc2b0aa90a  design/board-v2/assets/lighting/fx-spark-2.svg
3a3fdc53881a1b295cbac96e026e06eff9e5c4d6d3e98e97ca588936ede83fb8  design/board-v2/assets/lighting/fx-spark-3.svg
b0a97110562e43dab092255659dbffd5e53eaa3135935075ca046abd7fe33116  design/board-v2/assets/lighting/hospital-ward-7.dark.svg
8b9c0993b717b5efde745929842d2e26e2a1e8acdcd1182656260e22aa06c536  design/board-v2/assets/lighting/hospital-ward-8.dark.svg
11400d87f23638f9dc6f17be5ce2d18205b2caf2ac2633cda437d682775efdd0  design/board-v2/assets/lighting/hospital-ward-9.dark.svg
c0978c8e1cd1678c19a412ea295af7fd8ac2f8bff56839af0bb286ee0cfae638  design/board-v2/assets/lighting/jail.dark.svg
750be4f6199f6d477bd80051ca5e829211be3f8750c3e1cfa56a90f9943137c2  design/board-v2/assets/lighting/marker-chosen.svg
7f9038db74409b6893da8eb9d61190cf6a956f6d398d4cf1fe760c2baf7f131e  design/board-v2/assets/lighting/marker-dark.svg
be484a8351be652a96c0403754bd44288347a1c723ff19581b8671f4c8d11364  design/board-v2/assets/lighting/marker-preview.svg
8988d6b617a4295ad14a25b562987774d4a64722a41a47cb7960c5ef8c54efc3  design/board-v2/assets/lighting/room-a.dark.svg
b8676a47b4604e87c6db02b97a9805221b19591b9babd268ccb2f8fd3fbf1b2b  design/board-v2/assets/lighting/room-b.dark.svg
3f9e999efcbebba17e7e3a46b88d092e95e205119d6d890444330f8c73635ba0  design/board-v2/assets/scenes/hospital-ward-7.back.svg
15e5e55131239536eb299bca6bc5f567d0bbf3a55f39e0b9b7f94648d429aff9  design/board-v2/assets/scenes/hospital-ward-8.back.svg
f002edcfce36d781a625fc9022d8f0d3d6b1359f8e443ff67f6b493c2702412c  design/board-v2/assets/scenes/hospital-ward-9.back.svg
23c9988d68f05d9702d0e8fc945f56073015e223f72471efcfd829c8673431d8  design/board-v2/assets/scenes/hospital-ward.berth-h1.svg
341fe66aa6608e91637a88006f2e15fd106abcc96c7db01ebe1b2a729113116c  design/board-v2/assets/scenes/hospital-ward.berth-h2.svg
bd2e530a98d7e18da00606a9b9ae8269a3369ea5bbfad365309b3428c147373b  design/board-v2/assets/scenes/hospital-ward.berth-h3.svg
9a3519b8eb884ad6abfe54272b6a1db69f4057a9b6304c73c1940bd690eb76e6  design/board-v2/assets/scenes/hospital-ward.berth-h4.svg
305bfcc0c80207d865ee91b6672d2556e1b8e3813ace980709f1d99d769787e4  design/board-v2/assets/scenes/hospital-ward.berth-h5.svg
5afe0564a747cf3f554e9e9a4e16ed5a80e9e318c2c939474f3a9d0a330bb062  design/board-v2/assets/scenes/hospital-ward.berth-h6.svg
e65c112c430603629637659110746e9fdf9794db0fa999aae7b000c3401e436b  design/board-v2/assets/scenes/hospital-ward.berth-h7.svg
54499879b2f5784655457355233ac5c3b50ffe5d316522012c7dc2d06e5696dc  design/board-v2/assets/scenes/hospital-ward.berth-h8.svg
de09d58d584d75af34240099059cb043f94096c62c5df8074173b0cd2120ea38  design/board-v2/assets/scenes/hospital-ward.berth-h9.svg
9d081fc4926d07dd1d56e90bd5452ed05052a806f2d33212a1b76c8e107fc958  design/board-motion/figures/body.mjs
bb65a81f52013fc71966ae813d2d7929e871ed9b837c2f2c1cab9093135cb171  design/board-motion/figures/crew.mjs
626e0b74fba44d055f0ea79777f4be475fd3998b9bff184ce8ff92b6770fe7c4  design/board-motion/figures/gestures.mjs
7c3d34f0b35856ad9287f32d525a612cc40b37feb3e6d26344b9b7de794c2a7e  design/board-motion/figures/parts.mjs
b7fd681bb392f0104785fda3c838a2ca2d749c04278e05c8bbec5bb6379da45c  design/board-motion/figures/rig.mjs
f7be9a9001153b4a2803910a9eacdd4ef2de677da0f7dd600f36701497a357de  design/board-motion/scenes/command-room.mjs
aa2a9531f8badd28bbe6e03e956b5cb93411ef876c48c509929833fcdd5648c0  design/board-motion/scenes/frame.mjs
55e56114ccc150ca8048f2851d9168b7bdbe6f7c79575e5273ae8d8cbc972fa9  design/board-motion/scenes/hospital.mjs
5e042aa605336b16e9bf139169cb277497ba4f0be1077f7c1bfbbba54efdb109  design/board-motion/scenes/index.mjs
c2eed83374299fb205683244d50873b3a0029308c45c4505cd1dc998b401eef4  design/board-motion/scenes/jail.mjs
9e9489bfddaa37ccac06b049934e097b068cae54539a455c151a66935055c14b  design/board-motion/scenes/kit.mjs
d3729374ce23a60d14bd4d24ab3abc93a63cedc906e200d6a5b44f24b43c75bd  design/board-motion/scenes/room-a.mjs
74eaec045c0915ab983daac8967005f91137760b6646366c6738f08c9674a084  design/board-motion/scenes/room-b.mjs
```

**Evidence, not for import:** the proposal's own generated contract and manifest. They are records for review, not a runtime manifest; Integration writes the runtime's. The controller's hash is recorded so the exclusion can be checked.

```
ab687508df829b33e13e5b98243615794e14e0ff3b57e793ce6e6f335f1f4785  design/board-v2/contract/slots.json
cc22bc167b6e4380d8cf952bc8b8b01d241d03409a919081d3d6c3f7af52b551  design/board-v2/contract/films.json
c2984de7d98b3d224c4c513a47bbfe2229ccb34cb8a6f9580347ddff91620414  design/board-v2/assets/manifest.json
bad7cc3ec58c5147256cfb91edf47708330a8449b259b900895d14af453576df  design/board-v2/js/blocked-view.mjs
```

## 4. The exports that changed

These are the changes since the heads Integration reviewed on 13 October (#128 `e970eaa`, #129 `1995d58`) and on 14 October (#130 `84ddef4`).

| Module | Change | Why |
| --- | --- | --- |
| `scenes/slots.mjs` | `entrySlot()` is removed; the module allocates nothing. `SLOT_TABLE_VERSION` (`board-v2-0.1.1`) is added. The geometry, the numbering and `SLOTS_VERSION` (`board-v2-0.1.0`) are unchanged | Finding 3: Backend allocates, lowest free first |
| `js/fit.mjs` | `fitBoardV2(viewport, roster, { insets, shell })` replaces `fitBoardV2(viewport, roster, shellSpec)`. `boardRects()` and `passClearance()` take the same options as a third argument. `insetsOf`, `MIN_BOARD_WIDTH` (320) and `FALLBACKS` (`narrow`, `too-short`, `too-narrow`) are added. The result adds `fallback` and the board's box (`boardLeft`, `boardTop`, `boardWidth`) | Finding 4 |
| `films/blackout.mjs` | `board-v2-films-0.2.0` (was 0.1.0). `BLACKOUT.lightsOut`, `BLACKOUT.stripFadeMs` and `BLACKOUT.reduced.darkAt` are removed. `blackoutFrame()` returns `line`, a boolean, where it returned `strip`, an opacity. The contract's `audience.strip` is now `audience.line`, and `audience.blocks` is added | Findings 1 and 2; S4 |
| `fx/label-box.mjs` | New: `labelBox()` and `LABEL_MARGIN`, moved unchanged from `js/blocked-view.mjs` | P3: the pure helper separated from the controller |
| `films/blocked.mjs`, `fx/blocked.mjs`, `scenes/hospital-ward.mjs`, `scenes/lighting.mjs` | Unchanged | |
| `js/blocked-view.mjs` (not to port) | `labelBox` and `LABEL_MARGIN` are removed and `blockedTargets()` is added. `mountBlockedPage()` no longer takes `drawFigure` | P3; review page only |

## 5. The layout and timing a client keeps

### Layout ([board-v2-slots.md](board-v2-slots.md), sections 4 and 5)

1. **The shell comes from `fitBoardV2(viewport, roster, { insets })`.** The usable height is the viewport less its safe-area insets.
   - It is the largest shell that fits, never larger than the phone kit's for that height: compact up to 600 px, short up to 640 px, tall above. Their top bars are 36, 44 and 52 px and their navigation 48, 56 and 64 px.
   - Where no shell fits the width, the board is a narrower centred column (`narrow`).
   - Where nothing fits, there is no board but a message (`too-short`, or `too-narrow`).
   - Never draw `fits: false` as a board, never scroll the board and never shrink a target. Measure again on resize, rotation and when the browser's bars show or hide.
2. **Every press area is at least 44 px**, apart from every other one and clear of the raised Pass, at every size from 320 × 568. Nothing covers a press area. Captions sit clear of every press area, the line is in the top bar, and S4's film is drawn beneath the press areas, which are its layer L6.
3. **Draw the stored `slotId`.** Never compute a slot, and never reflow a room when someone arrives or leaves.
4. **The top bar never changes height during a match.** The Blackout's line is its second row, the same box on every screen. If enlarged text needs a taller bar, choose the height once, before the match.

### S1: the Blackout ([blackout-window.md](blackout-window.md), sections 1, 3 and 5)

Time is in ms from the window's opening (`previewEndsAt − 5 000`), taken from the trusted `previewEndsAt` and `endsAt` and never from a local start. R is the round's publication.

| When | Full motion | Reduced motion |
| --- | --- | --- |
| 0 to 300 | Numbered markers fade in at every slot | Markers in over 80 ms |
| to 5 000 | The lit preview; inside it, a flicker from 4 200 (two dips, one spark per room). People stay on the page | The lit preview; no flicker or sparks |
| `previewEndsAt` exactly (5 000) | Every room cuts to dark. Every figure, name tag and name leaves the page and the accessibility tree. The selection opens in the same instant | The same cut, with a still bolt in each caption |
| `[previewEndsAt, endsAt)`, 5 000 to 15 000 | Static dark; the eligible Disabler selects in their bound room only | The same |
| `endsAt` to R | Dark until the outcome, for at most 1 500 ms (`holdCapMs`, a presentation proposal) | The same |
| R to R + 320 | At each authorized hit: the flash, the star and its rays; the hit room's art shakes 3 px for 160 ms. Nothing at a miss | A still burst on each hit position for 600 ms |
| R + 120 to R + 520 | The lights come back together. Everyone is drawn in their published state and place: a hit patient in the Hospital, at the stored slot, in the gown | One 80 ms fade back from R |
| R + 520 to R + 900 | Markers fade out | Markers out over 80 ms from R + 520 |

The line, the top bar's second row, shows from 0 until the lights start back: to R + 120, or to R with reduced motion. With no outcome by the cap it shows to `endsAt` + 1 620, or `endsAt` + 1 500 with reduced motion. There are at most three flashes a second, and none covers more than a quarter of a panel.

### S4: ATTACK BLOCKED ([attack-blocked.md](attack-blocked.md), sections 1, 3 and 5)

Time is in ms from the room fact's checkpoint. The film plays live only. With full motion it ends at 2 420 (`blockedEnd()`):

| When | Full motion |
| --- | --- |
| 0 to 120 | A source-free star at the target's press point, as a hit's |
| 120 to 360 | The shield flashes on and blooms from 0.8 to 1.05 of its size; the figure's art braces 2 px |
| 360 to 620 | The ring expands; eight particles scatter; the shield is spent |
| 620 to 2 420 | ATTACK BLOCKED: it pops in over 120 ms, is held for 1 600 ms and fades over 200 ms. The figure is home by 900 |

**With reduced motion** there is only a still ring and the label: in over 80 ms from 0, held for 1 600 ms, out over 80 ms, ending at 1 760 (`blockedEnd({ reduced: true })`). There is no star, bloom, brace or particle.

- **In the Blackout** the film starts at `blockedStartInBlackout(R)`: R + 520, or R + 80 with reduced motion, once the lights are fully back. Every other screen draws a miss.
- **Every defense gets the same film.** Several blocks at one checkpoint play together, each on its own target.
- **The target stays where the authoritative state has it**, in its health and clothes. An Injured target is a patient in the Hospital, in the gown. The film changes no health, name tag, slot, room or press area.
- **The label** is placed by `labelBox()` from its laid-out size, 2 px inside the panel and never over the caption: above the press area, else below the name tag.
- **Only the room fact's recipients see it:** the occupants authorized at the checkpoint, the target included (G-04). The display, the host and everyone outside the room get nothing: no node, class, word, banner, count or sound. Every screen has a polite live region for room facts. Only the recipients' screens fill it, with "Attack blocked on <name>." (for the example, "Attack blocked on Rigel.").

## 6. Receipts once the lighting line ends

**Command receipts that are still unknown move to the connected client's private recovery UI after the lighting line ends.** Suppose a Disabler sent a position and has had no answer when the line ends (R + 120, or R with reduced motion). It stays "Position 2 sent. Waiting for the answer." in that Disabler's private action panel until one of two things says registered or not registered: the server's answer, or a receipt recovered with the same command id. It never goes on the public line. There is never a second command id or a resend, and the deadline alone never says "not registered". The lighting window does not stretch or come back for it. This is section 5, rule 6 of [blackout-window.md](blackout-window.md). It needs a connected client's tests; the review page cannot show it.

## 7. Tests a client must repeat

The review page is not a client. Its tools check these cases on its own markup, in desktop Chromium and without a server. They cannot check a reconnect, a host's screen or the private recovery UI. A client needs every case in its own tests, on its own markup, against Backend's contracts or an agreed fake of them.

**S1, the Blackout:**

1. **Boundaries** at 4 999, 5 000, 5 100, 14 999 and 15 000 ms, in both motion modes. People and names are on the page and in the accessibility tree only before 5 000. A real press chooses only in `[5 000, 15 000)`.
2. **Real-pointer hit testing**, not just checking that a button exists. Press the centre and four inner corners of every position's press area, in every room a Disabler can be bound to (C1 included), at 320 × 568 and 390 × 844. Press every slot of every room at every shell boundary, with and without safe-area insets.
3. **Receipts:**
   - a late answer
   - a lost answer recovered with the same id
   - a lost answer never recovered, carried into the private recovery UI once the line ends
   - a rejection
   - a choice never sent

   Each case keeps one command and one id throughout.
4. **Equal screens:**
   - a missed strike and no strike
   - a blocked strike and a miss, on every screen outside the room
   - a Blue Disabler and a Red one
   - the display and a player
   - the top bar's box on every screen
5. **The settled board:** every seat at its stored slot, the hit patients in the Hospital in the gown, and nobody else moved.

**S4, ATTACK BLOCKED:**

6. **Recipients only.** An outsider's screen, the display and the host's are identical with the block and without it, with no live-region text. Compare the whole page's markup, and its pixels too where the client can.
7. **Clone and Protection** give identical output at every moment, in full and reduced motion.
8. **The target is unchanged.** Its identity, health, slot, room, name tag and clothes are the same before, during and after the film. This includes an already-Injured target, a patient in the Hospital in the gown. Nothing the film added is left after 2 420 ms (1 760 with reduced motion).
9. **Reduced motion** draws the still ring and the label only: no star, bloom, brace or particles.
10. **No replay.** A reconnect, a late join, a duplicate or a stale checkpoint never plays the film. It plays only from a fresh view of the current checkpoint.
11. **In the Blackout**, the film starts at R + 520 (R + 80 with reduced motion), after the lights are fully back, and public screens draw a miss.
12. **The label** is inside its panel and off its caption, for every slot of every room. The review page measures this at 320 × 568, 360 × 740, 390 × 844 and 430 × 932, with 7, 8 and 9 players.

## 8. Not to port

These files must not be copied into the runtime:

- `design/board-v2/js/page.js`, `index.html`, `css/page.css` and `contact.html`: the review page.
- `design/board-v2/js/blackout-view.mjs`, and **the whole of** `design/board-v2/js/blocked-view.mjs` (`mountBlocked()`, `roomLive()`, `blockedTargets()` and `mountBlockedPage()` included): the review page's controllers. Their sends are a counter, `&play=1` runs them from a local clock, and they take their targets from a fixture.
- `design/board-v2/js/fixtures.mjs`: synthetic boards, for tests and review only.
- `design/board-v2/review/` and `design/tools/board-v2-*`: captures, generators and checks, kept as evidence.
- `design/board-v2/contract/*.json` and `assets/manifest.json`: the proposal's evidence (section 3).

A client draws Backend's state and events and derives nothing from these files. It never derives an event from a difference between snapshots, an animation timer or a receipt.

## 9. What stays Backend's and Integration's

- **Backend:**
  - the stored `slotId` and its lowest-free allocation
  - the starting roster and the Hospital's capacity
  - the public window `{windowId, previewEndsAt, endsAt}` every normal round
  - the eligible Disabler's binding, the selection command with a stable id, its receipt, and the receipt's recovery by command id
  - the sanitized batch with each hit's `slotId` and its checkpoint, two accepted attacks kept as two
  - a room fact for each block, for example `ATTACK_BLOCKED {checkpointId, seatId}`, sent to the occupants authorized at the checkpoint (G-04); the name is a proposal
  - suppressing stale events and replays on reconnect
- **Backend and Frontend together:** the 1.5 s hold for a late outcome is a presentation proposal. It needs an agreed publication checkpoint and stale-event handling. It is not a game phase and never extends the selection.
- **Integration:**
  - the separate, versioned exact-file review and port of section 3's files, with pins, manifest and the source checker's provenance
  - the capacity gate's child time limit (`scripts/test-capacity.mjs`)
- **The owner and Frontend:**
  - phones whose usable height is under 568 px get the `too-short` message, not a board
  - the owner's visual acceptance and real-device checks, which are separate from source integrity
