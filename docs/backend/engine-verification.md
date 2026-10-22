# Pure engine checkpoint for issue #2

Reviewed bootstrap base: `333c9e820f362a211352bc689372663f29b73ac4`. Rule manifest SHA-256: `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`. Engine pin: `0.1.0-officer-slice`; existing audience protocol 1 is unchanged.

On 6 October 2026, Node 22.21.1/npm 10.9.4 built the engine and passed **18 engine tests**, with zero failures/skips. Tests cover reservation, eligibility/deadline boundary, paired defense-neutral projections, actor-status survival, Protection activation/consumption, duplicate/stale deadlines, delayed full-minute turns, explicit completed-vote prerequisites, deterministic replay and private journal preservation. Canvas and rule-source integrity checks passed.

Commands:

```sh
npm ci
npm run verify
node --test packages/engine/test/*.test.mjs
```

The engine reads no clock, randomness, Firebase or renderer. Synthetic initial state and recorded remaining turns live only under `packages/engine/test/`. Both defense variants use the same neutral audience identifiers. Public/player projections explicitly select allowed fields.

This is the pure engine prerequisite for the separately reviewable Firebase adapter. It does not prove transactional deduplication, Auth/Rules, real job delivery, connected devices or balance. Adapter-owned private journal sequence and caller-scoped receipts must be persisted atomically by that later change.

The integration harness fixes locations, a recorded Round 2 turn order, one attack, powers off and a completed no-jail vote. Expiry closes the last ordinary turn privately; only internal resolution with the completed-vote prerequisite opens the untimed attack checkpoint. Hospital relocation, subsequent resolution stages and full V1 are outside this change. Self-shooting, target movement, competing effects and result disclosure remain unresolved. Affected Game Balance/contract review and integration review are required before adoption/merge; no canon change is proposed.
