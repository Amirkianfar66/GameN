# Board v2: the Hospital's medical films (storyboards S9, S5 and S10)

**A proposal from the Visual and Motion Designer, 18 October 2026.** It is the first slice of the Integration owner's completion request of 14 October 2026 on #144: a patient's critical state on the berth (S9), the medical drone and the emergency revival (S5), and the deterioration, flatline and life-support shutdown (S10). It follows the Designer's review of the owner's motion specification of 13 October 2026 (storyboards S9, S5 and S10 of [motion-review-2026-10-13.md](motion-review-2026-10-13.md)), on #128's ward.

Nothing here is a rule, a server contract or an adopted asset:

- **Rules:** who is Injured, when a patient dies, who may be rescued and where a patient lies are Backend's. The films draw the server's facts and outcomes; they decide none of them. No local countdown, timer or animation kills a patient or shortens a rescue opportunity.
- **Adoption:** each new file needs Integration's approval by name and hash (section 9).
- **The owner's request of 18 October 2026 for a 4-bed ward** is open: Balance and Backend confirm the real maximum occupancy first ([Amirkianfar66/GameN#155](https://github.com/Amirkianfar66/GameN/issues/155)). Until it is settled the films play on #128's ward (one berth per seat), as the owner chose. Their logic carries over to a smaller ward unchanged: the berth geometry, tags, inset, drone fit and anchors are functions of a berth and a panel.
- **Checked against the specification packet** (`GameN-owner-specification-agent-handoff-2026-10-13-v2.txt`, SHA-256 `b5b4ba2d…1b590743`, preserved in [evidence/owner-motion-spec-2026-10-13/](evidence/owner-motion-spec-2026-10-13/PROVENANCE.md)): G-05, G-07, Q-H03a, Q-H04, the rules contracts' Hospital and outcome rows, the motion requirements' Hospital scenes and storyboard sections 5, 9 and 10.

| | |
| --- | --- |
| Branch | `claude/designer-hospital-films`, stacked on #144 (`claude/designer-private-capsule`) at `95d70f0`, itself on #130, #129, #128, #127 and the integration baseline `abb6839` |
| Why stacked | The films draw on #128's ward and slots, #130's label rule and faction-accent measure, and #144's layout and deliverables index |
| Toolchain | Node 22.21.1, npm 10.9.4, headless Chromium 141 |
| New files | `design/board-v2/fx/medical.mjs`, `design/board-v2/films/medical.mjs`, `design/board-v2/js/medical-fixtures.mjs`, `design/board-v2/js/medical-view.mjs`, 28 files under `design/board-v2/assets/medical/`, `packages/design-tokens/test/medical.test.mjs`, this page |
| Changed | The review page (`js/page.js`, `css/page.css`, `contact.html`), the asset tool, the capture tool, the static check, `contract/films.json` and the manifest (now `board-v2-0.5.0`). No earlier film, scene, figure or layout module changes. Nothing outside `design/board-v2/`, `design/tools/board-v2-*`, `packages/design-tokens/test/` and `docs/design/` |

## 1. The three films

All three are public: every phone and the display draw the same, from the public snapshot and the public outcome event. None reads an attacker, a healer, whoever registered a Rescue, a role, a side, a cause or a receipt.

### S9: the critical state

What a berth shows while the snapshot says its occupant is Injured. It is a state, not an event: it is drawn from the seat's facts on every screen, on a reconnect too.

| Part | What it shows | From |
| --- | --- | --- |
| The berth's monitor | The unstable trace: uneven beats, one dropped | `health: Injured` |
| The status lamp | Red while the due round is in progress, amber otherwise, pulsing slowly (2 s) | `medical.rescueOpportunity` |
| The rescue tag on the berth's plate | "R3" (the server's `rescueDueAfterRound`), cyan while a later normal round is to come, amber in the due round; a struck grey cross with no round when no Rescue round is left (a new injury in round 5 or the showdown); nothing when the match is closed | `medical.rescueOpportunity`, `medical.rescueDueAfterRound` |
| The detention tag | A neutral slate wristband beside the rescue tag; the patient keeps the gown (G-05) | `jailed` |
| The patient | The gown and the injured pose, as #128 draws them; a 0.6 px breath on the figure's art only | — |
| A body | The monitor and lamp off, the bed light down; no tag | `health: Eliminated` |

