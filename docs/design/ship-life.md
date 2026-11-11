# Ship life: activities, wider rooms and local food capsules

**A design package for the owner and Frontend (11 November 2026). The owner approved it and chose a fifth wider** ([owner-decisions.md](owner-decisions.md#11-november-2026-ship-life-approved-the-rooms-a-fifth-wider)). It covers four things:

- what the people at each of the 20 places do while others take their turns;
- today's room framing beside two wider ones;
- a food capsule in each room but the Hospital;
- the visit a character makes to it after their turn.

Every part is a design asset or a working preview with labelled fixtures. **None of it is in the game, in a release, or wired to a match yet;** Frontend builds it. No phone has run it. The previews and films are desktop Chrome renders.

The owner's request is recorded in [owner-decisions.md](owner-decisions.md#11-november-2026-ship-life-the-request). The package keeps to it:

- an activity belongs to a place, never to a character, a role or a private choice;
- everything is cosmetic: nothing spends a move or an action, nothing decides or counts food;
- the Hospital has no capsule and no visit;
- the order is the latest after-turn order;
- the game's rules are untouched.

## What is here

| Part | Where | State |
| --- | --- | --- |
| The 20 places' activities | [`design/ship-life/activities.mjs`](../../design/ship-life/activities.mjs), mapped in [`positions.mjs`](../../design/ship-life/positions.mjs) | Design, previewed |
| Props the rig does not draw (parcel, wire, cloth, portion, wrapper) | [`props.mjs`](../../design/ship-life/props.mjs) | Design |
| The four food capsules and their states | [`capsule.mjs`](../../design/ship-life/capsule.mjs); placements in `positions.mjs` | Design |
| The visit (stocked, brief, empty) | [`eating.mjs`](../../design/ship-life/eating.mjs) | Design, previewed |
| When visits play, and what stops them | [`schedule.mjs`](../../design/ship-life/schedule.mjs) | Proposal, previewed with fixtures |
| Today's framing and two wider ones | [`framing.mjs`](../../design/ship-life/framing.mjs) | The owner chose a fifth wider |
| The ceiling and deck past each picture | [`extend.mjs`](../../design/ship-life/extend.mjs), [`assets/*.extend.svg`](../../design/ship-life/assets) | Design |
| The live stage and the preview | [`stage.mjs`](../../design/ship-life/stage.mjs), [`preview.html`](../../design/ship-life/preview.html) | Working preview |
| Sheets, storyboards and silent films | [`framings.html`](../../design/ship-life/framings.html), [`boards.html`](../../design/ship-life/boards.html), [`review/`](../../design/ship-life/review) | Review files |
| The handoff record | [`handoff.json`](../../design/ship-life/handoff.json), written by `design/tools/ship-life-export.mjs` | Generated |

**Sources, used unchanged:**

- **Rooms:** the approved pictures, `room-drawing-1.0.0`, from the release candidate in [Amirkianfar66/GameN#197](https://github.com/Amirkianfar66/GameN/pull/197). This package is stacked on it.
- **Crew:** `crew-drawing-1.0.0`.
- **Rig:** the `board-motion-0.3.0` figures.
- **Places:** the scenes, and the Hospital's ward of four.
- **Ambient motion:** the phone pack's windows, screens and lights.

The crew keep their identities, clothes and proportions, and Mira's hair stays uncovered: the figures are the approved drawings, posed.

## The 20 places

**An activity is a short action, a pause, sometimes a variation, then a clean return to the resting pose.** A rest of 1.6 to 4.2 seconds follows. Each place and seat has its own seed, so nothing moves in step.

When a character's turn begins, their work stops and they hold the resting pose: the attentive one. Real events always come first. Under Reduce motion every place holds its resting pose.

| Place | Activity | Props |
| --- | --- | --- |
| A1 PC workstation | Types; pauses to read, leaning in; glances at the other screen; turns a control | — |
| A2 Open deck | A checklist from the belt, read; a glance round; put away | Clipboard (the rig's) |
| A3 Floor hatch | Small turns of the wrench; the fitting looked at closely; sits back a moment | Wrench (the rig's) |
| A4 Crates | Reads a label; tugs a strap; lifts the parcel from the crate top, looks it over, puts it back | Parcel (waits on the crate) |
| A5 Electrical panel | Traces the cables; draws out a wire and turns its connector; pushes it back; sometimes tightens a terminal | Wire, wrench |
| B1 Tablet | Scrolls, taps, looks up at the equipment | Tablet (the rig's) |
| B2 Laptop | Types; sits back; tilts the screen | Laptop (left on the stool during a visit) |
| B3 Specimen tank | Wipes a patch of glass with a cloth; looks in closely | Cloth |
| B4 Sample bench | Lifts a sample to the light, turns it, puts it back; squares the tray | Flask (the rig's) |
| B5 Microscope | Looks through it, turns the focus, looks up, looks again | Flask (the rig's) |
| C1 Captain's table | Looks over the table's instruments; shifts the hands; reads a small status tablet. **Never** a pointing hand, a line, a direction or a confirmed course | Tablet (the rig's, neutral) |
| H1–H4 Berths | Rest only: quiet breaths, blinks, a small move of an arm, the blanket or the head | — |
| J1 Bench | Rubs the hands; shifts the elbows; looks up | — |
| J2 Door | Up on the toes to glance through the slit (it does nothing); the hands shift. **Never** an escape, lock picking or any way out | — |
| J3 Wall | Foot down from the wall; arms unfolded, then folded; a look round | — |
| J4 Floor | Straightens up; taps the fingers on a knee | — |
| J5 Cot | Moves the head; stretches a hand; settles | — |

The sheets show each room's places, rest first: [`activities-<room>.png`](../../design/ship-life/review).

## The food capsules

**One family of devices in the ship's comic language,** drawn in the crew's ink. Each has:

- a steel housing;
- a paper hatch with a handle that slides up;
- a compartment with a tray for a portion (and for the wrapper afterwards);
- a vent;
- a small light.

The mounting suits each room. Each sits where it covers no place, station, panel or window:

| Room | Mounting | Where | The visitor stands |
| --- | --- | --- | --- |
| Room A | Wall unit | In the recess between the pillar and the lockers | Right of it, before the lockers |
| Room B | Counter unit | On the bench's right end, over the bench | Right of the specimen tank; reaches across |
| Command Room | Counter unit | On the console's right end, beside the window's frame | Right of the chair; reaches right |
| Jail | Ration hatch, flush in the wall | Between the door's frame and the keypad, reached without leaving the Jail | Before the door's right side |
| Hospital | **None** | — | No visit plays there |

**The visitor always stands beside the device, never in front of it,** so their body never hides the hatch.

**The light says the state without a word or a colour code:**

| State | Light | When opened |
| --- | --- | --- |
| Stocked | A warm glow | The tray holds a portion |
| Empty | Dark glass | The tray is bare |
| Not known | A steel shutter over the light | Not opened: no visit plays |

Not known never looks like empty. See [`devices.png`](../../design/ship-life/review/devices.png).

The private-talk capsule is a separate space and has no food device.

## The visit

**Once a round, after a character outside the Hospital finishes their turn:**

1. their work stops;
2. they get up and walk to the room's capsule;
3. they open the hatch and take a portion;
4. they turn to the room and eat (two bites, one after a long walk);
5. they turn back, put the wrapper in the tray and shut the hatch;
6. they walk back and settle, and the work starts again.

**Length:** 6.5 to 7.7 seconds from every place ([`handoff.json`](../../design/ship-life/handoff.json) lists each).

**The walk stays in the room, and goes round what the picture cannot hide a walker behind.** Room B's specimen tank is one example. In Room B the walker crosses behind the bench, and in the Command Room behind the table, at those layers' own depths. A walker shrinks and grows along the room's depth line.

**Empty:** the visitor opens the hatch and lets go, so the bare tray shows. A look, a small shake of the head and a breath out. They shut it and go back. No alarm, no penalty, no word.

**Brief:** one quick bite, the hatch shut at once, about 4.8 to 6 seconds. It is for a visitor who waited for the capsule, or the last player before a phase changes.

**Storyboards:** [`visit-<room>-<kind>.png`](../../design/ship-life/review).

**Beat by beat** (milliseconds, in `eating.mjs` `BEATS`):

| Beat | ms |
| --- | --- |
| Stop | 220 |
| Get up | 400 seated, 280 standing |
| Walk | 400–1,200 at 0.32 units/ms, a step every 200 ms |
| Arrive | 300 |
| Grip | 280 |
| Open | 320 |
| Reach in | 220 |
| Take | 240 |
| To the chest | 200 |
| Turn | 320 |
| Bite | 240 |
| Chew | 400 |
| Wrapper | 280 |
| Shut | 240 + 320 |
| Settle | 360 (480 seated) |

## When visits play

`schedule.mjs` decides this; the "order" and "stop" films show it.

- **Order.** Visits follow the after-turn order, as turns end. Player 1 finishes and eats while play goes on, then Player 2, and so on. Play never waits for a visit: the next turn, a conversation or a phase starts on its own schedule. There is no eating phase.
- **One visitor at a capsule at a time.** A visitor whose capsule is in use keeps working, then sets off to arrive just as the one before leaves. They pass in the room, never at the capsule.
  - A wait of more than 1.5 seconds makes the visit brief.
  - A wait of more than 6 seconds drops it. There is never a queue of people.
- **What stops a visit at once:** a real move, an injury or elimination, a conversation the character is in, the game leaving turn play, or the lights going out. The figure is back at its place in 0.3 seconds: out where it stands, in at its place. The real event then plays from the place as today. Leaving turn play stops everything, so the last visits are cut short and never delay the next phase.
  - The same event before a visit begins, while the visitor still waits for the capsule, drops it. The visit never begins, so nobody walks after the phase has changed or the lights have gone out, and the capsule stays free for the next visitor.
  - **Which phase change stops** (Integration's review of #230). The engine opens a new phase, with a new id, at every player's turn, and a visit carries on into the next player's turn, so a new phase id alone is not a stop.
    - **Turn play** is a player's turn, `ORDINARY_TURN`, and the Hack steps inside it, `HACK_DECLARE`, `HACK_RESULT` and `HACK`. In the full and the planet game alike, the engine goes from these only to the next player's turn or out of turn play.
    - **Every visit stops** when the public phase's kind leaves turn play. That covers the lights going out (`BLACKOUT`), a vote or its result, a Blackhole's presentation, a new round's start, the Showdown, the end, an abort, and any kind not on this list, such as a later version's.
    - `schedule.mjs` exports the list as `TURN_PLAY` and the check as `phaseStops(kind)`, and `handoff.json` carries the list as `turnPlayPhases`. This changes no game rule.
    - In today's engine the round's last turn ends as turn play does, so that turn's visit does not begin.
- **Targeting is private.** When a player opens a targeting choice, their own phone puts every visitor back at their place and starts none while it is open. Nothing is sent and other phones carry on, so a private choice changes nothing anyone else sees.
- **The Blackout** keeps the frame and the places frozen: no visit or activity plays with the lights out.
- **No replay.** A visit is keyed by its round and seat. A phone that comes back (a reload, a reconnection, the app brought back) plays a visit already under way only if it began less than a second ago by the game's clock and has not been stopped. An older one, a stopped one, or one already played on that phone, is done. A visit yet to begin plays when it begins.
- **Nothing plays** in the Hospital, for an Eliminated character, when availability is unknown, or with Reduce motion.

**The logical place never moves.**

- During a visit, the character's tag and 44-pixel press area stay at their place, and the walking figure carries neither.
- Tapping the place targets them, as today.
- Opening a targeting choice brings the figure home first (see above).

## Wider rooms

[`framings-<room>.png`](../../design/ship-life/review) sets each room's three framings side by side. The phones are 320 × 568, 390 × 844 and 430 × 932, between the pack's bars, with the position ids, the press areas, the capsule and its visitor's spot.

- **Today:** the phone pack's framing, `phoneFrame`. It was corrected in #229 so that nobody present is cut off as drawn: each figure's measured outline stays whole, not only its press area.
  - **With the activities:** each present figure's outline is also its activity's.
    - `activity-extents.mjs` holds every pose each place's activity takes, with what the hands hold, measured for all nine characters by `design/tools/ship-life-extents.mjs`.
    - Some reach well past the resting pose: A5's wire work by 18 units, J5 sitting up on the cot by 18, A1 by 15.
  - **Tested:** given the pack's own outlines, this framing is `phoneFrame` exactly.
- **A tenth wider and a fifth wider.** The filled view's scale is multiplied by 0.9 and 0.8. Where the people present already zoomed it out further, that zoom-out stands.
  - Only the room is smaller. Bars, tags, buttons and press areas keep their size, and press areas stay at least 44 pixels.
  - Across, every figure stays whole doing its activity, 4 px inside the sides, and every press point 48 px inside. The capsule and its visitor stay in view too where they fit.
  - The framing never moves for an activity or a visit, and the Blackout keeps it.
- **A full room is already smaller today.** The sheets show each room full, the busiest case.
  - A full Room A, Hospital or Jail zooms out under T1, so that everyone stays whole doing their activities. There, a tenth wider is today's framing.
  - With fewer people present, today's framing is the filled view, and the wider ones differ in full.
- **The ceiling and deck past the picture.** Each room picture ends at its drawn border; a wider view shows more height than that. The extension bands continue the ceiling above and the deck below. They are sampled from the picture's own edge and feathered over it, then fall into the room's shadow, 200 units each way. They also fill the bands a full Jail shows today.

**Results at 390 × 844 (`handoff.json` has every phone):**

| Room (as on the sheets) | Today | A tenth wider | A fifth wider |
| --- | --- | --- | --- |
| Command Room | Capsule outside | In view | In view |
| Room A (full) | In view: the full room zooms out | In view (today's framing) | In view |
| Room B | Capsule outside | Outside | In view |
| Hospital | No capsule | — | — |
| Jail (full) | In view | In view | In view |

**The owner chose a fifth wider** ("approved, go with a fifth wider", 11 November). It is the only framing that shows every capsule, and so every visit, on every phone the pack reviews, and it gives the rooms the space the owner asked for. The sheets mark it "the owner's choice".
- **What to build:** `roomFrame(scene, panel, present, { zoom: 0.8, room })`. It is the pack's corrected framing (#229) at 0.8 of the filled view's scale, with each figure's activity outline, the capsule kept in view where it fits, and the extension bands past the picture.
- **When:** with the approved room pictures (#197), since the bands are drawn for them. Until then the game keeps the corrected T1 framing (#229).

**The cost** is smaller figures: on the 390 phone about 156 pixels tall instead of 195, and on the narrow phone about 110.

**The board overview** keeps the game's own framing in each panel ([`framings-board.png`](../../design/ship-life/review/framings-board.png)). The capsules are drawn and their lights show availability. Everyone holds the resting pose, and no activity or visit plays: at that size no gesture reads, and it saves the work.

## For Frontend

**What the game must supply.** None of this exists in the contract today; each is a dependency:

1. Each turn's end, in order, with the seat, its room and place, and the round.
2. Each room's food availability: stocked, empty or unknown. Unknown plays no visit.
3. Whether availability is public. A player who may not know it sees unknown.
4. Real moves, injuries, eliminations, conversations and the public phase's kind, as today. Every visit stops when the phase leaves turn play; a new player's turn is not a stop.
5. The game's clock, for the no-replay rule.

**What to port** (the review files show the target at the same state and size):

- the modules in `design/ship-life/`: activities, props, capsule, eating, schedule, framing, and the measured activity outlines (`activity-extents.mjs`; measure again with `node design/tools/ship-life-extents.mjs` when an activity changes, as its test asks);
- the five extension pictures;
- the numbers in `handoff.json`;
- the pack's corrected framing (#229), which every framing here builds on.

The stage shows the composition. Each live figure is posed in place with the crew release's `crewPoseFrame` and `applyCrewPose`, and remounted when the rig switches what cannot blend, as the crew review does.

**Layer order:**

| Layer | z |
| --- | --- |
| The picture | 0 |
| Its extension, over the border | 0 |
| The ambient layer | 1 |
| The capsule | 2; 942 in Room B, over the bench |
| What waits at a place | 2 × depth − 1 |
| A figure's body, with what it holds | 2 × depth |
| A room layer | 2 × depth + 1 |
| A figure's front layer | 1500 + depth |
| The interface, unchanged | Above all |

Depth is the place's (`slot.depth`, else its feet), or the path's on a walk.

**Cost and performance:**

- A room view poses at most one figure per place each frame, about 15 to 25 attribute writes per figure.
- A figure at rest needs only the head's frame (`crewFrame`).
- Pause everything in a background tab, as the ambient layer does.
- Not measured on a phone.

## Gameplay dependencies, flagged and not decided

- **Food availability and its visibility** come from the future approved gameplay contract. The package invents no stock count, no shared or local inventory and no hunger.
- **Who eats:** every character outside the Hospital who ends a turn, Jailed included (at the ration hatch). Whether a character who does not take a turn eats is the contract's.
- **The round and the turn-end event** in the public view, for the order and the no-replay key.
- **Integration's requirements for adoption** (#230, 11 November 2026). These are integration requirements, not food rules:
  - No eating visit plays until approved food availability, with its audience, and authoritative, ordered turn endings exist. Today's projected events are not a public stream of ordinary turn endings, and neither `activeSeatId` nor the private journal may stand in for one.
  - Unknown is not empty.
  - During a Blackhole, a branch's own placements never become shared-screen information.
  - The future, versioned contract binds each occurrence to the match, round and seat, the original server time, its audience and a stable identity. A retry, a reconnection or a discarded reality never replays a meal.
  - Still undefined: the initial and change policy, the Blackhole's inventory scope, the audience, and any visit for a player without an ordinary turn.

## Review files

| Kind | Files |
| --- | --- |
| Sheets | `framings-<room>.png`, `framings-board.png`, `activities-<room>.png`, `visit-<room>-<kind>.png`, `devices.png` |
| Silent films (H.264) | `room-a-{stocked,empty,unknown,reduced,order}.mp4`, `room-b-{stocked,stop}.mp4`, `command-room-stocked.mp4`, `jail-{stocked,empty}.mp4`, `hospital-life.mp4` |
| Record | `renders.json`, with each file's SHA-256 |

**Regenerate:**

- `node design/tools/ship-life-render.mjs --extend --sheets --films` needs Chrome (`CHROME_PATH`) and ffmpeg.
- `node design/tools/ship-life-export.mjs` writes `handoff.json`.
- `npm run test:design` runs `packages/design-tokens/test/ship-life.test.mjs`.

**Not shown by any of it:**

- how a phone runs it, or its timing and battery cost there;
- how players read it in a real match;
- anything about a rule.
