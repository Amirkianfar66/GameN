# Staged browser dependency proposal verification

Issue [#27](https://github.com/Amirkianfar66/GameN/issues/27) prepares the existing reviewed browser dependency patches as one focused draft for Frontend/Balance review. Changes are present only in this isolated proposal candidate; publication is not adoption approval.

## Base, commits and scope

- Branch: `codex/v1-browser-dependency-adoption`.
- Exact base: `b731c971e94b1f888303effa63deffa524a89268`, integration candidate [#26](https://github.com/Amirkianfar66/GameN/pull/26).
- Stage A commit: `f89c9149f0f3f7e15b3a89c922167657f317a099`, adding only the app manifest, app TypeScript configuration and root lockfile patch.
- Firebase commit: `6ea1c0dd3136253d20b8ed7e1c3898159ccfb05d`, adding only the app manifest and root lockfile patch after Stage A.
- Isolated managed worktree: `/Users/amirkianfar/.codex/worktrees/v1-browser-dependency-proposal/GameN`.

The two reviewed patches applied without correction. Stage A patch SHA-256 is `b89f44cf64618cdbacfecf82f9f98f9d704427f4747d1eb635416b05dbc535af`; Firebase patch SHA-256 is `25a05b7e75463597e4948e807d3adf24ff14784fd074df19d36186d6aecc028f`. They remain preserved as review artifacts. This verification handoff is the only additional source file. The PR records the exact published head, including this document.

For this proposal branch, the app manifest/config and root lock contain the patches. This supersedes the inherited `browser-dependencies.md` statements that those files are untouched; that document records the earlier unapplied proposal. Its 461-test count is historical. Current executed verification is 466 tests below. Of the 112 pinned Frontend-owned files, 110 remain byte-identical; only the two explicitly proposed app configuration files differ.

Stage A pins React/React DOM and their declarations to `19.3.0`, Vite to `8.3.3`, and the React plugin to `6.1.2`. It enables DOM/DOM.Iterable and JSX/TSX only in the app's build configuration. Firebase pins the modular web client to `12.18.0`; the separately recorded `12.19.0`/Temporal declaration incompatibility is not bypassed with ambient types, a polyfill, compiler upgrades or `skipLibCheck`. Version rationale and registry evidence remain in [browser-dependencies.md](browser-dependencies.md).

All 835 original lock entries retain their versions, resolved URLs and integrity hashes. Existing non-app package dependency maps are unchanged; the original `apps/game` entry adds the proposed dependency maps. The final lock has 919 entries. Existing npm `devOptional`, `optional` and `peer` usage flags change where the new dependencies require existing packages; these are part of the exact reviewed lock delta, not package upgrades. `npm ci` leaves the committed lock unchanged.

Root manifests, scripts, CI, shared contracts, pure-package configurations, engine/service/infrastructure source, source locks, canon and Frontend UI/transport remain unchanged. The inherited Frontend consumer is still the #26 pin, `ba716d71b3c5a2e15acf3cd80c4bb458e657fc9f`. Newer Frontend commits and active Claude drafts are excluded. No R3F/Three.js, GSAP, Playwright or accessibility tooling is added.

## Actual local verification

Commands ran on 6 October 2026 using Node `22.21.1`, npm `10.9.4` and Java `21.0.12.1`:

| Command/check | Executed result |
| --- | --- |
| `npm ci` | Passed clean installation, 886 packages; no peer/engine conflict; lock unchanged |
| `npm run verify` | Passed 466 tests: 25 bootstrap/contracts + 79 engine + 46 backend + 11 tooling + 95 presentation + 210 game; zero failures/skips/todos/cancellations |
| Production exclusion | Passed: 31 reachable modules, 91 scanned files, 17 labeled development files; no forbidden fixture/test/development module or marker |
| `npm run check:browser-dependencies` | Passed strict real JSX and modular Auth/Firestore/App Check declarations, React/Vite synthetic bundle and exclusion |
| `npm run test:emulator` | Passed 35 tests; zero failures/skips/todos/cancellations; clean emulator shutdown |
| `npm run package:backend -- --verify-install` | Passed isolated production installation/import and forbidden-source scan |
| Existing lock resolutions and diff scope | Passed all original entries and exact three dependency-change paths; no patch corrections |

The local packaged artifact SHA-256 is `ddce0f22c7b9c9dbd620f384a7e9ebd6cddb3b19c364f86c9d84fea16a4da4ba`; compiled package fingerprint is `d24c051049a212376239603a4286c360c176125475c3927239e65b6b4553592c`. The artifact fingerprint includes the dependency lock; the compiled fingerprint is unchanged from #26.

The compatibility probe compiles and bundles exported synthetic functions without invoking them. It creates no Auth/Firestore connection, App Check attestation, rendered UI or Firebase project. It remains an explicit probe outside `verify`. The unchanged standard CI workflow must execute clean installation, complete root verification, Java-21 emulator tests and standalone package verification; the PR records the completed run and published head. No existing suite or exclusion gate is skipped or weakened.

## Adoption gates and next consumer work

This draft depends on #26 and both of its review stacks: Backend #11 → #12 → #16 → #17 → #20 → #22 → #24, and Frontend #15 → #18. Frontend and Balance must record acceptance or requested changes before shared adoption; the coordinating reviewer retains integration/merge oversight. Review the two dependency commits separately. Existing historical proposal/candidate reports describe their original inputs; this document records the current draft's executed checks.

Frontend's next independent deliverable is protocol-2 review and a minimal connected lobby/start/view/MOVE/receipt/reconnect slice against [protocol2-client-handoff.md](protocol2-client-handoff.md). Auth persistence, listener freshness, audience authorization, private cache and unresolved-command recovery need source-bound consumer evidence. The current protocol-1 fixture consumer is not upgraded by installing these packages.

Before introducing production imports, Frontend must update its own external-specifier exclusion guard through review; it currently permits only `zod` externally. The shared policy already permits the exact reviewed React and modular Firebase paths. Bare Firebase, compat, analytics, arbitrary subpaths and development-only modules remain forbidden. When a real Vite configuration/build/output exists, its production output must enter root verification's bundle exclusion check. The synthetic probe does not establish a playable production build or real phone/browser behavior.

Backend protocol remains 2; ruleset `in-person-v1-2026-10-06` retains SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`, approved V1-01–V1-21 and Original Powers off. No protocol/rule change, cloud provisioning/deployment, repository settings/access change, GitHub PR merge or public release is included.
