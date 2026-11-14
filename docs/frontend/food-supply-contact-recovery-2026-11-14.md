# Food test 1: contact recovery through KEY and reload

The native controller retained original Hold requests after a verified `RECOVERED_CLOSED` boundary. Its internal input gate ignored their temporary closure flags, but `pendingCount` still included them, so the renderer kept KEY disabled. Storage retained only the original requests, losing those closure flags on reload. An input never delivered to the server can have no individual receipt, so repeating receipt lookup did not resolve this state.

## Narrow correction

Only `apps/game/src/planet/food.ts` changes among the 30 native inputs approved at `f34a8c876ab8f3f5265ad48a05f116de9dec80c9`. After verifying the original recovery receipt, the controller retires covered Hold requests for the same phase, Food step, round, Task and control session, with sequence at or below the acknowledged boundary. Saving the remaining originals preserves the closure across reload. Late completions of retired requests are ignored.

No individual Hold acceptance or rejection is fabricated. Unknown inputs outside that boundary keep their original receipt recovery. Authentication, receipt correlation/time checks, independent causal UP and the prohibition on replaying abandoned DOWN remain in force. Renderer, layout, words, art and timing are unchanged. Earlier visual approval is exact-input approval; this native correction requires refreshed pins and Designer's review of the affected states before merge.

The target remains protocol 3 / `planet-game-1.4.0` / `in-person-planet-food-task-2026-11-12` / ruleset `7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333` / design 0.9.0 / tokens 0.5.0. No rule, creation-default, activation or deployment change.

## Verification status

Focused tests reproduce `pendingCount:2` after verified closure on the old compiled controller, where zero is required. New coverage follows never-delivered DOWN/UP through original receipt lookup, accepted recovery, an offered KEY, reload and KEY input. Boundary cases retain other Tasks/sessions, higher sequences, other phase/step/round contexts and non-Hold commands; rejected/mismatched recovery cannot clear them. A deferred-completion case checks that retired inputs do not return to pending state.

Clean build/capture source: **`952e7d9ca5766aa3e9514a362c86a3f91b20e0fa`**, with the unchanged runtime correction from `f0e1574d889fe5dd5d92f6e8d69b258f152cc645`. The only follow-up between those commits keeps the test rig's command IDs distinct across reloads. Controller source SHA256: `b47e15cf1357a3f32e9a0208a34a7e30fb138b09c7160678e71bc85366834333` (19,238 bytes).

- Own-worktree TypeScript build passed on Node 22.21.1.
- **44 focused checks passed**, covering the controller, Food session and driver diagnostics.
- **1,012 app/presentation regression checks passed.** The first attempt passed 1,004 and failed eight local HTTP harness tests because local-server access was denied; its log is preserved. With the required local-server permission, all 1,012 passed, with no product change between attempts.
- **Four focused native browser profiles / 12 PNGs passed**, at both owner sizes and both motion settings. Unknown recovery retained three pending originals and disabled KEY. The exact accepted recovery receipt retired the covered Hold originals, leaving zero pending; KEY enabled. Actual browser reload produced zero old receipt lookups and no replayed input. The subsequent physical KEY touch received an accepted / `APPLIED` synthetic receipt in every profile. Zero browser exceptions; the KEY control stayed whole in the viewport.
- **Four existing full-app smoke profiles / 12 PNGs passed**, covering touch, keyboard/assistive input, repeat suppression, independent causal UP, concealment/resume, settings, original-receipt-only aborted recovery and pending-Hold original-UP/no-fall. Zero browser exceptions.
- Production exclusion passed: 83 package modules / 2 production entries / 241 scanned files / 139 labeled development files. Full hosted-bundle registration and final combined CI remain Integration-owned.
- [Exact source equivalence](evidence/food-supply-contact-recovery-2026-11-14/recovery/source-equivalence.json) verifies all 30 closure rows, exactly one changed native path versus approved f34, all 201 captured build inputs unchanged after capture, all 14 Designer pins unchanged and all 37 static SVGs unchanged.

