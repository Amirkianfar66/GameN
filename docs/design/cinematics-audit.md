# Cinematics audit: what keeps each film short of AAA

**Status (15 November 2026):** an audit by the Motion & Cinematics builder for the Lead Designer, at the owner's word of 15 November: "improve the cinematics to make it more like AAA animation cinematic". The owner had played the live staging build. Nothing here changes a film; the pilot that follows is the boarding, as a new version.

**16 November 2026:** the pilot is built and measured, for the Lead's review and then the owner's: [the boarding film, version 2](components/boarding-film.md). The plan below is as it was written before the build; where the two differ, the component's document is what was built.

Each film is judged against six things: **camera** (multi-plane depth, push-ins, rack focus, match cuts), **light** (beams, rim light, bloom, a grade per beat), **acting** (anticipation, overlap, follow-through, secondary motion), **effects** (particles, sparks, dust, shockwaves, flares), **timing** (establish, build, payoff; holds; eases; smears) and **titles** (how the type moves).

## The first finding: the live films stutter

The pre-game films were approved on 8 November from review videos rendered offline at 60 frames a second. The live game does not play those videos. It draws each film live: every frame, the film writes a whole SVG picture as text (about 285 KB for the boarding), and the player parses it and reconciles it into the page (`apps/game/hosted/planet/pregame-scene.mjs`), at most 30 times a second.

Measured here in desktop Chromium (headless, 390 × 844 at 2x), playing each film in real time through the live player. The slowdown is Chromium's CPU throttle, a rough stand-in for a phone. **No phone was measured.**

| Film | Desktop: pictures a second | Desktop: script per picture (median) | 4x slower CPU: pictures a second | 4x: script per picture (median; 90th percentile) |
| --- | --- | --- | --- | --- |
| Boarding (8 players) | 18 | 24 ms | 6 | 70 ms; 205 ms |
| Role film (Doctor) | 20 | 29 ms | 7 | 112 ms; 182 ms |

- The boarding's outdoor shots cost most: 124 to 224 ms of script a picture at 4x. The page holds about 4,700 SVG elements and 16 filters.
- A film at 6 pictures a second cannot read as AAA, whatever is drawn. The approved craft (the light, the dust, the grain) is in the pictures, and the phone cannot show them moving.
- So AAA here needs two things together: more craft in each beat, and a way of playing that a phone holds at 60. The second decides how the first is built.

## Every cinematic

