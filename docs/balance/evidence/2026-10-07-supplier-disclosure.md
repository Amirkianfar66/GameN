# Evidence report: Supplier's disclosure, 7 October 2026

> **A record, not the current evidence.** This report describes runs made from commit `b94a98a` against the engine of the hosted branch as it was before the fix for finding G17: the fixtures that ask what Supplier is told fail there, and nothing else does. It was written the same afternoon that Backend published that fix (draft PR #65), and before this branch knew of it. Three things in it no longer hold. A fix exists, and the catalogue passes against it: see [the evidence report on the fix](2026-10-07-supplier-fix.md). The stand-in of section 4 is gone: the binding now reads a seat's own acknowledgments from the engine, and the deliberate leaks are laid beside that real read. And the binding no longer runs an engine without that read, so the commands of sections 2 to 4 cannot be repeated with the present tooling; check out `b94a98a` to repeat them. The static check still verifies that this prose repeats its artifacts and that exactly those fixtures failed. Everything below is as it was written.

**Author:** Game Design and Balance (issue [#5](https://github.com/Amirkianfar66/GameN/issues/5)), Claude Code desktop app, model `claude-opus-5-5`.
**Everything below was actually run on 7 October 2026.** The reports carry their own times in UTC, from 2026-10-07 16:21 to 2026-10-07 16:26. Nothing here is a human playtest, and nothing here is a balance result.

This is the current evidence: it describes the fixtures that are committed now. The reports of [6 October](2026-10-06-baseline.md) and of [7 October on the report gate](2026-10-07-report-gate.md) are records of the catalogue as it was then.

## The short version

The integration review of 7 October found that the engine never tells Supplier which of their weapons were given, which the approved decision V1-16 requires (its finding G17), and that the catalogue did not cover it. The catalogue now covers it. **Seventeen fixtures fail against the engine of the hosted branch, all of them for that one reason, and the report gate is red.** That is the correct result until the engine is fixed.

| What | Passed | Failed | Blocked | Not run |
| --- | --- | --- | --- | --- |
| Workspace verification on this branch (`npm run verify`) | 16 tests and 4 checks | 0 | 0 | 0 |
| Balance static checks on this branch (`npm run check`, with `--allow-missing-overlay`) | 70 | 0 | 0 | 3 |
| Scenarios against the engine of the hosted branch `c885624` | 499 | **17** | 33 | 6 |
| The same scenarios through the disclosure stand-in. **Not evidence about the engine** | 516 | 0 | 33 | 6 |
| Human playtests | 0 | 0 | 0 | All |

| Check | Result |
| --- | --- |
| The report gate on the three reports of the real run | **Failed**, as it should: 25 problems. Every one is one of the 17 fixtures of G17, or the controls report saying the same of them |
| Negative controls against the real engine | Failed as a run, as it should: 17 baselines do not pass, so their controls could not be tried. The 4414 controls of the other baselines were all detected |
| Negative controls through the stand-in | 4490 controls, all detected |
| Twenty-seven deliberate leaks in the stand-in | Each caught by a comparison of two runs, with every number of players for which it tells anybody anything. Each of the 63 paired fixtures that say two runs look the same failed for at least one of them |
| Seeded playouts against the real engine, 200 per mode | 600 finished, no invariant violation, hint mismatch or replay mismatch |

The 85 new fixtures change no existing expectation. Every one of the 470 fixtures of the earlier catalogue has the result it had; three blocked fixtures, `MOVE-05` in every mode, now record one observation more.

## Pins

| Item | Value |
| --- | --- |
| Repository and branch | `Amirkianfar66/GameN`, `agent/game-balance-supplier-disclosure`, which continues `agent/game-balance-ci-gate` from `e0239bfc80da7645eef5994160a3184132179919` |
| Base commit (`BASE_SHA`) | `333c9e820f362a211352bc689372663f29b73ac4` |
| Commit of the fixtures and tooling that produced the reports | `b94a98a2ed2ce0099e31a261317bcb1ba3369d44`, clean tree |
| Source manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` |
| Owner-decision overlay SHA-256 | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`, read beside the engine |
| Combined Version 1 manifest SHA-256 | `451fc57ec28355e022d7b2c0d588ae4d92bad876dd841bdf599467ff920eedf2`, read beside the engine. The three hashes are separate pins |
| Rulebook | `rulebook-v1-2026-10-07-r4`, SHA-256 `bb47ff66fed5a07631f5df8b9bd6467e557f35aec019662242325fd9bdc14bd0` |
| Engine under test | The hosted branch as the integration review of 7 October read it: draft PR [#53](https://github.com/Amirkianfar66/GameN/pull/53), commit `c8856242caea349b620345349f6b59c7a87b6d7f`, unmerged. The commit was read from Git in a clean checkout of it |
| Digest of the built engine and contracts modules | `6f235aff92dd4c0775e388e5436301e32a22441336b15e28b3514b60b3470826`, the same as for the landing candidate `71dfd02` and for `8d4a2e5` |
| Engine, ruleset and protocol as the engine reports them | `full-game-1.0.0`, `in-person-v1-2026-10-06`, protocol 2 |
| Toolchain | Node 22.21.1, npm 10.9.4, macOS |
| Seeds | Scenario setups as in the baseline report. Playouts `walk-1` to `walk-200` per mode |

## 1. Checks on this branch

```sh
npm ci
npm run clean
npm run verify
npm run check --workspace @mothership/balance -- --allow-missing-overlay
```

`npm run verify` passed: toolchain, workspace boundaries, source integrity, typecheck, build, and 16 of 16 bootstrap tests.

The static check passed with the switch: of 73 tests in 5 files 70 passed and 3 were not run, with none failed, cancelled or marked todo. The three are the tests that read the owner-decision file, which is not on a branch without the engine; in a scratch merge with the hosted branch they ran (section 5). Without the switch the command exits 1 on this branch and says why.

## 2. The catalogue against the engine of the hosted branch

The hosted branch was checked out at `c8856242caea349b620345349f6b59c7a87b6d7f` in a throwaway clone outside every worktree, installed with its own lockfile and built. No branch or worktree of the project was changed. Then, from this branch at the clean commit named above:

```sh
npm run engine-gate --workspace @mothership/balance -- --engine-root <checkout> --engine-commit c8856242caea349b620345349f6b59c7a87b6d7f --playouts-per-mode 200 --out-dir <directory outside both checkouts>
```

**Scenarios.**

| Mode | Total | Passed | Failed | Blocked | Not run |
| --- | --- | --- | --- | --- | --- |
| 7 players | 176 | 159 | 4 | 11 | 2 |
| 8 players | 182 | 163 | 6 | 11 | 2 |
| 9 players | 189 | 169 | 7 | 11 | 2 |
| Unsupported configurations | 8 | 8 | 0 | 0 | 0 |
| All | 555 | 499 | 17 | 33 | 6 |

Artifact: [2026-10-07-g17-scenarios-engine-c885624.json](2026-10-07-g17-scenarios-engine-c885624.json).

The fixtures that fail, and what the runner said of each:

| Case | Players | What it asks | What the runner said |
| --- | --- | --- | --- |
| `SUP-11` | 7, 8, 9 | When the Supplier stage has resolved, Supplier is shown whom they armed, and nobody before it | Whom Supplier armed: "this engine tells the player nothing about it" |
| `SUP-12` | 8, 9 | A recipient eliminated in Round 3 was given nothing, and Supplier is not shown them as armed | Whom Supplier armed: "this engine tells the player nothing about it" |
| `SUP-13` | 7, 8, 9 | A Supplier injured in Round 3 after registering is still shown whom they armed | Whom Supplier armed: "this engine tells the player nothing about it" |
| `SUP-14` | 9 | An Officer who has fired is still given a weapon, and Supplier is shown the Officer as armed | Whom Supplier armed: "this engine tells the player nothing about it" |
| `SUP-16` | 7, 8, 9 | What Supplier is shown after the Supplier stage depends on whom they armed | The twin run looks exactly the same to Supplier |
| `SUP-24` | 8, 9 | A Supplier eliminated in Round 3 after registering is still shown whom they armed | Whom Supplier armed: "this engine tells the player nothing about it" |
| `SUP-25` | 7, 8, 9 | A Supplier voted into Jail in Round 3 after registering is still shown whom they armed | Whom Supplier armed: "this engine tells the player nothing about it" |

`SUP-16` is the case that needs no knowledge of where a fact is kept. It is the comparison the integration review and Backend each made by hand, and it gives their answer: two matches that differ only in whom Supplier armed look exactly the same to Supplier afterwards.

Of the new fixtures, 68 pass: `SUP-15`, `SUP-17`, `SUP-19`, `SUP-20`, `SUP-21`, `SUP-22`, `SUP-26`, `SUP-27`, `SUP-28`, `SUP-29`, `CODE-11`, `CODE-12`, `CODE-13`, `PROT-09`, `SCAN-08`, `VIEW-04`, `VIEW-05`, `VIEW-07`, `VIEW-08`, `VIEW-09` and `VIEW-10` in every mode; `SUP-18` and `VIEW-06` with eight and nine players; `SUP-23` with nine players. They say what the engine already does. The weapons are given whatever happens to Supplier afterwards. Nobody else can tell whom Supplier armed, or that anybody was armed, in any phase up to the last vote of Round 5, also when an armed player is then injured or jailed. A recipient is not told who Supplier is, whatever their team and also when they fire. What Supplier is given does not change with the team of a player they armed, with whether the weapon is of use, with the weapons that player already held, or with which of them fired. Who holds which role, and what the Code is, changes nothing that the table or a player who may not know it can read. Nobody but Alien can tell a right Code attempt from a wrong one before the Round 5 check, and nobody but Hacker can tell what was entered or that anything was. Nobody but Undercover can tell who was protected, and nobody but Hacker whom Hacker scanned.

Of the new fixtures, 66 are paired cases, under 23 case codes: each is run twice with one declared difference, and says to whom the two runs must look the same and to whom they must differ. All but `SUP-16` compare in every phase of a span and not at chosen moments, and each comparison covers a player's view, any further read beside it, and the receipts of that player's own commands.

**Negative controls.**

| Mode | Ready scenarios | Controls | Detected | Undetected |
| --- | --- | --- | --- | --- |
| 7 players | 163 | 1403 | 1403 | 0 |
| 8 players | 169 | 1391 | 1391 | 0 |
| 9 players | 176 | 1620 | 1620 | 0 |

Artifact: [2026-10-07-g17-controls-engine-c885624.json](2026-10-07-g17-controls-engine-c885624.json). The run's own verdict is failed, which is right: the 17 fixtures above do not pass unmodified, so their controls could not be tried, and the command exits 1. The controls of every other ready scenario were executed and detected.

**Seeded playouts.**

| Mode | Playouts | Finished | Phases | Commands accepted | Commands refused | Invariant violations | Hint mismatches | Replay mismatches |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7 players | 200 | 200 | 10108 | 16974 | 17490 | 0 | 0 | 0 |
| 8 players | 200 | 200 | 11230 | 18899 | 21970 | 0 | 0 | 0 |
| 9 players | 200 | 200 | 12314 | 20752 | 27599 | 0 | 0 | 0 |

Artifact: [2026-10-07-g17-playouts-engine-c885624.json](2026-10-07-g17-playouts-engine-c885624.json). The playouts do not depend on the catalogue. No invariant is broken by an engine that tells Supplier nothing: an invariant can say that something forbidden happened, and cannot say that something required is missing. That is why G17 needed a scenario.

## 3. The gate on these reports

```text
Balance report gate: FAILED, 25 problems.
  controls: the run's own verdict is failed
  controls: the list of baselines that did not pass has 17 entries
  controls: 7 players: baselines that did not pass: 4
  controls: 7 players: 1403 controls executed, 1419 generated from the catalogue
  controls: 8 players: baselines that did not pass: 6
  controls: 8 players: 1391 controls executed, 1418 generated from the catalogue
  controls: 9 players: baselines that did not pass: 7
  controls: 9 players: 1620 controls executed, 1653 generated from the catalogue
  scenarios: V1-M7-SUP-11 is ready and was failed: view of @Supplier: armedBySupply: expected the set [], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M7-SUP-13 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-5","seat-6"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M7-SUP-16 is ready and was failed: the twin run looks exactly the same to: seat-2
  scenarios: V1-M7-SUP-25 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-5","seat-6"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M8-SUP-11 is ready and was failed: view of @Supplier: armedBySupply: expected the set [], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M8-SUP-12 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-7"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M8-SUP-13 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-5","seat-7"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M8-SUP-16 is ready and was failed: the twin run looks exactly the same to: seat-2
  scenarios: V1-M8-SUP-24 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-5","seat-7"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M8-SUP-25 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-5","seat-7"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M9-SUP-11 is ready and was failed: view of @Supplier: armedBySupply: expected the set [], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M9-SUP-12 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-8"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M9-SUP-13 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-6","seat-8"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M9-SUP-14 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-4","seat-8"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M9-SUP-16 is ready and was failed: the twin run looks exactly the same to: seat-2
  scenarios: V1-M9-SUP-24 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-6","seat-8"], observed "nothing: this engine tells the player nothing about it"
  scenarios: V1-M9-SUP-25 is ready and was failed: view of @Supplier: armedBySupply: expected the set ["seat-6","seat-8"], observed "nothing: this engine tells the player nothing about it"
```

The gate is red for one defect and nothing else. A static test holds the three reports to the gate on every run and requires exactly this: the 17 fixtures, the controls report saying the same of them, and no problem of any other kind. When an engine tells Supplier whom they armed, the reports will be produced again and that test will require a clean pass.

## 4. Through the stand-in

Fixtures that cannot pass on any current engine are fixtures nobody has seen pass. A wrong expectation in one of them would send Backend after a test that can never be satisfied. So they were tried against the same engine with one thing added: a stand-in that tells Supplier whom the Supplier stage armed, read from the engine's own truth at the moment Round 3 resolves. It holds no rule. `tests/scenarios/support/disclosing.mjs` is the whole of it.

```sh
npm run scenarios --workspace @mothership/balance -- --engine-root <checkout> --engine-commit c8856242caea349b620345349f6b59c7a87b6d7f --stand-in supply-disclosure --out <file>
npm run controls --workspace @mothership/balance -- --engine-root <checkout> --engine-commit c8856242caea349b620345349f6b59c7a87b6d7f --stand-in supply-disclosure --out <file>
```

| Mode | Total | Passed | Failed | Blocked | Not run |
| --- | --- | --- | --- | --- | --- |
| 7 players | 176 | 163 | 0 | 11 | 2 |
| 8 players | 182 | 169 | 0 | 11 | 2 |
| 9 players | 189 | 176 | 0 | 11 | 2 |
| Unsupported configurations | 8 | 8 | 0 | 0 | 0 |
| All | 555 | 516 | 0 | 33 | 6 |

| Mode | Ready scenarios | Controls | Detected | Undetected |
| --- | --- | --- | --- | --- |
| 7 players | 163 | 1419 | 1419 | 0 |
| 8 players | 169 | 1418 | 1418 | 0 |
| 9 players | 176 | 1653 | 1653 | 0 |

Artifacts: [2026-10-07-g17-scenarios-stand-in.json](2026-10-07-g17-scenarios-stand-in.json) and [2026-10-07-g17-controls-stand-in.json](2026-10-07-g17-controls-stand-in.json).

Every ready case passes, so the failing ones can pass. Every single-expectation change of every ready case is detected, theirs included, so each of their expectations checks something.

Then the stand-in was made to leak, in twenty-seven ways that a private read beside the view, or a receipt, could be built wrongly. A changed expectation tests a case's own checks. A leak tests whether the cases together watch the right things. Three rules make the result mean something. A leak counts as caught only where a comparison of two runs fails and names who could tell them apart; a case that fails for any other reason counts as a fault of the control. A leak has to be caught with every number of players for which it tells anybody anything. And the other way round: every paired fixture that says two runs look the same has to have failed for at least one leak, or it has not been shown to watch anything. All 63 did.

| The stand-in was made so that | Caught by | Who could tell the two runs apart |
| --- | --- | --- |
| each recipient is told which seat armed them, which is to say who Supplier is | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9) | In `V1-M7-SUP-17`: Hacker, Insider |
| each recipient is told which seat armed them, but only from their own next turn | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9) | In `V1-M7-SUP-17`: Hacker |
| each recipient is told who else was armed | `SUP-15` (7, 8, 9); `SUP-20` (7, 8, 9) | In `V1-M7-SUP-15`: Insider |
| the recipient who was named second is told who was named first | `SUP-20` (7, 8, 9) | In `V1-M7-SUP-20`: Insider |
| everyone can read the list of players Supplier armed | `SUP-15` (7, 8, 9); `SUP-20` (7, 8, 9); `SUP-21` (7, 8, 9); `SUP-28` (7, 8, 9) | In `V1-M7-SUP-15`: the table |
| everyone can read how many weapons were given, and nothing about to whom | `SUP-21` (7, 8, 9); `SUP-28` (7, 8, 9) | In `V1-M7-SUP-21`: the table |
| Supplier is told the team of each player they armed | `SUP-22` (7, 8, 9); `SUP-27` (7, 9) | In `V1-M7-SUP-22`: Supplier |
| Supplier is told whether each weapon they gave can be used | `SUP-23` (9) | In `V1-M9-SUP-23`: Supplier |
| everyone can read a mark on each seat that follows the player's team | `SUP-22` (7, 8, 9); `SUP-27` (7, 9); `VIEW-05` (7, 8, 9); `VIEW-06` (8, 9); `VIEW-08` (7, 8, 9); `VIEW-09` (7, 8, 9); `VIEW-10` (7, 8, 9) | In `V1-M7-SUP-22`: the table |
| each Red player is shown who the other Red players are | `SUP-22` (7, 8, 9); `SUP-27` (9); `VIEW-05` (7, 8, 9); `VIEW-06` (8, 9); `VIEW-09` (8, 9); `VIEW-10` (8, 9) | In `V1-M7-SUP-22`: Undercover |
| everyone can read a mark on each seat that follows whether its number is in the Code | `CODE-11` (7, 8, 9); `VIEW-07` (7, 8, 9); `VIEW-08` (7, 8, 9); `VIEW-10` (7, 8, 9) | In `V1-M7-CODE-11`: the table |
| Hacker is told at once whether the Code attempt was right | `CODE-11` (7, 8, 9) | In `V1-M7-CODE-11`: Hacker |
| Supplier is told how many weapons each player they armed then held | `SUP-27` (7, 8, 9) | In `V1-M7-SUP-27`: Supplier |
| from the phase after it happens, Supplier is told which of the players they armed has fired | `SUP-29` (7, 8, 9) | In `V1-M7-SUP-29`: Supplier |
| a recipient is told which seat armed them at the moment they register a shot | `SUP-17` (7, 8, 9) | In `V1-M7-SUP-17`: Insider |
| each recipient is told which seat armed them, from their own Round 5 turn | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9) | In `V1-M7-SUP-17`: Insider |
| a recipient who is not Blue is told which seat armed them | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9) | In `V1-M7-SUP-17`: Hacker |
| everyone can read a mark on each armed seat whose player is no longer Healthy and free | `SUP-28` (7, 8, 9) | In `V1-M7-SUP-28`: the table |
| during a Jail vote everyone can read how many actions were registered in the round | `SUP-21` (7, 8, 9); `SUP-28` (7, 8, 9) | In `V1-M7-SUP-21`: the table |
| everyone can read a mark on one seat, and it is always the seat of Alien | `VIEW-08` (7, 8, 9); `VIEW-10` (7, 8, 9) | In `V1-M7-VIEW-08`: the table |
| everyone can read a mark on one seat, and it is always the seat of Supplier | `SUP-17` (7, 8, 9); `SUP-26` (7, 8, 9); `VIEW-04` (7, 8, 9); `VIEW-05` (7, 8, 9); `VIEW-08` (8); `VIEW-09` (8) | In `V1-M7-SUP-17`: the table |
| from the phase after the attempt, Alien is told whether the Code attempt was right | `CODE-12` (7, 8, 9); `CODE-13` (7, 8, 9) | In `V1-M7-CODE-12`: Alien |
| from the phase after the attempt, everyone can read that the Code attempt was used | `CODE-13` (7, 8, 9) | In `V1-M7-CODE-13`: the table |
| the receipt of the Code attempt says whether it was right | `CODE-11` (7, 8, 9) | In `V1-M7-CODE-11`: Hacker |
| the receipt of Supplier's choice says which team each named player is on | `SUP-22` (7, 8, 9); `SUP-27` (7, 9) | In `V1-M7-SUP-22`: Supplier |
| from the phase after the grant, a player who was given a Protection is told so | `PROT-09` (7, 8, 9) | In `V1-M7-PROT-09`: Insider, Cracker |
| from the phase after the Scan, a player whom Hacker scanned is told so | `SCAN-08` (7, 8, 9) | In `V1-M7-SCAN-08`: Insider, Cracker |

