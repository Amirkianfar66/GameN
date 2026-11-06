# Cinematic library (pilots)

Development-only design source for GameN's event-driven cinematics: three pilot treatments and a
display cut of the Captain's EJECT on the approved Comic Noir art, rig and films, their exports, a motion bible and event catalogue, live-action
insert studies and a review gallery. Nothing here is a client, a rule or a server contract; every page
is a review page on synthetic fixtures, kept out of production bundles.

| Pilot | What it is | Built on (unchanged) | Status |
| --- | --- | --- | --- |
| 1 · Hospital drone and recovery (`pilots/hospital-rescue/`) | A cinematic pass over S5: the ceiling iris, the drone's descent in perspective, searchlight, scan fan, charge, the revival pulse's rings, burst and sparks, the monitor's beeps, the patient sitting up (blended rig poses), the drone's exit, then the release: the patient stands and walks out of the ward to the place the snapshot gives (Room A or B if free, the Jail if still detained), the berth left empty; the patient's authoritative figure on the board is never hidden, greyed or moved (the owner's correction of 6 November 2026). The board treatment (phones and the display, the default), a covering display cut with camera shots, THUMP, BEEP, the ECG panel and a closing panel at the destination (only where nobody decides), a 1.6 s nonblocking variant, a reduced variant, and an identity-free drone insert | S5 (`board-v2/films/medical.mjs`), the four-berth ward (`board-v2/fx/medical-four.mjs`, `scenes/hospital-ward-four.mjs`), the rig, the rooms | pilot (proposal) |
| 2 · Blackhole reveal and passage (`pilots/blackhole/`) | Behind the crew (phones in P27's stage, and every surface at the Jail vote's start while the stage's phase kind is missing, R16; 2.4 s): each room's back wall gives way to one field of space, a lensed blackhole forming at the board's centre, the ship streaking behind the rooms into it, the flare, the walls returning; nothing covered. A stage cut (the ink bloom, the BLACKHOLE title, the passage, the ink wipe: 5.2 s, display only, for P27's six-second presentation stage after an actual Sync, R1), a reduced still, titled and textless identity-free inserts | new art: the ship in profile, the blackhole, the lensed starfield, Ink Block lettering | pilot (proposal) |
| 3 · Private Talk capsule (`pilots/private-talk/`) | A comic page on the display for the entrance, in the five-second result stage: each participant's room and the capsule's interior; the pair stand, step out, walk in by their paths and sit. The talk (speaker-neutral) and the exit are S2's on the board, the display included | S2 (`board-v2/films/capsule.mjs` and its scene, figures and paths), the rig, the rooms | pilot (proposal); phones and the exit keep S2 |
| Cut · Captain EJECT on the display (`pilots/eject/`) | S7's EJECT in five shots for the shared display: the console close up, the Jail's wall (lockdown and airlock), the hull from outside, the closure with the memorial plaque; S7's four stills when reduced; an identity-free exterior insert | S7 (`board-v2/films/captain.mjs`, `fx/captain.mjs`), the Jail scene, the rig | review study, never mounted: no covering EJECT stage is approved; S7 on the board is the runtime EJECT on the display and every phone |
| Role films · one per role (`pilots/role-reveal/`) | A ten-second film on the player's own phone after the role card is revealed, inside the role-reading stage (the owner, 6 November 2026). It opens in the briefing room at the dock, before boarding: the player's own character takes the role's gadget from the desk where their role card stands, drawn as the phone draws it (the owner's reviews of the pilot). Then a comic page of three panels tells a small back story, mostly in pictures: two panels of memory in sepia, each with a few words, then one aboard, at what the role does. Last, the role's name is stamped on a paper plate. All of it is lit and shot as an animated noir comic. Every role keeps the same length, beats, palette and silence; reduced motion is three stills. The Doctor is drawn (the pilot); the other eight are storyboarded in `docs/design/cinematic/role-reveal.md` | the role cards' held devices (`design/exports/roles`, group 8's Engineer device), group 7's team emblems, Pilot 2's ship, S5's drone and the medical palette, the rig (the player's own character in colour, everyone else as ink silhouettes) | pilot (proposal) |

Gameplay visibility (`lib/visibility.mjs`): by default every film is a board treatment, under every
name tag, press area, room label, timer and bar. A covering form (the Rescue cut, the capsule page)
plays only in a phase where nobody decides (`HACK_RESULT`, `VOTE_RESULT`, `FINISHED`, `ABORTED`),
inside that phase's time; elsewhere its board treatment plays instead. The Blackhole's stage cut plays
only in its own stage (P27: six seconds after an actual Sync, then the full Jail vote; its phase kind
is R16), and the EJECT never covers: its cut is a review study (no covering EJECT stage is approved).

## Entry points

- Stage (one pilot, one surface, seekable): `stage.html?pilot=<id>&surface=display|cut|phone|insert&variant=full|short|stage|reduced[&case=free|detained|entrance|talk|exit][&w=390&h=844]&beds=4&t=<ms>`; `window.__cine.seek(t)`. Surfaces and variants per pilot: the gallery's table. `beds=4` is required for the four-berth geometry. The EJECT: `pilot=eject&surface=display|phone|cut|insert&variant=full|reduced` (display and phone: S7 on the board; cut: the covering cut).
- Gallery: `node design/tools/cinematic-serve.mjs`, then `/cinematic/gallery.html` (scrub, play, reduced switch mid-film, phone sizes, deliver/duplicate/late/cancel/reconnect/hidden-tab simulation, audience and status, the exported videos).
- Renders: `node design/tools/cinematic-audio.mjs`, `node design/tools/cinematic-exports.mjs`, `node design/tools/cinematic-manifest.mjs` (Chromium via `CHROME_PATH`, ffmpeg).
- Docs: `node design/tools/cinematic-docs.mjs` writes `docs/design/cinematic/motion-bible.md`, `catalogue/catalogue.json` and `docs/design/cinematic/inventory.md`.
- Inventory: `node design/tools/cinematic-inventory.mjs` and `node design/tools/cinematic-contact.mjs` (git objects only).

## Layout

```
lib/        ease (timing), comic (effects), lettering (Ink Block), scene (rig + scene composition),
            audio (procedural cues), stage-kit (stage helpers), visibility (board or cover, by phase)
pilots/     <pilot>/film.mjs (beats and pure frame functions), art.mjs, compose.mjs, stage.mjs
catalogue/  catalogue.mjs (the motion bible's source) and its JSON twin
inventory/  inventory.json, contact-before-after.png/.json
exports/    <pilot>/{review,runtime,stills,audio}/ and manifest.json
```

`runtime/` exports are identity-free (no name, character, role, outcome, control or variable text)
and eligible as prerendered movies after Integration review; `review/` exports draw the synthetic
fixture's characters and are review only. Live-action inserts: **not produced** (studies in
`docs/design/cinematic/live-action/`). The Frontend handoff is `docs/design/cinematic/frontend-handoff.md`.
