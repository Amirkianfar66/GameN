# Brand intro, version 2: Designer's runtime component

**Version:** `pregame-brand-2.0.0`. **Status (16 November 2026):** built on the owner's decision of 16 November 2026 that every pre-game film follows the boarding pilot (recorded by the Lead Designer on [#280](https://github.com/Amirkianfar66/GameN/pull/280)); the interface below was agreed with the Lead Designer the same day. It is for the Lead's review, then the owner's. It is not in the game, and it is not a release. Today's film (`apps/game/hosted/pregame-films/brand/brand.mjs`) is untouched and stays live until the player's brand kind is switched, in a connection PR of its own.

**What it is:** the two seconds a player sees on the app's first entry: black, a cursor, "Game N" typed, then "by Plan B". The owner asked for it simple (8 November 2026: "something simple with typing motion graphic effect"), so nothing is added to the story. Every time of today's film is kept, and its layout, its letters and its black. What is new is how a key lands, the light and depth the letters take, how the film ends, and the way it plays.

**Not in this commit yet:** the probe, the check tool with its captures under the production headers, the measured frame rate and the review videos. They come next in this PR. Until then nothing below is evidence of how it plays on a phone.

## What changed, beat by beat

| Time | Today | Version 2 |
| --- | --- | --- |
| 0–60 ms | Black | The same |
| 60 ms | An amber cursor appears. It is solid for 160 ms after it arrives on a line and after each key, and blinks while it waits | The same cursor by the same rule, with its own light round it |
| 220–610 ms | "Game N" typed: keys at 220, 300, 372, 452, 545 and 610 ms. Each letter fades in over 35 ms with a small lift | The same six times. Each letter comes down to the page, larger, and lands at 64 ms: a jolt of one pixel through the frame, a moment of light on the letter, a fleck of its ink thrown from each side of its foot, and its shade parting from it as it settles (by 190 ms) |
| 860 ms | The cursor drops a line | The same |
| 900–1,275 ms | "by Plan B" typed: nine keys, quicker and smaller, in a warm grey | The same nine times, struck lighter: under half the jolt and the light, and no flecks |
| 1,275–1,700 ms | The cursor blinks while the name is read | The same blink. **New:** one sheen crosses the name from 1,330 to 1,590 ms: a light passing, low |
| 1,700–1,960 ms | Everything fades | **New:** the boarding film's ink closes over the name, and it is black by 1,950 ms |
| 1,960–2,000 ms | Black | The same |

- **The letters** are the brand's own (Ink Block, drawn as strokes: no font file), in today's colours. Each now has a face lit from above, a thin edge of light along its upper left, a shade below and to its right, and a soft glow.
- **The two lines stand where today's do:** one block, left-aligned and centred, "Game N" 62 % of a phone's width, and at most 12 % of a wide screen's height.
- **Black is today's `#000000`,** as the owner asked, not the boarding film's night.
- **The ink is the boarding film's tide,** blot for blot (`mark.mjs`, `paintTide`), laid from the surface's own edges. Black ink on black shows nothing until it reaches the name, so the film plays only the part of the tide between its first touch of the two lines and its covering them. On a phone it closes from the sides; on a wide screen from above and below.

**Reduce motion** (the game's or the device's) is today's: both lines whole, in over 200 ms, held, and out from 1,700 to 1,960 ms. No typing, cursor, jolt, fleck, sheen or ink, and the scene asks the page for no frame of its own. The held picture is version 2's name at rest.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/brand-film/`:

| Path | What |
| --- | --- |
| `brand-film.mjs` | `createBrandScene()`, `brandFrame()`, `cursorBox()`, `layout()`, `BRAND_FILM_VERSION`, `BRAND_MS`, `BRAND_TEXT`, `BRAND`, `NIGHT`, `TYPING`, `BEATS`, `STILL`, `STRIKE`, `BLINK_MS`, `TYPING_HOLD_MS`, `COAST_MS`, `VARIANTS`. The clock, the letters and the scene |
| `brand-film.css` | Every style, scoped under `.ms-brand-film`: the black, the two canvases, the light's blend |
| `imports.json` | Every file the film imports from outside its folder, each with its SHA-256 |
| `preview/` | Development only: the preview (the same files) |

**Imported as they are.** Nothing is copied, moved or edited, and a test holds each file to its hash:

| File | SHA-256 (first 16) | What is used of it |
| --- | --- | --- |
| `design/phone-ui/components/boarding-film/engine.mjs` | `1bc8dcaa26614371` | `createLight`, `drawn`, `glow`, `rgba`, `silhouette`: pictures made on the spot, and the quarter-size light layer |
| `design/phone-ui/components/boarding-film/mark.mjs` | `3b8da6b4aab40c99` | `paintTide`: the ink that takes the name to the night |
| `apps/game/hosted/pregame-films/kit/letters.mjs` | `a16b9159d8ab2547` | `GLYPHS`: the brand's own letters, as strokes |
| `apps/game/hosted/pregame-films/kit/math.mjs` | `1c27a89fa9803516` | `clamp`, `clamp01`, `ease`, `envelope`, `hash`, `lerp`, `progress`, `shake` |
| `apps/game/hosted/pregame-films/kit/fx.mjs` | `efb684c8ea0ff76d` | Nothing by name: `mark.mjs` and `letters.mjs` import it (the tide's blots) |

The first two are the boarding film's ([#285](https://github.com/Amirkianfar66/GameN/pull/285)), which is not on `main` yet: this branch is stacked on it. No package is imported. Today's film and the live player are not in its graph.

## How to connect it

It is a drop-in for the brand kind of the pre-game player's scene (`createPregameScene(picture, { kind: 'brand', options })` in `apps/game/hosted/planet/pregame-scene.mjs`): the same `paint`, `dispose` and `stats`.

```js
import { createBrandScene } from '…/brand-film/brand-film.mjs';
// and link …/brand-film/brand-film.css

