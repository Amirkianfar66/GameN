# Hospital-four playable Frontend candidate

This implements issue #155 and the reviewed PR #162 plan. Integration owns final adoption, profile/default selection, merge and deployment.

The complete films require the exact Hospital-four gameplay tuple and `design-0.5.0`, with the common artwork loaded. Historical matches retain their original geometry and Ready agreement. The owned hosted build explicitly validates the new candidate; shared release/profile defaults remain unchanged.

## Dependencies and source preservation

The executable ancestor is `6ca4b51d5acd1454daec68c5108c8f12ee2286bf`. Plan commit `98ec3a299332ed4935683821f61602d660a300e0` is a review document, not an executable baseline.

The focused review base combines Integration art/fixture head `bcbb76080a89eea1c1bb8d3cc62cd62041c1562e` and Backend final head `1d16da3b5b642f590810d1106714fde230a45c48` as dependency foundation `c6814df98242a72bf702362d253aab0a8ca6048a`. The explicit review base is `b08d17516ba4efd1e5b65fadc729eb560af831e9`, which additionally consumes the exact reviewed PR #165 approval commits `ad4f694` and `c3b5cc6` without changing the Frontend branch history. Backend functionality is the unchanged `d16f7a1` implementation; subsequent Backend commits add tests, clarification and verification documentation. Shared contract `6023d43e21b46d11fd08be963bfa1daa8f09a175` defines the exact gameplay/art/layout agreement.

| Field | Candidate |
| --- | --- |
| Protocol | 2 |
| Engine | `full-game-1.11.0` |
| Ruleset | `in-person-v1-hospital-four-2026-10-19` |
| Ruleset SHA256 | `7d9d3519df8813feb1213f1ad4439cae90895af6850c223264c28907824aeb9c` |
| Layout | `board-v2-four-0.1.0` |
| Art | `design-0.5.0` |

Fourteen pure ports and 100 SVG derivatives are recorded in [the source inventory](designer-films-runtime-provenance.json). Designer #158–#161, the original character rig, clothing, capsule and room artwork are preserved. The corrected medical-four source is Designer #160 at `1fbdb541ec4b8389dcf2220125b4666278a12b0e`; source/runtime SHA256 values are `90ae67a8cd9c5d92454417cc1a7ba5dd16172e7081ae4c5427caa013e9627ee0` and `9e212739636b1cff522c79f36eee64e14add6dad29aa2054cac7e4452532a1e7`. Clone's #161 family remains pinned to `cb9386bd716dc346160509d5e49d7348fdaf4f84`.

The whole film supplement is emitted and loaded on every audience before private data is consulted. Its SHA256 remains `9e6abdef0f0be32d8283dffbef9bff18898c62d4f330c8f72f9216717f1e8bbb`: 1,462,181 raw bytes, with 115.32 kB gzip reported by Vite. These are build sizes, not device/network benchmarks. Historical manifest bytes and their strict preservation checks remain independent.

Separate #116 setup/role-card components already existed. This change extends their exact-pair gate and preserves the neutral back, explicit reveal/hide, public taken stamps, own confirmation, Ready seal, both 30-second windows and reduced-motion/blur cleanup.

## Consumer behavior

The new board has H1–H4 for every 7/8/9-player roster. Clinical anchors remain bounded by the starting roster. Strict wire validation precedes optional drawing: valid HV5+ retains its words, malformed/out-of-roster anchors remain invalid, and a berth held by another stable seat or body suppresses incompatible imagery. Wire `seatId` values are normalized to the helper's `seat` namespace.

The native painter uses the reviewed rig and pure medical, Captain, overflow and Clone helpers. It does not allocate placement, send commands or select asset URLs by role. Critical state uses actual Hospital slots. Medical films use authorized anchors; overflow has no clinical anchor or medical film. The committed snapshot removes offboard world/capsule actors immediately. The memorial counts all authoritative null-placement seats, independently of received event counts or removal cause.

Held-before snapshots are retained by revision, so delayed occurrences cannot invent origins. Initial/reconnect/obsolete/expired events cannot replay. New placement, another berth holder, stale timing, blur/hidden pages, terminal state, unfit geometry and motion-setting changes settle disposable drawings. Fresh outcomes after Blackout remain eligible; resuming a hidden page establishes a baseline. Words remain independent of no-film/no-inset fallbacks.

Clone draws only inside the revealed own Actions sheet. Its actual visibility and clearance above the raised Pass are measured at both phone sizes. Concealment removes the SVG/text subtree; reopening or reloading shows current activity at rest. Public models receive no Clone status. SHOWDOWN can carry normal expiry; FINISHED/ABORTED cleanup suppresses the private film.

