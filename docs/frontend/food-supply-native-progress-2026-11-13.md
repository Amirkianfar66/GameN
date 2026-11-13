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

Current local focused checks: contracts build plus **25 client/assets/
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

No native release, production activation, new-match default change, cloud
deployment, physical-phone, real-network or assistive-usability approval is
claimed. #227's separate framing worktree remains untouched.
