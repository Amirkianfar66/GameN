# Cinematic pilots: Frontend handoff

Designer delivery of 5 November 2026 for the production brief (`designer-production-brief.md`,
376f437). Three pilot treatments for review before the full library multiplies. Nothing here is
adopted: Integration review adopts named files and hashes (`export-manifest.md`), and a pilot's
presence is not approval to ship it. Every source is development-only design code; Frontend owns the
runtime implementation, Backend the events, deadlines and audiences.

- Contract: protocol 3 candidate, engine `planet-game-1.0.0`, ruleset `in-person-planet-2026-11-05`,
  `packages/contracts/src/planet-game.ts` at `79418e72dba99ba99afe047ecb97467fb5e73b62` (not adopted).
- Base: branch `claude/designer-cinematic-library` on `98ccb98` (#161's head, the four-bed board-v2
  stack); gameplay baseline `db65bb8`; design baseline `26947b1`.
- Exports, hashes, sizes, dimensions, codecs: [`export-manifest.md`](export-manifest.md) and
  `design/cinematic/exports/manifest.json`. Motion bible and event catalogue: [`motion-bible.md`](motion-bible.md).
- Preview: `node design/tools/cinematic-serve.mjs`, then `/cinematic/gallery.html`.

## What is finished, what is a study

| Item | State |
| --- | --- |
| Three comic pilots: frame functions, art, composition, stage, review renders | **delivered, working** (pilot proposals; S5 and S2 under them are approved and unchanged) |
| Identity-free runtime inserts: drone insert, space insert titled and textless | **delivered video** (comic, rendered from the frame functions; MP4 + WebM + poster + animated WebP) |
| Public cue mixes (procedural) | **delivered audio** (WAV masters, AAC, Opus) |
| Live-action inserts | **NOT PRODUCED**: treatment, shot list, storyboard frames, exact prompts, grade and rights plan only (`live-action/`) |
| The Captain's EJECT as a display cut over the approved S7 | **delivered, working** (proposal; S7 under it approved and unchanged): frame functions, composition, stage, review renders, an identity-free exterior insert video and cue mixes. See below |
| Role, action and environment library | **delivered as library groups 1 to 8** (proposals): `design/library/README.md`; the remaining gaps per scene in `motion-bible.md` |

## Rules for every pilot

1. **Start only on the resolved, authorized event.** Pilot 1: a `RESCUED` event; Pilot 2: a
   `BLACKHOLE_SYNCED` event; Pilot 3: the `HACK_RESULT` phase with a public `hackSession`. Nothing plays
   for a pending command, a registered request or a proposed effect.
2. **Clock.** `t = serverNow - event.publishedAt` (Pilots 1, 2) or `serverNow - phase.startedAt`
   (Pilot 3). Seek to `t`; never start from a local zero. The server's `endsAt` and `expiresAt` never move.
3. **Late load, reconnect.** `t >= end`: draw the final state (the snapshot) at once, no replay;
   `0 <= t < end`: seek and continue. Pilot 3 snaps to S2's current pose.
4. **Duplicates and staleness.** Key by `event.id` (or `phase.id`); one id plays once per page. An
   event past `expiresAt` never starts. A newer `viewRevision` that moves what the film shows cancels
   it to the latest state.
5. **Hidden tab.** Nothing pauses on the server. On `visibilitychange` back to visible, recompute `t`
   and seek or snap. No audio while hidden.
