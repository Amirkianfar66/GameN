# Playable V1 phone journey integration

Issue [#79](https://github.com/Amirkianfar66/GameN/issues/79). The game owner asked
for a four-workstream review and deployment on 8 October 2026, then explicitly
selected **Integrate the phone design into playable V1**. This authorizes the
phone layout for staging; it does not settle the design handoff's proposed rule,
disclosure or contract changes.

## Pinned inputs and review

- Runtime baseline: `87715a46dbd6a107e417bb6024d81c3fcb679049`, draft PR #75.
- Designer: `87ac25440f9f1791c58a4e7da7c0cec5257af88c`, draft PR #78. The
  synthetic journey remains under `design/v1-phone/`; its scripts and fixture
  data are excluded from production. This integration implements its layout in
  the existing production UI, not by connecting the prototype's fixture engine.
- Frontend: PR #77 at `a9bc4a95df754dd00fe8f2b747814df82e1017d2`, including
  development capture commit `0253b3a`. Its handoff supplies the current hooks,
  behavior review and implementation gaps. It contained no runtime redesign.
- Backend: `a8ae530374f23fbfa82648fbfdc0d12aec05de34`, draft PR #74. Read-only
  comparison confirmed its production engine, services, contracts, Functions,
  Rules, indexes and runtime configuration match the runtime baseline. Remaining
  differences are smoke-test evidence and documentation. The Backend owner also
  confirmed host display membership permits public gameplay reads after launch.
- Balance: `3780c249dca5f5515e3d08e5d58901d50c3c1a7b`, PR #68. Its Supplier
  disclosure audit is already incorporated in the baseline. No newer phone
  design/balance submission was found. Scenario checks remain required; bot
  play and simulations do not establish human social-deduction balance.

## Runtime changes

Entry and join use the comic page, touch-sized route/room tiles and grouped-code
paste handling. The host sees the room code, seat roster and incoming requests
first; practice bots, recovery, display admission and match details use native
folds. Start explains unfilled seats or unsettled bot settings. Ending the match
uses a native alert dialog focused on Cancel. Clipboard controls are deliberate
user actions; no QR or secret-bearing URL is generated.

The owner's 8 October simplification replaces the earlier scrolling setup with
a full-height 3×3 character matrix. Tapping one available tile submits the
existing confirmation request immediately. Existing public names are retained;
a seat without a name uses its chosen character call sign. There is no separate
name form. An uncertain reply freezes the same choice and exposes an explicit
retry; a server conflict permits another choice. Confirmed tiles stay in place.

Role reveal shows the approved illustrated card, a top-bar countdown and one
Ready button. The card itself toggles disclosure. Extra instructions and the
separate rules paragraph are removed; accessibility labels remain. Ready erases
private content and leaves a neutral checked card while the server waits.

The board now occupies the space between its top status/timer bar and a four-item
bottom navigation: Board, Actions, Card and Menu. These are page views, not a
modal drawer. Actions and Card still use the same explicit private controller;
Board, Menu, Escape and backgrounding conceal the private payload. Controls and
server-provided targets keep their existing command identities and confirmation
semantics. Role information and actions are separated visually. Public status,
the readable roster, vote information, practice explanation, settings and match
details remain available in Menu. Host/join secondary tools share one Menu.

The standard portrait board fits at 320×568, 390×844 and 430×932 without page
scroll. Optional Menu/details and longer private content can scroll inside their
own view; the top bar and navigation remain visible. Desktop uses the same
phone hierarchy for now. Public comic assets, names, movement/phase cues and
reduced-motion behavior are retained. Ended/blocked tabs can join a new game;
this clears local resume state, never the server match. Ended matches keep Menu
accessible: it replaces the result, and the next-game button stays above the
navigation on the result view. Finished and aborted navigation have regressions.

The host's progress summary uses the existing public screen controller only
after gameplay starts. Setup uses the neutral setup feed. Host/display never
load private bundles or subscribe to another seat's role preview.

## Preserved behavior and decisions

Protocol 2, `staged-start-1`, `full-game-1.0.1` and ruleset
`in-person-v1-2026-10-06` are unchanged. Selection gets 30 seconds and server-side
fallback; role reading gets a full 30-second minimum and all humans must be
Ready. First turn receives a fresh 60 seconds. Initial rooms, unique identities,
retry reconciliation, legal actions/targets, resources and private disclosure
remain server-authoritative. Ready still hides the role card. All action choices
stay inside the open private panel, including movement; no private legal-offer
markers are painted onto the public board.

Deferred: DSN-REQ-8–11 (pending-admission closure, join links/QR, shorter recovery,
runoff/tally metadata), the proposed public history panel and board-based room
picking. No client inference substitutes for missing server facts. An aborted
match has no final role/Code reveal; this does not retract already public
eliminated factions. The design prototype's broader “Nothing was revealed”
wording is not used. Screen redesign is not an approval for these proposals.

## Verification and release record

The initial deployed baseline was `57174b93e2b4abba1b05a79c908593de618e5ca5`.
Its release evidence is retained in PR #80. The subsequent compact-UI revision
passed local typecheck and the Frontend suites (154 presentation, 402 app tests),
including one-tap selection, immutable retries, conflicts, readiness and privacy.

Browser review used the real hosted source with isolated local Auth/Firestore
and the existing development HTTP service: nine seats/eight bots, one-tap
selection, private reveal/Ready, timed launch, accepted movement, Card/Menu/Board
navigation and zero private DOM markers after concealment. Actual document and
main content dimensions matched each of the three portrait viewports; navigation
buttons were at least 48px tall. Selection and role/Ready also fit at 320×568.
The local runner invokes real handlers but does not prove cloud trigger delivery.

Whole-workspace verification, immutable release pins and live readback belong in
the PR release record after the clean commit. Real iOS/Android, mobile keyboards,
enlarged accessibility text and human table balance remain unmeasured. A normal
portrait viewport check is not a real-device or accessibility-zoom certification.

Do not merge this integration or its stacked dependencies until review. No
claim of deployment is made by this document; see the release PR's readback.
