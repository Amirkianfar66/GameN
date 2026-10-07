# design/

The Visual and Motion Designer's working directory for Mothership. Start with [docs/design/README.md](../docs/design/README.md): status, provenance, open decisions and how to run everything.

| Directory | What is in it | Edit it? |
| --- | --- | --- |
| `source/` | The artwork: layered SVG drawn by hand, and `export-recipes.json`, which says how each export is lifted out of it. `board/` holds the five rooms and their caption icons, `crew/` the nine characters, `devices/` the nine role devices. `source/studies/` and `study-recipes.json` are the two synthetic studies, kept apart | **Yes. This is the editable source** |
| `exports/` | The assets: one stylesheet per bundle holding every picture in it, the same pictures as content-hashed files, two sprites, and `asset-manifest.json` | No. Written by `tools/build-exports.mjs` |
| `studies/` | The two synthetic disclosure studies and `study-manifest.json`. Not assets, in no bundle, never connected | No. Written by `tools/build-exports.mjs` |
| `contract/` | Components and states, motion cues, the studies, layout callouts, planned assets, proposed copy, the catalog of the nine characters | Yes. The generated pages under `docs/design/` follow |
| `prototypes/` | Reference stylesheets (`css/comic.css`, `css/cues.css`), the loader (`js/bundles.js`) and the review pages | Yes, except `css/tokens.css` and `js/*-index.js`, which are generated |
| `review/` | Renders of the review pages, and the reports of the two browser checks | No. Written by `tools/render-review.mjs`, `tools/check-layout.mjs` and `tools/check-shell.mjs` |
| `explorations/` | Looks tried with the game owner. `comic-board/` is the working page the owner approved on 7 October 2026: start with its README. Its drawings are sources now, and it draws from `source/`; it still shows the parts of the direction that are not adopted. Development only: not assets, not contract, not shells | Yes. Every file carries `mothership:dev-only`, and nothing in the directories above may reach into it |
| `tools/` | Build, check, document and render scripts. Node built-ins only | Yes |

## Drawing rules for a source

A source is a sheet. Wrapper groups lay the sheet out; the layers inside them are what gets exported.

- A layer is a group with an `id`. It carries its own paint and may carry its own transform. Nothing above it may give it paint: the build refuses a layer that would inherit `fill`, `stroke`, `opacity` or a clip from a wrapper.
- Layers that are not part of the idle picture carry `display="none"`, so the file opens showing something sensible. The export removes it.
- Ten elements and a short list of attributes are allowed (`tools/lib/svg.mjs`), and nothing else: no text, title, raster image, filter, style, script, link or reference outside the file. Words are live text in the client.
- A paint is `none`, a six-digit hex color or a reference to a definition in the same file. The colors are token values, written as literals so the file opens in any vector editor; a check refuses one that is not in the palette the asset is allowed. A shape with no fill of its own or from its layer is refused, because it would be drawn in black.
- **A room is drawn in the five steel values.** Its recipe prints it in the room's own color family from the tokens (`color.room`), tone for tone; a check refuses any other swap. So a room's colors are decided in one place, and the file you open is grey on purpose.
- **A character uses its own three colors** from the tokens (`color.crew.cN`), the hair colors, and the tones every picture shares. A check refuses another character's color in it, and a team accent anywhere in it.
- **A role's device uses its own team's accent** and no other team's, and is exported into the role bundle only.
- Definitions (`pattern`, `clipPath`) live in the file's `<defs>` with ids that are unique across all sources.
- Outside the role bundle, no layer, variant or asset is named after a role, a faction or a private thing.

## How art reaches a page

A bundle is one stylesheet, `exports/<bundle>/<bundle>.art.<hash>.css`, in which every picture is a custom property holding the picture itself. A page loads the bundles of its surface once, whole, before it shows anything, and marks each one that arrived in `data-art`; the reference stylesheet draws a picture only behind that mark. Nothing is fetched because of what a view says. `prototypes/js/bundles.js` is the whole of it.

## After an edit

```sh
node design/tools/build-exports.mjs     # exports, studies, both manifests, the review pages' generated files
node design/tools/write-docs.mjs        # the generated pages under docs/design/
node design/tools/render-review.mjs     # review images; needs a Chromium-based browser
node design/tools/check-layout.mjs      # the layout matrix; needs a browser
node design/tools/check-shell.mjs       # requests and the public layer across private states; needs a browser
node design/tools/check-assets.mjs      # fifteen checks, no browser; refuses renders and reports made before the edit
```

`node design/tools/prove-checks.mjs` shows that the two browser checks refuse known mistakes. Run it after changing either of them.

Everything under `prototypes/` and `review/` is synthetic and for development only. None of it is the game and none of it is shipped. Everything under `studies/`, and the four files of the review kit that reach it, has no approved fact behind it and must never be loaded by a connected match.
