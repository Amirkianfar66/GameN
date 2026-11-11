# Host Abort confirmation regression

Issue #219. Base: `74d64700a5b99388ca99f2c39fb7ea7a9519215e` (merged release #217). Fixed native source: `f0fdf1aeb083e5793a6c28e88e3cf233bd3a5bea`. The only native change adds `abortConfirm` to the existing running Host Settings invalidation fingerprint in `apps/game/hosted/planet/app.mjs`.

The first click already set confirmation state and called app render. The running branch compared a cached host-state fingerprint that omitted that state, so it skipped `renderer.settingsChanged()` and left the open panel stale. This existing handler/cache interaction is a UI invalidation defect; it is not attributed to a newly introduced engine bug.

- `baseline/`: actual released native source with the same excluded harness. Acceptance is explicitly **false**: the first click keeps “Abort match”, sends no abort, and reopening exposes the confirmation.
- `fixed/`: six actual native app/session/controller/renderer cases with labelled synthetic service responses. The open panel immediately shows “Confirm abort · No winner”; first click, Close and Escape send no abort. Explicit confirmation commits once. Reopening retains the existing visible confirmation state and still requires that explicit control. Dropped-abort reload recovery retries the exact original request; an externally simulated terminal publication retains a pending original game-command receipt until settled.
- `checks/`: pure/browser typecheck, two focused native session tests, all954 Frontend tests, production exclusion and the unmodified source guard’s expected refusal pending independent pin review.

Screenshots and facts include no room IDs, assigned private roles or credentials. Request identifiers are compared inside the harness and recorded only as equality booleans; raw requests and session snapshots are not exported. All facts are desktop Chromium with synthetic service responses, not live-server, multiplayer, physical-device or performance acceptance. The pre-existing successful live abort remains separate reviewer evidence.

The excluded build uses unchanged verifying asset plugins against a separate clean exact74d64700 release tree. The candidate’s loaded native module hashes are checked before and after each capture. No shared approval, hash, source guard, rules or art is relaxed.

## Reproduction

Use Node22.21.1. Keep `GAMEN_HOST_ABORT_ART_BASE` at a clean exact74d64700 worktree; the ordinary production approval fence must be updated separately by Integration for the new app hash.

```sh
npm run build
node --test apps/game/test/planet-host-abort.test.mjs
npm run typecheck
npm run test:frontend
GAMEN_HOST_ABORT_ART_BASE=/path/to/clean-74d64700 node node_modules/vite/bin/vite.js build --config apps/game/dev/host-abort/vite.config.mjs
node apps/game/dev/host-abort/capture.mjs /path/to/fixed-evidence
```

At the unmodified base, `capture.mjs /path/to/baseline-evidence --expect-stale` records the rejected baseline and its reopen behavior. The fixed acceptance path asserts the opposite label on the first click and would reject that baseline. Do not overwrite the recorded source identities when rerunning.
