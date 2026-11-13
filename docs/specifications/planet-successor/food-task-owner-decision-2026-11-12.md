# Food Supply Task: owner decisions, 12–13 November 2026

Status: owner-confirmed rules recorded for the **inactive candidate**
`in-person-planet-food-task-2026-11-12`. Planned tuple: protocol `3`,
engine `planet-game-1.4.0`. This record implements no match behavior and
approves no production command schema, artwork port, creation default or deployment.

The owner first approved Designer's gameplay recommendations on 12 November.
On 13 November, after playing the practice, the owner requested a renewed review
of PR #231 at `9bb497948861521030c37a8d2c60a6318f1745c9` and confirmed:

> The Winch is now one Hold button: hold to keep the crate up, let go to drop it.

> A broken crate costs time, not food.

The panel timing is now **50 ms snap / 200 ms rest / 150 ms warning margin**.
An unblocked drop onto the Panel operator breaks the crate and loses the Task;
only the Panel's cut after landing can kill and still deliver. These decisions
supersede the previous 100/400 ms timing and the Winch's kill-and-deliver path.
They do not reopen the previously approved Food lifecycle or resources.

The approved recommendations are the Food Supply step, eligibility/refusals,
next-round exclusion, common return, two doses per package and eating at turn end,
Blackhole/Sync/Clone boundaries, 15-second answer and 8-second disconnect grace.
The owner requested that Integration record them in this candidate after review,
and instructed Frontend to wait for contract acceptance before building the Task.

Evidence, pinned to the reviewed head:

- [Owner record, including hunger and remaining timing approvals](https://github.com/Amirkianfar66/GameN/blob/9bb497948861521030c37a8d2c60a6318f1745c9/docs/design/owner-decisions.md).
- [Playing the Task and explicitly proposed Hold details](https://github.com/Amirkianfar66/GameN/blob/9bb497948861521030c37a8d2c60a6318f1745c9/docs/design/food-supply.md).
- [Original approved gameplay recommendations](https://github.com/Amirkianfar66/GameN/pull/231#issuecomment-6830762961).
- [Designer command-change note](https://github.com/Amirkianfar66/GameN/pull/231#issuecomment-6845979867). This note described intermediate head `fd2a237c`; its then-open drop-survival question is superseded by the owner's final decision at `9bb49794` and in the review request.

The focused [overlay](../../../rules/overlays/planet-food-task-owner-decision-2026-11-12.json)
records these decisions as FOOD-01 through FOOD-18. The
[candidate authority](../../../rules/planet-successor-food-task-candidate-2026-11-12.json)
pins this record, the overlay, the exact design evidence and the unchanged
`planet-game-1.3.0` authority. Historical evidence remains historical: the withdrawn
one-Task-per-match limit, one-package-per-meal mistake, older smooth sweep,
100/400 ms click and two-sided kill-and-deliver mechanic do not become current
rules through inheritance. The candidate keeps its original version allocation;
it has never been activated, so this revision migrates no existing matches.

## Approved sequence and mechanics

After any Captain election and before PRE_TURN, allow one Food Supply step per
round, with at most one started Task and no concurrency. Skip the step when fewer
than two players qualify. Asking lasts 30 seconds; a request submitted within
that window retains its full 15 seconds to answer. If no Task starts, close when
the asking window and any timely outstanding answer window have finished.
Ordinary turns, movement, shots, Hack, voting and Captain commands do not run in
this exclusive step. Task travel spends no voluntary movement.

Two living players outside Hospital/Jail may participate if neither participated
last round. One request may wait at a time; the first reaching the server wins.
Only the Volunteer and Partner receive the request and answer. Everyone else
sees only that someone is asking. Decline, no answer and withdrawal close that
request; the refused Volunteer cannot ask again that round but may be asked.
Another eligible Volunteer may ask while the original asking window remains open.
Refusal creates no next-round participation exclusion. Starting a Task records
both participants as ineligible for the next round's Food step, regardless of
delivery, loss or cancellation. There is no lifetime Food Task limit.

The server randomly assigns the Winch and Panel controls. The Winch has one
**Hold** control: finger down lifts/holds, finger up lets go. The reference calls
these inputs `raise` and `lower`; that is not approval of a production schema or
a separate Raise/Lower button pair. The Panel retains Release/Lock. Releasing in
a wrong place breaks the crate and puts a new crate at the intake; the operators
must fetch it within the remaining time. Breakage consumes no food and grants no
deadline extension. These ordinary controls also cause hazards; there is no
separate attack button, arming step, confirmation or escape prompt. Task kills do not
spend an attack opportunity. Applicable existing Protection stops one lethal
press and is consumed; without it the safety catch stops a lethal press with
25% probability. Clone does not stop these hazards. Both successful catches
look identical to the participants and reveal no cause, grantor or role.

An unblocked hazard eliminates immediately, without Hospital admission. An
unblocked crate drop onto the Panel operator breaks the crate and loses the
Task; the Winch cannot recover food after that kill. Only the Panel can kill and
still deliver: after the crate has landed, cut the Winch and turn the surviving
Panel operator's key. Other deaths without a valid delivery position lose the
Task. Both living operators turn their keys for ordinary delivery. This intended
asymmetry is approved; its effect on social deduction/balance needs human
multiplayer playtests. A protected or lucky stopped drop is still a stop, not an
unblocked kill; its later-approved brake continuation is identified separately below.

The whole Task has 30 seconds, including the approved four-second briefing. The
panel snaps in 50 ms, rests for 200 ms, and warns 150 ms before danger. Lock
selects the stop at rest or the destination of the snap. Also approved: 450 ms
lift, 300 ms fall, a 1,300 ms swing period and 2,200 ms settling time constant;
swing amplitudes of 0.9 stops after a lock, settling toward 0.38, and 0.25 after
a lift; landing half-widths of 0.3 stops at the platform and 0.42 at the console
and intake. The 2.5-second outcome allocation is inside the common 32.5-second
return. These numbers are gameplay choices, not a guaranteed network latency
budget. The owner approved no slower mode for now; participation can be declined
and accessibility can be revisited after playtesting. Disconnect has an 8-second grace; the Task
continues during grace, and an already-resolved death stands. Returning in grace
does not pause or reset the Task. Deliberate disconnect has no extra penalty.

Both participants return **32.5 seconds after Task start**, whatever the outcome,
to the places recorded at start. No outside transfer or movement intervenes.
A killed participant is shown Eliminated at the recorded place. Public absence
and return timing must not vary with early completion, death or cancellation.
Others do not receive the Supply Room, killer, hazard kind, Protection, private
refusals or a Task result message; they observe ordinary board status and food
stock. Accepted social deductions from who went and returned remain possible.

Stock starts at five packages; a delivery adds five. A package has two doses.
Each living player outside Hospital, including a prisoner, consumes one dose at
the end of their own ordinary turn, including Pass/timeout. Patients do not eat.
Turn order determines shortage priority. No dose means hunger. At round end,
**after Sync and the retained attacks/actions, before Rescue**, process retained
hunger in recorded turn order. A living Healthy hungry player becomes Injured
and enters Hospital under existing medical rules. A player already Injured or
Eliminated gets no additional consequence: do not extend an injury deadline or
apply another hit. Hunger is not an attack and bypasses Protection and Clone.
A newly hunger-injured player can receive Rescue from the next round, not through
a new same-round request after hunger resolution. An existing valid Rescue for
an already Injured patient remains governed by the inherited rules. Four beds,
permanent overflow elimination, detention and the full following-round rescue
deadline remain inherited; this record introduces no fifth bed or revival.

Stock is public in packages, including half-package decrements; warn at one
package or less. The server consumes doses, even if an eating animation never
plays. Task results precede PRE_TURN Blackhole activation and therefore all
branches inherit those deaths, spent Protection, delivery and participation.
Meals and hunger are reality-local: branches inherit current inventory without
refilling it; whole-reality Sync keeps only the selected inventory and hunger.
An inherited consumption remains consumed. Global does not mean publicly visible.

## Hold continuation adoption — 13 November 2026

After the reviewed candidate was prepared, the owner answered **“Adopt all four
practice behaviors (Recommended)”** in the Integration chat. The exact adoption
is recorded in [PR #233 comment 6849280539](https://github.com/Amirkianfar66/GameN/pull/233#issuecomment-6849280539).
This later decision supersedes the proposal labels at candidate `262f35a6` and
Designer `9bb49794`, without rewriting either historical commit:

- Releasing above the intake returns the crate intact instead of breaking it.
- Landing on the platform requires the Panel to be locked. A release over a
  moving platform breaks the crate under the ordinary breakage rule.
- A finger held before pickup is eligible automatically picks up the crate when
  the hook arrives and eligibility begins; no second press is required.
- A protected or lucky stopped drop leaves the crate on the safety brake until
  the next Hold takes it back. Both causes remain indistinguishable.

No owner gameplay question remains for these four continuations. The production
contract must still bind each Hold and release to its Task, server-issued control
session and gesture, and bind a crate generation once acquired. An unbound early
Hold and its release may name no crate yet. Closing that gesture must prevent
later pickup. The unsafe blanket stale-release exemption is not adopted.

The approved hunger order, timings and absence of a slower mode remain closed.
Contract review and implementation are still required before executable adoption;
this adoption alone activates no runtime, creation profile, artwork or deployment.

The proposed blanket exemption of `lower` from stale checks is a **technical
proposal**, not a gameplay approval. Integration must support release during an
unacknowledged Hold without accepting a release for a different Task, crate or
later gesture. Use durable gesture identity/order and idempotent receipts; an
up received before its down must prevent a late down from resurrecting the Hold.
Connection loss must not fabricate a successful release or change the approved
grace. The contract must specify how cancellation, pointer loss and recovery
interact with the accepted gesture and any actual release already received.

The server-received-time policy and command families are Integration directions,
not acceptance of the prototype's wire format or proof of network fairness.
The [readiness handoff](../../backend/food-task-candidate-2026-11-12.md) separates
remaining rule precision, contract work, runtime work and evidence. The Engine
Task is outside this candidate. Existing matches, art pins and setup flows keep
their saved versions.
