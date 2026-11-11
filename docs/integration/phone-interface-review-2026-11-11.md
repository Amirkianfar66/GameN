# Phone interface and pre-vote Blackout integration review

Status: exact runtime and native-source review accepted; final combined verification and GitHub checks are pending. This record does not activate a creation profile, perform a deployment, or replace any immutable artwork approval.

The owner selected Blackout resolution before the Jail vote. Backend records that authority separately in `docs/specifications/planet-successor/blackout-before-vote-owner-decision-2026-11-10.md`. Existing matches keep their saved gameplay, setup and artwork versions.

## Reviewed checkpoints

- Backend phone/setup base: `19564d0c618dae9995bbd92979d248e82dba0a8f`, PR #210.
- Native phone source: `838558bdc8d9eb3793d268375583260d8e4c4433`; evidence-only follow-up `bd5042a15b630ed270c8147f7c0d3f9694e4a3ac`, PR #212.
- First pre-vote native source: `5a891e7a3094eb78c0ffd292626a180656e96795`. The corrected fixed-slot camera is `c5a70b7eea1c3f755f655d37ac729e5f78d24efc`. The glass/roster native source is `b63403e6a8d1b5f68f48ec13f4a392a79870bfcd`, which changes only `phone.css` and `render.mjs` from the corrected camera commit.
- Final Backend head: `1900566f7237bc5a8032acdfb09208f95e68e2c0`, PR #213. Runtime is frozen at `c492523845567c7e4e672991e11c058e88ccea27`; subsequent changes are tests and audit documentation.
- Pre-vote Blackout contract: `44d008df0f1cc6fbb2d6c4c0b4b9c95f50c752c3`; authority SHA-256 `2505515ad41e9d49c06bd14aaf9dab56dcf0adb471725c1c15d877a0f0b97556`. Integration and Frontend accepted this contract for implementation. Final runtime and consumer review are separate.
- Designer reference: PR #207 at `e4fd047fec2cde1d6534b3276a2ae39d5ca10a9b`, superseding the reviewed `d52a8ae94f7639dd853f04b4e897b9b77aecff42`. Its prototype sources and the new room artwork in #197 are not runtime inputs in this candidate.

## Designer correction review

Integration read the owner decisions, handoff and requests at exact head `e4fd047f`, inspected the source delta, and visually checked sheets 37, 56 and 29.1 against their recorded hashes. The three latest corrections are present: the 56% glass with a halo under light text, aligned large-text portrait/number/name/count rows with an unobstructed You badge, and one visible count per result with the full accessible label retained.

The focused `phone-ui.test.mjs` suite independently passed 15/15, with no failed or skipped cases, on Node 22.21.1 in 145.212375 ms. The committed render report contains 61 sheets and 239 frames with zero recorded problems. Integration did not rerender the full pack or repeat its pixel-contrast sampling; those remain Designer-provided measurements, with the limitations documented in `docs/design/phone-ui.md`. Three reviewed screenshots do not establish every possible viewport or font rendering.

The earlier six review findings have concrete corrections in the pack: large-text results, action-specific accepted/waiting feedback, board-first cross-room targeting, private Hack claim eligibility, more complete contrast evidence, and Promise examples within their lifetime quotas. The native consumer continues to take gameplay permission and result data from the server. In particular, a registration is not a resolved outcome.

Frontend adopted the native glass and roster changes at `b63403e6`. Integration inspected the ordinary and enlarged-text results, the scrolled own row, and keyboard ballot focus. Its fixed-slot camera remains independent of hidden or changing occupancy, and both camera and targets remain frozen throughout Blackout. The prototype's occupancy-based framing is not adopted. DSN-REQ-20's historical pending text does not override the newer confirmed pre-vote authority. No further owner gameplay decision is needed for these three presentation corrections.

## Actual evidence and limits

Integration independently built and typechecked the native source with Node 22.21.1/npm 10.9.4. The 43 existing candidate/production-approval tests passed before the new adoption record was introduced. Integration checked the connected capture provenance against 111 committed source files and 59 locally built modules; every recorded byte count and SHA-256 matched.

