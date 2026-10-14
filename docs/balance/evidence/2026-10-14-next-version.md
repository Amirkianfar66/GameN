# Evidence of 14 October 2026: what was run beside the audit of the next version

Belongs to [the audit of the specification of 13 October 2026](../next-version/README.md).

**No case of the next version was run.** No engine plays that specification. This report is about something else: short fixed lines through engines of the three versions that exist, each under its own ruleset, held to that ruleset's own rules. They show what the game does today at the points where the next version will differ or agree, and they are the first independent runs of the two rulesets Backend published after the capacity audit.

A control that passes says that one build did, in one fixed line, what that version's rules say. It is not an audit of the version, not acceptance of a pull request, and nothing about balance.

## What was run

Everything below was run on 14 October 2026 with Node 22.21.1 and npm 10.9.4, from one clean clone of this branch at `955a1931934af2499e4057bbcbb2bc747091f3ee`, against engines built in clean clones of the commits named. A ruleset was run on the build that introduced it and on every later build, which still has to play it as it was.

<!-- generated:control-runs -->
| Ruleset | Build | What the build is | Controls run | Passed | Failed | Recorded, nothing expected | Not run |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `in-person-v1-capacity-resolution-2026-10-12` | `abb6839` | full-game-1.3.0, the integration baseline, head of PR #114 | 30 | 27 | 0 | 3 | 0 |
| `in-person-v1-capacity-resolution-2026-10-12` | `bd4d77c` | full-game-1.4.0, Backend, head of draft PR #125 | 30 | 27 | 0 | 3 | 0 |
| `in-person-v1-capacity-resolution-2026-10-12` | `a9b77a7` | full-game-1.5.0, Backend, head of draft PR #131 | 30 | 27 | 0 | 3 | 0 |
| `in-person-v1-vote-results-2026-10-12` | `bd4d77c` | full-game-1.4.0, Backend, head of draft PR #125 | 18 | 18 | 0 | 0 | 0 |
| `in-person-v1-vote-results-2026-10-12` | `a9b77a7` | full-game-1.5.0, Backend, head of draft PR #131 | 18 | 18 | 0 | 0 | 0 |
| `in-person-v1-declared-hack-2026-10-12` | `a9b77a7` | full-game-1.5.0, Backend, head of draft PR #131 | 21 | 21 | 0 | 0 | 0 |
<!-- /generated:control-runs -->

For the build that introduced each ruleset, by number of players. The three numbers are three games and are not added together.

<!-- generated:control-modes -->
| Ruleset | Build |  | Controls | Passed | Failed | Recorded | Not run |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `in-person-v1-capacity-resolution-2026-10-12` | `abb6839` | 7 players | 10 | 9 | 0 | 1 | 0 |
| `in-person-v1-capacity-resolution-2026-10-12` | `abb6839` | 8 players | 10 | 9 | 0 | 1 | 0 |
| `in-person-v1-capacity-resolution-2026-10-12` | `abb6839` | 9 players | 10 | 9 | 0 | 1 | 0 |
| `in-person-v1-vote-results-2026-10-12` | `bd4d77c` | 7 players | 6 | 6 | 0 | 0 | 0 |
| `in-person-v1-vote-results-2026-10-12` | `bd4d77c` | 8 players | 6 | 6 | 0 | 0 | 0 |
| `in-person-v1-vote-results-2026-10-12` | `bd4d77c` | 9 players | 6 | 6 | 0 | 0 | 0 |
| `in-person-v1-declared-hack-2026-10-12` | `a9b77a7` | 7 players | 7 | 7 | 0 | 0 | 0 |
| `in-person-v1-declared-hack-2026-10-12` | `a9b77a7` | 8 players | 7 | 7 | 0 | 0 | 0 |
| `in-person-v1-declared-hack-2026-10-12` | `a9b77a7` | 9 players | 7 | 7 | 0 | 0 | 0 |
<!-- /generated:control-modes -->

The builds, in full:

| Build | Commit | How it was built |
| --- | --- | --- |
| Engine 1.3 | `abb6839524b6dc3e5225e600f2f067c3fa3f9501`, the integration baseline, head of PR #114 | A clean clone; `npm ci`; `npx tsc --build packages/contracts packages/engine` |
| Engine 1.4 | `bd4d77ccc1c46d90c5beafb770252fdae6f086ae`, head of Backend's draft PR #125 | The same |
| Engine 1.5 | `a9b77a7bd535efc8bdb5041cee18fd6526c0e354`, head of Backend's draft PR #131 | The same |

