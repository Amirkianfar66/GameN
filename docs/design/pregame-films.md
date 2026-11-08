# The pre-game films, made again as AAA animation

**Status: the owner approved the Doctor's film and the boarding (8 November 2026). The other seven role films are drawn from them, for the owner's review. Nothing here is adopted, mounted or deployed.**

The owner, 8 November 2026: "we had 3 animation before game, 1 is the Game N by Plan B 2-second app intro, second after 10-second film for each role then 10-second boarding cinematic , go for them like AAA ANIMATION improve the quality". On seeing the first cut of the intro, the owner asked for it simple: "For the app start 2 sec can we just have black background and then the texts with Game N by Plan B something simple with typing motion graphic effect". On seeing the Doctor's film, the owner asked for its title simple too: "The doctor movie at end of it when Doctor text label appear with yellow color the background of the text is crowded , make it simple blue color"; and for the card on the desk: "In Dr animation the card on table with Doctor text on it make it the medical cross" ([owner-decisions.md](owner-decisions.md)).

The three films were first made before the crew was restyled:
- the role films in [PR #187](https://github.com/Amirkianfar66/GameN/pull/187) and [#189](https://github.com/Amirkianfar66/GameN/pull/189);
- the brand intro and the boarding in [#190](https://github.com/Amirkianfar66/GameN/pull/190).

Those branches never reached `main`, and they draw the old crew. This is the same three films made again on `main`'s crew (`design/crew-drawing/`, released as `design-0.7.0`) and in the redrawn rooms' noir. They keep every length, beat, word and rule the owner approved; what changes is how each beat is drawn, lit, staged and finished.

- **Branch.** `claude/designer-pregame-films`, based on `main` at `469b709b` (after the crew consumer, [#196](https://github.com/Amirkianfar66/GameN/pull/196)).
  - It stands on its own and needs neither the room release ([#197](https://github.com/Amirkianfar66/GameN/pull/197)) nor any runtime change.
  - The character update can be published first.
- **The work.** `design/pregame-films/`.
- **Review.** `design/pregame-films/stage.html?film=brand|role|boarding`, and the videos and contact sheets in `design/pregame-films/review/`.
- **Integration's finding, resolved.** Integration's consumer review ([crew-consumer-review.md](../integration/crew-consumer-review.md), "Separate opening and role films") found that the earlier films imported the old crew renderer and old portraits. These films draw the approved restyle: the crew drawing (`design/crew-drawing/source/`, unchanged) on the frozen rig. They draw no portrait or card art, and load no art file: the card on the desk shows the role's mark, drawn in code.

  The character-dependent films (the role films and the boarding) are drawn live from their modules; no review movie ships as one of them.

## What is delivered

| Film | Length | Plays | Delivered | Class |
| --- | --- | --- | --- | --- |
| Brand intro, "Game N" by Plan B | exactly 2,000 ms | the app's first entry | whole, as the owner asked it: black, typed; full and reduced | identity-free: a candidate to ship as a prerendered video (27 KB on a phone) |
| Role film | exactly 10,000 ms each | the player's own phone, in the role-reading stage, after the card is revealed | **all nine roles', in eight films** (the Disablers share one): the Doctor's, approved, and the other seven for review; full and reduced, for any of the nine characters | drawn live from the player's own character and role (see Mounts) |
| Boarding | exactly 10,000 ms | every phone and the display, after everyone is Ready, before Round 1 (R17) | whole, for 7, 8 or 9 players; full and reduced | review only: no stage exists for it yet |

The other seven role films (Insider, the two Disablers' shared film, Supplier, Engineer, Undercover, Hacker and Alien) are drawn from the Doctor's, now that the owner has approved it ([below](#the-other-seven-films)).

## What "AAA" means here

The earlier films were flat vector art on the old crew. These are lit, staged and finished like a noir animated feature drawn in the crew's ink:

- **The crew.** The approved crew drawing, on the approved rig, with its own life (blinks, a breath's drift, hanging hair). Each figure is lit by one SVG filter, as a renderer lights a sprite (`kit/cast.mjs`):
  - an ambient dark;
  - a key light that falls off across the figure from its source (the desk lamp, a doorway, ceiling lights);
  - a rim light on the edges facing a light behind it.

  Other people are faceless silhouettes with the same rim.
- **Acting.** The character in the role film shifts their weight before they reach, leans in, closes their hand on the gadget, raises it and looks at it. The crew's heads look three-quarter left, so the gadget is taken and raised on that side, and they look at what they hold.
- **Light.** Volumetric beams with dust turning in them (blinds, lamps, a doorway), pools where light lands, bloom round sources, a lens's anamorphic streak on the brightest points, a four-point glint.
- **Camera.** Close shots that push in, near layers more than far, and depth of field: the view outside the window and the room behind the comic page fall out of focus.
- **Impact.** Things land with weight: an overshoot and a jolt through the frame, comic impact lines, dust, ink thrown off a stamp.
- **Finish.** A film's grain (changing 24 times a second), a vignette and a grade over every frame. Memory panels get sepia, a warm light leak and film scratches. Ink blooms in from the edges to end the boarding.
- **Lettering.** The boarding's mark is Ink Block letters (the earlier films' alphabet, ported) finished as a comic cover's logo: an extruded side, a lit face, a highlight, a cast shadow and a sheen. The intro types the same letters plain, and the role's title sets them plain in one blue, both at the owner's word. They are drawn strokes, never text.
- **Frame rate.** The reviews are rendered at 60 frames a second, at twice a phone's CSS pixels.

## The brand intro: 2,000 ms

Simple, as the owner asked: black, and the name typed.

| ms | What happens |
| --- | --- |
| 0-220 | Black. An amber cursor appears and blinks. |
| 220-610 | "Game N" is typed a letter at a time, at a hand's uneven pace; each letter lands with a small lift. The cursor is solid while it types. |
| 610-860 | The cursor blinks at the end of the name. |
| 860-1,275 | It drops to the line below, and "by Plan B" is typed there, quicker and smaller, in a warm grey. |
| 1,275-1,700 | The cursor blinks while the name is read. |
| 1,700-1,960 | Everything fades to black. |
| 1,960-2,000 | Black. |

- **Composition.** The two lines are one block, left-aligned and centred. "Game N" spans 62% of a phone's width, and on the display it is at most 12% of the height. A faint glow sits under the letters.
- **Reduced motion.** Both lines fade in whole over 200 ms, hold, and fade out by 1,960 ms. There is no typing, cursor or lift.
- **The first cut** (a lamp over a bulkhead, a plate slammed on the wall, the name written in glowing ink) was replaced at the owner's word. Its tools stay in the kit.

## The role films: 10,000 ms, the Doctor's first

The clock is the approved pilot's, unchanged (`roles/clock.mjs`): beats change at 3,000, 4,500, 6,000, 7,800 and 9,300 ms for every role.

| Beat | ms | The Doctor's film |
| --- | --- | --- |
| Opener | 0-3,000 | **The briefing room at the dock, the night before the voyage.** Through a tall window, the Mothership waits at its dock, out of focus: rows of lit ports, running lights, the gantry's floodlights, a planet's limb, stars. Venetian blinds hang over the top of the glass; the dock's cold light comes through their gaps in beams with dust in them. A gooseneck lamp pools warm light on the role card in its holder. **At the owner's word, its face is a medical cross**: paper on a dark plate, as the board's Hospital draws its cross, with no word, portrait or team. A mug steams in the foreground, out of focus. **The player's own character** stands behind the desk against the glass, rimmed by the dock light and lit warm by the lamp. They shift their weight, lean in, take the injector, raise it beside their face and look at it. It glints at 2,050-2,650 ms. The camera pushes in. |
| Memory flash | 2,650-3,300 | Warm light swells out of the glint and washes the frame, then clears on the first panel. |
| Panel 1, memory, sepia | 3,000 | **Colony Nine, the fever years.** A prefab field ward at night, with three cots in a row going back. Under the sheets, nobody's faces show, and they breathe. One hanging lamp swings on its cord, with dust turning in its cone, and a dust storm beats on the porthole. The player's character stands at the foot of the nearest cot reading a chart, then looks up. The room behind the page has dropped out of focus and into the dark. Narration: "Colony Nine. The fever years." |
| Panel 2, memory, sepia | 4,500 | **The last two doses.** An open medicine case under a desk lamp: twelve slots, empty but two, whose vials glow and pulse. Spent vials lie tipped on the table, and rain runs down the window. A drop falls: DRIP. Narration: "Two doses left." |
| Panel 3, aboard | 6,000 | **The Mothership's Hospital at night,** in the ward's teal. A patient sits up in bed: a silhouette, nobody, rimmed by one pulse of light as a green glow rises on the wall. The monitor's trace runs and steadies. The Hospital panel's keypad lights the player's own number, on its readout and its key: BEEP. |
| Title | 7,800-9,300 | **Simple, at the owner's word.** The page goes almost black, and clean black behind the name. DOCTOR rises into place a letter at a time, in the brand's alphabet and plain blue, with a soft glow; a thin blue rule draws out beneath it. No plate, ink, dust or sheen. |
| Hold | 9,300-10,000 | Everything settles; the page then gives way to the role card. |

Each panel lands with an overshoot, a jolt through the page and impact lines. The guided camera moves onto each panel and pulls back to the page at 7,300-7,800 ms.

### The other seven films

Drawn from the Doctor's as the owner approved it, each from its storyboard approved on 6 November 2026 (`docs/design/cinematic/role-reveal.md` on `claude/designer-role-films`). Every film keeps the Doctor's opener, clock, page, camera, flash, finish and title. Only four things are the role's: the card's mark, the gadget, the three panels and the two narration boxes. Panels 1 and 2 are memory, in sepia. Panel 3 is aboard, in the night's colours, and shows no event.

| Role | Card mark; gadget | 1 · memory | 2 · memory | 3 · aboard |
| --- | --- | --- | --- | --- |
| Insider | An eye; the dossier tablet, three faceless faces on its screen | Vesta Station's archive: cabinets to the ceiling, one lamp, the reader looks up. "Vesta Station. The archive." | Three folders slide in and land, each with a faceless photograph: THUD. "Three files. Three faces." | The cork board in the cabin: three faceless photographs, a string drawn from pin to pin, a fist at the chin |
| Blue and Red Disabler (one film) | A lightning bolt; the stun rod | The engine decks of Ceres, back to us: a breaker's lever pulled, CLUNK, sparks, the lamps out one by one, the emergency light. "The engine decks of Ceres." | One charge: the rod in its case, one glowing cell, an envelope of credits pushed in by a gloved hand. "One charge." | A dark cabin: the rod in a gloved fist, one white arc to a silhouette, the light dips: ZZT |
| Supplier | A braced crate; the twin canister | The Belt markets: a stall, crates up to a swinging lamp, the arms folded; a crate drops on the counter: CLANK. "The Belt markets." | A false floor lifts on two sealed crates under a work lamp. "Two crates, off the books." | The cargo hold: two crates come down on the hoist beside two silhouettes, a blank tag swinging on each |
| Engineer | A spanner; the signal clamp | The Titan yards: a ship's ribs under Saturn, welders' sparks, the plans on the gantry. "The Titan yards." | A gloved hand traces a cable bundle; the clamp clicks on, its lamp blinking: CLICK. "You know every wire." | The photograph: brackets close on the room across the corridor, two silhouettes in it; the shutter blinks dark (ink, never a flash), and the print slides out and develops |
| Undercover | A domino mask; the signal beacon | A street in the dust rain, leaning on a lamp post; a faceless file on a café table, the rain on it: DRIP. "Red Planet intelligence." | Close on a shoulder: the strap, and a pistol sliding into its holster, the grip left out. "No name. One gun." | The shield: beside a silhouette, a paper shield settles on its shoulder and a ring of amber light goes out once |
| Hacker | A terminal's prompt; the hacking box | The data dens of Phobos: screens, hanging cables, a stool and a laptop; four padlocks open on the big screen. "The data dens of Phobos." | A credit chip slides in under the lamp, sealed in wax pressed with a planet and its ring. "Paid in advance." | The Code: a scan sweeps four silhouettes behind glass, the second marked (always the second, in every Hacker's film); the punch card's four windows shut: KA-CHUNK |
| Alien | A spiral; the crystal, pale as ice, with motes round it | A ship's mess: two spacers round a lantern, the player apart; on the wall, the player's shadow is not a human's. "A story sailors told." | In a lamp's light the player's shadow splits, and the second slides away. "Then, a second shadow." | The cabin's walls part to space; a blackhole forms and the stars bend toward it: WHOOM |

- **Nobody is anybody.** Every figure but the player's own is drawn as one flat colour, on one body with a plain oval head. A crew member's own head in silhouette could be read as that player. The Doctor's patient is now drawn the same way; nothing else in the approved film changed.
- **The words** are the approved storyboards', a sentence to a line and at most 17 characters a line. They are proposals; the game's words are Frontend's.
- **No team colour, in any film.** The shield, the arc, the crystal and the blackhole's light are paper and amber; nothing is red, blue or violet. The Undercover's narration names the Red Planet, as its approved storyboard does: it is page text on the player's own phone.
- **The Disablers' one film** is the same for both, frame for frame, until the title names the role (tested).

**The rules every role film keeps** (approved with the pilot; tested in `pregame-films.test.mjs` for all nine roles):
- **Same clock for every role.** A neighbour who sees a phone change, or times it, learns nothing. A role carries pictures and words, never times.
- **Silent, with no vibration.**
- **One palette, and no team colour.** Every colour drawn stays at least 30 (CIE76) from each faction's accent, with no exception: a role film draws no team's colour at all. The card on the desk shows the role's mark (the Doctor's, a medical cross; never red, which is a team's colour and the protected emblem), and the gadget is drawn without its team colour.
- **One title blue.** The title is the same blue for every role, `#2979FF`: 39 from the Blue team's accent (a paler sky blue), 38 from the Alien's and 96 from the Red team's. Its colour tells a neighbour nothing about the team. The team emblem that sat on the earlier title's plate went with the plate; the card that follows the film shows the team.
- **Nobody else.** Only the player's own lobby character is drawn in colour. Every other person is nobody: one flat colour, on one body with a plain oval head.
- **Foreshadowing, not an event.** Nothing in a film happens in the match.
- **Few words, as page text.** Two narration boxes of a few words each, at most 17 characters a line. They are DOM text over the picture, so they translate, scale with the player's text size and are read by screen readers.
- **Reduced motion.** Three stills (the gadget raised, the full page, the title), cross-faded in 80 ms at 0, 3,000 and 7,800 ms.

## The boarding: 10,000 ms

Four shots joined by cuts (`boarding/boarding.mjs`). The only input is the public roster: each member's seat and character, 7, 8 or 9 of them (`boarding/roster.mjs`).

| ms | Shot |
| --- | --- |
| 0-2,000 | **Dusk.** A ringed gas giant hangs over the mesas, with a low sun on the horizon. The Mothership stands low on its legs on the plain, the sunset along its hull. Its entrance is open, and warm light spills down the ramp onto the ground. The camera tilts down to it. |
| 2,000-6,100 | **The ramp.** The crew walks in from the right in pairs, in seat order, and climbs the ramp into the light. Their faces are lit by the doorway and their backs are in the dusk, with dust turning in the light. Each steps into the door and is gone into its light. |
| 6,150-6,900 | **Sealing.** The ramp slides up into the hull and the door comes down. It seals with an amber seam and a jolt. The ports light along the hull from front to back and the engines glow. Then down to the dark. |
| 6,900-9,000 | **Inside.** The spine corridor, dark. The crew stands together in rows, rimmed by the shut entrance's amber seam behind them. The ceiling lights wake far to near, each with a flicker and a cone of light, and the consoles power up. |
| 9,000-9,960 | The Game N mark is stamped over the corridor, with a sheen. Then the ink tide to the night. |

- **Rows inside.** On a phone, back to front: 7 players stand 2, 3, 2; 8 stand 3, 2, 3; 9 stand 3, 4, 2. On the display: 4 and 3; 4 and 4; 5 and 4.
- **Reduced motion.** Five held pictures, each fading in over 160 ms (at 0, 2,400, 5,200, 6,900 and 8,900 ms), then a fade to the night at 9,700-9,960 ms.
- **What it never shows.** Places follow seat order, never a character, and a roster carrying private fields draws byte for byte the same (tested). The corridor is the ship's spine, not a starting room.

### <a id="r17"></a>R17: the missing stage

The match starts Round 1 as soon as everyone is Ready, and the session contract has no boarding stage. Backend has proposed a separate `setupFlowVersion: 2` boundary. Such a stage must:
- be versioned, and play after the reading minimum and everyone Ready;
- carry authoritative `startsAt` and `endsAt` (10,000 ms) and the public roster;
- take no time from Round 1.

It is not the art release's to enable. Until it exists, no client plays the boarding.

## For Frontend: the handoff

**Integration owns every film's authoritative timing.** Each film is a pure function of the time it is given: it draws that moment and decides nothing.

| Film | Where and when it plays | Its clock | Its input | Rules |
| --- | --- | --- | --- | --- |
| Brand intro | Once per app entry, before the lobby; never over a match, or over one being recovered | Local, from its first frame | None | Identity-free. Ship the review's video, or draw it live (a few dozen strokes a frame) |
| Role film | The player's own phone only, in the existing role-reading stage, after the card is revealed, inside the 30-second reading minimum | Local, from the reveal; it ends by 10,000 ms | The role; the player's own character and seat | Private, never on the display. A tap skips to the card. **Finishing or skipping never confirms Ready.** It never replays on a reconnect or refresh |
| Boarding | Every phone and the display, in a server-owned pre-Round-1 stage after the reading minimum and everyone Ready (R17) | `t` = server now minus the stage's `startsAt`. Past `endsAt`, draw nothing and go to the game | The public roster alone | A late server answer never starts a player's game locally. Skip dismisses the pictures only. Activating the artwork must not enable boarding; saved matches keep their setup |

- **Calls.**
  - `brandSvg(t, { width, height, variant })`.
  - `roleSvg(t, { width, height, role, character, seat, variant })`, with `roleCaptions(t, …)` and `rolePageText(t, …)` for the page text. It loads no art file: everything it draws is in its modules.
  - `role` is one of `doctor`, `insider`, `blue-disabler`, `red-disabler`, `supplier`, `engineer`, `undercover`, `hacker` and `alien` (`roles/roles.mjs`).
  - `boardingSvg(t, { width, height, variant, roster })`.
  - `variant` follows the app's effective Reduced preference, as the crew consumer's does.
- **Why the role films are drawn live.** Prerendering every character and role would be 72 videos, and every phone would have to load them all, because fetching only the dealt role's would tell.
- **Cost.** These are review drawings: full SVG frames with filters. In desktop Chromium a frame takes a few hundred milliseconds to generate, raster and capture (`review/records/`).
  - For a phone, build each shot's picture once and move it by transform. Poses repeat on the walk's cycle, and the filters can be baked.
  - **No phone frame rate has been measured.**
- **Imports.**
  - `design/pregame-films/{kit,brand,roles,boarding}/`;
  - the crew drawing (`design/crew-drawing/source/`) and the rig (`design/board-motion/figures/`), both unchanged.

## Files

| Path | What it is |
| --- | --- |
| `design/pregame-films/kit/` | The films' kit: `math.mjs` (easing, springs, seeded noise), `fx.mjs` (beams, pools, glow, streaks, glints, dust, sparks, splatter, puffs, rain, impact lines, ink blots and tide, grain, vignette, grade, leaks), `letters.mjs` (Ink Block, the wordmark's lower case, the logo finish), `cast.mjs` (the crew, lit) |
| `design/pregame-films/brand/brand.mjs` | The brand intro |
| `design/pregame-films/roles/` | The role films: `clock.mjs` (the shared clock), `briefing.mjs` (the opener), `page.mjs` (panels, camera, flash, title), `common.mjs` (the card's mark, the gadget, sound words, nobody), one module a film (`doctor.mjs`, `insider.mjs`, `disabler.mjs`, `supplier.mjs`, `engineer.mjs`, `undercover.mjs`, `hacker.mjs`, `alien.mjs`), `roles.mjs` (the nine roles) and `film.mjs` |
| `design/pregame-films/boarding/` | The boarding: `clock.mjs`, `roster.mjs`, `boarding.mjs` |
| `design/pregame-films/stage.html`, `stage.mjs`, `films.mjs` | The review stage |
| `design/pregame-films/renders.mjs`, `design/tools/pregame-films-render.mjs` | The review renders and their tool |
| `design/pregame-films/review/` | The review videos, contact sheets and `records/` |
| `packages/design-tokens/test/pregame-films.test.mjs` | The tests |

Render with `node design/tools/pregame-films-render.mjs [--only <name>,...]` (needs `CHROME_PATH` and ffmpeg).

## Checks

<!-- checks -->
Run on this delivery's tree, based on `main` `469b709b`, with Node 22.21.1 and npm 10.9.4:
- **Repository checks.** `npm run check:toolchain`, `check:workspace`, `check:sources` and `typecheck`: pass.
- **`npm run test:design`.** 285 of 285 pass, including `pregame-films.test.mjs` (8 tests). The tests cover:
  - the lengths and approved beats;
  - the last frames;
  - pure, well-formed frames with no dangling reference;
  - reduced-motion stills;
  - every role film's privacy rules (one clock, no team colour, the card's mark, one title blue, nobody, page text) and the Disablers' one film;
  - the boarding's public roster;
  - the renders against their records;
  - dev-only marks.
- **Renders.** `node design/tools/pregame-films-render.mjs`, in Google Chrome for Testing 153.0.8010.12 with ffmpeg version 6.1.1-3ubuntu5. Each is 60 frames a second, H.264, with no audio stream, probed by decoding:

| Render | Pixels | Frames | Length | Size |
| --- | --- | --- | --- | --- |
| `brand-phone.mp4` | 780 x 1688 | 120 | 2.000 s | 27 KB |
| `brand-display.mp4` | 1920 x 1080 | 120 | 2.000 s | 34 KB |
| `brand-phone-reduced.mp4` | 780 x 1688 | 120 | 2.000 s | 20 KB |
| `doctor-phone.mp4` | 780 x 1688 | 600 | 10.000 s | 2125 KB |
| `doctor-phone-c7.mp4` | 780 x 1688 | 600 | 10.000 s | 2117 KB |
| `doctor-phone-reduced.mp4` | 780 x 1688 | 600 | 10.000 s | 558 KB |
| `insider-phone.mp4` | 780 x 1688 | 600 | 10.000 s | 2087 KB |
| `disabler-phone.mp4` | 780 x 1688 | 600 | 10.000 s | 1894 KB |
| `supplier-phone.mp4` | 780 x 1688 | 600 | 10.000 s | 1834 KB |
| `engineer-phone.mp4` | 780 x 1688 | 600 | 10.000 s | 1885 KB |
| `undercover-phone.mp4` | 780 x 1688 | 600 | 10.000 s | 2108 KB |
| `hacker-phone.mp4` | 780 x 1688 | 600 | 10.000 s | 1843 KB |
| `alien-phone.mp4` | 780 x 1688 | 600 | 10.000 s | 1853 KB |
| `boarding-phone-8.mp4` | 780 x 1688 | 600 | 10.000 s | 3431 KB |
| `boarding-display-9.mp4` | 1920 x 1080 | 600 | 10.000 s | 4726 KB |
| `boarding-phone-7-reduced.mp4` | 780 x 1688 | 600 | 10.000 s | 978 KB |

The Doctor's film is rendered for two characters (`c3`, `c7`) to show it draws whichever the player is; each of the other seven films with another character.
<!-- /checks -->

## Not tested

- **Devices.** No phone, display hardware, screen reader or large-text setting has played these films. Every frame is desktop Chromium.
- **Runtime.** No client mounts any of them. The boarding has no stage (R17).
- **The owner** asked for the Doctor's title simple and blue and the desk card as a medical cross, then approved the Doctor's film and the boarding: "I approve it". The other seven role films have not been seen yet.
- **Sound.** None is made; the films are silent.
