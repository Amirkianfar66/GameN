# Food test 1: first native run against Backend 984

**This run failed during the seven-player PANEL task. Eight and nine players were not run.** Ready passed through the visible native control; successful delivery, common return and an ordinary meal remain unverified by this run. The original failure files are preserved without editing.

The clean browser build/driver source was `c236e1539a0b7f4c1cb963bfa74ec39bb759aa78`. Its 30 native render/host files still matched Designer-approved `f34a8c876ab8f3f5265ad48a05f116de9dec80c9`. The local API was clean Backend `984f1b213f195239fb8093b8c0feaff7e7bbc80f`, using the [official handoff](https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-6869048382). All ten compiled module hashes matched before and after the run. Target: protocol 3 / `planet-game-1.4.0` / `in-person-planet-food-task-2026-11-12` / ruleset `7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333` / design 0.9.0 / tokens 0.5.0. No rule, clock, default or deployment change.

## Observed behavior

- Normal host creation, human/display admissions, authoritative partner workers, Setup, private invitation and visible Join reached the human's PANEL task. The authorized task's common return interval was 32,500 ms.
- At 390 × 844 / 100% text, Ready was visible, enabled and the exact hit target. There were zero Ready request starts immediately before the physical touch, exactly one afterward, and the original HTTP 200 / `ok:true` response arrived in 46 ms. The phone then entered boarding. No direct Ready operation, hidden click or retry was used.
- Four physical PANEL inputs received accepted / `APPLIED` original receipts: RELEASE 233 ms, LOCK 1,256 ms, RELEASE 268 ms and LOCK 187 ms. These are HTTP/JSON completion times, not claims about server admission latency.
- A later call to the Node-only own-view policy failed `FoodTaskPlayerViewSchema` with `Press offer belongs to own Task control`. The process stopped at that error. The captured data does not establish whether the cause is a projection, model or driver inconsistency; investigation is separate from this preserved result.
- The trace also contains a completed Food heartbeat taking 8,840 ms with `NOT_ALLOWED`, and the last recorded task model is stale with the visible control disabled. No cause is inferred from those observations.
- The generated match was aborted normally after the failure (`cleanupAbortOk:true`). Browser, driver and preview workers stopped. No next-count match was created.

The driver threw before its final browser-event assertion, so the empty top-level `errors` array is **not** evidence of zero browser exceptions. This was desktop Chromium against local Auth/HTTP/Functions/Tasks with real server time: no seeded history, injected clock, manual phase advance or private-state read. It is not device, Safari, VoiceOver or real-network validation.

## Preserved evidence

- [Compact facts and exact Ready guard](evidence/food-supply-native-first-984-2026-11-14/summary.json)
- [Unedited result, invocation/completion streams and UI responsiveness trace](evidence/food-supply-native-first-984-2026-11-14/result.json)
- [Original process log](evidence/food-supply-native-first-984-2026-11-14/run.txt)
- [Preflight](evidence/food-supply-native-first-984-2026-11-14/backend-preflight.json) and [postflight](evidence/food-supply-native-first-984-2026-11-14/backend-postflight.json)
- [Initial PANEL screen](evidence/food-supply-native-first-984-2026-11-14/task-7-panel.png), [failure phone](evidence/food-supply-native-first-984-2026-11-14/failure-7.png) and [failure public display](evidence/food-supply-native-first-984-2026-11-14/failure-display-7.png)

This publication changes evidence only. Designer's [f34 visual acceptance](https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-6867067841) remains scoped to its exact native inputs; it does not approve this connected result. The separately reviewed recovery-to-KEY/reload defect needs a narrow native correction, refreshed pins and affected-state visual approval before merge. The complete native connected 7/8/9 release gate is still open.