Only the contracts and the engine were built in each clone. The root build of the two drafts stops in the Frontend, which has not adopted their phases; that is stated in both pull requests and is not part of what the controls use.

The commands, for each row of the first table:

```sh
node tools/balance/scripts/next-controls.mjs --ruleset <ruleset> --engine-root <clone> --engine-commit <commit> --require-engine --out <report>
```

The reports, in this directory:

- `2026-10-14-next-controls-v13-engine-abb6839.json`: the controls of 1.3 on the build that introduced it
- `2026-10-14-next-controls-v13-engine-bd4d77c.json`: the controls of 1.3 on the build of 1.4
- `2026-10-14-next-controls-v13-engine-a9b77a7.json`: the controls of 1.3 on the build of 1.5
- `2026-10-14-next-controls-v14-engine-bd4d77c.json`: the controls of 1.4 on the build that introduced it
- `2026-10-14-next-controls-v14-engine-a9b77a7.json`: the controls of 1.4 on the build of 1.5
- `2026-10-14-next-controls-v15-engine-a9b77a7.json`: the controls of 1.5 on the build that introduced it
- `2026-10-14-next-controls-contrast-engine-a9b77a7.json`: the controls of the controls

Each report carries, for every control and number of players, every check with what was expected and what the engine did; the commit and the cleanness of both trees; the tuple the matches were created under and the build that played them; and the hashes of the controls and of the catalogue of cases that were committed when it ran. A test holds this document and the matrices to the reports.

## Each control

