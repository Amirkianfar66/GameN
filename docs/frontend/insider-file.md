# The Insider's file, in the game

Issue [#99](https://github.com/Amirkianfar66/GameN/issues/99) · branch `codex/frontend-insider-file` · stacked on [#100](https://github.com/Amirkianfar66/GameN/pull/100) (`codex/frontend-insider-board` at `721b1f2`) · base `1a92f3790e45622196014cc008544fc33c359c0a` (`codex/v1-board-release`, [#95](https://github.com/Amirkianfar66/GameN/pull/95)) · 11 October 2026

The owner asked to judge the Designer's Insider file in the game. This branch plays it in the release's own phone, in place of the interim investigation board of #100:

- the release's screen and controller;
- its host and styles;
- its approved art.

The look, motion and words are the Designer's, ported from their proposal. The owner has not yet approved them (DSN-D37).

## Where to judge it

The board simulation (`apps/game/dev/board/`) runs the release's phone over synthetic, schema-checked views. It is the only place the whole design shows today. The Designer's kit is a proposal outside the reviewed manifest, so the hosted build does not load it (see [The kit](#the-kit)).

```sh
npm ci && npm run build
npx vite --config apps/game/dev/board/vite.config.mjs
# then, at a phone size in a browser's device mode:
#   http://127.0.0.1:5178/?scenario=insider                   the file, with the Designer's kit
#   http://127.0.0.1:5178/?scenario=insider&kit=off           as the hosted build draws it today
#   http://127.0.0.1:5178/?scenario=insider&motion=reduced    reduced motion
#   http://127.0.0.1:5178/?scenario=insider-long-names        twelve-character names
```

Press **Card**: the file assembles under the role card the first time in the page, and appears at rest after that. Then:

- press a snapshot to inspect that player;
- press **Back** or Escape to put it back;
- press **Show on board** to close the card and ring that character on the board.

In the browser console, `__simulation.stale()` shows a view the server no longer confirms, and `__simulation.redeliver()` confirms it again.

The pictures are in [evidence/insider-file-2026-10-11/](evidence/insider-file-2026-10-11/README.md).

## Source

| Reference | Value |
| --- | --- |
| Designer delivery | PR [#102](https://github.com/Amirkianfar66/GameN/pull/102) at `1453500a2c2313844903f037a948578052122d49`, ability art `abilities-0.1.0` (proposal) |
| Designer's specification | `docs/design/abilities-handoff.md` at that commit; the reference behaviour `design/abilities/js/dossier.js` and styles `design/abilities/css/abilities.css`; the prototype wiring in `design/board-motion/js/app.js` |
| Kit | `design/abilities/assets/abilities.art.css` (9,451 bytes, sha256 `09e99fa3…5dcd`) and its `manifest.json`, copied byte for byte from `1453500` |
| Runtime assets / tokens | `design-0.2.0` / `0.4.0`, unchanged |
| Protocol and rules | Protocol 2. Current `full-game-1.1.0` / `in-person-v1-pass-2026-10-08`; legacy `full-game-1.0.1` / `in-person-v1-2026-10-06`. Backend's capacity tuple `full-game-1.2.0` / `in-person-v1-capacity-2026-10-11` ([#98](https://github.com/Amirkianfar66/GameN/pull/98)) changes no field the file reads |
| Field read | `knowledge.insiderCandidates` of the seat's own `FullPlayerView`; the public seats' location, health, Captain and Jail; the lobby identities' names and characters |

## What the player sees

**The file.** When the Insider opens the card on a live view, the role card becomes a row and the Insider's file stands under it:

- the cork board, with three snapshots of the players' own crew cards, pinned in seat order on one string;
- one envelope holding the three role names as one slip, stamped ONE EACH;
- **Who is which: unknown.**

**The assembly.** The first press of Card in a page assembles the file in 1,020 ms, with the Designer's beats:

- the board rises;
- the snapshots drop and are pinned, 70 ms apart;
- the envelope rises and its slip slides up;
- the query tags swing on;
- the string draws round the set;
- CLASSIFIED and ONE EACH land.

A later open, an update and a reconnect show the file at rest.

**Inspecting.** Pressing a snapshot lifts it toward the middle of the board and dims the rest to 30%. A card over the envelope gives that player's public facts:

- where they are;
- their health;
- Captain and Jail, when they hold.

**Show on board** closes the card and rings the character on the own board for 1.6 s. **Back** or Escape puts the snapshot down, with focus back on it.

**A view out of date.** While the server does not confirm the view, every role's card stays as the release draws it, under the release's banner ("Connection lost. Showing the last known state, which may be out of date."):

- the Insider's file stays too, at rest;
- an inspected snapshot is put back;
- an assembly in progress finishes at once;
- a first open on such a view does not assemble.

This is the Designer's recommendation, DSN-REQ-16, which Integration has not yet decided. The handoff's closed folder is not ported; see below.

**Reduced motion.** The file fades in over 80 ms, and an inspected snapshot is ringed rather than lifted. The ring on the board does not zoom.

## How it is built

| Part | Where |
| --- | --- |
| Markup and words | `packages/presentation/src/markup/comic-shell.ts` (`renderInsiderFile`) and `copy/en.ts` (`insiderFile`). The file is its own redraw region. The snapshots and the inspect card's words are nested regions, so inspecting redraws only those, and the live container stays in the page |
| Motion and geometry | `apps/game/hosted/insider-file.mjs`. It draws the string from the four corner pins and assembles the file once per page. It finishes every animation at rest when the file goes, motion is reduced or the view goes out of date, never assembles on a view out of date, lifts the inspected snapshot, and rings a character after Show on board |
| Host | `apps/game/hosted/browser-host.js`. It owns which snapshot is inspected and forgets it with the card, a stale view or a privacy change. It handles Back, Escape, Show on board and focus, and tells the motion when Card was pressed |
| Styles | `apps/game/hosted/private-card.css`: the reference styles, scoped to the open private card. It includes the short-phone and large-text layouts, the compact role card and the board ring |
| Simulation | `apps/game/dev/board/`: loads the kit for every player phone, hash-checked against its own manifest. `?kit=off` shows the hosted fallback |
| Evidence | `apps/game/dev/capture-insider-file.mjs` replaces the interim board's capture |

## Where it differs from the Designer's handoff

| The handoff | Here | Why |
| --- | --- | --- |
| The tab is a `header` | A `div` | The shell keeps its one banner landmark (the markup audit) |
| The string is an `svg` in the markup | The host makes it with DOM calls after each drawing | The release's markup allows no SVG |
| The inspect card is the live region and gets `hidden` | A live container that stays, holding a redrawn card | The release redraws by replacing markup. A new live region is often not announced; a change inside one is |
| An open card closes when the view goes out of date; pressing Card then shows the closed folder, the same for every role | Not ported. The card stays as the release draws it, for every role, with the file at rest | The release keeps every role's card on a stale view. The Designer then recommended keeping it (DSN-REQ-16, on #102 and in #107's `docs/design/integration-requests.md`); Integration has not decided. An earlier commit of this branch, `788b42c`, drew the folder; it can be restored if Integration keeps the PR #88 rule |
| The folder also shows when the turn's time is up | Not ported | The same recommendation. The release does not close the card then either |
| "Your card is hidden." and **Show my card**, for a page opened in the background | Not ported | In the release, a page in the background closes the card. Coming back shows the board, so this state does not occur |
| The card may take the whole space between the status bar and the dock | The same on a live view, with `:has()`. A view out of date keeps the release's card height, below the connection banner | At 390×844 a live card now holds the role card, the file and "What you know" without scrolling, over the board. Full height on a stale view put the card's heading under the banner |
| The role card becomes a row on a short phone | A row whenever the file is shown; the thumbnail is hidden at large text | The release's thumbnail already gives way to the words at narrow widths and large text |

At 320×568 "What you know" sits below the file. The file itself fits without scrolling; the list needs a scroll.

For the first ~360 ms of the assembly, the CLASSIFIED stamp lands from 1.9× its size and reaches up to 17 px past the card's right edge. The card clips sideways overflow, so it never scrolls sideways.

## Privacy

The never-show rules of the Designer's section 8 hold. The tests and the capture check:

- three snapshots built alike, in seat order whatever order the view gives (all six orders draw the same file);
- no role word, hook or pairing attribute on or in a snapshot;
- one role group with one accessible name, after the snapshots and never a list;
- inspecting says only public facts;
- nothing of the file on a closed card, in the background, in other phone views, on other roles' cards or on the display;
- a view out of date keeps every role's card as the release draws it, and the Insider's file there is the same as on a live view;
- the kit loaded once by every player phone, whatever the role, and never by the display.

Names are text: escaped, never a class, an identifier or a resource.

**Production build.** The hosted build carries the file's markup, words and styles. It does not carry the kit: there is no request for it, and no dev-only marker in the bundle. Its CSS names the kit's 11 custom properties behind `[data-art~="abilities"]`, which nothing sets. The production-exclusion scan of the built bundle passed.

## The kit

The kit stays a proposal until Integration adopts it into a reviewed export and the runtime manifest pin (DSN-D36). Until then:

- the hosted game draws the file in paper, ink and words with the approved crew-card portraits (`?kit=off` in the simulation);
- only the simulation draws the kit.

After adoption, the runtime change is small:

- add the bundle to `ART_BUNDLES` and to `bundlesFor('player')` in `apps/game/hosted/art.mjs`;
- add its manifest check to `comic-assets.mjs`;
- update the test that pins the three bundles.

`loadArt` already marks each arrived bundle on `data-art`.

The two kit files on this branch are the Designer's, byte for byte (the same blobs as on #102). Merging #102 first, or after, adds them once.

## Verification

All checks ran locally with Node 22.21.1 and npm 10.9.4, on Chromium device emulation; no physical phone, screen reader or touch device.

| Check | Actual result |
| --- | --- |
| Presentation suite | 181/181. 8 Insider-file tests replace the interim board's 6: seat order and the six orders, built alike, no pairing, one role group, inspect facts and a stray seat, absence in every other state, a stale view keeping five roles' cards and the same file, names as text |
| Game suite | 435/435, including 5 new tests of the motion module (the string, the assembly plan by position only and within 1,020 ms, once per page, finished on close and reduced motion, the 1.6 s ring carried across a redraw) and the 3 updated screen-lifecycle tests (backgrounding, refusal, staleness keeping the card and the file, another match). The motion tests also check that a view out of date finishes the assembly and that a first open on one does not assemble |
| Browser capture (simulation) | 41 steps, 0 problems, from commit `e985556`: see [evidence/insider-file-2026-10-11/](evidence/insider-file-2026-10-11/README.md). It found two defects, fixed before the commit: the landing stamp made the card scrollable sideways, and at doubled text on 320 px the inspect card's top slid under the card's sticky heading. A probe picture showed a third, also fixed: at large text the role card's thumbnail broke its name |
| Hosted build | Built with `apps/game/hosted/vite.config.mjs`. The bundle holds no kit and no development marker. `check-production-exclusion.mjs --bundle` reported 54 reachable modules and 174 files scanned, with no fixture, test or development module or marker |
| Full `npm run verify` on the clean commit `e985556` | Passed, exit 0. Tests: 53 bootstrap, 148 engine, 130 Backend, 102 tooling, 181 presentation, 435 game, with no failures. Production exclusion: 54 reachable modules, 167 files scanned, 39 labeled development files; no fixture or development code reachable. Balance: static 71/71; 522 scenarios (483 passed, 33 reviewed blocked, 6 manual, zero errors); 475 baselines with 4,388 controls detected; 10 playouts in each of 7/8/9; provenance checked at this commit. See [verification.txt](evidence/insider-file-2026-10-11/verification.txt) |
| Full `npm run verify` on the earlier clean commit `788b42c` (the folder version) | Passed, exit 0, with the same counts |

Two defects visible in the evidence pictures are fixed separately in [#103](https://github.com/Amirkianfar66/GameN/pull/103), which is not in this branch's base:

- in `*-stale.png`, the connection banner's icon lies over its words;
- in `320x568-text-*.png`, the navigation labels run together at doubled text.

**Found here and not changed.** At 320×568, a stale view's connection banner covers the open card's heading and its close button: the banner spans y 64–198 and the heading y 131–183. The banner is positioned over the page at z-index 90. This happens for every role, and a Cracker's card measures the same as the Insider's. It is the release's layout, not this port's.

## Open decisions

| ID | What | Who |
| --- | --- | --- |
| DSN-D37 | The look and motion of the Insider's file | Game owner |
| DSN-D36 | Adopt the kit into a reviewed export and the runtime manifest pin | Integration |
| DSN-REQ-14 | State in the contract that `knowledge.insiderCandidates` lists seats in seat order (the client sorts them anyway) | Integration |
| DSN-REQ-16 | Whether a stale or timed-out view hides the private card. This port follows the Designer's recommendation and keeps the release's card | Integration |
| — | The disclosure review of the file: that it says no more than v2.1 `roles.Insider` | Game Design and Balance |

Nothing here changes contracts, engine rules, Firebase, root manifests, lockfiles or the Designer's sources and tokens. The two kit files are copies of the Designer's. Nothing was deployed.
