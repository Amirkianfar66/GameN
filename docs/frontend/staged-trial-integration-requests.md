# Integration requests for the unpainted staged trial

Owner request: issue #97. Frontend source baseline is the exact PR #106 `075c29f251f435260147d5cd04fac39a73b12bb6`, with #100 `721b1f239e2dce76308af3cf6d2be3bc95936160`, #101 `56441c066e9c693e1b67e79479ee550fba9da2b7` and #103 `5a95d755b8d05cae7d9a167aea7669b4a9bd9479` preserved. Designer source is #88 `08409392d1040f20d559a9f36a2a1d9bb23468c4` and cumulative #111 `49f0db4d34d2a2a418f669a13bed660fc665b1b6`.

## ART-TRIAL-1: source/export pins

Integration authorized the whole `abilities-0.7.0` 49-asset kit uniformly on every player phone, before private views; host/display load public art only. Frontend owns the hosted art loader and Vite packaging. The public scene bundle is `board-motion-0.3.0`, and its drawing primitives are ported with source hashes. Original Designer files stay unchanged. No prototype app, fixture, tool or director is imported by production. No guard or root dependency change is requested.

Integration owns the final shared export manifest/artifact pins and deployment selection. Keep the reviewed base `design-0.2.0` version separate from the owner-trial scene/ability source versions until that adoption is recorded. The supplied generated CSS is packaged as a runtime derivative with only the prototype classification header replaced; validate the original source hash first and record the derived hash. Missing art must leave the approved/text fallback and usable controls.

## CONTRACT-TRIAL-1: nullable initial room

The Frontend admission reader accepts exactly `Room A`, `Room B` or explicit `null`; missing/other values remain unreadable. Lobby, admission and bot text says **Room assignment pending** for null and never guesses A/B. Old non-null records retain their room text.

Resolved by adopted shared checkpoint `670e677413bd488ce589b37190dd7dbd8ed65b5a`: the strict `FullLobbyViewSchema` now accepts the same null. The reviewed 1.3 tuple is adopted, with old Room A/B compatibility preserved. No new field or station field is requested.

## CONTRACT-TRIAL-2: FULL labels by actual ruleset

Resolved by adopted shared checkpoint `670e677413bd488ce589b37190dd7dbd8ed65b5a`: `fullRoomCapacityForVersions(versions, location)` matches exact reviewed protocol/engine/ruleset/hash tuples for 1.2 and 1.3. Historical, unknown or mixed tuples and Final Zone return null. Frontend uses it only to label public occupancy, including Eliminated seats. Server offers continue to authorize moves and targets. The scene's five drawn places are a layout, not authority to label a legacy room full. No shared station field or new network field is needed.

## CONTRACT-TRIAL-3: private spent states remain dependent

DSN-REQ-15 is unresolved for durable spent Disable, Officer shot/Hack use and Code-attempt submission where a view lacks an explicit resource flag. An unavailable offer alone is not proof of use. Frontend may decorate a known private receipt but does not manufacture persistent spent state after reload or omission. Keep these treatments explicitly unintegrated until an authorized field exists.

## Review boundaries

DSN-REQ-16 stale retention is a proposal superseded for this assignment by concealment on authorization/current-view loss. Recovery state remains internal; current-view restoration does not reopen the card. The hide control remains reachable while an authorized private sheet is open.

Public health feedback stays neutral. The prototype's hit controller is not adopted. Runtime cancellation must retain the latest authoritative pose and stop native/RAF ownership even after explicit full motion produces no frame on OS reduction. Backend capacity/initial-draw work and Designer prototype repairs remain in their owners' branches. Frontend does not merge main or deploy.
