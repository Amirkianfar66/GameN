# Planet successor Frontend consumer

Latest independent fixes: [6 November consumer follow-up](planet-consumer-followup-2026-11-06.md). Timing baseline: [P27 presentation consumer](planet-p27-stage.md). The [PR 174 safety follow-up](planet-pr174-safety-followup.md) records the earlier capsule and Rescue corrections.

Implemented on `codex/frontend-planet-successor` in `/private/tmp/gamen-planet-frontend` from shared base `29e6ea82a31085df12ddee62758a55646eecbd3a`. This is the separate protocol-3 player, host and shared-display consumer. Integration supplies the authoritative `planetApi` service and owns shared release adoption, backend verification and activation.

The six approved specification files and owner decisions P01–P27 are the gameplay authority. Integration's refined session/event contract commit `79418e72dba99ba99afe047ecb97467fb5e73b62` was adopted as local `8275e61517abdb2846ea559ac1913ce3e10e8ff7`. The Designer production brief `376f43756f6337a1ea270926bac3aa0326cebd7a` was adopted as local `8f44dba1350321d187f7da2666d09bc9585a72ce`. Integration's P27 contract commit `aa90fbd42283813116a41922337406139ff9905a` was adopted as `5aca09986089aafe31069fe00791414631fc5dc5`. Those commits are dependencies, not Frontend-authored contract or design changes.

The consumer pins protocol `3`, engine `planet-game-1.0.1`, ruleset `in-person-planet-sync-six-2026-11-05`, ruleset hash `4f26343641fcff00480bb3c0ba852703418f772bb677117a272828ad229c8b1c`, and the existing reviewed artwork `design-0.5.0`. Unsupported tuples, audiences, identities, revisions, occupied slots, changed shown drawings and malformed receipts fail closed. The preceding unshipped 1.0.0 tuple is not migrated or relabeled. Historical protocol-2 entry points, rules, artwork and source snapshots remain separate and pass their existing tests.

## Entry and service boundary

The production build now includes `/planet/index.html`. Its entry creates an authenticated Firebase connection using the existing validated public configuration, session Auth and App Check, then sends typed POST requests to Integration's planned `planetApi` endpoint. It creates no cloud resources and changes no Firebase configuration, credentials, subscriptions or profile defaults.

`apps/game/src/planet/session.ts` consumes `PlanetSessionSnapshot` and the shared operation schema. Server-confirmed HTTP reads refresh every two seconds; requests are bounded to eight seconds. These reads supply neutral crew identities and audience-specific game views. The server owns setup transitions, bots, game deadlines and outcomes. Only fresh read timestamps calibrate the monotonic clock; timestamps returned from idempotent command retries cannot rewind a deadline.

The session UI covers host creation, player/display admission, host approval, bot count, the 30-second character window, server assignment after that window, concealed own-role reading, the 30-second minimum plus human Ready, abort, and seat recovery. Initial rooms and roles are assigned by the service. A pending public setup request can retry with its exact original ID/body across reload. Recovery secrets and role knowledge are not persisted.

`apps/game/src/planet/transport.ts` and `controller.ts` expose a separate typed game boundary. Every shared command has a review/registration path. A game receipt means registration; the next authorized view supplies the outcome. Game-command storage contains only protocol/match/phase/command IDs and the owning UID/seat. The private command body stays in memory for an exact retry. Reload can check the original receipt without reconstructing that body. Missing, delayed and mismatched receipts keep the unknown barrier; closing a private panel hides its labels without clearing that barrier.

## Player and display behavior

- Public office appointment and the voluntary-movement block use offered on-board identities. Captain RELEASE/EJECT show independent authoritative used/available states and confirm their physical-Jail scope.
- Private navigation shows position/final direction only to an authorized office. Tie choice and sequential acknowledgements remain distinct. Public feedback supplies movement completion and the final arrival result, with no faction totals or colored public route.
- Engineer suppression, secret Blackhole, Clone, Protection, Supply, Scan/cooldown, the single Code and separate ship-hack activation use current offers and current resource facts. No client-side resolution, resource refill or Round-5 ending is introduced. Insider's trio is displayed as sorted identities without role-to-player pairing.
- A room label leads to its offered empty positions. Room controls are disabled when the current offer has no empty slot there. Same-room repositioning has an explicit movement-cost confirmation.
- Hospital panel guesses use original player numbers. Registration is separate from healing; no patient receives the Doctor's remaining inventory as a guessing oracle. Medical rest states use the supplied admission/deadline metadata, including rounds beyond five.
- Promises have six fixed terms, exact recipient/target/round, acceptance, both lifetime quotas, offer lifecycle and the four authoritative result states. Current scene positions never resolve a Promise locally. Own ballot recovery uses the supplied phase/selection.
- Windows use the three endpoint links and four stations, current-round ordered drawings, author labels, bounded vector input and immutable Show. Hospital/Jail are view-only. Movement blocking does not disable an existing station. The lit Blackout preview remains usable where offered; darkness clears unsent drawing/Show visuals and hides window data and occupants. Fixed dark-slot controls remain in the bound room.
- Shared screens label the last finalized board while showing live turn, time, offices and talk pair. Phones draw their authorized current board without world/reality labels. Only terminal results reveal roles and original Code.

