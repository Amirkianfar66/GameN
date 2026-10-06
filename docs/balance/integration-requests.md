# Game Balance requests to Codex Integration

**From:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)). **For:** Codex Astra, Backend and Integration.
**Base:** `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4`. **Date:** 6 October 2026.

Codex owns the engine, the shared contracts, the files under `rules/`, the root manifests, the lockfile and CI. Balance has changed none of them. This document lists the exact changes Balance asks for. Contract findings are in [contract-review.md](contract-review.md). Rule questions go to the game owner, not to Codex; they are in the decision register in [rules-audit-v1.md](rules-audit-v1.md#decision-register).

| ID | Request | Blocks | New dependencies |
| --- | --- | --- | --- |
| [BAL-REQ-1](#bal-req-1) | Run the Balance checks in `npm run verify` | CI coverage of work already in this PR | None |
| [BAL-REQ-2](#bal-req-2) | A private post-match research export | Complete playtest records | None |
| [BAL-REQ-3](#bal-req-3) | Point every agent at the rulebook, and register D11 to D38 | One rule text for all four workstreams | None |
| [BAL-REQ-4](#bal-req-4) | A supported test surface on the engine | Scenario runs that survive engine refactoring | None |
| [BAL-REQ-5](#bal-req-5) | A ruleset pin that covers the baseline sources | Evidence that cites the pin | None |
| [BAL-REQ-6](#bal-req-6) | A decision on the three pinned Balance documents | Keeping the brief and the earlier audit current | None |
| [BAL-REQ-7](#bal-req-7) | Two contract changes from the review | Adoption of protocol 2 | None |

Nothing here adds a package. `tools/balance` keeps its two workspace dependencies and its source imports nothing else, so the workspace guard passes unchanged.

## BAL-REQ-1

**Run the Balance checks in `verify`. Needed now.**

`npm run verify` runs `tests/bootstrap` only. This PR adds static checks under `tests/scenarios/`; the evidence report gives the count. They pass locally and do not run in CI until the root script includes them.

Requested change to the root `package.json`, shown against the bootstrap baseline. On PR #16 the same two lines already carry Backend's steps; add `test:balance` beside them:

```diff
-    "test": "npm run test:bootstrap",
-    "verify": "npm run check:toolchain && npm run check:workspace && npm run check:sources && npm run typecheck && npm run test:bootstrap"
+    "test:balance": "npm run check --workspace @mothership/balance",
+    "test": "npm run test:bootstrap && npm run test:balance",
+    "verify": "npm run check:toolchain && npm run check:workspace && npm run check:sources && npm run typecheck && npm run test:bootstrap && npm run test:balance"
```

`npm run check --workspace @mothership/balance` was run exactly as written after a clean `npm ci`. It builds the package, verifies that the scenario files match the catalogue and that the traceability table is current, and runs the checks on `node:test`. It needs no network, engine, browser or credentials.

These checks validate documents and fixtures. They do not execute a scenario. When the full-game engine is on the default branch, add the execution as a second step:

```diff
+    "test:scenarios": "npm run scenarios --workspace @mothership/balance",
```

`npm run scenarios` exits non-zero when any executed scenario fails. With no full-game engine in the checkout it executes nothing, reports every ready scenario as not run, and exits zero: at the bootstrap baseline that is the correct result, and it must not be read as a pass.

## BAL-REQ-2

**A private post-match research export. Needed before the first recorded playtest can be complete.**

Issue #5 lists "sanitized post-match telemetry from Backend" as a dependency. The record layout is [telemetry-spec.md](telemetry-spec.md) and [telemetry-export.schema.json](telemetry-export.schema.json). The fields that only the server can supply are listed there under "From the server export". In short:

- the pins of the match: ruleset version and hash, source manifest hash, engine version and commit, protocol, client build;
- the result with its cause and checkpoint, and Healthy Power at the end;
- the count of each phase kind and the sum of window time;
- one row per registered attack: type, rounds, actor and target seat and faction, defence, damage, target health afterwards, actor status at resolution;
- per seat: turns by status, opportunities available, attempted and accepted for each action kind, resources unused, votes cast and missed;
- Scan attempts and failures, Hack conversations and requests refused by the round limit, Protection grants and consumptions, Supplier distribution and recipient factions, Code submission, correctness and phase;
- showdown participants, shots registered, shots with effect, eliminations.

Constraints, all from the role brief and the secrecy rules:

1. The export is produced only after the match has finished or been aborted, never during play.
2. It is available only to an authorized facilitator or researcher role. Host status alone must not grant it.
3. It contains no Auth identifier, device identifier, address or free text typed by players, and never the content of a Hack.
4. It is not written to routine logs or analytics.

"Opportunities available" needs the engine's own legal-target evaluation at each turn; it cannot be rebuilt from accepted commands alone. If that is expensive, the per-attack rows and the result cause are the first priority.

## BAL-REQ-3

**Point every agent at the rulebook, and register D11 to D38.**

The owner asked for one rules document that all agents follow. It is [game-rules.md](game-rules.md). It consolidates the pinned sources and the owner decision of 6 October and creates no rule. Agents on other worktrees do not know it exists.

Requested addition to `AGENTS.md`, under "Source precedence", after the numbered list:

```diff
+The consolidated rulebook is `docs/balance/game-rules.md`. Read it for how the game plays: it
+cites the source of every rule and is checked against the pinned files. It does not replace the
+sources. Where it disagrees with one, the source wins and the rulebook has a defect: report it on
+issue #5. A rule marked OPEN there is undecided; do not ship a default for it as if it were canon.
```

`CLAUDE.md` imports `AGENTS.md`, so no second edit is needed. `CODEX_START_HERE.md` could gain the same pointer in its launch prompts.

Requested addition to the current decision register (`docs/backend/v1-decision-register.md` on PR #16, or wherever the register lives after integration): the rows D11 to D38 of the Balance register, or one row linking to it. Ten of them are open, and with D10, which the earlier register already carries, eleven questions are undecided. Eighteen ask the owner to confirm a working reading. PR #16 states that no Version 1 rule decision remains unapproved; that holds for V1-01 to V1-21 only.

## BAL-REQ-4

**A supported test surface on the engine.**

The role brief says Balance converts scenarios into engine fixtures "after Backend publishes the engine test adapter". No adapter has been published. To run anything, Balance wrote its own binding, `tests/scenarios/adapters/full-game-v1.mjs`, against the five functions exported on PR #16: `createFullGame`, `executeFullGame`, `advanceFullGame`, `abortFullGame` and `projectFullGame`.

The binding forwards commands and clocks through those functions, which is stable. To assert on server truth it also reads the engine's state object directly: `seats[].protection`, `seats[].ordinaryWeapons`, `queued`, `viewRevisions`, `releaseUsed`, `codeSubmitted` and others. Those are internals and will change.

Requested, in order of preference:

1. Export a read-only test view of server truth from `@mothership/engine`, for test use only, with the fields of `TruthSeat` and `Observation.truth` in `tools/balance/src/observation.ts`. Balance will then delete its field mapping.
2. Or state which state fields are stable for tests, and Balance will keep the mapping.

Either way the five functions above are the surface that every scenario and the playout tool depend on. A change to their signatures needs a matching change to the binding in the same PR.

## BAL-REQ-5

**A ruleset pin that covers the baseline sources.** See [BAL-C03](contract-review.md#bal-c03). The value carried by a match is the hash of the owner-decision overlay alone. Requested: pin a value that also commits to the baseline source manifest, such as the SHA-256 of `rules/in-person-v1-manifest.json`. No rule changes. Until then Balance reports record both hashes.

## BAL-REQ-6

**Three Balance documents are pinned by the bootstrap source lock.**

`docs/bootstrap-source-lock.json` pins `docs/balance/rules-audit.md`, `docs/balance/scenario-matrix.json` and `agents/game-balance.md`. All three are now out of date in places: the audit and the matrix list D01 to D09 as blocked, and the brief still says the task is unimplemented and the bootstrap commit is to be pinned.

Balance has left all three byte-identical. `tests/scenarios/sources.test.mjs` asserts it. The Version 1 audit, rulebook and scenarios are new files beside them, and the 35 specifications of the matrix are traced one by one in [scenario-traceability.md](scenario-traceability.md).

Requested: either state that the three files are frozen historical sources, or make a reviewed lock update that adds one line to each pointing at the Version 1 documents. Balance will not regenerate the lock. Frontend's REQ-6 asks the same for its two files.

## BAL-REQ-7

**Two contract changes from the review.**

- [BAL-C01](contract-review.md#bal-c01): give `shotAvailable` one documented meaning, or split it into a resource field and an eligibility field.
- [BAL-C02](contract-review.md#bal-c02): enforce the cross-field statements about Captain, Command Room, Jail, Hospital and the Final Zone, in the schemas or in a required projection test.

## What Balance does next, and what it waits for

| Next | Waits for |
| --- | --- |
| Re-run every scenario against the engine as merged, and commit the report | PR #11, #12 and #16 on the default branch |
| Turn a blocked scenario into a ready one, with a new rulebook version | An owner decision on that D number |
| First in-person pilot sessions under [playtest/protocol.md](playtest/protocol.md) | A playable build, the owner's approval of consent, access and retention, and people |
| Complete playtest records | BAL-REQ-2 |
| A separate powers-on suite | D10 |
