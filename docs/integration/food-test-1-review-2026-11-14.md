# Food test 1: Integration review, 14 November 2026

The fixed Food test 1 release remains unpublished. Designer has accepted the
current native interface. The first connected 7/8/9 packet is preserved and
does not pass the complete release gate. This report supersedes the current
status statements in the [13 November checkpoint](food-test-1-source-registration-2026-11-13.md);
that checkpoint remains historical evidence.

## Reviewed and combined source

- Combined predecessor `1524e5d173c5dc06ff44222c8fd566ca0a04d21d` includes
  Backend PRs #243, #245 and #247. All nine CI checks passed on that exact head
  in [run 43542270810](https://github.com/Amirkianfar66/GameN/actions/runs/43542270810).
- Frontend evidence head `f8671f89b9665919158bda4404d3afaf8cabfefd` is adopted
  with its ancestry. Its 30 native inputs match reviewed candidate
  `952e7d9ca5766aa3e9514a362c86a3f91b20e0fa` exactly. Only
  `apps/game/src/planet/food.ts` changes among those inputs: verified contact
  closure retires the covered original Hold requests; unrelated unknown
  requests retain receipt recovery. Late completions cannot restore retired
  requests. No individual outcome is inferred from that closure.
- [Designer explicitly accepted native 952 / evidence 149](https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-6869904727).
  The subsequent f867 commit adds the connected first-attempt evidence only.
  Its adopted runtime bytes and rendered dependencies are unchanged. The
  reference remains `cd2b70dd860368cd6d0cb1bd7b01cfface4ae75b` from #241.
- Backend Ready-receipt correction #249 is reviewed at
  `d5a57af049c5ac8abb57754855099fa0468abd37`. It returns the original authorized
  setup receipt after the match has started, with request fingerprint and
  current participant authorization checks. It does not admit a new setup
  operation. Its [review](https://github.com/Amirkianfar66/GameN/pull/249#issuecomment-6870318651)
  and [handoff](https://github.com/Amirkianfar66/GameN/pull/249#issuecomment-6870087162)
  are separate from integration or publication. At this checkpoint, emulator
  checks passed and full verification is still running; #249 has not merged.

The candidate remains protocol 3 / `planet-game-1.4.0` /
`in-person-planet-food-task-2026-11-12`, rules hash
`7a12428b37a0cd7382c98b1772fc46444899d9be7b64ad60f6c0cea8bc3c9333`,
art `design-0.9.0`, tokens `0.5.0`, setup 3. New-match selection remains gated;
saved matches retain their pins. Scope has not expanded beyond #237.

## Connected evidence and limits

The [first d5 native packet](../frontend/food-supply-native-first-d5-2026-11-14.md)
contains one normal-clock attempt per count, with no source changes or retries
between attempts. All three normal Ready interactions and cleanup receipts
passed. Backend d5 and its ten compiled identities remained unchanged.

| Count | Observed result | Remaining acceptance |
| --- | --- | --- |
| 7, human Panel | Authoritative `LOST / NOT_OVER_PLATFORM`; common return reached | Successful delivery, stock, placement and meal checks were not reached |
| 8, human Winch | Delivery, common return, stock 20, `FOOD_RETURNED`, own return-placement presence and 37 uniform asset URLs passed | Driver timed out after 100 seconds waiting for an ordinary Pass offer; meal unverified |
| 9, human Winch | The same delivery/return checks passed, in reduced motion | The same ordinary-Pass wait timed out; meal unverified |

The 8/9 brief network interruptions retained the physical held contact without
inventing a release. Return-placement presence is not an assertion of both
operators' exact final board slots. Each process threw before the final browser
exception assertion: raw `errors: []` is not a zero-exceptions pass.

Source review identifies a test-bound problem: approved pre-turn, ordinary
turns and up to two private conversations can take longer than 100 seconds.
The maximum allocated phase time before a living human placed last is 8m55s,
9m55s and 10m55s for 7/8/9 players, before transport tolerance. This does not
prove the exact failed runs' phase histories; those histories were not saved.
Frontend is correcting the development-only observation window and recording
public phase progress. Gameplay timers and the meal assertion remain intact.

The 7-player Panel loss is a permitted outcome, not by itself an engine defect.
Touch scheduling must nevertheless be reviewed against the visible clock and
authorized projection. Three-to-four-second acknowledgments and the unisolated
HTTP-entry/admission gap remain separate responsiveness findings. Successful
Winch delivery and the Ready correction do not waive them.

Evidence manifests checked in this adoption:

- Recovery: `3680ba3a07b139e2e5a779d34391ff8b1c46bd0cf56f5a5ca9f0281e0f6976ce`.
- First d5 matrix: `01fc70e0de32902fa543ebcdae836bebe0c46e2d8075ca7c1abc1a145059e5de`.

## Source registration and verification

The current registration binds all 30 native inputs, the same 14 Designer
sources and the same 37 SVGs. Historical art manifests and frozen rigs are
unchanged. Integration rechecked every native input against the committed
closure, then ran the focused source, artwork, approval and drawing-fence
checks: 30 passed. Source integrity also passed. These checks are not the
connected acceptance gate or final combined CI.

- Source registration: `788e6641b72ed636fc8c5a45baf0912f19848817e5ede986cf34449e911822f3`.
- Art 0.9 manifest: `4eb7241ae6060a596788690fb6bb05198bba55d57fd1620263e9c13b0408024f`.
- Drawing policy: `623b4db1cd14fcd85aebf90c790d50a6d65329f83f3449775923f687f55e0499`.
- Static art: `28c52bf83716003f410f6594d667bb9a8833d7fd6e072056b5c2fe0c1543c7b3`.

The independent production-consumer acceptance record remains absent. Source
adoption does not enable Food creation or publish a client.

## Remaining release work

1. Complete and review connected delivery, return, ordinary meal and recovery
   evidence using normal controls and the approved phase durations. Preserve
   failures and classify responsiveness separately.
2. Merge reviewed #249 only after its required exact-head checks pass.
3. Record actual final consumer acceptance, complete production packaging and
   required combined-head checks, then merge #240.
4. Publish and verify the existing staging project under the
   [publication plan](food-test-1-publication-plan-2026-11-13.md).

No owner decision or new Designer work is required at this checkpoint.
Physical phones, Safari, screen readers, low-end performance and human balance
are not claimed by these desktop Chromium/emulator results.
