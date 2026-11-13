# Food test 1 source and release checkpoint

This is the fixed release in [#237](https://github.com/Amirkianfar66/GameN/issues/237):
the existing Planet game plus the approved Food Supply Task, stock, meals and
hunger. It excludes #227, the general #228 text redesign, #230 ship life, new
films and further gameplay features.

## Reviewed inputs

- Main baseline: `f9e7e11bd6c23671f96832bf45d79146e6fd855c`.
- Backend: `6a2a78d7b8c750395f6d4cefb432b0b2fbbadf06`, PR #238;
  executable code is `18f25ab2690350e3313c1dee5f9ff3c211a443c9`.
  Integration reviewed the detached human admission, private live-contact
  renewals, durable single-writer processing, original receipt/binding checks,
  planned-Lock expiry and read-only warning classifier. Canonical warnings still
  resolve before the admitted command. The probe-before-CLOCK correction passed
  all three actual-time 7/8/9 journeys on this frozen code. The separate
  historical boarding/concurrent-deadline emulator failure remains under
  investigation; the native connected journey is still pending.
- Frontend: `703acc2026998b5db89bee3ce5b5382d5c6f6211`, PR #239.
  It includes the seven independent native review corrections and the approved
  gauge, neutral return caption and large-text port. The complete closure is
  17 render modules plus 13 host/client inputs. The final pending-Hold port
  changes only the Food display, renderer and scoped CSS. Its 84-state plan
  requires 336 refreshed Food pairs. The previous 328-pair batch passed but
  remains diagnostic evidence for the pre-amendment inputs.
- Designer Food reference: `cd2b70dd860368cd6d0cb1bd7b01cfface4ae75b`, PR #241,
  over merged #231. Its owner record selects the gauge instead of the withdrawn
  warning banner. The owner explicitly approved the focused exceptions in this
  Integration chat on 13 November; the approval is recorded in
  `docs/design/owner-decisions.md` and [#241 comment 6862856582](https://github.com/Amirkianfar66/GameN/pull/241#issuecomment-6862856582).
  The early-Hold amendment aligns the reference with the already-approved #233
  rule, including a private waiting state without a lift. Integration's
  [exact-source review](https://github.com/Amirkianfar66/GameN/pull/241#issuecomment-6863901747)
  found no blocker. All nine checks passed; #241 merged as
  `093744cad6211c436970c4887ab9162b65988e33`. This source merge is not native
  visual acceptance or deployment.
- Candidate tuple: protocol 3, `planet-game-1.4.0`,
  `in-person-planet-food-task-2026-11-12`, rules hash
  `7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`,
  art `design-0.9.0`, tokens `0.5.0`.

The source registration binds all 30 named render/client files, their
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
- The initial 15 render modules matched capture commit `30e52bcb`. The current
  17-module port changes rendered inputs and requires new comparisons; the old
  evidence is not reused as visual acceptance. Clock-probe preservation and
  immediate concealment after an authorization refusal remain in the closure.
- At Backend `cd41a74a`, the combined Food session/service/worker regressions
  pass 59/59. Backend reports 56 focused checks at `7c24f97b`; Integration
  reviewed that narrow source correction, with final combined CI pending.
- All nine required GitHub checks pass on combined head
  `14d7e2ed94b0ab008a5d628c6788847d4424a7a8`, including full verification and
  standalone packaging. This is evidence for that exact predecessor, not a
  pass for the later bot correction. Backend reports 58 focused checks at
  `f306a538`; Integration reviewed its source and preserves the separate
  connected and exact-final-head CI gates.
- At later combined head `e132341e`, verify and six emulator checks passed,
  but the historical nine-player delayed-boarding emulator case failed with
  Firestore `INVALID_ARGUMENT: Transaction is invalid or closed`; the aggregate
  check consequently failed. [Run 43468560060](https://github.com/Amirkianfar66/GameN/actions/runs/43468560060)
  is retained. Its assertion is unchanged; final exact-head CI must pass.
- The design suite completed 356/357 checks; its sole failure was an engine
  source comment matching the historical prototype-reference ban. The comment
  now cites Designer #231 and its exact source head without a prototype import
  path. The focused guard passes; no executable behavior or test was changed.
  The full design rerun remains part of exact-head CI.
- All 13 focused source/static-art/approval checks pass with the final 30-file
  registration, including tamper, symlink, predecessor and prototype rejection.
  The 37 SVGs remain byte-identical (3,613,319 bytes). The earlier full tooling
  suite passed 332/332; that count is not a final full-suite rerun.
- At combined `7d73e4fb`, verify found a missing exact pin for the new
  `scripts/hosted-art-releases.mjs` selector in the drawing fence. The named
  supplement now pins both selector and acceptance helper, and preserves the
  original selector for historical fixtures. All five targeted fence checks,
  including a new tamper/predecessor regression, pass. No assertion or historical
  release identity was weakened.
- The [final Backend matrix](evidence/food-runtime-matrix-2026-11-13.json)
  records normal authenticated HTTP/Functions/private Tasks journeys for 7/8/9
  players, delivery once, the original 32.5s return, final stock20 and original
  receipt recovery. All three random assignments were human WINCH; this is not
  native-browser or human playtest evidence. Backend also reports 522 service
  checks, seven genuine-Firestore journeys and both standalone packages passing
  at the same frozen source.
- The original delayed-boarding case passed unchanged, but the full historical
  boarding file was 8/9: the nine-player concurrent Ready duplicate returned
  UNAVAILABLE. Its isolated diagnostic passed without a source change. Combined
  `7d73e4fb` CI separately failed the nine-player concurrent deadline case at
  `planet-service.test.mjs:47` with Firestore code3 invalid/closed transaction.
  These remain preserved failures under investigation, not a claimed fix.
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
- At combined head `2343cc6a`, both classic and Planet isolated package install
  and import checks pass. The Planet package now includes the two Food service
  dependencies and four engine ports. This evidence precedes `7c24f97b`; final
  packaging validation must include the updated runtime.

The initial Frontend [native review packet](../frontend/food-supply-native-review-2026-11-13.md)
contains 304 Food pairs and 12 ordinary-interface pairs. Designer requested eight
corrections in [the initial review](https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-6859626835).
The seven independent native fixes and approved #241 port are now source-reviewed.
The early-Hold reference and native port now match the already-approved server
offer. The focused input audit checks original DOWN/UP receipts, no lift/fall
while pending, and unchanged normalized Partner projections.
Refreshed comparisons and explicit Designer acceptance remain pending. Synthetic
desktop captures do not establish human playtest, physical-phone, screen-reader
or connected-worker acceptance.

## Remaining release gates

1. Resolve the separate historical transaction regression and complete
   Frontend's native connected journey on the verified Backend. No seeded private
   history, manual phase advance, direct bot callback or client outcome
   substitution can stand in for this evidence.
2. Designer reviews the final refreshed native comparisons and gives explicit PR-specific
   visual acceptance. The owner has approved the focused #241 exceptions;
   those are no longer unanswered owner decisions.
3. Integration records that acceptance, completes exact production adoption and
   the explicit new-match creation profile, reruns affected checks and verifies
   all required CI on the combined release head. Registration alone cannot
   select the Food profile in hosted release metadata.
4. Publish the reviewed staging release under the existing authorization and
   verify its actual release identity and fresh match journey.

No deployment, production adoption or Designer acceptance is claimed by this
checkpoint. There is no new owner gameplay question in this release.