| Film | Where it lives; version | Where it plays | Length and clock | What keeps it short of AAA |
| --- | --- | --- | --- | --- |
| **Brand intro** | `design/pregame-films/brand/`; live as the exact port in `apps/game/hosted/pregame-films/brand/` (`design-0.8.0`) | Public: every phone, at the app's first entry | Exactly 2,000 ms, on a local clock | Simple at the owner's word of 8 November (black, the name typed), so little is "missing". If more is wanted: the name has no payoff after it is typed (it only fades); the letters are flat, with no light or depth; the keys land without weight. Sound would do most here |
| **Role films** (nine roles, eight films) | `design/pregame-films/roles/`, `pregame-role-films-1.0.0`; live port `design-0.8.0` | Private: the player's own phone, in the role-reading stage | Exactly 10,000 ms, local from the reveal; beats at 3,000, 4,500, 6,000, 7,800 and 9,300 ms, the same for every role | 1. Playback: 7 pictures a second at 4x (above). 2. Acting: one reach-and-raise in 3 s; the face never changes; nothing overlaps or follows through. 3. Camera: one slow push; the three panels are still tableaux with a small loop each. 4. Layout: the lower third of the phone is empty in the opener, and each panel is a third of the screen. 5. Timing: three panels in 4.8 s read as a slideshow; the title is plain at the owner's word (keep) |
| **Boarding** | `design/pregame-films/boarding/`, `pregame-boarding-1.0.0`; live port `design-0.8.0` | Public: every phone and the display, before Round 1 | Exactly 10,000 ms, from the server's interval (`t` = server now − `startsAt`); the public roster is its only input | 1. Playback: 6 pictures a second at 4x. 2. Camera: four flat shots with a slow drift; three planes at 0.92, 0.97 and 1, so no depth shows; no foreground, no focus. 3. Acting: one shared walk cycle; stiff torsos; nobody looks at the ship, the planet or each other; inside, the crew stands frozen for 3 s. 4. Light: the doorway is a flat white rectangle; faces do not warm as they near it; no long shadows; inside, the lamps switch on and everyone brightens at once. 5. Composition: on the ramp a figure is about 15 % of the frame's height; the top and bottom thirds of the phone are empty in most shots. 6. Effects and timing: only dust motes; the ramp, door, seam, ports and engines all happen in 0.75 s with no anticipation; the mark lands with no impact frame |
| **Transit** | `apps/game/candidates/planet-library/transit.mp4` (Integration's approval of 6 November); drawn by `design/library/navigation/films.mjs` on `claude/designer-library-navigation` | Public: every phone and the display, seen through the board's room panels at 85 % | 2,433 ms of 30-frame video, sought to the server's movement time | 1. A flat ship in profile slides across empty stars: one plane, no camera. 2. No light on the hull from its own engines. 3. Thin streaks are the only effect. 4. It is a backdrop cut up by the room panels, not a moment |
| **Blackhole** | `…/planet-library/blackhole.mp4`; drawn by `design/cinematic/pilots/blackhole/` | Public, through the room panels at 88 % | 3,633 ms of 30-frame video inside the server's 6,000 ms `BLACKHOLE_PRESENTATION` | 1. The disk does not turn, lens the stars or pull at anything. 2. No build: the ship drifts in, a ring flashes, and it cuts to a close hull. 3. No shake, shockwave or debris at the moment itself. 4. One grade throughout |
| **Arrival** (Blue, Red) | `…/planet-library/arrival-{blue,red}.mp4` | Public, through the room panels, at the terminal arrival | 4,233 ms of 30-frame video from the `FINISHED` phase's start | 1. The planet arrives as one flat disc scaled up. 2. No atmosphere, cloud or terrain depth; no entry glow. 3. The ship is rigid: it tilts and a beam opens. 4. No payoff beat: it ends on the pose |
| **Rescue** | `…/planet-library/rescue.mp4` | Public, through the room panels | 1,433 ms of 30-frame video | Too short to stage: one move, no anticipation or aftermath |
| **Room films** (the Captain's and the Hospital's) | `design/room-drawing/runtime/` on #262, `room-drawing-1.0.0` (a candidate); drop-ins for the board's film art | Public, inside a room's panel on the board | Set by the board's film player (`apps/game/hosted/board-v2-films.mjs`); not timed again here | Not judged frame by frame here: #262 redraws their pieces to match the rooms and keeps every beat. They play small, inside a panel, among the pieces of a live board, so their AAA limit is scale and staging. Audit them with the board when the pilot is decided |
| **Ship travel** (#269) | `design/phone-ui/components/ship-travel/`, `ship-travel-0.1.0` (built, not in the game) | Public: every phone but the offices', for the navigation window | The server's `NAV_SETTING` window, 15,000 ms; sought every frame | 1. One locked profile shot for 15 s: the ship rests mid-frame with a bob. 2. No light on the hull; no scenery but stars. 3. No build or payoff: 1.2 s in, 12.6 s the same, 1.2 s to rest. 4. On a phone the 16:9 picture is cropped to a tall slice, so the ship is small. Its still is the approved transit poster by design; AAA means new approved art |
| **End scene** (#271) | `design/phone-ui/components/end-scene/`, `end-scene-0.1.0` (built, not in the game) | Public: every phone and the display, at the end | 4.5 s from the end phase's start, then a still (1.0 s with no winner) | 1. Its film is the approved 4.2 s arrival: the flat planet, the rigid ship. 2. It plays in the top half only. 3. The stamp's punch is the one impact: no impact frame, shake, sparks or change of light. 4. No hold before the stamp; the words only fade up |
| **Results reveal** (#277) | Interface only, `results-reveal-0.1.0`; nothing built | Public, for the 5,000 ms vote result | A 320 ms rise, then rest | One slide up, as the handoff's table asks. No anticipation, overshoot or settle; the counts, the winner and the stamp do not land in turn |

## What the films share

- **They are drawn for a review video, not for a phone.** The pre-game films redraw everything every frame; the library media are 30-frame videos behind the board.
- **Flat staging.** Most shots are side-on or head-on, with one or two planes. Nothing passes close to the lens; nothing is out of focus but a far window.
- **The crew does not act.** The approved crew drawing is good and stays; it is posed, not performed.
- **Events happen without a build.** Doors, stamps and arrivals land in under a second, with no hold before and no aftermath.
- **No sound.** Every film is silent by an earlier rule. An AAA cinematic leans on sound (a door's slam, an engine's rise, a logo's hit) as much as on picture. It is a separate owner decision; nothing below needs it.

## The pilot: the boarding, as a new version

The boarding is ten seconds, public, and every player sees it every match. The pilot rebuilds it as `pregame-boarding-2.0.0`, a new runtime component beside the released film, which stays untouched.

**Kept:** exactly 10,000 ms inside the same server interval; public, from the public roster alone (7, 8 or 9 members in seat order); the story and its order (dusk, the ramp, the sealing, inside, the Game N mark, the ink to the night); the approved crew drawing and the noir ink; a Reduce motion version of held pictures; no sound.

**Changed, beat by beat:**

| Beat | Today | The pilot |
| --- | --- | --- |
| Dusk, 0–2 s | A side-on wide; a slow tilt | A crane down from the ringed giant to the ship through six planes of depth, the sun's flare across the lens, dust in the doorway's light |
| The ramp, 2–5.4 s | One side-on shot; small figures on one walk cycle | Two shots. A low angle at the ramp's foot: the crew passes close to the lens and climbs into the light, long shadows reaching back. Then a tracking shot beside a pair: faces warming as the door nears, the sunset on their backs |
| The sealing, 5.4–6.9 s | Ramp, door, seam, ports and engines in 0.75 s | The last pair goes into the light; a held breath on the empty doorway; the ramp lifts with steam; the door slams (an impact frame, a jolt, a ring of dust); the amber seam runs round it; wide again as the ports ripple alight and the engines flare |
| Inside, 6.9–9 s | Frozen rows; lamps switch on | The corridor in true depth, the camera pushing in. The crew is a rim of amber until each lamp wakes with a flicker and its cone finds a row; heads lift to the light; the consoles boot along the walls |
| The mark, 9–9.6 s | A scale-down and a sheen | A darkening, a smear, an impact frame and a jolt; ink and sparks thrown off; the sheen and a streak across the letters |
| The night, 9.6–9.96 s | The ink tide | Kept |

**How it plays, so a phone can hold it:**
- **Drawn once, moved every frame.** Each layer of a shot and each pose of each crew member is drawn once from the approved drawing into a picture in memory. A frame then only places pictures and light on one canvas: no SVG is written, parsed or filtered while the film runs.
- **The same player interface.** `createBoardingScene(holder, { options: { roster } })` returns what Frontend's player already uses: `paint(t, { width, height, variant })`, `dispose()` and `stats`. Between the player's paints the scene keeps moving from the last time it was given, so the picture runs at the screen's rate while the time stays the server's.
- **Preparing early (optional).** `prepareBoardingScene({ roster, width, height })` lets Frontend draw the layers during role reading. Without it the film opens from the night while they are drawn.
- **A measured budget.** The same measurement as above, at 1x and 4x, for the pilot beside today's film. Desktop Chromium, labelled; phones unmeasured.
- **Within the policy:** nothing external, no eval, no worker; pictures made from the film's own SVG through `blob:` images, which `img-src` allows.

**Evidence the pilot will carry:** recorded videos at 390 × 844 and 430 × 932, full and Reduce motion; today's film beside the pilot; this beat-by-beat note; the repository's checks; a draft pull request. The Lead reviews it first, then the owner. The other films wait for the owner's yes on the pilot.
