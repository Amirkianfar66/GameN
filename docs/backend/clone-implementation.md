# Alien Phantom Clone — inactive 1.10 candidate

Actual clean starting SHA: `f10ff876ae9c6d838332c01c7be112f15d6e796e` on `codex/backend-clone` in the isolated managed `backend-clone` worktree. Final parent Blackout #152 at `98f2c6a440b965d0cd4621ff9fae183229bbf9c3` was fast-forwarded without disturbing local Clone work; its actual real-time timer/bot acceptance passed 3/3 for 7/8/9. Primary checkout and prior local work remain preserved.

Issue #149 implements closed owner G-03/G-04, Q-C01/Q-C02d/e/f and Q-H03 from the exact archived sources in `d021584d1032b3f1c37f050ef2a1fdd50760bc9b`. Integration reserved 1.10 on #139. Direct owner completion authority is separately recorded from the original documentation-only source archive.

| Pin | Exact value |
| --- | --- |
| Protocol | `2` |
| Engine | `full-game-1.10.0` |
| Ruleset | `in-person-v1-clone-2026-10-14` |
| Overlay SHA-256 | `6168feb6931a8f590176521e3d2eb1cb9de800eec5171cdfd5b77b4d952e1234` |
| Parent ruleset SHA-256 | `7784630d4e6a51f7a8e6c89873dfab479b5281f10ddbcb4918503525096ed7a0` |

## Reviewed private contract

`{type:'ACTIVATE_CLONE'}` is targetless inside the existing authenticated command envelope. `legalTargets.ACTIVATE_CLONE=[self.seatId]` signals availability. Eligibility requires the Healthy/free Alien's own ordinary turn, unused Main Action and unused lifetime Clone. Acceptance activates immediately, spends both exactly once and grants no move, healing, reload or additional decision time. Ordinary Shot/Hack remain independent.

Frontend reviewed required new-only `self.cloneStatus:null|{used,activatedRound,expiresAfterRound,active}` and the `activate-clone` consumer kind. Non-Alien audiences receive null; only the Alien receives the original fixed use/expiry metadata. Historical tuples omit/reject the field and offer. There is no public activation, use, expiry, role-specific event or asset fetch. Private authoritative seats have corresponding strict new-only state; absence does not replenish a used effect.

Activation in normal round R lasts through the complete resolution of `min(R+1,5)`, including both normal rounds' attack batches regardless of turn order. Expiry occurs after medical processing and before the complete victory checkpoint. R5 activation covers its remaining normal resolution; no R6 or Clone in showdown. Original activation/expiry remain recorded after expiry, elimination and terminal cleanup. Later detention, injury, move, heal, reconnect or receipt retry never restarts or extends it.

## Defense and terminal behavior

Active Clone blocks each eligible normal ordinary Shot/Blackout before independently valid Undercover Protection. Repeated blocks leave Clone active and Protection unconsumed. Every actual block uses the same inherited generic `ATTACK_BLOCKED` fact, frozen actual-room audiences, common checkpoint publication and freshness rules. It discloses the affected character but no Clone/Protection cause, attacker, grantor, hidden role, private counters or activation. Snapshot state remains authoritative.

Voting, Hack, Scan, Rescue and Captain commands are unaffected. Captain EJECT and automatic Hospital death bypass both defenses; elimination immediately clears active Clone while retaining original metadata. Special showdown shots bypass Clone and consume applicable Protection normally; participants stay in actual rooms. Match completion/abort ends any remaining active effect without adding a round, animation acknowledgment or decision window.

## Verification and reachability

Strict pure/browser typechecks and build passed. Focused Clone engine/private-contract checks passed 97/97 (93 engine + four contracts); 45/45 isolated Auth/Firestore service cases passed, including three native complete admission/staged-setup cases and 42 legal synthetic initial SETUP histories followed by service decisions and complete journal replay. All 2,314 workspace regressions passed: 132 contracts/bootstrap, 881 engine, 241 Backend, 140 tooling, 204 presentation, 472 game and 244 design. Browser dependency/fixture exclusion and standalone backend package install passed. Zero skips/failures in these final runs.

The first engine run retained 15 failed native-fixture assumptions (unearned ammunition or an expected showdown despite a valid Blue win); only legal test histories/resources were corrected. Independent Backend source review identified a specialized private reader accepting malformed premature inactive Clone. That guard was shown red in all 7/8/9 (one passing, three failing strict controls), then aligned with the existing server guard. All 109 Clone engine and Captain/Blackout/Clone contract cases passed after the reader fix; service publication was rerun after it. Actual final service and exact-head CI status are recorded in the PR, without treating any pending run as passed. No remaining actionable finding from that bounded Backend source audit; it does not replace independent Claude Balance.

Native legal histories distinguish repeated attacks with Protection, post-activation imprisonment, Captain release/EJECT, complete following-round expiry and actual-room showdown. An active Clone plus a later injury/Hospital aging episode is not produced by the new normal attack paths: active Clone prevents those injuries, activation rejects Injured, and showdown begins after expiry. Semantic restored-state controls for later injury/automatic death therefore remain explicitly constructed fixtures rather than native-history claims. Unused/expired Alien injury and due death remain native reachable cases. Complete journals and receipt recovery must replay the exact original tuple and use chronology.

Independent Claude Balance #133, affected Frontend reader adoption and common-art pairing remain separate acceptance dependencies. Designer Clone/Captain/medical cinematics are not claimed delivered; neutral functional feedback is distinct from film acceptance. Historical art coverage remains exact; reserving the reviewed successor action name provides no art credit.

No historical 1.0–1.9 behavior, tuples, replay, default creation profile, prepared art pin, cloud/IAM/billing/deployment or merge changes. Integration owns final release/profile/Ready/art activation.