The Frontend package records 935 passing tests (218 presentation and 717 app), 62 synthetic cases on the preceding `0af438bc` source, 18 affected follow-up cases on `838558bd`, and 13 real Auth/Firestore/Functions/Tasks cases on `838558bd`. These are separate runs, not one production or multiplayer-balance certification. The original blank-art captures remain recorded as failed visual evidence. Corrected captures assert decoded portraits, visible figures and unique drawing IDs.

Integration visually inspected character selection, the live room scene, explicit role concealment after foregrounding, action/menu icons, crowded Hospital/Jail views, and vote results. The views contain the approved crew artwork. Enlarged text and long names may require scrolling inside a panel; this is not a claim that every nine-person grid fits without scrolling at 200% text size.

The connected run reported no browser exceptions. Its final optional native abort was not confirmed; the nonpersistent local emulators stopped and discarded the test room. Early deadline deliveries produced retries. Neither an accepted abort nor an error-free server log is claimed.

Physical iPhone/Android, Safari, VoiceOver and device performance measurements remain unrun. Desktop Chromium emulation does not substitute for those checks. Designer visual acceptance of this native implementation has not been received.

## Closed source-adoption findings

1. Room-tag movement is restored. The `838558bd` Actions menu reintroduced a Move button, while full-board room tags merely switched the viewed room until Move was armed. The final consumer removes Move from Actions and restores the offered room/slot/confirmation flow from a destination room tag. Board/Room view navigation spends no movement.
2. The exact 1.3 consumer dispatch and checkpoint handling are present. Crew/art, library, private offers, panel rejection feedback and version gates explicitly support the new tuple; unknown/mixed tuples remain rejected. Separate 1.3 evidence replaces reliance on the earlier 1.2 run.
3. Backend saved-state rejection is closed. Its independent audit found that an empty resolved Blackout batch could be transplanted onto an initial pre-turn state. This was a restore-validation defect, not evidence that a normal authorized command could create the state. The bounded guard is implemented; Integration independently ran 114 outcome/restore/abort/ledger/predecessor cases with zero failures or skips in 140,799 ms on the same final runtime.
4. The synthetic capture timeline is corrected. The first six-case capture moved from the dark boundary to Jail voting before the full 15-second window ended, so its post-Blackout picture still showed darkness. Those original captures remain failed visual evidence. The corrected six-case run waits for the whole interval and checks restored crew and the Hospital patient. Integration inspected the corrected synthetic publication and the real connected post-damage image with both admitted patients.
5. The room-view crop is corrected at `c5a70b7e`. Integration's original inspection found the detained patient's Jail figure almost entirely outside the left edge. The corrected camera fits the rig bounds at every fixed room position, regardless of occupancy, with deliberate aspect-ratio margins on tall phones. Integration inspected the new connected Rescue capture: the complete Jail figure is visible. Frontend's actual painted-alpha check records visible fraction 1.0. Drawing sources and authoritative slot identities are unchanged.

Previously found blank-art dispatch, explicit Conceal persistence, missing action icons and blocked enlarged-text Hospital targets were corrected in `838558bd` and have source-specific evidence. Final-Code entry remains available during darkness only when the server offers it, using original numbers without names or portraits.

## Runtime review boundaries

The inspected 1.3 implementation admits requests against one frozen post-Sync board, resolves both admitted strikes before placement, and commits damage/Hospital overflow before opening a fresh 60-second Jail vote. The later five-second result is followed by the remaining physical resolver; Blackout is not run a second time. Early settlement does not perform queued Rescue, due-death aging, faction revelation, Clone expiry or No-survivors completion. Meet promises evaluate at the actual vote-opening opportunity after forced transfers.

Public timing is common regardless of request count or hit/miss. Private first-choice data stays private. Shared offices follow the published physical snapshot. Room defensive cues preserve their authorized audience and conceal the cause. Final acceptance still requires the fixed runtime source, tests and connected evidence.

