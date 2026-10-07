# Private post-match telemetry

**Status:** specification. No export exists yet and no data has been collected. **Schema:** [`telemetry-export.schema.json`](telemetry-export.schema.json), identifier `mothership.balance.match-record/1`. **Blank record:** [`playtest/match-record.template.json`](playtest/match-record.template.json).

This is the one record kept per playtest match. It joins what the server knows with what the facilitator and the players report. It exists to answer four questions for each of the three modes, separately: were the rules followed and understood, how long did the match take, did every role have something to do, and how did it end.

## Boundaries

1. **After the match only.** Nothing in this record is produced, sent or shown while a match is running. During play the only data leaving the server are the audience views.
2. **Restricted as a whole.** A record holds hidden truth: who had which role, who targeted whom, who was protected, what the Code was. It is classified `restricted-research` and is read only by the people the owner authorizes. Being the host of a match does not grant access.
3. **No spoken Hack content.** What two players say in a Hack is never recorded, by the app or by the facilitator. `information.hackContentRecorded` is fixed to `false`.
4. **No direct identifiers.** No name, account identifier, device identifier, address or contact detail. Participants appear as pseudonyms of the form `P-7K2Q`.
5. **Not routine analytics.** No field of this record goes to operational logs, dashboards or error reports.
6. **Consent, access and retention are the owner's to approve before the first recorded session.** A record without `consentRecorded: true` for every participant is invalid. That holds for an incomplete record as much as for a complete one: nobody is kept in a record of any status without a pseudonym and recorded consent.

A pseudonym lowers exposure. It does not make a small group of friends anonymous to each other or to the facilitator. Treat every record as personal data.

A shareable summary may be derived from records. It contains counts and rates per mode with their denominators and exclusions, and nothing about an individual match or person.

## Where each part comes from

| Section | From the server export | From the facilitator | From each player |
| --- | --- | --- | --- |
| `provenance` | Match, ruleset, engine, protocol and build pins | Date, group, session and facilitator pseudonyms, cohort | None |
| `session` | None | Venue, seating, board, devices, connection, noise, teaching, order of modes | None |
| `participants` | Seat, role, faction, starting room | Pseudonym, prior matches, consent, early departure | Experience with similar games |
| `rulesDeviations` | None | Anything played differently from the rulebook | None |
| `outcome` | Result, co-win, cause, round, checkpoint, Power at the end | Whether the match was abandoned | None |
| `pace` | Window time and count of each phase | Wall-clock time, adjudication time, pauses | None |
| `agency` | Turns by status; opportunities available, attempted and accepted; unused resources; votes | None | None |
| `combat` | One row per registered attack | None | None |
| `officer` | Officer's shot and its result, nine players only | None | None |
| `information` | Scans, Hacks, Protection, Supplier, Code | None | None |
| `endgame` | Showdown participants, shots and eliminations; Power before and after | None | None |
| `experience` | None | None | Questionnaire answers |
| `ruleProblems` | None | Problems observed, as they happen | None |
| `exclusion` | None | Whether and why the match is left out of rates | None |

Until Backend supplies the export (request BAL-REQ-2 in [integration-requests.md](integration-requests.md)), the server columns stay `null` and the record is marked `incomplete`. An incomplete record still counts as a session and still carries its rule problems; it is excluded from any measure it cannot support. Incompleteness excuses missing server facts and a table that is not fully accounted for. It excuses nothing about a person: every participant an incomplete record holds needs a pseudonym and recorded consent, and what it says about seats, roles and factions must be possible in its mode. A `template` record is blank and holds no participant.

## Fields and what they mean

The schema is the authority on names and types. The definitions below fix the meanings that a schema cannot.

### Provenance

