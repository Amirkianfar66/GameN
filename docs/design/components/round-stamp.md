# Round stamp: Designer's runtime component

**Version:** `round-stamp-0.1.0`. **Status (16 November 2026):** built by the Motion & Cinematics builder to the interface agreed by the Lead Designer on 16 November 2026 (#288), for the Lead's review. It is not in the game and it is not a release. Frontend connects it later; nothing game-side is started here.

**What it is:** the "ROUND 1" stamp that lands over the room as Round 1 begins. The pack draws it once: the last frame of [sheet 19](../../../design/phone-ui/review/sheets/19-boarding.jpg), "Round 1 begins". The handoff lists it with that sheet ("the Round 1 stamp"), and the boarding stage (#272) leaves it to Motion & Cinematics: "the stamp is Motion & Cinematics' round stamp, a later component placed over the room view, once the server's Round 1 view arrives".

**What the pack draws** (`design/phone-ui/prototype/screens-game.mjs`, the room screen's `stamp=round1` state):

- the pack's stamp in gold (`.stamp[data-tone="gold"]`): ink border, paper-gold ground, condensed capitals, tilted 4°, with the ink shadow;
- larger than a stamp in a sheet: `font-size: 2.25rem; padding: 10px 20px 8px`;
- centred in the phone, over the room and its tags;
- the room is on screen with the first turn in the bar (R1, 1:00).

The pack gives no time or motion for it: the handoff's Motion table has no row for the round stamp. Its time and motion were agreed with the Lead, from the pack's own stamp snap and the motion tokens.

The game imports the component as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)).

## Agreed by the Lead Designer on 16 November 2026

1. **How long:** 1,400 ms in all, a constant of this component (`ROUND_STAMP_BEATS`): 120 ms to land, standing until 1,180 ms, 220 ms to fade. It is not a motion token.
2. **Which rounds:** Round 1 only, as drawn. The component can name any round; 0.1.0 is checked for Round 1. A stamp at a later round is not in the sheets and would need the Lead's agreement and the owner's.
3. **Which phase:** the round's first phase that shows the room view, so the stamp is always over the room. Which phase that is stays Frontend's to pass. **The component only reads the `window` it is given.**
4. **Taps:** the stamp takes none, and the room under it stays usable. (The pack's frame gives its stamp its own taps and draws no room controls under it.)
5. **Sound and announcement:** none from the stamp. The bar says the round.

## The split

| Part | Whose |
| --- | --- |
| The stamp: its look (the kit's stamp, gold, at the pack's size), its words, its landing, how long it stands and its leaving | This component |
| When a round begins, which phase the stamp belongs to, and mounting it | Frontend, from the public view |
| The room under it, and the bars | The room scene and the shell |
| The round in the top bar ("R1") and any announcement | The shell and Frontend |

The stamp never reads a turn, a seat, a role or anything of this viewer's.

## Mounting

```js
// Over the room view, when the server's view first shows the round:
const stamp = mountRoundStamp(shell.slot('cover'), {
  round: view.round,                                        // 1
  window: { id: phase.id, startedAt: phase.startedAt },     // the public phase the stamp belongs to
  clock,                                                    // { now() }: the match's trusted server time
});
// Any time after it has gone, or when the room view leaves:
stamp.dispose();
```

`mountRoundStamp()` returns `{ element, update, suspend, resume, frame, dispose }`. Link `round-stamp.css`.

- **One element** in the shell's cover, `.ms-round-stamp`, holding the stamp. The cover lies over the stage, above the room's tags and under the bars, so the stamp never covers the bar's countdown.
- **It takes no taps,** anywhere (`pointer-events: none`), so the room under it stays usable from the first moment.
- **To assistive technology it is nothing:** `aria-hidden="true"`. The top bar already says the round, and Frontend's own announcement is unchanged.
- **The look is the kit's stamp** (`createKit().stamp({ text, tone: 'gold' })`), sized through this component's own part to the pack's `2.25rem` and `10px 20px 8px`. The kit is used as it is; nothing in it changes.
- **At large text it stays on one line, inside the phone.** See [below](#added-in-the-build-for-the-leads-review).
- It can share the cover with another component (the results reveal's host): each is its own element.

### Where it sits: the phone's centre, as the pack's

The pack lays its stamp over the whole phone (`position: absolute; inset: 0` in the phone), so the stamp's centre is the phone's. The shell's cover lies over the stage only, between the bars. Those two centres differ: by 3.5 px with the review frames' safe areas (47 and 34 px), and by more on a phone whose top safe area is taller.

The component follows the pack. Its element reaches past the cover to the phone's top and bottom edges, by the two measures the shell places its cover with (`--ms-ps-top` and `--ms-ps-stage-bottom`; edge to edge, the cover already fills the phone). Only the stamp is drawn, and it lies inside the cover. Mounted anywhere else, both measures are 0 and the element fills its parent.

**This reads two of the shell's custom properties**, without importing the shell. The stamp's test checks that the shell still places its cover by them, and the check measures the stamp against the pack's own frame at both sizes, so a change in the shell cannot move the stamp unseen. It is for the Lead to confirm, as the shell's owner: the alternative is the stage's centre (over the room picture), which is one line here and a recorded departure from the pack's frame.

## Added in the build, for the Lead's review

Two things the interface proposal did not have. Neither changes the stamp at the pack's two sizes and ordinary text, where the check finds it pixel for pixel the pack's.

1. **The phone's centre, not the stage's** (above): the proposal said "centred in the stage". The pack's frame centres it in the phone, 3.5 px higher at the review frames.
2. **A cap on its size at large text.** The pack's `2.25rem` grows with the text. Measured in desktop Chromium at 200 % text, the pack's size is 387 px wide on a 390 px phone (it touches both edges), and on a 320 px phone the words break onto two lines. So the size is `min(2.25rem, (the phone's width − 76 px) ÷ 5.4)` and the words never break:

   | Phone | Ordinary text | 200 % text, the pack's size | 200 % text, as built |
   | --- | --- | --- | --- |
   | 430 px | 36 px | 72 px: 19 px to spare each side | 65.6 px: 34 px each side |
   | 390 px | 36 px | 72 px: 1 px past each edge | 58.1 px: 32 px each side |
   | 320 px | 36 px | 72 px: two lines, past the right edge | 45.2 px: one line, 28 px each side |

   The phone's width is the kit's phone container (`100cqw`), which the shell's root is. The 5.4 is the width of "ROUND 1" in em with room for a wider letter font than this machine's (here it is 4.72 em); a phone's own font was not measured. A browser with no container units keeps the pack's `2.25rem`, uncapped.

## Inputs

**Every input is public, or this phone's own setting.** `nextRoundStampInput()` refuses any key it does not know, inside `window` too.

| Input | Audience | Default | What |
| --- | --- | --- | --- |
| `round` | Public | `null` | The round to name: a whole number from 1 (the public view's `round`). `null`: nothing is drawn |
| `window` | Public | `null` | `{ id, startedAt }`: the public phase the stamp belongs to, its id and its start in server ms. A new `id` is a new stamp. `null`: nothing is drawn |
| `clock` | Public | `null` | `{ now() }`: the match's trusted server time. `null`: nothing is drawn |
| `status` | Phone | `'live'` | `'live'`, `'stale'` or `'concealed'`, as the shell |
| `reducedMotion` | Phone | `false` | The game's Reduce motion (`data-motion="reduced"` on the element). The device's `prefers-reduced-motion` is honoured as well |

**Words:** `ROUND_STAMP_WORDS.round(n)` gives `Round 1`; the kit's stamp draws it in capitals, as the pack writes "ROUND 1".

## Time: the server's clock is the only time

- **Stamp time:** `t = clock.now() − window.startedAt`. The stamp keeps no clock of its own.
- **A late phone sees no stamp.** Past the stamp's length nothing is drawn and nothing is started. A phone that joins part-way sees the stamp from its moment, never from the start.
- **It never advances the game.** It has no callback and no skip. The server's phase has already started when it shows; it delays nothing.

**The beats** (`ROUND_STAMP_BEATS`):

| t | Beat | What |
| --- | --- | --- |
| 0–120 ms | `snap` | The stamp lands: from 1.6 times its size and clear, to its size and solid. The pack's "Stamp snap, 120 ms": `motionMs.registrationStamp` on `motionEasing.snap`, which goes a little past its size (to 98 %) and settles |
| 120–1,180 ms | `hold` | It stands, tilted 4° as the kit's stamp |
| 1,180–1,400 ms | `leave` | It fades out: `motionMs.cardTransition` (220 ms) on `motionEasing.standard`. It does not move |
| From 1,400 ms | `gone` | Nothing is drawn and nothing runs |

The stamp at the strip's moments, as a share of its size and how solid it is:

| t (ms) | 0 | 30 | 80 | 120 | 600 | 1,250 | 1,330 | from 1,400 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Full motion | 160 %, clear | 106 %, 89 % | 99 %, solid | 100 %, solid | 100 %, solid | 100 %, 29 % | 100 %, 4 % | gone |
| Reduce motion | 100 %, clear | 100 %, 38 % | 100 %, solid | 100 %, solid | 100 %, solid | 100 %, solid | 100 %, 88 % | gone |

**How it runs:** as the results reveal (#277). One Web Animation of the stamp's `transform` and `opacity` over the stamp's whole length, with its `currentTime` set to `t` from the trusted clock on mount, on `update()`, on `resume()`, when the phone is live again, and once more as the browser starts it. The browser runs the rest. The component has no frame loop, timer or clock. Outside the animation the stamp is not drawn, so when it ends nothing is left to clear.

**Reduce motion,** the game's or the device's: no landing. The stamp fades in over 80 ms (`motionMs.reducedMotionFade`), stands, and fades out over the last 80 ms (`ROUND_STAMP_REDUCED`). It is gone at the same moment, 1,400 ms. Turned on or off part-way, the stamp goes on from the clock's moment.

## States

| State | What the stamp does |
| --- | --- |
| 0–1,400 ms | The stamp, at the clock's moment |
| From 1,400 ms, or no round, phase or clock | Nothing drawn, nothing running |
| Reduce motion (the game's or the device's) | An 80 ms fade in, the stamp standing, an 80 ms fade out. No change of size |
| Stale (reconnecting) | Stands still where it is. Live again, it seeks to the clock, usually to `gone`. A stamp that had not begun on this phone does not begin while it is reconnecting |
| Concealed | Hidden, and nothing runs. Shown again, it seeks to the clock |
| Suspended | Held at the clock's moment. On `resume()` it seeks to the clock |
| A page with no Web Animations | Nothing drawn |

**`frame()`** returns `{ window, round, t, beat, scale, opacity, running, status, reduced, shown }` and `null` after `dispose()`. `roundStampFrame(t, { reduced })` gives `{ t, beat, scale, opacity }` as a pure function of time. `dispose()` is safe to call twice.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/round-stamp/`:

| Path | What |
| --- | --- |
| `round-stamp.mjs` | `mountRoundStamp()`, `nextRoundStampInput()`, `roundStampTime()`, `roundStampFrame()`, `ROUND_STAMP_DEFAULTS`, `ROUND_STAMP_VERSION`, `ROUND_STAMP_BEATS`, `ROUND_STAMP_REDUCED`, `ROUND_STAMP_EASING`, `ROUND_STAMP_FROM`, `ROUND_STAMP_WORDS`. It imports the kit and nothing else |
| `round-stamp.css` | Starts with `@import url("../kit/kit.css");`; every rule is for `.ms-round-stamp` |
| `preview/` | Development only: the shell with its bars and tabs, the room scene in the stage, and the stamp in the cover (`preview.mjs`); the probe (`probe.mjs`); the stamp beside the pinned pack's own frame (`agree.mjs`) |
| `review/` | The check's captures, strips, the stamp beside the pack, and `check.json` |

Also `design/tools/round-stamp-check.mjs` (on `design/tools/lib/component-check.mjs`), `packages/design-tokens/test/round-stamp.test.mjs` and this document. It loads no picture, imports neither the shell nor the room scene, and reads no `env()`.

## Evidence

In `design/phone-ui/components/round-stamp/review/`, from `node design/tools/round-stamp-check.mjs`, under the production headers:

- **20 captures:** both sizes; the landing held at 30 and 80 ms, standing, leaving at 1,250 ms, and gone; Reduce motion fading in and standing (the game's) and fading in (the device's); reconnecting at 60 ms; concealed. Each is checked for the size and strength its moment gives it, its centre at the phone's, its words, and the room's crew under it.
- **4 strips:** the stamp at the eight moments above, at both sizes, in full motion and with Reduce motion.
- **Beside the pack,** at both sizes (`agree-390x844.jpg`, `agree-430x932.jpg`): the pinned pack's own "Round 1 begins" frame and the phone with the stamp standing. The same words; the same look, property by property; the same box, to half a pixel; and the stamp's face compared pixel by pixel, with two controls (the stamp moved one pixel, and drawn 3 % larger) that do not pass.
- **The probe,** as the page comes and with the device's Reduce motion: seeking, a late phone with nothing drawn and nothing started, the run to its end, a long first frame, suspend and resume, stale and live, concealed and shown, a new phase and a new round, one animation at most, taps reaching the room under it, what assistive technology meets, refused inputs, dispose twice, and Reduce motion. It counts what the component starts synchronously around each mount or update.

## Limits

- **No phone and no Safari.** Every capture is desktop Chromium at each phone's CSS size. The stamp's frame rate on a phone was not measured; it is one animation of `transform` and `opacity`, which browsers run off the page's main thread.
- **Round 1 only is checked.** Another round's words are the same stamp with another number.
- **Held and running.** The captures hold the stamp still. While it runs, the browser draws it from the animation's own layer. Compared once by hand in desktop Chromium, the standing stamp's face differs from the held one by 0.8 levels in 255 on average at two pixels a point (0.6 at three): a one-pixel fringe on the letters' edges, not a softer stamp.
- **Large text** was measured once by hand at 200 % (the table above), at 320, 390 and 430 px wide. It is not in the check's captures: the owner has deferred wider viewport and text coverage.
- **The room behind is not compared with the pack's.** The pack's frame draws its own room; the room scene has its own check.
- **It is not connected to the game.** Frontend passes the round, the phase and the clock.

## Checks

```
node design/tools/round-stamp-check.mjs       # captures, strips, the pack comparison, the probe; writes review/check.json
npm run test:design                           # packages/design-tokens/test/round-stamp.test.mjs among them
```

The check needs a Chromium-based browser (`CHROME_PATH`). A record is made against a committed, clean source.