The last column is from the first comparison that failed in the first fixture that caught the leak, with each seat given as the role that held it in the first run. "The table" is what everyone can read.

**How the cases came to this.** Run with the tooling of this commit against the same twenty-seven leaks, the paired cases as they first stood on this branch (commit `06e7c01`: `SUP-15`, `SUP-16`, `SUP-17` and `VIEW-04`) catch four, and the cases as they stood after a first independent reading (commit `7d63089`, twelve case codes) catch fifteen. Two of those fifteen, the leaks in receipts, are caught only because the tooling now compares receipts; at its own commit that set did not. The present cases catch all twenty-seven. Those two runs were made once with a scratch script, and their output is not kept as an artifact.

**None of this is evidence about the engine.** Each of these runs says so when it starts, its report names the stand-in as its adapter, and the report gate refuses such a report. It is evidence about the fixtures: that they can be satisfied, and that they would notice these mistakes.

## 5. For Integration: what moves when this catalogue is adopted

Integration's guard in PR #47 pins the catalogue by hash and by count, so that a change to it cannot pass without review. This is such a change. BAL-REQ-8 asks that it be adopted in the change that fixes G17, and not before. The values at the commit named above:

| Pinned by PR #47 | Value now |
| --- | --- |
| `mode-7.scenarios.json` | `7362e623e97d85bcb32382cb94991149f28638ae62967db34bc1e9bccc3f7782` |
| `mode-8.scenarios.json` | `a31f78ad73aec5a3ffa1614031b2e4958da139dd7c327f59c183db590b460f71` |
| `mode-9.scenarios.json` | `a4a32ea4b39bf3bfe5c507027843ac976efa8eec999f2a0646c93b6357a9d1f4` |
| `unsupported.scenarios.json` | `f4c4a7c044c4596f4be251c0338aff23daa4f749dff90bb267022d83b706ee9c`. Only its header changed: it names the rulebook version |
| `tests/scenarios/v1/catalog.mjs` | `506338169a94d08f189086d59d8c7b984c1012ba4695ce0f09c8d550da3b7a7a` |
| `docs/balance/game-rules.md` | `bb47ff66fed5a07631f5df8b9bd6467e557f35aec019662242325fd9bdc14bd0` |
| Fixtures | 555: 176, 182 and 189 for seven, eight and nine players, and 8 unsupported configurations |
| Ready, and passing once Supplier is told | 516: 163, 169, 176 and 8 |
| Blocked and manual | 33 and 6, unchanged, and the same cases |
| Control baselines and controls, once Supplier is told | 508 baselines: 163, 169 and 176. 4490 controls: 1419, 1418 and 1653 |
| Balance static tests | 73 in the five files the guard names, counting the two that bind this report; 71 at the commit named above |

