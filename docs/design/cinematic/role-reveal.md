# Role reveal films: one seven-second film per role (proposal)

Designer proposal, 6 November 2026. Branch `claude/designer-role-reveal`, stacked on #184.

The owner asked for a short film after each player sees their role, one per role, of five to ten
seconds:

> می خوام بازیکن ها بعد از دیدن نقش شون یک animation کوتاه ببین پس کلا به ازای هر role یک animation 5 to 10 ثانیه ای

("I want players to see a short animation after seeing their role, so one animation of 5 to 10
seconds for each role.")

The owner approved the Designer's plan: a fixed length for every role, the shared rules below, and
one pilot (the Doctor) before the other eight. The owner then set the creative brief:

> با کل طرح و ایده ات موافقم فقط دوست دارم ارتباط انیمیشن هر نقش با نقش و کارایی اش و فضای space و sci fi بازی و روح نوآر کمیک بوک هماهنگ باشه و به داستان بازی و محتوا بخوره

("I agree with the whole plan and idea. I only want each role's animation to match the role and
what it does, the game's space and sci-fi setting and the noir comic-book spirit, and to fit the
game's story and content.")

This page holds the storyboards for all nine roles and the pilot's specification. Nothing here is
a rule. A film plays only inside the existing role-reading stage and takes no time from it.

## 1. The shared rules: what makes a reveal private

A player's phone sits on a table among other players. A role film must tell its own player everything
and a neighbour nothing.

| Rule | Why |
| --- | --- |
| **Every film lasts exactly 7,000 ms**, full and reduced, and its beats change at the same moments: 1,500, 2,800, 4,100, 5,500 and 6,600 ms | A neighbour who sees a phone's screen change, or times it, learns nothing |
| **Silent, with no vibration** | The art direction: "Phones produce no role-specific or secret-action sound" |
| **One palette and one brightness for every role:** ink, paper, steel and amber focus. A team's colour appears only in the small emblem on the title plate and in the role's own device | A big red or blue flash is visible across the table. A test holds each beat's mean luminance within a band shared by every role |
| **Own phone only**, during the role-reading stage (the 30-second minimum read). A tap skips to the card. It never replays on a reconnect or a refresh. The card may offer "Watch again" | The reading stage is private, and a film is never an event anyone else gets |
| **No other player appears.** Every figure but the player's own role-holder is an ink silhouette with no face, number or name | A film shows what a role does, never who is who (the Insider's and Hacker's knowledge stay in their files) |
| **Every film ships to every phone:** the frame functions and art are one shared bundle, and nothing is fetched for a dealt role | The art direction: "fetching only a dealt role or hidden action can disclose identity" |
| **Words are page text.** The two caption lines are DOM text. The role's name in Ink Block lettering is decorative and is repeated in page text | Captions translate and scale with the player's text size; a picture is never the only place a meaning appears |
| **Reduced motion:** three still pictures (the opener, the full page, the title), cross-faded in 80 ms at the same beat times. No travel, zoom, sparks or particles | The motion direction's reduced form |

## 2. The shared structure: a page from the ship's crew file

Every film is one page of the Mothership's classified crew file, told in a space-noir comic. The
ship is the city and the stars are the streetlights. The light falls through a viewport's slats as
it would through a detective's blinds.

| Beat | ms | Every role |
| --- | --- | --- |
| **Opener** | 0–1,500 | Darkness, then starlight through the slats of a viewport, in bars across the page. A hand rises into the light holding the role's own device, the one the role card draws. Halftone in the shadows, a rim of paper light along the fingers. The device is the role's signature, so the film starts on it |
| **Three panels** | 1,500–5,500 | A comic tier of three panels slams in, one at 1,500, one at 2,800 and one at 4,100. Together they tell what the role does on the ship, in the ship's own rooms: the Hospital, the Jail, the cargo hold, the corridors, the Command Room, the space outside. Each panel has a hard border, a gutter, ink silhouettes and one comic sound word in Ink Block lettering |
| **Title** | 5,500–6,600 | The page darkens around a paper plate. The role's name stamps onto it in Ink Block lettering with a small overshoot. The team's emblem (Blue Planet, Red Planet or the Alien's spiral) sits in its corner, small |
| **Hold** | 6,600–7,000 | Everything settles. The page then gives way to the role card |

Two caption lines are shown as page text, in the comic's yellow caption boxes: one during the panels
(the role's purpose) and one under the title (how the role plays).

## 3. The storyboards

The panels show what the rules give each role (`docs/specifications/planet-successor/game-design.md`,
the owner's decisions). They teach, so the first game is easier. The captions are proposals; the
game's words are Frontend's.

### Doctor (Blue) · the pilot

*The medic who holds the ship's last two doses.*

| Panel | Picture | Sound word |
| --- | --- | --- |
| 1 · 1,500 | **The Hospital at night.** A patient's silhouette on a berth. The heart monitor's trace stutters, and its amber lamp blinks in a slow, safe rhythm | BEEP |
| 2 · 2,800 | **The ceiling opens.** The ward's iris dilates, the medical drone descends on its searchlight, and the injector's two vials glow as one empties into the drone | WHIRR |
| 3 · 4,100 | **The trace steadies.** The patient sits up. Beside the berth, the Hospital panel's keypad lights one number: the player's own | — |

- **Captions:** "Two doses for the whole voyage." / "Your player number is the Hospital panel's code. Who you tell is up to you."
- **The rules it teaches:**
  - two shared injections;
  - the Doctor's Rescue;
  - the panel's code is the Doctor's original player number (P21, P22).
- **Continuity:** the drone, the iris and the monitor are the Hospital film's own art (S5 and Pilot 1). The player meets them here first.

### Insider (Blue)

*The informant who knows three faces, but not their masks.*

| Panel | Picture | Sound word |
| --- | --- | --- |
| 1 | **Crew quarters, lamp low.** A hand pins three faceless silhouette photos on a cork board. A red string runs between them | — |
| 2 | **Three label tapes** (UNDERCOVER, ALIEN, DOCTOR) fall into an envelope. Its flap closes and ONE EACH stamps across it | STAMP |
| 3 | **A lens passes over the three photos.** They stay faceless and a question mark hangs on the string | — |

- **Captions:** "Three of them, three roles: Undercover, Alien, Doctor." / "You know who, not which. With you, they are the Code."
- **Continuity:** the cork board, the tapes and the envelope are the Insider file's own kit (`insider-file`).

### Blue Disabler and Red Disabler (one film)

*The saboteur with one charge for the whole voyage.*

The two Disablers share one film, frame for frame, as their phones already share one Disable strip.
Only the title's name and emblem differ.

| Panel | Picture | Sound word |
| --- | --- | --- |
| 1 | **Engine room conduits.** A gloved hand charges the stun device. Sparks crawl along a pipe | ZZT |
| 2 | **A dark cabin.** A silhouette stands in it. The charge arcs once and the cabin's light dips | — |
| 3 | **The charge cell drains** to empty: one use, the whole match | — |

- **Captions:** "One charge for the whole voyage." / "Choose someone in your room. They are hit when the round ends."
- **Red Disabler's added line:** "You know who the Undercover is."
- **Rule:** the Disable is one hidden attack per match, public only as damage at the round's end.

### Supplier (Blue)

*The quartermaster who arms the crew in secret.*

| Panel | Picture | Sound word |
| --- | --- | --- |
| 1 | **The cargo hold.** A crate rides the conveyor under a swinging lamp | CLANK |
| 2 | **ROUND 3 stamps** on the crate. Two shipping tags flutter down onto two silhouettes | — |
| 3 | **The crate's seal tag lights** as the Supplier steps back into the shadow | — |

- **Captions:** "In Round 3, two weapons leave your hold." / "Choose two crew in your room. They never learn who armed them."
- **Continuity:** the crate and tags are group 8's and the ability kit's.

### Engineer (Blue, nine players)

*The technician whose one photograph silences a room.*

| Panel | Picture | Sound word |
| --- | --- | --- |
| 1 | **A bulkhead between Room A and Room B.** The signal clamp (the Engineer's device) locks on and its LED lights | — |
| 2 | **Viewfinder brackets** close on the opposite room's silhouettes, and the shutter blinks | CLICK |
| 3 | **The print develops: CAPTURED.** Beside it the ship's course needle stutters and holds | — |

- **Captions:** "One photograph. One room's voice." / "From Room A or B, capture the room opposite: they do not steer the ship this round."
- **Continuity:** the viewfinder and print are library group 1's capture art.

### Undercover (Red)

*The agent who starts the voyage armed.*

| Panel | Picture | Sound word |
| --- | --- | --- |
| 1 | **A corridor lamp flickers** over condensation dripping like rain. A figure in a long coat lifts the collar | DRIP |
| 2 | **A pistol slides into a shoulder holster:** the only weapon aboard at the start | — |
| 3 | **The figure presses a shield emblem** onto another silhouette's shoulder, and it glows once | — |

- **Captions:** "The only weapon aboard at the start is yours." / "Hand out shields: the first attack on a protected crew member fails."
- **Rule:** the weapon shoots from Round 4. Protection is given once per player in the match.

### Hacker (Red)

*The codebreaker who can turn the ship.*

| Panel | Picture | Sound word |
| --- | --- | --- |
| 1 | **A maintenance shaft lit by a terminal.** A scanner line sweeps four silhouettes, and one already carries a mark: the Undercover the Hacker knows | — |
| 2 | **A punch card with four windows** clicks shut, hole by hole, and UNLOCKED stamps across it | CLICK |
| 3 | **The cartridge seats** in the ship's port. The route arrow on the Y-shaped course swings toward the Red Planet | KA-CHUNK |

- **Captions:** "You know your Undercover. Find the rest of the Code." / "Crack it, and the ship can be pushed toward the Red Planet."
- **Continuity:** the punch card and the cartridge are group 1's art.

### Red Disabler (Red, eight and nine players)

The Disablers' shared film, with the RED DISABLER plate and the added caption line above.

### Alien (alone)

*The stowaway who bends reality.*

| Panel | Picture | Sound word |
| --- | --- | --- |
| 1 | **A porthole, stars stretching.** A figure's shadow on the wall splits in two: the Phantom Clone | — |
| 2 | **The walls give way to space.** A blackhole forms and the ship's lights bend toward it | WHOOM |
| 3 | **Two panels of the same room, side by side.** They differ in one detail. One fades and the other stays: the Sync | — |

- **Captions:** "A second shadow walks this ship." / "Hold an office to open a Blackhole. Use it and stay alive: you win with whichever side arrives."
- **Continuity:** the blackhole and the starfield are Pilot 2's art.

## 4. The pilot: the Doctor

The pilot builds the shared template and the Doctor's three panels. The other eight follow the
owner's review of the pilot on a phone.

| ms | What is seen |
| --- | --- |
| 0–1,500 | Starlight falls through the slats in bars from the upper left and dies away across the page. The Doctor's injector, with its two vials, rises into the light in its gloved hand. The paper rim light comes up along it and the arm falls away into shadow |
| 1,500 | Panel 1 slams in, tilted 1.1°. **The Hospital at night:** a viewport with slatted blinds and stars, slat light across a berth, and a patient's silhouette under a blanket. The monitor's amber trace stutters and its lamp blinks at 1.2 Hz (no flash). BEEP pops in. The caption "Two doses for the whole voyage." appears at 1,700 |
| 2,800 | Panel 2 slams in. **The ceiling opens:** the iris dilates and the medical drone (S5's own) descends, folded, then open, then charging. Its searchlight falls to the berth below. One of the injector's two vials drains, and a line of cyan dashes carries the dose up to the drone. WHIRR |
| 4,100 | Panel 3 slams in. **The trace steadies:** the patient sits up in bed, ringed by one pulse. The monitor's trace runs green, and the Hospital panel's keypad lights the player's own number on its readout and its key |
| 5,500 | The page darkens. The paper plate stamps DOCTOR in Ink Block lettering, with the Blue Planet emblem in its corner |
| 5,900 | The caption: "Your player number is the Hospital panel's code. Who you tell is up to you." |
| 6,600–7,000 | Held. The page then gives way to the role card |

**Reduced motion:** three stills over the same 7,000 ms, each faded in over 80 ms:
- 0 ms: the hand at rest in the light;
- 1,500 ms: the page, with all three panels at rest;
- 5,500 ms: the title.

The stars stop twinkling.

**Review:**
- the stage: `design/cinematic/stage.html?pilot=role-reveal&surface=phone&variant=full|reduced&role=Doctor&seat=6&w=390&h=844`, with `&play=1` to loop it;
- the gallery: `node design/tools/cinematic-serve.mjs`, then `/cinematic/gallery.html`, "Role reveal".

## 5. For Frontend

- **Where it plays.** On the player's own phone, in the role-reading stage:
  - It starts after the card flips (Ready-to-read).
  - It plays inside the 30-second minimum read and never extends it.
  - A tap skips to the card.
  - It never replays on a reconnect or a refresh.
  - The card may offer "Watch again", which plays the same film.
  - Going to the background stops it and conceals the card, by the reviewed rule.
- **How it is drawn.** Live, from the frame functions:
  - `revealSvg(t, { role, variant, seat, width: 900, height: pageHeight(w, h) })` in `design/cinematic/pilots/role-reveal/compose.mjs` returns the SVG and the page text's boxes.
  - Set the two captions over their boxes and announce the role line in a live region (`words`).
  - Preload every picture in `ROLE_REVEAL_ASSETS` on every phone, whatever its role. Fetch nothing at the moment of the film.
  - Draw each picture from the decoded copy, as the stage does (`stage.mjs`), so that nothing re-decodes between frames.
- **Inputs.** All are already in the player's own view:
  - `self.role` and the reading stage;
  - the player's own number (`seat`, for the Doctor's keypad);
  - `prefers-reduced-motion`.

  No server event is needed. A change of motion preference mid-film switches at once to the reduced still for the current time.
- **Silence.** No sound and no vibration, by the art direction's rule for phones.
- **Never the review videos.** The renders below draw a dealt role (the Doctor) and are review only.

## 6. Files, hashes and checks

| File | SHA-256 | What it is |
| --- | --- | --- |
| `design/cinematic/pilots/role-reveal/film.mjs` | `a46554d78292ed3775c0fdcdaa3f693e80318f4cc2fead7b78a042ad1f2e598c` | the shared clock: 7000 ms, the beats, the reduced stills (`revealFrame`) |
| `design/cinematic/pilots/role-reveal/art.mjs` | `62c8fc9fed27c2735072a41cd40059c2192ea72946bbc78a41787555f4322b72` | the shared art: the slats, the hand with the device, the panels, the title plate, the caption boxes |
| `design/cinematic/pilots/role-reveal/doctor.mjs` | `72206546d3c62280ba5c819311349bf90859c1b87637efb86e396cb8c545e198` | the Doctor's three panels |
| `design/cinematic/pilots/role-reveal/roles.mjs` | `3ff4260abadc22fcc31b71bd69c1e4db16bfee02609d47174f17df80e8e46bc1` | the nine roles: team, device, emblem, film; `ROLE_REVEAL_ASSETS` |
| `design/cinematic/pilots/role-reveal/copy.mjs` | `449d2989a6e5225c7bfc4eb52e07cefc37a6c33b8d05af2b82b7bf347892dec2` | the two caption lines of every role (proposals) |
| `design/cinematic/pilots/role-reveal/compose.mjs` | `fca77fc3858cbc79ace7fd925d9104fa661b752b525abc7d050c3d488284361f` | one frame as one SVG at the phone's aspect, with the page text's boxes (`revealSvg`, `pageHeight`) |
| `design/cinematic/pilots/role-reveal/stage.mjs` | `cd5c323b6a3febee64d7ac53519804c832815a84a9a1cbe767288756f2726719` | the review stage's phone surface |

Review renders (review only: each draws a dealt role, the Doctor; a client draws the film live):

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `design/cinematic/exports/role-reveal/review/doctor-phone390-full.mp4` | 465,186 | `9a5494002e8679c0d85a9a94441d446a97c9efd913732f972acd7ece137d1604` |
| `design/cinematic/exports/role-reveal/review/doctor-phone390-reduced.mp4` | 223,602 | `cfd19ae5a896bd17d36383c30bb20a59ec4141e6afe3d67173bfebb8e22beff7` |
| `design/cinematic/exports/role-reveal/review/doctor-phone320-full.mp4` | 284,939 | `5c0963bcb4afdc68d83f03b3375e666607e752da36c02d0c60d908794b485b4a` |

**Checks.** `node --test test/*.test.mjs` in `packages/design-tokens`: 438 of 438, 10 of them new (`cinematic-role-reveal.test.mjs`): the nine roles' films, devices and emblems; one clock for every role (beats change only at the shared moments); reduced motion as three stills; one self-contained SVG with no words, no repeated id and only shipped pictures; silence; no colour within the accent distance of a faction accent; the captions; the layout at seven phone sizes; the Doctor's device and keypad; the motion bible's entry. `cinematic-exports.mjs --only role-reveal`: three renders in Chromium 141.0.7390.37 with ffmpeg 6.1.1, 211 frames each, no one- or two-frame dropout. `cinematic-manifest.mjs`: 43 sources, 264 exports, every render record's hash matching its file; `cinematic-docs.mjs`: `cinematic-catalogue-0.12.0`. Frames pulled from the encoded videos were checked by eye at both phone sizes, full and reduced.

**Limitations:**
- **No phone has run it.** Every frame and video is desktop Chromium.
- **Luminance parity is not yet measured across roles.** With one film drawn, the shared opener, page and title keep the brightness common. A measured comparison comes with the second film.
- **Large text is untested.** Captions at 200% text are Frontend's to fit.
- **The other eight films are storyboards.**
