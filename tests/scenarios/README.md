# Scenario fixtures

Deterministic scenarios for the in-person Version 1 base game, Original Powers off. Owned by Game Design and Balance (issue #5). The documents are in [`docs/balance/`](../../docs/balance/README.md).

## Layout

| Path | Contents |
| --- | --- |
| `v1/mode-7.scenarios.json`, `v1/mode-8.scenarios.json`, `v1/mode-9.scenarios.json` | One file per mode. The modes are never mixed |
| `v1/unsupported.scenarios.json` | Setups an engine must refuse |
| `v1/catalog.mjs` | The authoring source. The JSON files are produced from it and checked against it |
| `v1/exceptions.json` | The reviewed list of the fixtures that are blocked or manual: case, modes, status, decisions, whether it has a probe, and why |
| `v1/files.mjs` | Reading and writing those files; the pins they carry |
| `adapters/full-game-v1.mjs` | Binding to Backend's full-game engine API |
| `support/stub.mjs` | A scripted stand-in used only to test the runner and the invariants |
| `support/gate-reports.mjs` | Reports written from the catalogue for the tests of the report gate. Not results |
| `*.test.mjs` | Static checks, run on `node:test`, in five files. `tooling.test.mjs` tests the runner, the invariants and the report gate, which it gives one wrong thing at a time. `commands.test.mjs` starts the real commands against stand-in engines and checks their exit status. The integration gate names these five files; add tests to them, not beside them |

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
- `dependsOn` lists further rules the scenario uses on the way: the rules behind each command it expects to be accepted, behind the checkpoints it runs to and behind the weapon counts it checks. `v1/catalog.mjs` reads them mechanically from the steps, and the list is generous on purpose. Its use is to find every scenario that a rule touches if a reading is ever decided differently. It decides no expectation.
- `setup` names the recorded facts of the match: who holds which role, the starting rooms, the three other Code numbers and the five turn orders. Each setup is listed once per file and is reproduced exactly from its seed label by `setupFromSeed`.
- `steps` are the inputs and the expectations. Players are written `@Role` and resolved through the setup.
- `lineage` names the specification of the earlier matrix that the scenario carries forward.

| Step | Meaning |
| --- | --- |
| `until` | Let phases expire, with no input, until the round, phase and active player match |
| `expire` | Close the current phase at its deadline |
| `expireEarly` | Ask to close a vote before its deadline; the engine must refuse |
| `command` | One player sends one command; `expect` is `REGISTERED`, `NOT_ALLOWED`, `PHASE_CLOSED` or `REFUSED`. With `twin`, the command sent in its place in the twin run of a paired case |
| `assert` | Checks on server truth, on the public view, or on what one player can see. In a paired case also `sameAsTwin` and `differsFromTwin` |
| `mark` | Remember every audience's view, to prove later that it did or did not change |
| `abort` | The host aborts |
| `createRejected` | The setup itself must be refused |
| `probe`, `note` | Blocked scenarios only: record what the engine does. Never an expectation |

## Paired cases and the stand-in

A paired case is run twice. The second run, its twin, differs in one declared respect: a `command` step has a `twin` command, or the scenario has `"twin": { "swapRoles": [roleA, roleB] }` and the two players change roles. At an `assert` step the case then says to whom the two runs must look the same (`sameAsTwin`) and to whom they must look different (`differsFromTwin`).

"Look the same" covers everything an audience can read: its view, its revision number, and any further read the binding carries beside the view. So a paired case checks a secret without knowing where an engine keeps it. If two matches that differ only in whom Supplier armed look the same to a player, that player cannot learn it; if they look the same to Supplier, Supplier has been told nothing. The players who change roles in a twin setup are different people in the two runs and must be left out of the comparison; the check refuses a case that forgets.

**The stand-in.** Twelve cases ask that Supplier is shown whom they armed. No engine does that yet (finding G17 of the integration review of 7 October), so those cases fail everywhere, and a case that fails has no negative controls. `support/disclosing.mjs` is a stand-in that adds the missing disclosure on top of a real engine, read from the engine's own truth. It holds no rule.

```sh
npm run scenarios --workspace @mothership/balance -- --engine-root /path/to/built/checkout --stand-in supply-disclosure
npm run controls --workspace @mothership/balance -- --engine-root /path/to/built/checkout --stand-in supply-disclosure
```

The first shows that every ready case can pass. The second shows that every expectation of those cases is detected when it is made wrong, and then makes the stand-in leak in three ways that a real disclosure could go wrong, and requires a paired case to catch each. Neither is evidence about an engine: each run says so, its report names the stand-in as its adapter, and the report gate refuses it.

## Statuses

`ready`: every cited rule is decided, and the scenario can be executed. `blocked`: it waits for an owner decision and asserts nothing. `manual`: evidence comes from the service, the user interface or people.

Fixtures are not results. A fixture being `ready` does not mean it has passed.

Every fixture that is not `ready` must be in `v1/exceptions.json` with the same status and decisions. The static check and the report gate both fail on any difference, in either direction. This is what keeps a failing case from being quietly marked blocked: the list is a second statement that has to be changed, and reviewed, as well.

## Running

```sh
npm run check --workspace @mothership/balance -- --allow-missing-overlay
npm run scenarios --workspace @mothership/balance
```

The first needs no engine. A skipped test fails it. On a branch without the engine three tests cannot run, because the owner-decision file they read arrives with the engine; the switch accepts exactly those three as not run and names them. In a checkout that contains the engine, leave the switch out: it is refused there, and every test runs. The second executes against `@mothership/engine` of this checkout; at the bootstrap baseline that package has no rules, so nothing is executed and every ready scenario is reported as not run. It then exits 0. Where the command is a gate, add `-- --require-engine`: a run that executed nothing then exits 2.

To execute against another commit, build a copy of it and pass its directory:

```sh
npm run scenarios --workspace @mothership/balance -- --engine-root /path/to/built/checkout --engine-commit <sha> --out report.json
```

Where a decision depends on the result, the exit status of that command is not enough. Run the engine gate, which also runs the controls and the playouts and then holds the three reports to the catalogue, the exception list and each other:

```sh
npm run engine-gate --workspace @mothership/balance -- --engine-root /path/to/a/clean/checkout --out-dir /a/directory/outside/both/checkouts
```

It needs clean commits on both sides. `docs/balance/README.md` describes the gate. In CI the gate for a merge is Integration's own guard, which runs these same commands; `docs/balance/integration-requests.md` says how the two relate.

## Adding or changing a scenario

1. Find or add the rule in the rulebook first. A scenario without a rule is an invented expectation.
2. Edit `v1/catalog.mjs`. Write the expected result from the rule, before running anything.
3. `npm run materialize --workspace @mothership/balance`, then `npm run traceability --workspace @mothership/balance`.
4. If the scenario is blocked or manual, add it to `v1/exceptions.json` with its decision and the reason. If a decision has made it ready, remove it there.
5. `npm run check --workspace @mothership/balance`, with `-- --allow-missing-overlay` on a branch without the engine.
6. If an engine disagrees, decide which is wrong by reading the rule again. Change the scenario only when the reading was wrong, and say so in the evidence report. Never change an expectation to make a run pass.
