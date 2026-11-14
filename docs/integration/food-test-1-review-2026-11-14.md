# Food test 1: Integration review, 14 November 2026

## Updated checkpoint: accepted chrome correction

The prepared combined candidate includes Backend d5 through merged #249
(release predecessor `f6dd343658849e963458f12c262d38c1654e87de`) and Frontend
`99c585157f4ccd99846785149fd5f7da4fe5e3ca`, followed by evidence-only
`9561784a10a564d5d57ace7d1e56d3ac6983fc95`. Its 30 native inputs exactly match
reviewed `8ffce95a0cfe92facc75d8cf0a86f3686608f176`. Only
`apps/game/hosted/planet/food-render.mjs` changes from the previous native
registration: a retained closure owns the Food shell only for its current
round and step. Historical receipts/closures remain intact.

[Designer accepts native8ff without a blocker](https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-6876930457).
The reviewed visual packet is `a09d7b27eac3f2b2f399ee3b28d40f5c98e1eaea`;
the 122-file evidence manifest is
`54dddde19d6332f22ef00901bc976ae187230c89c8d4aa54ab508af1a94c728d`.
Integration reviewed the native guard, the preserved baseline failures and
12 corrected synthetic physical lifecycle cases. The 1,021 app/presentation
tests passed in Frontend's packet. Those results are not connected acceptance.

Subsequent development-only changes record final written build bytes and use
the real `#planet-root` review mount instead of the classic `#app` skin. The
live runtime and Designer sources do not change. The previous evidence remains
preserved alongside the [real-mount supplement](../frontend/food-supply-live-mount-2026-11-14.md)
and [final normal connected matrix](../frontend/food-supply-final-matrix-2026-11-14.md).
An initial final-matrix launch stopped before any
match because local Auth was unavailable; it is setup evidence, not a gameplay
result or a reason to reroll an assignment.

Integration verified all 30 native files against the reviewed commit and all
14 unchanged Designer source pins. The static 37 SVG inventory is unchanged.
The whole-patch whitespace check reports trailing spaces in eight inherited,
hash-pinned Vite build logs; those evidence bytes are deliberately preserved.
The check excluding the immutable evidence directory passes.
The refreshed source identities are:

- Registration: `04eff4ebef972c1e64d8f82f121709bd90461b4db42a8beb47be22c6b3e2b665`.
- Closure: `d4abbfe7bc208d1b1d31bc0efa52f058191bb9bb48f734eef784eda2b874b513`.
- Art 0.9 manifest: `4e30fcae9a8aa0899cb35d6f002b2d81f63f6548f11d937f6a55f214140bcd3c`.
- Drawing policy: `939a66779b206f1115ad051fc90d8499192710790b7edef53ba49583920115b7`.

The first combined verification on `777a67b8` correctly rejected six stale
entries in the drawing-policy supplement. Integration refreshed only those
reviewed input identities, the corresponding port/build hashes and the
independent policy hash. Fence logic, allowed paths/literals, historical
approvals, visual sources and test assertions are unchanged. New exact-head
verification remains required.

After that correction, the six existing tooling files (`food-consumer-source`,
`food-consumer-approval`, `food-supply-art`, `crew-art-release`,
`hospital-four-drawing-approval` and `pregame-fence`) passed **49/49 tests**
under pinned Node 22.21.1 with test concurrency 1. This includes the original
negative hash/port/approval assertions; none was weakened. Combined CI remains
a separate exact-head gate.

The separately instrumented Backend WINCH diagnostic completed delivery,
return, physical Pass/meal and cleanup, and restored official d5. It is not
release acceptance; it did not reproduce or clear the earlier PANEL latency,
and read-tail limitations remain. No speculative timing or performance change
is included.

Production-consumer approval remains absent and Food is unpublished. Remaining
gates include resolution of the failed connected case below, exact combined-source
verification/CI, acceptance registration and final packaging, followed by the
already-authorized staging publication. Historical matches retain their pins;
physical-phone, Safari, screen-reader, low-end and human-balance claims remain
out of scope. No new design, rule or owner decision is requested.

### Final normal matrix: acceptance failed

All three first generated cases used human PANEL; no assignment or outcome was
rerolled. Eight and nine passed delivery, natural common return with stock 20,
physical own Pass/confirmation, one meal, full privacy checks and normal abort
cleanup. Seven failed at the unchanged delivery assertion with
`CANCELLED / DISCONNECT`; its natural return/Pass/meal assertions and final full
privacy guard were not reached. Finally-path exception capture and normal
cleanup completed for all three. This is not a passing complete matrix.

Integration independently verified both published evidence inventories:

- Final matrix: 8 files; manifest
  `1f7a6ece6c8169e42434808d7be32c6469d5383d7aecc823d9c8497cf71e112f`.
- Correct live mount: 91 files; manifest
  `8a25a507e1a570aa909cdd0378b700c36c5ee30268e964546a4085c59aec7e12`.

The latter retains 72 successful captures plus the first selector-failure
record. Integration inspected the requested actual confirmation images and
all 12 lifecycle facts: the real mount, returned navigation, reachable whole
confirmation controls and retained original closure history. These remain
synthetic/browser evidence, distinct from the normal matrix.

Backend's separate read-only review of the failed seven-player match located
the human PANEL presence expiry. The original Lock is durably accepted/APPLIED
and its receipt was recovered, even though the initial request eventually
returned 503 after 26,881 ms. Its stored input time is Task +6.354 s, renewing
presence until +8.354 s; the grace boundary is +16.354 s. The first recorded
heartbeat admission is +29.066 s and returns NOT_ALLOWED after draining those
boundaries. These are stored logical times, not proven physical commit or
HTTP-arrival times. The underlying exception and admission-delay cause remain
unproved; this does not demonstrate a physical phone disconnect.

Issue #252 scopes a separate verified-original-receipt response correction.
It must preserve current authorization, binding and fingerprint checks. It is
not a demonstrated cancellation fix and is not included by this evidence merge.
The final matrix also lacks WINCH/held-contact-loss coverage, and the successful
nine-player case retains multi-second replies/read tails. No latency waiver or
production-consumer acceptance is issued by this checkpoint.

## Initial checkpoint retained as evidence

The following records the earlier review before #249 merged and before the
8ff chrome correction. Its pending/status statements are historical; the
updated checkpoint above takes precedence.

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
