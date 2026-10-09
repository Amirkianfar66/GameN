# Frontend handoff: the board as the game (board motion, issue #87)

**A proposal, not owner-approved.** Issue [#87](https://github.com/Amirkianfar66/GameN/issues/87). Designed on base `94a49ce0c5220b814ec56333b028fbe6180b257e`, branch `codex/v1-pass-board-targets` ([PR #86](https://github.com/Amirkianfar66/GameN/pull/86), unmerged): protocol 2, engine `full-game-1.1.0`, ruleset `in-person-v1-pass-2026-10-08` (hash `a25cec29…7870183`), Original Powers off; legacy matches (`full-game-1.0.1`, `in-person-v1-2026-10-06`) have no Pass. Tokens 0.4.0, asset manifest `design-0.2.0`, unchanged.

The prototype is `design/board-motion/` (open it with `npm run dev:review --workspace @mothership/design-tokens`, then `http://127.0.0.1:4320/board-motion/`). Every action, cue, state, fact and component is listed in [board-motion-coverage.md](board-motion-coverage.md), generated from `design/board-motion/contract/`. What was run to verify it is in [board-motion-verification.md](board-motion-verification.md). The owner's request is recorded in [owner-decisions.md](owner-decisions.md#8-october-2026-the-board-as-the-game).

**Since 9 October 2026 the characters are full-body comic figures.** The owner asked for characters that feel more like the reference's comic page, saw a pilot and said "lets try full body comic" ([owner-decisions.md](owner-decisions.md#9-october-2026-full-body-comic-characters)). Every piece on the board is a figure posed by public facts: standing in one of three stances, leaning over the chart table or the counter, sitting up in the Hospital bed, on the Jail bench, Eliminated on the floor; a move is a walk. Everything else in this handoff (press areas, cues, words, secrets) is the same design, measured again with the figures. The figures are a proposal asset set (section 9, GAP-7).

## 1. What changes for a player

The comic board stays on screen through a whole turn.

1. **Actions** in navigation opens a compact tray over the lower edge of the board, listing only the actions the player's own view opens. Move is not in it.
2. Choosing an action closes the tray. The characters the view offers for it get a dashed ring at their feet and a **+** tab; everyone else is drawn faint. The strip above navigation asks the release's question ("Choose a target", "Who is the Protection for?").
3. The player taps a **character, in its room** (Hospital and Jail included where offered). Several parts (Scan's guess, Supply's two, the Code's four) are numbered on the characters and counted in the strip; Take back removes the last. Inline answers (Blue, Red, Alien; Abstain; No release request; Yes, No, Abstain) are buttons in the strip.
4. The strip asks to confirm, in the release's words; Confirm sends; the same neutral **Registered** stamp answers every action. Nothing about the outcome is drawn.
5. **Moving** is pressing a room's name tag: a dashed "You?" marks the place tentatively, the strip confirms, and the character moves only when the public update says so, on every screen at once.
6. **Pass** is the middle of navigation, available only on the player's own ordinary turn, absent in legacy matches.

What every other phone and the shared display see during all of it: nothing, until a public fact changes (a move, a health, a phase).

## 2. Who changes what

| Owner | What |
| --- | --- |
| Frontend | `apps/game/`, `packages/presentation/`: the markup, styles, controller wiring and motion of sections 3 to 8 |
| Integration (Codex Astra) | Adopting the three prop layers and the figures into a reviewed manifest revision (section 9), the runtime manifest pin, the crew catalog's rule on poses (GAP-8), and anything in `packages/contracts/`, the engine, Firebase, root manifests, lockfiles or CI. No contract change is requested |
| Game Design and Balance | Rule fidelity of the offers and the disclosure review in section 8; the capacity question GAP-2 with the owner |
| Visual and Motion Designer | This design, its assets, cues and checks: `design/`, `packages/design-tokens/`, `docs/design/` |

Nothing outside the Designer's paths was edited for this work. The reviewed kit (`design/exports/`, manifest `design-0.2.0`, tokens 0.4.0) and the Canvas snapshot (`reference/design-canvas/`) are unchanged.

## 3. Components and the release hooks they map onto

Hooks are those of `packages/presentation/src/markup/comic-shell.ts`, `parts.ts` and `apps/game/hosted/` at the base. *reuse*: keep the hook and its meaning; *extend*: keep the hook, add what the row says; *proposed*: new.

| Component | Prototype | Release hook | Status | What Frontend does |
| --- | --- | --- | --- | --- |
| `board` | `.bm-board[data-board=own\|observer]` | `section.ms-board[data-region=comic-board]`, `#ms-comic-board-heading` | extend | Lay the five rooms out as one page (Command Room across the top; Room A, Room B; Hospital, Jail; a spine between the columns, section 5). Mark the viewer's own board (the prototype uses `data-board="own"`) so private cue rules can be scoped to it |
| `room-panel` | `.bm-room[data-room] > .bm-stage, .bm-prop` | `li.ms-zone[data-zone]` | extend | Draw the approved room picture as an anchored crop, and the prop layer in front of the station behind it (section 5) |
| `room-tag-move` | `button.bm-tag__move[data-move-room] > .bm-tag__face` | `button.phone-room-move[data-move-room]` | extend | Keep the button; make it the press area (at least 44 x 44, `min-width`/`min-height`, `padding: 3px 3px 12px`) and draw the slanted caption on an inner span. An `overflow: hidden` caption cannot carry a larger `::before` press area: it clips it. The release's `openRoomMovement()` stays the only path |
| `room-tag-fixed` | `h3.bm-tag--fixed` | `h3.ms-zone__name` | reuse | Hospital and Jail stay captions, never buttons |
| `piece` | `li.bm-piece[data-seat][data-character][data-station][data-kind][data-pose][data-mirror]` | `.ms-seat[data-seat]`, `.ms-token`, `.ms-seat__number`, `.ms-seat__player` | extend | Place each seat at its station (section 5) as a full-body figure in its pose: a body layer, and over a prop a front layer (`.bm-piece__front`: the hands on the table, the arms on the blanket) above the prop and under the standing. Seat number and name on a plate at the feet or on the prop's edge |
| `piece-target` | `button.bm-piece__target[data-intent=action/choose][data-value=seat-N]` | `button.phone-character-target` | extend | Keep the release's button and intent. On the upper body: `width: max(44px, min(0.8 x figure width, distance to the nearest neighbour in its row - 2 px))`, `height: clamp(44px, 0.55 x figure height, row pitch)`, hanging 0.916 figure heights above the row's floor line; behind a prop, from the head down to 6 px below the prop line and never above the room tag; on the bench, the figure (section 5) |
| `piece-cue` | `.bm-piece[data-target=eligible\|selected\|picked\|pending\|other]` | `.ms-seat[data-board-target=eligible\|picked]` | extend | Add `selected`, `pending` and `other` to the release's two values; draw them only on the own board. The ring is on the floor at the feet; a chosen figure is outlined in the caption color, and behind a prop or on the bench an eligible one thinly too |
| `pick-stamp` | `.bm-piece__pick` | `span.phone-pick-order` | reuse | The pick's number on the character; the strip counts the same picks |
| `move-ghost` | `.bm-ghost[data-state=tentative\|pending]` | none | proposed | While a move is confirmed or sent: a dashed outline of the player's own figure, "You?", at the next free station of the room pressed. Removed by Choose again, a rejection, or the public move arriving |
| `public-markers` | `.bm-badge[data-badge]`, `.bm-reveal`, `.bm-piece[data-active] .bm-piece__turn` | marker labels in `.ms-seat` | extend | The approved marker pictures on the character, the same words in the readable list |
| `ballot-marks` | `.bm-piece[data-subject] .bm-piece__subject`, `.bm-piece__tally` | the vote section's words (`en.vote`) | proposed | "On the ballot" over the subject of a release vote; the published count over each counted character. The room's caption band is 16 px taller while one is shown, so the label is never under the tag |
| `strip` | `section.bm-strip[data-step]` | `section.ms-private.phone-action-dock`, `#ms-action-step`, `section.phone-pass-status` | extend | Section 6 |
| `strip-stamp` | `.bm-stamp[data-kind=pending\|registered\|not-accepted\|unknown]` | the card's status words | proposed | A stamp on the strip's top edge. The words stay the release's |
| `tray` | `section.bm-tray > button.bm-chip[data-act=open:<kind>]` | `[data-intent=action/open][data-kind]` in `.ms-offers` | extend | Two columns of action chips over the lower board (max 46% of the phone); Move filtered out, as the release already does |
| `nav` | `nav.bm-nav > #bm-pass` | `.phone-nav` with `#ms-phone-pass[data-intent=action/pass]` | reuse | Unchanged: Pass third of five, its availability from `legalTargets.PASS_TURN` and the pending-command gate |
| `status` | `header.bm-status` | `.ms-phase__labels`, `.ms-timer` | reuse | Fixed height (52 px; 44 px on a short phone) so nothing below moves when its words change |
| `fx-layer` | `.bm-fx > .bm-flyer, .bm-trail, .bm-puff` | `createComicMotion()` in `apps/game/hosted/comic-motion.mjs` | extend | Section 7 |
| `card-sheet` | `section.bm-sheet#bm-card > .bm-private` | `.ms-private` (Card view), `.ms-role-card` | reuse | Unchanged: built only while open, over the lower board |

## 4. The controller: what stays exactly as the release has it

The prototype mirrors `packages/presentation/src/model/connected-player.ts` and `apps/game/src/connected/action-flow.ts`; the board is only a new place to make the same choices.

- **What can be chosen** is only what the viewer's own view offers: `legalTargets[COMMAND]` for seats, `self.movementDestinations`, `self.releaseVoteAvailable`, `legalTargets.PASS_TURN`, and every seat for a Code attempt when `self.codeAttemptAvailable`. A character not offered has no press area. The engine never offers a player in the Command Room as a local target, nor the actor's own seat for a Shot, Disable or Hack; the fixtures follow it and the check holds them to it.
- **One command at a time.** While a command is in flight or registered-and-pending, Actions opens nothing new, a room tag says "Finish or cancel the current action first.", Pass is unavailable.
- **Steps**: choosing → confirming → submitting (or checking) → accepted, not accepted, or unknown, with the release's words for each. "Accepted" is only what the receipt says.
- **A choice that was not sent does not outlive its conditions** (`action-flow.ts`, the `choosing`/`confirming` branch of the view update). A closed panel, a stale view, time running out or a new phase drops it ("Your choice was not sent.") and every private mark with it. A fresh view that no longer offers what was picked asks to choose again from the start; an action the view no longer opens closes. The prototype draws the first (`robust.dropped`, and the flows background a page mid-choice) and the notice of the second (`robust.withdrawn`).
- **A pending Hack keeps its full minute**: the Hack phase shows its own 60 s timer.
- **Move** stays `openRoomMovement()`: the tag opens the move action, chooses the destination if offered, and says "You cannot move to that room right now." if not. The piece is drawn where the view says, never where the player asked.
- **Pass**: confirm in the strip, a neutral receipt ("Turn passed."), the next phase in the status bar.

## 5. Layout: stations, bands and the crop

All of it is computed on every device from public facts only, so every screen draws the same. The functions are `design/board-motion/js/layout.js` (pure, Node-testable) and `fitBoard()` in `design/board-motion/js/app.js`; the data is `design/board-motion/contract/stations.json`.

**Stations.** Each room has hand-placed formations for one to five occupants (behind the chart table, at the counter, in the bed, on the bench, on the floor); seats fill them in seat order. Six to nine in one room stand in a 3 x 3 crowd (`crowd.slots`), with no picture station. The Final Zone stands everyone in two rows. A station is not a game fact and implies no capacity (GAP-2).

**Picture stations and poses** (`layout.placements()`, `poseOf()`). A picture station is a point of the room's picture where a figure's anchor goes: `kind: prop` (the line below which the prop hides it: C1 the chart table, B1 the counter, H1 the bed) or `kind: seat` (J1, the bench, used for one or two in the Jail). Who takes it is a public fact (`takes`): the Captain at the chart table if the Captain is in the room, the first Injured character in the bed, otherwise the lowest seat; an Eliminated character takes none, and if nobody qualifies (a healed character in the Hospital) everyone stands, at the places of one more without the picture station. The pose is the station's (`leaning`, `inBed`, `onBench`); at a standing place it is `out` for an Eliminated character, and otherwise one of three stances by seat number (`standing`, `standingFolded`, `standingBack`), mirrored right of the room's middle so that everyone faces in. A figure at a picture station is drawn at the picture's scale (`figure`, picture units per figure unit, times `k`); a standing figure is `piece-w` wide and 2.07 times as tall. The shares of each pose's box (anchor, head, plate line) are `design/board-motion/figures/geometry.mjs`.

**Rows.** A room needs 0 rows when empty, 1 for its first occupant (a picture station counts as the back row), 2 up to five, 3 for six to nine. A band takes the larger need of its two rooms, and also knows how many rows of standing figures it holds (`--stand-*`).

**Band heights** (`fitBoard`). For each band: the panel borders, its caption height (a move tag's button, at least 44 px; a fixed caption's height plus 6 px; plus 16 px while a public label is shown over a head), the piece pad (8 px), and then: for standing figures, one row unit per row behind the front one plus the front row's figure height (2.07 x `piece-w`, `piece-w` = 0.74 of the unit, 30 to 60 px) less the crop below; for a band of picture stations only (the chart table, a bed, the bench), 1.1 units. The row unit is the largest from `min` to 74 px that fits, where `min` is **44 px while any character can be tapped** and 30 px otherwise (a confirmation or a receipt), so a taller strip never pushes a room off screen. What is left is shared 0.8 : 1.25 : 1 (top, middle, lower). Measure the caption, do not assume it: at enlarged text it grows.

**The crop at the knees.** On the smallest phones the panel's lower edge crops the front row, as a comic panel does: `crop = clamp(0, (60 px - unit) x 1.7, 0.4 x figure height)`, nothing from a 60 px unit up. The front row's floor line moves down by `crop`; its plates and rings stay whole inside the panel; its press areas, on the upper body, are unchanged.

**Rows inside a room.** A standing figure's feet are at `100cqh - pad + crop - row x row-pitch`, row pitch = `max(row unit, min((area - figure height) / (rows - 1), area x 0.46))`. Stations in one row are far enough apart that two 44 px press areas never touch on a 320 px phone, where a half-width panel is 141 px inside and the Command Room's 306 px; `design/tools/board-motion-check.mjs` verifies every formation from one to nine in every room.

**Press areas on figures.** A standing figure's press area is a band on its upper body that hangs `0.916 x figure height` above its row's floor line, `clamp(44 px, 0.55 x figure height, row pitch)` tall: the same height above the floor line in every row, so rows a row pitch apart never overlap, whatever a figure's depth. Behind a prop it runs from the head (never above the caption band) to 6 px below the prop line, the room's or the figure's own, whichever is higher, at least 44 px. On the bench it is the figure. Widths are at least 44 px and never wider than the distance to the nearest neighbour in the row.

**The picture's crop.** Each room picture is pinned by its anchor line (`view.edge`, in the picture's 1024 x 768 units) at `anchor = cap + min(at x area, area - clear)`, and scaled to cover the panel: `k = max(width / cw, anchor / edge, (height - anchor) / (768 - edge))`. `clear` is 0, except in a room with a used prop and figures standing in front of it, where it is `0.92 x figure height + 6 px`: the prop line rises until it clears the front row's press areas. The bed and the bench are under their room's caption (`clear: true` in `stations.json`): on a short panel their figure sinks into the bed or onto the bench rather than put its head under the caption.

**Short phones** (app height 640 px or less; in the runtime, where the app fills the viewport, `@media (max-height: 640px)`): status 44 px, navigation 56 px, gutter 4 px, the strip's words 13/11 px. Measured at 320 x 568 with the strip in every state (section 10).

**Enlarged text** (width under 18 em): the board scrolls inside itself and is never clipped; names leave the name plates, numbers stay; the strip's answers may wrap.

## 6. The strip

`section.bm-strip` sits in its own grid row above navigation, so the board shrinks and nothing is covered.

- The action's name (`.bm-strip__kind`, a slanted caption) is set into the question; the question is `#bm-strip-line`, focused after every step (`tabindex="-1"`, `aria-live="polite"` on the strip).
- **One control at the side** (`.bm-strip__side`): Cancel or "Take back Player N" while choosing; Done, OK or Check again after the answer.
- **One row beneath** (`.bm-strip__controls`): inline answers of equal width; a single answer (Abstain, No release request) shares the row with Cancel; a long "Take back Player N" with no answer takes the row itself; Confirm (primary) with Choose again.
- Progress of a Supply or a Code attempt: numbered dots inline at the start of "Chosen so far: …".
- The receipt's stamp sits on the strip's top edge; the release's receipt words are the line and its detail.

## 7. Motion

Every cue, with trigger, audience, facts, anchor, duration and easing, cancellation, settled state, reduced-motion form and asset, is in [board-motion-coverage.md](board-motion-coverage.md#cues) and `design/board-motion/contract/cues.json`. Six are the reviewed cues of `design/contract/motion-cues.json`, unchanged: `cue-selection`, `cue-registration`, `cue-public-move`, `cue-status-change`, `cue-phase-change`, `cue-round-transition`. The others are proposals: `cue-tray-open`, `cue-strip-enter`, `cue-target-eligible`, `cue-target-pick`, `cue-pending`, `cue-not-accepted`, `cue-unknown`, `cue-room-press`, `cue-move-tentative`, `cue-sheet-open`, `cue-turn-accent`, `cue-tally`, `cue-ballot-subject`, and `layout-reflow`. Every duration is a token of 0.4.0 (`selection` 120, `registrationStamp` 120, `cardTransition` 220, `roundTransition` 700, `pieceMove` 900, `reducedMotionFade` 80); no token changes.

**The public move** extends `createComicMotion()` and keeps every rule it has: positions taken before the redraw; `movedPublicSeats()` (four or fewer moves in one update, else none); no motion when the page is not visible, after a gap of more than a second, on the first or a reconnected snapshot, or with reduced motion. What changes: the moving character walks across in a layer over the board (`.bm-fx`, `pointer-events: none`), drawn in the `walking` pose and facing the way it goes, from its feet where it was to its feet where it is now, in an arc lifted `22 + hop` px and settled by `settle` degrees (the character's own public flourish, `CREW` in `design/board-motion/js/fixtures.js`); the real piece (body and front layer) is hidden until the walk ends; an ink trail and a landing puff (approved `fx-ink-trail.paper`, `fx-landing-puff.paper`) fade by 900 ms. Co-occupants slide to their new stations in 220 ms (`layout-reflow`, not a cue); one whose new station gives it another pose (it now takes the counter) fades in where it is instead.

**Rules Frontend must keep** (the prototype's director, `design/board-motion/js/director.js`, is a working reference):

- Public cues start only from a difference between two drawn public views. Same revision: nothing. A newer change to a seat withdraws that seat's cue in flight; the latest view is what is drawn.
- No cue is queued, none blocks a control or a deadline, and none changes state: animation completion never submits, spends or advances anything.
- Reduced motion (the device setting or the in-app one): no flight, trail, lift, shake or zoom. Arrival, status changes, stamps and sheets use the 80 ms fade. Same facts, same controls.
- Nothing repeats; nothing moves while nothing happens; no camera motion.

## 8. Secrets: the checklist for the implementation

- Private cue rules (`[data-target]`, press areas, pick numbers, the tentative move) are scoped to the viewer's own board, so a private element that leaked into a public board would still not be drawn. The check enforces this in the prototype's stylesheet.
- The same **Registered** stamp and the release's receipt words for every action: no per-action effect, color, sound or vibration.
- No cue on any public surface for a shot, Disable, Protection, Rescue, Hack request, Scan, Supply or Code attempt; no attacker, weapon, projectile, BANG, block, giver or cause on a health change. Protection stays the Undercover's private fact, including to its recipient.
- Public facts only from `PUBLIC_MOVE`, `PUBLIC_HEALTH_CHANGED`, `PHASE_CHANGED` and the public view (`seats[]`, `activeSeatId`, `round`, `phase`, `ballot.releaseTargetSeatId`, `lastTally`). The full fact-to-source table is in [board-motion-coverage.md](board-motion-coverage.md#facts-and-where-they-come-from).
- No sound, haptics or per-action asset request. The prop layers are public art, loaded once with the public board; the role devices stay in the roles bundle and the private card.
- The card and its device exist in the document only while the card is open; the private live region is emptied when nothing private is open.
- A character's look never selects a rule: the stylesheet keys characters only for their picture.
- A figure's pose comes only from public facts: the station (who is in the room, by seat number), the Captain, Injured, Jailed, Eliminated. Nothing private chooses a pose, a station, a stance or a facing; the check looks for private words in `layout.js`. Every pose of every character is in one stylesheet loaded before the first match view, whatever the role, so drawing a pose never fetches one.
- **Verify** on the real runtime what the prototype verified on itself (section 10): with one phone choosing, sending and receiving for every action, every other client's DOM holds no private mark and both boards agree where everyone stands.

## 9. Assets and tokens

**Prop layers (GAP-5).** Three public layers, lifted element for element from the approved room sources and printed with their reviewed recolor maps by `design/tools/board-motion-assets.mjs`: the Command Room's chart table, Room B's laboratory counter and the Hospital bed. They are proposals (`board-motion-0.1.0`, `design/board-motion/assets/manifest.json`), outside the reviewed manifest. To adopt them, Integration would add the three proposed export variants (`board-command-room.layer-prop-table`, `board-room-b.layer-prop-counter`, `board-hospital.layer-prop-bed`) to `design/source/export-recipes.json` in a reviewed export revision, rebuild, and move the runtime's manifest pin (`apps/game/hosted/comic-assets.mjs` requires `design-0.2.0`). Until then the runtime can draw the board without them: characters behind a prop then stand in front of it.

**Figures (GAP-7, DSN-D32).** The nine characters in nine poses, drawn by one rig in `design/board-motion/figures/` (`rig.mjs` the comic drawing: ink, a cel shadow away from the upper-left light, halftone and hatching inside it; `crew.mjs` the characters, their skin, field and accent being `color.crew` of tokens 0.4.0 and their hair `color.crewHair` or a public tone, as on the approved standees; `poses.mjs` the skeletons; `geometry.mjs` the boxes and anchors). `design/tools/board-motion-assets.mjs` writes 99 SVG files to `design/board-motion/assets/figures/` (81 figures and 18 layers over a prop; `atConsole` is drawn but used by no station yet) and the eight poses the board draws into one stylesheet, `board-motion.figures.css` (`--bm-figure-<character>-<pose>[-front]`, 1.5 MB as written, about 110 KB with gzip and 20 KB with brotli), listed in the manifest `board-motion-0.2.0`. Every figure stays inside the drawing vocabulary and the crew palette, holds its own three colors and no other character's: the check verifies each one. A piece draws its pose through two custom properties set from public facts (`--fig`, `--fig-front`, see `setFigure()` in `board.js`). To adopt them, Integration would add the figures as `piece-crew` variants in a reviewed export revision (the proposed ids are in the manifest), rebuild the public bundle and move the runtime's manifest pin; whether the runtime then draws them as vector or as sprites made from them is Frontend's to measure on phones. The approved standees and the bust card stay as they are until then; the card stays the private role card's picture.

**The Final Zone (GAP-6)** has no picture in the kit; the prototype uses the paper ground with the approved halftone and speed lines.

**Tokens.** None changed or added. The prototype's own custom properties (`--bm-motion-*`) are aliases of 0.4.0 names.

## 10. Tests Frontend should add

The prototype's own flows (`design/tools/board-motion-flows.mjs`, 73 steps) and measurements (`design/tools/board-motion-capture.mjs`) are the specification. In the runtime:

1. For every action kind: the eligible characters are exactly `legalTargets[COMMAND]` (every seat for Code), each with its own press area, none in the Command Room or the actor's own seat where the engine excludes them.
2. Every press area at least 44 x 44, on screen, inside its room, hit at its centre by itself, overlapping no other and no room tag, at 320 x 568, 360 x 740, 390 x 844 and 430 x 932, with all nine in one room.
3. No page scroll at any of those sizes in any strip state; at 200% text the board scrolls inside itself and nothing is clipped.
4. Two clients: for every action and step, the other client's DOM has no private hook, press area, pick number, tentative move, stamp or role word.
5. Replay of the same snapshot plays nothing; a reconnect plays nothing and stops what was in flight; five moves in one update fly none; reduced motion flies none and draws the same facts.
6. Backgrounding while choosing drops the choice and its marks; a stale view pauses Actions.
7. Pass: third of five; available only on the own ordinary turn; absent in legacy; a pending Hack keeps its full minute.
8. Room tags: Hospital and Jail are not buttons; an unoffered room and a tag pressed during an open action say the release's words and open nothing.
9. Keyboard: Tab reaches every press area; Enter picks; Escape goes back; focus lands on the strip's question.
10. Poses: the Captain at the chart table; the first Injured in the Hospital in the bed and a healed character standing; one or two Jailed, the lowest on the bench; an Eliminated character on the floor and never at a picture station; a stance by seat number, kept wherever the character goes.

## 11. Words

The release's words are reused exactly: the check compares every phrase in `design/board-motion/js/copy.js` (`COPY`) with the built `en`, and finds every shell phrase (`SHELL`) verbatim in its file. New words, all proposals: the stamps **Sending**, **Registered**, **Not accepted**, **Unknown**; **You?** on the tentative move; **On the ballot**; "Your character moves when the board update arrives." and "Your character is shown where the server has it." after an accepted move; "This match has no Pass." and "Pass is available on your own turn." for a pressed, unavailable Pass; "Player N is no longer offered. Choose again."; and the room subtitles **Captain**, **Engineering**, **Laboratory** (GAP-4, `aria-hidden`).

## 12. Gaps and open decisions

| Id | What | Who decides |
| --- | --- | --- |
| GAP-1 | Jailed, Captain and revealed-faction changes have no event of their own; drawn from the difference between two views. No contract change proposed | — |
| GAP-2 | The owner's reference asks for at most five in a room; the rules have none (`rules/overlays/location-board-layout-v1.json`). Five comic positions per room, a crowd formation for six to nine. A capacity would be a rule change | Game owner with Balance (DSN-D27) |
| GAP-3 | The reference draws corridor arrows; the rules give no adjacency. A spine with lamps, no arrows | Game owner (DSN-D28) |
| GAP-4 | Room subtitles from the reference, not the rules or the release | Game owner (DSN-D29) |
| GAP-5 | The prop layers are outside the reviewed manifest | Integration (DSN-D30) |
| GAP-6 | No Final Zone picture in the kit | Game owner, later asset work |
| GAP-7 | The full-body figures are outside the reviewed manifest; the runtime still draws the bust standees | Integration and Frontend (DSN-D32) |
| GAP-8 | The crew catalog says a character never changes with health, Jail or the Captain; a figure's pose does, from public facts | Game owner with Integration (DSN-D33) |

Also open: whether the board-as-game direction replaces the release's board-plus-list layout on phones (DSN-D20); the proposed cues (DSN-D31). See [README.md](README.md#open-decisions).