Captain plates use current own offers and office allowance flags. The source's console, cropped door/hatch geometry, walking, silhouettes, retained-body treatment and exterior are connected to committed outcomes. RELEASE confirmation says “Release all living prisoners currently in Jail?” EJECT includes retained Jail bodies. Clearing living Jail occupants can close the other command's offer; two attempts do not promise two successes. Receipt recovery retains the original command ID and its existing guard. Unchanged command controls survive surrounding redraws.

Code keeps canonical choice IDs and seat values. On the new tuple, placed targets stay on the board and authorized offboard choices use a separate private tab with stable native buttons. The board is inert while that sheet is open. Blackout retains its numeric/frozen-slot presentation. Pass, room-tag movement, recovery controls and the half-width capsule/full 60-second conversation remain intact.

## Verification

`npm ci` used the pinned Node 22.21.1/npm 10.9.4. Workspace build, both typechecks, hosted Vite build, source/port checks and Frontend regression checks have passed. The complete combined `npm run verify` passed with exit 0 at `eb3f8ceb75905886051f166e721da0e6b307bfcd`, tree `9d9c770d0406d076b168ec32c2d729c5409feae8`. It passed 152 bootstrap, 1001 engine, 253 Backend, 209 tooling, 734 Frontend and 252 Design cases; 103 static Balance cases; 516 scenarios, 508 control baselines, 4490 detected controls, 30 Balance playouts; and 107 capacity scenarios plus 600 capacity playouts. The documented 33 blocked/6 manual scenario items and 15 manual capacity items remain explicit. These are automated compatibility checks, not independent human Balance approval.

Local native acceptance passed all 18 Backend Hospital-four Auth/Firestore cases, including native admission/preparation for 7/8/9 and legal synthetic SETUP histories for medical/overflow/Rules/receipt controls. The run took 202.963 seconds. Three additional Frontend cases passed fresh mixed human/practice-bot setup for all roster sizes, both 30-second windows, exact Ready and native bot execution.

Candidate setup browser acceptance passed 10 records at 320×568 and 390×844. Final browser acceptance passed 36 synthetic audience records, 29 native Captain/Clone records and six real elapsed-conversation records, with zero runtime exceptions. The conversation retained the full 60-second native phase, half-width inner capsule, accepted movement, Code selection without submission and return to the latest stored slot. These measurements are recorded separately in [the evidence summary](evidence/hospital-four-consumer-checks.json). Native browser histories use real local Auth, Firestore Rules, service decisions and receipt lookup after a legal synthetic initial SETUP. Synthetic browser scenarios use strict authored wire views/outcomes and do not prove legal native histories or multiplayer correctness.

An earlier full verify reached 37 failures in historical drawing-fence seed tests after passing the other unit groups. Integration's exact `bcbb760` repair preserves the original metadata/build inputs in committed snapshots; it does not repin the old policy or weaken current import/port validation. The four then-remaining current-adoption checks passed in the completed combined run after the separately reviewed PR #165 policy was included.

Integration subsequently found clipped native nameplates at the Jail and Room A edges. The narrow `ceb8bdd22198cdaebdf75a1aad4e49c992fd161f` follow-up clamps each label to its panel using its intrinsic laid-out size; the seat number remains fixed and long names use an ellipsis. It changes no character slot, target geometry, gameplay or art bytes. The original 81 browser records and complete verification above predate this label-only delta. After the fix, all 734 Frontend regressions and 30 focused cases passed. A separate Chromium run passed 30 records and 120 fixed-slot measurements at both phone sizes for all rosters, including maximum valid 12-code-point names, capsule aliases, unchanged body/target rectangles and 44px centre/corner hits, with zero exceptions. Exact measurements and final scene/CSS/host hashes are in [the label evidence](evidence/hospital-four-nameplate-checks.json). The two new label screenshots show this final follow-up; the original six retain their explicitly recorded `530532d` scope. Final shared policy/build/Design checks are recorded after the exact approval supplement is consumed.

Reproduction uses the repository build/verify scripts and the development-only files below. Serve `apps/game/dev/board/vite.config.mjs` on loopback 5297, then run `capture-hospital-four.mjs` and `HOSPITAL_FOUR=1 node capture-setup-art.mjs`. Native browser acceptance additionally uses `four-native-service.mjs` and `capture-four-native.mjs` with explicit demo Auth/Firestore emulator variables. Run `node apps/game/dev/capture-four-nameplates.mjs` for the label-only follow-up; it starts and stops its own loopback Vite server. These modules are excluded from the hosted build. Real match payloads, tokens and credentials are not committed.

Physical phones, Safari/WebKit, human screen-reader acceptance, production Firebase Web SDK/Functions/Tasks, Hosting deployment, live multiplayer and independent Balance approval remain unmeasured/unapproved. Chromium screenshots and practice bots do not establish human game balance.
