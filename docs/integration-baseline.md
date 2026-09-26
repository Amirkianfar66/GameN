# Shared integration baseline — bootstrap #1

Status: **draft contract and workspace ready for integration review; not a merged baseline**. This is the complete scope of [issue #1](https://github.com/Amirkianfar66/GameN/issues/1). Backend #2 and the three Claude workstreams #3–#5 have not started.

| Provenance | Actual value |
| --- | --- |
| Repository | `https://github.com/Amirkianfar66/GameN.git` |
| Branch | `chore/mothership-bootstrap` |
| Clean base at task start | `0a4ff9a772eda25ea27922a331ff406a3ffc9000` |
| Verified source-import ancestor | `7e28c2cd100642667fb0021be0b85fa8cade1869` |
| Preserved Canvas Git tree | `d5b0eedbdfba668645f76b79ca68ee4e96596694` |
| Contracts package / wire protocol | `0.1.0` / `1` (bootstrap draft) |
| Fixture source version | `fixture-source-2026-09-26` |
| Fixture source-manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` |
| Fixture engine / assets | `0.0.0-bootstrap-no-engine` / `0.0.0-no-assets` |
| Reviewed merge baseline (`BASE_SHA`) | **Pending review and merge. Unknown; do not substitute the task base or PR head.** |

The fixture source hash identifies the unchanged source manifest, which in turn pins seven JSON sources. It is not a compiled or approved production ruleset. No game canon is changed. Exact preserved file hashes are in [bootstrap-source-lock.json](bootstrap-source-lock.json); the 119 copied Canvas files and unbound example remain intact. [reference/README.md](../reference/README.md) retains the live database export limitation.

## Ownership and current package boundaries

| Path | Owner after bootstrap | Delivered here / next implementation |
| --- | --- | --- |
| `packages/contracts` | Codex Backend/Integration; affected-role review required | Strict schemas, inferred TS types and separate synthetic fixtures |
| `packages/engine` | Codex Backend | Injected evaluation-context type; no rules transition yet |
| `services/game-api` | Codex Backend | Authorized-adapter context type; no endpoint or persistence yet |
| `infra/firebase` | Codex Backend | Selected Firebase service boundary; no project/configuration/deployment |
| `apps/game` | Claude Frontend | Transport interface; no React app or connections yet |
| `packages/presentation` | Claude Frontend | Audience-specific input/motion-preference types; no event director yet |
| `packages/design-tokens`, `design` | Claude Visual/Motion Designer | Unchanged `0.2.0` token proposal exported; source assets not produced |
| `tools/balance`, `tests/scenarios` | Claude Game Design/Balance | Explicit evidence-status type; scenario engine adapter not produced |
| Root tooling, CI, this contract/baseline | Codex Backend/Integration | Exact npm workspace, lockfile, build/checks and handoffs |
| `tests/bootstrap` | Codex Backend/Integration | Schema, authored-fixture and package build checks only |

TypeScript project references express the package dependencies. The engine can depend on contracts; cloud/network/renderer imports are excluded. API may depend on engine and contracts; app/presentation consume contracts without engine internals. All eight packages build as ESM. The workspace guard checks both declared dependencies and static/dynamic import literals. It is a build boundary check, not a security sandbox for arbitrary future JavaScript.

## Shared wire contract

The source of truth for draft shapes is [packages/contracts/src/index.ts](../packages/contracts/src/index.ts). Unknown fields are rejected at each represented object boundary. These parsers validate shape; they do not authenticate anyone, authorize a view, prove eligibility, implement deduplication or resolve gameplay.

| Contract | Boundary and semantics |
| --- | --- |
| `RegisterShot` | `protocolVersion`, `matchId`, `commandId`, `phaseId`, `{ type: REGISTER_SHOT, targetSeatId }`. Auth supplies actor identity; no actor UID, client clock, damage or third-player identification. |
| `Receipt` | Same request identifiers; accepted/`REGISTERED` or rejected/`PHASE_CLOSED`/`NOT_ALLOWED`. Accepted means registered and the shot is reserved, not that damage occurred. No target/defense details. |
| `CommandResponse` / `ApiFailure` | Response-time `serverTimeMs` stays outside durable receipts/views. Separate safe errors: unauthenticated, forbidden, invalid request, unsupported protocol, command-ID conflict, unavailable. No raw validation messages/secret values in API responses. |
| `ReceiptLookupRequest/Response` | Match + command IDs only. Caller-authenticated lookup yields original receipt or `unknown`; unknown is not a rejection and is never stored as a terminal receipt. Unauthorized calls use `ApiFailure`. |
| `AdvanceIfExpiredRequest/Response` | Version + match + phase, returning `advanced` or `unchanged` plus server time. No client time, force flag or scheduler deadline token. Authentication/membership still required; failures use `ApiFailure`. |
| `ServerTimeResponse` | Version and trusted response time for clock calibration. Client clocks never reopen a phase. |
| `PublicView` | Match identity, pinned versions/hash, this audience's revision, nine unique seats, round, phase and active seat. Seats contain only number, location, health, Jail and Captain. No roles, factions, weapons, Code, Protection, private queue, global sequence or update timestamp. |
| `PlayerView` | A full composed snapshot with its own audience revision, self seat/role/shot availability and one own pending command ID. Audience seat must match self. Never merge a public document with a private patch. |
| Presentation events | Audience + opaque event ID + matching audience view revision; only authorized phase/location/health facts. `COMMAND_REGISTERED` exists solely for a player audience. IDs must not encode global/private sequence information. |

The initial schemas deliberately cover nine-player Officer integration only. They do not claim 7/8 support, all role knowledge, voting, Standard Hack, terminal reveals or full-match phase coverage. Health, Jail, location and Captain remain separate. Exact-role/faction-reveal fields are omitted rather than approving their emission timing implicitly. Extend the protocol through affected-role review before adding a new connected slice.

Match, phase and event identifiers must be role-neutral. A phase identifier combined with the public `activeSeatId` must not reveal the active player's hidden role; the same identifiers also appear in composed player views, commands and receipts.

Synthetic example; no real player data:

```json
{
  "protocolVersion": 1,
  "matchId": "fixture-match-a",
  "commandId": "fixture-command-1",
  "phaseId": "phase-a",
  "command": { "type": "REGISTER_SHOT", "targetSeatId": "seat-2" }
}
```

```json
{
  "protocolVersion": 1,
  "matchId": "fixture-match-a",
  "commandId": "fixture-command-1",
  "phaseId": "phase-a",
  "status": "accepted",
  "code": "REGISTERED"
}
```

Backend #2 must authorize the caller and compare the canonical request digest against its caller-scoped receipt **before** new-command phase expiry checks. A retry of the same request gets the original receipt; changed content with the same ID is a conflict. Resource reservation, state, journal, audience views, receipt and durable scheduling intent commit atomically. Retention must cover the permitted match-end retry/recovery window; the exact retention policy needs review.

Trusted time is injected into the engine. The first-slice technical proposal accepts only when the successful transaction attempt evaluates before `endsAt`; expiry is at or after it. Ordinary turns encode the confirmed 60 seconds; resolution has `endsAt: null`. The successful-attempt clock boundary remains subject to the operating-policy review noted in D08. No vote/showdown durations, late-input fallback or pause policy are invented. Deadline jobs use phase ID + private deadline token, never an internal match sequence that a hidden action could change. API, receipt retry, scheduler and reconnect guarantees remain implementation tests for #2/#3.

## Fixture and disclosure boundary

`createOfficerFixture('protected' | 'unprotected')` is exported only from `@mothership/contracts/fixtures`. The outer object has `fixtureOnly: true`, provenance, assumptions and **server-only synthetic truth**. Never serialize the outer object to a player or display. Future development galleries must be isolated from production imports/bundles. This bootstrap imports fixtures only in its tests.

Both variants contain five Blue roles (including Officer), three Red roles and Alien, powers off. Officer and Insider target are controlled seats 1/2 in Room A during the Officer's Round 2 turn. Seven other seats, a fixed Captain and locations are harness inputs, not an approved deal/routing policy. The protected target was granted Protection by Undercover in Round 1, active from Round 2, with one lifetime receipt; the other variant has none. The harness supplies one attack, no relocation/competing effects, and a completed no-jail vote before future resolution. It cannot become a production skip-vote endpoint.

The authored registration snapshots leave public and target views/events byte-for-byte equivalent; only the Officer's own revision, shot availability, pending ID and private registration event change. Protection never appears even in the target's view. Resolution expectations are server-only future expectations (Healthy if blocked, Injured otherwise), not executed engine results. No finalized resolution view is supplied while recipient semantics remain undecided. The independent scenario matrix remains declarative: 35 specifications, 25 ready for implementation, 10 blocked; none executed by bootstrap tests.

## Comic motion and renderer handoff

Preserve [motion-direction.md](design/motion-direction.md): bold ink/paper panels, selective halftone, short accents and a readable settle. The exported token proposal is unchanged: selection/registration 120 ms, card 220 ms, move 450 ms, impact 320 ms, round transition 700 ms, maximum comic beat 900 ms, reduced-motion fade at most 80 ms. These are proposed cosmetic timings, not deadlines or measured performance.

The contract allows a neutral private `REGISTERED` stamp, public movement, phase changes and public health facts. It does **not** authorize `BANG`, a trajectory, shooter identity, Protection ownership, or a public `BLOCKED` effect. A health change alone cannot be interpreted as an announced shot. Designer may storyboard a clearly synthetic disclosure example; connected emission waits for RULE-003/D09 and any attack-type disclosure approval.

Frontend #3 evaluates one R3F/Three.js 2.5D board, a constrained camera and readable React DOM controls, with GSAP timelines and DOM fallback. No renderer dependency, benchmark or production choice is made here. All three motion preference dimensions remain separate: reduced motion, reduced effects and mute. Event IDs/revisions support future deduplication and snapshot alignment; the director must suppress obsolete reconnect playback, cancel stale effects, keep controls usable and never change deadlines/state on animation completion. Public cues cannot follow secret activity or role-dependent asset loading. These are contracts to implement and measure, not runtime guarantees already proven.

## Decisions and adoption gates

| Decision | Remaining blocker / safe bootstrap boundary |
| --- | --- |
| INT-003 | Affected Frontend/Balance review of this schema and compatibility/error/receipt retention policy before adoption. No review claimed. |
| INT-002 / INT-004 / INT-005 | Actual renderer/device evaluation, token/art review and comic motion implementation. Targets remain unmeasured. |
| RULE-001 / D04 | Location rechecks after registration; fixture fixes locations and provides no moving-target outcome. |
| RULE-002 / D05 | Order inside competing normal-round effects; fixture has one attack only. |
| RULE-003 / D09 | Protection/private result recipients and reveal timing, including public attack-type/blocked feedback; absent from audience schema. |
| RULE-004 / D01 | Initial assignment and Hospital/Jail exits/movement consumption; fixed harness positions, no lifecycle handler. |
| RULE-005 / D02 | Captain routes and deliberately deferred no-candidate fallback; fixed harness Captain, no routing or election handler. |
| RULE-006 / D03 | Cracker Hospital/same-location/disclosure interaction; no Rescue handler. |
| RULE-007 / D06 | Code victory checkpoint; no Code/terminal transition. |
| RULE-008 / D07 | Vote/showdown windows, missing responses and invalidated targets; no timeout default. |
| RULE-009 / D08 | Pause/disconnect/abort policy and approval of the technical clock boundary; no presence-based consequence. |
| RULE-010 / D10 | Optional-power dealing and special-shot interactions; powers off, no special-shot implementation. |

Latest recorded owner decisions take precedence, then confirmed overlay fields, then unsuperseded v2.1 behavior. Layout/architecture proposals are not canon. [decisions.md](decisions.md) and [rules-audit.md](balance/rules-audit.md) remain unchanged; fixture assumptions do not resolve their questions. Game owner approval is required for rule decisions. Backend enforces the resulting policy; a visual review does not approve disclosure or gameplay.

## Four follow-up tasks — launch only after review and merge

Each session uses the same recorded `BASE_SHA`, an isolated checkout/worktree and its own branch. Read the linked GitHub issue in full. None is launched by this bootstrap.

| Task / runner | Branch | Concrete first deliverable and checks |
| --- | --- | --- |
| [#2](https://github.com/Amirkianfar66/GameN/issues/2) Codex Astra Backend/Integration | `agent/backend-foundation` | Pure Officer/Protection transition plus authenticated Firebase emulator adapter, caller receipts, audience projection and durable deadlines/outbox. Test retries after expiry, ID conflicts/races, actor-status survival, source-pinned replay, cross-seat denial, noninterference and stale/duplicate/catch-up scheduling; disclose emulator limits. |
| [#3](https://github.com/Amirkianfar66/GameN/issues/3) Claude Code Frontend | `agent/frontend-tabletop` | Accessible player/display shells and snapshot/transport adapter; R3F candidate with DOM target/confirm fallback; separate fixture/emulator modes and development-only comic gallery. Test pending/unknown/retry, reconnect, event deduplication, privacy, keyboard/tap, reduced motion and usable timers; measure named devices. |
| [#4](https://github.com/Amirkianfar66/GameN/issues/4) Claude Code Visual/Motion Designer | `agent/designer-art-direction` | Versioned card/board/token states, one finished room/neutral token/Officer card and editable source/rights manifest. Supply opening/accent/settled frames, anchors and normal/reduced-motion alternatives; keep blocked disclosure examples synthetic. Review with Frontend for actual composition/readability. |
| [#5](https://github.com/Amirkianfar66/GameN/issues/5) Claude Code Game Design/Balance | `agent/game-balance-baseline` | Source-pinned scenario adapter and evidence report after Backend publishes engine hooks. Keep 7/8/9 and powers-off cases separate, retain blocked cases, define human playtest/telemetry forms and report actual runs. No inferred win rates or automatic canon changes. |

### Record the reviewed baseline

The integrator first verifies the bootstrap PR is merged, reads its actual resulting `mergeCommit.oid` from GitHub (including squash/rebase behavior), fetches that commit and records it here/in the issue handoff in a focused update. For example, after replacing `PR_NUMBER` with this bootstrap PR:

```sh
gh pr view PR_NUMBER --repo Amirkianfar66/GameN --json state,mergeCommit
git fetch origin
git show --no-patch --format=fuller BASE_SHA
git merge-base --is-ancestor BASE_SHA origin/main
```

Use the verified merge result, not `origin/main` at some later time and not a guessed SHA. If unmerged or review is incomplete, stop. Do not launch a role based only on a passing bootstrap check. Obtain integration review of contracts/ownership/source preservation; required checks and game-owner decisions stay visible.

### Codex Astra Backend launch

Select Astra in the actual model control and record the runner used. In a new isolated checkout from verified `BASE_SHA`, read `AGENTS.md`, `docs/agent-roster.md`, this baseline, `agents/backend.md` and `docs/backend/first-slice.md`; execute only issue #2 on `agent/backend-foundation`. Keep blocked semantics isolated. Request focused shared-contract review and provide actual engine/emulator evidence and a PR.

### Claude Frontend launch

Start a separate Claude Code session from verified `BASE_SHA` on `agent/frontend-tabletop`. Read `CLAUDE.md`, `AGENTS.md`, roster, this baseline, `agents/frontend.md`, the frontend slice, rendering and motion direction; execute issue #3. Coordinate schema/dependency changes with Codex Integration. Deliver a PR with fixture/connected evidence clearly distinguished and real-device checks marked measured or not run.

### Claude Visual/Motion Designer launch

Start a separate Claude Code session from verified `BASE_SHA` on `agent/designer-art-direction`. Read `CLAUDE.md`, `AGENTS.md`, roster, this baseline, `agents/designer.md`, art direction and motion direction; execute issue #4. Deliver versioned source/assets/tokens/storyboards and reduced-motion handoff in a PR. Frontend owns runtime motion; the game owner decides open disclosure rules.

### Claude Game Design/Balance launch

Start a separate Claude Code session from verified `BASE_SHA` on `agent/game-balance-baseline`. Read `CLAUDE.md`, `AGENTS.md`, roster, this baseline, `agents/game-balance.md`, rules audit and scenario matrix; execute issue #5 using reviewed engine hooks. Preserve source hashes, unresolved cases and separate mode evidence. Record the actual Claude model; no particular Claude model is prescribed.

## Sources and verification

This contract follows all four [role briefs](../agents/), [backend](backend/first-slice.md) and [frontend](frontend/first-slice.md) specifications, [production architecture](architecture/production-v1.0.md), the later [rendering direction](architecture/rendering-direction.md), current rules and [motion direction](design/motion-direction.md). Historical Canvas platform code remains reference-only.

Run the commands in [development.md](development.md). Actual bootstrap evidence and checks not run are recorded in [bootstrap-verification.md](bootstrap-verification.md). The bootstrap stops at the reviewable PR; merge, baseline recording, production services and all four implementation tasks remain subsequent steps.
