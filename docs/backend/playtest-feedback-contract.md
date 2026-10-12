# Backend contract proposal for #119 and #120

Status: proposal for affected Frontend/Integration review before consumer adoption. Canonical owner decisions are approved in issues #119/#120 on 12 October 2026; the contract and precise checkpoint interpretation below require integration review.

Exact input base: `abb6839524b6dc3e5225e600f2f067c3fa3f9501`. Vote branch: `codex/backend-vote-results`, worktree `/Users/amirkianfar/.codex/worktrees/backend-vote-results/GameN`. Earlier Backend work/PRs remain preserved.

## Versions and independent review

Protocol remains `2`: commands keep the existing strict protocol/match/phase/command envelope. New phase kinds and optional projection fields are accepted only with exact approved behavior tuples; existing live kinds retain exactly 60,000 ms. Frontend must adopt the schema before new matches are activated.

Allocate `full-game-1.4.0` / `in-person-v1-vote-results-2026-10-12` for #119; its immutable overlay will be hashed after recording this checkpoint interpretation. Allocate `full-game-1.5.0` / `in-person-v1-declared-hack-2026-10-12` for #120, inheriting vote results through its pinned parent overlay. #120 is a separate stacked branch/PR and commit set. Four historical tuples (1.3, 1.2, Pass 1.1 and pre-Pass 1.0.1) stay exactly supported. No creation, deal, assignment, running-state, receipt, replay or art pin is migrated.

Integration must allocate a compatible immutable manifest for ordinary clients before activation; reuse existing art bytes and independently preserve old match asset pins. Backend will not mutate an old published art manifest or change cloud release configuration.

## Vote results

Every actual completed `CAPTAIN_ELECTION` (including each runoff), `RELEASE_VOTE` and `JAIL_VOTE` opens `VOTE_RESULT`. `phase.startedAt` is authoritative closure time and `endsAt = startedAt + 5000`. The next phase starts at its actual server transition time and receives its full duration, including when delivery is late. Skipped/no-candidate voting has no fabricated result; actual all-abstain voting does.

New current-only public/participant field `voteResult` is null outside this phase and omitted entirely by historical projections. When active it contains: `id` (the result phase ID), `votePhaseId` (the closed vote ID), `round`, `kind`, `startedAt`, `endsAt`, `outcome`, `tiedSeatIds`, plus the existing authorized aggregate tally fields `counts`, `eligibleVoterCount`, `yesCount`, `selectedSeatId`, `released`. Outcomes are `CAPTAIN_ELECTED`, `RUNOFF_REQUIRED`, `NO_CAPTAIN_ELECTED`, `PLAYER_JAILED`, `NO_JAIL_SELECTION`, `PLAYER_RELEASED`, `RELEASE_DENIED`. Positive top ties in both election and Jail results have explicit sorted `tiedSeatIds`; abstention and a unique below-threshold Jail leader have none. `lastTally` remains the existing aggregate compatibility field. No voter identities/individual ballots are published.

At closure, tally once and apply only the vote-specific outcome: Captain election/Command placement, release/forced placement, or Jail placement. Clear ballot input/eligibility and store a private continuation. During `VOTE_RESULT`, all gameplay commands and Code input are rejected; no movement/Scan/Hack/vote offers are emitted. Host abort remains available.

At its deadline, continue once: elected/no-selection Captain -> full ordinary turn; positive tie -> full runoff vote; release result -> full Jail vote; Jail result -> registered attacks/actions, Rescue, R3 Supplier, placement/reveals, victory, then next round/election/showdown. In Round 5 this barrier precedes terminal role/Code reveal, with no extra Code-submission window and no double resolution. Existing registered action order and effect authority stay unchanged.

## Declared-side Hack

After ordinary expiry or accepted Pass with a pending Hack, the new tuple opens `HACK_DECLARE` for at most 15000 ms. The fixed target may send `{ type: 'DECLARE_HACK_SIDE', declaredSide: 'Blue' | 'Red' | 'Alien' }` through the existing command envelope. The explicit private legal offer is `legalTargets.DECLARE_HACK_SIDE = [selfSeatId]` only for that current fixed target. All three choices are uniform. Server identity/active exchange determines the sender; the command carries no client-supplied target/faction/role. The first accepted declaration ends this phase early and opens `HACK_RESULT` for exactly 5000 ms. If its deadline expires without acceptance, result status is `NO_DECLARATION` and the UI says “No side declared”. This never fabricates a side. Bot targets automatically submit their own authorized faction through this same command/receipt path; no role inferred from another player's view.

Normal-role declarations must equal the target's own faction; Undercover and Alien may choose any of the three. Expose all three choices uniformly to the target; no role-dependent allowed-side list, truth flag or verification badge. Invalid or non-target submissions receive existing generic `NOT_ALLOWED`; duplicate IDs recover receipts, conflicting IDs cannot overwrite a settled declaration. Fixed exchange ID is the original declaration phase ID.

`hackFeedback` exists only in `FullPlayerView`, is null for uninvolved players, and never enters `publicFacts`, host/display views, public events, assets or public history. For the two participants during the active exchange it contains `hackId`, `round`, `status` (`AWAITING_DECLARATION`, `DECLARED`, `NO_DECLARATION`) and nullable `declaredSide`. Before acceptance it contains no claimed side. `hackPartnerSeatId` remains the existing private association. Status `DECLARED` means a claim, never app-verified truth. At `HACK_RESULT` expiry, open existing `HACK` with a full 60000 ms. Clear live feedback/partner on conversation end or abort; retain server-only journal evidence for exact replay and existing private receipt recovery. No generic chat or public claim history.

The public vote-result window blocks all gameplay. The private Hack prelude permits existing once-per-round before-voting movement and the declaration only; it adds no Code-input time. The existing full-talk Hack movement behavior remains unchanged. Ordinary/Pass sequencing, legal same-room target registration, no-self targeting, initiation lifetime limit, per-round limit, same-round embargo and final-round embargo remain unchanged. No Code input is added during either prelude. Public phase timing and initiator continue as existing public timing authority; fixed target/claim/role/truthfulness stay private.

Reconnect uses the current phase ID, authoritative deadlines, view revision and existing server-time/recovery mechanisms; receipts cannot resurrect an expired result. Duplicate/stale declaration, reconnect or task retries never restart committed windows; a first late valid repair starts the next full window at actual server transition time. Exact source/context timestamps and durable task IDs are recorded for replay. Consumer adoption and final combined manifest/runtime acceptance remain affected-role review gates.

## Required evidence

Contracts reject wrong/mixed versions, wrong durations and misplaced/private fields. Engine tests cover 4999/5000 and 14999/15000 boundaries, every vote/runoff/outcome, Round 5 terminal order, ordinary/Pass flow, early/no declaration, truthful/bluff declarations, all command blocking, bots, abort, replay and exact old tuples. Real Auth/Firestore cases cover concurrent declaration/deadline arbitration, receipts/conflicts, duplicate/late/repaired tasks, recovery/no browser, projections and unrelated-view bytes/writes. Verify root gates without dropping historical Balance or capacity suites. Report actual results and unrun limits separately; no deployment/merge/IAM change.
