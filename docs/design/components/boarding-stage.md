# Boarding stage: Designer's runtime component

**Version:** `boarding-stage-0.1.0`, **proposed interface only**. **Status (15 November 2026):** the interface, for the Lead Designer's review, then Frontend's on #4. Nothing is built yet.

**What it is:** the shared ten-second boarding before Round 1 on a phone, as sheet 19 draws it: the boarding film with Skip, and the two holding screens around it. The game imports it as it is, and the preview mounts the same files ([ownership](../../architecture/visual-component-ownership.md)).

**Covers** (sheet 19):

| State | Drawn |
| --- | --- |
| The film, 0:01.5 and 0:06 | The approved boarding film edge to edge, under the status bar; **Skip** with the skip icon at the bottom right. No top bar, no clock |
| Skipped locally | The flag in its amber tile; "Boarding"; "Round 1 in 0:04", the server's countdown |
| Waiting for the server | The hourglass in its amber tile; "Starting Round 1"; a spinner and "Waiting for the ship" |

**What changes from today:**
- Today's game shows the heading "Boarding" and "The crew is boarding. The match will begin when the server confirms it.", with no countdown and no waiting screen.
- Its Skip reads "Skip film", with no icon; sheet 19 draws "Skip" with the skip icon. The Lead's review of #266 noted it for PHONE-PARITY.

**Comparison parts:** `boarding` (sheet 19) is the film, "same" today, and stays Frontend's existing player. The holding screens have no part id: their evidence is this component's own captures, and a supplemental comparison when Frontend integrates.

**Not in it:**
- **The film's picture:** Frontend's existing player (`apps/game/hosted/planet/pregame.mjs` with the runtime boarding film), mounted in `stage.film`, as the role stage's film is (#268, decision 1).
- **"Round 1 begins"** (sheet 19's last frame): the room with the "ROUND 1" stamp. That is the room view's, once the server's Round 1 view arrives; Frontend disposes this stage then.

## Files (proposed)

Designer's, runtime-safe, in `design/phone-ui/components/boarding-stage/`:

| Path | What |
| --- | --- |
| `boarding-stage.mjs` | `mountBoardingStage()`, `nextBoardingStageInput()`, `boardingLine()`, `BOARDING_STAGE_DEFAULTS`, `BOARDING_STAGE_VERSION`, `BOARDING_WORDS` |
| `boarding-stage.css` | Every style, under `.ms-boarding-stage ms-kit`; starts with `@import url("../kit/kit.css");` |
| `preview/` | Development only: the preview on the pack's synthetic fixtures (a still of the approved boarding film where the player goes), `probe.mjs`, and `agree.mjs` (the stage beside the frozen pack's `PREGAME_SCREENS.boarding`) |
| `review/` | The check's captures and `check.json` |

The tool is `design/tools/boarding-stage-check.mjs`, on the shared `lib/component-check.mjs`. The test is `packages/design-tokens/test/boarding-stage.test.mjs`.

**Uses unchanged:**
- **The phone shell:** `bar: null, tabs: null` throughout (sheet 19 draws no bar), and `edge: true`, so the film runs edge to edge. The shell's reconnecting banner and toast sit at the bar's place, over the film.
- **The kit:** Skip is a small secondary kit button with the skip icon, under the kit's control policy.
- **`icons.mjs`:** the flag and the hourglass.

## Mount, update and dispose

```js
import { mountBoardingStage } from '…/design/phone-ui/components/boarding-stage/boarding-stage.mjs';
import '…/design/phone-ui/components/boarding-stage/boarding-stage.css';

const stage = mountBoardingStage(host, input, handlers);
stage.film;                  // the element the film plays in: mount the existing player here (stays for the stage's life)
stage.layout();              // { size, safe: { top, bottom }, film: { width, height } }
stage.update({ ...changes }); // each key given replaces that key; the rest stay
stage.suspend(); stage.resume();
stage.dispose();             // safe twice; afterwards nothing fires and layout() is null
```

- **The host:** the element the pre-game screen fills. The stage appends one child, `.ms-boarding-stage`, which fills it, edge to edge.
- **One mount per boarding:** a new match or setup is a new mount, after disposing the old one. Frontend disposes it when the server's Round 1 view arrives.
- On update, Skip keeps its element and the focus through clock ticks.

## Inputs

Everything here is public: the boarding is the same for every phone and the shared display.

