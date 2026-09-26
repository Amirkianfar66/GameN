# Game Balance agent

## Mission and ownership

Assess Mothership's rules and comparative balance across the 7-, 8-, and 9-player configurations. Separate rules correctness, information security, usability, and human balance evidence. An engine can implement a rule correctly while that rule still produces poor play.

First implementation branch: `agent/game-balance-baseline`. Proposed ownership: `tools/balance/`, `tests/scenarios/`, and `docs/balance/`. The repository is `Amirkianfar66/GameN`; pin the reviewed bootstrap commit when starting this unimplemented task.

Read `AGENTS.md`, `docs/project-context.md`, `docs/architecture/rendering-direction.md`, all current rule overlays, and the baseline. Follow recorded source precedence. Never import mechanics from Planet A or silently change canon to make a scenario pass.

## First GitHub issue

**Title:** Establish the direct-shot rules baseline and comparative playtest protocol.

**Problem:** Three player configurations require comparison after removal of the shooting identification requirement. Current source files contain superseded behavior, and several resolution boundaries remain undecided. Mixing versions or inventing expected outcomes would invalidate the evidence.

**Inputs:** Assigned repository/base commit; source hashes; approved command and projection contracts from Backend; `docs/balance/rules-audit.md`; `docs/balance/scenario-matrix.json`. Pin ruleset, engine, and protocol versions in every fixture and report.

**Deliverables:**

1. Convert decision-ready matrix entries into deterministic engine fixtures after Backend publishes the engine test adapter. Report blocked entries separately.
2. Add invariants for resources, phase transitions, legal mode setup, irreversible elimination, and authorized views. Backend owns cloud transaction/security integration; coordinate rather than duplicate its implementation.
3. Define a private post-match telemetry export and a human playtest recording form using the fields below.
4. Produce one reviewable evidence report showing case results, failures, excluded sessions, and rule questions. Do not publish a balance conclusion before human data exists.

**Acceptance:** Every expected result has a rule reference; every test run records fixture/seed and build identifiers; retries cannot duplicate effects; no test is silently skipped as passing; baseline powers are off; 7/8/9 results remain separate; no archived identification mechanic appears in current fixtures. A PR with unresolved cases may establish the baseline but must not claim the full ruleset is release-ready.

**Dependencies:** Backend supplies engine/clock interfaces and private replay export. Frontend supplies observability for timer confusion and failed interactions. Designer reviews readability and accidental information disclosure. Coordinator resolves shared contracts and submits rule choices to the game owner.

## Comparative human playtests

Use the same direct-shot ruleset and disable optional Original Powers in the first comparison. Rotate players across factions, roles, and seats. Counterbalance which mode is played first across groups; log experience and repeat participation. Keep facilitators and instructions consistent. Match assignment must be independent of a participant's preferred faction.

The 7→8 comparison introduces Red Disabler; the 8→9 comparison introduces Officer. These are useful comparisons of the complete configurations, but neither isolates a pure player-count effect. A later Officer ablation is an explicitly approved experimental variant with its own version, not current canon.

Record after each match:

| Area | Required fields |
| --- | --- |
| Provenance | Match ID, date, ruleset/source hash, engine/protocol versions, mode, power pack, group ID, facilitator |
| Experience | Pseudonymous participant IDs, prior matches, faction/role/seat assignment, rules deviations |
| Outcome | Blue/Red/Alien-solo/Draw result, Alien co-win separately, victory cause, round and checkpoint |
| Pace | Total duration, turn/Hack/vote durations, adjudication time, reconnects, pauses, abandonments |
| Agency | Role actions available/attempted/accepted, resources unused, rounds injured/jailed, meaningful-action opportunities |
| Combat | Registration/resolution round, attack type, target faction, defense, damage; Officer timing and downstream result |
| Information | Scan attempts/failures, Code submission/correctness, Hack count; never record spoken Hack content by default |
| Endgame | Showdown trigger rate, participants, registered/resolved shots, final result, remaining healthy power |
| Experience report | Post-match clarity, perceived agency/fairness, dominant strategies, facilitator notes |

Store sensitive truth and action targets only in restricted post-match/research exports; never stream them to players or routine analytics. Pseudonyms reduce exposure but are not a guarantee of anonymity. Define access and retention before collecting personal data.

## Evidence and uncertainty

Begin with 6–10 completed games per mode to discover confusing rules and broken flows. This is a diagnostic pilot, not a balance certification. Choose the next batch size and review checkpoint before viewing results; stop immediately for integrity defects, but avoid stopping because a favorable win rate appeared.

Report the numerator and denominator with every rate. Use Wilson 95% intervals for individual binary rates as a descriptive starting point. At an observed 50%, 30 independent matches give approximately 33–67%; 100 give approximately 40–60%. Repeated tables and players weaken independence: cluster by table/group when estimating uncertainty, and show the number of distinct groups. More sessions at one table do not replace diverse groups.

Treat Blue, Red, Alien-solo, and Draw as mutually exclusive terminal categories; Alien co-win is an additional flag. Keep interrupted games and rules-deviation games visible with exclusion reasons and completion rates. Agree the intended faction advantage and acceptable draw/duration range with the game owner before declaring success; equal wins are not automatically the right target for an asymmetric game.

## Simulation boundary and PR evidence

Scripted agents and seeded simulations can test legality, reproducibility, resource accounting, reachable states, and sensitivity under stated policies. They cannot validate persuasion, bluffing, communication, player learning, or actual faction win rates. A random-agent result is only a result for that random policy. Keep policy findings separate from human observations.

Each PR must include the changed hypothesis or fixture, source references, replayable inputs, observed/expected results, uncertainty or coverage limits, blocked decisions, and whether a new experimental ruleset is required. A balance proposal needs explicit game owner acceptance before Backend changes production behavior.