The numbers of the rows on passing cases and controls are from the run through the stand-in. They are what a fixed engine should give; they are not a result of any engine.

**Two scratch merges** were made at `b94a98a2ed2ce0099e31a261317bcb1ba3369d44`, the commit of the fixtures and tooling, in throwaway clones outside every worktree. This report and the two tests that bind it were committed after them and change nothing the merges depend on, except that the static check has two tests more.

With the hosted branch, `c885624`: no file outside the Balance directories differs from that commit. The static check ran plain, without the switch: 71 tests, all passed, the three that read the owner-decision file among them. The hosted branch's own `npm run verify` passed, 651 tests. The engine gate in that tree, pinned to the merge commit and with ten playouts per mode, gave what the cross-checkout run gave: 555 fixtures, 499 passed, 17 failed, 33 blocked and 6 not run, and a gate that is red with the same 25 problems.

With Integration's guard, the head of PR #47, `40e47f0`: no file outside the Balance directories differs from that commit. Its static gate passed and read "71 executed, 71 passed". Its engine gate stopped at the first pin that has moved, "Balance gate: reviewed rulebook changed", and its `verify` stopped at the same message in the guard's own regression suite. That is the guard doing its work: the catalogue and the rulebook have changed, and Integration has not reviewed the change yet.

## 6. Independent readings

