# Planet successor Frontend consumer

Implemented on `codex/frontend-planet-successor` in `/private/tmp/gamen-planet-frontend` from shared base `29e6ea82a31085df12ddee62758a55646eecbd3a`. This is the separate protocol-3 player, host and shared-display consumer. Integration supplies the authoritative `planetApi` service and owns shared release adoption, backend verification and activation.

The six approved specification files and the 26 owner decisions are the gameplay authority. Integration's refined session/event contract commit `79418e72dba99ba99afe047ecb97467fb5e73b62` was adopted as local `8275e61517abdb2846ea559ac1913ce3e10e8ff7`. The Designer production brief `376f43756f6337a1ea270926bac3aa0326cebd7a` was adopted as local `8f44dba1350321d187f7da2666d09bc9585a72ce`. Those commits are dependencies, not Frontend-authored contract or design changes.

The consumer pins protocol `3`, engine `planet-game-1.0.0`, ruleset `in-person-planet-2026-11-05`, ruleset hash `32cde63d777ed93744637f911c134247272dc862524bd5aa9d0c3cd405dbe8ea`, and the existing reviewed artwork `design-0.5.0`. Unsupported tuples, audiences, identities, revisions, occupied slots, changed shown drawings and malformed receipts fail closed. Historical protocol-2 entry points, rules, artwork and source snapshots remain separate and pass their existing tests.

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

Medical admission/rest, the ceiling-drone Rescue, flatline, Captain RELEASE/EJECT, overflow/offboard treatment, private Clone, Blackout, room-scoped blocked-attack effects and the public talk capsule use the reviewed drawing ports. The new occurrence director requires the correct audience, phase/revision, publication time, fixed expiry and clinical anchor. Initial/reconnected/hidden states consume no historical movie. Reduced-motion changes cancel owned effects and restore figures before unchanged-state processing. Continuous visible phase expiry can still receive a newly resolved occurrence; a disconnected baseline cannot replay history. Block effects after Blackout wait for the approved lights-return interval and have no defense-cause input.

The Sync event currently has a native luminous title and settled-board treatment. Claude's reviewed Blackhole ship passage/video pilot and any Engineer-specific held device are pending. Engineer uses the selected neutral crew portrait, and Doctor uses the existing rescue-device illustration with corrected current text. No new cinematic footage, sound or Designer source artwork is claimed. The larger cinematic library remains with Claude under the adopted production brief.

## Verification and evidence

The final run uses Node `22.21.1` and npm `10.9.4`. All 806 Frontend tests passed (208 presentation and 598 game, including 65 new Planet tests), with zero skipped/cancelled tests. All 15 successor contract tests passed. Build, both typecheck programs, workspace/source checks, unchanged-art comparison, production build and production-bundle exclusion passed. The phone run passed 100 synthetic cases and 12 interaction/motion flows, saving 46 selected screenshots with zero runtime errors or page overflow. Reproduce from the repository root:

```sh
npm ci
npm run build
npm run typecheck
node scripts/test-frontend.mjs
node --test tests/bootstrap/planet-contract.test.mjs
npm run check:workspace
npm run check:sources
./node_modules/.bin/vite build --config apps/game/hosted/vite.config.mjs
node apps/game/scripts/check-production-exclusion.mjs --bundle "$PWD/dist/hosted-preview"
./node_modules/.bin/vite build --config apps/game/dev/planet/vite.config.mjs
node apps/game/dev/planet/capture.mjs docs/frontend/evidence/planet-successor
```

The Frontend suite includes every command form, privacy/identity/revision guards, unknown/exact retry, reload receipt lookup, setup timing, window permissions/darkness, immutable drawings, authoritative Promise states, medical anchors, terminal cancellation and source-free room-block motion. The historical suites remain included. The production scan verifies that the synthetic harness, test modules and development markers are absent from the shipped bundle. The build reports a large-chunk advisory; no phone performance budget is claimed from it.

[Evidence facts](evidence/planet-successor/facts.json) record the browser, starting roster, dimensions, motion preference, DOM checks, saved screenshot paths, touch/keyboard flows and runtime errors. The matrix covers 320×568 and 390×844 with normal/reduced motion, plus default boards for 7/8/9. Screenshots are selected examples; the remaining cases retain measured DOM facts. The live-flow checks cover movement confirmation, private closure, drawing/Show, minimum-reading Ready, Doctor drone/cancellation/reconnect, authorized Sync, fixed Blackout selection, keyboard Code, capsule entrance/full server talk time and the room-block shield.

This evidence is explicitly synthetic in headless desktop Chromium. Firebase-emulator end-to-end, hosted authenticated multiplayer, physical phones, assistive-technology acceptance and human playtests have not been run in this Frontend worktree. Integration must verify the authoritative service/engine combination and approve the new tuple's existing-art pairing before activation. No deployment or activation was performed.
