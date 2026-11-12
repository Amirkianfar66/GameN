# Food Supply Task: owner decisions, 12 November 2026

Status: owner-confirmed rules recorded for the **inactive candidate**
`in-person-planet-food-task-2026-11-12`. Planned tuple: protocol `3`,
engine `planet-game-1.4.0`. This record implements no match behavior and
approves no production command schema, artwork port, creation default or deployment.

The owner requested an exact-head review of Designer PR #231 at
`4e329bbb31c916a4c722b8a5d2eb0de4182bb2eb` and said:

> I approved the click timings: a 0.1 s snap, a 0.4 s rest and the 0.15 s warning margin.

> I asked Designer to decide them, and Designer's recommendations are now my decisions.

The approved recommendations are the Food Supply step, eligibility/refusals,
next-round exclusion, common return, two doses per package and eating at turn end,
Blackhole/Sync/Clone boundaries, 15-second answer and 8-second disconnect grace.
The owner requested that Integration record them in this candidate after review,
and instructed Frontend to wait for contract acceptance before building the Task.

Evidence, pinned to the reviewed head:

- [Owner record](https://github.com/Amirkianfar66/GameN/blob/4e329bbb31c916a4c722b8a5d2eb0de4182bb2eb/docs/design/owner-decisions.md).
- [Playing the Task and remaining proposals](https://github.com/Amirkianfar66/GameN/blob/4e329bbb31c916a4c722b8a5d2eb0de4182bb2eb/docs/design/food-supply.md).
- [Designer response to the Integration review](https://github.com/Amirkianfar66/GameN/pull/231#issuecomment-6830762961).

The focused [overlay](../../../rules/overlays/planet-food-task-owner-decision-2026-11-12.json)
records these decisions as FOOD-01 through FOOD-18. The
[candidate authority](../../../rules/planet-successor-food-task-candidate-2026-11-12.json)
pins this record, the overlay, the exact design evidence and the unchanged
`planet-game-1.3.0` authority. Historical evidence remains historical: the withdrawn
one-Task-per-match limit, one-package-per-meal mistake and older smooth sweep do
not become rules through inheritance.

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

The server randomly assigns the Winch and Panel controls. Their ordinary
Raise/Lower and Release/Lock controls also cause hazards; there is no separate
attack button, arming step, confirmation or escape prompt. Task kills do not
spend an attack opportunity. Applicable existing Protection stops one lethal
press and is consumed; without it the safety catch stops a lethal press with
25% probability. Clone does not stop these hazards. Both successful catches
look identical to the participants and reveal no cause, grantor or role.

An unblocked hazard eliminates immediately, without Hospital admission. A survivor
can finish only from the correct platform position described in the approved
design; otherwise the Task is lost. The reference provides both operators a
kill-and-deliver path. Their relative difficulty has not been balance-validated.

The whole Task has 30 seconds, including briefing. The panel snaps in 100 ms,
rests for 400 ms, and warns 150 ms before danger. Lock selects the stop at rest
or the destination of the snap. Disconnect has an 8-second grace; the Task
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
Turn order determines shortage priority. No dose means hunger; at round end,
after Sync, retained hunger causes Injury/Hospital consequences in recorded
turn order under existing medical rules. Hunger is not an attack and bypasses
Protection and Clone. Four beds, permanent overflow elimination, detention,
retained Rescue and the full following-round medical deadline remain inherited;
this record introduces no fifth bed or automatic revival.

Stock is public in packages, including half-package decrements; warn at one
package or less. The server consumes doses, even if an eating animation never
plays. Task results precede PRE_TURN Blackhole activation and therefore all
branches inherit those deaths, spent Protection, delivery and participation.
Meals and hunger are reality-local: branches inherit current inventory without
refilling it; whole-reality Sync keeps only the selected inventory and hunger.
An inherited consumption remains consumed. Global does not mean publicly visible.

## What this approval does not settle

The pinned design still marks the four-second briefing allocation, swing
amplitudes/period/settling, collision-zone widths and raise/fall durations as
proposals. They affect play and must not silently become final rules. The common
32.5-second return is approved even though an earlier open-items row still calls
the 2.5-second ending proposal; that stale description cannot undo the latest
explicit common-return decision. No slower/accessibility timing mode is approved.

The server-received-time policy and command families are Integration directions,
not acceptance of the prototype's wire format or proof of network fairness.
The [readiness handoff](../../backend/food-task-candidate-2026-11-12.md) separates
remaining rule precision, contract work, runtime work and evidence. The Engine
Task is outside this candidate. Existing matches, art pins and setup flows keep
their saved versions.
