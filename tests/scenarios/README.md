# Scenario fixtures

Deterministic scenarios for the in-person Version 1 base game, Original Powers off. Owned by Game Design and Balance (issue #5). The documents are in [`docs/balance/`](../../docs/balance/README.md).

## Layout

| Path | Contents |
| --- | --- |
| `v1/mode-7.scenarios.json`, `v1/mode-8.scenarios.json`, `v1/mode-9.scenarios.json` | One file per mode. The modes are never mixed |
| `v1/unsupported.scenarios.json` | Setups an engine must refuse |
| `v1/catalog.mjs` | The authoring source. The JSON files are produced from it and checked against it |
| `v1/files.mjs` | Reading and writing those files; the pins they carry |
| `adapters/full-game-v1.mjs` | Binding to Backend's full-game engine API |
| `support/stub.mjs` | A scripted stand-in used only to test the runner and the invariants |
| `*.test.mjs` | Static checks, run on `node:test` |

## What a scenario is

```json
{
  "id": "V1-M9-OFF-02",
  "title": "A spent Officer who receives Supplier's weapon still cannot shoot again",
  "status": "ready",
  "ruleRefs": ["R-ROLE-11", "R-ROLE-07"],
  "dependsOn": ["R-SETUP-13", "R-SETUP-14", "R-SHOT-02"],
  "lineage": ["BAL-005"],
  "decisionIds": [],
  "setup": "v1-A-1",
  "steps": [ ... ]
}
```

- `ruleRefs` are rule identifiers in `docs/balance/game-rules.md`. The expected result is derived from those rules by hand. It is not copied from an engine.
- `dependsOn` lists further rules the scenario uses on the way: the rules behind each command it expects to be accepted, behind the checkpoints it runs to and behind the weapon counts it checks. `v1/catalog.mjs` reads them mechanically from the steps, and the list is generous on purpose. Its use is to find every scenario that a rule touches when a working reading changes. It decides no expectation.
- `setup` names the recorded facts of the match: who holds which role, the starting rooms, the three other Code numbers and the five turn orders. Each setup is listed once per file and is reproduced exactly from its seed label by `setupFromSeed`.
- `steps` are the inputs and the expectations. Players are written `@Role` and resolved through the setup.
- `lineage` names the specification of the earlier matrix that the scenario carries forward.

| Step | Meaning |
| --- | --- |
| `until` | Let phases expire, with no input, until the round, phase and active player match |
| `expire` | Close the current phase at its deadline |
| `expireEarly` | Ask to close a vote before its deadline; the engine must refuse |
| `command` | One player sends one command; `expect` is `REGISTERED`, `NOT_ALLOWED`, `PHASE_CLOSED` or `REFUSED` |
| `assert` | Checks on server truth, on the public view, or on what one player can see |
| `mark` | Remember every audience's view, to prove later that it did or did not change |
| `abort` | The host aborts |
| `createRejected` | The setup itself must be refused |
| `probe`, `note` | Blocked scenarios only: record what the engine does. Never an expectation |

## Statuses

`ready`: every cited rule is decided, and the scenario can be executed. `blocked`: it waits for an owner decision and asserts nothing. `manual`: evidence comes from the service, the user interface or people.

Fixtures are not results. A fixture being `ready` does not mean it has passed.

## Running

```sh
npm run check --workspace @mothership/balance
npm run scenarios --workspace @mothership/balance
```

The first needs no engine. The second executes against `@mothership/engine` of this checkout; at the bootstrap baseline that package has no rules, so nothing is executed and every ready scenario is reported as not run.

To execute against another commit, build a copy of it and pass its directory:

```sh
npm run scenarios --workspace @mothership/balance -- --engine-root /path/to/built/checkout --engine-commit <sha> --out report.json
```

## Adding or changing a scenario

1. Find or add the rule in the rulebook first. A scenario without a rule is an invented expectation.
2. Edit `v1/catalog.mjs`. Write the expected result from the rule, before running anything.
3. `npm run materialize --workspace @mothership/balance`, then `npm run traceability --workspace @mothership/balance`.
4. `npm run check --workspace @mothership/balance`.
5. If an engine disagrees, decide which is wrong by reading the rule again. Change the scenario only when the reading was wrong, and say so in the evidence report. Never change an expectation to make a run pass.
