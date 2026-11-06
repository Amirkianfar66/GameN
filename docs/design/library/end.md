# Library group 7: the end and recovery

Designer delivery, 5 November 2026. This group covers the brief's "Arrival, no survivors and recovery" row:

- the end reveal over the arrival film (library group 2), with each side's emblem and roles, the winners from the result only, the Alien's co-win, and the Code;
- the no-survivors ending;
- the host's abort;
- the reconnect, stale, failed-asset and late-join states, with one function that decides whether any film plays, seeks, stands at its end or is skipped.

This is a proposal: nothing is adopted until Integration review, and the words are proposals for Frontend.

- **Contract:** protocol 3 candidate, `packages/contracts/src/planet-game.ts` at `79418e7` (not adopted):
  - `result { winner, reason: ARRIVAL | NO_SURVIVORS | ABORTED, alienCoWinner }`;
  - `endReveal { roles[], code }`, present only in `FINISHED`;
  - `phase.startedAt` and `phase.endsAt`.
- **Rules read:**
  - successor `game-design.md` (Navigation and endings; the roster's roles and team counts);
  - the round order in `owner-decisions.md` (the no-survivors exception is evaluated only on the finalized state);
  - `motion-requirements.md`;
  - `designer-production-brief.md` (the "Arrival, no survivors and recovery" row; the reconnect rule).
- **Base:** stacked on library group 6.
- **Review page:** `npm run dev:review --workspace @mothership/design-tokens`, then `/library/end/index.html` (`?w=320`, `&text=2`, `&motion=reduced`, `&only=arrival|others|recovery|motion`).
- **No new film export.** The reveal is a page over the arrival film's final frame, which is already exported (group 2's `arrival-*-insert`), and it is drawn live from `motion.mjs`.

## What the rules ask, and what is drawn

| Rule | Drawn as |
| --- | --- |
| Blue or Red wins at its planet (game design) | The side's banner and emblem: "Blue team wins." / "The ship reached the Blue Planet." The emblems are the arrival film's own planets (the ringed Blue Planet, the cratered Red Planet with its moon) |
| The Alien co-wins only if alive and it personally used the Blackhole (game design) | The co-win line appears only when the result's `alienCoWinner` is true: "The Alien wins too: it was alive at the arrival and used the Blackhole." It is never inferred |
| The finalized no-survivors exception has no winner; a crew all jailed or injured is not no survivors (owner decisions; brief) | Only `reason: NO_SURVIVORS` draws "No player is alive. There is no winner." under a neutral banner and a flat line. A test holds that a view with no terminal result draws no ending, whatever the board shows |
| A host abort has no winner (game design) | "The host ended the match. There is no winner and no reveal." The view carries no `endReveal` in `ABORTED`, so nothing is revealed |
| Only authoritative terminal results (brief) | Every ending is a pure function of `result` and `endReveal`. Winners are marked from the result only |
| The end reveal is authorized at the end (contract: `endReveal` only in `FINISHED`) | Every role by side, in seat order, with a WINNER mark in words on the winners. The Code is the four player numbers on its plate, in number order, and in words ("The Code was Players 2, 3, 4 and 5.") |
| Restore the latest state on reconnect; never replay a historical death, Sync or film (brief) | `filmDecision()` turns every film's start, length, this screen's memory and the server's clock into play (a late join seeks), final (drawn at its end), skip (an event past its expiry) or wait. A reconnect after the end draws the reveal at rest: "You joined after this happened, so it is shown as it ended." |

## State maps (from `states.mjs`)

### `endState(view)`

| State | When | Drawn |
| --- | --- | --- |
| `none` | no terminal result in the view | nothing |
| `arrival` | `FINISHED`, `reason: ARRIVAL` | the side's banner and emblem, the arrival words, the co-win line if `alienCoWinner`, the reveal |
| `no-survivors` | `FINISHED`, `reason: NO_SURVIVORS` | the neutral banner, the flat line, the reveal, with no winner marked |
| `aborted` | `ABORTED` (or `reason: ABORTED`) | the neutral banner and the abort words, with no reveal |

`ROLE_SIDE` maps every role to its side:
- **Blue:** Insider, Doctor, Blue Disabler, Supplier, Engineer;
- **Red:** Undercover, Hacker, Red Disabler;
- **Alien:** Alien.

A test holds the rosters' team counts: 4/2/1, 4/3/1 and 5/3/1.

### `filmDecision({ start, end, now, played, expiresAt })`

`t = now − start`, on the server's clock:
- **wait** before the start;
- **final** if this screen already played it, or `t ≥ end`;
- **skip** if `now` is past the event's expiry and this screen never drew it;
- **play** from `t` otherwise.

This is the motion bible's lifecycle in one function, for every film in the library. `revealStart(view, arrivalLength)` is `FINISHED`'s `startedAt` plus the arrival film's length on the surface (3,400 ms phone, 4,200 ms display).

### `connectionState({ online, now, restoredAt, phaseEndsAt })`

This uses the client's own transport and clock; no contract field is needed.

| State | When | Drawn |
| --- | --- | --- |
| `ok` | connected and current | nothing |
| `reconnecting` | the transport is down | "Reconnecting… The game goes on. When you are back you will see the latest state." over the frozen board; controls held |
| `restored` | reconnected within the last 2,000 ms | "Back. This is the latest state." |
| `stale` | connected, but the phase should have ended more than 3,000 ms ago and no newer view came | "Waiting for the server…" |

