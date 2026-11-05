# P27 Blackhole presentation consumer

The Planet Frontend now consumes the owner-approved six-second `BLACKHOLE_PRESENTATION` phase before a separate full Jail vote. The presentation remains an unobstructed status-header fallback using the existing artwork. Designer PR #174 assets are not adopted.

Integration commit `aa90fbd42283813116a41922337406139ff9905a` was adopted as `5aca09986089aafe31069fe00791414631fc5dc5`, following Frontend safety commit `4e68b73776905b6d6041ef771be4f503d06becc8`. Frontend reviewed the new exact tuple, phase kind, fixed duration and public/player projection fields. The existing phase ID, `startedAt`, `endsAt` and fresh server-clock samples provide the required consumer timing; no additional wire fields were needed. Integration owns the adopted shared contract, specifications, authority manifest and contract tests. This follow-up changes only Frontend-owned paths.

The consumer accepts protocol `3`, engine `planet-game-1.0.1`, ruleset `in-person-planet-sync-six-2026-11-05`, ruleset hash `4f26343641fcff00480bb3c0ba852703418f772bb677117a272828ad229c8b1c` and the existing reviewed `design-0.5.0` artwork. The predecessor 1.0.0 candidate and historical protocol-2 pins are not migrated or relabeled.

## Behavior

- `planetBlackholePresentation` derives elapsed time and progress from the current authoritative interval and monotonic server clock. Initial entry, duplicate reads and foreground refresh seek or snap within that same interval. It owns no timer and sends no command.
- The header displays Blackhole Sync during the phase. At zero, it displays “Waiting for server” while retaining the supplied phase. Local animation completion cannot create a vote or move a deadline. Non-Blackhole rounds receive no local presentation stage.
- Jail ballots are unavailable until an authoritative voting phase arrives. Movement, Hospital-panel registration and Pass are also suppressed during presentation, including contradictory stale offers. A higher revision cannot retime an existing Sync phase ID.
- A fresh `JAIL_VOTE` consumes its own authoritative 60000-millisecond interval, including a server start after the presentation deadline. The client does not subtract presentation time. Meet A/B Promise statuses remain supplied by the server and change only with its actual voting snapshot; other Promise opportunities are unchanged.
- Presentation consumes occurrence IDs without starting optional historical films or Clone transitions. Current Sync takes priority over the board-only capsule return even when its event is absent on reconnect. Missing artwork and reduced motion leave phase progression independent of film completion.
- Current Rescue tokens, nameplates and targets remain at their authoritative healthy A/B or Jail positions. The existing machinery-only vignette, clinical-anchor checks and bed-reuse cancellation remain intact.

## Verification

All 820 Frontend tests pass: 211 presentation and 609 game, including 76 Planet game tests. The 16 successor contract tests and 26 legacy contract/fixture tests pass. Build, both typecheck programs, workspace/source integrity, unchanged reviewed drawing/art bytes, production build and production-bundle exclusion pass. No tests were skipped or cancelled. The production build retains its existing large-chunk advisory; this is not a phone performance claim.

The [P27 browser facts](evidence/planet-p27-stage/facts.json) record 24 passing flows and 36 screenshots across 320×568 and 390×844 with normal and reduced motion:

- The stage remains active beyond the old short cue duration and ignores animation/media completion events. Both meeting participants can already occupy the promised room while the Promise stays Pending.
- Expiry waits for a new server snapshot; the deliberately delayed voting snapshot supplies a fresh full minute and Fulfilled meeting status. Real browser taps submit a ballot against the new phase ID.
- Entry 3.5 seconds into presentation, duplicate delivery and foreground refresh retain the original start/end. Return after presentation displays the current vote without replay.
- All artwork requests are blocked before the first read. The header and phase flow still work; restoring the common art after voting starts does not replay Sync.
- Ordinary rounds enter voting directly, and the shared display keeps its checkpoint and nonoccluding header treatment.

The broader [phone matrix](evidence/planet-successor/facts.json) was refreshed: 100 cases, 12 flows and 46 selected screenshots. The [motion safety run](evidence/planet-pr174-safety/facts.json) was refreshed for P27: 16 cases and 16 screenshots, covering clear vote targets after presentation, a header-only shared-display cue, free/detained Rescue geometry, ward visibility and reused-bed cancellation. All three browser runs report zero runtime exceptions. The phone matrix and P27 ballot checks report no page overflow.

Reproduce after the workspace build:

```sh
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
node apps/game/dev/planet/capture-stage.mjs
node apps/game/dev/planet/capture.mjs docs/frontend/evidence/planet-successor
node apps/game/dev/planet/capture-review-safety.mjs
```

## Runtime dependencies and limits

Integration must supply and verify the matching protocol-3 service/engine: persisted Sync interval and deadline intent, no early ballots or repeated Sync, a fresh full vote at the actual transition, authoritative Promise settlement and audience-safe projections. The consumer does not implement those server rules.

All browser evidence uses synthetic authoritative snapshots through the production consumer in desktop Chromium phone emulation. Combined engine/service or Firebase-emulator end-to-end, hosted authenticated multiplayer, physical phones, assistive-technology acceptance and human playtests remain unrun here. Integration review and existing-art pairing approval remain required before activation. No deployment, activation or Designer artifact publication was performed.
