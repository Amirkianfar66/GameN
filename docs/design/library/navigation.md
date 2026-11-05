# Library group 2: navigation

Designer delivery, 5 November 2026. Three parts, from the candidate contract's views:

- the Captain's and the Officer's private route panel, with an exact state map;
- the public strip and the neutral transit film, the same for every movement;
- the arrival at either planet, the moment the destination becomes public.

This is a proposal: nothing is adopted until Integration review, and the words are proposals for Frontend.

- **Contract:** protocol 3 candidate, `packages/contracts/src/planet-game.ts` at `79418e7` (not adopted).
- **Rules read:**
  - successor `game-design.md` (Navigation and endings);
  - `owner-decisions.md` P03, P06, P09 to P13;
  - the owner-confirmed navigation overlay (`rules/overlays/planet-navigation-code-owner-decisions-2026-10-25.json`, confirmed rules 3 to 8, 17 and 18);
  - `motion-requirements.md`.
- **Base:** stacked on library group 1 (#175). The ship in profile is the Blackhole pilot's (`design/cinematic/pilots/blackhole/art.mjs`), unchanged.
- **Review page:** `npm run dev:review --workspace @mothership/design-tokens`, then `/library/navigation/index.html` (`?w=320`, `&text=2`, `&motion=reduced`, `&only=captain|officer|others|public|motion`).
- **Films on the cinematic stage and gallery:** `/cinematic/gallery.html`, pilot "Library 2 · Navigation", cases `transit`, `arrival-blue`, `arrival-red`.

## What the rules ask, and what is drawn

| Rule | Drawn as |
| --- | --- |
| Only Captain and Officer see the arm, the position and the final direction; never totals, weights, the Captain's share or the direction before a ship hack (P13; overlay rule 3) | The office panel: the Y with the ship's token, and at navigation the final direction and the step it makes. Nothing else exists to draw |
| An undecided course: the Officer privately sees it and chooses Blue or Red without numbers; no answer draws one at random (P10; overlay rule 4) | The Officer's panel: both courses dashed, two choices of the same weight, each with its arm's shape key |
| Captain acknowledges, then Officer; no veto; a timeout acknowledges (P09; overlay rule 3) | Each office's own stage: the course and "Acknowledge course"; the other office's stage: who is acknowledging |
| One movement a round: the same side advances, the other side moves to the same depth on the other arm; no backtracking (overlay rules 5 to 8) | The course arrow (`route.mjs`, the rule's mirror) and, after the move, the token's step: along the arm, across a rung, or into the planet |
| Round 1 moves Start to Junction without offices (P11) | No panel exists before the first election; the public strip shows the movement like any other |
| Others see the round and that the ship moved; the destination on arrival (P13; motion requirements) | The public chip "Round N: the ship moved" and the transit band, identical every movement; the arrival films reveal the planet |
| Effects follow the selected world (P03) | Every state reads the current view; no history is replayed |

## State maps (from `states.mjs`)

Every state is a pure function of a view and of the client's own command memory. The memory holds a command still pending, and the phase in which this client saw a command accepted. `offers[]` is the only authority on controls.

### Office panel: `officePanelState(view, { pending, accepted })`

| State | When | Drawn |
| --- | --- | --- |
| `none` | no `privateNavigation` (not an office; Round 1 before the first election) | nothing |
| `idle` | outside the navigation phases | the panel at rest, the place in words, the legend, "Only the Captain and the Officer see the course." |
| `setting` | `NAV_TIE`, not offered the choice (the Captain) | "The course is being set." (the public strip's words) |
| `tie` | `NAV_TIE`, offered `CHOOSE_NAV_DIRECTION` (the Officer) | both courses; the ask; Blue and Red buttons of the same weight |
| `chosen` | the choice accepted in this phase (this client's receipt) | the chosen course; CHOSEN; "The Captain acknowledges it next." |
| `confirm` | the office's own stage, offered `CONFIRM_NAVIGATION` | the course; "This round's course: Red."; the step in words; "Acknowledge course" |
| `confirmed` | the acknowledgement accepted in this phase (this client's receipt) | CONFIRMED; "You acknowledged this round's course." |
| `closed` | the office's own stage, no offer and no acceptance seen here (a reconnect, or the timeout) | "Your acknowledgement is closed for this round." (R11) |
| `waiting` | the other office's stage | the course; "The Captain/Officer is acknowledging the course." |
| `sending` | the stage's command sent, no receipt yet | SENDING |
| `arrived` | the position is a planet | ARRIVED; "The ship reached the Red Planet." |

`privateNavigation.tieChoice` and `.confirmation` are not read: their meaning is not settled (R11). A test holds the map unchanged whatever they hold. No state carries a total, a weight or any direction but the final one.

### Panel step: `panelStep(previousPosition, position)`

When the office's view shows a new position, the panel animates the step only if the route rule names it: `advance`, `switch` or `arrive`. Otherwise it is null, and the token is drawn at rest at the new place. Examples are a reconnect that skipped a round, or no previous view (R5).

### Public strip: `publicNavState(view, { now, played, transitEnd })`

| State | When | Drawn |
| --- | --- | --- |
| `idle` | no movement yet | nothing |
| `navigating` | any of `NAV_TIE`, `NAV_CAPTAIN_CONFIRM`, `NAV_OFFICER_CONFIRM`: the same for all three | "The course is being set." |
| `transit` | a public `MOVEMENT_COMPLETED` this screen has not played, `now − publishedAt` inside the film | the transit band at `t = now − publishedAt` |
| `moved` | otherwise, after a movement (`navigation.lastMovedRound`) | the chip: "Round N: the ship moved." |
| `arrived` | `navigation.arrivedAt` | the arrival film at that planet, from the `FINISHED` phase's `startedAt`; then the end reveal (not this group) |

## The route rule (`route.mjs`)

This is a presentation mirror of the owner-confirmed rule, used only for the course arrow and the step's name. The server's `privateNavigation.position` stays the only authority. Tested against the overlay's own examples:

- Junction, Blue, Blue, Red, Red reaches the Red Planet via B1, B2 and R2.
- A ship hack at B2 moves to R2; at R2 it reaches the Red Planet.
- Three moves from the Junction are the fastest arrival.
- No step goes back toward the Junction.

## Assets

`design/library/navigation/assets/` is generated by `node design/tools/library-assets.mjs` from `art.mjs`; `--check` fails on drift. Each picture is also a custom property in `navigation.art.css` (`--nav-asset-<name>`), drawn only behind `[data-art~="navigation"]`.

| Asset | Size | SHA-256 | Used for |
| --- | --- | --- | --- |
| `nav-panel.svg` | 320×236 | `d9fd98fc52ed7638…` | office-private: the route instrument |
| `nav-ship.svg` | 32×32 | `85514804d1a44be3…` | office-private: the token, centred on an anchor |
| `nav-icon-course.svg` | 48×48 | `26ab630a2dab4150…` | office-private: tray mark |
| `nav-chip-moved.svg` | 48×38 | `d4f58064799a04a7…` | public: the movement chip |
| `nav-course-junction-b1.svg` | 320×236 | `3677af7797bd8b80…` | course Junction to B1 (advance) |
| `nav-course-junction-r1.svg` | 320×236 | `8732b919f2481a5a…` | course Junction to R1 (advance) |
| `nav-course-b1-b2.svg` | 320×236 | `1f13a157ba06e03e…` | course B1 to B2 (advance) |
| `nav-course-b1-r1.svg` | 320×236 | `b48074b3ed958071…` | course B1 to R1 (switch) |
| `nav-course-b2-blue-planet.svg` | 320×236 | `c0f52f681c8116bd…` | course B2 to the Blue Planet (arrive) |
| `nav-course-b2-r2.svg` | 320×236 | `a5f4e975d28f84ed…` | course B2 to R2 (switch) |
| `nav-course-r1-b1.svg` | 320×236 | `9094a1bcd63638fb…` | course R1 to B1 (switch) |
| `nav-course-r1-r2.svg` | 320×236 | `af9080731c7af356…` | course R1 to R2 (advance) |
| `nav-course-r2-b2.svg` | 320×236 | `2f0b76860d5dd12c…` | course R2 to B2 (switch) |
| `nav-course-r2-red-planet.svg` | 320×236 | `91d599261913c595…` | course R2 to the Red Planet (arrive) |
| `navigation.art.css` | 15,114 bytes | `3de259f5c5507836…` | all of the above as custom properties |

Full hashes and bytes are in `assets/manifest.json`.

The palette is the Captain console's neutrals with ink, paper and caption yellow. A test holds every colour at least `MIN_ACCENT_DISTANCE` from each faction accent.

The arms are told apart by shape and words, never by a blue or red hue, so a glance across the table at an office's phone shows a map, not a coloured direction:

- **Blue arm:** one line, round lamps, the ringed planet.
- **Red arm:** a double line, diamond lamps, the cratered planet with its moon.

No picture holds a word.

## Mounting

- **Where:** only inside the Captain's or the Officer's own open private sheet, concealed on window blur like every private sheet. No other seat, the display and no host view gets the panel.
- **Layers:** the panel (`nav-panel`) at `aspect-ratio: 320 / 236`. Over it, at the same box:
  - the course overlays: one for the final direction, or both of a place's during the Officer's choice;
  - the token, centred on `ANCHORS[position]`, given as percentages by `anchorPercent()`.
- **Labels:** the planets' names ("Blue", "Red") sit at `LABELS` as page text, aria-hidden. The legend under the panel carries the meaning; at large text the names give way to it rather than cover the map.
- **Accessible name:** the panel is `role="img"`, named with the place, the final direction and the step in words.
- **Tie choice:** the two buttons have the same colour and weight, so neither is suggested; the dossier's first-button yellow is not used. Each carries its arm's shape key.
- **Large text:** every word follows the reader's text size; at 200% the words wrap and nothing is clipped or wider than the phone.
- **Public strip:** the chip and the "being set" line sit in the public bar; the transit band plays over the board's middle and never covers the bars, the timer or Pass. Pointer events pass through every film layer.

## Motion (`motion.mjs`, the panel)

Each motion plays once, from the moment its cause arrives (an accepted receipt, or a new position the rule can name). It never plays while a command is pending or after a refusal, and never replays on a reconnect. There is no sound or vibration on an office's phone.

| Motion | Full | Beats | Reduced |
| --- | --- | --- | --- |
| `step` | 900 ms | course fades 0–200; token travels 120–720 (a switch arcs a little off its rung); pulse at the new place 640–900, larger into a planet | old place fades out, new place in: 80 + 80 ms, no movement |
| `choose` | 520 ms | the unchosen course fades 0–300; CHOSEN 280–520 | fades only, 160 ms |
| `confirm` | 420 ms | CONFIRMED 0–420 | fade, 160 ms |

## Films (`films.mjs`, public)

| Film | Display | Phone | Reduced | Notes |
| --- | --- | --- | --- | --- |
| Transit | 2,400 ms band over the board's middle (30% of its height) | 1,800 ms band (26% of the board, 140–230 px) | a still band, 160 ms in and out (1,200 ms) | the same for every movement: left to right, never turning, no side's colour; the band opens from and closes to its centre line |
| Arrival, Blue or Red | 4,200 ms full frame | 3,400 ms portrait | the final still, 160 ms in, held | the camera closes on the planet, the ship slows and descends on its landing beam; then the end reveal |

The two arrivals load together or not at all, never the one a client expects: the destination arrives in the view, not in a request. The transit and the arrivals are drawn live from the frame functions, or played from the identity-free inserts.

Runtime inserts are in `design/cinematic/exports/navigation/runtime/`, each with PNG and WebP posters and an animated WebP alternative:

| Insert | MP4 SHA-256 | WebM SHA-256 |
| --- | --- | --- |
| `transit-insert` | `6e338df52f1b4f4f…` | `7c16b41faad13b7d…` |
| `arrival-blue-insert` | `5a905ac79545c818…` | `8680dab017371e55…` |
| `arrival-red-insert` | `11cc9788177ac56a…` | `5bc503820edda4f3…` |

The review renders (with the synthetic board under the band) are in `review/`. All 65 files, with hashes, are in `design/cinematic/exports/manifest.json` and `docs/design/cinematic/export-manifest.md`.

## Audio (public screens only)

The cues are procedural, from `design/cinematic/lib/audio.mjs`, with no samples. The files are in `exports/navigation/audio/`.

- **Transit:** an engine hum and a pass, the same every movement.
- **Arrival:** a swell, a pass and one sting, the same at either planet, so no sound tells the planets apart.
- **Reduced:** the sting alone.
- **Office phones:** nothing.

## Words (`copy.mjs`, proposals)

Key sentences:

- **Places:** "The ship is on the Blue arm, place 1 of 3 (B1)."
- **Waiting for navigation:** "The course for this round is set at navigation, after the turns and the votes."
- **Captain and public strip during the tie stage:** "The course is being set."
- **The Officer's choice:** "The course is undecided this round. Choose Blue or Red. If you do not choose in time, it is drawn at random."
- **The course:** "This round's course: Red." and "The ship moves across to R2, the same place on the other arm."
- **The acknowledgement:** "Acknowledge the course as Captain. Acknowledging cannot change it; when the time runs out it is acknowledged for you."
- **After a movement (public):** "Round 3: the ship moved."
- **On arrival:** "The ship reached the Red Planet."

No word names a total, a weight, a count, a tie or a margin. Only the Officer's ask names an undecided course.

## Privacy-safe preload

`navigation.art.css` (15.1 KB) loads whole on every player phone with the ability art, whatever the seat's role or office. The offices are public, but the art still arrives the same everywhere, and the course itself only in an office's own view.

## Contract requests

- **R5** (existing): the panel derives a step from the previous view's position. Without one there is no step animation, only the place at rest.
- **R10** (Integration, privacy):
  - The rule says the Officer privately sees an undecided course, but `phase.kind: NAV_TIE` is in every view, and its 15 s stage runs only on a tie.
  - The Captain's panel and the public strip draw it exactly as the acknowledgement stages. The phase kind and its timing still tell anyone.
  - Ask: a neutral phase kind outside the Officer's view, or the owner's acceptance that a tie is public by its timing.
- **R11** (Integration):
  - `privateNavigation.tieChoice` and `.confirmation` need a defined meaning.
  - Until then, an office that reconnects after acknowledging sees "closed", not "you acknowledged".

All three are in the motion bible's request table (`cinematic-catalogue-0.3.0`).

## Checks

- `node --test packages/design-tokens/test/library-navigation.test.mjs`, 11 tests:
  - the route against the overlay's examples;
  - the office panel's states, with offers as the authority;
  - `tieChoice` and `confirmation` never read, and no total or earlier direction in any state;
  - the public strip the same for all three stages, a film never replayed, a planet only on arrival;
  - steps named only when the rule names them;
  - words without totals or ties;
  - palette distance from the faction accents, no words or links in pictures, an anchor and a course for every place and move;
  - generated-asset drift;
  - reduced motion as fades without movement;
  - the transit without any side's colour and the same for any movement, the arrivals' hues only in the arrivals, one audio sheet for both planets;
  - the review report (each capture once, every hash the file's).
- `node design/tools/library-assets.mjs --check`: the generated files are current (both groups).
- `node design/tools/library-capture.mjs --group navigation`: 189 captures in `review/`.
  - Every state at 390 and 320 px; the state sections at 200% text (32 px default text size, phone-width viewport); every motion and film as six frames, full and reduced.
  - Measured: no sideways overflow, every sheet exactly its phone width, game buttons at least 44 px, no page error, and at 200% no visible sheet text under 24 px.
- `node design/tools/cinematic-exports.mjs --only navigation`: 11 renders (8 review, 3 runtime inserts). `node design/tools/cinematic-audio.mjs --only navigation`: 5 cue sheets. `node design/tools/cinematic-manifest.mjs`: 211 exports re-hashed against their render records.

Not tested: real phones, screen readers, the runtime itself (no Frontend integration yet), real-device film performance, and the contract's adopted revision.
