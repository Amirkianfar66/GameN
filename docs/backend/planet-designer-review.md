# Planet engine follow-up to Designer review

Historical review at the source below. Its pending R1 status is superseded by the owner-approved P27 [server presentation stage](planet-sync-presentation.md); the original evidence and other review dispositions remain recorded here.

Follow-up starting SHA: `34bf02f812e003afbadd80d42daddbba5a835120`; branch `codex/backend-planet-engine`. Integration's 5 November 2026 handoff identifies design-only PR #174 at `db49cea2cbafa0c11743555ff9111d93a0827e91`, stacked on #161. That handoff reports its CI/hash review; Backend did not independently rerun the design checks or adopt those assets.

Rule authority remains the [final owner decisions](../specifications/planet-successor/owner-decisions.md), especially resolution order and P04/P06/P23/P24, plus the [motion requirements](../specifications/planet-successor/motion-requirements.md). The design catalogue cannot change phase timing, placement or Promise outcomes. No runtime/shared-contract/rule/asset/default change is introduced by this follow-up.

## Review dispositions

| Request | Current disposition and evidence |
| --- | --- |
| R1: Blackhole film and vote availability | **Pending owner decision.** Existing authority Syncs and opens a full 60-second Jail vote immediately (`lifecycle.ts`, `syncAndVote`; `PLANET_PHASE_DURATIONS.JAIL_VOTE`). The reported 5.2-second display cut and 2.4-second phone band cannot cover board-targeted voting. Integration has asked the owner about a fixed six-second server presentation phase followed by the full vote; this is not approved or implemented. No local pause or shortened vote is permitted under current rules. Approval would require a coordinated authority/schema/version/deadline change with Integration before consumer adoption. |
| R2: fallback | Per Integration's handoff, use the existing board-only capsule exit rather than a fullscreen overlay over the next phase. The engine supplies the authorized occurrence and current board; animation completion does not control authority or deadlines. This is a consumer handoff, not a claim that Frontend mounting was tested here. |
| R3: healed placement | Healthy/free rescued Hospital patients return to their remembered A/B room, using the other ordinary room if full; `lastRoom` records the destination actually used. Healed detainees return to Jail. `physical.ts` allocates final placement before sealing clinical events, and the projector copies actual seats. Consumers render the current authoritative snapshot. A clinical anchor identifies a safe historical treatment vignette; it does not relocate the current token into Hospital, create a fifth bed or block the next phase. |
| R6: Promise timing | Retain each card's actual opportunity below. The catalogue suggestion to finalize every Promise at voting start is not adopted. Records and results remain pair-private; accepted lifetime quotas survive Sync. |
| Rescue MP4 | Integration reported a background dropout at 3.1 seconds and placed the Frontend adoption on hold. The Designer asset correction remains separate. Backend has not rendered or accepted that MP4. |

## Promise checkpoints

| Card | Authoritative checkpoint |
| --- | --- |
| Meet in A / Meet in B | After selecting the complete world and Sync, at Jail voting start. Never from a speculative board. |
| Jail Vote / No Jail Vote | Actual Jail ballot closure, using the giver's recorded ballot and voter eligibility. Full-Jail admission failure does not rewrite the ballot. Eligible abstention differs from a power preventing participation. |
| Captain Support | At completion of the specified upcoming election, including every relevant runoff ballot. Recipient never a candidate gives Condition not met. |
| Officer Selection | If the giver loses the specified election, Condition not met. If they win, await the actual appointment, including its authoritative timeout outcome. |
| Missing opportunities | Same-round cards fall back at round end; only future-election cards may remain pending for a later election until match end. Existing finalized results remain unchanged. |

These callbacks are distinct in `lifecycle.ts` and `social.ts`: MEETING, JAIL, ELECTION, APPOINTMENT, ROUND_END and MATCH_END. No frontend film/catalogue event may manufacture or advance a status.

## Focused regression work

Test commit: `3ce69be75abe072b2d24e16c8cb7dbca5d14848c`. Runtime source remains byte-identical to the implementation tested at `d12689d3a9bc975552aafbf628688bfe6d993f4f`.

- Strengthened the existing three native 7/8/9 Sync histories: a meeting card settles after selected-world Sync while the reciprocal Jail card remains Pending; a vote is accepted at phase start and at the final millisecond, refused at the deadline, and the Jail card settles only on actual ballot closure. Full recorded replay is exact.
- Added three native 7/8/9 accepted election-Promise histories. Reciprocal Captain Support and Officer Selection remain Pending through Jail voting; a positive tied election leads to a same-election runoff; support settles only when the election completes, and selection settles only after Captain actually appoints Officer. The histories check pair-only projections, immutable quotas/results through the next round and exact replay.
- Added twelve constructed Hospital-Rescue controls: previous A/B room with space versus full, separately for 7/8/9 players. They assert expected room/slot/remembered room, cleared medical state, unchanged other placements and clinical/placement events consistent with the final snapshot. Existing detained-to-Jail controls remain included. These module controls do not claim native service/setup execution.

Actual verification using Node `22.21.1` / npm `10.9.4` at the exact frozen test source committed as `3ce69be75abe072b2d24e16c8cb7dbca5d14848c`:

| Check | Result |
| --- | --- |
| `npm run build` | Passed |
| Focused engine tests below | **156 passed**, zero failures/cancellations/skips/todo; 59,789.941125 ms |
| Runtime/shared-schema/rule/service/infra/frontend source comparison against `d12689d3a9bc975552aafbf628688bfe6d993f4f` | Byte-unchanged |
| `git diff --check` | Passed |

The focused command was `node --test packages/engine/test/planet-opportunities.test.mjs packages/engine/test/planet-physical.test.mjs packages/engine/test/planet-social.test.mjs packages/engine/test/planet-election-promises.test.mjs`: 7 opportunity cases, 105 physical controls, 41 social controls and 3 election histories. Logs: `/private/tmp/gamen-planet-designer-followup-build.log` and `/private/tmp/gamen-planet-designer-followup-tests.log`.

## Version impact and remaining work

No behavior version change: protocol `3`, engine `planet-game-1.0.0`, ruleset `in-person-planet-2026-11-05`, source SHA-256 `32cde63d777ed93744637f911c134247272dc862524bd5aa9d0c3cd405dbe8ea`. The previously executed complete 1,264-case engine run and other results remain tied to their exact source in [the verification checkpoint](planet-successor-verification.md); this follow-up does not relabel that run as testing new cases.

R1's proposed six-second presentation phase awaits the owner's answer and coordinated versioned implementation. Frontend/Designer own film correction, mounting, actual current-placement rendering, nonblocking fallback and browser/device acceptance. Integration owns service persistence/deadline delivery and the combined release gate. Those checks were not run in this Backend follow-up. No cloud, deployment, merge, profile activation or new public field occurred.
