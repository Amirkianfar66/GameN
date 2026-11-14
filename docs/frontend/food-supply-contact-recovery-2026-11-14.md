# Food test 1: contact recovery through KEY and reload

The native controller retained original Hold requests after a verified `RECOVERED_CLOSED` boundary. Its internal input gate ignored their temporary closure flags, but `pendingCount` still included them, so the renderer kept KEY disabled. Storage retained only the original requests, losing those closure flags on reload. An input never delivered to the server can have no individual receipt, so repeating receipt lookup did not resolve this state.

## Narrow correction

Only `apps/game/src/planet/food.ts` changes among the 30 native inputs approved at `f34a8c876ab8f3f5265ad48a05f116de9dec80c9`. After verifying the original recovery receipt, the controller retires covered Hold requests for the same phase, Food step, round, Task and control session, with sequence at or below the acknowledged boundary. Saving the remaining originals preserves the closure across reload. Late completions of retired requests are ignored.

No individual Hold acceptance or rejection is fabricated. Unknown inputs outside that boundary keep their original receipt recovery. Authentication, receipt correlation/time checks, independent causal UP and the prohibition on replaying abandoned DOWN remain in force. Renderer, layout, words, art and timing are unchanged. Earlier visual approval is exact-input approval; this native correction requires refreshed pins and Designer's review of the affected states before merge.

The target remains protocol 3 / `planet-game-1.4.0` / `in-person-planet-food-task-2026-11-12` / ruleset `7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333` / design 0.9.0 / tokens 0.5.0. No rule, creation-default, activation or deployment change.

## Verification status

Focused tests reproduce `pendingCount:2` after verified closure on the old compiled controller, where zero is required. New coverage follows never-delivered DOWN/UP through original receipt lookup, accepted recovery, an offered KEY, reload and KEY input. Boundary cases retain other Tasks/sessions, higher sequences, other phase/step/round contexts and non-Hold commands; rejected/mismatched recovery cannot clear them. A deferred-completion case checks that retired inputs do not return to pending state.

Compiled validation and native pending/recovered/reload captures at 390 × 844 and 320 × 568 / 200% text, normal/reduced motion, are pending the coordinated local test slot. They use an explicit synthetic transport boundary and an unchanged canonical landed packet, not a claim that those deliberately dropped taps produced that engine history. No device, Safari, VoiceOver, real-network or successful connected 7/8/9 result is claimed.

## Excluded connected-driver correction

The [preserved first native run on Backend 984](food-supply-native-first-984-2026-11-14.md) remains a failure. Its exact error-time clock was not captured, so its cause is still unclassified. Source inspection found the driver re-dated an old authorized projection using local estimated time, even when stale. A controlled diagnostic test shows this can turn a valid old offer into a schema-invalid offer after its deadline; it does not prove that was the preserved run's cause.

The driver now consumes the unchanged authorized projection, skips policy use while stale and uses local estimated time only for scheduling. It records actual stages plus bounded original-versus-rewritten validation and clock-relative predicate facts, including the precise facts if a future policy call throws. Raw private views, identity fields and command payloads are excluded from these observations. Both diagnostic tests passed. The slow heartbeat / `NOT_ALLOWED` observation remains a separate open investigation.
