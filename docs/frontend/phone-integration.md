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

Character selection shows all nine public characters, a public-name counter,
conflict feedback, confirmed crew artwork and neutral progress. A character
claimed by another player cannot be sent as a fresh confirmation. Late selection
copy states the actual confirmed identity without claiming device memory proves
an automatic choice. Role reveal keeps the large private card; Ready removes
private content and focuses its waiting message. The Supplier reminder omits
its Officer exception at seven/eight seats, where that role does not exist.

The phone game has a compact comic board, sticky public phase, own public status
and a neutral Private card dock. Its opened sheet has a compact role card,
current action controls, a knowledge fold and private acknowledgments. Escape
closes it, focus returns to its toggle, background controls become inert, and
blur/backgrounding conceals it. Character names remain escaped text. Desktop
uses the same hierarchy with a wider board and private drawer. Existing public
movement/phase cues and reduced motion remain; the sheet entrance is 220 ms and
is disabled under reduced motion. The readable list retains full player names.
Players can leave an ended/blocked tab locally and join a fresh match; this does
not reset or delete the server match.

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

Local typecheck and Frontend suites passed after integration: 403 app tests plus
the presentation suite, including new character-conflict/name-length,
uncertain-confirmation copy, Supplier reminder and private-dock tests.

Browser review used the actual hosted source against isolated local Auth and
Firestore emulators with the existing development HTTP service. It exercised
join with a grouped code, host admission, six bots, character confirmation,
private reveal/Ready, the authoritative reading gate, gameplay, private action
selection/confirmation and accepted movement. The local practice runner invokes
real service handlers but is a stand-in for cloud trigger delivery.

The first whole-workspace attempt passed its workspace/tests and Balance static
checks, then correctly stopped because the scenario gate requires a clean
committed checkout. The release PR must record the subsequent committed
verification, immutable source/bundle pins, cloud checks and actual deployment
results. Real iOS/Android, mobile keyboards and human table balance remain
unmeasured; desktop browser viewports are not real-device evidence.

Do not merge this integration or its stacked dependencies until review. No
claim of deployment is made by this document; see the release PR's readback.