Two readings were made by separate Claude Code agents. Each was given a commit, asked to find its faults and not to take the author's claims on trust, and had a copy of its own to experiment in. Neither is a review by a person.

**The first**, of commit `06e7c01`, found no wrong expected result. It found that a third new rulebook row, which said that what a player is told stays in their view, was a new requirement and not a reading; the row was withdrawn. It found that the first paired cases checked who was armed and not whether anybody was, only the recipient named first, nothing of what Supplier is told about a recipient, and role swaps between two Blue roles only; and that the binding's phase identifiers counted commands, so that two runs could differ for the harness's own reasons. All of it was changed in `ef39487`.

**The second**, of commit `ef39487`, again found no expectation that an engine correct under the approved rules would fail. It tried Backend's proposal as the stand-in models it, and a variant in which other seats have no read at all. It ran the catalogue itself and confirmed the counts of that commit. Its findings, and what was done about each in `b94a98a`:

| Finding | What was done |
| --- | --- |
| Four expectations rested on readings that were not registered: that a recipient is not told who else was armed; that a Supplier who has been Eliminated is still told; that Hacker is not told whether the attempt was right; and that one swap case holds only because Red players do not know each other | Reading D40 registered for the first. Reading D39 widened to say the second openly: it is an argument from V1-16 making no exception. Row R-ROLE-22 added for the third, which follows from V1-08 and V1-18 and which Backend reads the same way. The swap cases now cite R-SETUP-12 |
| Command receipts were never compared. A receipt that said whether the Code attempt was right, or which team Supplier's recipients are on, passed every case | The binding keeps the receipts of each player's commands, and a comparison of two runs includes them. Two leaks in receipts are among the twenty-seven |
| Ten disclosure faults passed every paired case, every other ready fixture and every invariant. Most told somebody a phase or a round later than the moments the cases sampled | A step that compares in every phase of a span, and further cases that vary what the first ones held still. All ten are among the twenty-seven and are caught |
| The check accepted comparisons that could not fail: one that names nobody, one that names a seat outside the match, a twin command equal to the command, a comparison before the two runs differ | Each is refused. None had occurred in a fixture |
| Command identifiers counted every command, so that after a twin run that sends nothing a bystander's later command would differ for the harness's sake. And a swap twin compared on a swapped player's turn compares two different moments | Identifiers count one player's commands. The runner refuses to compare two runs that are not in the same phase |
| Documents claimed more than the fixtures held: "nothing" left unasserted for a weapon and for the Code, swaps with Alien or Undercover called impossible, "at once or later", receipts not named among what is uncovered | Corrected. The audit's table says for each fact what is not asserted, and a section says what a comparison of two runs cannot show |

