# Approved Planet library runtime adoption

The native build now includes Integration's exact 18 approved files for `design-0.6.0`: eight common library stylesheets and five identity-free MP4/poster families. All eight library groups are represented. The consumer activates this supplement only for the exact protocol 3 / `planet-game-1.1.0` / `in-person-planet-private-feedback-2026-11-06` / `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa` pairing with `assetManifestVersion: design-0.6.0`. Existing matches retain `design-0.5.0` and its unchanged files.

The separate contract/correction checkpoint is `2ba13170ac49b790db637532fdd41a8091e72740`; its [review and evidence](planet-private-feedback-consumer.md) remain independently reviewable. Integration approval `47417a57478a7be2bad9ef5c492b09a1e39132d4` was adopted as the documentation-only commit `ea4474a38d6612919dc82f7ed5eb46020529c3fe`. This artwork step imports no Designer branch ancestry or Backend engine implementation.

## Exact source and build fence

[The adoption inventory](planet-library-art-adoption.json) records source/publication paths and full hashes. Designer head is `0fb17a35c4b2fdd3418c9ffb575dbd4a7d0d9878`, explicitly replacing `ff7b689a17282e63606506bbf151d79c7da858fc`. The 18 retained source files are byte-identical at both heads. PR184 withdrew the two EJECT exterior files, which remain absent from the source candidate directory, runtime catalogue and build output.

