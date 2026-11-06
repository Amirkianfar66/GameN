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
- Owner review of 6 November 2026: applied in [`review-2026-11-06.md`](review-2026-11-06.md) (the
  Rescue dropout, gameplay visibility, the Rescue's end state, the Promise evaluation wording).

## What is finished, what is a study

| Item | State |
| --- | --- |
| Three comic pilots: frame functions, art, composition, stage, review renders | **delivered, working** (pilot proposals; S5 and S2 under them are approved and unchanged) |
| Identity-free runtime inserts: drone insert, space insert titled and textless | **delivered video** (comic, rendered from the frame functions; MP4 + WebM + poster + animated WebP) |
| Public cue mixes (procedural) | **delivered audio** (WAV masters, AAC, Opus) |
| Live-action inserts | **NOT PRODUCED**: treatment, shot list, storyboard frames, exact prompts, grade and rights plan only (`live-action/`) |
| Remaining library (Hack Spaceship, Engineer, navigation, Promises, windows, arrival...) | **not drawn yet**: gap map in `inventory.md` and per scene in `motion-bible.md` |

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
7. **Gameplay visibility.** By default every film is its **board treatment**, on phones and the
   display alike: drawn in the board's own layers (a room's `.v2-art`, the board's film band up to
   z 3670), under the press areas (4000), slot hits (4200), room labels (5000), bars (6400) and Pass
   (6500). It covers nothing a player selects or reads, in any phase. A presentation that **covers**
   the board (the Rescue cut, the Blackhole stage cut, the capsule's entrance page) may play only when
   `presentationIn(phase.kind)` from `design/cinematic/lib/visibility.mjs` returns `cover`: in
   `HACK_RESULT`, `VOTE_RESULT`, `FINISHED` or `ABORTED`, and only inside that phase's own time. In
   any other phase, or an unknown one, the board treatment plays from its first frame. Nothing waits
   for, extends or takes time from a phase; a presentation stage of its own would be a new phase and
   is not assumed.
8. **Reduced motion.** Read `prefers-reduced-motion` at load and listen for changes; a change mid-film
   switches to the reduced variant at the same `t` (the gallery's switch demonstrates it).
9. **Sound.** Public events only, from the cue sheet in each `film.mjs` (`AUDIO`), never only from a
   video; muted by the device and game setting; no audio for private, room-filtered or pair-private
   presentations.
10. **Asset failure.** If a picture, video or font fails, show the static final state and the live
   region's words; never block a turn.
11. **Text.** The only lettering baked into art is decorative (THUMP, BEEP, SHHK, the BLACKHOLE title
    of the stage cut and the inserts, all vector, no font). Every meaning is also in the client's own
    words in the live region.

## Pilot 1: Hospital drone and recovery

`cinematic-hospital-rescue-0.1.0` · `design/cinematic/pilots/hospital-rescue/`

| Need | Value |
| --- | --- |
| Trigger and audience | `RESCUED`, public. `fourFilmBerth(event.clinicalAnchor, snapshotSeats, subject)` (approved, `board-v2/fx/medical-four.mjs`) says whether and where a film plays; HV5 and beyond, or a berth another seat holds: no film, words only |
| Fields | `seatIds[0]` (subject), `slotId`, `clinicalAnchor`, `publishedAt`, the snapshot's seats (character art for the subject; other occupants) |
| Not an input | who registered the Rescue, the Doctor, a code, a role, a side, a cause |
| When it plays | `RESCUED` is published with the snapshot after the Rescue resolution, as the navigation stage or the next round opens: a phase with open decisions. So **the board treatment is the default on every surface, the display included**; the cut may play only where `presentationIn()` says `cover` (none of the current round's Rescue moments) |
| Frame function | `rescueCinematicFrame(t, berthId, { variant, surface, fit, leaves })` (pure; `film.mjs`); `frame.base` is S5's `fourRescueFrame()` unchanged until the patient is off the bed, except the drone's lens rises 46 units (at the berth's scale) while the patient sits up so the face is never covered. `leaves`: the snapshot places the patient outside the Hospital (true for every Rescue the reviewed fixtures make) |
| End state | The authoritative placement (the owner's review): a healed patient who is free returns to Room A or B in crew clothes, one still detained to the Jail in prison clothes, wherever the snapshot places them. The film releases the patient (stand 4800-5120 ms, walk out by the nearer side 5120-5800 ms, fading at the panel's edge), the berth is empty from the moment they are off it (`release.offBed`: no screen, no lamp of its own), and **the playable figure at its snapshot place is never hidden**: greyed (`v2-fig--away`) while the film shows the patient at the berth, back in colour as the walker leaves (`arrive` 5800-6050 ms, a 7 px settle). The berth's name tag shows only while the patient is on the bed. If a snapshot still had the patient at the berth, the film would end there sitting up (`leaves: false`) |
| Variants | `full` 6200 ms; `short` 1600 ms (nonblocking: the patient stands and leaves at 1080-1460 ms; use it where the next decision should not wait, and when two Rescues share a batch); `reduced` 1760 ms (S5's two still states, then the empty berth at 1300 ms, 80 ms fades) |
| Board mount (phones and the display's Hospital panel: the default) | Each layer is a scene-sized SVG (`viewBox 0 0 1024 768`) over the panel's scene box (`frameScene()`: left `tx`, top `ty`, size `1024k × 768k`) inside `.v2-art`, at the board's z-index (`compose.mjs PASS_Z.board`): grade 1 (the room's art only: over the back picture, under the berths and figures), berth screen and lamp 3, iris 5, figure body `depth×2`, front parts `1500+depth`, alarm glow 2995, searchlight 3000, beep glow 3001, scan fan 3480, trail 3482, charge 3484, ring, burst and sparks 3486: **all under the name tags (3500)**, press areas (4000), slot hits (4200) and room label (5000). S5's approved inset 3640, scan line 3645, hologram 3646, drone 3660 and pulse 3665 keep their z and their keep-clear placement (`insetBox()`, `droneFit()`). Every pass layer is masked by the same keep-clear areas (`filmItems(..., { keepClear })`: the room label with its margin and the other occupants' berths, in scene units; the mask `#<prefix>-keep` comes as its own item), so no light, ring or spark crosses another occupant's berth or the label. No lettering on the board (THUMP and BEEP are the cut's). Clipped by the room panel |
| Display mount (default) | The board treatment on the display's own board: the same layers as a phone, on the display's Hospital panel (`stage.mjs mountDisplay()` is `mountPhone()` at 1920×1080) |
| Display cut (cover phases only) | The 1920×1080 cut (`compose.mjs displaySvg()`): camera shots ward / ceiling / follow (`cameraShots()`, clamped by `cameraFrame()`), letterbox 8.5%, vignette, grain, the ECG close-up panel; after the release, a closing panel (`destinationPanel()`, 690×780 at 1150, 150) draws the destination room as the board draws it, with the patient settling at their slot in that room's clothes. No words: the client's sentence names the outcome. Under the display's status bar, never over it |
| The subject's snapshot figure | Never hidden when the snapshot has it elsewhere: marked away (`v2-fig--away`) while the film draws the patient at the berth, back in colour as the walker leaves (S5's rule, extended by the release). Hidden only if the snapshot has it at this very berth, where the film draws it |
| Static / muted / failure | Static: the snapshot (patient Healthy where placed). Muted: cue sheet off. Failure: words only (`Player N: Healed.`, Frontend's existing copy) |
| Runtime-eligible video | `exports/hospital-rescue/runtime/drone-insert.{mp4,webm}` 1.43 s, identity-free; poster PNG/WebP; animated WebP. Re-rendered for the review: the earlier file had the same dropped ceiling picture at 1.00 s and 1.17 s (its frame function is unchanged) |
| Review renders | `review/display-*` the board treatment at display size (free and detained), `review/cut-*` the cut (free, detained, reduced), `review/phone390-*` and `phone320-full` the phone board; all rendered with the settled renderer (no dropped background, see the review doc) |

## Pilot 2: Blackhole reveal and ship passage

`cinematic-blackhole-0.1.0` · `design/cinematic/pilots/blackhole/`

| Need | Value |
| --- | --- |
| Trigger and audience | `BLACKHOLE_SYNCED`, public, `actorSeatId` null, after Sync; the board under it is already the selected world's finalized checkpoint |
| Fields | `id`, `publishedAt`, `expiresAt` only. Never a world, branch, count, population, actor or pre-Sync state |
| Frame functions | `boardFrame(t, { reduced })` (the default and its reduced still), `displayFrame(t)` (the stage cut) (pure); `overlaySvg(t, layout, { surface, variant })` returns `{ svg, art }`: `svg` is empty for `full` and `reduced` (nothing over the board), `art` is the space for the rooms' art layers; `boardArt()` builds it |
| Variants | `full` (default, every surface): **behind the crew**, 2400 ms: each room's back wall gives way to one shared field of space, the blackhole forming at the board's centre, the ship streaking behind the rooms into it, the flare, the walls returning; `reduced` 1440 ms: the still blackhole in the walls, 120 ms fades; `stage` (display only, a proposal awaiting the owner): the 5200 ms cut over the board |
| Mount (default) | One copy of `art` per room, appended in the room's `.v2-art` at `z-index: 1` (over the back picture at 0, under every scene layer, figure, name tag, press area and room label), offset by the room's position so all the rooms show one field of space; each copy's ids scoped (`scopeIds()`), clipped by the room. The walls never go fully dark (`BEATS.board.peak` 0.88). No title is drawn: the client's live words name the event |
| Timing | Inside the Jail vote's first 2.4 s, covering nothing: the vote's `endsAt` is unchanged and no extra time is assumed. **R1** (open) concerns only the stage cut: it covers the board, so it would need a presentation stage of its own before the vote, which the owner has not approved |
| Static / muted / failure | Static: the synced board. Failure: the board and the live region's words (proposal: "Blackhole: the board shows the synced state.") |
| Runtime-eligible video | `exports/blackhole/runtime/space-insert-titled.*` and `space-insert-textless.*` 3.63 s (textless + the vector title is preferred: localizable); for the stage cut or a presentation stage only, never over the vote (unchanged by the review) |
| Review renders | `review/display-full`, `display-reduced`, `phone390-full`, `phone390-reduced`: the default behind the crew; `review/display-stage`: the stage cut (proposal, R1) |

## Pilot 3: Private Talk capsule

`cinematic-private-talk-0.1.0` · `design/cinematic/pilots/private-talk/`

| Need | Value |
| --- | --- |
| Trigger and audience | `hackSession` (public pair) and the phases `HACK_RESULT` (entrance: the page may cover, nobody decides), `HACK` (talk: S2 on the board), the next phase (exit: S2 on the board, every surface). The declared side and claim are pair-private and never enter the film |
| Frame functions | `pageFrame(case, t, { reduced })` (the page's own beats) over S2's `capsuleFrame()`, `capsulePerson()`, `homePerson()` (approved, unchanged) |
| Timing | entrance 4900 ms, inside the 5 s result stage (tested; gone before it ends); talk: S2's seated loop for the 60 s (speaker-neutral), in the board's capsule panel; exit: **S2's approved exit on the board on every surface, the display included** (2230 ms + a 300 ms settle; reduced 400 + 300 ms; `exitEnd()`), over whatever phase comes next, covering nothing (**R2** answered by the owner's review: there is no exit page) |
| Display mount | The entrance only: a 1920×1080 page over the board in `HACK_RESULT`: the P1 room panel (40, 60, 880×465), the P2 room panel (40, 555, 880×465), the capsule (950, 60, 930×960); rooms framed at 1.45 px per scene unit on the participant's place, the capsule at 1.816 on `CAPSULE_VIEW`. The talk and the exit are the board's own (S2) |
| Phones | S2 unchanged (the capsule panel in the board's top band, approved #144) |
| Static / muted / failure | Static: S2's settled states. Muted: steps and door cues off. Failure: S2's board treatment |

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
| Pilot 1 display, board treatment (the default) | 3.7 / 5.8 ms | 33.3 / 33.7 ms (fits the frame) | 2297 |
| Pilot 1 display cut (cover phases only) | 7.8 / 11.4 ms | 95.3 / 231.5 ms | 1112 |
| Pilot 1 phone 390×844 | 4.4 / 6.4 ms | 33.3 / 33.6 ms | 2297 |
| Pilot 1 phone 320×568 | 4.1 / 6.7 ms | 33.3 / 33.7 ms | 2297 |
| Pilot 2 display, behind the crew (the default) | 19.1 / 28.4 ms | 49.9 / 69.0 ms | 4475 (five room copies) |
| Pilot 2 phone, behind the crew | 11.6 / 18.4 ms | 33.3 / 35.8 ms | 3055 |
| Pilot 2 display, stage cut (R1) | 6.8 / 10.4 ms | 65.0 / 122.7 ms | 1098 |
| Pilot 3 display entrance page | 10.7 / 15.5 ms | 97.4 / 144.3 ms | 2537 |
| Pilot 3 exit, S2 on the board | the review stage reloads the approved S2 page per seek (248.6 / 326.1 ms); S2's own cost was measured in #144 | n/a | 1855 |

Reading:
- **The board treatments fit a frame on this VM**, on phones and on the display's board. The
  exception is the Blackhole's. Its review stage copies the whole field of space into each room's
  art layer, five copies rebuilt per frame. A runtime should draw the field once (one canvas, or one
  `<symbol>` referenced from each room) and update only its transforms.
- **At 1080p the covering cuts' software paint dominates**: the SVG filters' grain, blur and bloom.
  For those: keep static layers mounted and update only transforms and attributes (as the approved
  S5 controller does), drop the grain and blur on low-power devices, or play the identity-free insert
  video for the space and ceiling shots.
- These numbers are not phone, GPU, battery or thermal evidence.

## Not tested

Real phones and tablets (iOS Safari, Android Chrome), a real shared display, GPU rasterization,
low-power mode, autoplay policies and codec support on devices, network conditions and lazy loading,
screen readers (the live-region words are Frontend's), haptics, 200% text with the films running,
and the runtime adoption itself. Desktop screenshots and renders prove none of these.

## Contract requests

R1 to R7 in [`motion-bible.md`](motion-bible.md#contract-requests-for-integration): a presentation
stage for the Blackhole's stage cut only (R1, open, awaiting the owner; the default needs none), the
capsule exit (R2, answered: S2 on the board), the rescued patient's placement (R3, answered: the
snapshot's, A/B or the Jail), walk origins after reconnect (R4), navigation transit (R5), each
Promise's result at its own opportunity (R6), shown drawings' moment (R7). Until answered, each scene
uses the stated fallback; nothing invents a field.

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
