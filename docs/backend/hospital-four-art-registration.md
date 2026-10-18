# Four-bed art candidate registration

Issue #155 implementation, based on Frontend `cc8e43f609f9205cb1eaf76a9f2d92a3d6a568e9`, Backend shared contract `6023d43e21b46d11fd08be963bfa1daa8f09a175` and executable ancestor `6ca4b51d5acd1454daec68c5108c8f12ee2286bf`. This registration is a candidate for consumer work. It does not change a release profile, default art identity, backend deployment or existing match.

## Frontend interface

Use `readRuntimeArtRelease(root, 'design-0.5.0')` explicitly for the candidate. Its exact gameplay agreement is protocol 2, `full-game-1.11.0`, `in-person-v1-hospital-four-2026-10-19`, rule SHA-256 `7d9d3519df8813feb1213f1ad4439cae90895af6850c223264c28907824aeb9c`. The existing eight common bundles retain their URLs and hashes. The additional `board-v2-films-art` bundle is `/art/board-v2-films.art.9e6abdef0f.css`, SHA-256 `9e6abdef0f0be32d8283dffbef9bff18898c62d4f330c8f72f9216717f1e8bbb`, 100 SVGs and 1,462,181 raw CSS bytes. Emit and preload the entire common set, never a subset selected by role, audience or game state.

`prepareBoardV2FilmsArt(root)` remains Frontend-owned. Registration includes its exact generator and catalog, the 14 new drawing modules, the existing drawing dependency closure, all 100 SVG derivatives, and immutable copies of their original Designer sources. `design/releases/board-v2-films-source-provenance.json` maps each original source to its committed snapshot and runtime derivative. Original Designer files and the separate #116 setup work are preserved.

The new art inventory identifies drawing source, drawing modules and assets. General UI consumer code is deliberately outside this art identity: its logic remains subject to Frontend and Integration review, and the full compiled application is bound by the existing `preview-release.json` file inventory and bundle digest. This avoids treating a RELEASE text correction as a change to historical art. It does not relax validation of any old manifest or permit an unreviewed deployment.

## Historical evidence is separate from build validation

`readHistoricalRuntimeArtRelease(root, version)` validates only `design-0.3.0` or `design-0.4.0`. It requires their original manifest bytes and verifies every original source/runtime digest against committed content-addressed blobs in `design/releases/historical-blobs/`. Those blobs were extracted and checked against the preserved executable commit `6ca4b51d5acd1454daec68c5108c8f12ee2286bf`; `historical-snapshots.json` records their inventory. No Git installation, fetched ancestor, network or executable historical checkout is needed to validate them.

`readRuntimeArtRelease` still validates current files strictly. It never falls back to snapshots after a content mismatch. Consequently the old default cannot certify a changed UI: a final activation must explicitly select the new reviewed candidate. Frontend should use the historical API for independent preservation checks and the current API for the selected build. Neither historical manifest has been repinned or rewritten.

## Outstanding adoption gates

The registered base drawing source is Designer combined head `cb9386bd716dc346160509d5e49d7348fdaf4f84`, with the focused `medical-four` correction from #160 at `1fbdb541ec4b8389dcf2220125b4666278a12b0e`. Do not replace the complete stack with #160: #161's separate Clone family remains preserved from its original source.

The corrected source SHA-256 is `90ae67a8cd9c5d92454417cc1a7ba5dd16172e7081ae4c5427caa013e9627ee0`; the exact runtime derivative is `9e212739636b1cff522c79f36eee64e14add6dad29aa2054cac7e4452532a1e7`. Only the recorded development header and relative imports differ. `fourFilmBerth` returns `{berth:null,plays:false,holder:null}` for a validated HV5+ presentation, rejects malformed or supplied out-of-roster anchors, and still protects another occupant's bed. `fourClinicalBerth` remains a strict bed-only primitive. Caller wire validation and stable seat identity normalization remain required. All 100 SVG derivatives and the generated common CSS identity are unchanged.

Frontend emission, uniform preloading, exact Ready agreement, authorized lifecycle rendering, normal/reduced motion and stale/cancel/reconnect behavior still need implementation and connected verification. Backend runtime, independent Balance expectations and final 7/8/9 acceptance remain separate. No browser, real-device, multiplayer, Hosting or cloud/IAM result is implied by the build-time art tests.

## Checks actually run

Node `22.21.1`: 68 focused tests passed across the runtime release validator, original and supplemental drawing-port reconstruction, common film bundle, existing Board V2 art/motion and setup art. Workspace and source-integrity checks passed. The 27 Board V2 drawing modules reconstruct exactly from their recorded original source plus declared comment/import adaptations. Historical manifest and original port-catalog bytes are unchanged from the preserved baseline.

After the #160 correction, all 70 focused runtime/art tests passed, including explicit roster-sized no-film and retained-body regressions; workspace and source checks passed again. Independently against the exact Designer source archive: 13 four-bed tests, all 14 Board V2 checks, 127 current generated files and all 40 hashes in the updated handoff passed. The new fifth-anchor, body-held and death/no-film committed pictures were inspected. No fresh Chromium capture or real-device run was performed by this source review.

The isolated tree reused local TypeScript `5.9.3` read-only for the workspace check; `npm ci`, full `npm run verify`, engine/service/emulator checks and connected/browser/device tests were not run for this art-registration change. These focused results do not satisfy the outstanding playable-release gates above.

Whitespace checking of authored changes passed. The full snapshot diff reports three pre-existing extra EOF blank lines in archived files; they are preserved because changing them would break the original SHA-256 identities.
