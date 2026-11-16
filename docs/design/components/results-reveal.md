# Results reveal: Designer's runtime component

**Version:** `results-reveal-0.1.0`. **Status (16 November 2026):** built to the interface the Lead Designer agreed on #277, for the Lead's review. It is not in the game and it is not a release. The build began on 16 November, after the owner's decision that Designer builds each part without waiting for Frontend (recorded in `docs/design/owner-decisions.md` on #280).

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

## Mounting: the reveal hosts the window

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

`mountResultsReveal()` returns `{ host, element, update, suspend, resume, frame, dispose }`. `element` is the host, under the name the other components use.

- **The host:** the reveal appends one element to the cover, `.ms-results-reveal`, at `position: absolute; inset: 0`, taking no taps (`pointer-events: none`). `reveal.host` is that element. The window positions itself against its host as it does against the cover today (`left: 10px; right: 10px; top: 8px; bottom: 10px`), so at rest its geometry is exactly the same. It still takes the taps over itself (`pointer-events: auto`), and the room under it takes none.
- **What moves:** only the host, as one layer, through `transform`. The window's layout, its container query (the compact form), its scroll, its styles and its DOM are untouched. At rest nothing is set: the host has no transform, no inline style and no animation, and the window lies exactly as `mountVoteResult` lays it in the cover.
- **Why not a hook in the window:**
  - A hook means changing `vote-0.1.0`, which is built and agreed.
  - Moving the window's own root from outside would share one element's `transform` between two components.
  - The host keeps a clean line: the window is the Gameplay UI builder's, the arrival is Motion's, and either can change without the other.
- **A constraint on the window's root (the Lead to the Gameplay UI builder):** no `transform` or `animation` on it, ever, since the reveal owns its host's motion. `vote.css` sets none today, and the vote's own test holds it to no keyframes of its own.
- **Frontend's change:** the window mounts in `reveal.host` instead of `shell.slot('cover')`.
- **Clipping:** the shell's cover clips to the stage (`overflow: hidden`) and lies under the bars. So the window rises into view from the stage's foot, above the tabs, as "rises over the room" asks.

The reveal is not tied to the vote: any result window placed in the cover could arrive in its host. 0.1.0 is checked for `mountVoteResult` only.

## Inputs

**Every input is public, or this phone's own setting.** The reveal takes the phase and the clock, nothing about the result. `nextResultsRevealInput()` refuses any key it does not know, inside `window` too.

| Input | Audience | Default | What |
| --- | --- | --- | --- |
| `window` | Public | `null` | `{ id, startedAt, endsAt }`: the published `VOTE_RESULT` phase (5000 ms, `PLANET_PHASE_DURATIONS`). A new `id` is a new arrival. `null`: at rest |
| `clock` | Public | `null` | `{ now() }`: the match's trusted server time. `null`: at rest |
| `status` | Phone | `'live'` | `'live'`, `'stale'` or `'concealed'`, as the shell and the window |
| `reducedMotion` | Phone | `false` | The game's Reduce motion (`data-motion="reduced"` on the host). The device's `prefers-reduced-motion` is honoured as well |

No `size` is needed: the rise is measured in the host's own height.

## Time: the server's 5 s result clock is the only time

- **Reveal time:** `t = clamp(clock.now() − window.startedAt, 0, window.endsAt − window.startedAt)` (`revealTime()`). The reveal keeps no clock of its own.
- **A late phone sees the result at once.** From 320 ms on, the window is at rest the moment it mounts, and nothing runs. A phone at 120 ms sees the rise from its 120 ms, never from the start.
- **It never advances the game.** It has no callback and no skip, and no exit motion. The window leaves when the phase leaves `VOTE_RESULT` and Frontend disposes it; an exit would hold it past the server's phase.

**The beats**, from the pack's handoff and the motion tokens:

| t | Beat | What |
| --- | --- | --- |
| 0–320 ms | `rise` | The window rises from below the stage's foot to its place. The tokens give the time and the curve: `motionMs.publicImpact` (320 ms) and `motionEasing.settle` (`cubic-bezier(0.16, 0.84, 0.3, 1)`), the pack's sheet curve. It moves only; it does not fade, as the pack's table has it |
| 320 ms to the end of the phase | `rest` | The window holds. The shell's ring counts the 5 s |

**Where the window is on that curve** (`revealFrame(t)`, a pure function; the browser's own drawing of the curve agrees with it to a thousandth of a pixel in the check):

| t | 0 ms | 40 ms | 80 ms | 120 ms | 160 ms | 200 ms | 240 ms | 320 ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Up | 0 % | 51 % | 76 % | 88 % | 94 % | 97 % | 99 % | 100 % |

**How it runs:** the rise is one Web Animation of the host's `transform`, from `translateY(100%)` to its place, on the settle curve. Its `currentTime` is set to `t` from the trusted clock:

- on mount, on `update()`, on `resume()` and when the phone is live again;
- and once more as the browser starts the animation, at its first frame. Building the window can make that frame a long one on a slow phone; without this second seek the rise would run that much behind the clock. In the check, after a busy frame of 130 ms the rise is at the clock's moment, not 130 ms behind it.

The browser runs the rest of those 320 ms. The component has no frame loop, no timer and no clock, and asks the page for no frame. Past 320 ms there is no animation at all.

**Expected on real phones:** the projection reaches a phone after the phase has started. At typical delays of 100–300 ms the window joins its rise part-way (88 % up at 120 ms, 97 % at 200 ms), so on many phones the rise is short. That is the agreed rule: every phone shows the server's moment, and the rise is a grace note, never information.

**Reduce motion**, the game's or the device's: the window at rest, with one 80 ms fade (`motionMs.reducedMotionFade`) when it first shows for a phase. Nothing else moves. A phone that is standing still when the window first shows (reconnecting, or suspended) does not fade, and a window that has already shown for its phase does not fade if Reduce motion is turned on afterwards.

## States

| State | What the reveal does |
| --- | --- |
| The first 320 ms | The rise, at the clock's moment |
| From 320 ms | At rest: nothing set, nothing running |
| Reduce motion (the game's or the device's) | At rest, with one 80 ms fade when it first shows for a phase |
| No clock, or no phase | At rest |
| Stale (reconnecting) | Stands still exactly where it is, and does not follow the clock. A phone that is reconnecting when the window first shows holds the clock's moment. Live again, it seeks to the clock |
| Concealed | The host is hidden and nothing runs. The window draws nothing either (its own `status`). Shown again, it seeks to the clock, almost always to rest |
| Suspended | The rise is held at the clock's moment. On `resume()` it seeks to the clock |
| A page with no Web Animations | At rest |

**`frame()`** returns `{ window, t, beat, offset, still, running, status, reduced, shown }`, with `offset` the host's distance from rest as a share of its height (1 at the start, 0 at rest), and `null` after `dispose()`. `dispose()` is safe to call twice and removes the host and anything left in it; dispose the window first.

**To assistive technology** the reveal is nothing: the host has no role, name or focus. The window is in the page and readable from its first moment; the rise is visual only, and Frontend's announcement is unchanged.

## Files

Designer's, runtime-safe, in `design/phone-ui/components/results-reveal/`:

| Path | What |
| --- | --- |
| `results-reveal.mjs` | `mountResultsReveal()`, `nextResultsRevealInput()`, `revealFrame()` (the rise as a pure function of time), `revealTime()`, `RESULTS_REVEAL_DEFAULTS`, `RESULTS_REVEAL_VERSION`, `REVEAL_BEATS`, `REVEAL_EASING`, `REDUCED_FADE_MS`. It imports nothing |
| `results-reveal.css` | Starts with `@import url("../kit/kit.css");`; two rules, both under `.ms-results-reveal`. Nothing in it moves |
| `preview/` | Development only: the shell with its bars and tabs, the room scene in the stage, and the vote's own `mountVoteResult` in the reveal's host; the probe (`probe.mjs`) and the agreement at rest (`agree.mjs`) |
| `review/` | The check's captures, strips and `check.json` |

Also:
- `design/tools/results-reveal-check.mjs`, built on `design/tools/lib/component-check.mjs`.
- `packages/design-tokens/test/results-reveal.test.mjs`: the graph, what the source may do, the styles' scope, the tokens, the inputs, the time, the curve, the lifecycle on a stand-in page, and the check's record.
- This document.

It loads no picture, imports neither the shell nor the vote, and reads no `env()`.

**The preview shows the vote's real window.** This branch merges `claude/designer-vote-results` (#267) with a merge commit, stacking on it as the end scene stacked on the ship travel, so the captures show the real window rising, not a stand-in. A held moment in a capture is the component suspended on a clock that stands at that moment.

## Evidence

From `node design/tools/results-reveal-check.mjs` ([`review/check.json`](../../../design/phone-ui/components/results-reveal/review/check.json)): desktop Chromium, headless, at 390 × 844 and 430 × 932 at 2× pixels, the preview bundled by Vite and served with the production headers. No policy report, failed request or page error in any of it.

- **The rise:** `review/strip-390x844.jpg` and `strip-430x932.jpg`: the arrival at 0, 40, 80, 120, 160, 240 and 320 ms, and at rest. At each moment the host lies where the curve puts it. A phone at 120 ms shows the 120 ms frame.
- **Captures (12):** at both sizes, the rise held at 120 ms, at rest, Reduce motion's still (the game's and the device's), reconnecting at 120 ms and concealed.
- **At rest, the window is unchanged (14 of 14):** for the pack's seven result states (sheets 37 and 38) at both sizes, the phone with the window in the reveal's host and the phone with the window straight in the cover are the same picture, pixel for pixel, and every part of the window has the same box (less than a thousandth of a pixel apart; 84 to 104 parts a state).
- **The probe (15 checks):** seeking, a late phone, the run to its end, a long first frame, suspend and resume, reconnecting and live, concealed and shown, a new phase, one animation at most, taps, what assistive technology meets, refused inputs, dispose twice, and Reduce motion, the game's and (in a second run) the device's.
  - **Counting:** the probe counts the frames and animations the reveal starts synchronously, around each mount or update. The check harness's own waits also ask the page for animation frames, so a count over an awaited interval can include them. Learned on #271.
- **Not run:** physical phones, Safari, and frame rate on a phone. The rise is a compositor animation of one layer; how smoothly a phone runs it is not measured here.

## Decided by the Lead (#277, 15 November 2026)

1. **The mounting:** the wrap, as the window's host, with no change to `vote-0.1.0`. The host is `position: absolute; inset: 0`. The window's root takes no `transform` or `animation`, ever; the Lead tells the Gameplay UI builder.
2. **The rise:** it moves only, from below the stage's foot, with no fade. Reduce motion is the 80 ms fade.
3. **No exit motion:** the window goes with the phase.
4. **The preview:** this branch stacks on #267, so the captures show the real window.

## Added in the build, for the Lead's review

Three things the agreed interface did not spell out. Each keeps the agreed rule; none adds an input.

1. **A second seek as the browser starts the rise,** so a long first frame does not leave it behind the clock (above, "How it runs").
2. **When Reduce motion's fade is not given:** to a phone standing still when the window first shows, and to a window that has already shown for its phase.
3. **`reveal.element`,** the same node as `reveal.host`, under the name the other components' handles use.

## Checks

```
node design/tools/results-reveal-check.mjs     # captures, strips, the results at rest, the probe, the agreement; writes review/check.json
npm run test:design                            # packages/design-tokens/test/results-reveal.test.mjs among them
```

The check needs a Chromium-based browser (`CHROME_PATH`). A record is made against a committed, clean source.
