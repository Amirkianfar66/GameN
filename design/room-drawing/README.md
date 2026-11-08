# Room drawing release

The game owner's approved redraw of the five rooms to match the crew (8 November 2026; PR #197), packaged for the board (DSN-REQ-18). The handoff, with what each picture replaces, how the pictures are made, the size and the dispatch, is [docs/design/room-drawing-release.md](../../docs/design/room-drawing-release.md).

| Path | What it is | Runtime? |
| --- | --- | --- |
| `assets/` | The 18 exports: each room's back picture, the layers drawn in front of its places, and its lights-out picture, trimmed. `manifest.json` gives each one's hash, size, depth, and the bundle, property and shipped picture it replaces | **Yes**, once Integration builds them into the bundles |
| `release-candidate.json` | The record: the approval, the sources, dependencies and inputs with their hashes, the trim, the consumers and their exact-release dispatch, what is not replaced, the sizes | No (a record) |
| `review.html`, `review.mjs` | The review page: each room released, lit and with the lights out, beside today's lights-out picture | No (dev-only) |
| `review/` | `night.png`, and `renders.json` with the trim's evidence from desktop Chrome | **No**: review media, never imported or bundled |

The drawing the exports come from is `design/room-pilot/` (Room A by hand, the other four shape for shape from today's pictures, the lights-out pictures and the trim). It stays a development tool: no code is ported, and the runtime reads only the exports, as bundles.

Write and check:

```sh
node design/tools/room-drawing-export.mjs           # assets/ and release-candidate.json
node design/tools/room-drawing-export.mjs --check   # the same, compared with the files; writes nothing
node design/tools/room-drawing-render.mjs           # review/ (needs CHROME_PATH)
node --test packages/design-tokens/test/room-drawing.test.mjs
```