<!-- generated:control-detail -->
| Control | What it holds the version to | Read from | Cases of the next version at the same point | Result on each build |
| --- | --- | --- | --- | --- |
| V13-01 | The Jail vote closes straight into the resolution: there is no result window | R-RES-01, R-FLOW-03, R-FLOW-07 | BLK-01 | `abb6839` passed with 7, 8 and 9; `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V13-02 | A Hack is one phase of sixty seconds, and only the two read who the partner is | R-FLOW-06, R-VIEW-07, R-HACK-02, BAL-C12 | HCK-01, HCK-03 | `abb6839` passed with 7, 8 and 9; `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V13-03 | A move is accepted during the last player's Hack and refused in the Jail vote | R-MOVE-01, R-FLOW-06 | MOV-04, MOV-05 | `abb6839` passed with 7, 8 and 9; `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V13-04 | A move while a Captain election is being held | R-MOVE-08 | MOV-14 | `abb6839` recorded with 7, 8 and 9; `bd4d77c` recorded with 7, 8 and 9; `a9b77a7` recorded with 7, 8 and 9 |
| V13-05 | A Disabler names a player on their own turn, and an injury does not kill with time | R-ROLE-05, R-ACT-07, R-STATE-02, R-STATE-06 | BLK-02, HSP-01 | `abb6839` passed with 7, 8 and 9; `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V13-06 | A player who is Jailed and Injured is in Jail | R-STATE-07, R-ACT-05, R-ACT-06 | HSP-02 | `abb6839` passed with 7, 8 and 9; `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V13-07 | A block is read by Undercover and by nobody else | R-PROT-06, R-VIEW-06, R-PROT-03 | DEF-01, DEF-03 | `abb6839` passed with 7, 8 and 9; `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V13-08 | A release takes the Captain's choice and then a vote | R-VOTE-05, R-VOTE-06, R-VOTE-07, R-FLOW-13 | CAP-01 | `abb6839` passed with 7, 8 and 9; `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V13-09 | The showdown moves everybody who is left to the Final Zone | R-SHOW-01, R-SHOW-02, R-WIN-10 | SHW-01 | `abb6839` passed with 7, 8 and 9; `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V13-10 | An Eliminated player's faction is public in the first phase after the resolution | R-RES-05, R-VIEW-03 | CAP-02 | `abb6839` passed with 7, 8 and 9; `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V14-01 | A Jail vote ends in a result of five seconds; what it decides applies at once, and the round resolves afterwards | VOTE-RESULT-01, VOTE-RESULT-02, VOTE-RESULT-03 | BLK-01, VOT-01 | `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V14-02 | Nothing is accepted during a result | VOTE-RESULT-04 | VOT-03 | `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V14-03 | A closure that comes late takes nothing from the phase after it | VOTE-RESULT-04, VOTE-RESULT-05 | VOT-02 | `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V14-04 | An election and its runoff each end in a result, and the elected Captain is placed when the vote closes | VOTE-RESULT-01, VOTE-RESULT-03, R-CAPT-02, R-CAPT-05 | VOT-04, VOT-01 | `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V14-05 | A vote in which nobody votes still ends in a result | VOTE-RESULT-01 | BLK-01 | `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V14-06 | A release vote ends in a result, and the Jail vote after it has its full time | VOTE-RESULT-01, VOTE-RESULT-03, R-VOTE-06 | CAP-01 | `bd4d77c` passed with 7, 8 and 9; `a9b77a7` passed with 7, 8 and 9 |
| V15-01 | Fifteen, five, sixty: a declaration ends the first stage early | HACK-DECLARE-01, HACK-DECLARE-03, HACK-DECLARE-06 | HCK-03 | `a9b77a7` passed with 7, 8 and 9 |
| V15-02 | No declaration: the result says so and makes up no side | HACK-DECLARE-03 | HCK-04 | `a9b77a7` passed with 7, 8 and 9 |
| V15-03 | Who may declare what | HACK-DECLARE-02, R-ROLE-12, R-ROLE-16 | HCK-02 | `a9b77a7` passed with 7, 8 and 9 |
| V15-04 | The claim and the partner are read by the two only | HACK-DECLARE-04, R-VIEW-07 | HCK-01, HCK-02 | `a9b77a7` passed with 7, 8 and 9 |
| V15-05 | A move is accepted in each of the three stages, also in the last player's Hack | HACK-DECLARE-06, R-MOVE-01 | MOV-03, MOV-05 | `a9b77a7` passed with 7, 8 and 9 |
| V15-06 | Deadlines that come late take nothing from the stage after them | HACK-DECLARE-07, HACK-DECLARE-03 | HCK-06 | `a9b77a7` passed with 7, 8 and 9 |
| V15-07 | A Code is refused in the two preludes and accepted in the conversation | HACK-DECLARE-06, R-ROLE-15 | VOT-03 | `a9b77a7` passed with 7, 8 and 9 |
<!-- /generated:control-detail -->

## Where nothing was expected

One control concerns a point the rulebook leaves open, a move during a Captain election (D16). It holds the engine to nothing and is recorded, not passed. The packet of 13 October does not say what the next version does there (finding NV-F-05).

<!-- generated:recorded -->
| Control | Build | What is recorded | What the engine did |
| --- | --- | --- | --- |
| CTL-M7-V13-04 | `abb6839` | the Cracker is offered a destination during the election | true |
| CTL-M7-V13-04 | `abb6839` | a move sent during the election | "REGISTERED" |
| CTL-M7-V13-04 | `abb6839` | the round whose move it used | 2 |
| CTL-M8-V13-04 | `abb6839` | the Cracker is offered a destination during the election | true |
| CTL-M8-V13-04 | `abb6839` | a move sent during the election | "REGISTERED" |
| CTL-M8-V13-04 | `abb6839` | the round whose move it used | 2 |
| CTL-M9-V13-04 | `abb6839` | the Cracker is offered a destination during the election | true |
| CTL-M9-V13-04 | `abb6839` | a move sent during the election | "REGISTERED" |
| CTL-M9-V13-04 | `abb6839` | the round whose move it used | 2 |
| CTL-M7-V13-04 | `bd4d77c` | the Cracker is offered a destination during the election | true |
| CTL-M7-V13-04 | `bd4d77c` | a move sent during the election | "REGISTERED" |
| CTL-M7-V13-04 | `bd4d77c` | the round whose move it used | 2 |
| CTL-M8-V13-04 | `bd4d77c` | the Cracker is offered a destination during the election | true |
| CTL-M8-V13-04 | `bd4d77c` | a move sent during the election | "REGISTERED" |
| CTL-M8-V13-04 | `bd4d77c` | the round whose move it used | 2 |
| CTL-M9-V13-04 | `bd4d77c` | the Cracker is offered a destination during the election | true |
| CTL-M9-V13-04 | `bd4d77c` | a move sent during the election | "REGISTERED" |
| CTL-M9-V13-04 | `bd4d77c` | the round whose move it used | 2 |
| CTL-M7-V13-04 | `a9b77a7` | the Cracker is offered a destination during the election | true |
| CTL-M7-V13-04 | `a9b77a7` | a move sent during the election | "REGISTERED" |
| CTL-M7-V13-04 | `a9b77a7` | the round whose move it used | 2 |
| CTL-M8-V13-04 | `a9b77a7` | the Cracker is offered a destination during the election | true |
| CTL-M8-V13-04 | `a9b77a7` | a move sent during the election | "REGISTERED" |
| CTL-M8-V13-04 | `a9b77a7` | the round whose move it used | 2 |
| CTL-M9-V13-04 | `a9b77a7` | the Cracker is offered a destination during the election | true |
| CTL-M9-V13-04 | `a9b77a7` | a move sent during the election | "REGISTERED" |
| CTL-M9-V13-04 | `a9b77a7` | the round whose move it used | 2 |
<!-- /generated:recorded -->

## The controls of the controls

A check that cannot fail has shown nothing. Each control that says what is particular to its own version was therefore run on purpose under the ruleset it is contrasted with, through the same build, where what it expects is false. This says nothing about that other version.

<!-- generated:contrast-summary -->
Through the build of `a9b77a7`: 16 of the 23 controls have a ruleset to be contrasted with; each was run under it with 7, 8 and 9 players, 48 runs; 48 failed, as they must, and 0 did not. The other 7 controls (V13-04, V13-05, V13-06, V13-07, V13-08, V13-09, V13-10) state nothing that a later ruleset changes and have no contrast.
<!-- /generated:contrast-summary -->

<!-- generated:contrast -->
| Control | Written for | Run on purpose under | Failed there, as it must | The first difference, with seven players |
| --- | --- | --- | --- | --- |
| V13-01 | `in-person-v1-capacity-resolution-2026-10-12` | `in-person-v1-vote-results-2026-10-12` | 3 of 3 | the phase after the Jail vote: expected "CAPTAIN_ELECTION", observed "VOTE_RESULT" |
| V13-02 | `in-person-v1-capacity-resolution-2026-10-12` | `in-person-v1-declared-hack-2026-10-12` | 3 of 3 | the phase after the turn: expected "HACK", observed "HACK_DECLARE" |
| V13-03 | `in-person-v1-capacity-resolution-2026-10-12` | `in-person-v1-declared-hack-2026-10-12` | 3 of 3 | the phase after the last turn: expected "HACK", observed "HACK_DECLARE" |
| V14-01 | `in-person-v1-vote-results-2026-10-12` | `in-person-v1-capacity-resolution-2026-10-12` | 3 of 3 | the phase after the Jail vote: expected "VOTE_RESULT", observed "CAPTAIN_ELECTION" |
| V14-02 | `in-person-v1-vote-results-2026-10-12` | `in-person-v1-capacity-resolution-2026-10-12` | 3 of 3 | the result of Round 1 is open: expected "VOTE_RESULT", observed "CAPTAIN_ELECTION" |
| V14-03 | `in-person-v1-vote-results-2026-10-12` | `in-person-v1-capacity-resolution-2026-10-12` | 3 of 3 | and lasts its five seconds: expected 5000, observed 60000 |
| V14-04 | `in-person-v1-vote-results-2026-10-12` | `in-person-v1-capacity-resolution-2026-10-12` | 3 of 3 | a tie ends in a result: expected "VOTE_RESULT", observed "CAPTAIN_ELECTION" |
| V14-05 | `in-person-v1-vote-results-2026-10-12` | `in-person-v1-capacity-resolution-2026-10-12` | 3 of 3 | after a Jail vote without ballots: expected "VOTE_RESULT", observed "CAPTAIN_ELECTION" |
| V14-06 | `in-person-v1-vote-results-2026-10-12` | `in-person-v1-capacity-resolution-2026-10-12` | 3 of 3 | the release vote ends in a result: expected "VOTE_RESULT", observed "JAIL_VOTE" |
| V15-01 | `in-person-v1-declared-hack-2026-10-12` | `in-person-v1-vote-results-2026-10-12` | 3 of 3 | the phase after the turn: expected "HACK_DECLARE", observed "HACK" |
| V15-02 | `in-person-v1-declared-hack-2026-10-12` | `in-person-v1-vote-results-2026-10-12` | 3 of 3 | after fifteen seconds without a declaration: expected true, observed false |
| V15-03 | `in-person-v1-declared-hack-2026-10-12` | `in-person-v1-vote-results-2026-10-12` | 3 of 3 | the stage is still open: expected "HACK_DECLARE", observed "HACK" |
| V15-04 | `in-person-v1-declared-hack-2026-10-12` | `in-person-v1-vote-results-2026-10-12` | 3 of 3 | Undercover declares Blue: expected "REGISTERED", observed "NOT_ALLOWED" |
| V15-05 | `in-person-v1-declared-hack-2026-10-12` | `in-person-v1-vote-results-2026-10-12` | 3 of 3 | declaration stage: expected "HACK_DECLARE", observed "HACK" |
| V15-06 | `in-person-v1-declared-hack-2026-10-12` | `in-person-v1-vote-results-2026-10-12` | 3 of 3 | declaration closed two seconds late: the result opens then: expected true, observed false |
| V15-07 | `in-person-v1-declared-hack-2026-10-12` | `in-person-v1-vote-results-2026-10-12` | 3 of 3 | a Code in the declaration stage: expected "NOT_ALLOWED", observed "REGISTERED" |
<!-- /generated:contrast -->

```sh
node tools/balance/scripts/next-controls-contrast.mjs --engine-root <clone of a9b77a7> --engine-commit a9b77a7bd535efc8bdb5041cee18fd6526c0e354 --out <report>
```

Three controls say that two runs look the same to somebody: that who cast a ballot is in no payload (V14-01), and that the partner of a Hack is read by the two only (V13-02, V15-04). For these the engine was wrapped so that its public view says the one thing it must not, and the control had to fail at its comparison of the two runs:

<!-- generated:leaks -->
| Control | What the engine was made to publish | Noticed, with 7, 8 and 9 players | The check that failed, with seven players |
| --- | --- | --- | --- |
| V14-01 | who cast a ballot | 3 of 3 | with other voters and the same total the public view is the same |
| V13-02 | the partner of a Hack | 3 of 3 | with another partner the public view is the same |
| V15-04 | the partner of a Hack | 3 of 3 | with another target the public view is the same |
<!-- /generated:leaks -->

The static check has a further control of this kind that needs no engine: every control is run against a stand-in that names the three rulesets and never closes a phase, and every one of them has to fail on it.

## Checks of the tree the controls were run from

At `955a1931934af2499e4057bbcbb2bc747091f3ee`, the commit before the one that adds this report:

| Check | Result |
| --- | --- |
| `npm ci` | Exit status 0 |
| `npm run verify` | Exit status 0. Every step passed; the gate's own test runs report 55, 253, 187, 130, 194, 448, 207 tests, none failed or skipped. |
| `npm run check --workspace @mothership/balance` | Static checks: 116 tests in 6 files, all passed; none failed, cancelled, skipped or marked todo. |

`npm run verify` is Integration's whole gate and includes two runs of existing versions that this audit relies on and did not repeat: the Version 1 catalogue under `in-person-v1-pass-2026-10-08`, and the capacity suite with its playouts under `in-person-v1-capacity-resolution-2026-10-12`. Their lines, as the gate printed them:

```
Balance static: 116 executed, 116 passed, zero failed/cancelled/skipped/todo; materialization and traceability checked
Balance scenarios: 555 catalogue IDs; 516 passed, 33 reviewed blocked, 6 explicit manual; zero errors
Balance controls: 508 baselines passed; 4490 controls executed and detected; zero misses
Balance playouts: 10 completed in each of modes 7/8/9; zero unfinished/invariant/hint/replay mismatches
Balance report gate: common build/manifest/Git provenance checked at this clean candidate
Capacity release gate: 107 scenarios passed, 15 explicit manual; 600 playouts completed without invariant, hint or replay failures. Source 955a1931934af2499e4057bbcbb2bc747091f3ee.
```

The checks at the head of the branch are in the pull request.

## What was not run

- Any case of the next version, with any number of players.
- Any human play, and anything on a phone, in a browser, on the shared display or on the hosted build.
- The service. The controls drive the pure engine with trusted times. They do not show that a deadline task is delivered, repaired or deduplicated, nor anything about receipts or reconnection.
- Backend's own suites for the two drafts, and their emulator runs.
- Any simulation or playout of the next version, and no playout at all for this audit beyond those inside `npm run verify`.
