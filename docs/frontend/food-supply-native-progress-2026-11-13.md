# Food Supply native implementation progress

Consumer #235; branch `codex/frontend-food-supply`. The input contract and its
render-data amendment are accepted at `5a5bb9068cd4fb085cb2482cd969058221d2c870`.
Integration reports #236 merged with nine required checks passing into shared
baseline `f9e7e11bd6c23671f96832bf45d79146e6fd855c`.

## Implemented candidate

- Own-seat request/input controller, correlated original receipts, a distinct
  release lane, unknown-result recovery and atomic explicit contact-off.
- Per-tab bounded identity/recovery metadata; no selected Partner, private
  snapshot or secret role in storage. Reload never replays DOWN. An adapter
  receives a copy of the captured command; it cannot mutate a later release.
- Pointer/key/assistive contact state preserved across redraws; ordinary
  accepted inputs wait for their new view. A late DOWN answer cannot regress
  the newer UP feedback. Disconnect alone does not release a contact.
- Approved click/swing/global-height trajectory sampling and reduced-motion
  variants. Rendering does not decide a landing, death, meal or phase change.
- Native Task controls, instruments, briefing/end/death cards, request and
  instruction sheets, drawn machinery and operator tags. The existing eight
  pure drawing/component/style copies remain pinned separately.
- Uniform 37-file catalogue loader at root `/art/food-supply/`, including from
  `/planet/?recovery=…`. Every Food audience requests the same set. Mounting
  controls does not await it.
- A separate excluded component harness using accepted synthetic wire packets.
  Its ordinary host data is a minimal fixture, so it does not establish an
  integrated ordinary-board/API journey or exact Food portrait dispatch.

Historical foundation checkpoint: contracts build plus **25 client/assets/
presentation tests passed**. Preliminary desktop Chromium component checks
cover 390×844 and 320×568 at 200% text, both normal and reduced motion, literal
markup-significant names, stable Hold node through redraw and causal UP while
DOWN is unknown. This is four profiles, not the 76-state comparison. The first
run exposed an unbound timer in the excluded harness; that wrapper was fixed
and the run repeated without browser errors.

## Large-text source conflict found by actual inspection

At 320×568 / 200% text, the pinned Designer reference's `food-large-07`
(`s=task&board=disconnect&t=6900&as=winch`) visually clips “Cleo is offline”
to a 1×1 pixel top-bar subtitle. The shared kit's ≤12rem rule hides it,
although Food's specification requires the partner state to remain visible
in the top bar while the hint shows a danger.

With the permitted twelve-character name `WWWWWWWWWWWW`, the native Panel
candidate reproduces that hidden subtitle and additionally exposes the
uncapped text constraints: hint scroll width 401px inside 288px, and the
right-anchored Winch tag starts at x=-63.84px. Its full “· Offline” tag is
292.83px wide. No alternative wrapping, tag position or wording was built.
These measured cases need Designer's resolution in #222 before changing the
drawn layout. Source/native screenshots and measured facts are in
`evidence/food-supply-preparation-2026-11-13/large-text-layout-audit/`.

## Remaining delivery

Backend runtime/API/heartbeat integration and its committed dependency;
exact new tuple/art dispatch; final complete source/output closure and
Integration's guarded build admission; authorized stock/meal/return wiring;
public away rendering with canonical roster retained; all 76 typed native
comparison states and captures; browser input/focus/privacy regression and
connected 7/8/9-player journeys; Designer's exact-PR visual acceptance.

The FOOD_RETURNED publication seam currently suppresses the old finalized-
round fallback caption. The final label is with Designer in #222, together
with the half/zero-package wording conflict. No new Task-result message or
cinematic is attached to that checkpoint.

## Connected consumer implementation checkpoint

The native app now consumes the Integration-accepted runtime seam at
`d0a12f252d9d076c0978b97cfcdf942e5f0e4a75`, stacked on the merged `f9e7e11b`
baseline. The fixed release scope is [Food test 1, #237](https://github.com/Amirkianfar66/GameN/issues/237).

- One actual network snapshot in flight, including beyond a local eight-second
  timeout; queued post-receipt refresh and the original response clock window.
- Exact Food/`design-0.9.0` dispatch; predecessor artwork behavior retained.
- Bounded fallback presence, with an independent causal release lane and no
  heartbeat after a private terminal outcome. Reads continue to common return.
- The complete canonical roster is retained; only drawing omits away people.
  Players/accessible board facts mark their authorized absence. Stock, current
  branch meals and server-computed own return placement come from the same read.
- Native request/Task/stock/return surfaces, existing settings/card/board
  navigation, private-markup removal on conceal/revocation, and Food-only
  aborted cold-entry receipt recovery. High-water-only contact metadata does
  not indefinitely block terminal return.
- Every new review artifact is explicitly excluded from production. The
  prototype Task model, practice bot, review films and #230 renderer are absent
  from the native production path.

Actual regression checkpoint: **768 app tests and 224 presentation tests passed**.
A subsequent focused session suite adds the lifecycle-store separation guard:
**8/8 passed**, including a seventeen-second stalled-read/independent-UP case.
Full native Chromium smoke passed four profiles (390×844 and 320×568/200%, normal
and reduced): touch, keyboard-repeat suppression, assistive click activation,
UP before conceal, visibility-only resume, settings return, and aborted cold
entry with one original receipt lookup and zero new Food commands. This is
synthetic API transport, not connected server acceptance or screen-reader
usability evidence. Integration independently reproduced the prior four-profile
browser/recovery checkpoint in its isolated build.

The 76-case comparison mapping now names typed native packets. The comparison
preparation uses an explicitly constructed pre-Task engine prefix and approved
storyboard input times; the actual candidate engine projects Task/return data.
Stock/availability variants and the transient joined publication are explicitly
constructed presentation cases. The runtime normally enters briefing directly
in that last publication; the client introduces no extra wait. Native and
reference code run in separate pages. A first 304-pair run found no control or
briefing overflow at the named fixture lengths and no browser exceptions;
final captures are being pinned after the first-read room-label correction.
The previously measured maximum-name/offline conflict still requires #222.

The complete render/host inventory is `food-supply-render-closure.json`, with
the unchanged 37 static outputs and nine reused portraits in
`food-supply-art-adoption.json`. Integration owns its production registration.
The three existing #222 design questions and exact native visual acceptance
remain open. Backend's real Functions/Tasks latency/worker acceptance is also
still open in #237; unit, memory-store and synthetic browser results do not
close it. The consumer PR is stacked on Backend #238 to keep its own diff
reviewable.

No native release, production activation, new-match default change, cloud
deployment, physical-phone, real-network or assistive-usability approval is
claimed. #227's separate framing worktree remains untouched.
