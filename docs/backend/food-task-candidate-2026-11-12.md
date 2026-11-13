# Food Supply candidate: Integration review and build gate

Re-reviewed PR #231 at `9bb497948861521030c37a8d2c60a6318f1745c9`, based on
`8cbe5e896e2fa84f8d7c9df8da0b21cc9d55359d`, on 13 November 2026. This replaces
the review of `4e329bbb` for current adoption; the earlier review remains history.

**Verdict: accepted as a design reference, subject to exact-head CI completing.**
This accepts neither a runtime port of `design/food-supply/task.mjs` nor its
proposed wire format. The [owner record](../specifications/planet-successor/food-task-owner-decision-2026-11-12.md),
[overlay](../../rules/overlays/planet-food-task-owner-decision-2026-11-12.json)
and [candidate authority](../../rules/planet-successor-food-task-candidate-2026-11-12.json)
record the approved rules. Planned tuple: protocol 3 / planet-game-1.4.0 /
in-person-planet-food-task-2026-11-12. It remains an inactive candidate, with no
supported runtime registration, creation-default change or deployment.

## What changed and what passed review

- One Hold control replaces the Winch's separate Raise/Lower controls. A wrong
  release breaks the crate, requiring a replacement from the intake within the
  remaining time. Broken crates spend no food and grant no extra Task time.
- The approved panel timing is **50/200/150 ms** (snap/rest/warning), superseding
  100/400/150. The owner played the practice and expressly kept the faster panel.
- An unblocked drop onto the Panel operator breaks the crate and loses the Task.
  Only the Panel's cut after landing retains a kill-and-deliver path. Random
  assignment and the existing protected/lucky stops remain unchanged.
- The same owner record settles hunger after retained attacks/actions and before
  Rescue, with no added consequence for an already Injured or Eliminated player.
  New hunger injuries can receive Rescue from the next round. It also approves
  the remaining briefing, swing, landing-zone and lift/fall timing and no slower
  mode for now. These are no longer open questions.
- Designer fixed the previous private-refusal event-sequence leak: each audience
  now has its own event numbering. The design regression passes. Simultaneous
  keys no longer invalidate each other merely by changing the revision.

The practice's fixed-delay bots and passing design tests do not establish
real-network timing fairness, physical-phone access or multiplayer balance. The
owner's reported practice is acknowledged, rather than described as untested.
The reference's explicit new Hold proposals remain proposals: intact return at
the intake, locked-panel landing, an already-held finger automatically lifting
when eligible, and brake custody after a stopped drop. Their review does not
silently widen the owner's approval to every prototype default.

## Commands: accepted direction and remaining production work

Keep the families `TASK_ASK`, `TASK_ANSWER`, `TASK_ASK_WITHDRAW`, `TASK_PRESS`.
The design's `raise`/`lower` may describe Hold down/up inside `TASK_PRESS`; they
must not become two visible Winch buttons. `BROKEN`, `TAKEN`, `crate.holder`,
`broken[]` and the updated refusal reasons are participant-projection proposals,
subject to the final strict schema and the approved brake/continuation behavior.
The old `up` refusal is superseded by the new Hold states in the reference.

**Do not adopt a blanket "lower is never stale" rule.** Its goal is correct:
release must not wait for the Hold acknowledgement. Its implementation does not
identify which gesture or crate is being released. Focused reference probes at
this exact head show:

| Server arrival sequence | Reference result | Required production behavior |
| --- | --- | --- |
| Up at 4500 ms, down at 4600 ms, both made on revision 0 | Up is refused `down-already`; late down leaves the crate hanging although the finger is already off | Remember the gesture was released; its late down cannot start a Hold |
| Hold A and its release, then Hold B; a delayed separate-ID cancel for A arrives on revision 0 | The old input releases B's crate because all `lower` revisions bypass staleness | A release may affect only its own gesture/crate; it cannot release B |
| Retry A's release with its original command ID after B starts | Receipt is returned and B remains held | Preserve this idempotency while adding gesture identity |

Integration recommendation: bind down/up to an authenticated Task, control
session and gesture identity/order, with a crate generation once assigned. Store
an up-before-down closure durably. A matched up may be accepted despite a board
revision changing while down was in flight; it may not cross Task, gesture,
crate, participant, death or ended-state boundaries. Repeated up/cancel/retry
must have one result and one hazard roll. Do not backdate physical outcomes to a
client clock. This is a technical contract requirement, not another owner vote
on the Hold mechanic.

The practice uses one fixed one-way delay per run and therefore preserves
same-player message order. Its delayed-release test does not cover variable
latency/reordering. The new contract needs those cases and receipt recovery.
Connection loss alone must not invent a release; the approved eight-second
grace still runs. Define pointer cancellation, backgrounding and reconnection
against accepted input state. Never replay obsolete held inputs on recovery.

## Remaining gates before native Task construction

