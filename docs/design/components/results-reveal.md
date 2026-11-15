# Results reveal: Designer's runtime component

**Version:** `results-reveal-0.1.0` (proposed). **Status (15 November 2026):** interface proposal only. The Lead Designer reviews it first, then Frontend on #4. Nothing is built yet: the Designer team keeps at most one component waiting for Frontend, and the ship travel (#269) and the end scene (#271) are both waiting. It is not in the game and it is not a release.

**What it is:** the arrival of the vote's result window, the motion the ballot component leaves to Motion & Cinematics (#267: "the window's arrival belongs to Motion & Cinematics"). The pack's handoff gives it in one line ([Motion](../phone-ui-handoff.md#motion)):

| Moment | Normal | Reduce motion |
| --- | --- | --- |
| Result | The window rises over the room in 320 ms, then holds for 5 s | 80 ms fade |

The game imports the component as it is, and the preview mounts the same files. It follows the owner's decisions of 14 and 15 November 2026 ([ownership](../../architecture/visual-component-ownership.md)).

**The split with the result window:**

| Part | Whose |
| --- | --- |
| The window: its head, art, stamp, headline, roster, counts, foot, compact form and words (`mountVoteResult`, `vote-0.1.0`) | The Gameplay UI builder (#267) |
| The window's arrival: where it is in its first 320 ms, and Reduce motion's fade | This component |
| The 5 s ring on the bar (`urgentAtMs: -1`) | The shell, from Frontend's timer |
| The live-region announcement (`resultWords(input).announce`) | Frontend, once |

Each draws nothing of the other's. The reveal never reads the tally, the outcome, a seat or a word.

## Mounting: the reveal hosts the window (proposed)

The Lead asked for one of two: the reveal wraps the window's root, or `mountVoteResult` exposes a hook. **I propose the wrap, as the window's host, with no change to `mountVoteResult`:**

```js
// In the shell's cover, for the VOTE_RESULT phase:
const reveal = mountResultsReveal(shell.slot('cover'), {
  window: { id: phase.id, startedAt: phase.startedAt, endsAt: phase.endsAt }, // the published VOTE_RESULT phase (5 s)
  clock,                                                                      // { now() }: the match's trusted server time
});
const result = mountVoteResult(reveal.host, input);   // the Gameplay UI builder's window, unchanged, in the reveal's host
// When the phase leaves VOTE_RESULT:
result.dispose();
reveal.dispose();
```

- **The host:** the reveal appends one element to the cover, `.ms-results-reveal`, at `inset: 0`, taking no taps (`pointer-events: none`). `reveal.host` is that element. The window positions itself against its host as it does against the cover today (`left: 10px; right: 10px; top: 8px; bottom: 10px`), so at rest its geometry is exactly the same. It still takes the taps over itself (`pointer-events: auto`), and the room under it takes none.
- **What moves:** only the host, as one layer, through `transform`. The window's layout, its container query (the compact form), its scroll, its styles and its DOM are untouched. At rest nothing is set: the host has no transform, and the window lies exactly as `mountVoteResult` lays it in the cover.
- **Why not a hook:**
  - A hook means changing `vote-0.1.0`, which is built, agreed and waiting for Frontend.
  - Moving the window's own root from outside would share one element's `transform` between two components.
  - The host keeps a clean line: the window is the Gameplay UI builder's, the arrival is Motion's, and either can change without the other.
- **What the Gameplay UI builder confirms:**
  - the window keeps placing itself against its host's box;
  - it sets no `transform` or `animation` of its own on its root.
- **Frontend's change:** the window mounts in `reveal.host` instead of `shell.slot('cover')`.
- **Clipping:** the shell's cover clips to the stage (`overflow: hidden`) and lies under the bars. So the window rises into view from the stage's foot, above the tabs, as "rises over the room" asks.

The reveal is not tied to the vote: any result window placed in the cover could arrive in its host. 0.1.0 is agreed and checked for `mountVoteResult` only.

## Inputs (proposed)

**Every input is public, or this phone's own setting.** The reveal takes the phase and the clock, nothing about the result. `nextResultsRevealInput()` refuses any key it does not know, inside `window` too.

| Input | Audience | Default | What |
| --- | --- | --- | --- |
| `window` | Public | `null` | `{ id, startedAt, endsAt }`: the published `VOTE_RESULT` phase (5000 ms, `PLANET_PHASE_DURATIONS`). A new `id` is a new arrival. `null`: at rest |
| `clock` | Public | `null` | `{ now() }`: the match's trusted server time. `null`: at rest |
| `status` | Phone | `'live'` | `'live'`, `'stale'` or `'concealed'`, as the shell and the window |
| `reducedMotion` | Phone | `false` | The game's Reduce motion (`data-motion="reduced"` on the host). The device's `prefers-reduced-motion` is honoured as well |

No `size` is needed: the rise is measured in the host's own height.

## Time: the server's 5 s result clock is the only time

- **Reveal time:** `t = clamp(clock.now() − window.startedAt, 0, window.endsAt − window.startedAt)`. The reveal keeps no clock of its own.
- **A late phone sees the result at once.** From 320 ms on, the window is at rest the moment it mounts, and nothing runs. A phone at 120 ms sees the rise from its 120 ms, never from the start.
- **It never advances the game.** It has no callback and no skip, and no exit motion. The window leaves when the phase leaves `VOTE_RESULT` and Frontend disposes it; an exit would hold it past the server's phase.

**The beats (proposed), from the pack's handoff and the motion tokens:**

| t | Beat | What |
| --- | --- | --- |
| 0–320 ms | `rise` | The window rises from below the stage's foot to its place. The tokens give the time and the curve: `motionMs.publicImpact` (320 ms) and `motionEasing.settle` (`cubic-bezier(0.16, 0.84, 0.3, 1)`), the pack's sheet curve. It moves only; it does not fade |
| 320 ms to the end of the phase | `rest` | The window holds. The shell's ring counts the 5 s |

**How it runs (proposed):** the rise is one Web Animation of the host's `transform`, from `translateY(100%)` to none, on the settle curve. Its `currentTime` is set to `t` from the trusted clock on mount, on `update()`, on `resume()` and when it goes live again. The browser's compositor runs the rest of those 320 ms, with no frame loop of the component's own, while the window is drawn on the main thread at the same moment. Past 320 ms there is no animation at all.

**Expected on real phones:** the projection reaches a phone after the phase has started. At typical delays of 100–300 ms the window joins its rise part-way (the settle curve has it 97 % up at 200 ms), so on many phones the rise is short. That is the agreed rule: every phone shows the server's moment, and the rise is a grace note, never information.

**Reduce motion**, the game's or the device's: the window at rest, with one 80 ms fade (`motionMs.reducedMotionFade`) when it first shows for a phase. Nothing else moves.

## States (proposed)

| State | What the reveal does |
| --- | --- |
| The first 320 ms | The rise, at the clock's moment |
| From 320 ms | At rest: nothing set, nothing running |
| Reduce motion (the game's or the device's) | At rest, with one 80 ms fade when it first shows for a phase |
| No clock, or no phase | At rest |
| Stale (reconnecting) | Stands still where it is. Live again, it seeks to the clock |
| Concealed | The host is hidden and nothing runs. The window draws nothing either (its own `status`). Shown again, it seeks to the clock, almost always to rest |
| Suspended | The animation is paused. On `resume()` it seeks to the clock |

**`frame()`** returns `{ window, t, beat, offset, still, running, status, reduced, shown }`, with `offset` the host's distance from rest as a share of its height (1 at the start, 0 at rest), and `null` after `dispose()`. `dispose()` is safe to call twice and removes the host and anything left in it; dispose the window first.

**To assistive technology** the reveal is nothing: the host has no role or name. The window is in the page and readable from its first moment; the rise is visual only, and Frontend's announcement is unchanged.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/results-reveal/`:

| Path | What |
| --- | --- |
| `results-reveal.mjs` | `mountResultsReveal()`, `nextResultsRevealInput()`, `revealFrame()` (the rise as a pure function of time), `RESULTS_REVEAL_DEFAULTS`, `RESULTS_REVEAL_VERSION`, `REVEAL_BEATS` |
| `results-reveal.css` | Starts with `@import url("../kit/kit.css");`; every rule under `.ms-results-reveal` |
| `preview/` | Development only: the shell with its bars and tabs, the room scene in the stage, and the vote's own `mountVoteResult` in the reveal's host; the probe |
| `review/` | The check's captures, strip and `check.json` |

Also proposed:
- `design/tools/results-reveal-check.mjs`, built on `design/tools/lib/component-check.mjs`. It captures at 390 × 844 and 430 × 932 under the production headers, in full motion and reduced.
- `packages/design-tokens/test/results-reveal.test.mjs`.
- This document.

It loads no picture, imports neither the shell nor the vote, and reads no `env()`.

**The preview needs the vote's window.** This branch starts from `claude/designer-phone-shell`, which does not have it. For the build, either #267 has merged into that base, or this branch takes #267's branch with a merge commit (stacking on it), as the end scene stacked on the ship travel. If neither, the preview shows a labelled stand-in window and the check records it. Please choose.

## Acceptance (proposed)

- **The rise:** a strip of the arrival at 0, 40, 80, 120, 160, 240 and 320 ms, and the rest, for review, at both sizes. A phone at 120 ms shows the 120 ms frame.
- **At rest, the window is unchanged:** the result window mounted in the reveal's host and mounted directly in the cover give the same boxes for every part (0 px apart) and the same pixels, for the pack's result states (sheets 37 and 38).
- **Captures:** 390 × 844 and 430 × 932, full motion and reduced, under the production headers: mid-rise, at rest, Reduce motion's still, stale and concealed.
- **The probe:** seeking (the animation's `currentTime` is the clock's `t`), a late phone at rest with nothing running, suspend and resume, stale and live, concealed and shown, Reduce motion (the game's and the device's) with its one fade, dispose twice, one animation at most, and refused inputs.
  - **Counting:** the probe counts the frames and animations the reveal starts synchronously, around each mount or update. The check harness's own waits also ask the page for animation frames, so a count over an awaited interval can include them. Learned on #271.
- **Not run:** physical phones, Safari, and frame rate on a phone.

## Questions for the Lead

1. **The mounting:** the reveal as the window's host (`mountVoteResult(reveal.host, input)`), with no change to `vote-0.1.0`. Will you agree it with the Gameplay UI builder: they confirm the window places itself against its host and sets no transform or animation on its root?
2. **The rise:** from below the stage's foot, on the settle curve, 320 ms, moving only. Or should it also fade in, as the pack's sheets don't?
3. **No exit motion:** the window goes with the phase. Agreed?
4. **The preview's window:** #267 merged first, this branch stacked on #267, or a labelled stand-in?
