# Round stamp: Designer's runtime component

**Version:** `round-stamp-0.1.0`. **Status (16 November 2026):** an interface proposal by the Motion & Cinematics builder, for the Lead Designer's review. Nothing is built. It is not in the game and it is not a release. The build starts when the Lead agrees the interface, as the owner decided on 16 November (recorded in `docs/design/owner-decisions.md` on #280).

**What it is:** the "ROUND 1" stamp that lands over the room as Round 1 begins. The pack draws it once: the last frame of [sheet 19](../../../design/phone-ui/review/sheets/19-boarding.jpg), "Round 1 begins". The handoff lists it with that sheet ("the Round 1 stamp"), and the boarding stage (#272) leaves it to Motion & Cinematics: "the stamp is Motion & Cinematics' round stamp, a later component placed over the room view, once the server's Round 1 view arrives".

**What the pack draws** (`design/phone-ui/prototype/screens-game.mjs`, the room screen's `stamp=round1` state):

- the pack's stamp in gold (`.stamp[data-tone="gold"]`): ink border, paper-gold ground, condensed capitals, tilted 4°, with the ink shadow;
- larger than a stamp in a sheet: `font-size: 2.25rem; padding: 10px 20px 8px`;
- centred in the stage, over the room and its tags, under the bars;
- the room is on screen with the first turn in the bar (R1, 1:00).

The pack gives no time or motion for it: the handoff's Motion table has no row for the round stamp. This document proposes them, from the pack's own stamp snap and the motion tokens.

The game imports the component as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)).

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

`mountRoundStamp()` returns `{ element, update, suspend, resume, frame, dispose }`.

