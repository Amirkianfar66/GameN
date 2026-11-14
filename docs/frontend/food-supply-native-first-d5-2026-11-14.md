# Food test 1: first native 7/8/9 packet on Backend d5

**The complete connected gate fails.** Seven players reached an authoritative `LOST / NOT_OVER_PLATFORM` outcome. Eight and nine players delivered and returned, then the driver timed out waiting for their ordinary Pass offer. No meal assertion ran. These are three preserved first attempts, with no retry or source change between them.

## Exact inputs and scope

- Clean Frontend build/driver: `14901c69afdfdc439d51343cf68541482f933a72`, with all 30 native inputs matching `952e7d9ca5766aa3e9514a362c86a3f91b20e0fa`. Designer [explicitly accepted that exact native/recovery packet](https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-6869904727). No new design request is needed.
- Clean Backend: `d5a57af049c5ac8abb57754855099fa0468abd37`, root `/private/tmp/gamen-backend-food-setup-receipts`, per the [official #249 handoff](https://github.com/Amirkianfar66/GameN/pull/249#issuecomment-6870087162). All ten compiled hashes matched before and after; Backend was not rebuilt or restarted.
- Normal-clock local API on `127.0.0.1:5101`, Auth 9199, Firestore 8180, project `demo-mothership`. Protocol 3 / `planet-game-1.4.0` / `in-person-planet-food-task-2026-11-12` / ruleset `7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333` / setup 3 / design 0.9.0 / tokens 0.5.0.
- The same built native app ran one process per count, sequentially 7 → 8 → 9. Each used normal authenticated host creation, player/display admission, authoritative partner workers, Setup, visible Ready, invitation and physical native controls. Each generated match was aborted normally after its case, before the next count.
- No seed/preload, injected clock, manual phase advance, direct worker, hidden control, direct Ready, changed rule or fabricated outcome. Desktop Chromium only; no physical-device, Safari, VoiceOver, real-network, balance, deployment or activation claim.

## First-attempt matrix

| Count and profile | Guarded Ready | Task outcome | Common return and follow-up | Full case |
| --- | --- | --- | --- | --- |
| 7 · PANEL · 390 × 844 / 100%, normal | Exactly one original 200 / `ok:true` response | `LOST / NOT_OVER_PLATFORM`; four physical PANEL inputs had accepted / `APPLIED` receipts | Common-return checks were reached. The delivery assertion then failed, before stock/checkpoint/placement/art/Pass/meal assertions | Failed delivery expectation |
| 8 · WINCH · 320 × 568 / 200%, normal | Exactly one original 200 / `ok:true` response | `DELIVERED`; physical DOWN, UP and KEY had accepted / `APPLIED` receipts | Stock 20 doses, `FOOD_RETURNED`, own return-placement presence and 37 uniform artwork URLs passed. The 650 ms offline check retained the same physical contact without an invented release. The subsequent fixed 100-second own-Pass wait timed out; meal unverified | Partial delivery/return; driver wait failed |
| 9 · WINCH · 390 × 844 / 100%, reduced | Exactly one original 200 / `ok:true` response | `DELIVERED`; physical DOWN, UP and KEY had accepted / `APPLIED` receipts | Same stock/checkpoint/own-placement-presence/art/contact checks passed. The subsequent fixed 100-second own-Pass wait timed out; meal unverified | Partial delivery/return; driver wait failed |

For every Ready tap, the visible enabled control was the actual hit target, with zero request starts immediately before physical touch and exactly one afterward. This verifies ordinary Ready, not a deliberately lost Ready response/replay scenario. Every Task advertised the unchanged 32,500 ms common absence interval. Original policy projections stayed unchanged and the recorded validation checks passed; no cached-offer schema exception occurred in these attempts.

Placement precision: the driver records **own return-placement presence**, not equality of both returned board positions. Neither delivery-only case establishes a meal failure: the ordinary Pass/meal test was not reached. The eight-player failure screenshot shows Bot 8's ordinary turn, with the human's Pass disabled. Whether the human's turn was never reached or missed is not established by the saved observer data. The fixed 100-second wait is being reviewed against the saved/random order and approved phase durations; no phase will be shortened to fit it.

## Responsiveness remains separate

| Count | Longest completed Task-input HTTP/JSON time | Longest sampled pending interval | Longest completed read | Longest completed heartbeat |
| --- | --- | --- | --- | --- |
| 7 | 3,755 ms · LOCK | 3,770 ms · LOCK | 4,129 ms | 3,417 ms |
| 8 | 3,714 ms · DOWN | 3,762 ms · Hold | 2,065 ms | 2,900 ms |
| 9 | 3,603 ms · DOWN | 3,613 ms · Hold | 3,401 ms | 1,574 ms |

The seven-player heartbeat trace also retains two `NOT_ALLOWED` responses. The input receipts were accepted; that does not make delivery or latency pass. No unknown feedback was sampled during these Task loops, and all human invocation starts had a completed transport observation at failure capture. Neither statement proves absence of every transient state. Pending intervals run between observer samples, not exact state-transition times. HTTP invocation/completion is separate from durable server admission; the HTTP-entry/pre-admission heartbeat gap remains unresolved and is not waived by eight/nine-player delivery.

Every process threw before its final browser-exception assertion. Its raw top-level `errors:[]` was therefore not populated by that check and **is not a zero-exceptions pass**. Earlier failed packets, including the c236/984 schema failure, remain unchanged historical evidence.

## Preserved evidence

- [Aggregate sanitized facts and timing episodes](evidence/food-supply-native-first-d5-2026-11-14/summary.json)
- [Backend/native preflight](evidence/food-supply-native-first-d5-2026-11-14/backend-preflight.json), [postflight and built-input verification](evidence/food-supply-native-first-d5-2026-11-14/backend-postflight.json), [build log](evidence/food-supply-native-first-d5-2026-11-14/checks/build.txt)
- [Seven-player unedited result](evidence/food-supply-native-first-d5-2026-11-14/7/result.json), [original log](evidence/food-supply-native-first-d5-2026-11-14/7/run.txt), [phone at failure](evidence/food-supply-native-first-d5-2026-11-14/7/failure-7.png), [display at failure](evidence/food-supply-native-first-d5-2026-11-14/7/failure-display-7.png)
- [Eight-player unedited result](evidence/food-supply-native-first-d5-2026-11-14/8/result.json), [original log](evidence/food-supply-native-first-d5-2026-11-14/8/run.txt), [phone at return](evidence/food-supply-native-first-d5-2026-11-14/8/return-8.png), [display at return](evidence/food-supply-native-first-d5-2026-11-14/8/display-return-8.png), [ordinary wait timeout](evidence/food-supply-native-first-d5-2026-11-14/8/failure-8.png)
- [Nine-player unedited result](evidence/food-supply-native-first-d5-2026-11-14/9/result.json), [original log](evidence/food-supply-native-first-d5-2026-11-14/9/run.txt), [phone at return](evidence/food-supply-native-first-d5-2026-11-14/9/return-9.png), [display at return](evidence/food-supply-native-first-d5-2026-11-14/9/display-return-9.png), [ordinary wait timeout](evidence/food-supply-native-first-d5-2026-11-14/9/failure-9.png)
- [Every evidence file's SHA256](evidence/food-supply-native-first-d5-2026-11-14/manifest.json)

All three normal cleanup receipts succeeded and all browser/driver/preview workers stopped. This evidence publication changes no native source. The exclusive local build/browser/Git timing slot is returned to Integration/Backend after publication. Native 952 remains visually accepted; complete connected acceptance, latency investigation and final combined release checks remain open.
