# Frontend verification — slice 1

Only checks that were actually run are listed as run. Everything else is under [Not run](#not-run).

## Provenance

| Item | Actual value |
| --- | --- |
| Repository | `https://github.com/Amirkianfar66/GameN.git` (remote verified before any edit) |
| Issue / branch / PR | [#3](https://github.com/Amirkianfar66/GameN/issues/3) / `agent/frontend-tabletop` / [#15](https://github.com/Amirkianfar66/GameN/pull/15) |
| Base commit | `333c9e820f362a211352bc689372663f29b73ac4`, the PR #7 merge. The dedicated worktree already existed at this commit, clean and with no upstream; it was used as found and nothing was reset |
| Runner | Claude Code, desktop app. Model `claude-opus-5-5` |
| Rule-source manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`, recomputed with `shasum -a 256 rules/source-manifest.json`; equal to the issue and to the fixture provenance |
| Contracts / protocol | `0.1.0` / `1`, bootstrap draft, unchanged |
| Ruleset reference in fixtures | `fixture-source-2026-09-26`; not a compiled or approved ruleset |
| Design tokens | `0.2.0`, `proposal_for_evaluation`, unchanged |
| Environment | macOS 26.7.1 (arm64), Node `22.21.1`, npm `10.9.4` |
| Date | 6 October 2026 |

## Automated checks

All run from the repository root of the dedicated worktree, at the head of the branch.

| Command | Result |
| --- | --- |
| `npm ci` then `npm run verify`, **before any change** | Passed. 12 packages installed; 16 bootstrap tests passed |
| `npm ci`, after all changes | Passed. 12 packages; the lockfile is unchanged |
| `npm run clean && npm run verify` | Passed. Workspace boundaries: 8 explicit packages. Source integrity: 119 Canvas files, 7 rule sources, 24 pinned files, token proposal unchanged. Typecheck and build clean. 16 of 16 bootstrap tests |
| `npm run test --workspace @mothership/presentation` | 59 of 59 passed; 0 skipped, 0 todo |
| `npm run test --workspace @mothership/game` | 128 of 128 passed; 0 skipped, 0 todo |
| `npm run check:exclusion --workspace @mothership/game` | Passed. 24 modules reachable from the 2 production entries; 74 shipped or source files scanned; 15 development files labeled in code |
| The `test:frontend` line proposed in [integration-requests.md](integration-requests.md), run verbatim | Passed |
| `git diff --check` against the base | Clean |
| Diff against the base for every path outside `apps/game/`, `packages/presentation/` and `docs/frontend/` | Empty. No shared contract, rule, root manifest, lockfile, CI file, guard or other role's file changed |

**The 187 Frontend tests and the exclusion check are not part of `npm run verify` or CI yet.** Wiring them in is a root change that belongs to Codex Integration; the exact request is REQ-1 in [integration-requests.md](integration-requests.md). Until it lands, a green CI run says nothing about them.

**Correction, 6 October 2026.** The first push of this branch failed CI. Its last commit had added a status line to `docs/frontend/first-slice.md`, which is pinned by `docs/bootstrap-source-lock.json`, so `check:sources` failed. `npm run verify` had been run before that edit and not after it, and this document recorded it as passing. The file is restored byte-for-byte (SHA-256 `73a49f0dcd480aa6a5a9490ac6bb35a345bd1198a9ac3a59b5c50e96b9f95c66`). `npm run verify` is now re-run at the head of the branch before every push.

### What the tests cover

| Area | Tests in |
| --- | --- |
| Strict audience parsing; a player view cannot enter public state; unlisted fields refused; protocol mismatch told apart from a corrupt payload; match, seat, role and version pins; forward-only revisions; frozen views | `apps/game/test/snapshot-store.test.mjs` |
| Server time from a round trip; independence from the device clock; a contradicting sample replacing the estimate; deadline states; cap at the phase length | `apps/game/test/server-clock.test.mjs` |
| Receipts, rejections, each safe error, unknown outcome, timeout, cancellation; a receipt for another command not trusted; refusal to send a request that breaks the contract; a transport that answers with a plain value; the table client having no command method | `apps/game/test/api-client.test.mjs` |
| Connecting, live and stale; stale until re-delivery after a reconnect; permanent integrity failure; clock re-measurement and backoff; a superseded time sample ignored; listeners that reconnect or dispose while being notified; no command, receipt or phase call; clean disposal | `apps/game/test/audience-session.test.mjs` |
| Countdown second by second from server time; expiry changing nothing by itself; late join; the private panel closed by default, withdrawn in the background and after a recovery screen; focus requested once; no redraw without a change; motion preference; a hidden registration not redrawing the table, the target phone or a closed registering phone | `apps/game/test/screens.test.mjs` |
| Tokens to CSS variables, with numbers and strings validated; no literal color or duration in the stylesheet; breakpoints equal to tokens; reduced-motion rules and the in-app override; target size; contrast of the token pairs used; narrow-screen and reset regressions | `apps/game/test/styles.test.mjs` |
| The exclusion check itself: each kind of violation seeded in a throwaway workspace and reported, including extra export conditions, unparsable module kinds, files reached by URL and comment-only labels; the real development modules still labeled with comments stripped | `apps/game/test/production-exclusion.test.mjs` |
| Every scripted view valid against the contract at every step; server-only truth never emitted; the two fixture variants indistinguishable to every audience; a hidden registration delivered to one feed only; the loopback server's bind, exact-case path mapping, host and origin checks, body limit and content security policy | `apps/game/test/fixture-harness.test.mjs` |
| Markup escaping; attributes allowed by name; hand-built nodes checked on serialization | `packages/presentation/test/markup-node.test.mjs` |
| Shell models: identity, phase, location, markers, timer states, stale and blocked states; nothing private in a closed phone's model, whatever its role or action status | `packages/presentation/test/shell-models.test.mjs` |
| Structural accessibility audit of thirteen screens; role and action status absent unless the private panel is open; role-neutral identifiers; the same closed document for every role; region-level redraw | `packages/presentation/test/shell-markup.test.mjs` |
| What is and is not announced, fed as realistic sequences: expiry and the last-seconds notice once per phase, nothing for a hidden registration, no cause for a health change | `packages/presentation/test/announcements.test.mjs` |

Contrast is computed from token values for the pairs the shells use. As the token file itself says, that does not certify composited contrast.

**Mutation checks.** For the fixes that came out of the independent review, the guard was removed from the built code and the suite re-run. Thirteen mutations were tried; each made its named test fail. One test did not catch its mutation the first time (focus re-requested on every blocked frame) and was strengthened until it did. This is a spot check on those fixes, not a mutation score for the whole slice.

## Independent review

A second agent reviewed the diff with no knowledge of the author's conclusions. It ran the suites, a fuzz of the player screen and a mutation run, and reported twelve findings. Its report arrived after the PR had been opened, so the fixes are follow-up commits on the same branch. Each finding was reproduced before being fixed.

| # | Finding | Disposition |
| --- | --- | --- |
| 1 | `npm run verify` failed at the pushed head: a pinned file had been edited | Fixed; see the correction above. REQ-6 asks how the two pinned Frontend documents should be kept current |
| 2 | On a filesystem that ignores case, the development server served the contract fixture as `Fixtures.js` | Fixed. A file is served only under its exact on-disk name |
| 3 | With the role drawer closed, the phone still showed whether a shot was available, which before Round 4 identifies the Officer | Fixed by a design change: role and action status now share one private panel, closed by default. Listed for Designer and owner review in [slice-1-shells.md](slice-1-shells.md) |
| 4 | Three false negatives in the production-exclusion check: extra export conditions, a comment-only label, unfollowed module kinds | Fixed, with a test for each |
| 5 | A listener that reconnected or disposed while being notified leaked a feed or caused work after dispose | Fixed in three places; mutation-checked |
| 6 | "Time is up" repeated after every reconnect or return from the background; the last-seconds notice depended on arrival order | Fixed. Each notice is given once per phase, in either order |
| 7 | Seven tests still passed with the behavior they named removed | Each strengthened or replaced |
| 8 | An operator control could put a seat's private view on the public feed | Fixed. Refused for the public feed; an injection needs one named seat |
| 9 | Numeric design tokens reached the stylesheet unvalidated | Fixed |
| 10 | Unchecking "Reduce motion" did nothing on a device that asks for reduced motion | Fixed. The player's explicit choice wins in either direction |
| 11 | A transport method returning a plain value broke the API client and stopped clock retries | Fixed |
| 12 | Two minor development-server issues | Fixed |

The reviewer found nothing in the snapshot store, the clock and tick scheduling, or the reachability of development code from the production entries, and no bypass of the host and origin checks other than item 2.

## Browser checks against the fixture harness

**Every observation below is fixture evidence.** No backend was involved. Chromium only.

### On the final code

Headless Chrome 154.0.8037.98, driven over the DevTools protocol by `apps/game/dev/capture-evidence.mjs`, with two phones and the table open against one scripted match. Its output is committed under [evidence/slice-1/](evidence/slice-1/README.md): nine screenshots and `facts.json`, from which every figure in this table is taken, except the roster widths, which were measured the same way by a separate one-off script.

| Observation | Result |
| --- | --- |
| A phone as first drawn | No role and no action status in the document; the private panel is closed |
| Another tab brought to the front while the private panel was open | The page became `hidden` and the role and action status left the document. Back in front, the panel was still closed |
| Keyboard only | Focus order is skip link, private-panel toggle, reduce-motion, match details. Space opens the panel and Enter closes it; `:focus-visible` is true on the toggle |
| The private panel open | The role appears once and the action status appears; closed again, both are gone |
| A hidden registration | Table document unchanged. Target phone document unchanged. Registering phone with its panel closed: no region changed. With its panel open: the action status reads "Not available" |
| Connection loss and recovery | Stale banner, last state readable, then live again on Player 1 by itself |
| Payload in another protocol version | "Update required", focus on its heading, no role or seat in the document. After a readable view the match returns with the private panel closed, though it was open before |
| Reduced motion | Default `0.12s` on transform and box-shadow. With the device asking for reduced motion: `0.08s` on opacity and border-color, panel animation `ms-fade 0.08s`. With the player then unchecking the setting on that same device: back to `0.12s` |
| Touch targets on the phone at 390 px | 195×52, 235×44, 164×44 and 358×44 CSS px |
| 200% text on a 320 px phone | No horizontal overflow |
| Table roster at 320, 600, 768, 960, 1024, 1280 and 1920 px | No sideways scroll from 600 px up; beside the board from 960 px. At 320 px it scrolls inside its own focusable region and the page does not |
| Forced colors | Legible; every status keeps its text |
| Browser log | No uncaught exception, console error or content-security-policy violation |
| Requests the pages made, logged by the server | Besides page and module files: the three audience feeds, server time, two stylesheets and the browser's own favicon request. No command endpoint, no operator endpoint, no fixture module |

### During development, on earlier revisions

The Claude desktop app's built-in browser (Chromium 152, user agent `Claude/2.9939.4 Chrome/152.0.7977.130`) was used interactively with real key presses while the slice was being built. Its pane was not on screen, so pages were genuinely `hidden`; to exercise the foreground state the page's visibility was overridden by script, which is an inspection aid and is stated here for that reason.

These checks ran before the private panel replaced the separate role drawer and action card, so they are listed for what they found, not as evidence about the final layout:

- Real Tab, Space and Enter presses reached every control; focus stayed on the same control across countdown ticks and region redraws.
- With both phones and the table open, each feed was watched directly during the hidden-registration step: the public and target feeds received no message; the public feed carried public keys only and no role name; the fixture module answered 404.
- Another seat's view delivered to a phone produced "Match data check failed", showed neither role, and stayed blocked after a readable view.
- An unreadable payload kept the last view with an out-of-date banner, and the next readable view cleared it.

**Defects found by running the shells in a browser,** none of which the unit tests had caught, all fixed with tests: the role drawer reopening by itself after a recovery screen; "Time is up" not announced after returning from the background; the table roster breaking words mid-word; horizontal overflow at 200% text on a 320 px phone; a 24 px checkbox target; a second announcement overwriting the first before it could be read; and a style reset that out-ranked component classes and removed the padding of every paragraph-based chip, notice and card.

## Not run

| Check | Status |
| --- | --- |
| Firebase emulator integration of any kind: authentication, Security Rules, transactions, receipts, receipt lookup, scheduled deadlines, `advanceIfExpired` | **Not run.** No emulator exists yet (Backend #2) |
| Cross-seat denial and absence of unauthorized fields in real network payloads | **Not run.** Checked only against the fixture server, which performs no authentication |
| iOS Safari on a named physical device | **Not run** |
| Android Chrome on a named physical device | **Not run** |
| A physical table display | **Not run** |
| Safari, Firefox or WebKit on desktop | **Not run.** Chromium only |
| Screen readers (VoiceOver, TalkBack, NVDA) | **Not run.** Structure and announcement text are tested; spoken output was not listened to |
| Interactive checks in a visible browser window on the final layout | **Not run.** The final private-panel layout was exercised by the headless script and the unit tests only |
| Frame rate, cold load, memory, sustained-session behavior, asset budget | **Not run.** There is no board renderer and no bundle to measure |
| R3F/Three.js board evaluation | **Not started.** Needs dependency approval |
| Comic motion gallery and event director | **Not started** |
| Shot target, confirm, submit, receipt, unknown-result and retry flows | **Not started.** Next slice |
| Network throttling and offline behavior beyond a dropped feed | **Not run** |
| Composited contrast of final artwork | **Not run.** No artwork exists |

## What this evidence does not establish

Passing fixture tests and desktop screenshots do not show multiplayer correctness, real authorization, performance on a phone, or anything about balance. The fixture scenario is authored data replayed in a fixed order; its last two steps are Frontend's own variations and say nothing about how the server sequences a match.

## Reproduce

```sh
npm ci
npm run verify
npm run test --workspace @mothership/presentation
npm run test --workspace @mothership/game
npm run check:exclusion --workspace @mothership/game

# Browser harness, then open http://127.0.0.1:4310/
npm run dev:fixture --workspace @mothership/game

# Optional: regenerate the screenshots and facts (needs a local Chromium-based browser)
npm run dev:capture --workspace @mothership/game -- ../../docs/frontend/evidence/slice-1
```
