# Bootstrap development commands

This workspace implements issue #1 only. All commands run from the repository root. The build emits JavaScript and declarations for eight package shells and shared schemas; it does not create a playable application or deployable Firebase service.

## Pinned environment

| Tool/dependency | Version | Purpose |
| --- | --- | --- |
| Node.js | 22.21.1 | Local and CI runtime; `.nvmrc` / `.node-version` |
| npm | 10.9.4 | Root workspace and lockfile v3 |
| TypeScript | 5.9.3 | Strict checking and ESM project-reference builds |
| Zod | 4.1.12 | Shared runtime schemas |
| `@types/node` | 22.19.19 | Node tooling type dependency |

These are verified available, deliberately pinned versions, not a claim to use the latest releases. Internal packages are private `0.1.0` packages linked by exact versions. All transitive versions and package integrity values are in `package-lock.json`. The install hook and `engine-strict` reject a mismatched toolchain.

## Local and Codex setup

Provision Node 22.21.1 first. With an existing nvm installation:

```sh
nvm install
nvm use
npm install --global npm@10.9.4
npm ci
npm run verify
```

For the Codex environment setup command, with that runtime already selected:

```sh
npm install --global npm@10.9.4
npm ci
npm run check:toolchain
```

For its maintenance command after restoring a checkout/cache:

```sh
npm run check:toolchain
npm ci
```

`npm ci` rebuilds the dependency installation from the lockfile. Cached packages are useful but do not replace the lockfile or justify `npm install` during routine setup. Allow `registry.npmjs.org` during dependency setup. No Firebase credentials, service accounts, Java emulator runtime or Canvas platform setup are needed for bootstrap checks. Global npm installation may require environment-specific write permission; the project itself does not install Node or nvm.

If a sandbox cannot resolve the registry, request the normal tool permission for the install rather than altering versions or claiming an offline install passed. A writable npm cache can be supplied with `npm ci --cache /path/to/cache`. Use `--offline` only with a populated cache; a fresh machine needs registry access.

## Checks

| Command | Scope |
| --- | --- |
| `npm ci` | Reproducible installation; toolchain validation |
| `npm run check:workspace` | Eight explicit workspaces, exact dependency pins, import boundaries and build/typecheck file scope |
| `npm run check:sources` | Canvas inventory/hashes, rule and reference hashes, unchanged token proposal |
| `npm run typecheck` | All eight `src` trees without emitting build files |
| `npm run build` | TypeScript project-reference build of all packages |
| `npm run test:contracts` | Build contracts and run the targeted protocol/view/fixture tests |
| `npm test` | Build all packages and run the bootstrap tests including ESM import smoke checks |
| `npm run verify` | Toolchain, boundaries, source integrity, typecheck, build and bootstrap tests |
| `npm run clean` | Remove only the eight generated `dist` directories, including build caches |

To check a clean rebuild:

```sh
npm ci
npm run clean
npm run verify
```

CI runs `npm ci` and `npm run verify` on Ubuntu 24.04 with pinned Node/npm and action commits. Its stable job is `Bootstrap checks / bootstrap`. It has read-only repository permissions and no cloud secrets. Required-check/branch-protection settings remain a repository administration decision; this PR does not configure them.

Production workspace paths are an explicit allowlist. `reference/design-canvas` has its own historical pnpm manifest and is never installed, typechecked, built or tested as production code. CI reads its bytes solely for the integrity check; no recursive dependency/build/CI discovery includes it. Root npm installation must not be run inside the reference snapshot. No `firebase.json`, project binding, deployment or emulator command is supplied until Backend #2 implements that service boundary.

## Maintenance and ownership

Codex Backend/Integration owns root dependencies, the lockfile, CI and shared contracts. For an approved dependency change, use an exact version, regenerate the root lockfile, update the dependency allowlist if needed, run the relevant checks and submit a focused PR. Later renderer/Firebase dependencies belong to their reviewed implementation tasks. Frontend should request shared dependency changes rather than silently installing a second board renderer.

`docs/bootstrap-source-lock.json` preserves evidence from this bootstrap. An intentional later change to a source requires a reviewed lock update with its reason and rule-version impact; never regenerate it merely to hide a failure. Designer owns subsequent token changes and coordinates the reviewed JSON/package export.

The fixture export `@mothership/contracts/fixtures` is deliberately separate from the normal package entrypoint. Import it only in tests or an explicitly isolated development harness. A future app harness must add a production-bundle exclusion check before using it. The current workspace guard disallows fixture subpath imports in runtime source trees.

Implementation references: [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html) and [Zod schemas](https://zod.dev/api). Existing Codex launch guidance remains in [CODEX_START_HERE.md](../CODEX_START_HERE.md); use the reviewed baseline procedure in [integration-baseline.md](integration-baseline.md).

## Backend emulator checkpoint

Backend issue #2 adds engine/API/HTTP guard tests to `npm run verify`. `npm run test:emulator` additionally requires Java 21 and runs local Auth, Firestore, Functions and Rules evidence against `demo-mothership`. Its CLI is pinned in the root lockfile. See [the backend handoff](backend/implementation.md); emulator tests fail rather than silently skip when their prerequisites are absent. No cloud login or deployment is required.