A picture or film that does not load is replaced by its frame mark and words: "This picture did not load. The words here say what it shows." / "This film did not load. The latest state is shown instead." Nothing waits for an asset.

## Assets

`design/library/end/assets/` is generated by `node design/tools/library-assets.mjs` from `art.mjs`; `--check` fails on drift. Each picture is also a custom property in `end.art.css` (`--en-asset-<name>`), drawn only behind `[data-art~="end"]`.

| Asset | Size | SHA-256 | Used for |
| --- | --- | --- | --- |
| `en-emblem-blue.svg` | 48×48 | `51028cdfbd9d5b34…` | public at the end: the Blue emblem |
| `en-emblem-red.svg` | 48×48 | `1edee64a309d17d6…` | public at the end: the Red emblem |
| `en-emblem-alien.svg` | 48×48 | `c210fb26e2a4dedd…` | public at the end: the Alien emblem |
| `en-banner-blue.svg` | 320×72 | `0e1df6a8d09a0332…` | public at the end: the Blue winning banner |
| `en-banner-red.svg` | 320×72 | `8a316416efcef2d1…` | public at the end: the Red winning banner |
| `en-banner-none.svg` | 320×72 | `befd04c98a3e44f6…` | public at the end: the no-winner banner |
| `en-code.svg` | 200×56 | `ae16d60d5e813962…` | public at the end: the Code's plate |
| `en-flatline.svg` | 320×64 | `7aea395f4af361dc…` | public at the end: no survivors |
| `en-signal.svg` | 32×32 | `908bda2953e4c8d0…` | own screen: reconnecting |
| `en-broken.svg` | 32×32 | `b7f68d413e1afe92…` | own screen: a failed picture |
| `end.art.css` | 13,876 bytes | `c4480d8733c666c2…` | all of the above as custom properties |

Full hashes and bytes are in `assets/manifest.json`.

- **Faction colours:** this is the only library group that draws in the faction accents, and only in the side pictures (emblems and winning banners). The end is when the view reveals the sides. A test holds that every other picture keeps `MIN_ACCENT_DISTANCE` from every accent; the no-winner banner, Code plate, flat line and marks contain no accent.
- **Shape tells every side apart:** a ring, a cratered planet with a moon, a spiral.

## Mounting

- **Where:**
  - The reveal mounts on every screen, public at the end, over the arrival film's final frame. It starts at `revealStart()`.
  - The connection strip is each screen's own, at the top of the board, never over controls.
- **The reveal (phone):**
  - **Banner:** full width, the words as page text.
  - **Co-win line:** under the banner, when the result carries it.
  - **Roles:** "Every role", then one card per side (emblem and side name), its roles in seat order (name, role, a WINNER mark in words).
  - **Code:** the plate with four slots, the numbers as page text, then the words.
  - **Large text:** the plate becomes two by two, the role rows wrap, and nothing is clipped.
- **The display:** the same order, wider. The arrival film is the display's 4,200 ms cut, then the reveal.

## Motion (`motion.mjs`)

| Motion | Full | Beats | Reduced |
| --- | --- | --- | --- |
| `reveal` | 1,940 ms (7 seats) to 2,120 ms (9) | the banner drops 0–500; the emblem pops 300–700; each role turns face up in seat order from 500, 90 ms apart, 300 ms each; the Code's numbers stamp into the plate in the last 400 ms | fades, 160 ms, all at once |
| `noSurvivors` | 1,300 ms | the board dims 0–600; the flat line draws across 300–1,200; the words 900–1,300 | fades, 160 ms |
| `strip` | 200 ms | the connection strip slides down, or fades away for "restored" | fades, 160 ms |

## Sound

- **The reveal:** the arrival's single sting (group 2's cue sheets, the same at either planet). No new cue.
- **No survivors, the abort and recovery:** silent.

## Privacy-safe preload

`end.art.css` (13.9 KB) loads whole on every phone and display. Nothing in it tells anyone the result before `FINISHED`: all three sides' pictures arrive everywhere.

## Contract requests

None new. The view says everything the end needs.

## Checks

- `node --test packages/design-tokens/test/library-end.test.mjs`, 9 tests:
  - sides and team counts;
  - endings only from the result (winners, co-win, no survivors, abort, and no ending without a terminal result);
  - `filmDecision()` in all four cases and the reveal's start;
  - the connection strip's thresholds;
  - the words;
  - the art's palette rule (accents only in side pictures);
  - generated-asset drift;
  - motion: the reveal's length follows the roster, roles turn in seat order, reduced is fades only;
  - the review report.
- `node design/tools/library-assets.mjs --check`: the generated files are current (all seven groups).
- `node design/tools/library-capture.mjs --group end`: 89 captures in `review/`, 0 problems.
  - Every state at 390 and 320 px, and three state sections at 200% text, with a contact sheet each.
  - Every motion as six frames, full and reduced.
  - Measured as in the earlier groups.

Not tested: real phones and displays, screen readers, a real dropped connection (the review page feeds the client signals), the runtime itself, and the contract's adopted revision.
