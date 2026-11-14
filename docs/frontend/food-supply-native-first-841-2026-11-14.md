# Food test 1: corrected-driver first 7/8/9 matrix

**Full connected acceptance still fails.** All three Tasks delivered and returned, then each case timed out waiting for the visible Pass confirmation. Each phone's computed own Pass offer had been observed. No ordinary command started, and no meal assertion ran. Every first attempt is preserved without an edit or retry within this matrix.

The clean build/Node source was `841b29d547534e79e4526a1fab83bc3dd6aba923`, an evidence-only child of the [reviewed driver correction](food-supply-connected-driver-correction-2026-11-14.md) at `dcb79bcd3faa16c971a1005d3125c8ff11d543e8`. Native remains Designer-approved `952e7d9ca5766aa3e9514a362c86a3f91b20e0fa`. Official normal-clock Backend remains clean `d5a57af049c5ac8abb57754855099fa0468abd37`; all ten compiled hashes, all 30 native inputs, all 37 SVGs and all 197 captured build inputs matched. The API was not rebuilt or restarted.

Protocol 3 / `planet-game-1.4.0` / `in-person-planet-food-task-2026-11-12` / ruleset `7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333` / setup 3 / design 0.9.0 / tokens 0.5.0. No gameplay seed, injected clock, direct worker/command, hidden control, phase retiming, cloud change or activation. Desktop Chromium only.

| First case | Task and return | Own ordinary offer after observed return | Remaining failure |
| --- | --- | --- | --- |
| 7 · PANEL · 390 × 844 / 100%, normal | Delivered; stock 20, `FOOD_RETURNED`, own return-placement presence, 37 uniform URLs | 172,607 ms, after two observed Hack conversations | Pass confirmation timed out; zero ordinary command starts; meal unrun |
| 8 · PANEL · 320 × 568 / 200%, normal | Same delivery/return checks passed | 16,797 ms | Same confirmation failure; zero ordinary command starts; meal unrun |
| 9 · WINCH · 390 × 844 / 100%, reduced | Same delivery/return checks passed; brief offline check retained held contact without an invented release | 178,833 ms, after two observed Hack conversations | Same confirmation failure; zero ordinary command starts; meal unrun |

All three guarded Ready taps produced exactly one original 200 / `ok:true` response. All three generated matches cleaned up normally. The finally-path exception capture actually executed: **zero captured browser exceptions in each case**, with zero dropped pointer/model/control observations. This is a captured exception result, not full journey acceptance. Both exact returned board positions were not compared.

The public phase timeline now distinguishes an own turn that had not yet arrived from a missed one: first7 and first9 had not seen their own turn within the old 100-second limit, then observed it later. This evidence describes these new cases; it does not supply a missing timeline for older attempts. First8 reached its own turn quickly and still failed confirmation, so that failure is separate from the old wait bound.

## Measured Task-control timings

| Case | Actual pointer event to fetch invocation | Fetch invocation to JSON completion | JSON to first matching receipt-model observation |
| --- | --- | --- | --- |
| 7 | 4.1–4.7 ms | 115–1,933 ms | 4.2–4.9 ms |
| 8 | 4.2–5.0 ms | 109–4,924 ms | 4.3–5.0 ms |
| 9 | 4.5–9.1 ms | 112–3,449 ms | 4.4–5.0 ms |

Every delta above uses a single human document's `performance.now` domain. Host/CDP, the display and server timestamps remain separate. Control MutationObserver callbacks are retained as observations, not paint. The HTTP-entry/pre-admission heartbeat stage is still unresolved and is not waived by delivery.

First8 includes an additional KEY with a rejected original receipt after an earlier accepted KEY. It is preserved in the stream; the report does not call every physical input accepted or describe it as an unknown-input retry. Its cause/enablement relationship needs separate review. Delivery stock remained 20. No receipt or outcome was changed to fit the test.

## Deferred visible Pass diagnosis

The failure screens show the phone's own turn with a gray Pass. This frozen driver recorded computed capability but not the actual Pass enabled/aria/rect/hit/inert facts at touch, so those screenshots alone do not prove the cause. Read-only review found a possible completed-request Food chrome mismatch: persistent request closure history may retain chrome while no current closure card exists. The separately authorized diagnosis will record the actual DOM/model state and preserve request history; there is no permission to bypass the visible UI or drop the meal assertion.

## Evidence

- [Sanitized matrix, public phase timelines and same-page timing pairs](evidence/food-supply-native-first-841-2026-11-14/summary.json)
- [Preflight](evidence/food-supply-native-first-841-2026-11-14/backend-preflight.json), [postflight](evidence/food-supply-native-first-841-2026-11-14/backend-postflight.json), [build](evidence/food-supply-native-first-841-2026-11-14/build.txt), [all artifact hashes](evidence/food-supply-native-first-841-2026-11-14/manifest.json)
- 7: [unedited result](evidence/food-supply-native-first-841-2026-11-14/7/result.json), [log](evidence/food-supply-native-first-841-2026-11-14/7/run.txt), [return](evidence/food-supply-native-first-841-2026-11-14/7/return-7.png), [Pass failure](evidence/food-supply-native-first-841-2026-11-14/7/failure-7.png)
- 8: [unedited result](evidence/food-supply-native-first-841-2026-11-14/8/result.json), [log](evidence/food-supply-native-first-841-2026-11-14/8/run.txt), [return](evidence/food-supply-native-first-841-2026-11-14/8/return-8.png), [Pass failure](evidence/food-supply-native-first-841-2026-11-14/8/failure-8.png)
- 9: [unedited result](evidence/food-supply-native-first-841-2026-11-14/9/result.json), [log](evidence/food-supply-native-first-841-2026-11-14/9/run.txt), [return](evidence/food-supply-native-first-841-2026-11-14/9/return-9.png), [Pass failure](evidence/food-supply-native-first-841-2026-11-14/9/failure-9.png)

Earlier d5/149, c236/984 and older failed packets remain immutable. All matrix browser/driver/preview workers stopped. Frontend retains the exclusive local slot under Integration's later authorization for focused diagnosis/correction; no production deployment or completed release is claimed.