6. **Interaction.** Every film layer is `pointer-events: none`. Press areas, name tags, room labels,
   timers, Pass and navigation never move, scale or hide. Only the art layer may darken or shake (Pilot
   1's board shake is 1.5 px for 300 ms, full motion only).
7. **Reduced motion.** Read `prefers-reduced-motion` at load and listen for changes; a change mid-film
   switches to the reduced variant at the same `t` (the gallery's switch demonstrates it).
8. **Sound.** Public events only, from the cue sheet in each `film.mjs` (`AUDIO`), never only from a
   video; muted by the device and game setting; no audio for private, room-filtered or pair-private
   presentations.
9. **Asset failure.** If a picture, video or font fails, show the static final state and the live
   region's words; never block a turn.
10. **Text.** The only lettering baked into art is decorative (THUMP, BEEP, SHHK, the BLACKHOLE title,
    all vector, no font). Every meaning is also in the client's own words in the live region.

## Pilot 1: Hospital drone and recovery

`cinematic-hospital-rescue-0.1.0` · `design/cinematic/pilots/hospital-rescue/`

| Need | Value |
| --- | --- |
| Trigger and audience | `RESCUED`, public. `fourFilmBerth(event.clinicalAnchor, snapshotSeats, subject)` (approved, `board-v2/fx/medical-four.mjs`) says whether and where a film plays; HV5 and beyond, or a berth another seat holds: no film, words only |
| Fields | `seatIds[0]` (subject), `slotId`, `clinicalAnchor`, `publishedAt`, the snapshot's seats (character art for the subject; other occupants) |
| Not an input | who registered the Rescue, the Doctor, a code, a role, a side, a cause |
| Frame function | `rescueCinematicFrame(t, berthId, { variant, surface, fit })` (pure; `film.mjs`); `frame.base` is S5's `fourRescueFrame()` unchanged except the drone's lens rises 46 units (at the berth's scale) while the patient sits up so the face is never covered |
| Variants | `full` 5600 ms; `short` 1600 ms (nonblocking: use it on phones whose next decision should not wait, and on the display when two Rescues share a batch); `reduced` 1760 ms (S5's two still states) |
| Board mount (phones and the display's Hospital panel) | Each layer is a scene-sized SVG (`viewBox 0 0 1024 768`) over the panel's scene box (`frameScene()`: left `tx`, top `ty`, size `1024k × 768k`) inside `.v2-art`, at the board's z-index: berth screen and lamp 3, iris 5, figure body `depth×2`, front parts `1500+depth`, grade 2990-2991, alarm glow 2995, searchlight 3000, beep 3001, inset 3640, scan fan 3644, scan line 3645, hologram 3646, trail 3655, drone 3660, charge 3662, pulse 3665, accents 3670. Clipped by the room panel. Inset placement `insetBox()`, drone size `droneFit()` (approved) |
| Display mount | The 1920×1080 cut (`compose.mjs displaySvg()`): camera shots ward / ceiling / follow (`cameraShots()`, clamped by `cameraFrame()`), letterbox 8.5%, vignette, grain, ECG close-up panel bottom right. Under the display's status bar, never over it |
| The subject's snapshot figure | Hidden while the film draws it at its own berth; marked away (`v2-fig--away`) when the snapshot already has it elsewhere (S5's rule); the name tag goes to the berth while the film plays |
| Static / muted / failure | Static: the snapshot (patient Healthy where placed). Muted: cue sheet off. Failure: words only (`Player N: Healed.`, Frontend's existing copy) |
| Runtime-eligible video | `exports/hospital-rescue/runtime/drone-insert.{mp4,webm}` 1.43 s, identity-free; poster PNG/WebP; animated WebP |

## Pilot 2: Blackhole reveal and ship passage

`cinematic-blackhole-0.1.0` · `design/cinematic/pilots/blackhole/`

| Need | Value |
| --- | --- |
| Trigger and audience | `BLACKHOLE_SYNCED`, public, `actorSeatId` null, after Sync; the board under it is already the selected world's finalized checkpoint |
| Fields | `id`, `publishedAt`, `expiresAt` only. Never a world, branch, count, population, actor or pre-Sync state |
| Frame functions | `displayFrame(t)`, `phoneFrame(t)`, `reducedFrame(t, surface)` (pure); overlay `overlaySvg(t, layout, { surface, variant })` |
| Variants | display `full` 5200 ms; phones always the band (2400 ms, nonblocking, over the rooms only, never over the bars or a ballot sheet); `reduced` still card 1640 ms (display) / 1440 ms (phone); display `short` = the band |
| Mount | One overlay SVG in the board's pixels, above the board and below the status bar and controls. Layout input: the board's rooms rect and each room panel's rect (for the settle ripple). On the display the board layer scales 0.95 during the pull and settles from 1.035 after the wipe (transform on the art layer only, never on targets) |
| Timing request | **R1**: there is no post-Sync presentation stage; the next phase (JAIL_VOTE, 60 s) starts at once. Until Integration answers, the display overlays the vote's first 5.2 s and phones show only the band; the vote's `endsAt` is unchanged |
| Static / muted / failure | Static: the synced board. Failure: the board and the live region's words (proposal: "Blackhole: the board shows the synced state.") |
| Runtime-eligible video | `exports/blackhole/runtime/space-insert-titled.*` and `space-insert-textless.*` 3.63 s (textless + the vector title is preferred: localizable) |

## Pilot 3: Private Talk capsule

`cinematic-private-talk-0.1.0` · `design/cinematic/pilots/private-talk/`

| Need | Value |
| --- | --- |
| Trigger and audience | `hackSession` (public pair) and the phases `HACK_RESULT` (entrance), `HACK` (talk), the next phase (exit). The declared side and claim are pair-private and never enter the film |
| Frame functions | `pageFrame(case, t, { reduced })` (the page's own beats) over S2's `capsuleFrame()`, `capsulePerson()`, `homePerson()` (approved, unchanged) |
| Timing | entrance 4900 ms, inside the 5 s result stage (tested); talk: S2's seated loop for the 60 s (speaker-neutral); exit 2800 ms over the next phase (**R2**: confirm, or keep S2's board-only exit on the display) |
| Display mount | A 1920×1080 page over the board: the P1 room panel (40, 60, 880×465), the P2 room panel (40, 555, 880×465), the capsule (950, 60, 930×960); rooms framed at 1.45 px per scene unit on the participant's place, the capsule at 1.816 on `CAPSULE_VIEW` |
| Phones | S2 unchanged (the capsule panel in the board's top band, approved #144) |
| Static / muted / failure | Static: S2's settled states. Muted: steps and door cues off. Failure: S2's board treatment |

## The Captain's EJECT: a display cut over S7

The phones keep S7 on the board, unchanged (approved, #159). The display may play this cut instead of
S7's board treatment. Source `design/cinematic/pilots/eject/` (`film.mjs`, `compose.mjs`, `stage.mjs`);
tests `packages/design-tokens/test/cinematic-eject.test.mjs`.

| Need | Value |
| --- | --- |
| Trigger and audience | The Captain's EJECT outcome (S7's input), public: its kind and `seatIds`, the snapshot before it (each subject's Jail slot, character and whether it was a body), the time since its presentation start |
| Not an input | who pressed (the actor is whoever holds the public office), a role, a side, a cause |
| Frame function | `cutFrame(t, { reduced, subjects })` (pure). Its `s7` is S7's `ejectFrame()` at the same moment, unchanged (tested at every 40 ms); the cut adds only the shot, its set, the camera and the letterbox |
| Shots (full, 7200 ms: S7's own length) | `console` 0-1500 (the cover lifts, the press, the click; the emergency light from 900), `lockdown` 1500-2700 (the Jail's wall: the door locks, the hatch is revealed, the prisoners brace), `airlock` 2700-4400 (the iris opens, the living are taken as ink silhouettes with a paper rim, a body leaves as a grey cut-out), `exterior` 4400-5800 (the hull, the silhouettes drifting away), `closure` 5800-7200 (the iris shuts, the hatch is gone, the memorial plaque, the console's EJECT used as an inset). Hard cuts on S7's beats; the camera eases inside each shot and never shows past its set's edge or shakes |
| Reduced (2560 ms) | S7's four stills (console, open, empty, memorial) with S7's 80 ms cross-fades; the three wall stills share one camera, so they dissolve in place. No suction, debris, silhouette, push or travel |
| Words | Never in the picture. `cutSvg()` returns where a stage puts page text: the plate's EJECT (lit `#FFB3A3`, used `#8A97AB`, as S7's inset), the closing USED stamp, and S7's `captainWords()` in the lower letterbox from S7's announce (3300 ms) |
| Mount | One 1920×1080 SVG for the display, letterbox 10%, vignette and grain; the Jail's approved back picture (`design/board-motion/assets/scenes/jail.back.svg`) through the stage's picture library |
| Static / muted / failure | Static: the snapshot (the Jail empty). Muted: the cue sheet off. Failure: S7's words alone |
| Runtime-eligible video | `exports/eject/runtime/exterior-insert.{mp4,webm}` 2.43 s, the hull and the hatch's light with the loose things leaving it: no person, no word, no count; poster PNG/WebP; animated WebP. A client draws the match's own silhouettes over it from the frame functions, or plays the cut live |
| Review only | `exports/eject/review/display-full.mp4` (7.23 s) and `display-reduced.mp4` (2.60 s) draw the synthetic fixture's prisoners (seats 3 and 4 living, seat 9's body) and its words |
| Sound | Public cues (`AUDIO`): the console's click, the alarm's blip every 625 ms (under 2 Hz) while the Jail is locked down, the locks and clamps, the hatch, the air leaving; silence outside the hull and at the memorial. The insert has none of its own |

## Privacy-safe preload plan

Every pilot asset is public and identical for every player and every match: scene pictures, the
capsule layers, the three runtime inserts, the cue mixes. Preload them for **every** client at match
start in one neutral group (no per-role, per-seat or per-world request), or lazy-load by public
event kind on first occurrence; never by role, side or private state. The pilot code itself
(frame functions) carries no private data. The largest runtime items: the blackhole inserts
(MP4 1.07-1.24 MB, WebM 0.47-0.59 MB) and the drone insert (MP4 0.41 MB, WebM 0.19 MB).

## Performance evidence (desktop only)

`node design/tools/cinematic-perf.mjs` → `design/cinematic/exports/perf.json`: headless Chromium on
a 4-core cloud VM with **software rendering**; the review stage rebuilds every film layer per frame.

| Surface | Script + style + layout, median / p95 | Seek with paint, median / p95 (idle pair 33.3 ms) | Film nodes (max) |
| --- | --- | --- | --- |
| Pilot 1 phone 390×844 | 4.3 / 8.1 ms | 33.3 / 33.5 ms (fits the frame) | 2293 |
| Pilot 1 phone 320×568 | 4.1 / 5.3 ms | 33.3 / 33.6 ms | 2293 |
| Pilot 1 display 1920×1080 | 8.2 / 14.7 ms | 97.1 / 172.7 ms | 854 |
| Pilot 2 phone band | 2.8 / 3.9 ms | 33.3 / 33.6 ms | 515 |
| Pilot 2 display | 7.0 / 10.5 ms | 67.9 / 118.0 ms | 1093 |
| Pilot 3 display entrance / exit | 10.0 / 17.1 ms; 9.9 / 13.0 ms | 99.8 / 121.9 ms; 83.9 / 116.9 ms | 2537; 2825 |

Reading: on phones the board treatments fit a frame on this VM. At 1080p the software paint of the
SVG filters (grain, blur, bloom) dominates. For the display: keep static layers mounted and update
only transforms and attributes (as the approved S5 controller does), drop the grain and blur on
low-power devices, or play the identity-free insert video for the space and ceiling shots. These
numbers are not phone, GPU, battery or thermal evidence.

## Not tested

Real phones and tablets (iOS Safari, Android Chrome), a real shared display, GPU rasterization,
low-power mode, autoplay policies and codec support on devices, network conditions and lazy loading,
screen readers (the live-region words are Frontend's), haptics, 200% text with the films running,
and the runtime adoption itself. Desktop screenshots and renders prove none of these.

## Contract requests

R1 to R7 in [`motion-bible.md`](motion-bible.md#contract-requests-for-integration): the Blackhole
presentation window (R1), the capsule exit (R2), the rescued patient's placement (R3), walk origins
after reconnect (R4), navigation transit (R5), Promise evaluation moment (R6), shown drawings'
moment (R7). Until answered, each scene uses the stated fallback; nothing invents a field.

## Reproduce

```
export CHROME_PATH=<chromium>    # ffmpeg 6 on PATH
node design/tools/cinematic-audio.mjs       # cue mixes
node design/tools/cinematic-exports.mjs     # 22 renders and the storyboard stills
node design/tools/cinematic-manifest.mjs    # manifest.json and export-manifest.md
node design/tools/cinematic-perf.mjs        # perf.json
node design/tools/cinematic-docs.mjs        # motion-bible.md, catalogue.json, inventory.md
cd packages/design-tokens && node --test test/cinematic.test.mjs
```

Re-rendering reproduces the frames exactly (pure frame functions, fixed fixtures); encoded bytes can
differ between encoder builds and thread counts, so the manifest pins the delivered bytes.