The build pins [Integration's approval](../integration/planet-library-art-approval-2026-11-06.json) to SHA-256 `9493e29a8ce1b06c6848846b0c8932d65c42abcb24b2b43aaf35ed7239aaf228`. It checks the exact approved input bytes, lengths, output hashes, paths and catalogue membership. The only CSS derivative removes the single leading development-only marker, as approved; no declaration or encoded SVG changes. Media is copied exactly. Raw candidates retain their original bytes and development marker as source evidence.

The original 18 inputs total 4,255,704 bytes; published local outputs total 4,255,520 bytes after the eight approved comment edits. The eight stylesheets contain 80 SVG assets. The build still validates the existing base through the original shared `design-0.5.0` gate. The adoption check verifies that all nine base stylesheet outputs are byte-unchanged and that withdrawn EJECT bytes and candidate URLs are absent.

## Loading and match selection

Every Planet app requests the same eight new stylesheets before consulting a private role. Loaded flags activate only after a verified session selects the new exact pairing. Historical pins keep the flags off, so merely downloading a common stylesheet cannot replace the old portrait, keypad or board marks. Unknown/mixed artwork pairings fail closed, including a session envelope whose game-view versions differ.

Every active new-art player and display preloads the same five video/poster families, regardless of role. Private panel opening, Engineer use, patient input and navigation choice never select a revealing URL. Missing CSS gives a plain-text or existing-art fallback. Missing/blocked media leaves the board and existing status words; neither load completion nor animation callbacks alter a server phase. Loaded resources, listeners, local drawings and optional effects retain their cleanup and concealment behavior.

## Native presentation

| Group | Runtime composition |
| --- | --- |
| Hack and Engineer | Private current ability file, offered actions, and server-fixed Engineer capture, including empty capture. The Engineer device is new-art-only. |
| Navigation | Office-private static route, neutral `NAV_SETTING` copy and offer-gated choice/acknowledgement. Historical `NAV_TIE` remains historical. |
| Hospital panel | Numeric keys carrying canonical `seat-N`, patient's authorized request status and uniform `NO_INJECTION` feedback. No inventory or health inference. |
| Promises | Six compact choices, giver-only Meet terms and authoritative lifecycle/status. |
| Windows | Station marks, bounded drawing tools, immutable Show and the first five lit Blackout seconds. |
| Offices | Public office/block marks below labels and interaction targets, with registration separate from outcome. |
| End states | Authoritative winner, Code and role reveal. Colored film requires the matching terminal destination and winner. |
| Successor setup | Compact Join/Host/Recover forms, room-code plate and the new Engineer device within a verified match. Pending admission stays unauthorised. |

The Blackhole underlay binds literal `BLACKHOLE_PRESENTATION` and seeks within its existing six-second interval. It never falls back to starting at `JAIL_VOTE`, whose separate full 60 seconds remain intact. Neutral transit requires a new public movement occurrence. Colored arrivals animate only after a continuously observed authoritative terminal transition; initial/foreground/reconnected terminal views stay static. Reduced motion uses a brief poster when timely, otherwise the static terminal fallback. No extra wait is introduced for either treatment.

The approved drone media is packaged and preloaded. Rescue continues to use the existing guarded machinery-only painter: the common full-board raster underlay is not used as a clinical performance. The painter checks four-bed/anchor occupancy and keeps the current healthy figure, nameplate and hit target at the authoritative A/B or detained Jail placement. S7 remains the only EJECT treatment; S2 capsule exit remains on the board. No review/stills video, covering EJECT, Supply delivery cue or audio is adopted.

## Shared release proposal for Integration

The native build/runtime wiring is complete locally under the exact approval gate. Integration still owns the central release registry and service selection. [The proposed immutable release](planet-design-0.6.0-release-proposal.json) contains all inherited source/runtime inventories, 17 stylesheet bundles and five media pairs. [The requested shared changes](planet-art-shared-changes.json) specify its intended target `design/releases/design-0.6.0.json`, exact SHA-256, and the required additions to `scripts/runtime-art-release.mjs` and `scripts/check-sources.mjs`.

Those shared files were not edited by this thread. Their historical entries and active default must remain intact. Integration must adopt the reviewed new registry entry and combine the new service/gameplay/art pairing before selecting a new live profile. R14 requester standing, deadline persistence, unchanged audience writes and combined service/release verification remain Integration's work. R9/R11 history remains deferred and R15 has no authorized marker, so Supply stays inventory-only.

## Verification

All 850 Frontend tests pass: 216 presentation and 634 game, with no failures, skips or cancellations. The focused Planet run passes 109 cases. The previously adopted shared contract remains unchanged; its 23 Planet and 26 historical contract/fixture checks passed at the contract checkpoint. Build, both typecheck programs, workspace/source checks, production build and production fixture exclusion pass. The build retains its existing large-chunk advisory; no device performance budget is claimed.

[Approved-art and contract browser facts](evidence/planet-approved-art-contract/facts.json) include 40 passing cases. They measure actual initiated requests for the same complete 18-file catalogue on Hacker, Engineer, Doctor, Alien and display views, and check live neutral transit, matching terminal arrival, static reconnect, current private records, historical dispatch and full-window controls. [The library matrix](evidence/planet-approved-art-library/facts.json) checks all eight groups and usable current Rescue figures at 320×568 and 390×844, normal/reduced motion. Refreshed consumer, safety, P27 and shell evidence is listed in [the final verification manifest](planet-approved-art-verification.json), with exact source, artifact and evidence hashes.

All browser authority is synthetic through the native consumer in desktop Chromium phone emulation. Real service/Firebase, authenticated hosted multiplayer, Safari, physical phones, screen readers, human playtests and media/audio performance acceptance remain unrun. No merge, deployment, public publication or live profile activation was performed.

Reproduce the build and focused browser checks:

```sh
npm run test:frontend
npm run typecheck
npm run check:workspace
npm run check:sources
./node_modules/.bin/vite build --config apps/game/hosted/vite.config.mjs
node apps/game/scripts/check-production-exclusion.mjs --bundle dist/hosted-preview
node apps/game/scripts/check-planet-art-adoption.mjs dist/hosted-preview
./node_modules/.bin/vite build --config apps/game/dev/planet/vite.config.mjs
node apps/game/dev/planet/capture-private-feedback.mjs docs/frontend/evidence/planet-approved-art-contract
node apps/game/dev/planet/capture-library.mjs docs/frontend/evidence/planet-approved-art-library
```
