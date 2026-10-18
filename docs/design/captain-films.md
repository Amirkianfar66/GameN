# Board v2: the Captain's films (storyboards S6, S7 and S8)

**A proposal from the Visual and Motion Designer, 18 October 2026.** It is the second slice of the Integration owner's completion request of 14 October 2026 on #144: the Captain's RELEASE (S6), the Captain's EJECT (S7) and the Captain's command buttons (S8). It follows the Designer's review of the owner's motion specification of 13 October 2026 (storyboards S6, S7 and S8 of [motion-review-2026-10-13.md](motion-review-2026-10-13.md)), on #128's board, with #144's capsule beside the Command Room.

Nothing here is a rule, a server contract or an adopted asset:

- **Rules:** who may command, when, which prisoners a command takes and where the released go are Backend's. The films draw the server's outcome and the snapshot published with it; they decide none of it. A film never plays for a rejected, pending or unknown command.
- **Adoption:** each new file needs Integration's approval by name and hash (section 9).
- **Checked against the specification packet** (`GameN-owner-specification-agent-handoff-2026-10-13-v2.txt`, SHA-256 `b5b4ba2d…1b590743`, preserved in [evidence/owner-motion-spec-2026-10-13/](evidence/owner-motion-spec-2026-10-13/PROVENANCE.md)): G-06, Q-P01, Q-P01a, Q-P02, Q-H02, Q-C01 and Q-C02f (both commands unblockable), and the motion requirements' sections 6, 7 and 8.

| | |
| --- | --- |
| Branch | `claude/designer-captain-films`, stacked on #158 (`claude/designer-hospital-films`) at `7cf140a`, itself on #144, #130, #129, #128, #127 and the integration baseline `abb6839` |
| Why stacked | The films draw on #128's rooms and slots, #130's label margin and faction-accent measure, #144's capsule layout and away marker, and #158's deliverables index |
| Toolchain | Node 22.21.1, npm 10.9.4, headless Chromium 141 |
| New files | `design/board-v2/fx/captain.mjs`, `design/board-v2/films/captain.mjs`, `design/board-v2/figures/captain.mjs`, `design/board-v2/js/captain-fixtures.mjs`, `design/board-v2/js/captain-view.mjs`, 43 files under `design/board-v2/assets/captain/`, `packages/design-tokens/test/captain.test.mjs`, this page |
| Changed | The review page (`js/page.js`, `css/page.css`, `contact.html`), the asset tool, the capture tool, the static check, `contract/films.json` and the manifest (now `board-v2-0.6.0`). No earlier film, scene, figure or layout module changes; the approved rooms are unchanged. Nothing outside `design/board-v2/`, `design/tools/board-v2-*`, `packages/design-tokens/test/` and `docs/design/` |

## 1. The films

S6 and S7 are public: every phone and the display draw the same, from the public outcome event and the public snapshots. S8 is the current Captain's own controls. None reads an actor field (the outcome names none), a role, a side, a faction or a cause. The Captain drawn at the console is whoever holds the public office at C1 in the snapshot.

### S6: RELEASE (4.2 s)

Played for a live CAPTAIN_OUTCOME of kind RELEASE. Its subjects are its `seatIds`, every living prisoner physically in the Jail.