## Artwork and motion

The renderer feeds genuine Planet presentation DTOs into the existing pure scene, geometry, rig, wardrobe and film painters. It does not construct a legacy wire view. [Art adoption](planet-successor-art-adoption.json) records the exact reused imports and SHA-256 values; each is byte-identical to the reviewed base. Existing source/provenance records and Designer assets are unchanged.

Medical admission/rest, the ceiling-drone Rescue, flatline, Captain RELEASE/EJECT, overflow/offboard treatment, private Clone, Blackout, room-scoped blocked-attack effects and the public talk capsule use the reviewed drawing ports. Successful Rescue uses a machinery-only vignette while the healthy current token and nameplate stay at their authoritative A/B or Jail slot; no participant is copied or hidden by that vignette. The new occurrence director requires the correct audience, phase/revision, publication time, fixed expiry and clinical anchor. Initial/reconnected/hidden states consume no historical movie. Reduced-motion changes cancel owned effects and restore figures before unchanged-state processing. Continuous visible phase expiry can still receive a newly resolved occurrence; a disconnected baseline cannot replay history. Block effects after Blackout wait for the approved lights-return interval and have no defense-cause input.

The owner-approved six-second `BLACKHOLE_PRESENTATION` has a cue inside the existing status header. Voting remains closed until a separate authoritative `JAIL_VOTE` starts its full 60-second interval. Late entry and reconnect seek or snap within the supplied interval; expiry waits for the server. A current Sync/outcome or terminal state takes precedence over the board-only capsule exit. Claude's reviewed Blackhole ship passage/video pilot and any Engineer-specific held device are pending. Engineer uses the selected neutral crew portrait, and Doctor uses the existing rescue-device illustration with corrected current text. No PR #174 footage, sound or Designer source artwork is adopted. The larger cinematic library remains with Claude under the adopted production brief.

## Verification and evidence

The final run uses Node `22.21.1` and npm `10.9.4`. All 820 Frontend tests passed (211 presentation and 609 game, including 76 Planet tests), with zero skipped/cancelled tests. All 16 successor and 26 legacy contract/fixture tests passed. Build, both typecheck programs, workspace/source checks, unchanged-art comparison, production build and production-bundle exclusion passed. The phone run passed 100 synthetic cases and 12 interaction/motion flows, saving 46 selected screenshots with zero runtime errors or page overflow. The P27 follow-up adds 24 browser flows and 36 screenshots; the refreshed motion safety run retains 16 checks and 16 screenshots. Reproduce from the repository root:

```sh
npm ci
npm run build
npm run typecheck
node scripts/test-frontend.mjs
node --test tests/bootstrap/planet-contract.test.mjs
npm run test:contracts
npm run check:workspace
npm run check:sources
./node_modules/.bin/vite build --config apps/game/hosted/vite.config.mjs
node apps/game/scripts/check-production-exclusion.mjs --bundle "$PWD/dist/hosted-preview"
./node_modules/.bin/vite build --config apps/game/dev/planet/vite.config.mjs
node apps/game/dev/planet/capture.mjs docs/frontend/evidence/planet-successor
node apps/game/dev/planet/capture-stage.mjs
node apps/game/dev/planet/capture-review-safety.mjs
```

The Frontend suite includes every command form, privacy/identity/revision guards, unknown/exact retry, reload receipt lookup, setup timing, window permissions/darkness, immutable drawings, authoritative Promise states, medical anchors, terminal cancellation and source-free room-block motion. The historical suites remain included. The production scan verifies that the synthetic harness, test modules and development markers are absent from the shipped bundle. The build reports a large-chunk advisory; no phone performance budget is claimed from it.

[Evidence facts](evidence/planet-successor/facts.json) record the browser, starting roster, dimensions, motion preference, DOM checks, saved screenshot paths, touch/keyboard flows and runtime errors. The matrix covers 320×568 and 390×844 with normal/reduced motion, plus default boards for 7/8/9. Screenshots are selected examples; the remaining cases retain measured DOM facts. The live-flow checks cover movement confirmation, private closure, drawing/Show, minimum-reading Ready, Doctor drone/cancellation/reconnect, authorized Sync, fixed Blackout selection, keyboard Code, capsule entrance/full server talk time and the room-block shield.

This evidence is explicitly synthetic in headless desktop Chromium. Firebase-emulator end-to-end, hosted authenticated multiplayer, physical phones, assistive-technology acceptance and human playtests have not been run in this Frontend worktree. Integration must verify the authoritative service/engine combination and approve the new tuple's existing-art pairing before activation. No deployment or activation was performed.
