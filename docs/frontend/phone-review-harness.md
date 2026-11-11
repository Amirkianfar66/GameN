# Native phone review build

Build the candidate's native interface against a separate clean approved-main snapshot. This review build does not grant production source or Designer visual approval.

```sh
git fetch origin main
git worktree add --detach /private/tmp/gamen-phone-review-art origin/main
npm ci
npm run build
GAMEN_PHONE_ART_BASE=/private/tmp/gamen-phone-review-art node node_modules/vite/bin/vite.js build --config apps/game/dev/phone/vite.config.mjs
```

The default output remains `/private/tmp/gamen-phone-preview`, consumed by the comparison tool in PR #223. Existing scenarios, controls and `planetHarness` hooks remain unchanged. `GAMEN_PHONE_BLACKOUT=1` and `GAMEN_PHONE_CONNECTED=1` retain their existing output folders.

The art worktree must be clean and its commit must belong to the candidate repository's fetched `origin/main` history. Every relative JavaScript dependency of the four asset plugins is compared against both that snapshot's committed and on-disk bytes. A stale baseline with different verification tooling is rejected: create a fresh clean baseline from current main. The unchanged production plugins still verify the complete immutable assets, source approvals and native ports against the baseline. Changed candidate UI is recorded separately for review, and remains subject to Integration's production source admission.

`review-provenance.json` records the exact candidate head/modules/review tools, the baseline head and fetched main head, the full asset-tooling closure and generated asset hashes. Keep this file with every comparison. A successful build does not accept existing design differences or close issue #222. Each interface PR names its changed part IDs and requires Designer's visual acceptance, with 390×844 captures and 320×568 at 200% text where text is involved.

Run focused baseline guards with `node --test apps/game/test/phone-review-base.test.mjs`. No physical-phone, Safari, VoiceOver, multiplayer or performance result follows from this synthetic desktop harness.
