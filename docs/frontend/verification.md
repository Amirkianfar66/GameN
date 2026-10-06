# Frontend verification — slice 1

Only checks that were actually run are listed as run. Everything else is under [Not run](#not-run).

## Provenance

| Item | Actual value |
| --- | --- |
| Repository | `https://github.com/Amirkianfar66/GameN.git` (remote verified before any edit) |
| Issue / branch | [#3](https://github.com/Amirkianfar66/GameN/issues/3) / `agent/frontend-tabletop` |
| Base commit | `333c9e820f362a211352bc689372663f29b73ac4`, the PR #7 merge. The dedicated worktree already existed at this commit, clean and with no upstream; it was used as found and nothing was reset |
| Runner | Claude Code, desktop app. Model `claude-opus-5-5` |
| Rule-source manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`, recomputed with `shasum -a 256 rules/source-manifest.json`; equal to the issue and to the fixture provenance |
| Contracts / protocol | `0.1.0` / `1`, bootstrap draft, unchanged |
| Ruleset reference in fixtures | `fixture-source-2026-09-26`; not a compiled or approved ruleset |
| Design tokens | `0.2.0`, `proposal_for_evaluation`, unchanged |
| Environment | macOS 26.7.1 (arm64), Node `22.21.1`, npm `10.9.4` |
| Date | 6 October 2026 |

## Automated checks

All run from the repository root of the dedicated worktree.

| Command | Result |
| --- | --- |
| `npm ci` then `npm run verify`, **before any change** | Passed. 12 packages installed; toolchain, workspace and source integrity checks passed; 16 bootstrap tests passed |
| `npm ci`, after all changes | Passed. 12 packages; the lockfile is unchanged |
| `npm run clean && npm run verify` | Passed. Workspace boundaries: 8 explicit packages. Source integrity: 119 Canvas files, 7 rule sources, 24 pinned files, token proposal unchanged. Typecheck and build clean. 16 of 16 bootstrap tests |
| `npm run test --workspace @mothership/presentation` | 54 of 54 passed; 0 skipped, 0 todo |
| `npm run test --workspace @mothership/game` | 114 of 114 passed; 0 skipped, 0 todo |
| `npm run check:exclusion --workspace @mothership/game` | Passed. 24 modules reachable from the 2 production entries; 74 shipped or source files scanned; 15 development files labeled; no fixture, test or development module or marker found |
| The `test:frontend` line proposed in [integration-requests.md](integration-requests.md), run verbatim | Passed |
| `git diff --check` against the base | Clean |
| Diff against the base for every path outside `apps/game/`, `packages/presentation/` and `docs/frontend/` | Empty. No shared contract, rule, root manifest, lockfile, CI file, guard or other role's file changed |

**The 168 Frontend tests and the exclusion check are not part of `npm run verify` or CI yet.** Wiring them in is a root change that belongs to Codex Integration; the exact request is REQ-1 in [integration-requests.md](integration-requests.md). Until it lands, a green CI run says nothing about them.

### What the tests cover

| Area | Covered by tests in |
| --- | --- |
| Strict audience parsing; a player view cannot enter public state; unlisted fields refused; protocol mismatch told apart from a corrupt payload; match, seat, role and version pins; forward-only revisions; frozen views | `apps/game/test/snapshot-store.test.mjs` |
| Server time from a round trip; independence from the device clock; a contradicting sample replacing the estimate; deadline states; cap at the phase length | `apps/game/test/server-clock.test.mjs` |
| Receipts, rejections, each safe error, unknown outcome, timeout, cancellation; a receipt for another command not trusted; refusal to send a request that breaks the contract; the table client having no command method | `apps/game/test/api-client.test.mjs` |
| Connecting, live and stale; stale until re-delivery after a reconnect; permanent integrity failure; clock re-measurement and backoff; no command, receipt or phase call; clean disposal | `apps/game/test/audience-session.test.mjs` |
| Countdown second by second from server time; expiry changing nothing by itself; late join; role drawer and background concealment; recovery screens and focus; motion preference; a hidden registration not redrawing the table or the target phone | `apps/game/test/screens.test.mjs` |
| Tokens to CSS variables; no literal color or duration in the stylesheet; breakpoints equal to tokens; reduced-motion rules; target size; contrast of the token pairs used; narrow-screen regressions | `apps/game/test/styles.test.mjs` |
| The exclusion check itself: each kind of violation seeded in a throwaway workspace and reported; the real client passing with the contract fixture present on disk but unreachable | `apps/game/test/production-exclusion.test.mjs` |
| Every scripted view valid against the contract at every step; server-only truth never emitted; the two fixture variants indistinguishable to every audience; a hidden registration delivered to one feed only; the loopback server's allowlist, host and origin checks, and content security policy | `apps/game/test/fixture-harness.test.mjs` |
| Markup escaping and what markup may not contain | `packages/presentation/test/markup-node.test.mjs` |
| Shell models: identity, phase, location, markers, timer states, privacy, stale and blocked states | `packages/presentation/test/shell-models.test.mjs` |
| Structural accessibility audit of twelve screens; role absent unless the drawer is open; role-neutral identifiers; the same document for every role; region-level redraw | `packages/presentation/test/shell-markup.test.mjs` |
| What is and is not announced, including nothing for a hidden registration and no cause for a health change | `packages/presentation/test/announcements.test.mjs` |

Contrast is computed from token values for the pairs the shells use. As the token file itself says, that does not certify composited contrast.

## Browser checks against the fixture harness

Two desktop browsers, both driven against `apps/game/dev/serve.mjs` on the loopback interface. **Every observation below is fixture evidence.** No backend was involved.

**1. The Claude desktop app's built-in browser** (Chromium 152, user agent `Claude/2.9939.4 Chrome/152.0.7977.130`), used interactively during development with real key presses. Its pane was not on screen, so pages were genuinely `hidden`; to exercise the foreground state the page's visibility was overridden by script, which is an inspection aid and is stated here for that reason.

**2. Headless Chrome 154.0.8037.98**, driven over the DevTools protocol by `apps/game/dev/capture-evidence.mjs` at the final commit of this slice. Its output is committed under [evidence/slice-1/](evidence/slice-1/README.md): nine screenshots and `facts.json`.

| Observation | Browser | Result |
| --- | --- | --- |
| A page that is really hidden withholds the action card and the role | Both | Card absent; no role in the document |
| Returning to the foreground restores controls, leaves the drawer closed and re-measures time | 1 | Countdown jumped to the server's figure and "8 seconds left." was spoken |
| Keyboard only: skip link, role toggle, reduce-motion, match details, in that order; Space opens and Enter closes the drawer; skip link moves focus to `main` | Both | As listed; `:focus-visible` true |
| Focus survives redraws, including a countdown tick and a region replacement | 1 | Focus stayed on the element with the same id |
| The role is in the document exactly once while the drawer is open, and not at all otherwise | Both | Confirmed |
| A hidden registration, with two phones and the table open together | Both | Registering phone: only its actions region changed. Table and target phone: document unchanged apart from the clock. In browser 1 their feeds were also watched and received no message |
| Nothing private reaches the table | Both | No role name in the document; the fixture module was requested by no page. In browser 1 the feed itself was read: public keys only, no role name, and the fixture module answers 404 |
| Connection loss and automatic reconnect on the same seat | Both | Stale banner, last state readable, actions paused, then live again on Player 1 |
| Payload in another protocol version | Both | "Update required", focus on its heading, assertive announcement, no role or seat in the document; recovers on a readable view with the drawer closed |
| Another seat's view delivered to a phone | 1 | "Match data check failed"; neither role in the document; stays blocked after a readable view |
| Unreadable payload | 1 | Last view kept with an out-of-date banner; cleared by the next readable view |
| Reduced motion from the in-app control (1) and from an emulated device setting (2) | Both | Transition `0.12s` on transform and box-shadow becomes `0.08s` on opacity and border-color; drawer animation becomes `ms-fade 0.08s` |
| Touch targets on the player phone at 390 px | 2 | 195×52, 142×44, 164×44, 358×44 CSS px |
| 200% text on a 320 px phone | Both | No horizontal overflow; body text 32 px; display lettering capped at 44.8 px |
| Table roster at seven display widths | 2 | No sideways scroll at 600, 768, 960, 1024, 1280 and 1920 px (beside the board from 960). At 320 px it scrolls inside its own focusable region and the page does not |
| Forced colors | 2 | Legible; every status still has its text |
| Console, uncaught exceptions, content-security-policy violations | 2 | None |
| Requests made by the pages during the whole run, logged by the server | 2 | Besides page and module files: the three audience feeds, server time, two stylesheets and the browser's own favicon request. No command endpoint, no operator endpoint, no fixture module |

**Defects these checks exposed.** All are fixed in this slice and covered by tests: the role drawer reopening by itself after a recovery screen; "Time is up" not announced after returning from the background; the table roster breaking words mid-word; horizontal overflow at 200% text on a 320 px phone; a 24 px checkbox target; and a second announcement overwriting the first before it could be read.

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
