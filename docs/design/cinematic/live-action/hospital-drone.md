# Live-action study: medical drone deploy

**NOT PRODUCED.** Pre-production only: no footage exists. Comic counterpart, delivered and working:
`design/cinematic/exports/hospital-rescue/runtime/drone-insert.mp4` (identity-free comic insert) and
the display cut `review/display-full.mp4`.

## Treatment

A practical, tactile insert for the Rescue's ceiling beat: the ward's ceiling dock irises open with a
pneumatic snap, cold cyan light falls through it, and the medical drone drops out of the dark toward
the lens, rotors humming, arms tucked; the frame ends as it fills the lens. Hands, faces and patients
are never in shot: the insert is the machine alone, so it is the same for every Rescue and every
player. Played at 600 to 1150 ms of the 5.6 s display cut (the comic cut-in), or as the separate
1.4 s insert; the board form on phones never uses it.

## Shot list (on the comic film's beats)

| # | Time in cut | Shot | Lens / move | Action | Comic frame |
| --- | --- | --- | --- | --- | --- |
| 1 | 600-880 ms | Extreme close-up, ceiling dock from below | 35 mm, locked, slight upward tilt | Six-blade iris opens with a snap and a 5% overshoot; cyan practical light inside | `design/cinematic/exports/hospital-rescue/stills/frame-0950.webp` |
| 2 | 800-1150 ms | Same axis | Locked; focus pull from iris to drone body | Drone drops through the iris, tucked arms, rotor ring glowing; exits frame bottom with a slight motion blur | `stills/frame-1300.webp` |
| 3 (optional, 3500 ms) | 3 frames | Macro on the drone's probe tips | 100 mm macro | Charge crackle and a single cyan flash at the probe tips (no patient in frame) | `stills/frame-3300.webp`, `stills/frame-3600.webp` |

## Production prompts (exact)

For a practical shoot (shot brief, to a model-maker and a DP):

> Practical miniature: a circular ceiling dock 30 cm across in a pale steel panel ceiling, painted
> navy and steel blue with ink-black panel seams; a six-blade mechanical iris (motorised, 250 ms
> open, slight mechanical overshoot) revealing a cyan LED cavity. A medical drone miniature, 18 cm
> wide: compact navy body, two rotor pods with cyan running lights, a yellow warning light on top,
> a central glass lens with a cyan ring, three short tucked arms. Rig the drone on a black rod from
> above; drop it 40 cm through the iris toward a locked-off camera on a 35 mm lens at 1/48 shutter,
> 30 fps, 4K, ProRes 4444 with a clean plate. Lighting: single cold cyan key through the iris, deep
> navy fill, no warm light. No people, hands or text in frame.

For a generated plate (only if the owner later authorizes a specific tool and its licence):

> Close-up from below of a circular six-blade iris in a steel spaceship ceiling opening with a snap,
> cold cyan light pouring out, a compact navy medical drone with two glowing rotor pods, a yellow
> top light and a central glass lens dropping out of the iris straight toward the camera, motion
> blur, dark navy surroundings, graphic-novel lighting, no people, no text, no logos, 2 seconds,
> locked camera, 4K.

## Grade and composite into Comic Noir

1. Key the drone and iris on the clean plate; keep the alpha (ProRes 4444 / EXR).
2. Posterize to 6 tonal bands; map shadows to ink `#151923`, mids to steel `#3A4A6B` / navy
   `#1B2747`, highlights to lens `#BFF7FA` and glow `#E8FBFF` (the medical palette,
   `design/board-v2/fx/medical.mjs` MEDICAL).
3. Edge-detect at 2 px and multiply an ink contour (`#151923`, 3-5 px at 1080 rows).
4. Overlay the comic halftone (dots 7 px pitch, 22 degrees) in the shadows at 35%.
5. Add the pilot's grain (`fxDefs` grain, 0.5 opacity) and letterbox (8.5% of the height).
6. Check against the comic frames above: the silhouette, light colour and timing must match so the
   live-action and comic inserts are interchangeable.

## Provenance and rights plan

| Path | Provenance to record | Rights needed before use |
| --- | --- | --- |
| Filmed (practical) | crew, date, location, camera, lens, frame rate, clean plate | work-for-hire or assignment of all footage; model-maker's design assignment |
| Generated | tool name and version, prompt (above, verbatim), seed, date, account | the tool's commercial-use licence for the account; no third-party likeness or trademark |
| Stock | library, clip id, licence class | a licence that covers interactive/game use worldwide, perpetual |

None of these paths has been started, and none may start without the owner's authorization of the
cost and the rights (the brief: no purchases or production charges without authorization).
