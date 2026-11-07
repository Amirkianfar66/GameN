# Crew drawing release

The game owner's approved restyle of the nine crew characters (7 November 2026; PRs #191 and #192), packaged for runtime adoption (DSN-REQ-17). The handoff, with the API, mounting, caching, motion and the inventory, is [docs/design/crew-drawing-release.md](../../docs/design/crew-drawing-release.md).

| Path | What it is | Runtime? |
| --- | --- | --- |
| `source/` | The drawing: `crew.mjs`, `ink.mjs`, `head.mjs` and `heads/` (the approved traces, byte for byte), `figure.mjs`, `wardrobe.mjs` (the drop-in for the rig's), `motion.mjs`, `mount.mjs`, `portrait.mjs`. Each starts with `// mothership:dev-only`; a port drops that line and rewrites two import specifiers, nothing else | **Yes**, as exact ports, once Integration registers them |
| `assets/` | Baked exports: the nine cards, standees and app-icon portraits, and the nine held devices with the new suit's sleeve; `manifest.json` gives each one's hash, box, anchors and the shipped file it replaces | **Yes**, once Integration builds them into the bundles |
| `release-candidate.json` | The handoff record: every source, its hash and its port's, the runtime paths, the import rewrites, the rig modules depended on, the consumers' import swaps, the asset manifest's and the tokens candidate's hashes, and the films art to retire | No (a record) |
| `review.html`, `review.mjs` | The review page: the motion stage and the comparison of today's drawing and the release's | No (dev-only) |
| `review/` | Review media: the full and reduced-motion previews, their posters, the comparison sheet, `renders.json` | **No**: review media, never imported or bundled |

Regenerate and check:

```sh
node design/tools/crew-drawing-export.mjs           # assets/ and release-candidate.json
node design/tools/crew-drawing-export.mjs --check   # the same, compared with the files; writes nothing
node design/tools/crew-drawing-render.mjs           # review/ (needs CHROME_PATH and ffmpeg)
node --test packages/design-tokens/test/crew-drawing.test.mjs
```

Not part of the release: `design/character-pilot/` (the prototype the owner reviewed; never imported or ported), and the rig's own frozen sources under `design/board-motion/figures/`, which are unchanged and still drive the skeletons, gestures, walk, easing and places.