- **One element** in the shell's cover, `.ms-round-stamp`, at `position: absolute; inset: 0`, with the stamp centred in it. The cover lies exactly over the stage, above the room's tags and under the bars, so the stamp never covers the bar's countdown.
- **It takes no taps,** anywhere (`pointer-events: none`), so the room under it stays usable from the first moment. See question 4.
- **To assistive technology it is nothing:** `aria-hidden="true"`. The top bar already says the round, and Frontend's own announcement is unchanged.
- **The look is the kit's stamp** (`createKit().stamp({ text, tone: 'gold' })`), sized through this component's own part to the pack's `2.25rem` and `10px 20px 8px`. The kit is used as it is; nothing in it changes.
- It can share the cover with another component (the results reveal's host): each is its own element.

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

**The beats (proposed):**

| t | Beat | What |
| --- | --- | --- |
| 0–120 ms | `snap` | The stamp lands: from 1.6 times its size and clear, to its size and solid. The pack's "Stamp snap, 120 ms": `motionMs.registrationStamp` on `motionEasing.snap`, which goes a little past its size and settles |
| 120–1,180 ms | `hold` | It stands, tilted 4° as the kit's stamp |
| 1,180–1,400 ms | `leave` | It fades out: `motionMs.cardTransition` (220 ms) on `motionEasing.standard`. It does not move |
| From 1,400 ms | `gone` | Nothing is drawn and nothing runs |

The length, 1,400 ms, is a proposal: see question 1.

**How it runs:** as the results reveal (#277). One Web Animation of the stamp's `transform` and `opacity` over the stamp's whole length, with its `currentTime` set to `t` from the trusted clock on mount, on `update()`, on `resume()`, when the phone is live again, and once more as the browser starts it. The browser runs the rest. The component has no frame loop, timer or clock. Outside the animation the stamp is not drawn, so when it ends nothing is left to clear.

**Reduce motion,** the game's or the device's: no landing. The stamp fades in over 80 ms (`motionMs.reducedMotionFade`), stands for the same time, and fades out over 80 ms.

## States

| State | What the stamp does |
| --- | --- |
| 0–1,400 ms | The stamp, at the clock's moment |
| From 1,400 ms, or no round, phase or clock | Nothing drawn, nothing running |
| Reduce motion (the game's or the device's) | An 80 ms fade in, the stamp standing, an 80 ms fade out. No change of size |
| Stale (reconnecting) | Stands still where it is. Live again, it seeks to the clock, usually to `gone` |
| Concealed | Hidden, and nothing runs. Shown again, it seeks to the clock |
| Suspended | Held at the clock's moment. On `resume()` it seeks to the clock |
| A page with no Web Animations | Nothing drawn |

**`frame()`** returns `{ window, round, t, beat, scale, opacity, running, status, reduced, shown }` and `null` after `dispose()`. `roundStampFrame(t, { reduced })` gives the same values as a pure function of time. `dispose()` is safe to call twice.

## Files (when built)

Designer's, runtime-safe, in `design/phone-ui/components/round-stamp/`:

| Path | What |
| --- | --- |
| `round-stamp.mjs` | `mountRoundStamp()`, `nextRoundStampInput()`, `roundStampFrame()`, `ROUND_STAMP_DEFAULTS`, `ROUND_STAMP_VERSION`, `ROUND_STAMP_BEATS`, `ROUND_STAMP_WORDS`. It imports the kit and nothing else |
| `round-stamp.css` | Starts with `@import url("../kit/kit.css");`; every rule under `.ms-round-stamp` |
| `preview/` | Development only: the shell with its bars and tabs, the room scene in the stage, and the stamp in the cover; the probe; the stamp beside the pinned pack's own frame |
| `review/` | The check's captures, strips and `check.json` |

Also `design/tools/round-stamp-check.mjs` (on `design/tools/lib/component-check.mjs`), `packages/design-tokens/test/round-stamp.test.mjs` and this document. It loads no picture, imports neither the shell nor the room scene, and reads no `env()`.

## Acceptance (when built)

- **Agreement with the pack:** standing, the stamp has the same words, look and box as the pack's own "Round 1 begins" frame, at 390 × 844 and 430 × 932.
- **The strip:** the stamp at 0, 30, 80, 120 and 600 ms, at 1,250 and 1,330 ms, and gone, at both sizes.
- **Captures:** both sizes under the production headers, full motion and reduced: mid-landing, standing, leaving, gone, reconnecting and concealed.
- **The probe:** seeking, a late phone with nothing drawn and nothing started, the run to its end, a long first frame, suspend and resume, stale and live, concealed and shown, Reduce motion (the game's and the device's), a new phase id, one animation at most, taps reaching the room under it, what assistive technology meets, refused inputs, and dispose twice. It counts what the component starts synchronously around each mount or update.
- **A test page for the owner,** as each built part has.
- **Not run:** physical phones, Safari, and frame rate on a phone.

## Questions for the Lead

1. **How long it stands.** The pack gives no time. I propose 1,400 ms in all: 120 ms to land, standing until 1,180 ms, 220 ms to fade.
   - The tokens' `motionMs.roundTransition` is 700 ms. It belongs to the earlier table cue (a sweep under the status strip). At 700 ms a phone that receives the view 300 ms late would show the stamp for 400 ms, more than half of it fading.
   - 1,400 ms is not a token. If you agree it, it is a constant of this component until you add a token; `packages/design-tokens/src` is yours.
2. **Which rounds.** The pack draws the stamp for Round 1 only. The component can name any round, and 0.1.0 would be checked for Round 1. A stamp at later rounds is not in the sheets; it would need your agreement and the owner's.
3. **Which phase it belongs to.** In a Food match Round 1 opens with the Food supply screen, not the room. I propose: the round's first phase that shows the room view, so the stamp is always over the room, as drawn, and never over another screen. Frontend passes that phase's id and start.
4. **Taps.** The pack's frame gives the stamp its own taps and draws no room controls under it. I propose the stamp takes none and the room stays usable, by the handoff's rule that "a missed animation never blocks a control".
5. **Sound and announcement.** None from the stamp. The bar says the round.