const scene = createBrandScene(holder, { options: {} });
scene.paint(t, { width, height, variant });   // each time the player paints, as today
scene.dispose();                              // on every exit, as today
```

| Part | What it is |
| --- | --- |
| `holder` | The element the film fills (the player's picture element). The film appends one element, `.ms-brand-film` (`aria-hidden="true"`, `pointer-events: none`), black, sized by `paint`'s `width` and `height` |
| `options` | Nothing is read from it. The film has no input but the time, the size and the variant |
| `paint(t, { width, height, variant })` | Draws the film at `t` ms, clamped to 0–2,000. `t` is whatever the player gives: today its own clock from the app's first entry. `variant` is `'full'` or `'reduced'`; any other throws. The device's Reduce motion gives the reduced film whatever is asked |
| Between paints | The scene keeps the picture moving from the last time it was given, at the screen's rate: the player may go on painting 30 times a second. It stops by itself 500 ms after the last paint (`COAST_MS`) and at 2,000 ms |
| `suspend()`, `resume()` | `suspend()` stops the scene's own frames (the page is hidden, the stage is covered); a paint still draws its frame. After `resume()` the next paint restarts them |
| `dispose()` | Removes the film and gives back its memory |
| `stats` | `version`, `paints`, `frames`, `ownFrames`, `drawMs`, `worstMs`, `pictures`, `bytes`, `bakeMs`, `scale`, `quality`. `scale` is the frame's pixels a point; `quality` is always 1 (below) |
| `ready()` | Resolves at once: the film's pictures are drawn inside the first paint. For a recording or a test |
| `createBrandScene(holder, { live: false })` | Draws only when painted (a recording, a test): the scene then never asks for a frame |

**There is no prepare call, and none is needed.** The film's pictures are twelve letters, each drawn from its own strokes straight onto a canvas inside the first paint. No SVG is made into a picture, so nothing is waited for.

**The film never advances anything.** It takes no callback, listens for nothing and tells no one; its end means nothing. The player ends it, as today.

**No Skip and no words of its own.** Both stay the player's: no Skip on the intro, and the dialog's name and status line ("Game N, by Plan B"). `BRAND_TEXT` is the same text. The picture is hidden from a screen reader.

**Audience: public.** It reads no match, player, role or roster.

**What Frontend and Integration decide:** admitting the film's files to the hosted build, and linking its stylesheet. The switch of the player's brand kind is a connection PR of its own, written by Designer's builder and reviewed by Frontend.

## How it plays

- **Pictures are drawn once.** Each letter is four pictures: its face, its shade, itself in white (the light on it as it lands, and the sheen) and its glow. A frame places them. A letter at rest lies on the frame's own pixels, so it is laid without resampling.
- **The canvas is only as large as the two lines and the room their light needs** (on a phone about 386 × 243 points of 390 × 844). The black round it is the element's own. Soft light is drawn on a second canvas a quarter of the size each way, stretched over the first and added to it (`mix-blend-mode: screen`), as the boarding film's is.
- **A frame is a function of the time it is given.** The same time gives the same picture; seeking back gives what a film just begun draws there; from 1,960 ms it is black.
- **It is always drawn at the screen's own pixels** (three a point at most). The boarding film draws a slow phone's frame less sharp; this film does not. It plays while the app is starting, when a slow frame is the app's own work and a softer name would not make it faster, and its frame is small enough not to need it.
- **Where the ink begins and ends is asked of the tide itself,** drawn small ten times. That is done a step a frame while nothing moves but the cursor, so it never delays a letter. A film that reaches the ink without it (one that joined late) finishes the search then.
- **Within the hosted game's Content Security Policy:** nothing external, no evaluated code, no worker, no image and no markup.

## Limits

- **No phone was measured.** The frame rate, the first paint's time and the captures come with the check tool, in desktop Chromium.
- **Sound** is a separate owner decision; the film has none.
- **The light's layer** needs `mix-blend-mode: screen`. On black, without it the light would still read as light; over the letters it would lie as a faint haze.
- **Only the brand intro is made again here.** The role films are as they were.

## Checks

```
npm run test:design      # packages/design-tokens/test/brand-film.test.mjs among them
```

The test holds the module graph and each imported file's hash, what the source may do, the styles' scope, and that every time, place and fade is today's: the keys, the cursor's box at every millisecond, the layout at five sizes and Reduce motion's fades.
