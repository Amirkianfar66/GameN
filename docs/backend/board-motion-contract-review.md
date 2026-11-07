# Backend review of the board interaction and motion handoff

Issue [#87](https://github.com/Amirkianfar66/GameN/issues/87), Designer draft [PR #88](https://github.com/Amirkianfar66/GameN/pull/88). Review date: 9 October 2026. Backend owner branch: `codex/backend-board-motion-review`.

## Review pins and conclusion

The integration base is `94a49ce0c5220b814ec56333b028fbe6180b257e` on `codex/v1-pass-board-targets` (draft [PR #86](https://github.com/Amirkianfar66/GameN/pull/86)). Designer head is `e652bbf90f99b8aa616223c46f8ac8ff510cea03` on `codex/designer-board-motion`. Its 227 changed files are confined to `design/`, `docs/design/` and `packages/design-tokens/`.

The existing command, projection, private acknowledgment and event contracts support all 14 actions and all 20 reviewed/proposed cues. No additional server fact or broader audience is needed. This is a contract/disclosure review; the proposed visual treatments, assets and wording still need their respective reviews. The development prototype has two adoption defects described below. Production Frontend implementation must retain the existing authenticated controller and feed lifecycle.

Pass commit `012a0206eced172bd2158116654dfdd732bf3fbb` is already in the base. Preserve both exact protocol-2 gameplay tuples:

| Matches | Engine | Ruleset | Ruleset SHA-256 |
| --- | --- | --- | --- |
| New Pass-enabled matches | `full-game-1.1.0` | `in-person-v1-pass-2026-10-08` | `a25cec290370a3140829292b3cb8bdda3fb4402e0b529b56c6ef9692f7870183` |
| Legacy matches | `full-game-1.0.1` | `in-person-v1-2026-10-06` | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` |

Keep each match's recorded asset pin; reviewed assets are `design-0.2.0`, tokens `0.4.0`. The board-motion prop layers remain proposals outside that manifest. Preserve random admission-room assignment, the 30-second character stage, the 30-second reading minimum plus every human Ready, recorded round orders, ordinary bot pace, queued resolution and the full separate Hack minute. DSN-D27's maximum-five-room proposal and DSN-D28 adjacency remain unresolved: neither is a gate, and six-to-nine occupants must remain representable.

## Authoritative action-to-data and audience matrix

Inventory: [ACTION_KINDS][actions], [strict commands][commands], [engine eligibility and execution][gates]. Use the fresh own-player view's offers; the table explains them and does not authorize client-side rule reconstruction.

Every fresh command uses the current authenticated UID-to-seat binding, exact match/phase context and trusted server `startedAt <= now < endsAt`. The actor must be non-eliminated. A matching durable receipt replay follows authorization but precedes fresh phase/time/throttle checks; replaying an old accepted receipt does not make that action legal again. “Own ordinary” means the actor's active ordinary turn. “Ready” means Healthy and not jailed. “Local” means a living target in the same location, outside Command, with the explicit Rescue exception below. [Service receipt path][submit].

All accepted receipts say `REGISTERED`. That is neutral acceptance, including for immediately applied actions; it never supplies an effect outcome. `COMMAND_REGISTERED` is actor-only. Outcomes below come from authoritative views or the separate own acknowledgment feed.

| Action / command | Authoritative offer and actor/target/self gates | Application, later evidence and audience |
| --- | --- | --- |
| `pass` / `PASS_TURN` | `legalTargets.PASS_TURN=[self]` is a capability; payload is targetless. Own ordinary, living actor including Injured/Jailed; exact new tuple only. | Closes the ordinary turn immediately. Pending Hack opens its own full 60 seconds; otherwise normal turn/release/Jail progression. Queues and reservations survive. Public phase/active-seat changes; private neutral receipt. |
| `move` / `MOVE` | `self.movementDestinations`. Ready, unused voluntary move this round, in A/B/Command, during ordinary/Hack/election; need not be own turn. A↔B, Captain may enter Command from either; Command→A/B. No Hospital/Jail/Final exit by MOVE. | Immediate public location. Leaving Command retains Captain. Forced placements are separate and consume no voluntary move. No adjacency or capacity rule. Animate only the confirmed public location. |
| `shot` / `REGISTER_SHOT` | `legalTargets.REGISTER_SHOT` plus `self.shotAvailable`. Own ordinary, ready, ammunition, one ordinary shot in that turn; Officer in nine-player mode from R1 with unspent lifetime shot, others R4–5. Another local target; no self. | Reserves ammunition at acceptance; queued normal resolution. Public health/location may later change neutrally; no attacker/weapon/hit/block acknowledgment. |
| `disable` / `DISABLE` | `legalTargets.DISABLE`. Own ordinary, ready Blue/Red Disabler, unused round Main Action and lifetime use. Another local target; no self. | Reserves use/Main Action at acceptance; queued attack. No public role/action cue or cause; only subsequent public state and own pending completion. |
| `protect` / `PROTECT` | `legalTargets.PROTECT`. Own ordinary, ready Undercover, unused Main Action; local self allowed; recipient's lifetime grant unused. | Reserves recipient lifetime entitlement at acceptance. Grants during normal resolution, active next normal round. Grant/activation/consumption appear only in Undercover `knowledge.protections`, never recipient or public. |
| `rescue` / `RESCUE` | `legalTargets.RESCUE`. Own ordinary, living/free Cracker, remaining use and Main Action. Local self allowed; from A/B may target Hospital. Injured Cracker can Rescue only self. Healthy target can be registered. | Use reserved immediately, even if no heal later. After attacks, heal if target Injured; final placement at round end. Public health/location neutrally; no giver or heal-cause acknowledgment. |
| `scan` / `SCAN` | `legalTargets.SCAN` and inline Blue/Red/Alien guess. Own ordinary, ready Hacker, unused Main Action and round Scan; local self allowed. | Immediate own `knowledge.scanResults` at acceptance. Failed guess has `inCode=null`; correct guess discloses membership only. No public cue, target notification or receipt correctness. |
| `supply` / `SUPPLY` | `legalTargets.SUPPLY`, two distinct local targets including self. Own ordinary, ready Supplier, R3, unused Main Action. No role-based recipient exclusion. | Queued after Rescue; grant one ordinary weapon to each surviving selected recipient. Officer's extra weapon cannot buy another shot. Actual successful recipients, including an empty result, only in Supplier's `supplierResults`; each successful recipient gets only its own `receivedSupply`. No public giver/weapon fact. |
| `hack` / `REQUEST_HACK` | `legalTargets.REQUEST_HACK`. Own ordinary, living including Injured/Jailed, unused match initiation, fewer than two conversations this round. Another local target; no self. | Reserves request immediately; ordinary close/Pass opens full Hack minute. Requester is public `activeSeatId`; partner association is private to the two participants. Arbitrary spoken truthfulness is not machine-validated. |
| `code` / `SUBMIT_CODE` | `self.codeAttemptAvailable` and all roster seat IDs; four distinct, including self or Eliminated. Living Hacker in R5, unused attempt, any live normal phase before Showdown; Injured/Jailed allowed. No legalTargets key. | Consumes attempt at acceptance. No immediate correct/incorrect acknowledgment; victory is evaluated after full normal R5 resolution. Public result/end reveal only when FINISHED. |
| `showdown-shot` / `SHOWDOWN_SHOT` | `legalTargets.SHOWDOWN_SHOT`: all other living seats. SHOWDOWN, living actor including Injured/Jailed, unused special shot. No local/Command gate, no self. | Reserves special shot at acceptance; full window. Resolve in R5 order even if shooter later dies; fixed eliminated target has no effect, redirect or refund. Neutral public effects only. |
| `vote` / `VOTE` | `legalTargets.VOTE` plus null abstention. Election/runoff or Jail phase, eligible living voter including Injured/Jailed, one final ballot. Self allowed if listed. Election candidates Healthy/free; Jail targets living/free. | Own ballot private. Aggregate at deadline: election plurality/runoff; Jail unique leader needs at least 50% of all eligible voters. Public tally and resulting placement/status; no voter identities or individual choices. |
| `release-choice` / `RELEASE_CHOICE` | `legalTargets.RELEASE_CHOICE` plus null decline. Release-choice current Captain, one choice, listed living jailed target; no self-release. | Named selection spends the match-wide opportunity even if release fails, then opens release vote at deadline. Decline/missing selection opens Jail vote without spending. Public selected subject when release vote opens; no early close. |
| `release-vote` / `RELEASE_VOTE` | `self.releaseVoteAvailable` and true/false/null; no character target picker. Eligible living voters including Injured/Jailed/recipient, one final ballot. Public subject is `ballot.releaseTargetSeatId`. | Own vote private; at deadline at least 50% Yes of all eligible voters releases subject. Apply canonical placement, publish aggregate, then Jail vote. |

Normal queued effects resolve after Jail vote: recorded actor order, Main Action before Shot, then Rescue, R3 Supply, placement/reveals/victory. Accepted targets remain locked despite later movement or actor injury/Jail/death; target health/defenses are rechecked. Clearing `ownPendingCommandIds` means processing completed, not successful effect. [Resolution/deadline source][resolution].

## Facts Frontend may actually render

The [public contract][public] exposes location, health, jailed, Captain, permitted faction reveal, phase/active seat/round, ballot subject/eligibility, aggregate tally and terminal result. Role/Code reveal exists at FINISHED, not ABORTED. Public events contain exactly `PUBLIC_MOVE`, `PUBLIC_HEALTH_CHANGED`, `PHASE_CHANGED`; the player stream adds only `COMMAND_REGISTERED`. There is no shooter, cause, weapon, block, Rescue giver or public Supply giver field. [Event schemas][events] and [audience writer][writer].

The [own-player projection][projection] supplies role/resources/offers, Insider candidates, Hacker knowledge/Scan, Alien Code, Undercover-only Protection history, own ballot/pending IDs and participant-only Hack partner. Do not derive a public cue, asset request, audio or haptic signature from these private facts.

Supply resolution uses [OwnAcknowledgments][ack-contract], separately paired with [SeatSession][session-contract]: current UID/seat/match/binding must agree. Supplier sees command ID and successful recipient IDs; recipients see only R3 and one granted weapon, without Supplier identity, command ID or other recipients. `historyAvailable=false` is unavailable history, not zero grants. Binding revision increments are not new grants. Legacy missing history is never reconstructed from ammunition or queue changes. [Projection][ack-projection], [existing Card consumer][card], [validated feed pairing][feeds].

Authorized listener paths are relative to the database root; own UID and seat come from the verified session, never a chosen character. Current typed transport already supports the four document feeds. Event collections require the reviewed listener extension described below.

| Path under `matches/{matchId}/` | Parsed data / audience |
| --- | --- |
| `views/public` | FullPublicView / admitted public audience |
| `playerViews/{ownUid}` | FullPlayerView / current own seat |
| `seatSessions/{ownUid}` | SeatSession / current own binding |
| `ownAcknowledgments/{ownUid}` | OwnAcknowledgments / paired own binding, nullable legacy fallback |
| `audienceEvents/public/items` | FullPublicEvent / public facts |
| `audienceEvents/p-{ownSeatId}/items` | FullPlayerEvent / current own seat; Rules recheck binding |

Do not use server-only engine state, journal sequence, receipt storage or other players' paths as motion sources.

## All 20 cue sources and safe triggers

Names and reviewed/proposed classification come from the pinned [Designer cue contract][designer-cues]. “Local/private” always means the current own device while that private surface is deliberately open; historical evidence is rendered as settled history.

| Cue | Status / audience | Existing source and trigger |
| --- | --- | --- |
| `cue-selection` | Reviewed / local | Eligible deliberate tap; own controller selection, never a server effect. |
| `cue-registration` | Reviewed / private | Own accepted receipt; neutral stamp. Actor event has the same acceptance meaning, not a second stamp. |
| `cue-public-move` | Reviewed / public | Fresh confirmed `seats[].location` difference or one validated `PUBLIC_MOVE`; no causal inference. |
| `cue-status-change` | Reviewed / public | Fresh health/jailed/Captain/permitted faction difference; health event carries only health. |
| `cue-phase-change` | Reviewed / public | Fresh phase identity/kind/active seat; `PHASE_CHANGED` supplies only phase ID, reconcile the view. |
| `cue-round-transition` | Reviewed / public | Fresh confirmed round increase, not local countdown expiry. |
| `cue-tray-open` | Proposed / local | User opens Actions; current own offers. |
| `cue-strip-enter` | Proposed / local | Controller opens an action, Move or Pass confirmation. |
| `cue-target-eligible` | Proposed / local | Exact current own offered target pool, removing picks already made. |
| `cue-target-pick` | Proposed / local | Own distinct Supply/Code taps, numbered as local progress. Code set has no semantic order. |
| `cue-pending` | Proposed / local | Own request/check in flight; hide private marks on conceal without losing recovery state. |
| `cue-not-accepted` | Proposed / private | Durable rejected receipt or controller-proven safe invocation failure; not an earlier unresolved request's fate. |
| `cue-unknown` | Proposed / private | Controller has no definitive answer; no implied success/failure. |
| `cue-room-press` | Proposed / local | Deliberate press; existing movement controller validates afterward. |
| `cue-move-tentative` | Proposed / local | Own offered destination under confirmation/submission; true public piece stays at its confirmed location. |
| `cue-sheet-open` | Proposed / private | Deliberate Card/Menu open; Card uses own view plus paired acknowledgments. |
| `layout-reflow` | Proposed / public | Confirmed public occupancy changes alter decorative stations; no authority or capacity. |
| `cue-turn-accent` | Proposed / public | Confirmed `activeSeatId` changes, including public Hack requester. |
| `cue-tally` | Proposed / public | Newly published aggregate `lastTally`; individual ballots remain private. |
| `cue-ballot-subject` | Proposed / public | Confirmed release-vote subject, not the Captain's local unsent selection. |

## Trigger, replay and cancellation handoff

1. Keep the existing action controller. Room tags use `openRoomMovement`; Pass stays targetless in the central navigation slot; character buttons consume exact own offers. Supply takes two distinct picks, Code four; Scan and release-vote answers are inline. Hospital/Jail/Command/self restrictions are action-specific, not blanket filters.
2. Receipt loss keeps the same `(match, seat, phase, command)` identity. Persist only that nonsecret stub; private payload stays in memory. A lookup returning unknown while the sent phase remains open is unresolved. An unknown lookup proves nonacceptance only when that lookup was performed after a fresh authoritative view established that the sent phase closed; an earlier lookup cannot settle it. Hide marks/close private surfaces on background, quarantine, stale data or identity/binding change; do not fabricate cancellation or a replacement ID for an uncertain command. [Controller][controller].
3. First attach, reconnect, background return and listener-generation/binding changes establish a quiet fresh baseline. Never replay an event backlog as attacks or animate stale/offline state. On conceal/disposal cancel all active effects; each newer confirmed seat update cancels that seat's older effect. Latest validated state wins.
4. Event deduplication is `(match, audience, eventId)`, not revision alone: multiple facts can share one audience revision. Public facts occur in both public and player streams, so choose one public trigger source per screen. Snapshot cues compare successive validated facts in their audience, with stable fact keys; do not combine public and private revision clocks. [Audience event writer][writer].
5. Scan evidence is keyed by round/target/guess in fresh own knowledge; it has no command ID. Supply history is keyed by match/seat/command ID for Supplier, match/seat/R3 for recipient. A restored receipt, binding revision or historical Card opening is settled evidence, not a new effect.
6. Current [typed transport][transport] has no event subscription target. Use validated view differences and paired acknowledgment feed now; any Frontend event-listener extension must parse existing FullEvent schemas at the verified audience path. This does not require a new backend event. The existing [motion primitive][motion] is a starting point, not proof of all cancellation cases; implement the Designer's newer-update cancellation when adopting the flight treatment.
7. Travel goes from previous confirmed public position to new confirmed position. It implies no route, adjacency, intermediate occupancy or effect cause. More than four moves in one update settles without travel. Motion remains finite, pointer-free and nonblocking; completion never submits, spends or advances. Reduced motion exposes identical facts/controls without travel/trails/shake/zoom. Local timer expiry waits for server state; never fabricate a phase to conceal a stalled deadline.

## Findings and required adoption corrections

### P2: backgrounding retains submitted/uncertain private target marks

At the Designer pin, [`dropUnsent`][drop] resets only choosing/confirming. [`visibilitychange`][visibility] cancels directors and rerenders, but [`boardCues`][board-cues] still returns selected targets as pending for submitting/checking without a visibility/conceal guard. An independent exact-function probe produced empty marks for choosing, but pending seat 5 for both submitting and checking after background cleanup. This is a source-function reproduction, not a browser reproduction or evidence of a production leak.

Designer/Frontend must conceal the private board/strip marks for every pending/checking/unknown state, while preserving request recovery internally. Add background/foreground regressions after send and during receipt lookup, including lost acknowledgment. Do not copy this lifecycle unchanged into the runtime.

### P2: some fixtures contradict engine eligibility while the checker overclaims coverage

Pinned [fixtures][fixtures] default to R2 yet offer Code in `tray.open`, `code.two`, `code.four` and Supply in `crowd.supply`; `move.tags` offers Command to a non-Captain; `vote.election` includes Injured/Jailed candidates. The [fixture guard][fixture-guard] checks roster/local/self target constraints but omits these actor/round/candidate gates. The verification claim that offers are what the engine could offer is therefore too broad.

Correct fixture round/actor/status contexts and add negative guard regressions for these gates before Frontend treats them as behavioral examples. Their geometry and synthetic screenshots do not authorize runtime eligibility changes.

### P3: clarify Hack publicity and include the acknowledgment sidecar in the data handoff

The [coverage contract][designer-coverage] describes Hack participants as private. The requester is publicly active in Hack; only the partner association stays private. Clarify that wording. Its fact inventory also needs the own acknowledgment/seat-session feed and `historyAvailable` fallback: a generic private knowledge string in a fixture is not the typed Supplier/recipient result. Keep the runtime's existing pairing and exact disclosure; no new protocol or audience is needed.

### Separate backend reliability defect: dispatched gameplay deadline recovery

The same audit found [issue #89](https://github.com/Amirkianfar66/GameN/issues/89): successful enqueue marks a gameplay intent dispatched, while repair at this base queries only pending/leased. With finite task delivery attempts, a lost/exhausted dispatched task can leave an unattended phase stalled. Setup repair already handles dispatched intents. This is source-proven, not an observed cloud outage or Pass regression. The focused correction and its regression evidence are tracked separately in issue #89; this documentation change does not modify runtime behavior. No deployment, IAM retry or cloud verification is part of this review.

## Evidence and limits

Locally inspected exact Git pins, changed-path ownership, all 14 command/action definitions, canonical gates/resolution/projections, audience writer, controller/feed/acknowledgment paths and pinned Designer contracts/docs. Independent source probes reproduced the background-marker gap and verified the pre-existing V1-phone copy mismatch: the checker/fixture/six referenced release files are byte-identical between the review pins and the same 13 quoted identifiers are missing at both. No Designer code was edited or its guards weakened.

Inspected existing successful [PR #86 CI job](https://github.com/Amirkianfar66/GameN/actions/runs/37797988854/job/113382490841), associated with `94a49ce`. Its checkout was synthetic merge `4e3ba2c` (merge of `94a49ce` into `90f079d`), not an independent exact-head checkout. Logs show 53 bootstrap/contracts, 148 engine, 130 backend, 118 Auth/Firestore data, 14 legacy Functions, two real V1 Functions/Tasks and seven Frontend-emulator tests passing with no failures/skips; package standalone install/exclusion passed. These are inspected CI results, not newly executed review tests or cloud acceptance.

Designer-reported browser captures/flows, repository verification and 15 new prototype tests are recorded in [its verification page][designer-verification]; they were not rerun here. No production Frontend browser/device, two-client runtime motion, human playtest, deployment, IAM change or hosted acceptance was performed. Initial documentation validation passed: the read-only source probe, an inventory/immutable-link check covering 14 action/command rows, 20 cue classifications and 25 source paths/line bounds, and `git diff --cached --check`. Temporary probe scripts are local verification artifacts; no runtime or Designer suite was rerun for this document. Exact commands are recorded in this PR. Gameplay versions, public/private contracts, source snapshots and shared manifests remain unchanged.

## Follow-up: actual Frontend consumer, PR #92

Reviewed on 9 October 2026 at Frontend head `aa007890c5bf8f4801bfb545c0f6da0426f7d6cd`, draft [PR #92](https://github.com/Amirkianfar66/GameN/pull/92), based on Designer `ef4c2ee449f6b0a5991814e18acf7ab42e73ef02`. The original review above remains pinned to `e652bbf`; this follow-up reviews the production consumer separately. It updates Backend PR #90 only. Deadline correction [PR #91](https://github.com/Amirkianfar66/GameN/pull/91) remains a separate integration change.

### Audience and contract conclusion

The consumer introduces no new server fact or audience. Contracts, engine/service/Rules, root manifests/lockfile/CI, `apps/game/src/`, action-offer mapping and table renderer are byte-unchanged from its Designer parent. Presentation's new station/board-mark fields are local render models. The action controller still owns command IDs, retries and confirmation; the server still owns admission, legality, resources and deadlines. Both gameplay tuples and the existing setup/Ready/Pass/Hack behavior remain intact.

| Consumer surface | Verified source and boundary |
| --- | --- |
| Character press areas and multi-picks | Existing action offers feed the board model and strip. Self/location/Command exceptions remain action-specific. Supply/Code count local distinct picks; Move uses the existing room movement path, and Pass remains targetless. No role-derived authority. |
| Background/private concealment | [Private content][consumer-hide] is absent when concealed. The [own board renderer][consumer-render] receives marks only from the open Actions card; Pass's separate receipt is also suppressed on conceal. The display never receives those own marks. |
| Neutral receipt and strip | [Strip differences][consumer-strip] use local steps/picks and the same acceptance status; a transition from submitting/checking/unknown to accepted stamps neutral registration. A strip first opened already accepted, or repeated accepted state, stamps nothing. No hit/heal/block/Code-correct fact is inferred. |
| Public movement/status/turn/phase | [Public fact extraction][consumer-facts] reads confirmed location, health/Jail/Captain/permitted faction, active-seat flag and displayed round/phase labels. Snapshot differences drive cues, without an event listener or use of `COMMAND_REGISTERED`, role, knowledge, receipt or acknowledgment as a public source. Reconnect/stale/background produces a quiet baseline; repeated facts cue nothing; more than four moves settle without travel. |
| Flight artwork and placement | Public crew appearance and occupancy supply the decorative copy/stations. No private selection markup is cloned, and no per-action asset request/audio/haptics are added. Routes/capacity are not inferred. Proposed props/full-body figures remain outside the reviewed manifest and are not adopted here. |
| Protection/Hack/Supply Card evidence | Existing private feed/session pairing is untouched. [Card consumption][consumer-ack] retains Supplier results, recipient-only receipt and history-unavailable fallback. Protection stays Undercover-only; Hack requester remains public active seat, partner association private. No acknowledgment becomes a public motion effect. |

The two original adoption findings have distinct outcomes. Frontend's [hidden-page/model regressions][consumer-hidden-tests] and [real controller regressions][consumer-controller-tests] cover submitting, checking, recovered checking, unknown and accepted states, including lost answers. The new [simulation guard][consumer-scenarios] corrects its own Code/Supply round, Captain movement and ballot fixtures, with negative checks. It restates applicable engine gates for synthetic views; it does not execute full engine histories, and explicitly unreachable crowd states remain labeled layout stress cases.

Designer `ef4c2ee` still has the submitted/checking background marks and six original fixture discrepancies described above. An exact-source probe reproduced them at that pin. PR #92 does not change those Designer files, so its consumer fixes do not close the prototype findings or approve the prototype's broader verification claim. The same 13 pre-existing V1-phone quote mismatches also remain at both current pins.

### P2: stale/expired sent-command board marks remain

At [connected-player.ts:242–247][consumer-marks], submitting/checking returns pending target IDs or a Move ghost; accepted Move also retains its ghost until the own location arrives. Freshness/time gating in `drawnAction` applies only to unsent choosing/confirming. An open private panel still builds this card with a paused notice, and the renderer paints its marks. Thus an unattended request/receipt check whose view becomes stale or deadline expires can retain these cues.

A separate probe executed the actual compiled model and renderer with schema-validated synthetic own inputs: stale and expired states each retained Rescue target marks for submitting/checking and Move ghosts for submitting/checking/accepted, **10 combinations total**. Unknown correctly had no board marks. This is a renderer reproduction, not a browser or service execution.

Suppress these board marks/ghosts when the own view is not current or its trusted deadline is no longer running; preserve the uncertain command and receipt-recovery strip internally. Add in-flight stale/expired regressions, including accepted Move awaiting its public view. Existing tests cover stale/expired **choosing** and background **in-flight** states separately, leaving this combination uncovered. The [Frontend privacy claim][consumer-doc] currently overstates that coverage.

### P2: reduced-motion change does not cancel an existing flight

At [comic-motion.mjs:173–174][consumer-motion-after], unchanged public facts return before effective reduced motion is evaluated. Switching the in-app preference or device preference during a flight therefore leaves it owned/running when the next redraw has identical public facts. The exact-source DOM/animation shim independently reproduced **zero cancellations, three retained effect nodes and the piece still marked moving** for both switches. A disposal control cancelled and cleared all three, confirming the ownership cleanup exists.

This matters to the public cue cancellation/reduced-motion mapping. Cancel and settle running motion before the unchanged-facts return when reduced motion becomes effective; add an in-flight preference-change regression. [CSS motion suppression][consumer-css] does not replace the missing animation/ownership cleanup. This finding concerns presentation cancellation; it requires no backend fact, command or rule change. No Frontend file was edited in this Backend review.

### Follow-up evidence and limits

An immutable `git archive` snapshot of `aa007890` was created at `/private/tmp/gamen-pr92-consumer-review-1vy_zv5v/GameN`. Node `22.21.1`/npm `10.9.4` were pinned; `npm ci` passed with 887 packages, then `tsc --build packages/engine packages/presentation apps/game` passed. The following original assertions were run unchanged:

```sh
node --test --test-concurrency=1 packages/presentation/test/board-play.test.mjs apps/game/test/board-hidden-page.test.mjs apps/game/test/comic-motion.test.mjs apps/game/test/board-scenarios.test.mjs
npm run check:exclusion --workspace @mothership/game
```

**19/19 tests passed**, zero failed/skipped/cancelled/todo. Production exclusion passed: 54 reachable modules, 167 files scanned, 37 development files labeled; no fixture/test/development module or marker found. Passing existing tests does not cover the two new P2 cases above. The updated document inventory/link check passed for all 14 action/command rows, 20 cue classifications and 37 immutable source paths/line bounds; staged whitespace validation was also clean. Temporary read-only probes `/private/tmp/gamen-pr92-stale-marks-probe.mjs` and `/private/tmp/gamen-pr92-motion-probes.mjs` both exited 0 while reproducing those defects and the distinct Designer findings. The latter also checks the pre-existing quote mismatches; it is not the full phone checker.

GitHub metadata confirmed green CI for the original PR #90 head `e6a70ca` and separate PR #91 head `1051cca`; PR #92's exact `aa007890` CI was still in progress at this follow-up readback. Those are status readbacks, not new cloud/runtime acceptance. No browser/device measurements, capture/emulator rerun, full Frontend/Balance suite, deployment, IAM operation, merge or canonical/contract expansion was performed. The two consumer corrections belong to Frontend; proposed visual treatments and open DSN decisions retain their existing review gates.

## Pinned source references

[actions]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/presentation/src/model/actions.ts#L9
[commands]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/contracts/src/full-game.ts#L9
[gates]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/engine/src/full-game/lifecycle.ts#L147
[submit]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/services/game-api/src/full-game.ts#L891
[resolution]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/engine/src/full-game/lifecycle.ts#L81
[public]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/contracts/src/full-game.ts#L44
[events]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/contracts/src/full-game.ts#L101
[writer]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/services/game-api/src/full-game.ts#L210
[projection]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/engine/src/full-game/lifecycle.ts#L277
[ack-contract]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/contracts/src/own-acknowledgments.ts#L7
[session-contract]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/contracts/src/own-acknowledgments.ts#L39
[ack-projection]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/engine/src/full-game/own-acknowledgments.ts#L6
[card]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/packages/presentation/src/markup/comic-shell.ts#L189
[feeds]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/apps/game/src/connected/comic-feeds.ts#L79
[controller]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/apps/game/src/connected/action-flow.ts#L368
[transport]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/apps/game/src/connected/paths.ts#L16
[motion]: https://github.com/Amirkianfar66/GameN/blob/94a49ce0c5220b814ec56333b028fbe6180b257e/apps/game/hosted/comic-motion.mjs#L8
[designer-cues]: https://github.com/Amirkianfar66/GameN/blob/e652bbf90f99b8aa616223c46f8ac8ff510cea03/design/board-motion/contract/cues.json
[designer-coverage]: https://github.com/Amirkianfar66/GameN/blob/e652bbf90f99b8aa616223c46f8ac8ff510cea03/design/board-motion/contract/coverage.json#L107
[drop]: https://github.com/Amirkianfar66/GameN/blob/e652bbf90f99b8aa616223c46f8ac8ff510cea03/design/board-motion/js/app.js#L169
[visibility]: https://github.com/Amirkianfar66/GameN/blob/e652bbf90f99b8aa616223c46f8ac8ff510cea03/design/board-motion/js/app.js#L543
[board-cues]: https://github.com/Amirkianfar66/GameN/blob/e652bbf90f99b8aa616223c46f8ac8ff510cea03/design/board-motion/js/app.js#L263
[fixtures]: https://github.com/Amirkianfar66/GameN/blob/e652bbf90f99b8aa616223c46f8ac8ff510cea03/design/board-motion/js/fixtures.js#L43
[fixture-guard]: https://github.com/Amirkianfar66/GameN/blob/e652bbf90f99b8aa616223c46f8ac8ff510cea03/design/tools/board-motion-check.mjs#L254
[designer-verification]: https://github.com/Amirkianfar66/GameN/blob/e652bbf90f99b8aa616223c46f8ac8ff510cea03/docs/design/board-motion-verification.md

[consumer-hide]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/packages/presentation/src/model/connected-player.ts#L324
[consumer-render]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/packages/presentation/src/markup/comic-shell.ts#L261
[consumer-strip]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/apps/game/hosted/strip-cues.mjs#L18
[consumer-facts]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/apps/game/hosted/comic-motion.mjs#L33
[consumer-ack]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/packages/presentation/src/markup/comic-shell.ts#L310
[consumer-hidden-tests]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/packages/presentation/test/board-play.test.mjs#L153
[consumer-controller-tests]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/apps/game/test/board-hidden-page.test.mjs#L42
[consumer-scenarios]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/apps/game/test/board-scenarios.test.mjs#L31
[consumer-marks]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/packages/presentation/src/model/connected-player.ts#L242
[consumer-doc]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/docs/frontend/board-play.md#L47
[consumer-motion-after]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/apps/game/hosted/comic-motion.mjs#L173
[consumer-css]: https://github.com/Amirkianfar66/GameN/blob/aa007890c5bf8f4801bfb545c0f6da0426f7d6cd/apps/game/hosted/board-play.css#L732