1. **Strict contract and permissions.** Authenticate seats, validate Task/request
   IDs, expected revisions, gesture identities and bounded payloads. The client
   never supplies authoritative time, assignment, RNG, Protection or outcomes.
   Store durable receipts and random results. Reject future/invalid revisions
   and non-finite timing. Frontend reviews example packets before construction.
2. **Lifecycle and scheduling.** Persist asking/answer deadlines, original seats,
   random assignment, active deadline, common return, authoritative presence,
   grace deadlines and terminal results. Serialize join/withdraw/expiry,
   death/delivery/cancellation and return. Resolve the earliest due boundary.
   Recommended equality policy: an interval is closed at its deadline. A late
   worker cannot authorize an expired press. Use durable deadline/outbox work;
   browser timers never advance authority or shorten another player's window.
3. **Projection and privacy.** Preserve audience-scoped cursors and identical
   Protection/luck stops, including metadata. Both participants see authorized
   crane effects; others get only approved absence, food stock and finalized
   board facts. An early private ending/death must not change the fixed public
   return boundary. Keep a pending input visually distinct from an accepted
   outcome. Ship-life food needs authoritative stock and turn-end evidence.
4. **Food, Sync and medical resolution.** Use integer doses and one meal per
   ordinary turn, including Pass/timeout; not per cinematic or Hack continuation.
   Task effects occur before forks. Meals, food and hunger follow the selected
   whole reality with inherited consumption intact. After retained attacks and
   actions, apply hunger in turn order before Rescue. Skip already Injured and
   Eliminated players; preserve valid existing Rescue, four-bed overflow,
   detention and the full following-round medical deadline. Do not create a
   same-round rescue opportunity for a newly hunger-injured patient. Handle dead
   office holders using existing succession rules without reopening Food Supply.
5. **Proposed Hold continuations.** The four gameplay details listed above need
   explicit adoption or correction before an executable rules hash incorporates
   them. Do not reopen the confirmed speed, asymmetry, hunger or timing choices.
   Cosmetic cues remain Designer's presentation work within approved disclosure.
6. **Access and version evidence.** Test real phones and variable connections,
   pointer cancellation, assistive input, two-party timing and reconnect. A
   150 ms warning is not a latency guarantee. No slower mode is currently
   approved; any later alternative needs a shared policy. Isolate all new state,
   commands and scheduling to new matches on the eventual accepted tuple.

Packets should cover Partner pending/decline, Task start, Hold down/up and
reordered inputs, broken/replacement crates, optional brake custody, normal
control updates, identical defensive stops, unknown receipts, cancellation,
death, early completion/common return, meals and finalized stock.

## Work after contract acceptance

- **Backend/Integration:** deterministic Task state and clocks, atomic food and
  Protection effects, durable receipts/scheduling, hunger/Sync integration and
  version isolation. Do not copy the design simulator into runtime unchanged.
- **Frontend:** build the pinned sheets against accepted packets, one Hold input
  with reliable release, server-anchored motion and recovery. Do not queue a
  second visible button, infer an outcome, or ship synthetic review videos.
- **Designer:** retain the approved visual flow, reconcile the identified Hold
  proposals with the final contract and review native comparisons in the PR.
- **Balance:** human playtest questions include Panel-only kill-and-deliver,
  repeated sabotage, access under latency, intentional disconnect, alternating
  eligible pairs and 7/8/9-player shortages. Nine meals consume 4.5 packages;
  after a missed first delivery only one dose remains before next round's Food
  step. A further miss can cause several injuries and four-bed overflow. That
  arithmetic is not evidence of balanced social deduction.

## Verification at the re-reviewed head

- Node 22.21.1: the existing Food design suite passed **28/28**, including Hold,
  breakage, drop loss, 50/200/150 timing, participant cursors, simultaneous keys,
  fixed-delay practice and export consistency.
- `node design/tools/food-supply-export.mjs --check`: up to date, no generated
  source changed. This is a read-only check of the handoff and still export.
- Inspected changed source, owner records and the recorded `phones-winch.png`
  and `large-text.png` sheets, including Hold/broken/brake and 320x568 at 200%
  text. No new browser/film renders or native visual approval are claimed.
- Focused synthetic calls reproduced the two ordering gaps and confirmed the
  same-command-ID retry remains safe, as documented above. These are production
  contract findings; the reference is explicitly design-only.
- Candidate checks passed: JSON parsing, three local source hashes and five
  exact-head design hashes, version/inactive fields and the four-file change
  boundary. All inherited files remain unchanged. Node 22.21.1 / npm 10.9.4;
  toolchain, workspace and source fences and `git diff --check` passed. These
  local checks are separate from Designer CI.
- No Food runtime, cloud/emulator integration, real-network/physical-phone or
  screen-reader test, new human multiplayer playtest, or full local verify was
  run. The owner's practice and remote CI are separate evidence.

Merging this reference or candidate alone neither enables Food in matches nor
approves a native artwork port or deployment.
