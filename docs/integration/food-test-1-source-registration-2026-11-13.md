# Food test 1 source and release checkpoint

This is the fixed release in [#237](https://github.com/Amirkianfar66/GameN/issues/237):
the existing Planet game plus the approved Food Supply Task, stock, meals and
hunger. It excludes #227, the general #228 text redesign, #230 ship life, new
films and further gameplay features.

## Reviewed inputs

- Main baseline: `f9e7e11bd6c23671f96832bf45d79146e6fd855c`.
- Backend: `cd41a74ae36d370e89bf6c1688a8fb697436b18a`, PR #238.
- Frontend: `50441cf4fd65589925c14e3574b8618d27ac434e`, PR #239.
  Last runtime correction: `d8b92b33c8ed7a03d7304db6b19fb45775dca4ef`.
- Designer Food reference: `9bb497948861521030c37a8d2c60a6318f1745c9`, merged #231.
- Candidate tuple: protocol 3, `planet-game-1.4.0`,
  `in-person-planet-food-task-2026-11-12`, rules hash
  `7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`,
  art `design-0.9.0`, tokens `0.5.0`.

The source registration binds all 28 named render/client files, their
predecessor bytes, the design inputs and the uniform 37 SVG output set. The
build verifies the pinned static outputs without running the design prototype
or its Task simulator. Historical manifests `design-0.5.0` through
`design-0.8.0` retain their identities and outputs. This does not select Food
for new matches or change saved match pins.

The named compatibility records and drawing fence permit only these exact
bytes. Unknown Food drawing files, prototype imports, changed source/asset
bytes, symbolic links and fabricated registration records remain rejected.
The existing test fixtures now copy the new evidence or explicitly restore the
preserved predecessor when testing historical behavior; rejection tests remain
active.

## Evidence and limits

Integration has independently checked:

- The pinned Node 22.21.1 / npm 10.9.4 clean installation.
- The server-only timing import correction: workspace check and 10 policy tests.
- Both earlier Frontend recovery findings: single underlying read beyond a local
  timeout, and an aborted cold entry with one receipt lookup and no new command.
  The prior isolated browser check passed four desktop Chromium profiles.
- The 15 render modules remain identical to capture commit `30e52bcb`; later
  client changes preserve predecessor clock probes and conceal Food immediately
  after an explicit authorization refusal. The current closure pins those changes.
- The latest combined Food session/service/worker regressions pass 59/59.
- Ten focused source/static-art checks; the full tooling suite passes 332/332.
- In the combined verification run, bootstrap passes 367/367, engine 1700/1700
  and Backend 470/470. Frontend passes 771/771 and presentation 224/224.
  The restricted first run could not open eight loopback test servers; the
  complete Frontend suite passed when rerun with loopback access. Design,
  balance/capacity and final exact-head CI remain tracked separately; these
  counts do not claim that the complete release gate has finished.
- The normal hosted build succeeds. Published output checks verify 9 historical
  base outputs, 27 each for art 0.6/0.7/0.8, and 64 for art 0.9 (including the
  37 Food SVGs). Production exclusion passes. This was repeated with Frontend `50441cf4` and Backend `cd41a74a`
  assembled. Final release metadata still has to be recorded before publication.

The Frontend [native review packet](../frontend/food-supply-native-review-2026-11-13.md)
contains 304 Food pairs and 12 ordinary-interface pairs, with provenance and
source equivalence. These are synthetic desktop captures, not human playtest,
physical-phone, screen-reader or connected-worker acceptance.

## Remaining release gates

1. Backend completes the real authenticated Functions/Firestore/Tasks timing
   journey, followed by Frontend's native connected journey. No seeded private
   history, manual phase advance, direct bot callback or client outcome
   substitution can stand in for this evidence.
2. Designer resolves the three already-recorded #222 wording/small-phone items
   and gives explicit PR-specific visual acceptance. [Review request](https://github.com/Amirkianfar66/GameN/pull/239#issuecomment-6857157285).
   A required sheet exception still follows the owner's existing approval rule.
3. Integration records that acceptance, completes exact production adoption and
   the explicit new-match creation profile, reruns affected checks and verifies
   all required CI on the combined release head. Registration alone cannot
   select the Food profile in hosted release metadata.
4. Publish the reviewed staging release under the existing authorization and
   verify its actual release identity and fresh match journey.

No deployment, production adoption or Designer acceptance is claimed by this
checkpoint. There is no new owner gameplay question in this release.