The first Frontend real 1.3 journey stopped at an immediate own-ballot assertion after original-receipt recovery. The accepted receipt already disabled resubmission; the dropped successful command response had skipped its immediate projection refresh. The failed run is preserved. The final corrected-camera run at `c5a70b7e` passes nine cases, including one VOTE command, the original recovered receipt, actual 60-second voting and five-second results, later Rescue, and confirmed host abort. Integration independently matched its 111 committed module inputs and 59 built modules with no hash or size mismatch. Browser exceptions were zero; this is not an assertion of error-free server logs.

The final presentation run at `b63403e6` passes 14 cases: 7/8/9 players, 320-by-568 at 200% text and 390-by-844 at ordinary text, both motion preferences, plus two solid-transparency fallbacks. It checks the actual native roster/glass controls, accessible result names, separate count/You badges and keyboard selection/confirmation producing one ballot. Integration independently matched 112 committed module inputs and 59 built modules. These are synthetic projections and do not replace the separately attributed real timing run. Integration's focused phone/projection boundary selection also passed 23/23 at `c5a70b7e` in 18,983.84425 ms.

## Adoption and release boundary

The new independently hash-pinned native consumer record binds the reviewed files, their preserved predecessor bytes and actual evidence. The previous production/candidate records and all art manifests remain byte-identical. The drawing fence may admit exact native consumer changes; it must not grant a directory wildcard, import review fixtures, or replace frozen drawing ports.

Backend and Frontend prepare reviewable stacked changes. Integration owns the final combined source checks, required CI, merge and release decision. Creation defaults and cloud state remain unchanged until that separate release step.

An explicit build profile may report the selected new-match gameplay tuple separately from the immutable artwork pins. Absence retains historical 1.1 release metadata; unknown profiles reject. It requires the verified new native consumer and does not activate any server setting. Backend reviewed this bounded metadata selection and the pending exact-file guard/fence/fixture/CI changes read-only with no concrete blocker. That review ran no tests; positive/tamper execution and actual combined CI remain required.

Read-only staging metadata still identifies source `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`, Planet engine 1.1 and artwork 0.8. The approved publishing account can access the staging project. No new source, creation profile or cloud configuration has been published by this review.

## Final source-gate checks

The exact native inventory is b63403e6; PR #216 carries its evidence at 05d2746bc608db66a7f609e4e519d6f1036ab76c. Frontend reports 951 passing presentation/app tests (218 + 733), with its first sandbox-only loopback EPERM attempt preserved separately. Integration independently passed source integrity and all 53 focused adoption, predecessor, tamper, fence and release-metadata tests in 16,630.225417 ms. The first focused run rejected the tampered files correctly but two tests expected the old diagnostic prefix; only the exact accepted diagnostic alternatives changed, and every rejection assertion remains. Full combined verification and final release CI are still required.

Designer PR #207 was independently read back as merged at 76eb5d1f1f9d9dc4e1f5da1ebe5b0ae2a945e060 on 11 November 2026, after all nine checks passed on e4fd047f. That design-only merge does not publish the native interface or activate the new gameplay profile.

## Exact-tuple Round order correction

The final review found that the native Round order panel still described the historical post-vote Blackout sequence. Frontend corrected only `render.mjs` and `library.ts` at `d1a03c87e80de7b5923c97a15a968c1ba6f5b40c`, with one focused regression. PR #216 carries the evidence at `1c221832566469ada9bc8a34294370b6427f9b37`. This is the final native inventory, superseding b634 only for these two consumer files. No gameplay, artwork, camera, layout, receipt or timer logic changed.

Integration reviewed the exact diff, independently passed all seven focused library tests, verified 112 committed and 59 built module hashes against the six new native panel cases, and visually checked the 1.3 ordinary/enlarged-text panels and saved 1.2 panel. The captured tree is marked dirty because of review work; every captured committed-module byte matched the native Git commit. Earlier c5a/b634 evidence retains its original identity. Frontend also reports a fresh passing 952-test suite (219 presentation + 733 app).

The prior clean Integration verification at 81f3eeb3 was intentionally interrupted after the unit, design, static and catalogue stages; its remaining playout/report/capacity gates were not completed. Its actual log and exit 130 are retained. Final clean verification and GitHub CI on the repinned candidate remain required.
