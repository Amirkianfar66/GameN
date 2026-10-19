# Seven Designer presentation corrections

This follow-up implements the seven findings on [PR #166](https://github.com/Amirkianfar66/GameN/pull/166#issuecomment-6257463578). The frozen consumer code is `f35a8ff04dcef066e72125bd3efb3e19b59cc858`, above the previously reviewed `c35b9eca`. Integration owns the shared exact-file approval refresh and final release integration. Artwork and its source/derivative hashes remain unchanged.

| Finding | Result |
| --- | --- |
| Overflow stages | Public held-before identity and placement draw the original figure and its approved memorial treatment with `frame.figure.opacity/grey`, including the reduced first panel. No held origin means no subject drawing. The authoritative offboard count uses the existing plaque icon and follows `frame.plaque.scale`. |
| Outcome band | Authorized words remain in the existing polite live region, visually clipped to 1×1 so they cover no caption, FULL stamp, plaque or optional inset. |
| Admission | Strict clinical-anchor validation remains first. An INJURY draws at the subject's current H1–H4 physical bed even for a valid HV5+ or occupied clinical anchor. HEALED/DEATH retain words-only and living/body-holder protections. |
| Captain plates | Available plates take one row each, uniformly scaled up to the approved 200×64 size, with native text in the original label field. Both native controls remain at least44px. Scroll keeps them reachable inside the existing private body. IDs, intents and command/receipt logic are preserved. |
| Clone stamps | CLONE ACTIVE/CLONE ENDED use the approved `cloneFrame().stamps` opacity and scale, including settled frames. Both decorative stamps have `aria-hidden=true`; the current status paragraph stays accessible. |
| Deferred own Clone | A player-only controller reader supplies only trusted, current, visible own Clone facts to the drawing director. Closed `privateArea.content` remains null and no private scene/DOM is present. A live transition while the card is closed waits, without a timer, for its first foreground. Started films do not replay. Baseline, reconnect, stale/revised identity, foreign seat, blur/hidden/resumed page, terminal state and motion changes invalidate drawing authority or pending playback. The display has no reader. |
| Offboard tab | The existing offboard toggle is prepended to the choosing row. Canonical target IDs/values and the inert board beneath its sheet are preserved. |

## Actual verification

The [machine report](evidence/hospital-four-seven-corrections.json) binds the code and capture-script hashes to 64 passing rendered records and zero runtime exceptions. It uses the real controller, DOM and CSS in Chromium over strict synthetic 1.11 audience views. A controlled browser clock selects drawing stages; it is not evidence of native service timing.

Public cases exercise both phone viewports, both motion policies and player/display audiences. They compare the grey cutout with the actual held-before figure's rectangle, keep removed world/capsule actors absent, check the polite clipped live region, normal lift and plaque pop, reduced counted panel, and H2 admission with fifth/held/body-held anchors. Explicit display guard cases retain HEALED/DEATH HV5 words-only behavior, the held body and no-origin fallback. Own cases verify deferred activation/expiry, single play, stamp opacity, clearance above Pass, concealment and automated AX exclusion of decorative stamps. Each Captain control passes five-point hit tests after scrolling into view; the source image and 200:64 proportions are measured.

Reproduce after the workspace build with `node apps/game/dev/capture-four-corrections.mjs`. The development-only script starts and stops its own loopback Vite server on5303 and Chromium instance. Its output is under `/private/tmp/gamen-four-corrections` unless `FOUR_CORRECTIONS_OUT` is set. It never enters the hosted bundle.

Controller/lifecycle tests add the admission and closed-sheet queue cases, plus current-own reader isolation from closed markup and stale/reconnect/foreign-seat/revised identity sources. The initial affected run passed 741 Frontend cases and both typechecks; final required checks run on the combined candidate after Integration's reviewed approval supplement. Those final results are added below without changing the recorded historical scopes.

Physical phones, Safari/WebKit, human screen readers, native services and live multiplayer were not run by this rendered suite. Integration runs the release/native smoke separately. Under the [owner's current workflow](https://github.com/Amirkianfar66/GameN/issues/155#issuecomment-6258573661), Balance records the approved rule and verifies implementation; no additional Balance design approval is required for this test release. Frontend makes no merge, activation, deployment or IAM change.
