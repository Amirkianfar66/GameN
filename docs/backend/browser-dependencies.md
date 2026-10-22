# Focused browser dependency proposals

These are concrete review artifacts, not adopted app manifests. Root tooling permits the proposed package kinds and explicit runtime specifiers, but the actual repository lockfile and Frontend-owned package/config files are unchanged. Apply reviewed patches in a separate combined candidate. Frontend and Balance must review before shared adoption. Deferred R3F/Three.js, GSAP and Playwright/accessibility tooling stay separately reviewable and are absent from these patches.

Stage A adds React/React DOM `19.3.0`, development declarations `@types/react`/`@types/react-dom` `19.3.0`, Vite `8.3.3` and its React plugin `6.1.2` in `apps/game`. It adds app-only DOM/JSX/TSX build options. `browser-stage-a.proposal.patch` contains only that app manifest/config and the exact root lockfile delta. Firebase is a second independent review step: `browser-firebase-client.proposal.patch` is applied after Stage A and adds modular web-client `firebase` **12.18.0** and its exact lock delta.

The originally requested Firebase `12.19.0` exists in the primary registry but fails a real Firestore import under the unchanged TypeScript `5.9.3` toolchain: Firestore `4.17.2` exposes `Temporal.Instant` in its public declarations and produces `TS2503 Cannot find namespace 'Temporal'` at declaration lines 3635 and 3680. [Firebase's official release notes](https://firebase.google.com/support/release-notes/js) record Temporal support in 12.19.0. This proposal uses the preceding 12.18.0/Firestore 4.17.1, which passed strict checks. It does not weaken `skipLibCheck`, invent third-party ambient types, install a Temporal runtime or upgrade the shared compiler. A future latest-client adoption needs a separately reviewed type compatibility solution. 12.19.0's Auth fixes also remain outside the tested alternative; device/Auth acceptance remains required.

Requested versions, integrity hashes, engine/peer requirements and the failed 12.19.0 evidence were independently read from the [primary npm registry](https://registry.npmjs.org/) on 6 October 2026 and saved in `browser-dependency-registry.json`. Official [React versions](https://react.dev/versions) identify 19.3; React DOM requires React `^19.3.0`. Vite requires Node `^20.19.0 || >=22.12.0` and its optional Node declarations require `^20.19.0 || >=22.12.0`; the pinned Node 22.21.1 and declarations 22.19.19 satisfy these ranges. The plugin accepts Vite `^8.0.0`. [Firebase's modular setup documentation](https://firebase.google.com/docs/web/setup) supports the explicit SDK entrypoint approach. Successful clean installation resolved peer dependencies with no peer/engine conflict. This is package compatibility evidence, not connected transport acceptance.

The backend-containing lock has 835 package entries including root/workspaces. Stage A has 879; the tested Firebase 12.18.0 candidate has 919. All original lock-entry versions remain unchanged. The final clean `npm ci` installed 886 packages on this Mac; optional platform selections account for the difference from lock-entry counts. The root committed lock is untouched; no update replaces newer backend packages or suites.

Reproduce after preparing the exact combined candidate in `browser-verification.md`:

```sh
git apply --check docs/backend/browser-stage-a.proposal.patch
git apply docs/backend/browser-stage-a.proposal.patch
git apply --check docs/backend/browser-firebase-client.proposal.patch
git apply docs/backend/browser-firebase-client.proposal.patch
npm ci
npm run verify
npm run check:browser-dependencies
npm run package:backend -- --verify-install
```

`check:browser-dependencies` is an explicit proposal probe outside normal `verify`; before applying the proposals it fails with a required-package error. It compiles real React JSX and modular Auth/Firestore/App Check APIs with strict declarations, bundles them using the pinned Vite/plugin, and scans the temporary bundle with the existing Frontend exclusion checker. The synthetic exported functions are not invoked: no project, Auth/Firestore connection, renderer or App Check attestation is created. The temporary input/output is removed. The APIs include in-memory Auth persistence and Firestore memory cache; there is no Temporal polyfill or persistent private cache.

| Proposal candidate check | Actual result |
| --- | --- |
| Stage A + requested Firebase 12.19.0 clean install | Installed; actual modular Firestore typecheck failed with the two Temporal errors above |
| Stage A + Firebase 12.18.0 clean install | Passed; no engine/peer conflict; 886 packages installed |
| Strict browser/pure typecheck and workspace build, including temporary real `.tsx` imports | Passed |
| `check:browser-dependencies` | Passed: TypeScript + React/Vite bundle + fixture/development exclusion; no connection/rendering executed |
| Full candidate `npm run verify` | 461 passed, zero failures/skips/todos/cancellations, plus production exclusion |
| Standalone backend packaging with proposed dependency lock | Passed: clean isolated production installation, package/Functions imports, forbidden-source/fixture scans; `verifiedStandaloneInstall: true` |

Before Frontend introduces external imports reachable from its production entry, it must update its own exclusion checker with the same exact reviewed specifiers. Its current checker intentionally accepts only `zod` externally and refuses third-party subpaths. The compatibility probe's synthetic bundle validates content exclusion but does not adopt a React shell or change that guard. When Frontend supplies its real Vite build/config/output, root verification must invoke that build and pass its output to `--bundle`; the present ESM package checks do not claim a real client production bundle exists.

Connected Auth/listeners, current-server snapshot gating, private-view/event authorization, receipt retry/reload recovery, real browser/phone behavior and production attestation remain separate acceptance work. No cloud resource, public asset, repository access or deployment was changed.
