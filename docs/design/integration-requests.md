# Designer requests to Codex Integration

**From:** Visual and Motion Designer (issue [#4](https://github.com/Amirkianfar66/GameN/issues/4)). **For:** Codex Astra, Backend and Integration.
**Base:** `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4`. **Date:** 6 October 2026.

Codex owns the root manifests, the lockfile, CI, the source lock, the workspace guard and the shared contracts. Designer has changed none of them. `npm run verify` passes on this branch exactly as it does on the base. This lists what Designer needs, in the order it needs it.

| ID | Request | Blocks | New dependencies |
| --- | --- | --- | --- |
| [DSN-REQ-1](#dsn-req-1) | Run the Designer tests and checks in `npm run verify` | CI coverage of everything in this PR | None |
| [DSN-REQ-2](#dsn-req-2) | Decide how design tokens 0.3.0 is adopted, and update the source lock for it | Frontend adopting the revision as *the* tokens | None |
| [DSN-REQ-3](#dsn-req-3) | Say how the four pinned Designer files are kept current | Keeping the brief and both directions current | None |
| [DSN-REQ-4](#dsn-req-4) | Contract facts the design is waiting for | Three finished pictures that nothing draws, and two planned markers | None |
| [DSN-REQ-5](#dsn-req-5) | Say how `apps/game` reaches `design/exports/`, and hold the loading rule there | Frontend loading any asset | None |

Nothing here installs anything. Every script Designer added uses Node built-ins only.

## DSN-REQ-1

**Run the Designer checks in `verify`. Needed now.**

`npm run verify` runs `tests/bootstrap` only. This PR adds 51 tests and a 13-part check in Designer's own package and directory. They pass locally and **do not run in CI** until the root script includes them.

Requested change to the root `package.json`:

```diff
+    "test:design": "npm run build && npm run test --workspace @mothership/design-tokens && npm run check:assets --workspace @mothership/design-tokens",
```

and `&& npm run test:design` at the end of `test` and of `verify`. It composes with Frontend's REQ-1, which adds `test:frontend` the same way.

That command line was run as written after a clean `npm ci` and passed. It needs no network, browser or credentials, and took 5.1 seconds on the development machine. It writes only to the system temporary directory, and removes what it wrote.

Two things to know before wiring it:

- **It checks that the committed review renders and browser reports are current.** `design/review/index.json`, `layout-check.json` and `shell-check.json` each record a hash of everything the review pages draw from (`design/prototypes/`, `design/exports/`, `design/studies/`, `design/contract/` and the 0.3.0 token file). Anyone who changes one of those without re-rendering will see `check:assets` fail and say which script to run. Those scripts need a Chromium-based browser, so they stay out of CI; CI only refuses stale results.
- **It does not run the browser checks.** `check:layout`, `check:shell`, `render:review` and `prove:checks` are deliberately not in it.

What it covers and what it cannot: [verification.md](verification.md).

`design/` is not a workspace and has no manifest. `scripts/check-workspace.mjs` needs no change: nothing under `packages/design-tokens/src/` imports anything, and the new file there is JSON.

## DSN-REQ-2

**Design tokens 0.3.0, and its lock update. Needed before Frontend treats 0.3.0 as the tokens.**

The pinned proposal is 0.2.0. `docs/bootstrap-source-lock.json` pins `docs/design/design-tokens.json`, and `scripts/check-sources.mjs` requires `packages/design-tokens/src/tokens.json` to be byte-identical to it. Both are untouched here.

0.3.0 is a new file beside them, `packages/design-tokens/src/tokens-0.3.0.json`, exported as `nextDesignTokens`. It only adds: every 0.2.0 key keeps its name, shape and value, which a test and a check hold. `tests/bootstrap/presentation.test.mjs` reads the 0.2.0 export and still passes.

| File | SHA-256 |
| --- | --- |
| `docs/design/design-tokens.json` (0.2.0, pinned, unchanged) | `013e5e60d6ad255ca24a373f02a0095fb31cca17df39b6287315c225d70127e1` |
| `packages/design-tokens/src/tokens-0.3.0.json` (0.3.0, new) | `095f91a6cc5feb6cb5f0b9cf1c8ec299db16395c0f8436d8fee60ef80b357619` |

A check refuses this page if either hash is not the file's.

Two ways to adopt it. Designer has no stake in which, and will not regenerate the lock either way.

- **A. Keep 0.2.0 frozen as the historical proposal** and add the 0.3.0 file to the lock as a second pinned source. Nothing that reads 0.2.0 changes. Frontend switches exports when it has reviewed the revision.
- **B. Replace 0.2.0 with 0.3.0** in both pinned places and update the lock entry, recording the reason and that no rule version is affected. `presentation.test.mjs` still passes, because every value it asserts is unchanged. Designer would then remove the second export in a follow-up.

Until one of these lands, 0.3.0 is a proposal that the reference stylesheets and review pages use and nothing else depends on.

Rule-version impact of either: none. Tokens carry no rule. The motion durations in 0.3.0 are the 0.2.0 values.

## DSN-REQ-3

**The four pinned Designer files.**

The source lock pins `docs/design/art-direction.md`, `docs/design/motion-direction.md`, `docs/design/design-tokens.json` and `agents/designer.md`. All four are in or beside Designer's ownership; any edit fails `check:sources`. This is Frontend's REQ-6 again, for a different role.

They are left untouched, and three lines in them are now out of date:

- `motion-direction.md`: “no motion assets or runtime implementation are included yet”.
- `art-direction.md`: “No artwork, renderer benchmark or user approval is implied”, which is still true of approval and benchmarks, and no longer of artwork.
- `agents/designer.md`: “implementation branch/PR starts after the shared bootstrap”.

Requested: either a reviewed lock update when Designer proposes wording, or a statement that they are frozen as historical sources. Designer assumes the second, keeps status in [README.md](README.md), and records in [visual-interaction-contract.md](visual-interaction-contract.md#9-where-this-refines-the-art-direction) each place this work departs from the art direction and why.

## DSN-REQ-4

**Facts the design is waiting for. Not requests to change protocol 1.**

Each of these is specified and is drawn from nothing today, because the audience views at the base commit do not carry the fact. None should be inferred on the client. They are for the protocol review Frontend and Balance are already part of.

| Fact | What waits for it | Today |
| --- | --- | --- |
| That a seat's shot is spent, as distinct from never available | A spent card and the struck-out pip ([DSN-D02](README.md#open-decisions)) | Nothing is drawn as spent. A device reports once that its own registration is no longer pending, until the player presses Done; after that it shows what `self.shotAvailable` says |
| The server's own list of seats that may be targeted | Two finished rings and a dimmed token ([DSN-D03](README.md#open-decisions)) | Drawn by no rule. Target rows are Frontend's provisional same-location hint |
| A count of a resource | A number beside the pip | A pip with no number |
| A revealed faction per seat, at its permitted step | The one public use of a faction color, `marker-revealed-faction` | Not drawn. No public asset contains a faction color, and a check holds that |
| Whether a Captain is currently immune | Any immunity mark ([DSN-D10](README.md#open-decisions)) | The Captain marker is a rank star and the word “Captain” |
| The team of a role, in the seat's own view | The team word on a role card without a client-side table | The one proposed card (Officer) takes “Blue team” from `rules/overlays/player-modes-officer.json` through reviewed copy |

Designer read the draft protocol 2 on `codex/v1-pinned-frontend-integration` at `b731c97` for forward compatibility only and built nothing on it. As far as that reading goes: `legalTargets` and `revealedFaction` would supply the second and fourth rows; nothing there supplies the first. Under V1-17 of the owner-approved sheet on that branch, Protection and attack causes stay undisclosed, which would keep the two synthetic studies permanently out of a connected match. If any of that is misread, say so.

**The asset manifest version.** The exports are versioned `design-0.1.0`. A check holds that it fits the `assetManifestVersion` field of both protocol 1 and that draft. The fixture pins `0.0.0-no-assets`; nothing here changes that.

## DSN-REQ-5

**How the application reaches the exports, and the rule it must keep when it does. Needed before Frontend loads any asset.**

`design/exports/` is plain files outside every workspace. `apps/game` may depend on `@mothership/design-tokens` but not on `design/`, and the workspace guard matches imports as whole specifiers.

Designer has no preference between these and has built neither:

- a bundler copies `design/exports/` as static files and the client loads each bundle's stylesheet by the path the manifest gives. No package change; the guard is not involved, because nothing is imported;
- or `@mothership/design-tokens` grows a reviewed subpath that re-exports the manifest, which needs the per-specifier allowlist Frontend's REQ-3 asks for.

Either way three things have to hold in the connected client. Designer holds them for its own review pages with `check:shell` and can help write the same watch against the real bundle when one exists:

1. **No request depends on a view.** A device loads each of its bundles whole, as one stylesheet, before its first match view: three on a phone, one on the table. A phone never asks for one role's picture, one pip or one icon by itself. [frontend-handoff.md](frontend-handoff.md#the-one-thing-to-read-first) says why.
2. **`design/studies/` is in no production bundle.** Every file there carries `mothership:dev-only`, the mark Frontend's production-exclusion check already looks for, so that check covers it once it runs over the built output.
3. **Nothing under `design/prototypes/` is shipped.** It is review tooling. Its modules carry the same mark. Its two reference stylesheets, `comic.css` and `cues.css`, do not: they are there for Frontend to take rules from.

## What Designer does next, and what it waits for

| Next | Waits for |
| --- | --- |
| Room B, Command Room, Hospital and Jail vignettes | Nothing. Each is its own reviewable PR |
| The other eight role illustrations, with proposed copy for each | Nothing for the art. The bundle stays one stylesheet throughout |
| Device review of the layouts with Frontend | Frontend's harness with the reference stylesheets, and named devices |
| Vote, Hack, Code, showdown, lobby and result | Their phases and facts in an adopted protocol, and an issue each |
| Sound | The owner's decision on DSN-D09 |
