# Planet private feedback consumer

The native consumer now supports the reviewed protocol 3 tuple `planet-game-1.1.0` / `in-person-planet-private-feedback-2026-11-06` / `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa`. Historical 1.0.0 and 1.0.1 packets retain their exact tuples, omitted new fields and historical navigation phase. This is a Frontend implementation and local verification, with Integration responsible for service and combined release verification.

## Shared contract review

Review found no material consumer blocker in Backend's `2b88a3676923efc41c0fab61b14b28ee609aec2f`. P28's owner record `8572fc0abb717ab07e09b4db3c25d6748ec8800b` was adopted locally as `ca90acef90cef5e100e15b1086b1142efdec726a`; the shared contract was adopted as `7c6ad3d715663c802349f21bf74cbbce27ca7909`. The Frontend implementation starts from `ef98b49408ffba68d2924be63cc536a10091a8a9`. No Backend engine commit was imported and no shared contract was edited after adoption.

The review checked strict tuple dispatch, phase/duration validation, required nullable new fields, historical field omission, public/private packet separation and receipt binding. `NO_INJECTION` has no tuple field in the receipt itself; the consumer therefore requires a verified new-version match and a compatible original panel request before using that feedback. A historical or mismatched rejection remains uncertain with its original recovery identifiers.

## Consumer behavior

- `NAV_SETTING` is the literal neutral 15000ms phase on the new tuple. Public status and Captain copy say “The course is being set.” Eligible Officer choices come only from private legal offers. An accepted early choice does not change the interval, reveal a public direction or open confirmation. At expiry the consumer waits for a new authoritative view. Later confirmation windows retain their full supplied duration, and acknowledgement buttons follow offers.
- `NAV_TIE` remains a historical-tuple phase. A continuing match cannot silently switch any tuple component. Same-id `NAV_SETTING` and `BLACKHOLE_PRESENTATION` intervals cannot restart or shrink through a newer revision.
- Engineer's own card reads `abilities.engineerCapture`, including an empty used capture. Current room occupants remain a preview until the server supplies a record. Later movement cannot rewrite captured identities; other panels and the public model contain no capture.
- The Hospital panel reads only the patient's `panelRequest`. `WRONG`, `QUEUED`, `TREATED`, `NO_EFFECT` and `DISCARDED` remain distinct. QUEUED means a reservation, never confirmed treatment. Current health/location and the Doctor's remaining pool never manufacture an outcome. Historical missing records use generic used/unavailable text.
- An authorized `NO_INJECTION` says the attempt was not spent. An unchanged refresh cannot erase that feedback immediately. Closing, hiding or starting a new action clears its private wording; the ordinary unresolved-command barrier and original identifiers remain intact when a receipt cannot be verified.
- R15 has no delivery marker in this contract. All weapon-count and stage inference for Supply has been removed. Inventory is shown at rest even after the actual Round 3 opportunity or a Blackhole Sync.
- Numeric keypad labels still carry canonical `seat-N` commands. Giver-only Meet terms, the first five lit Blackout seconds, current Rescue figures/targets, board-only capsule exit and S7 EJECT remain intact.

## Designer source correction

The proposal moved explicitly from `ff7b689a17282e63606506bbf151d79c7da858fc` to PR184 head `0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878`. The 18 retained CSS/media candidates are byte-identical at both heads. The two withdrawn EJECT exterior files were removed from the candidate inventory, loader and local candidate directory. Their hashes remain recorded as withdrawn evidence; every review/stills path remains excluded.

Designer R16's missing-phase note is stale: the consumer binds `BLACKHOLE_PRESENTATION` directly and never starts that film at `JAIL_VOTE`. Designer's `NAV_TIE` reference maps to `NAV_SETTING` only under 1.1.0. R9 historical hack round and R11 acknowledgement history remain deferred. No historical boolean or availability flag is presented as such a record.

Integration approval `47417a57478a7be2bad9ef5c492b09a1e39132d4` subsequently approved the exact 18 named assets and allocated `design-0.6.0`. Native production-art wiring is a separate Frontend commit after this contract/correction checkpoint; see [approved runtime adoption](planet-approved-art-runtime.md). This checkpoint's production build still excludes the candidate bytes and URLs, and accepts the existing `design-0.5.0` pairing.

## Verification

All 845 Frontend tests pass: 215 presentation and 630 game. The focused Planet run passes 104 cases. All 49 contract cases pass: 23 Planet and 26 historical contract/fixture cases. Build, pure/browser typecheck, workspace/source integrity and production build/exclusion pass. The provenance check verifies 18 candidates across all eight groups, including direct comparison with the new Designer Git object, and excludes their original/proposed bytes and the withdrawn EJECT hashes from production. The existing large-chunk advisory remains.

[New-contract browser facts](evidence/planet-private-feedback/facts.json) cover fixed-window Officer actions and public copy, late full confirmation, empty Engineer capture, all five patient statuses, uniform panel rejection, inventory without a marker, and historical tuple dispatch. The browser run uses 320×568 and 390×844 with normal/reduced motion. These are synthetic authority snapshots through the native consumer in desktop Chromium, with no service/engine or physical-device claim. [Verification details](planet-private-feedback-verification.json) record source/evidence hashes and exact passing case counts.

Existing native library, admission/recovery, cinematic safety, P27 and successor-shell browser checks were also refreshed under the new shared contract. Final production-art evidence is recorded separately so the two checkpoints remain reviewable.

Integration still owns R14 requester standing, service persistence/deadline dispatch, audience-safe unchanged-write suppression, packaging and combined release verification. No merge, deployment or live profile activation was performed. Real service/Firebase, authenticated hosted multiplayer, Safari, physical devices, audio/performance and assistive-technology acceptance remain unrun here.