`mode` is 7, 8 or 9. `optionalPowers` is `false`; a match with powers on belongs to a different cohort and does not use this schema version. `cohort` is `direct-shot-v1`: sessions played under the archived identification rule are a different cohort and are never combined with these. `rulesetHash` and `sourceManifestSha256` are recorded separately because the ruleset hash does not yet cover the baseline sources ([BAL-C03](contract-review.md#bal-c03)). `groupId` names a table of people, and is what uncertainty is clustered on.

### Outcome

`result` is one of four mutually exclusive values: `Blue`, `Red`, `Alien` (alone) or `Draw`. `alienCoWin` is a separate flag and is true only with `Blue`. `victoryCause` says which rule ended the match:

| Cause | Rule | Checkpoint |
| --- | --- | --- |
| `blue-elimination` | R-WIN-03 | Any round's resolution, or the showdown |
| `blue-power` | R-WIN-04 | End of Round 5, or the showdown |
| `red-elimination` | R-WIN-05 | Any round's resolution, or the showdown |
| `red-code` | R-WIN-06 | End of Round 5, or the showdown |
| `alien-solo` | R-WIN-08 | See audit S-05: not reachable with powers off |
| `draw` | R-SHOW-08 | The showdown |

A Red win on the Code at the showdown checkpoint cannot arise under the present rules: the showdown opens with a correct Code only when no Red player is Healthy (R-WIN-13), and nobody is healed during it. The record allows the combination so that it is reported if it is ever seen.

`terminal` is `Finished`, `Aborted` (the host ended it, R-OPS-02) or `Abandoned` (the table stopped without an abort). Only a finished match has a result.

### Pace

`windowMinutes` is the sum of the server's 60-second windows. `wallClockMinutes` is what the facilitator's watch says from the first turn opening to the result. The difference is time the table spent outside any window, and `adjudicationMinutes` is the part of it spent settling a rule. `pauses` counts the times the table stopped although the clock ran on (R-OPS-01 gives no pause).

### Agency

One entry per player. An **opportunity** is a turn or window in which the player had at least one legal use of that action: a Main Action, a shot, a Hack request, a move, a ballot, the Code attempt or the special shot. `available` counts those turns, `attempted` the commands sent, `accepted` the commands registered. A role with no Main Action has `available: 0` there for the whole match; the audit notes that Insider and Alien are in that position (S-11).

`turnsHealthyAndFree`, `turnsInjured` and `turnsJailed` count the player's own turns by status. `hackDeniedByRoundLimit` counts own turns on which the player still had their Hack and a legal partner but two conversations had already been granted in the round.

These are counts. Whether an action was *meaningful* is a judgement, and it is the player who makes it, in the questionnaire.

### Combat and Officer

One `combat` row per registered attack, including attacks that were blocked or wasted. `defense` is `none`, `protection` or `target-already-eliminated`. `actorStatusAtResolution` records whether the attacker was still Healthy and free when the attack resolved, which is how often R-ACT-05 mattered.

`officer` is present only with nine players. It records when the shot was fired, at which faction, whether it was blocked, and whether Officer later received an unusable weapon from Supplier. The owner asked for exactly these in `rules/overlays/player-modes-officer.json`.

### Information

Counts only: Scans attempted and failed, distinct Scan targets, Hack conversations, Hack requests refused by the round limit, Protections granted and used, whether Supplier distributed and to which factions, whether the Code was submitted, in which phase, and whether it was right.

### Experience

Five-point scales, 1 for "not at all" and 5 for "completely", answered alone and before any discussion of the match. `confusingMoments` and `strongestStrategySeen` are free text and may identify a person: they stay in the restricted record.

### Rule problems

One entry per problem the facilitator saw, written when it happened. `category` is one of: a rule misunderstood, a rule missing, two rules in conflict, the app and the table disagreeing, confusion about a clock, a leak of hidden information, the board and the app out of step, a stalemate, or other. `ruleId` names the rulebook rule and `decisionId` the open or unconfirmed question, when either applies. `affectedOutcome` is the facilitator's judgement and is one of the grounds for exclusion.

### Exclusion

An excluded match is left out of outcome rates and kept in every count of sessions. The reasons are a closed list: aborted by the host, abandoned by the players, a rules deviation or an app defect that affected the outcome, the wrong player count, powers enabled, the facilitator coaching play, an incomplete record, a different ruleset, consent withdrawn, or a practice match. A match is never excluded because of who won.

## Validation

`validateMatchRecord` in `tools/balance/src/telemetry.ts` checks a record before it is used: the schema identifier and classification; one mode per record; a pseudonym and recorded consent for every participant in any record that is not a blank template; seats, roles and factions that are possible in the mode, and exactly that mode's seats and roles once the record is complete; a result that agrees with its cause and checkpoint; exclusion of every aborted or abandoned match; the Officer section only with nine players; and the absence of every forbidden field anywhere in the record. `npm run check --workspace @mothership/balance` runs it against the blank template and against deliberately broken records.

## Not collected

Spoken Hack content. Audio or video. Names, accounts, devices, network addresses. The name a player types in the lobby is a name: it is shown at the table and is never part of a record. Individual ballots beyond the per-player counts of votes cast and missed. Anything from a match that is still running.