| Beat | Time (ms) | What is drawn |
| --- | --- | --- |
| Console | 0–500 | The console inset opens on the RELEASE plate. Juno (C1) lifts a hand over the console set in the chart table |
| Press | 500–800 | The button goes 3 px down under an inner shadow (Activated), with a green ring round it. Juno's shoulders dip about 2 px |
| Pulse | 800–1300 | A green dotted pulse runs from the inset down the board's gutters and spine to the Jail's door lamp |
| Locks | 1300–1700 | The keypad and the lamp go green; the lock's wheel turns in three steps |
| Door | 1700–2200 | The blast door's two leaves slide into the wall, showing the ship's corridor. The words go to the live region |
| Walk | 2200–3800 | The prisoners leave 80 ms apart, in slot order. Each gets up, walks to the door, through it, and crosses the board to the place the snapshot gives it. The crossing is the reviewed public move: a flyer in the prison suit, with the ink trail. It lands in the room's clothes, the change hidden in the landing's puff. Its new place shows the away marker until it lands |
| Close | 3300–4200 | The door shuts once the last prisoner is through. The signals and the wheel go back, and Juno returns to the table. The plate shows USED (the page's stamp), then the inset closes |

Reduced motion (2.24 s): four still panels, each faded in over 80 ms. They show the console with RELEASE pressed, the door open, the prisoners at their new places, then the door shut. Nothing travels, rings, turns or pulses.

A Hospital detainee is never touched: it stays in its berth with its detention tag (Q-H02). A body in the Jail stays where it is. There is no vote and no block.

### S7: EJECT, Option A (7.2 s)

Played for a live CAPTAIN_OUTCOME of kind EJECT. Its subjects are its `seatIds`, every physical Jail occupant, bodies included.

| Phase | Time (ms) | What is drawn |
| --- | --- | --- |
| 1 Command | 0–900 | A short push on Juno: at most 6%, on the Command Room's art only, never its press areas. The inset shows the EJECT plate under its clear cover. The cover lifts in three frames, the button is pressed, and a hard click is drawn as a red comic burst, with no lettering |
| 2 Alert | 900–1500 | The emergency light pulses over the Command Room's and the Jail's art, at 1.6 Hz with opacity 0.16 to 0.34, multiplied. A red pulse runs down the gutters |
| 3 Lockdown | 1500–2400 | The door locks (the wheel turns back) and the keypad stripes red and amber. The airlock hatch appears in the wall left of the door, its rim glowing. The prisoners start and get up to brace |
| 4 Airlock | 2400–3300 | The clamps release in three steps, the iris opens onto space, and the suction builds toward the hatch |
| 5 Ejection | 3300–4400 | The living are pulled to the hatch 100 ms apart, in slot order: tumbling silhouettes with a paper rim, shrinking into it. A sheet of paper and a cup go with them. The bodies rise and fade as grey cut-outs, all at once. EJECTED, the page's caption, shows. The words go to the live region. Nothing graphic |
| 6 Exterior | 4400–5800 | The Jail's panel shows the hull from outside with the hatch open, and the ejected drifting away, small, as silhouettes |
| 7 Closure | 5800–7200 | The iris shuts, the clamps engage and the hatch is gone. The light settles and the Jail is empty. The inset returns: EJECT under its shut cover, marked USED. The memorial plaque appears beside the Jail's caption |

Reduced motion (2.56 s): four still panels, each faded in over 80 ms. They show the console with EJECT pressed and its cover open; the Jail with the hatch open and EJECTED; the empty Jail; then the memorial plaque. There is no suction, travel, push, shake, pulse or flash, and the emergency light is a still, low tint.

**Afterwards** the Jail is empty and the characters off the board are drawn nowhere on it. The plaque beside the Jail's caption counts them; the number is the page's text. It is the board's state, drawn from the snapshot alone (the seats whose `location` is null), on a reconnect too. Frontend lists those characters in the history as grey cut-outs with their seat and name (`memorialSvg()`, `memorial-c1…c9.svg`), the same whatever their side. A faction is shown only where the authoritative state reveals it, never by the film.

**They stay choosable.** A Code may name any seat, Eliminated ones included (#140), so a character off the board needs a target whenever a choice offers it ([private-capsule.md](private-capsule.md), section 12, rule 2). Under the owner's "controls take turns", the board is the chooser and the choosing row takes the navigation's place. When the server's offer includes characters off the board, the row's start holds a 44 px tab: the plaque's mark and their count. The tab opens the sheet over the Hospital and the Jail, as the claim's tab does, with a card for each of them: the grey cut-out, with the seat and name beneath as the page's text. The whole card is the target, 44 px at least (`offBoardCards()`), ringed when offered and marked when chosen, exactly as the board's rings are. While the sheet shows, the Hospital's and the Jail's characters cannot be chosen; the tab closes it. Up to five cards fit in one row on every phone the controls' layout fits, at normal and 200% text (an EJECT can take at most five: the Jail has five places).

### S8: the Captain's command buttons

The current Captain's own controls, in the Actions tray or the console sheet. RELEASE (green, an open padlock) and EJECT (red, the eject sign, under a clear cover) are 200 × 64 plates. The word on each is the page's text: Frontend's "Release" and "Eject" today.

| State | From the Captain's own view (`captainButtonStates()`) | Drawn | Without color |
| --- | --- | --- | --- |
| None | `self.captainCommandUses` is null: not the Captain | No plates | — |
| Available | Not used, and `legalTargets.CAPTAIN_RELEASE` / `CAPTAIN_EJECT` holds the Captain's seat | Lit; a glow cycle of 2.4 s with at most 15% luminance change, still under reduced motion | A solid rim and the word |
| Unavailable | Not used and not offered (not the Captain's turn, not in the Command Room, Injured, or nobody living in the Jail) | Dull and unlit. 1.8 gives no reason, so the line is Frontend's, neutral | A dashed rim |
| Sending | The client's own command in flight | Activated: the button 3 px down under an inner shadow (120 ms), then Frontend's "Sending Release…" / "Sending Eject…". EJECT's cover lifts first (three frames); RELEASE confirms with Frontend's strip | The pressed shape and the words |
| Used | `releaseUsed` / `ejectUsed` is true, whoever was Captain | No rim, the button dark, the page's USED stamp across the plate | The stamp |

A rejected, pending or unknown command never plays S6 or S7. An invalid or empty command never shows Used.

## 2. The inputs, from Backend's drafts

**No new field is needed.** The films read Backend's draft 1.8 ([Amirkianfar66/GameN#146](https://github.com/Amirkianfar66/GameN/pull/146), head `d66515706…`, not merged). The review page's outcomes are synthetic and labelled so (`js/captain-fixtures.mjs`). Where each released prisoner goes is the server's: its remembered Room A or B, the other room as a fallback, competing returns in player-number order. The review page writes those places by hand and works none of them out.

| The films' input | From |
| --- | --- |
| Which film | `CAPTAIN_OUTCOME.kind`: RELEASE (S6) or EJECT (S7) |
| Whom | `CAPTAIN_OUTCOME.seatIds`, in seat order. For RELEASE, every living occupant of the Jail; for EJECT, every occupant, bodies included (`executeFullGame()` in `packages/engine/src/full-game/lifecycle.ts` on #146) |
| Where they were | The snapshot before the outcome, as the client held it: each subject's Jail `slotId`, and whether it was a body (`health: Eliminated`) |
| Where they are | The snapshot published with the outcome: each released subject's `location` (Room A or B) and `slotId`; each ejected one's `location: null, slotId: null`; the Captain at C1 (`captain: true`) |
| `t` | Milliseconds from the outcome's presentation start (`publishedAt`); live only, while the event is fresh |
| S8 | `self.captainCommandUses: null \| { releaseUsed, ejectUsed }` and `legalTargets.CAPTAIN_RELEASE / CAPTAIN_EJECT`, the Captain's own view only |

**Where a subject's earlier place is unknown** (the client did not hold the snapshot before the outcome), the film draws nothing of it in the Jail: a released subject simply lands at its new place, and an ejected one is not drawn. A reconnect plays no film: the board shows the latest snapshot, the plaque included.

## 3. Where things go: placement and layers

All placement is pure geometry in `fx/captain.mjs`, from the board's boxes and the boxes to keep clear, so a client can port it without the review page's controller.

| Rule | Function | What it keeps |
| --- | --- | --- |
| The console inset | `consoleBox()` | In the top band, right of C1's press area and name tag and below the band's caption line (44 px). It is whole inside the band, over the capsule's panel where the board has one, whose seats are empty in an ordinary turn. It is never over a caption or a target. It is drawn as large as fits, 224 × 96 at most, and it is omitted where it would be under 96 px wide. Every phone has room for it at 7, 8 and 9 players, with the capsule and without (section 8) |
| The pulse's way | `conduitPoints()`, `conduitAt()`, `conduitSegment()` | From the inset's foot down to the gutter under the top band, along it to the spine, down the spine to the gutter above the Jail, along it to the Jail's door, then down into the Jail's caption band to the lamp. It runs in the board's gutters everywhere but its two ends, and it crosses no caption and no press area |
| The door, lamp and keypad | `jailDoorSvg()`, `JAIL_DOOR` | Over the Jail's art at its scene frame (box 340, 60, 480 × 330). At rest it is exactly the room's own drawing (section 8); the leaves slide 114 units into the wall |
| The hatch | `airlockSvg()`, `AIRLOCK` | Centred at 276, 226, its rim r 56. It is in the back wall left of the door, clear of the pillar, whole in every phone's Jail panel and below its caption band. It is drawn only while an EJECT plays |
| The plaque | `plaqueBox()` | Right of the Jail's caption, in its band |
| The cards of the characters off the board | `offBoardCards()` | In the body of `turnsLayout()`'s sheet over the Hospital and the Jail, opened from the choosing row's tab: in one row, or two where one would make them narrower than 44 px, centred; each card the whole target, 44 to 72 px wide, its name strip 22 px beneath |
| The subjects | — | Each is drawn once. While a prisoner is still in the Jail, the film draws it there and its new place shows the away marker (#144's: grey, 0.35). While it crosses, the film's flyer is over the board. While it lands, the film draws it at its place and the snapshot's figure is hidden. The Captain's snapshot figure is hidden while the film draws C1 |

**Layers**, bottom to top. In the Jail's art: the scene's back layer; the door overlay and the hatch (z 1); the people by depth; a figure being pulled (1400); the suction (1490); the debris (1495). Over a room's art: the emergency light (3000, multiplied); the exterior (3020, the Jail's panel). Then the name tags (3500), EJECTED (3630), the pulse (3690) and its head (3691), the trail (3695), the puff (3696), and the console inset and the flyer (3700). Above them all are the slots' targets (4200) and the captions and the plaque (5000).

## 4. Audiences

S6 and S7 are public: every phone and the display draw the same, from the public outcome and snapshots. The capture compares the display's page with a player's (section 8). S8 is the current Captain's own: other players' `captainCommandUses` is null, and they get no controls. Nothing in a film says more than the outcome's words.

## 5. For Frontend

Frontend has reviewed none of this. Please review the placement rules and the beats before anything is ported.

**Rules the review page keeps, which a client must keep too:**

1. Play S6 and S7 only for live, fresh CAPTAIN_OUTCOME events, from their presentation start, over the snapshot published with them. Never play them on a reconnect, for an expired event, for a receipt, or for a rejected, pending or unknown command. Never replay one.
2. Draw a subject in the Jail only where the snapshot before the outcome had it, and draw it once (section 3).
3. Keep every slot's target live and on top while a film plays. Nothing a film draws is pressable. The board, the turn timer and the navigation stay usable.
4. Place the inset by `consoleBox()` and the pulse by `conduitPoints()`, with the board's boxes as `fit.mjs` gives them.
5. Stop a film at once and show the latest snapshot in three cases: a newer snapshot moves a subject or places anyone in the Jail; the Blackout's window opens; or the page is hidden.
6. Say the outcome once, in the client's words (today the hosted board's "Player 3, Player 4: released from detention." and "Player 3, Player 4, Player 9: ejected."). If the client times its words to the film, time them to `announce`.
7. Draw S8's state from `captainButtonStates()`, and never show Used for a command the server has not accepted.
8. When a choice's offer includes characters off the board, give them their cards (section 1, "They stay choosable"): the tab at the choosing row's start, the sheet over the Hospital and the Jail, a card each by `offBoardCards()`. Offer exactly what Backend sends, never a list the client works out.
9. Ship the 43 SVGs in the common bundle; never fetch them on demand. The trail and the puff are the reviewed public-board exports (`fx-ink-trail.paper`, `fx-landing-puff.paper`).

**Two copy questions for Frontend**, not changed here:

- `packages/presentation/src/model/connected-player.ts` on #154 asks "Release everyone detained in Jail or Hospital?" before RELEASE. In 1.8 a RELEASE leaves Hospital detainees detained (Q-H02, Q-P02), so "Release everyone in the Jail?" may be the accurate prompt. The S8 storyboard's confirm strip uses it.
- The hosted words list every `seatId`, so an EJECT that clears an earlier body says that body's player was "ejected" too. Whether a body should read differently ("cleared"?) is Frontend's call.

**Not to port:** `design/board-v2/js/captain-view.mjs`, `captain-fixtures.mjs`, `page.js` and `fixtures.mjs`. They are a review page's controller and synthetic fixtures. Its `&play=1` runs a film from a local clock for review only.

**Review page options** (`design/board-v2/index.html?roster=9&capsule=1&film=…`):

| Option | What it shows |
| --- | --- |
| `&film=release\|eject` | One outcome's film over the snapshot published with it |
| `&outcome=` | `release` and `eject` on the Captain board (Lyra and Atlas prisoners at J1 and J2, Echo's body at J5, Mira detained in the Hospital, Juno the Captain), `release-full` and `eject-full` (five prisoners) |
| `&t=` | ms from the outcome's presentation start (default 2 600; 3 700 for EJECT) |
| `&capsule=1` | The capsule beside the Command Room, as the hosted board draws it |
| `&play=1` | Plays from a local clock (review only) |
| `&motion=reduced` | The reduced-motion variant |
| `?sheet=captain` | Every piece of art on one sheet, S8's plates at a phone's size |
| `&ui=choosing&offboard=1` | After an EJECT (`&t=` past its end), a Code choice whose offer includes the characters off the board: their cards in the sheet the choosing row's tab opened, with `&offered=` and `&chosen=` as in `js/turns-view.mjs` (synthetic offer) |

## 6. For Backend

**No new field is needed.** Two confirmations:

1. **EJECT's `seatIds` include the bodies it clears**, as `executeFullGame()` lists them on #146. The film draws the living pulled out and the bodies leaving as cut-outs.
2. **The order of the off-board history.** My review's BE9 proposed an ordered elimination history. 1.8 keeps the off-board seats in the roster with `location: null` and no order. If Frontend's history needs an order (by round, by event), it comes from the server. The plaque only counts.

## 7. For Integration

1. **Approval by name and hash** of the three modules (`fx/captain.mjs`, `films/captain.mjs`, `figures/captain.mjs`) and the 43 SVGs (section 9). The Captain palette's 24 colors are 35 or more (CIE76) from every faction accent of `tokens-0.4.0` (the nearest, the hull's light steel, 35 from the blue accent), and the manifest lists each distance.
2. **The films' contracts** are in `contract/films.json` (entries 7 to 9: `captain-release`, `captain-eject`, `captain-buttons`), as proposals.
3. **The hatch is drawn only while EJECT plays**; the approved Jail has none. Whether it should become permanent scenery is the owner's call.
4. **No playable build** until 1.8 is adopted and Frontend has implemented the films against it. This page is not evidence that a film is implemented or deployed.

## 8. Verification

These were run on this branch in this container. Desktop Chromium laid out a review page from synthetic fixtures: this is not a phone, a match or a measurement of players.

| Check | Result |
| --- | --- |
| `node design/tools/board-v2-check.mjs` | **13 / 13.** #158's twelve and the Captain films' own. At rest the door overlay draws the Jail's door, lamp and keypad exactly as the room does: every element is the scene file's own, in its order, under ids of its own. At the 8 phone sizes, with the capsule and without, for 7, 8 and 9 players, the console inset is placed every time (48 of 48), below the band's captions, off C1's press area and name tag, whole in the band. The pulse's way (48 ways), sampled every pixel, crosses no press area of any room and runs over a panel only under the inset and in its drop into the Jail's caption band. The hatch's rim is whole in the Jail's panel and below its caption at every phone. The off-board cards, one to five, are 44 px or more, inside the sheet's body and apart in 210 layouts (normal and 200% text). The films are checked every 10 ms, in both motion modes, with five subjects and a body: their lengths are the storyboards' 4.2 and 7.2 s, nothing is drawn outside them, the words are never withdrawn once said, and nobody moves, pulses or flashes in the reduced variants. A full Jail is through the door before it shuts and landed in time; its last ejected is gone before the exterior. The emergency light stays under 2 Hz and at 0.34 or less. The review outcomes list Backend's seats; detainees and bodies are kept. S8's states come from the Captain's own view, the words are the hosted board's, the memorial art is greys alone, every color is 35 or more from every faction accent, and the contracts name no role. It also checks that the captures are current and the Captain's films pictured in every state |
| `node design/tools/board-v2-capture.mjs` | **274 pictures and seven contact sheets, 0 with problems**, 59 of them the Captain's. Every Captain picture is checked for: no scroll; the page at the film's stage; the top bar's words; no side or role word. Everyone is where the snapshot has them, in their health, the released marked away at their new places until they land and hidden while they settle; the Captain is hidden while the film draws C1. The console inset is where `consoleBox()` puts it (to 0.6 px), its plate, cover and USED stamp as the frame has them, over no caption, target or the Captain's place. The pulse's way crosses no caption as the page lays them out, and its head is where the frame puts it (to 1 px). The door is the room's at its scene frame, open, turned and lit as the frame says. Every subject is drawn once, where and as its state says: in the Jail, crossing (the flyer and its trail), landing in the room's clothes (the puff), a silhouette, a grey cut-out. The emergency light, the airlock (its rim whole and below the caption), the suction, the debris, EJECTED and the exterior (a silhouette per ejected) appear as the frame says. Nothing of a film is on the page before or after it; the plaque is the board's own then, where `plaqueBox()` puts it. The live region holds the client's words at the beat. A real pointer lands on every slot's target (`&hit=1`). On the off-board cards: one per character off the board, in turns.mjs's sheet, 44 px or more, apart, a real pointer landing on each at its centre and four inner corners, ringed and marked as offered and chosen |
| The same run: **376 whole-page comparisons, 0 differing** | #158's 344, and 32 for the Captain's films at 390 × 844 and 320 × 568. The display's page and a player's: 4. The page after each film and the page before it, in both motion modes: 16. The rooms a film never touches (the Hospital during a RELEASE; the Hospital and Rooms A and B during an EJECT) during the film and before it: 10. The top bar's box on the plain board and in each film: 2 |
| The same run: **230 pointer probes, 23 press tests (129 presses), 12 label placements** | 0 problems, with the Captain's code on the page |
| Pictures byte for byte the same | Every review picture and contact sheet made before the Captain's films (215 pictures, six sheets) re-rendered byte for byte the same; only `index.json` and `report.json` changed, with the new pictures |
| `node design/tools/board-v2-assets.mjs --check` | 118 files current |
| `npm test --workspace @mothership/design-tokens` | **293 / 293**, 13 of them in `captain.test.mjs` |
| `npm run verify` | Passed through `test:balance`'s static gate: toolchain, workspace and sources checks, both typechecks, bootstrap 55 / 55, engine 253 / 253, backend 187 / 187, tooling 130 / 130, frontend 194 / 194 and 448 / 448, design 293 / 293, balance static 103 / 103. `test:scenarios` stopped at "engine verification requires a clean committed checkout"; it is re-run on the commit (see the PR) |
| A mutation of the films' clock (this session, not committed) | Drawing every Captain picture 150 ms later than its query made 30 of the 55 film pictures then planned fail: on the stage, the plate, the pulse's head, the door's wheel and leaves, the people's states and the inset's opacity |

The captures' inputs hash is `09d8cf39c89bc8b2b044c2294f5a0a19895dec63c8bfa6098803ba28d98268b2`.

**Not run:**

- Real phones, a screen reader, a phone's own text-size setting, or reduced motion set on a device: the review page takes `&motion=reduced` from its query.
- A match or any server: the outcomes, snapshots and places come from the review page's synthetic fixtures, not from 1.8.
- A film cut by a newer snapshot or the Blackout's window, and both commands in one turn: specified (section 5), not pictured.
- The owner's review.

Whether players read the EJECT as dramatic but not graphic, and the plaque as a memorial rather than a score, is for a table of players, not a capture.

## 9. The exact files

Read every file at this PR's commit. Every file carries the `mothership:dev-only` mark and stays fenced until Integration ports it in a separate, versioned review; the Designer changes no fence and no pin.

**Proposed for import:** three pure modules and the 43 SVGs. `fx/captain.mjs` imports the approved `design/board-motion/scenes/kit.mjs` (byte for byte as at the integration baseline `abb6839`) and #130's `fx/blocked.mjs` and `fx/label-box.mjs`, unchanged. `films/captain.mjs` imports `fx/captain.mjs` alone. `figures/captain.mjs` imports the approved `design/board-motion/figures/gestures.mjs` and `motion.mjs`, unchanged. Nothing imports a controller, fixture or tool.

| Module | What it is | Exports |
| --- | --- | --- |
| `design/board-v2/fx/captain.mjs` | The Captain's art and its placement, `board-v2-captain-0.1.0` | `CAPTAIN_VERSION`, `CAPTAIN`, `captainColorDistances`, `MIN_ACCENT_DISTANCE`, `COMMANDS`, `PLATE_STATES`, `PLATE`, `plateSvg`, `COVER`, `coverSvg`, `GLOVE`, `gloveSvg`, `clickSvg`, `ringSvg`, `CONSOLE`, `consoleSvg`, `consoleBox`, `conduitPoints`, `conduitAt`, `conduitSegment`, `pulseHeadSvg`, `JAIL_DOOR`, `JAIL_DOOR_ELEMENTS`, `SIGNALS`, `jailDoorSvg`, `AIRLOCK`, `airlockSvg`, `suctionSvg`, `DEBRIS`, `debrisSvg`, `emergencySvg`, `EXTERIOR`, `exteriorSvg`, `plaqueSvg`, `memorialSvg`, `CARD`, `offBoardCards`, `plaqueBox` |
| `design/board-v2/films/captain.mjs` | The films and the plates' states, `board-v2-captain-films-0.1.0` | `CAPTAIN_FILMS_VERSION`, `captainWords`, `DOOR_STEP`, `walkToDoor`, `BODY_MIDDLE`, `pullToHatch`, `RELEASE_FILM`, `releaseEnd`, `releasePerson`, `releaseFrame`, `EJECT_FILM`, `ejectEnd`, `ejectPerson`, `ejectFrame`, `captainButtonStates`, `plateFor`, `CAPTAIN_BUTTONS`, `captainContracts` |
| `design/board-v2/figures/captain.mjs` | The poses | `PRESS_DIP`, `CAPTAIN_POSES`, `captainPose`, `startle`, `BRACE`, `TUMBLE`, `ejectPose` |

The 43 SVGs in `design/board-v2/assets/captain/`: the plates (`plate-release-*`, `plate-eject-*`, each `available`, `unavailable`, `pressed`, `used`; 200 × 64), the cover's three frames (`cover-closed`, `-lifting`, `-open`; 72 × 100, placed at the plate's −2, −34), `glove` (56 × 72, its tip at 17, 4), `click` and `ring` (80 × 80), `console` (224 × 96), the pulse's heads (`pulse-head-release`, `-eject`; 24 × 24), the Jail's door at five moments (`jail-door-rest`, `-unlocked`, `-half`, `-open`, `-lockdown`; box 340, 60, 480 × 330), the airlock at four (`airlock-revealed`, `-released`, `-half`, `-open`; box 200, 150, 152 × 152), the suction's three frames (1024 × 768), the debris (`debris-paper`, `-cup`; 24 × 24), `emergency` (100 × 100, stretched), `exterior` (400 × 400, sliced to the panel), `plaque` (18 × 18) and the nine grey cut-outs (`memorial-c1` to `-c9`, in the figure frame). The manifest's `captain` section lists each with its size, hash and anchor.

To check every file proposed for import, and the two generated contracts, run `sha256sum -c` on this block from the repository root:

```
ad2853bf1e913cb4da5dafe2ddb728a477b686e02d5115d8d2a812ca5c871d88  design/board-v2/fx/captain.mjs
70f871155418e27c2e592cc410d690c642e7986a4179d569e79610611691e1c9  design/board-v2/films/captain.mjs
64435ec8d0893f5c34865d165f4d80294667c878df99d6ac41e607b76267824a  design/board-v2/figures/captain.mjs
3d726334869aae15828b99d7076af97f9420659a5877fcaa7ba674c000ed6186  design/board-v2/assets/captain/airlock-half.svg
4379d130f04d9afb55dbc8763c5cedcf5e912faf4e18d386013a5d8a8514c758  design/board-v2/assets/captain/airlock-open.svg
32bdc04d011affd1bebe34b42afbe367a2c993b54ef867b62083611a19b744b0  design/board-v2/assets/captain/airlock-released.svg
967bf35ae3f450a9f9b37d68f18979233687871b96a525d8c6bbe2dcdb02e867  design/board-v2/assets/captain/airlock-revealed.svg
1f5723a73cca04c592aeec56a7a83d550c2b83e1d73968e49011474ce8e9547c  design/board-v2/assets/captain/click.svg
207e9310edf4eae2a5c0420a6f44b4fdf9a96454f51a6cca736b074c272e7fa7  design/board-v2/assets/captain/console.svg
496cf7f171b48bd42096e13ad6afb94b716bc7f417060750e89e1f70cc1bf82c  design/board-v2/assets/captain/cover-closed.svg
ad1ed59063fcb1eddaf16238f0773cec3c06fe219da7be2dad7bc6b79af01cab  design/board-v2/assets/captain/cover-lifting.svg
a5ef29dbb56f8c0eac5c7f95188c4a4487925e7fff5108b8e8443f997c8af868  design/board-v2/assets/captain/cover-open.svg
12f76db7fff6ce512003825456f5b4657b5217c11087aff9f35dddde9e30fc04  design/board-v2/assets/captain/debris-cup.svg
7bd14c21e7f48efe3f162750a7184eaebcc369c6b10c32f4c0e78fb58292774b  design/board-v2/assets/captain/debris-paper.svg
14ab7006a7f5a2ba7e0248823ab269024900393ac8c7f8c283ba6f084142577b  design/board-v2/assets/captain/emergency.svg
f5f3175f3b367dd0d5de23e0151bd9579563f70ee3eb2e6e79cf8e5f5fc13998  design/board-v2/assets/captain/exterior.svg
ae7a4d7977d7913b8a342b9d460eeadea32c3696008cb3d647ecd7784f9b1291  design/board-v2/assets/captain/glove.svg
fda755aba0c3253cea84eef8c75abc5ba9745cc0577917f88df5f4b4a7ebf7b9  design/board-v2/assets/captain/jail-door-half.svg
04642d6647ea9568172e4e508f8652421f9bbc34585616bdbbaec2cf2cd698eb  design/board-v2/assets/captain/jail-door-lockdown.svg
7da5ac6e87166a2fd90ba125e4526cd17fb699f0ddf6245b5dec2b71e3ff8c89  design/board-v2/assets/captain/jail-door-open.svg
ac490370d6fc0f7db530932acf45c4f6d229cec02b8b2ef9e540e1f59f3fb7ee  design/board-v2/assets/captain/jail-door-rest.svg
c34b514e3681eb07196f949c5df3e1047c47b08da5ff1b97959ceb553220c3b4  design/board-v2/assets/captain/jail-door-unlocked.svg
5e2a4458108ea3e724be8a7c91b7c06bb9630e3028e3cffefac1b13320728a05  design/board-v2/assets/captain/memorial-c1.svg
925170a9ada05332a75be2f596775e9f91072aa6326af4c1fe8294b6304e594a  design/board-v2/assets/captain/memorial-c2.svg
cd608df3a5d3fd8ce073f9a0b5ef809efb128d6cd81af26e85025278089fac39  design/board-v2/assets/captain/memorial-c3.svg
d52e8d8c2ab303300388edee053002af461187783342e6e601dc6cdb801ef583  design/board-v2/assets/captain/memorial-c4.svg
b11212d2daa368ceeb656a87c58ecfed7024afc8bcbca501c6b6fe69aa372e82  design/board-v2/assets/captain/memorial-c5.svg
fa5687936e4967875e4a2b9df92066fa46c75f36c7f769d5c5872482888b3cc0  design/board-v2/assets/captain/memorial-c6.svg
e0054046dd6516c967b8e77f9eedbbe7311ff895cbd682f97c525c389c163b6c  design/board-v2/assets/captain/memorial-c7.svg
f964384ba67f1235b46bc59aaf7e14adecb7709dfba6fe685c4301ac335c52ff  design/board-v2/assets/captain/memorial-c8.svg
ee19d428602242278ffe645c8d1a9c5b08d318cc5156bfc1ef6b7e61d437689c  design/board-v2/assets/captain/memorial-c9.svg
da8a432879bb02d146e126600e72c231fa8838e0dc04051aa79563fd58c0ac56  design/board-v2/assets/captain/plaque.svg
8196aedbbc7fb166dd41cb54fe78b951e33cd7aae5d27b3ef4961a6ee20c3759  design/board-v2/assets/captain/plate-eject-available.svg
f4d244f10ea6a8d5a061a61bd9a9f097a25bab1a28212ead48bbac43d890c7df  design/board-v2/assets/captain/plate-eject-pressed.svg
a7c5961da9c166cce0cadeb119a78999bcebfb4ca1ead40caad35930b4d2c6f8  design/board-v2/assets/captain/plate-eject-unavailable.svg
5f5a498a83b275545fb929933c388a00cb9cf86756598a8b9b6b499ad59ae14e  design/board-v2/assets/captain/plate-eject-used.svg
f9087520420a3e22be48c1950083fc3d6b0b892d240a45b765f75b44c7af2f46  design/board-v2/assets/captain/plate-release-available.svg
8e5c91f9e9da70ebd38505c66d3644a3c7cd87c2866d562c45d9d3edde20956d  design/board-v2/assets/captain/plate-release-pressed.svg
ead12632bdf13c8fa889d6c0dd4a069b2a221bead976ebbc7aa47fa8bdf9eefb  design/board-v2/assets/captain/plate-release-unavailable.svg
835049a1a04b0710e04aa32bc697d2b809e5d93202d7c10649994ceaafcca6b3  design/board-v2/assets/captain/plate-release-used.svg
36e8d98361a7660b84f90ce9aed36680a8bd4c6e7aa23170051391775b6961f3  design/board-v2/assets/captain/pulse-head-eject.svg
d9de874a305627d27f988f27d6620239c3ba9da2642a4a4bc2c6ae0a3ea9771f  design/board-v2/assets/captain/pulse-head-release.svg
45ac4565de5c002abc49fa0592aac89adea10b16859f86f34dd39733b4a84747  design/board-v2/assets/captain/ring.svg
57083bbe09004013707a12935300cd077d6c105ff0c271f0e6f403fd3cbe4880  design/board-v2/assets/captain/suction-1.svg
44de510cf32e7cf8f82182357921042ff108a2db4ce33472da4f127619a59d92  design/board-v2/assets/captain/suction-2.svg
7d7840c6e634e2653ca1177dd4e31dbedd3dbe8fca9f693e0bb3b52527925a53  design/board-v2/assets/captain/suction-3.svg
66bdc11c40737c650b34a60621ee6fdfef5fe8f33f716ec1536af8683f8ae20e  design/board-v2/contract/films.json
c242cd3dea688427548279c76986f993fe717039e7b37e498d205fb90d529290  design/board-v2/assets/manifest.json
```

**Review only, not to port:**

```
aeb660af11b9360dc7d08c6ccf28ff0a4e19154dcfbc13e6aa40d16edb33ef91  design/board-v2/js/captain-view.mjs
cb0e11ec1d114496432eea59c366601e50ca1f8462a26d514323df150e2ca99f  design/board-v2/js/captain-fixtures.mjs
fe4d15be340d4addd0e84b94c0bc141d79cccc7cb929e96f388c0c354df76453  design/board-v2/js/page.js
3cfcbb34122166643a812ed3f07c513a935541d24af57c67a4d2add34fe151fd  design/board-v2/css/page.css
abc16ecfad95e8f86ccfbce0c29f503af4e1abd2e94f7912e51e168f3e3960c3  design/board-v2/contact.html
e4f054fb8b11910a5c4ccf2d0098ea158b78c6d818d67f564ec3fbfd7256ee0a  design/tools/board-v2-assets.mjs
c5ca67d140809a1c51afa42aa878a81446728fee3df7e00be54c72c29c46e47e  design/tools/board-v2-capture.mjs
f76a8bc2b13f94f7d0722f2d4fa82df0a5c05aee9508250d4d51cf87615c4c32  design/tools/board-v2-check.mjs
c0b54c63e3e0e090174b2aa10f089d2c40daf91550a9e6ff3f7aa2e4adb59b46  packages/design-tokens/test/captain.test.mjs
e693f72bf30cafa8946e571db47563586874a1121d872332f3654f3d595192c1  design/board-v2/review/contact-captain.png
0d36a1204e9c9e5eff9b50ae8f089381e8e6132dcfb78942e3b215872d960004  design/board-v2/review/index.json
29ac1678f79b840894bf6c0e9864227417c1b0b281af0b3674d1911fcbc55c6b  design/board-v2/review/report.json
```

The complete list of every path this PR changes, the 59 Captain pictures included, with each SHA-256 at the PR's first head, is in the [deliverables index](deliverables.md), version 4.

## 10. Unresolved

| Question | Owner | Meanwhile |
| --- | --- | --- |
| The RELEASE prompt's words ("Jail or Hospital") | Frontend | The storyboard's "Release everyone in the Jail?" |
| A cleared body in the EJECT words | Frontend | The hosted words list it as ejected |
| An ordered off-board history | Backend, for Frontend's Menu | The plaque counts; Frontend lists the seats with `location` null |
| The off-board cards' tab beside the claim's tab | Frontend | One tab per sheet content; both may show in a Code choice during the talk. Not pictured together |
| The hatch as permanent scenery | The owner | Drawn only while EJECT plays |
| When the client says the outcome: on receipt or at `announce` | Frontend | The review page says it at `announce` |
| A film cut by a newer snapshot or the Blackout's window, and two commands in one turn | Frontend | Specified (section 5), not pictured |
| Real phones, a screen reader, the owner's review | — | Not run |
