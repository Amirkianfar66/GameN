# Hosted unpainted trial checkpoint

Owner scope: issues #97 and #99. This is the authorized trial of the supplied unpainted scenes, full-body rig and cumulative ability kit. It is not final art approval. No new artwork, wire field, game rule, engine, root dependency, IAM change or deployment is authored here.

## Exact adoption and ownership

The isolated `codex/frontend-staged-trial` branch preserves Frontend #100 `721b1f2`, #101 `56441c0`, #103 `5a95d75` and #106 `075c29f`. Original recovery branch `codex/frontend-board-recovery` remains at `af291c138ed4aafe470fbfa7377d35e075b4ae9e`. Compatibility checkpoint `87e9667` was separately tested and adopted by Integration.

Geometry and all assets are frozen at cumulative Designer #111 `49f0db4d34d2a2a418f669a13bed660fc665b1b6`: `board-motion-0.3.0`, `abilities-0.7.0`, 49 assets. Stylesheet correction #113 is separately pinned to `d87163358ea85878fd3e9e4ffb347c4e71d6de5d`; source SHA256 `cfcc1e29239840a22210df26a8c09439101f658f1e11f5fd7ab89f21b2e6b808`, derived stylesheet SHA256 `639cf452ddfd0edd37f859aab2ffb64a91812204f673db32c16e8161a01a5d10`. Boundary checker #117 `428c1c741c5ccdfdf42947570530adea1b3a0757` is adopted unchanged. Original Designer sources and captures are preserved.

`apps/game/dev/port-scene-primitives.mjs` reproduces the ten source-hashed drawing modules and adapted stylesheet. Full source paths and hashes are in [scene-drawing-provenance.json](scene-drawing-provenance.json). Production imports no prototype app, fixture, tool or director. Build-only source/manifest metadata stays in `comic-assets.mjs`; runtime loading uses neutral hashed URLs and the `scene-art` gate. Player phones request the same five complete bundles before reading views; host/display request public board and scene bundles only. The reviewed base `design-0.2.0` remains distinct from the trial additions.

Shared checkpoint `670e677413bd488ce589b37190dd7dbd8ed65b5a` supplies nullable lobby rooms, reviewed 1.3 behavior and `fullRoomCapacityForVersions`. The UI copies the actual public tuple and uses that helper only for FULL labels. Server offers still authorize controls. Historical/unknown/mixed tuples receive no invented capacity label; legacy six-to-nine occupancy retains every seat. No station is serialized.

## Behavior delivered

- Public figures and props use the supplied pure snapshot allocator, numeric-seat preferences, shared geometry, public chosen character and public health. Front hands retain the source depth over scene props. Tentative own moves use the same unpainted rig and never enter public occupancy. Room-tag movement, board-only targets, readable fallback and committed one-tap Pass behavior remain.
- Public travel uses get-up, walking and settling primitives. Cancellation owns only its effects, native animations and RAF; it reveals the current drawn body and never restores a captured pose. OS reduction cancels even with explicit full motion and no screen frame. Resize, newer public health, stale data and disposal settle effects. Health feedback remains neutral; no hit controller, attacker or weapon inference is adopted.
- Insider's unordered three-role file remains private. Hacker's known Undercover and Scan printouts retain source order, with no Code membership on a wrong Scan. Alien's four Code members form one unordered, seat-sorted group with the own seat marked and one surrounding string. Inspect/Show on board uses public facts only.
- Target chips, Code windows, Supply tags, reticles, shields, Rescue vials, charge cell, ordinary/special rounds, ballots, key, comms and microphone decorate known own choices. Sets use identical checks on the board and seat-order portraits. Accepted receipts are registration, never outcomes. Charge pictures require a current offer or a known accepted receipt.
- Private cards show authorized weapon/Rescue counts, including both empty Cracker vials, exact consumed/active/queued Protections, a known Hack partner and own Supply acknowledgments. Recipient slips identify no Supplier. Uniform neutral action marks preserve labels and unavailable fallbacks.
- Finished results expose only the server's public winner, cast and Code. Aborted results reveal no cast, Code or winner. Public result text uses readable ink/paper and faction plates; host/display loads no private kit.
- Current-view, authorization or foreground loss removes private cards, action pictures, announcements and the brief private spotlight. Restoring a current view requires deliberate reopening. Clock expiry/unsynced time clears action pictures and effects while receipt reconciliation remains internal; authorized role knowledge remains readable.

