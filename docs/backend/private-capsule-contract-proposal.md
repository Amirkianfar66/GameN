# Private Capsule contract proposal — issue #139

Status: proposed for affected Frontend, Balance and Integration review before implementation. No runtime or shared schema change is adopted by this document.

## Exact starting point and authority

Branch `codex/backend-private-capsule`, clean starting SHA `37f573afca9023e8e4a92375375cea96638d120f` (released #137). Preserve that release, historical tuples, prepared deals, command receipts and journals. Authority: [issue #139](https://github.com/Amirkianfar66/GameN/issues/139), the final owner packet `b5b4ba2dea6063e20f559894183d0c675a3f754b2789db2e38c5b33e1590b743`, G-02 / Q-HK01–Q-HK03. Designer source baseline is `15e61f0bbd043930a578900862be9d5156b3b602`.

## Minimal shared boundary

Propose a new exact protocol-2 gameplay tuple: engine `full-game-1.6.0`, ruleset `in-person-v1-public-hack-2026-10-14`; bind its hash to a new immutable overlay after review. Do not change default creation pins or assign an art manifest in this Backend PR. Integration selects a reviewed compatible art/version pairing for new matches only.

Add one **new-tuple-only** required nullable field on public and every player view:

```ts
hackSession: null | {
  hackId: string;
  actorSeatId: SeatId;
  targetSeatId: SeatId;
}
```

Reuse current `phase.id`, `phase.kind`, `phase.startedAt`, `phase.endsAt` and `round` as the authoritative current stage and deadline. Reuse the declaration-phase identifier as stable `hackId`. Do not duplicate clocks or introduce a capsule location, return address, animation acknowledgment, exit phase, extra occupant or capsule command. Both participant IDs must be distinct roster members; actor must equal `activeSeatId`. A session exists only in `HACK_DECLARE`, `HACK_RESULT` and `HACK`, with `hackId === phase.id` only during declaration. It is null in all other phases, including termination. Public pair disclosure begins when the pending Hack opens after its ordinary turn, not at secret registration.

Preserve existing participant-private `hackPartnerSeatId` and required nullable `hackFeedback` unchanged: `{hackId, phaseId, round, status, declaredSide}`. Only actor and target receive feedback; all other player views receive null, and public/host/display views never contain claims or claim status. Validate that participant feedback IDs/round/partner agree with the public session. A claim remains a claim, including permitted bluffing and `NO_DECLARATION`; never derive true faction or truthfulness.

The exact old 1.0.1–1.5 tuples retain their previous projections and replay semantics, including absence of `hackSession` and the private 1.5 partner association. Reject unversioned/mixed tuples and extra fields in strict schemas.

## Timing, recovery and interaction

Reuse existing transitions: declaration up to 15 seconds (early valid input allowed), full 5-second private result, then full 60-second conversation. Walk-in belongs inside the result stage. A late valid deadline repair opens the next complete stage at committed server transition time. Duplicate, early or obsolete tasks cannot restart a committed clock. No client animation gates server progress. Exit is nonblocking and follows latest authoritative placement; do not cache departure rooms.

A recovered snapshot renders the settled current stage and remaining time. A terminal/new phase clears the session and private live feedback. Blur conceals claims while retaining command IDs/receipt recovery. Existing bot policy and ordinary gameplay eligibility remain unchanged. The capsule cannot change location, room capacity, immunity, legal targeting or movement consumption. In-person V1 introduces no microphone, voice, chat or recording transport.

Include the already-approved FINAL G-09 movement window in affected-role review for the new tuple: voluntary movement remains open during every current ordinary turn, including the final one, subject to existing eligibility and the server deadline. During Hack stages it remains open only if a later non-Eliminated seat still has an ordinary turn. The final ordinary turn ending by deadline or accepted Pass closes movement through its Hack, not at that turn's start. Captain election/voting does not open a player-turn movement window. Use the stored turn index/order and skip only Eliminated seats, since Injured/Jailed seats still receive turns. Preserve exact prior movement behavior on historical tuples. Keep Round 5 Code eligibility independent: final conversation can still offer Code under existing rules, while declaration/result cannot. This is the approved turn-stage rule, not a capsule-specific restriction; the slice still must not be represented as full final-spec adoption.

## Separate Board-v2 placement prerequisite

Authentic persistent Board-v2 positions need a separately reviewed tuple/contract and engine implementation. Proposed shape: new-tuple-only stored public logical `slotId`, with a pinned layout revision bound through the immutable manifest; no pixel coordinates or client allocator authority. Initial entrants use canonical player order and lowest free slots. Existing occupants/bodies keep slots; departures leave holes; moves and forced transfers allocate atomically, with approved player-number ordering. Keep existing starting `playerCount`; no duplicate roster field or medical detention boolean.

Final G-05/G-07 Hospital adoption includes roster-sized capacity 7/8/9, all Injured players in Hospital including detained patients, existing `jailed` retained, healed detainees returning to physical Jail, free healed returns to latest actual A/B plus fallback, injury episodes/death after following-round Rescue with R4/R5 exceptions, and showdown in actual rooms. A cap constant or ward drawing alone does not implement those rules. Jail detention capacity must count returning detained patients. Off-board EJECT representation and direct physical-Jail Captain targeting require their own reviewed schema/commands. Do not retain old remote release-ballot behavior while claiming final Captain rules.

Publish this prerequisite separately from the capsule disclosure PR. Neither pure art adoption nor this minimal capsule tuple may be described as complete Board-v2/final owner-spec delivery. Integration must inventory remaining Blackout, Clone, Captain, Hospital and event/audience dependencies before enabling the combined release.

## Required evidence and review

Frontend: confirm field naming, strict-reader/capability handling, participants mapped to original seats while art travels, latest-placement return, settled recovery, private blur, reduced motion and unchanged movement/targeting. Balance: review public pair/private claim split and 7/8/9 lifecycle, full 60 seconds, bots, last-turn cutoff boundary and unchanged gameplay. Designer owns capsule drawing/geometry, not shared contracts.

Backend verification after review: strict malformed/cross-session/legacy contract rejection; 7/8/9 engine histories with accepted and missing declarations, late/duplicate/stale deadlines, movement during conversation, termination, bots and replay; real Auth/Firestore receipt/claim privacy and timer races. Run relevant existing declared-Hack regressions and pinned toolchain checks. Report actual results separately from future connected/browser/device acceptance; no deployment or IAM changes by Backend.

## Actual proposal checkpoint verification

Pinned Node 22.21.1 / npm 10.9.4 `npm ci` passed (887 packages), and the unchanged released-source build passed. The focused existing declared-Hack, room-capacity and capacity-resolution engine suites passed **201/201**, with zero failures, skips or cancellations. These are baseline regression results, not acceptance of the proposed unimplemented public session or movement change. No new schema/runtime, emulator, browser/device, cloud or IAM acceptance is claimed.

Integration direction review is recorded on PR #140 comment 6166470070. Frontend and independent Claude Balance review requests are delivered; their acceptance remains pending at this checkpoint. The concrete Board-v2 prerequisite is [prepared separately](board-v2-authority-prerequisite.md).