The round is the server's. Nothing counts down. The loops (the lamp, the breath) repeat every 12 s at most and encode nothing. On admission (the INJURY outcome, live only) the authorized transfer is drawn at the seat's own berth: the patient arrives in the berth (fading in over 240 ms) as the monitor boots, then the lamp comes on and the tag pops in by 360 ms. Reduced motion: the same states, still, the patient and the berth's state faded in over 80 ms on admission.

### S5: the medical drone and the emergency revival

Played for a `MEDICAL_OUTCOME` of kind HEALED (alone, or after INJURY in the same batch), live only: never on a reconnect or for an expired event. 5 600 ms.

| Beat | ms | What happens |
| --- | --- | --- |
| Alert | 0–800 | The berth's lamp blinks amber twice; the vitals inset opens on the unstable trace |
| Arrive | 800–1 800 | The drone leaves the Hospital's ceiling dock and comes down over the bed, arms tucked, hovering (it bobs 1.5 units) |
| Unfold | 1 800–2 200 | Its three arms unfold over the bed |
| Scan | 2 200–3 100 | A scan line goes down the patient and back under a faint diagnostic hologram |
| Charge | 3 100–3 500 | The probes and the lens charge |
| Pulse | 3 500–3 700 | One controlled revival pulse at the chest; the patient's art jolts 2.5 px |
| Recover | 3 700–4 700 | The trace steadies, the lamp calms (cyan), the patient sits up: Injured to Healthy, in the gown, a detained patient's tag kept |
| Depart | 4 700–5 600 | Arms tucked, the drone goes back up to its dock; the inset closes. The board then shows the snapshot: the patient in their room, or in the Jail if detained |

The drone always comes from the Hospital's own ceiling dock (the ward's, at 512, 45 in its scene) and goes back to it: it never comes from anyone's room or points to anyone. An Eliminated patient is never revived: the film plays only for a HEALED outcome. Reduced motion: no travel, flash or jolt; the drone still over the bed and the inset fade in over 80 ms; at 800 ms the trace steadies, the lamp calms and the patient sits up; out over 80 ms (1 760 ms).

### S10: the flatline and the life-support shutdown

Played for a `MEDICAL_OUTCOME` of kind DEATH, whatever caused it (the server's deadline, or a second damage), live only. It plays after the authorized outcome and never causes it. 4 200 ms.

| Beat | ms | What happens |
| --- | --- | --- |
| Fail | 0–1 600 | The inset opens: the heartbeat slows and thins; the lamp pulses red once a second; the patient's breath (the critical state's 0.6 px) fades until it lies still |
| Flat | 1 600–2 400 | The trace goes flat; the lamp holds red; the Hospital's light dips to 0.72 of its brightness (its art alone, never its press areas, tags or caption), never dark |
| Shutdown | 2 400–3 400 | The trace collapses to a dot, the lamp and the bed light go out; the patient lies still (Eliminated) |
| Settle | 3 400–4 200 | The room's light returns; the inset closes. The body stays where the snapshot has it, its equipment off |

Reduced motion: no dip or pulse; the inset with the flat trace and the patient still fade in over 80 ms; at 800 ms the screen and the lamp go off; out over 80 ms (1 760 ms).

### Every film

- **Nonblocking and cancelable.** The board, the timer and the navigation stay usable: every slot's target stays live above every part of a film (the capture presses each one meanwhile). A film stops at once when a newer snapshot moves its subject or another seat into its berth, or when the Blackout's window (S1) owns the board, and the board shows the latest snapshot.
- **Words.** None of the film's own. The client says the authoritative outcome once, in its own words: today the hosted board says "Player 2: Healed." and "Player 2: Eliminated." on receipt (#154, `apps/game/hosted/board-v2-host.mjs`, `paintOutcomes()`). A frame's `announce` marks the beat at which the picture shows the change (the recovery at 3 700 ms, the flatline at 1 600 ms), for a client that times its words to the film as it does ATTACK BLOCKED's. The review page puts the hosted board's words in its live region at that beat.
- **Several outcomes in one batch** play at once, each at its own berth; each inset keeps clear of the insets placed before it, in the batch's event order. The review page pictures one film at a time.