## Validation and limits

[Evidence](evidence/staged-trial-2026-10-12/) is synthetic data through the actual hosted renderer, controller, CSS and native Chromium. It is not backend, multiplayer, physical-device, performance or human-balance acceptance.

| Check | Actual result |
| --- | --- |
| Presentation | 194/194 passed, including privacy, no inferred spent flags, Scan/set/resource/acknowledgment regressions |
| Designer, including exact port/asset boundary and quote controls | 207/207 passed |
| Focused scene/motion/ability tests | 19/19 passed; latest focused motion/ability subset 9/9 passed |
| Game before the new capped fixture | 447/447 passed with loopback access |
| Game with capped fixture, before Integration metadata correction | 446/447 passed; sole failure was the old fixture checker recognizing only the 1.1 Pass tuple |
| Exact scenario-checker correction from Integration `67b3ee7626caa8378cd696baadf875564ccf7bd4` | Adopted verbatim; 3/3 passed, with reviewed 1.1/1.2/1.3 and legacy/mixed/unknown negative controls; final complete game suite 448/448 passed |
| Native comprehensive capture | 228 steps, zero problems, 320×568 and 390×844: all action kinds, legacy crowds, privacy, expiry, public terminal states, missing assets and enlarged text |
| After copy/resource/privacy/role-colour follow-up | 56 focused native steps, zero problems; all source inputs recorded |
| Final CSS-only terminal contrast adjustment | Eight fresh finished/aborted phone/display checks at both widths; minimum measured result/name/role contrast 7.75:1; nine roles only when finished, no private file/kit, no phone page scroll |
| Hosted Vite build and production exclusion | Passed; five hashed asset bundles; no fixture/test/dev marker or dependency in production graph |

The complete-roster SDK emulator test now asserts exact pending `null`, one incomplete approval/lobby with null, then a fresh pushed joint room assignment after seven approvals, occupancy at most five and an identical retry preserving the assignment. Existing listener refusal, missing-document and disposal assertions remain. The connected three-move test already refreshes each distinct mover's current offers between commands. These standard-port emulator tests and final combined full verification are Integration-owned; not rerun here against another owner's active emulators.

After the 228-step snapshot, copy stayed in its reviewed quote source, public terminal role colours were added, charge art became offer-gated and private spotlight/native effects gained direct blur/current-view concealment. The subsequent 56-step report covers the updated runtime inputs. After that report, only `ability-art.css` changed: pale faction text gained ink plates, winner ribbons use ink text and public player names inherit ink. The final terminal report records that exact CSS hash and fresh images. Runtime is frozen for handoff.

The approved geometry port retains one blank line at EOF; `git diff --check` notes it. Its reviewed bytes/hash are preserved. No authored whitespace warning is hidden.

## Remaining dependencies

DSN-REQ-15 remains open: durable spent Disable, Officer shot/Hack use and Code-attempt submission states require explicit own fields. Unavailable is never treated as spent. Known own receipts can decorate their own registration only. A new Final Zone illustration is absent from the supplied kit; the existing generic treatment remains. No new art is created.

Integration owns the final shared export manifest/artifact selection, full combined CI, standard-port emulator acceptance and authorized staging/live checks. This Frontend checkpoint merges neither main nor a release and performs no deployment. Detailed requests/resolutions are in [staged-trial-integration-requests.md](staged-trial-integration-requests.md).
