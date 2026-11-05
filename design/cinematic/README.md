# Cinematic library (pilots)

Development-only design source for GameN's event-driven cinematics: three pilot treatments on the
approved Comic Noir art, rig and films, their exports, a motion bible and event catalogue, live-action
insert studies and a review gallery. Nothing here is a client, a rule or a server contract; every page
is a review page on synthetic fixtures, kept out of production bundles.

| Pilot | What it is | Built on (unchanged) | Status |
| --- | --- | --- | --- |
| 1 · Hospital drone and recovery (`pilots/hospital-rescue/`) | A cinematic pass over S5: the ceiling iris, the drone's descent in perspective, searchlight, scan fan, charge, the revival pulse's rings, burst, sparks and THUMP, the monitor's beeps, the close-up ECG panel, the patient sitting up (blended rig poses) and the drone's exit; a display cut with camera shots, a board treatment, a 1.6 s nonblocking variant, S5's reduced variant, and an identity-free drone insert | S5 (`board-v2/films/medical.mjs`), the four-berth ward (`board-v2/fx/medical-four.mjs`, `scenes/hospital-ward-four.mjs`), the rig | pilot (proposal) |
| 2 · Blackhole reveal and passage (`pilots/blackhole/`) | The board pulled into an ink bloom, a lensed blackhole forming, the luminous BLACKHOLE title, the ship's passage, an ink-wipe cut and the settled board; a phone band (2.4 s), still cards, titled and textless identity-free inserts | new art: the ship in profile, the blackhole, the lensed starfield, Ink Block lettering | pilot (proposal) |
| 3 · Private Talk capsule (`pilots/private-talk/`) | A comic page on the display: each participant's room and the capsule's interior; the pair stand, step out, walk in by their paths, sit, converse (speaker-neutral), and walk back | S2 (`board-v2/films/capsule.mjs` and its scene, figures and paths), the rig, the rooms | pilot (proposal); phones keep S2 |

## Entry points

- Stage (one pilot, one surface, seekable): `stage.html?pilot=<id>&surface=display|phone|insert&variant=full|short|reduced[&case=entrance|talk|exit][&w=390&h=844]&beds=4&t=<ms>`; `window.__cine.seek(t)`.
- Gallery: `node design/tools/cinematic-serve.mjs`, then `/cinematic/gallery.html` (scrub, play, reduced switch mid-film, phone sizes, deliver/duplicate/late/cancel/reconnect/hidden-tab simulation, audience and status, the exported videos).
- Renders: `node design/tools/cinematic-audio.mjs`, `node design/tools/cinematic-exports.mjs`, `node design/tools/cinematic-manifest.mjs` (Chromium via `CHROME_PATH`, ffmpeg).
- Docs: `node design/tools/cinematic-docs.mjs` writes `docs/design/cinematic/motion-bible.md`, `catalogue/catalogue.json` and `docs/design/cinematic/inventory.md`.
- Inventory: `node design/tools/cinematic-inventory.mjs` and `node design/tools/cinematic-contact.mjs` (git objects only).

## Layout

```
lib/        ease (timing), comic (effects), lettering (Ink Block), scene (rig + scene composition),
            audio (procedural cues), stage-kit (stage helpers)
pilots/     <pilot>/film.mjs (beats and pure frame functions), art.mjs, compose.mjs, stage.mjs
catalogue/  catalogue.mjs (the motion bible's source) and its JSON twin
inventory/  inventory.json, contact-before-after.png/.json
exports/    <pilot>/{review,runtime,stills,audio}/ and manifest.json
```

`runtime/` exports are identity-free (no name, character, role, outcome, control or variable text)
and eligible as prerendered movies after Integration review; `review/` exports draw the synthetic
fixture's characters and are review only. Live-action inserts: **not produced** (studies in
`docs/design/cinematic/live-action/`). The Frontend handoff is `docs/design/cinematic/frontend-handoff.md`.
