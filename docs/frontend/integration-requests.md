# Frontend requests to Codex Integration: checks, tooling and dependencies

**From:** Frontend (issue [#3](https://github.com/Amirkianfar66/GameN/issues/3)). **For:** Codex Astra, Backend and Integration.
**Base:** `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4`. **Date:** 6 October 2026.

Codex owns the root manifests, the lockfile, CI and the workspace guard. Frontend has changed none of them. This document lists the exact changes Frontend needs, in the order it needs them. Contract changes are in [contract-review.md](contract-review.md).

| ID | Request | Blocks | New dependencies |
| --- | --- | --- | --- |
| [REQ-1](#req-1) | Run the Frontend tests and the exclusion check in `npm run verify` | CI coverage of work already in this PR | None |
| [REQ-2](#req-2) | A browser typecheck that does not give DOM types to the engine | Any browser code under `src/` | None |
| [REQ-3](#req-3) | Guard changes for `.tsx`, subpaths and development dependencies | Adding React | None |
| [REQ-4](#req-4) | Dependencies, in four stages | React shells, R3F evaluation, GSAP cues, browser tests | 12 direct, 72 resolved |
| [REQ-5](#req-5) | A browser test job in CI | Automated browser journeys | With REQ-4 stage D |
| [REQ-6](#req-6) | A reviewed way to update the two pinned Frontend documents | Keeping the brief and the slice plan current | None |
| [REQ-7](#req-7) | The Firebase web client, for a transport to the backend's emulator | Any emulator or backend integration | 1 direct, 84 resolved |

Nothing here is installed. The versions and hashes below were read from the npm registry on 6 October 2026, and the full set was resolved in a scratch copy of the manifests with `npm install --package-lock-only --ignore-scripts` under npm 10.9.4. That run downloaded metadata only and touched no file in the repository.

## REQ-1

**Run the Frontend checks in `verify`. Needed now.**

`npm run verify` runs only `tests/bootstrap`. This PR adds 187 tests and a production-exclusion check in the two Frontend packages. They pass locally and **do not run in CI** until the root script includes them.

Requested change to the root `package.json`:

```diff
-    "test": "npm run test:bootstrap",
-    "verify": "npm run check:toolchain && npm run check:workspace && npm run check:sources && npm run typecheck && npm run test:bootstrap"
+    "test:frontend": "npm run build && npm run test --workspace @mothership/presentation --workspace @mothership/game && npm run check:exclusion --workspace @mothership/game",
+    "test": "npm run test:bootstrap && npm run test:frontend",
+    "verify": "npm run check:toolchain && npm run check:workspace && npm run check:sources && npm run typecheck && npm run test:bootstrap && npm run test:frontend"
```

The `test:frontend` command line was run exactly as written after a clean `npm ci` and passed: 59 and 128 tests, then the exclusion check. With the workspace already built it took under two seconds on the development machine. It needs no network, browser or credentials. The tests use `node:test` against built output, like the bootstrap tests.

`tests/bootstrap/build.test.mjs` still passes unchanged: both packages keep a single `.` export.

*Slice 2 update.* The same command line, unchanged, now runs 95 and 210 tests. None of them runs in CI until this lands, so the gap this request closes has grown to 305 tests.

*Slice 3a update.* 120 and 262 tests: 382 that CI does not run.

## REQ-2

**A browser typecheck that keeps DOM types away from the engine. Needed before any browser code is written under `src/`.**

`tsconfig.check.json` checks all eight packages as one program with `lib: ["ES2022"]` and `types: []`. That is why everything Frontend wrote under `src/` in this PR is free of browser globals: the core takes its clock and scheduler as injected ports, and the interim browser host lives in `apps/game/dev/`.

A React application needs `DOM` and JSX types. Adding `DOM` to the shared program would also let `packages/engine` and `services/game-api` reference `document` or `window` without a type error, which weakens the guarantee that the engine has no renderer dependency.

Requested: check browser packages in their own program. One way that preserves the current structure:

- keep `tsconfig.check.json` as it is and remove `apps/game/src/**` from its `include`;
- add `tsconfig.check.browser.json` extending the base with `"lib": ["ES2022", "DOM", "DOM.Iterable"]`, `"jsx": "react-jsx"`, the same `paths`, and `include` of `apps/game/src/**/*.ts` and `apps/game/src/**/*.tsx`;
- run both from `typecheck`.

`packages/presentation` stays in the DOM-free program. Frontend intends to keep it renderer-free: it holds view-models, copy and, later, the event director core, and it is tested in Node.

Frontend will change `apps/game/tsconfig.json` (its own file) to match in the same PR that Codex lands this, and not before, so the build and the root check never disagree.

## REQ-3

**Guard changes. Needed with REQ-4 stage A.**

Three things in `scripts/check-workspace.mjs` have to change before React can be added, and one is a gap today.

1. **`.tsx` files are not import-checked.** Line 50 skips every file that does not end in `.ts`. Once `.tsx` is in a build, a `.tsx` file could import anything, including `@mothership/contracts/fixtures`, and the guard would pass. Requested: scan `.ts` and `.tsx`, creating the source file with the matching script kind.
2. **Imports are matched as whole specifiers.** `react-dom/client` and `react/jsx-runtime` are not `react-dom` or `react`, so they would be rejected even with the packages allowed. Requested: an explicit list of permitted specifiers per workspace, including the subpaths below, with `@mothership/contracts/fixtures` still refused everywhere under `src/`.
3. **Development dependencies share the runtime allowlist.** The loop checks every dependency kind against one list, so allowing `vite` as a dev dependency would also allow `import 'vite'` from `src/`. Requested: a separate dev-dependency allowlist that does not permit a runtime import.

Runtime specifiers Frontend needs permitted in `apps/game/src`: `react`, `react/jsx-runtime`, `react-dom/client`, `three`, `@react-three/fiber`, `gsap`. Nothing new in `packages/presentation`.

Frontend's own check, `apps/game/scripts/check-production-exclusion.mjs`, already refuses any subpath import and any import it cannot follow in built output. It accepts `--bundle <dir>` to scan a bundler's output in full; that flag should be added to `test:frontend` when a bundler exists.

## REQ-4

**Dependencies, in four stages.** Each stage is useful on its own and can be approved separately. All go in `apps/game/package.json`; the root and `packages/presentation` gain none.

| Stage | Package | Version | Kind | License | Registry integrity (sha512) |
| --- | --- | --- | --- | --- | --- |
| A | `react` | 19.3.0 | runtime | MIT | `E8LUcbtBWt20bbl2YoHfx4ZDBdxVTfOKtCZn9cDSJ4l6/nuoApcpIBcj47t2wZoVX8g2ZHuMHbiShgCR1T5Sog==` |
| A | `react-dom` | 19.3.0 | runtime | MIT | `JDk8dgif51OjFoDE70+OT9ICyYr+69HlmihNwp1+Nsfbna3t5sIiCa9ZJktDmQ4/1b/rn26hIAR2uYXDMr5r0Q==` |
| A | `@types/react` | 19.3.0 | dev | MIT | `N0rFCuH9YoxG9/m61l9MfpJKfmLOVU0em7ipIz6TRgSSkvReLB9vL85GB+yr8Bs5leqpvg96JSwF4ZS1s4viQg==` |
| A | `@types/react-dom` | 19.3.0 | dev | MIT | `ZI7bU42mZXXKHn/qNLEw2IrbiINU7X5+vfgdixBHkCNpYWXjKgfQ/P+uyGb5CjOLB9UcnTeg3rylQtV2hym44Q==` |
| A | `vite` | 8.3.3 | dev | MIT | `cTAldKPImjg6c+gk48U19POPn3GCBzZwpdsN8ZMEEcbpes+6/wvfqUd0C2y3qYY4wsj8PwgFwrZ/1jBPVttMSg==` |
| A | `@vitejs/plugin-react` | 6.1.2 | dev | MIT | `fhJNGUdscQa4HkI0xFxwonWyhnVReCPDbXI7FH7jmzpnVCrFQI7PRrhWecO263610vOrs9tr2Y4xcf8uAdFxbw==` |
| B | `three` | 0.186.1 | runtime | MIT | `blFeqb49wRCSGUGj7gtpfnSGHy2lwDk94RhUmS1c/hTby70kvChbWpkJ4Pm1390LqzzvTmzgXKHPEafJwCb8jA==` |
| B | `@react-three/fiber` | 9.8.1 | runtime | MIT | `GbNP4r6F/gpclFKkLGHzXcuwFWAzLyKsmrQGcDuwK3wQnwLH6F1TfGtEYjHy8OQoGsajwT19B9jtVLLjjfH09w==` |
| B | `@types/three` | 0.186.0 | dev | MIT | `mxYSBpDC+D0pLfSP6sW4WZTcT+nrtmZcimMqnVmy36Hte3XpeYSrvgg4TRdaM1GemGog1AWzI5qL2VoIfMXbJQ==` |
| C | `gsap` | 3.15.0 | runtime | **GSAP standard license** | `dMW4CWBTUK1AEEDeZc1g4xpPGIrSf9fJF960qbTZmN/QwZIWY5wgliS6JWl9/25fpTGJrMRtSjGtOmPnfjZB+A==` |
| D | `@playwright/test` | 1.63.0 | dev | Apache-2.0 | `oxMK4vllB9RK5NQ2l1pq1IfOf2AvnEuj/vYGDj0H2nMtmtZpKtCwt/l00GEO6xjGfpBNAvjovvYdCm50dRQkpQ==` |
| D | `@axe-core/playwright` | 4.13.0 | dev | MPL-2.0 | `6YLx+kxXu5GJceG4ozFg+33a2EMTdjYwWGloJ3sb9Kta5pp+ZNS53uxGVog5JetIY8s++P5UrtX+cri+u0VAVg==` |

**What each stage unblocks**

- **A — React and a bundler.** The shells become React components fed by the controllers already in this PR, replacing the interim host in `apps/game/dev/harness/host.js`. A bundler is also what makes a real production bundle exist for the exclusion check to scan. The development harness currently makes 95 module requests per page because the shared schemas' dependency loads every locale file unbundled.
- **B — the board candidate.** The React Three Fiber and Three.js evaluation that issue #3 asks for. Not requested: `@react-three/drei`, a second renderer, or PixiJS.
- **C — timelines.** GSAP for the comic motion cues, as the motion direction names it.
- **D — browser tests.** Automated journeys and accessibility scans on real engines, replacing the optional DevTools-protocol capture script in `apps/game/dev/`.

**Resolution evidence (dry run, 6 October 2026).** Lockfile entries under `node_modules/` grow from 12 to 59 after stage A, 78 after B, 79 after C and 84 after D. No peer-dependency conflict or warning was reported. Of the 76 third-party entries, 20 are runtime, 29 are development-only and 27 are optional platform binaries for the bundler and CSS toolchain. One package declares an install script: `fsevents`, optional and macOS-only. The run used the repository's `engine-strict` setting under Node 22.21.1 and reported no engine error.

**Constraints Codex should know**

- `@react-three/fiber` 9.8.1 requires `react` at `>=19 <19.4`. React 19.3.0 is the newest release inside that range; a later React minor must wait for an R3F release that allows it.
- `vite` 8.3.3 requires Node `^20.19.0 || >=22.12.0` and, when present, `@types/node` `^20.19.0 || >=22.12.0`. The pinned 22.21.1 and 22.19.19 satisfy both.
- Vite resolves a `.js` import specifier to the `.ts` source, so the workspace's NodeNext import style does not need to change.

**Decisions that are not Frontend's**

- **GSAP's license is not an open-source license.** The registry lists it as the "Standard 'no charge' license" at <https://gsap.com/standard-license>. Its terms need the game owner's acceptance before stage C. If it is not accepted, the DOM cues can be built on CSS and the Web Animations API with no dependency; the scene cues would then be driven by the render loop. Frontend will not add GSAP on its own reading of the terms.
- **MPL-2.0 appears in development tooling only:** `axe-core` (stage D) and `lightningcss` (pulled in by Vite). Neither ships to players.

**Deliberately not requested**

`vitest`, `jsdom`, `happy-dom` and `@testing-library/*`. The client core is tested headlessly on `node:test`, which the workspace already uses, and browser behavior belongs on real engines in stage D. Also no state library and no CSS framework: the controllers expose a `subscribe`/`getFrame` pair that React's `useSyncExternalStore` reads directly, and the stylesheet is plain CSS driven by the Designer's tokens.

## REQ-5

**A browser job in CI. With stage D.**

Playwright downloads browser builds that are not npm packages. Requested: a separate CI job that installs the browsers for the pinned Playwright version, builds, starts the fixture harness on the loopback interface and runs the journeys. Keeping it separate leaves `Bootstrap checks / bootstrap` fast and free of the download. WebKit in CI approximates iOS Safari; it does not replace the named physical-device checks in the frontend specification.

## REQ-6

**The Frontend brief and slice plan are pinned by the source lock.**

`docs/bootstrap-source-lock.json` pins `docs/frontend/first-slice.md` and `agents/frontend.md`. Both sit in or beside Frontend's ownership, and the brief asks Frontend to maintain it through review, but any edit fails `check:sources`. Frontend found this the hard way: a one-line status pointer in `first-slice.md` broke CI on the first push of this PR and was reverted.

Two lines in those files are now out of date: `agents/frontend.md` still says "bootstrap baseline pending", and `first-slice.md` has no pointer to progress. Frontend has left both untouched and tracks status in [README.md](README.md) instead.

Requested: either a reviewed lock update when Frontend proposes a wording change to these two files, or a statement that they are frozen as historical sources and status lives elsewhere. Frontend will not regenerate the lock.

## REQ-7

**The Firebase web client. Needed before any emulator or backend integration; not needed by anything built so far.**

Everything Frontend has delivered talks to a transport *interface*. The fixture harness implements it over a scripted double. The backend on `agent/backend-firebase-officer-slice` serves views as Firestore documents under Security Rules, takes commands over HTTP with a Firebase ID token, and ships an emulator suite. A transport to that needs the Firebase web client for three things: an authenticated identity, snapshot listeners that can tell a server snapshot from a cached one (the freshness answer to FE-C07), and the token for the command endpoints.

| Package | Version | Kind | License | Registry integrity (sha512) |
| --- | --- | --- | --- | --- |
| `firebase` | 12.19.0 | runtime | Apache-2.0 | `kwXCLcI0ly2lkwygkbuRx6SsX3DSO96355YrWh9SWZ5ncsxK/y5cirn3sY6nZVSiBVE++2nL6Hchzu1EB8uohQ==` |

Runtime specifiers to permit in `apps/game/src`: `firebase/app`, `firebase/auth`, `firebase/firestore`, and `firebase/app-check` for production attestation. The modular entry points are named so a bundler can drop what is unused; none of `firebase/analytics`, `firebase/messaging`, `firebase/storage` or the compat layer is requested.

**Resolution evidence (dry run, 6 October 2026).** Added alone to the current manifests in a scratch copy, with `npm install --package-lock-only --ignore-scripts` under npm 10.9.4, lockfile entries under `node_modules/` grow from 12 to 96. No peer-dependency conflict or warning was reported. The added entries are licensed Apache-2.0 (53), MIT (19), BSD-3-Clause (10), ISC (5) and 0BSD (1). Two declare an install script: `@firebase/util` and `protobufjs`. Nothing was installed and no file in the repository was touched.

**Things Codex should decide with it**

- The version should match what the backend's emulator suite was verified against. The backend branch pins `firebase-admin` 14.5.0, `firebase-functions` 7.4.0 and `firebase-tools` 15.0.0; Frontend has not checked this client version against them.
- The emulator needs Java 21 and fixed loopback ports. Frontend's connected tests would run in the backend's `test:emulator` arrangement, not in `verify`.
- Client-side persistence stays off. Private views must not reach an offline cache; the transport will not enable it, and a test will pin that.
- The production-exclusion check and the workspace guard both need the specifiers above before the import compiles.

*Slice 3a update.* The transport interface now carries the audience's presentation events on the same subscription as its views (`FeedListener.onEventPayload`). A Firebase transport therefore also listens to the caller's own event collection as the backend's response describes it, orders what it is handed by revision and then ordinal, and passes each event on untouched. It does not match events to views, drop repeats or decide what is old; the client core does. The ordinal is not part of the event payload today, which is request F in [contract-re-review.md](contract-re-review.md#requests).

Until this is approved, emulator integration is reported as **not run**, and nothing fixture-tested is described as integrated.

## What Frontend does next, and what it waits for

| Next slice | Waits for |
| --- | --- |
| Shot target and confirm flow in semantic DOM, with receipt, unknown-result and retry handling against the scripted fixture | Done, fixture-tested: [slice-2-shot-flow.md](slice-2-shot-flow.md) |
| Event director core | Done, fixture-tested: [slice-3-event-director.md](slice-3-event-director.md) |
| Drawing the cues in the DOM, and the development-only motion gallery | Nothing for CSS cues. Stage C, or the owner's decision on GSAP, for coordinated timelines |
| React shells and a production bundle | REQ-2, REQ-3, stage A |
| R3F/Three.js board evaluation with measured device evidence | Stage B, and named devices |
| Connected command, deadline and reconnect behavior | REQ-7, and the backend branch that provides the emulator being merged or named as the base to build on. FE-C01 to FE-C07 are answered; see [contract-re-review.md](contract-re-review.md) |