## 2. The inputs, from Backend's drafts

**No new field is needed.** The films read Backend's drafts, neither merged: 1.7 (#142, #143) and 1.8 ([Amirkianfar66/GameN#146](https://github.com/Amirkianfar66/GameN/pull/146), head `d66515706…`). The review page's inputs are synthetic and labelled so (`js/medical-fixtures.mjs`); its two copies of server rules (the rescue indicator and the clinical anchors) are for the review page only.

| The films' input | From |
| --- | --- |
| A patient's place | The seat's `location` (Hospital) and `slotId` (`H1`…), 1.7 |
| Its condition | `health` (Injured, Eliminated), 1.7 |
| The rescue tag | `medical: { admittedRound, rescueDueAfterRound, rescueOpportunity }`, non-null exactly while Injured, 1.7 |
| The detention tag | `jailed`, 1.7 |
| Which film | `MEDICAL_OUTCOME.kind`: INJURY (the critical state's entry), HEALED (S5), DEATH (S10), 1.8 |
| Whose | `MEDICAL_OUTCOME.seatId`, with the character, clothes and detention from the snapshot published with it |
| Where | `presentationAnchor: { kind: 'CLINICAL_VIGNETTE', anchorId: 'HV1'…'HV9', slotCount }`: anchor `HVn` names berth `Hn`'s geometry, for the match's roster (`clinicalBerth()`) |
| `t` | Milliseconds from the outcome's presentation start (`publishedAt`); live only, while the event is fresh |

**Where a film may play.** An anchor is a presentation place, and Backend's placement is exact even where a subject's slot differs from its anchor (#146's `captain-outcomes-implementation.md`). So a patient admitted in the same batch can hold the berth the subject left: Rigel is healed and leaves H1, and Lyra, injured in the same batch, is placed at H1. Rigel's anchor is HV1, but H1 is Lyra's now. #146 says "a dedicated vignette cannot cover active real-board targets". So `filmBerth()` draws no film where another seat holds the anchor's berth in the snapshot, and the outcome's words stand alone (the review page's `&outcome=rescue-taken`).

## 3. Where things go: anchors and layers

All placement is pure geometry in `fx/medical.mjs`, from a berth, the Hospital's panel and the boxes to keep clear, so a client can port it without the review page's controller.

| Rule | Function | What it keeps |
| --- | --- | --- |
| A berth's furniture | `berthKit(id)` | The monitor, lamp, plate, bed light and bed where the ward draws them, in scene units (the static check holds them to the ward's own SVG); `chest`, the berth's press point; `hover`, the drone's lens with its probes on the chest |
| The tags | `tagBox()` | On the berth's plate (`slotRects()` badge), whole in the panel, never in the band at the panel's top where the caption is (on a phone the upper berths' plates are in it, so their tags go just below it), and never over a name tag (just below the one it would meet) |
| The vitals inset | `insetBox()` | Above the berth's press area; else below its name tag; else in the band beside the caption, as large as the band allows (40 px wide at least). Never over the caption, the berth's own press area or a press area another seat holds (a living one may be a target; a body is never hidden either); else no inset, and the berth's monitor shows the trace alone |
| The drone | `droneFit()` | Drawn smaller (to half its size at least) where the caption or another seat's press area is above the berth, its bob included, so that it covers neither; its probes stay on the chest (`hoverAt()`) |
| The pulse | `PULSE_FLASH_RADIUS` | Its white-hot core, the only part bright enough to count as a flash, under a quarter of the panel at every phone |
| The subject | — | At its own berth, the snapshot's figure is hidden while the film draws it there. Elsewhere the snapshot's figure is marked away (grey) and its name tag is carried to the berth for the film. It is never drawn in two places |

**Layers in the Hospital's panel**, bottom to top. In the room's art (dimmed with it in S10): the scene's back layer; the bed light (z 2); a berth's screen and lamp (z 3); the patients by depth, each berth's front layer over its own patient. Over the art: the name tags (3500), the medical tags (3555), the inset (3640), the scan line (3645), the hologram (3646), the drone (3660), the pulse (3665). Above them all: the slots' targets (4200) and the caption (5000). Clip everything to the panel.

**On a phone the upper berths' bezels are under the caption's band.** H7's and H8's monitor and lamp sit under the "HOSPITAL" caption at every phone, so their critical state shows by the tag (below the band), the figure and, in a film, the inset. The owner's 4-bed request (#155) would remove the upper row.

## 4. Audiences

Public: every phone and the display draw the same from the public snapshot and the public outcome events. The capture compares the display's page with a player's (section 8). Nothing is private, and no screen draws more than another.

## 5. For Frontend

Frontend has reviewed none of this. Please review the placement rules and the beats before anything is ported.

**Rules the review page keeps, which a client must keep too:**

1. Draw a berth's state from the seat's public facts alone, on every snapshot (a reconnect included). The round on the tag is the server's `rescueDueAfterRound`; never count down to anything.
2. Play S5 and S10 for live, fresh MEDICAL_OUTCOME events only, from their presentation start, over the snapshot published with them. Never on a reconnect, never for an expired event; never replay.
3. Play a film at its anchor's berth only when `filmBerth()` says it can; otherwise say the outcome and draw nothing.
4. Keep every slot's target live and on top while a film plays; nothing a film draws is pressable.
5. Draw the subject once: hidden at its own berth, or marked away where the snapshot has it with its name tag carried to the berth.
6. Place tags, the inset and the drone by `tagBox()`, `insetBox()` and `droneFit()`, with the caption's box and the name tags' and press areas' boxes as the review page measures them (`js/medical-view.mjs`, `placeTag()` and `mountClinicalFilm()`).
7. Stop a film at once when a newer snapshot moves its subject or another seat into its berth, or when the Blackout's window opens.
8. Say the outcome once, in the client's words; time it to `announce` if the client times its words to the film.
9. Ship the 28 SVGs in the common bundle, never fetched on demand.

**Not to port:** `design/board-v2/js/medical-view.mjs`, `medical-fixtures.mjs`, `page.js` and `fixtures.mjs`. They are a review page's controller and synthetic fixtures. Its `&play=1` runs a film from a local clock for review only.

**Review page options** (`design/board-v2/index.html?roster=9&film=…`):

| Option | What it shows |
| --- | --- |
| `&film=critical` | The critical state on the mixed board's patients: Rigel (H1, since round 2), Mira (H2, detained, since round 3) and a body at H4 |
| `&fixture=ward` | With `film=critical`: every seat Injured, a tag at every berth |
| `&round=3\|5` | The match's round; 5 makes every patient a new round-5 injury, with no Rescue round left |
| `&entry=<seat>` | That patient's admission entry, at `&t=` |
| `&film=rescue\|flatline` | One outcome's film over the snapshot published with it |
| `&outcome=` | `rescue`, `rescue-detained` (8 or 9 players), `vignette` (injured and healed in one batch), `death`, `rescue-taken` (no film: another seat holds the berth), `rescue-ward` and `rescue-upper` (the full ward) |
| `&t=` | ms from the outcome's presentation start (default 2 600; 2 000 for the flatline) |
| `&play=1` | Plays from a local clock (review only) |
| `&motion=reduced` | The reduced-motion variant |

## 6. For Backend

**No new field is needed.** Two questions:

1. **The anchor held by a same-batch admission** (section 2). Please confirm that a clinical anchor's berth can be another seat's slot in the published snapshot, as #146's text implies. The films then draw nothing there, and the outcome's words stand alone.
2. **The owner's 4-bed request** ([#155](https://github.com/Amirkianfar66/GameN/issues/155)): what a 4-bed Hospital would need in the slot and anchor contracts, once Balance has confirmed the maximum occupancy.

## 7. For Integration

1. **Approval by name and hash** of the two modules (`fx/medical.mjs`, `films/medical.mjs`) and the 28 SVGs (section 9). The medical palette's eleven colors are 35 or more (CIE76) from every faction accent of `tokens-0.4.0` (the manifest lists each distance).
2. **The films' contracts** are in `contract/films.json` (entries 4 to 6: `hospital-critical`, `medical-rescue`, `medical-flatline`), as proposals.
3. **The owner's 4-bed request** (#155) belongs in the decision register once settled.
4. **No playable build** until 1.7 and 1.8 are adopted and Frontend has implemented the films against them. This page is not evidence that a film is implemented or deployed.

## 8. Verification

These were run on this branch in this container. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **12 / 12.** #144's eleven and the medical films' own. The furniture checks: each berth kit's monitor, plate and lamp are the ward's own SVG elements at 7, 8 and 9 players (to the ward's 0.1-unit rounding), each plate is the slot's badge anchor, each chest is its press point, and the dock is the ward's. The rescue tag holds for every value of the server's indicator, and inconsistent values are refused. The films are checked every 10 ms, in both motion modes: their lengths (the rescue between 5 and 6 s); nothing drawn outside them; the words never withdrawn once said; no input but the moment, the berth, the fit and the setting (a healer, an attacker, a role, a side or a cause changes nothing); no motion in the reduced variants; the room never darker than 0.72; the patient still once the heart has failed; no movement over 2.5 px. The admission brings the patient in as the monitor boots. The drone comes from the dock and goes back to it at every berth, its probes on the chest at every fit. At the 8 phone sizes, 3 rosters and every berth, the ward full and empty: every tag stays in the panel, below the caption's band and off every name tag; every inset (361 placed, 161 of them beside the caption, 23 cases with none) stays off the caption, its berth and every held press area; the drone (154 cases drawn smaller) stays below the caption and every held press area; the pulse's core is under a quarter of the panel. No film plays over another seat's berth. The examples' anchors are Backend's rule. The words are the hosted board's. The colors are 35 or more from every faction accent. The contracts are the module's and name no role. It also checks that the captures are current and the medical films pictured in every state |
| `node design/tools/board-v2-capture.mjs` | **215 pictures and six contact sheets, 0 with problems**, 56 of them the medical films'. Every medical picture is checked for: no scroll; the Hospital at `fit.mjs`'s panel; the page at the film's stage; the top bar's words; no side or role word; everyone where the snapshot has them, in their health. Each patient's berth is checked against its public facts: the monitor, the lamp (its opacity the frame's), the bed light and the tags (their words, tone and detention), each at the ward's furniture to 0.6 px. Each tag is where `tagBox()` puts it, whole in the panel, off the caption and off every name tag. The patient arrives as the frame says. Nothing is drawn at a berth nobody holds. While a film plays, its parts are on the page exactly when the frame draws them, where it puts them: the drone's lens to 1 px at the size `droneFit()` allows, the inset where `insetBox()` puts it and over no press area another seat holds, the scan line, the hologram and the pulse (its core under a quarter of the panel). The subject is drawn once, in the frame's pose and the gown, hidden at its own berth or marked away with its name tag carried. A detained subject keeps its tag. The room dims on its art alone. The live region holds the client's words at the beat. Nothing the film added is left after its end, and nothing at all where another seat holds the berth. A real pointer lands on every slot's target, at its centre and four inner corners, on every picture (`&hit=1`) |
| The same run: **344 whole-page comparisons, 0 differing** | #144's 304, and 40 for the medical films at 390 × 844 and 320 × 568. The display's page and a player's: 6. The page after each film and the page before it, in both motion modes, at the same phase of the decorative loops: 16. Every room but the Hospital, and the subject's own while it is marked away, during a film and before it: 12. Every room but the Hospital in the critical state and on the plain board: 4. The top bar's box on the plain board and in each film: 2 |
| The same run: **230 pointer probes, 23 press tests (129 presses), 12 label placements** | 0 problems, with the medical code on the page |
| Pictures byte for byte the same | Every review picture and contact sheet made before the medical films (159 pictures, five sheets) re-rendered byte for byte the same; only `index.json` and `report.json` changed, with the new pictures |
| `node design/tools/board-v2-assets.mjs --check` | 75 files current |
| `npm test --workspace @mothership/design-tokens` | **280 / 280**, 12 of them in `medical.test.mjs` |
| `npm run verify` | Passed through `test:balance`'s static gate: toolchain, workspace and sources checks, both typechecks, bootstrap 55 / 55, engine 253 / 253, backend 187 / 187, tooling 130 / 130, frontend 194 / 194 and 448 / 448, design 280 / 280. `test:scenarios` refuses an uncommitted tree, so it was re-run on `e589e7a`: its catalogue passed (555 ids: 516 passed, 33 reviewed blocked, 6 explicit manual, zero errors), then its engine controls stopped at the gate's 20-minute limit in this container, with no control failing in its log. `test:capacity` likewise stopped at its 10-minute limit, with no failure in its log. Neither touches this PR's files; the PR's CI runs both |
| A mutation of the measurement (this session, not committed) | Shifting the expected rescue by 150 ms and the flatline by 300 ms made 18 of the 45 medical pictures then planned fail, on the drone's lens, the scan line, the stage, the inset's opacity, the lamp, the bed light and the room's dim. Shifting the round made every critical picture fail on its lamps and tags |

The captures' inputs hash is `852ad7976f6879ee35220e51001141bd2003a243924ab9983487b5c43db870fb`.

**Not run:**

- Real phones, a screen reader, a phone's own text-size setting, or reduced motion set on a device: the review page takes `&motion=reduced` from its query.
- A match or any server: the outcomes, snapshots and anchors come from the review page's synthetic fixtures, not from 1.7 or 1.8.
- Several films at once, and a film cut by a newer snapshot or the Blackout's window: specified (section 1), not pictured.
- The owner's review.

Whether players read the drone as the Hospital's and not anyone's, and the flatline as quiet rather than graphic, is for a table of players, not a capture.

## 9. The exact files

Read every file at this PR's commit. Every file carries the `mothership:dev-only` mark and stays fenced until Integration ports it in a separate, versioned review; the Designer changes no fence and no pin.

**Proposed for import:** two pure modules and the 28 SVGs. `fx/medical.mjs` imports the approved `design/board-motion/scenes/kit.mjs` (byte for byte as at the integration baseline `abb6839`), #128's `scenes/hospital-ward.mjs`, and #130's `fx/blocked.mjs` and `fx/label-box.mjs`, all unchanged. `films/medical.mjs` imports `fx/medical.mjs` alone. Nothing imports a controller, fixture or tool.

| Module | What it is | Exports |
| --- | --- | --- |
| `design/board-v2/fx/medical.mjs` | The medical art and its placement, `board-v2-medical-0.1.0` | `MEDICAL_VERSION`, `MEDICAL`, `medicalColorDistances`, `MIN_ACCENT_DISTANCE`, `DOCK`, `DRONE_SCENE`, `berthKit`, `berthKits`, `TRACE_KINDS`, `TRACE_COLOR`, `tracePoints`, `INSET`, `vitalsInsetSvg`, `berthScreenSvg`, `LAMP_STATES`, `lampSvg`, `RESCUE_TONES`, `rescueCrossSvg`, `detentionTagSvg`, `tagBox`, `INSET_MIN_WIDTH`, `insetBox`, `DRONE`, `DRONE_MIN_FIT`, `droneFit`, `hoverAt`, `droneSvg`, `scanLineSvg`, `hologramSvg`, `PULSE_BOX`, `PULSE_FLASH_RADIUS`, `pulseSvg` |
| `design/board-v2/films/medical.mjs` | The three films, `board-v2-medical-films-0.1.0` | `MEDICAL_FILMS_VERSION`, `RESCUE_OPPORTUNITIES`, `rescueTag`, `clinicalBerth`, `filmBerth`, `berthState`, `CRITICAL`, `criticalFrame`, `RESCUE`, `rescueEnd`, `dronePosition`, `rescueFrame`, `FLATLINE`, `flatlineEnd`, `flatlineFrame`, `medicalContracts` |

The 28 SVGs in `design/board-v2/assets/medical/`: the drone's four frames (`drone-folded`, `-open`, `-charge`, `-pulse`; 160 × 132, the lens at 80, 56), the vitals inset for each trace (`vitals-off`, `-boot`, `-unstable`, `-stable`, `-slowing`, `-flat`; 168 × 72; a film draws the trace up to its sweep), a berth's screen for each trace (`berth-screen-*`; 40 × 24), the lamp's four states (`lamp-off`, `-amber`, `-red`, `-calm`; 40 × 40), the rescue tag's three tones (`rescue-next`, `-current`, `-none`; 16 × 16; the round is the page's text), `detention` (16 × 16), `scan-line` (140 × 16), `hologram` (64 × 64) and the pulse's two frames (`pulse-1`, `pulse-2`; 120 × 120, the core's radius 14). The manifest's `medical` section lists each with its size, hash and anchor, and every berth's kit.

To check every file proposed for import, and the two generated contracts, run `sha256sum -c` on this block from the repository root:

```
3f596f1537d0b58d820359993bfbd01ff58194b1e8b7c08435aebbaa306e7af8  design/board-v2/fx/medical.mjs
fef1b67902b18c3ba7a5ab81207538dfaa34ba8bc4bc7e4e81b89fd2b32c3baa  design/board-v2/films/medical.mjs
56525f1cda746ae261afa00bef1e4c0107a860a8e7da3ddf1ce397b346db334a  design/board-v2/assets/medical/berth-screen-boot.svg
26a34e88c0348d04cc75b8fcbaf6f1a4f27078a9641c47f4f3c6fece71dd8e28  design/board-v2/assets/medical/berth-screen-flat.svg
c691d833ebf670eb2e714db51d665638e7a6676386dbcb070b5a4fa49539ed09  design/board-v2/assets/medical/berth-screen-off.svg
fa883b6196b02739ca9d70f3a64546642b04e1b0aac20b002d3010e2b8433cf8  design/board-v2/assets/medical/berth-screen-slowing.svg
8e59f460fd1b23d09f828047a7eecce8fda6be8258c4196b0385803e04719816  design/board-v2/assets/medical/berth-screen-stable.svg
7382595d0799da36716e4a9a9d984bda80d1f68814c9a34529b9c570c62515b4  design/board-v2/assets/medical/berth-screen-unstable.svg
b3987690ec6e6cacad943810853c9a238b790fb559f46c86b5a3b565d15acef2  design/board-v2/assets/medical/detention.svg
c0de2a9f07b2202636330e4a07b373d6f9fbcaad5748796627a2f86a3a21711f  design/board-v2/assets/medical/drone-charge.svg
a1608d09be1e9a582b371dc82b8636c5e76985125b85129e1efbac5d58aab9c1  design/board-v2/assets/medical/drone-folded.svg
b0ff575137d29c06999ec1fd079012c1f9f4633973ebe071bd3c3fca0bc1d011  design/board-v2/assets/medical/drone-open.svg
055a0f9b873438ad34ec1941eaf39b732323cb96583ddd289527f46fcf915515  design/board-v2/assets/medical/drone-pulse.svg
ec05fde0a3d2f708543b3199c967a77451fd27af4e0ece7dad219a325254efff  design/board-v2/assets/medical/hologram.svg
c4ba294eeba46f3ac51aee7eded943bdf2e5522685d3f1984146decd5f3aeb28  design/board-v2/assets/medical/lamp-amber.svg
799ba1d3246c11ea161cc1e72dd1510f48ca12a67d3459670950c7b054ae251f  design/board-v2/assets/medical/lamp-calm.svg
a5925bf779d667214d9d657d1e4cb87875483e2b1aca67387b2842c3317e0eb2  design/board-v2/assets/medical/lamp-off.svg
cbc435f82ae3b7bb2976e6e319ea15474d9a93426363bdeb325458e63973234a  design/board-v2/assets/medical/lamp-red.svg
078db793a8767ab0b03c4d6df121685b65ed40c19ee54cdc13451f3b00c84f2d  design/board-v2/assets/medical/pulse-1.svg
8398717c35bed0995f2d4f95e47d8b519bce200b62b71cb4f860ab3d0acaab3e  design/board-v2/assets/medical/pulse-2.svg
a1a2695f98a0dc413276272cce3d9a4b6e6e1f441024521571d8469f898e5b99  design/board-v2/assets/medical/rescue-current.svg
13f4162f4690de1f65ed7b96afd86388929bb74b46463f4eb7b500b7af50ad2d  design/board-v2/assets/medical/rescue-next.svg
8fbc89e3afb813d9c16e68bcc561c9e5cba6729983bd3918eb57d6036e82232e  design/board-v2/assets/medical/rescue-none.svg
c448cc2d4af3448e62d28bda57d12dd27cdb3f5429c0a2eecacaf40f1fd14d8c  design/board-v2/assets/medical/scan-line.svg
5cc33b7d8a4e94c7549dce2c2ebaedb7e77d43f69da12e425947f85880bbb271  design/board-v2/assets/medical/vitals-boot.svg
bc1c76c07cf962f331f1b70afe9ed275441329ae7a711642b3014a8c3392a42d  design/board-v2/assets/medical/vitals-flat.svg
d12d42a12e1c2444db411af7e820e0f63dc341fa67e2e5662f10d38637e61245  design/board-v2/assets/medical/vitals-off.svg
97b14bae567d4cede93fb5462e1b80bbf2b6f7b579140cff6692fee9745ed9d0  design/board-v2/assets/medical/vitals-slowing.svg
1cc361aee73562f18c7288962e93946854692aedaddb96caf52a0647633597cd  design/board-v2/assets/medical/vitals-stable.svg
8039ffe2c493e3da4bfb947c6d3f5a0260724e117f0ab30b252e3aa74834c7d3  design/board-v2/assets/medical/vitals-unstable.svg
ee4c75e8f31e1626daeda4b6f45ee2e007725741f210f3939c0a50735c64674a  design/board-v2/contract/films.json
3c93874e127a24d6a1ef96432b1764df8b6f451c5e595957c8d8a430e21e1e64  design/board-v2/assets/manifest.json
```

**Review only, not to port:**

```
3af142cb13bca435a9bbe3e66b586574958c03b9a72d7fcfc656490e35b1ead5  design/board-v2/js/medical-view.mjs
6a4a53671a477db15796e60075e2c08b46690a3d678460f4a4318d900d77532d  design/board-v2/js/medical-fixtures.mjs
19ce6a04292ab872798f65753138e8cdae16b20a636f21c16a9032da03dccd7f  design/board-v2/js/page.js
cc5e42e8157b0a12b5a6a1b139f3ae39323b21ff3762a8c87a5541a21c2e7649  design/board-v2/css/page.css
33dbf5a1048b9ef44450ab3f511e1979ef7474212e98c908f0ccc2e0e5397770  design/board-v2/contact.html
4fc41cc68702b9e05b7092f519e19ea7febc86b5e7c0f425ba4d1c50527bd935  design/tools/board-v2-assets.mjs
9c0ed4def8aa5a70600bd8d82df1c36604b90dba91185c2799bc52263475896e  design/tools/board-v2-capture.mjs
1fb80de6ba8c8358c97ab3392de957cca782657f0bf12f3daa3df42a72e4ba21  design/tools/board-v2-check.mjs
44ebb5a7428ef3d38fedcf48ae78ab62b7e296a2b56ec5dd77e79c8ad1aae4e1  packages/design-tokens/test/medical.test.mjs
7ac65ab6d13491ba881d9f3d090c290bf5d6af29545f17332a4616bce8ea56ac  design/board-v2/review/contact-medical.png
93d1f334da23170d95adaf3f6d6327b877a84c233c59a0721323a3a9661e3e28  design/board-v2/review/index.json
a76a9f40705138da243a05cc39c7c8ca4a62df0fe32c78207274ce4d431c61a8  design/board-v2/review/report.json
```

The complete list of every path this PR changes, the 56 medical pictures included, with each SHA-256 at the PR's first head, is in the [deliverables index](deliverables.md), version 3.

## 10. Unresolved

| Question | Owner | Meanwhile |
| --- | --- | --- |
| A 4-bed Hospital ([#155](https://github.com/Amirkianfar66/GameN/issues/155)) | The owner, after Balance and Backend | The roster-sized ward of #128 |
| A same-batch admission at the subject's anchor | Backend | No film; the words alone |
| When the client says the outcome: on receipt or at `announce` | Frontend | The review page says it at `announce` |
| Several films at once | Frontend | Each at its own berth, insets clear of the earlier ones; not pictured |
| H7's and H8's bezels under the caption on phones | The owner's 4-bed request may remove them | Their tags below the caption's band |
| Real phones, a screen reader, the owner's review | — | Not run |