| Input | Audience | What |
| --- | --- | --- |
| `status` | Phone | `'live'`, `'stale'` (reconnecting: the shell's banner and Retry; Skip refused) or `'concealed'` (nothing changes on screen, as nothing here is private; Skip refused) |
| `interactive`, `reducedMotion`, `insets`, `viewer` | Phone | As the shell's |
| `clock` | Public | `{ elapsedMs, endsAtMs }` from the server's interval (`setup.startedAt`, `setup.endsAt`; 10 000 today, never a constant), given each tick. `null` while the clock is not trusted: no countdown is shown |
| `view` | Phone | `'film'`, `'holding'` or `'waiting'`, decided by Frontend: `'film'` while its pregame controller plays the boarding film on this phone; `'holding'` when this phone skipped it, or it cannot play, before the interval ends; `'waiting'` once the interval has ended and the server has not yet started Round 1. The stage only draws the change |
| `skip` | Phone | `null` (no Skip: a shared display, or no film), or `{ enabled, reason }` |

**The stage decides nothing:**
- It never works out when the film plays, when the interval ends or when Round 1 starts.
- It shows the countdown as given, rounded up to whole seconds, and never counts down by itself.
- A Skip tap reports intent: Frontend stops the film on this phone only (today `controller.skip()`), and the server's interval is unchanged.

## Callbacks

| Callback | When |
| --- | --- |
| `onSkip()` | Skip, in the film's view |
| `onRetry()` | The reconnecting banner's Retry (through the shell) |
| `onLayout(layout)` | The stage's size or safe areas changed |
| `onFocusReturn({ intent })` | Skip ended while it held the focus (the film left): the focus is on the stage, for Frontend to move on |

Skip follows the kit's control policy: refused when unavailable, stale, concealed or not interactive; focus kept with `aria-disabled`; the reason as its description.

## Drawn

| View | Drawn |
| --- | --- |
| `film` | `stage.film` edge to edge; Skip at the bottom right, 14 px above the bottom safe area, as the pack's `.film-skip` |
| `holding` | Centred: the flag, filled, in its 76 px amber-on-dark tile; "Boarding"; "Round 1 in 0:04" (a timer for screen readers). Without a trusted clock, the line is left out |
| `waiting` | Centred: the hourglass in its tile; "Starting Round 1"; the spinner and "Waiting for the ship" (a polite status). With Reduce motion the spinner stands still |
| Stale | The shell's banner, "Connection lost · Controls return when the match is current · Retry", at the bar's place, over the film or the holding screen |
| Larger text | The holding block wraps and stays centred; its words grow with the game's text size |

**Motion:** the film to a holding screen, and the holding screen to waiting, crossfade in 220 ms, as the handoff's state change; with Reduce motion, the game's or the device's, 80 ms. A stage that opens on a holding screen shows it at once.

## Frontend's connection

1. Mount the stage while the setup is `boarding`, on a player's phone and on the shared display; dispose it when the Round 1 view arrives.
2. Map `PlanetSessionModel`:
   - `clock` from `setupClock` and `setup` (`startedAt`, `endsAt`), while `setupClock.status` is `'synced'`;
   - `view`: `'film'` while `sample()` gives the boarding film; `'waiting'` once the server's time has passed `endsAt` (with its uncertainty); otherwise `'holding'`;
   - `skip`: `{ enabled: true }` on a phone while the film plays; `null` on the shared display.
3. Mount the existing player in `stage.film`. Its full-screen dialog and its own "Skip film" are replaced by the stage's: `onSkip()` calls today's `controller.skip()`.
4. Leave none of today's "Boarding" text beside it.

## Questions for the Lead

1. **The holding block** (the tile, the title, the line, the spinner) is the pack's `.wait`. Sheet 13's "Waiting for the host" (my item 24) uses it too, and other screens may. Should the kit draw it (`kit.wait({ icon, title, line, busy })`), or should I keep it in my own part for now?
2. **The shared display:** sheet 19 is drawn on a phone. Does the display show the same three states without Skip (as proposed), or does it have its own drawing?
3. **Concealed:** nothing here is private, so the stage keeps drawing and only refuses Skip. Agreed?

## Not in this version

Everything: this is the interface. Next, after the Lead's review and Frontend's on #4: the module and styles, the preview's states, the probe, the check at 390 × 844 and 430 × 932 under the production headers, the agreement with the pack and the test.
