# Fixed Blackout and frozen room defense — inactive 1.9 candidate

Actual implementation starting SHA: `eb94f9d2702fbe0c50db2266019e494736d3a762` on `codex/backend-blackout`, after registering the managed `backend-blackout` worktree originally created at `8f61353e23e36264ec270d9c8bcfd5b531775a4f`. Reviewed Captain fixes fast-forwarded the branch to final parent `d66515706fe5f544114ccc1aa885af3d304d2f8c`. All local work was preserved, including the named scoped stash of three already-committed historical tooling copies. Primary checkout and historical source/art bytes remain unchanged.

Issue #148 implements closed owner G-01/G-04 from the exact source archive in `d021584d1032b3f1c37f050ef2a1fdd50760bc9b`. Integration reserved 1.9 on #139; direct owner completion authority is separately recorded from the historical documentation-only archive. The exact parent is Captain/medical 1.8, with Clone following separately in 1.10.

| Pin | Exact value |
| --- | --- |
| Protocol | `2` |
| Engine | `full-game-1.9.0` |
| Ruleset | `in-person-v1-blackout-2026-10-14` |
| Overlay SHA-256 | `7784630d4e6a51f7a8e6c89873dfab479b5281f10ddbcb4918503525096ed7a0` |
| Parent ruleset SHA-256 | `0f84f61cf9407c45ccef7e99c28556d7ede64f06f7dd3284ca6782bbf7a5f030` |

## Commands, public clock and private slot selection

Every normal round opens `BLACKOUT` after Jail voting and its full five-second result. The common phase lasts exactly 15 seconds: five lit followed by ten dark, even without any admitted request. No move, early resolution or actor/faction/count cue is exposed. The required new-only public field is `blackout:null|{snapshotId,layoutRevision:'board-v2-0.1.1',darkStartsAt}`; `phase.endsAt` remains the single authoritative endpoint. Historical tuples omit the field and reject this phase.

A Healthy/free Disabler on its own ordinary turn registers targetless `{type:'REQUEST_BLACKOUT'}`, reserving Main Action without spending its lifetime use. Ordinary independent Shot/Hack and permitted movement retain their existing costs. At window admission, ineligible requesters are canceled without lifetime spending; eligible requesters bind their current room. The engine freezes physical occupant identities, health and slots, including retained bodies. Off-board seats are absent. Empty/self/body slots are still neutral selectable positions.

Required new-only `self.blackoutTargeting` is null except for the admitted actor. Its object contains `{snapshotId,room,slotIds,darkStartsAt,endsAt,selectedSlotId}`. It contains logical positions only, never an occupant mapping. `legalTargets.REQUEST_BLACKOUT/SELECT_BLACKOUT_SLOT=[self.seatId]` signals targetless availability. A selection intent is `{type:'SELECT_BLACKOUT_SLOT',snapshotId,room,slotId}` inside the existing authenticated envelope. Exact current snapshot/room/slot and half-open `[darkStartsAt,endsAt)` are checked server-side. First valid selection locks and spends once; wrong/stale input rejects without spending. A timeout at the complete window end spends once. A selected empty/self/dead-snapshot slot is a consuming miss, with no replacement or self-hit.

All valid final target bindings are collected before any attack. Both valid same-slot strikes remain, then resolve at each stored actor's Main position before its Shot. Actor status changes do not cancel admitted attacks. Actual target health/Protection is rechecked at effect time; earlier elimination causes no redirect/refund. Command Room immunity remains. Legacy targeted `DISABLE` remains exact through 1.8 and is rejected in commands and restored queues for 1.9.

Integration confirmed that R5 Code keeps its existing anytime eligibility and original identity set during Blackout. It does not shorten the window or trigger early victory. Frontend uses the reviewed private numeric original-identity input while public figures/names are hidden; no slot-to-identity hints are restored.

## Frozen generic defense delivery

For a real Protection block, `ATTACK_BLOCKED:{phaseId,round,seatId,location,slotId}` is delivered only to seat audiences physically in the target's actual room immediately before the effect, including the target and any retained body. Recipients are frozen privately and never transmitted or recomputed later. Off-board seats, later entrants, outsiders, nonparticipating host and shared display receive none. Events have opaque audience-specific IDs and common checkpoint publication/expiry timing, use the inherited 30-second technical freshness bound and canonical subject publication, and expose no cause, attacker, grantor, hidden role or resource count. There is no public variant. Clinical/Captain event schemas and presentation-only HV anchors remain exact.

The practice bot chooses from its own authorized neutral slots. The service prevents a durable premature receipt before the dark boundary. The existing private engine write trigger waits at most five seconds using only the exact public clock, then revalidates the committed state; the full 15-second deadline remains unchanged. This is a practice heuristic, not independent Balance or social-deduction evidence.

## Actual verification and remaining adoption

Focused pure checks: 96/96 passed (91 engine histories/guards, four strict contract cases and one bot-boundary control), zero failures/skips. The direct-DISABLE restored-queue guard was demonstrated red in all 7/8/9 modes before its fix (88 passing, three failing), then green. Isolated Auth/Firestore: 49/49 passed, including three complete native admission/joint-draw/staged setups and 46 legal synthetic initial SETUP histories followed by service decisions. Cases cover concurrency, last valid lock, retry/conflict/restart/receipt lookup, cancellation/reuse, fixed timing, same-slot dual strikes, Protection/Rescue, generic audiences, canonical publication, R5 Code and exact 1.8 compatibility. Constructed unreachable body/observer cases are labeled; native histories place bodies in Hospital or off-board.

Strict pure/browser typechecks and all 2,217 workspace regressions passed: 128 bootstrap/contract, 788 engine, 241 Backend, 140 tooling, 204 presentation, 472 game and 244 design. Zero failures/skips. Real-time Functions acceptance and exact-head full verification/CI results are recorded in the PR once run; the preceding service evidence does not claim automatic Tasks or HTTP creation of this inactive tuple. Independent Claude Balance on #133, affected Frontend adoption and common-art pairing remain separate integration gates. Frontend supplied the minimal exhaustive `BLACKOUT:'Blackout'` copy hunk. The historical 0.3 art checker recognizes successor action namespaces without crediting them as historical art coverage.

No existing match, historical 1.0–1.8 tuple/replay, default creation profile, immutable art pin, cloud configuration, IAM, billing, deployment or merge is changed.