These browser checks use an explicit synthetic transport boundary and an unchanged canonical landed packet, not a claim that those deliberately dropped taps produced that engine history. No device, Safari, VoiceOver, real-network or successful connected 7/8/9 result is claimed. Designer's exact-input recheck is still required.

## Affected states for Designer

Changed/rechecked #223 ids: **actions, reconnecting, largest-text**. Food supplement: **food-winch-12** (landed KEY), **food-states-05** (landed state), plus the focused pending/recovered/reloaded interaction sequence below. Existing card, layout, words, art, stock and Task timing are unchanged. This packet requests review of the interaction state and resulting enablement only, not a new design exception.

| Profile | Original recovery unknown | Verified closure | Reload before KEY |
| --- | --- | --- | --- |
| 390 × 844 / 100%, normal | [pending](evidence/food-supply-contact-recovery-2026-11-14/recovery/390-844-text1-normal-pending.png) | [recovered](evidence/food-supply-contact-recovery-2026-11-14/recovery/390-844-text1-normal-recovered.png) | [reloaded](evidence/food-supply-contact-recovery-2026-11-14/recovery/390-844-text1-normal-reloaded.png) |
| 390 × 844 / 100%, reduced | [pending](evidence/food-supply-contact-recovery-2026-11-14/recovery/390-844-text1-reduced-pending.png) | [recovered](evidence/food-supply-contact-recovery-2026-11-14/recovery/390-844-text1-reduced-recovered.png) | [reloaded](evidence/food-supply-contact-recovery-2026-11-14/recovery/390-844-text1-reduced-reloaded.png) |
| 320 × 568 / 200%, normal | [pending](evidence/food-supply-contact-recovery-2026-11-14/recovery/320-568-text2-normal-pending.png) | [recovered](evidence/food-supply-contact-recovery-2026-11-14/recovery/320-568-text2-normal-recovered.png) | [reloaded](evidence/food-supply-contact-recovery-2026-11-14/recovery/320-568-text2-normal-reloaded.png) |
| 320 × 568 / 200%, reduced | [pending](evidence/food-supply-contact-recovery-2026-11-14/recovery/320-568-text2-reduced-pending.png) | [recovered](evidence/food-supply-contact-recovery-2026-11-14/recovery/320-568-text2-reduced-recovered.png) | [reloaded](evidence/food-supply-contact-recovery-2026-11-14/recovery/320-568-text2-reduced-reloaded.png) |

[Raw focused browser facts](evidence/food-supply-contact-recovery-2026-11-14/recovery/result.json), [full-app smoke facts](evidence/food-supply-contact-recovery-2026-11-14/app-smoke/result.json), [focused tests](evidence/food-supply-contact-recovery-2026-11-14/checks/focused.txt), [all regressions](evidence/food-supply-contact-recovery-2026-11-14/checks/regressions.txt), [preserved first local-server denial](evidence/food-supply-contact-recovery-2026-11-14/checks/regressions-local-server-denied.txt), [pre-fix reproduction](evidence/food-supply-contact-recovery-2026-11-14/checks/before-fix.txt) and [production exclusion](evidence/food-supply-contact-recovery-2026-11-14/checks/production-exclusion.txt).

## Excluded connected-driver correction

The [preserved first native run on Backend 984](food-supply-native-first-984-2026-11-14.md) remains a failure. Its exact error-time clock was not captured, so its cause is still unclassified. Source inspection found the driver re-dated an old authorized projection using local estimated time, even when stale. A controlled diagnostic test shows this can turn a valid old offer into a schema-invalid offer after its deadline; it does not prove that was the preserved run's cause.

The driver now consumes the unchanged authorized projection, skips policy use while stale and uses local estimated time only for scheduling. It records actual stages plus bounded original-versus-rewritten validation and clock-relative predicate facts, including the precise facts if a future policy call throws. Raw private views, identity fields and command payloads are excluded from these observations. Both diagnostic tests passed. The slow heartbeat / `NOT_ALLOWED` observation remains a separate open investigation.