**What has not been read independently:** the changes of `b94a98a` themselves. They are covered by the unit tests, by the negative controls and by the twenty-seven leaks, and by nothing else.

## 7. Not run

- **Any human playtest.** No session has taken place.
- **Anything on a device or in a browser**, the hosted preview included. Balance did not create or join a hosted match.
- **Any fix for G17.** None exists. The failing fixtures have been seen to pass only through the stand-in.
- **How long Supplier goes on being told.** No source says, so no case asserts it. The integration review requires a durable result of Backend's fix; that is for Backend's tests of reload, replay and recovery.
- **The event stream.** The binding reads what each audience can read as views. That no event carries a grant is for Backend's tests.
- **Seat recovery and old-identity denial** for the disclosure. They are service behaviour and Backend's to test.
- **The Firebase service, the emulator suites and the Backend package check.**
- **On this branch, the three static tests that read the owner-decision file.** They ran in the scratch merge.
- **The six manual scenarios**, and every scenario for a rule that the traceability table lists as not exercised.
- **A review by a person.** Section 6 is the reading of separate Claude Code agents.
- **Original Powers.** Off everywhere, and outside Version 1.

## Reproducing

```sh
git clone <this repository> <checkout> && git -C <checkout> checkout --detach c8856242caea349b620345349f6b59c7a87b6d7f
(cd <checkout> && npm ci && npm run build)
npm ci
npm run check --workspace @mothership/balance -- --allow-missing-overlay
npm run engine-gate --workspace @mothership/balance -- --engine-root <checkout> --engine-commit c8856242caea349b620345349f6b59c7a87b6d7f --playouts-per-mode 200 --out-dir <directory outside both checkouts>
```

The last command exits 1 and prints the failing fixtures. Add `--stand-in supply-disclosure` to the scenario and controls commands, as in section 4, to see them pass.
