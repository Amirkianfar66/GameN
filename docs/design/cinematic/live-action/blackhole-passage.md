# Live-action study: blackhole passage

**NOT PRODUCED.** Pre-production only: no footage exists. Comic counterparts, delivered and working:
`design/cinematic/exports/blackhole/runtime/space-insert-titled.mp4` and `space-insert-textless.mp4`
(identity-free) and the stage cut `review/display-stage.mp4` (a proposal for a presentation stage the owner
has not approved, R1; the default plays behind the crew on the board, `review/display-full.mp4`).
Like the stage cut, a live-action plate would cover the board, so it could play only in such a
stage, never over the Jail vote.

## Treatment

A practical model shot of the mothership falling into a blackhole: a lensed accretion disk burning
white-gold at its inner edge, the ship's steel hull catching that light as it accelerates, stretches
and vanishes into the shadow, a ring of light flaring at the horizon, then the ship bursting back out
toward the lens. It plays only after the authorized Sync (BLACKHOLE_SYNCED), says nothing about
which reality was chosen, how many existed or who acted, and is the same at every Sync. The title is
never baked in: the textless plate takes the runtime's vector title (the comic `titleSvg()`).

## Shot list (on the comic film's beats, stage cut)

| # | Time in cut | Shot | Lens / move | Action | Comic frame |
| --- | --- | --- | --- | --- | --- |
| 1 | 620-1900 ms | Wide, the hole forms | 24 mm, slow push (7%) | Disk spins up from a point; lensed far side bends over the shadow; starfield lensed | `design/cinematic/exports/blackhole/stills/frame-1000.webp` |
| 2 | 1050-2900 ms | Same; title space kept in the lower third | locked | Plate holds for the vector BLACKHOLE title | `stills/frame-1500.webp` |
| 3 | 1700-3250 ms | Ship enters frame top right toward the hole | 50 mm, slight follow | Ship accelerates, stretches along its heading, echoes (time slices) behind | `stills/frame-2700.webp`, `stills/frame-3150.webp` |
| 4 | 3250-3650 ms | Horizon flare | locked, 9 px shake decaying | Photon ring flares; ring of light expands | `stills/frame-3550.webp` |
| 5 | 3350-3900 ms | Ship emerges toward the lens | 35 mm, ship fills frame | Out of the shadow, nose toward camera, into the cut | `stills/frame-4100.webp` (the ink-wipe cut) |

## Production prompts (exact)

Practical shoot brief:

> Motion-control model shot. A 60 cm miniature of a long steel-grey spaceship in profile (bridge
> window band lit amber at the bow, a dorsal fin, two engine nacelles with cyan exhausts, ink-black
> panel seams, halftone-like weathering), flown on motion control across black velvet toward a
> separately shot practical accretion disk (a spinning acrylic disk lit edge-on in white-gold to
> amber, with a black disc mask at its centre). 30 fps, 4K, ProRes 4444; separate passes: ship
> beauty, ship engine glow, disk, light ring flare, clean star plate. No people, no text, no logos.

Generated plate (only with an authorized tool and licence):

> A long steel-grey spaceship with an amber-lit bridge window band and cyan engine exhausts falls
> toward a blackhole: a black shadow ringed by a thin white photon ring, a tilted white-gold to amber
> accretion disk whose far side bends over the top of the shadow, a starfield bent around it; the
> ship accelerates, stretches and vanishes into the shadow, a ring of light flares, then the ship
> bursts back out toward the camera; graphic-novel lighting, deep black space, no text, no people,
> 4 seconds, 4K.

## Grade and composite into Comic Noir

1. Composite the passes over the comic starfield (`lensedStars()`), keeping the disk's palette to the
   comic's (`VOID.disk`: `#FFF8E8`, `#FFE29A`, `#F2C14E`, `#E0892E`, `#7A3A1C`).
2. Posterize the ship to 5 bands in the hull steel (`#4A5568`, `#8A97AB`) and ink; ink contour 4 px.
3. Halftone the disk's outer half (dots 9 px, 18 degrees, `#E0892E` at 28%).
4. Never brighten the full frame: the flare is a ring, not a flash (no full-frame flashes).
5. Textless master always; the title is the runtime's vector layer.

## Provenance and rights plan

As for the drone study: record crew, gear and passes (filmed), tool, version, prompt, seed and
account (generated), or library, clip id and licence (stock). Nothing has been started or
purchased; each path needs the owner's authorization first.
