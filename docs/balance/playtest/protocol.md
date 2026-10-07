# In-person playtest protocol

**Status:** protocol for the first pilot. No session has been run and no result exists. **Rulebook:** `rulebook-v1-2026-10-07-r4` in [../game-rules.md](../game-rules.md). **Applies to:** people playing together at one table, 7, 8 or 9 players, Original Powers off.

## What the pilot is for

The pilot finds confusing rules, broken flows and dead time. It is 6 to 10 completed matches in each mode. It cannot certify balance: with ten matches a side that won half of them has a 95% interval of 24% to 76%.

It answers, for each mode separately:

1. Can a table play a whole match from the rulebook without a developer stepping in?
2. Which rules do players misunderstand, miss or dispute?
3. How long does a match take, and where does the time go?
4. Does every role have something to do in most rounds?
5. How do matches end, and by which rule?

It does not answer which side is favoured. Scripted playouts cannot answer that either: they show that states are legal and reachable, not how people persuade, bluff and vote.

## Before any session

These are preconditions. A session that lacks one is a rehearsal and is recorded as a practice match.

- **A playable build with its pins written down:** ruleset version and hash, source manifest hash, engine version and commit, protocol, client build. One build for the whole pilot of a mode. A new build starts a new cohort.
- **The owner's approval of consent wording, of who may read the records, and of how long they are kept.** See [../telemetry-spec.md](../telemetry-spec.md).
- **A decision on each open question that the build touches, or acceptance that the pilot plays what the build does.** Nine rule edges are open: D11, D12, D16 to D20, D34 and D35. They are set out on one sheet in [the audit](../rules-audit-v1.md#open-rule-edges-consolidated). Where the build already behaves one way, the pilot plays that way, the facilitator logs every time it comes up, and nobody at the table invents a house rule.
- **The build's known gaps, read by the facilitator before the session.** See "The hosted preview". A known gap is not a reason to stop a match.
- **The mode order for each group, fixed in advance.** See "Groups and modes".
- **One facilitator who has read the rulebook and this protocol, and one printed set of the three forms per match.**

## The hosted preview

Since 7 October there is a hosted preview that a supervised group can play on. The integration review of that day gives its pins: application source `89f4a881733096a320b8365973e4540b82392ae4`, ruleset `in-person-v1-2026-10-06`, protocol 2. Write the pins of the build that is actually used on the session form; a preview is redeployed without notice.

The review is plain about what the preview is not: it has not been played through by people, on real phones, or as a whole hosted match in any of the three modes. **So the first sessions on it are rehearsals.** Record them as practice matches. They find broken flows and confusing screens, which is useful, and they count toward nothing. A session counts as a pilot match when every precondition above is met.

Gaps the reviews have recorded, and what the facilitator does about each. Write the number in the "Rule or decision" column of the [rule problem log](rule-problem-log.md) each time one touches play.

| Gap | What a player meets | The facilitator |
| --- | --- | --- |
| G17 | Supplier is not told whether the weapons were given. V1-16 says Supplier is told. A defect, to be fixed | Does not tell Supplier. Logs it when Supplier asks or plays in doubt, and marks whether it affected the outcome |
| G18, G14 | After a Code attempt, and after the Captain's release choice, the phone no longer says what was entered | Logs it if a player is unsure what they did. Does not look at the phone |
| G15 | The last vote count stays on screen in later rounds without saying which round it is from | Logs it if the table reads an old count as a new one |
| G20, G22 | Moving a seat to another device needs a long code read out by the host. A host who loses their own device cannot hand the match on | Plans for it: one spare charged device, and the host's device on power. If the host's device is lost the match is aborted and recorded |
| Named in the review, without a number | A device whose seat was moved to another one goes on saying that it is connecting, and the lobby can show a connecting line that is out of date | Has the player put the old device away. Logs it only if somebody at the table took it for a fault of the match |

The approved look of the game, the comic board with character pieces, is not connected to this build. A session on the preview says nothing about it.

## Groups and modes

Three configurations are compared: seven, eight and nine players. Going from seven to eight adds Red Disabler. Going from eight to nine adds Officer. Neither step changes only the number of players, so a difference between modes is a difference between whole configurations.

- A group needs exactly as many players as the mode. Nobody plays two seats and no seat is left empty.
- A group of nine can play all three modes in one or more sessions, with one or two people sitting out the smaller modes. Rotate who sits out. A group of seven can play only the seven-player mode; record that.
- **Counterbalance which mode comes first.** Assign each group one of the six orders of 7, 8 and 9 before it arrives, taking the orders in rotation by group number. Record the order in `session.modeOrderInSession`.
- **Roles are dealt at random by the app.** Nobody chooses or swaps a role or a faction. Nobody is assigned a match because of a faction they prefer.
- **Seats rotate.** Draw seat numbers before each match.
- **Record experience.** For each player, the number of matches played before this one, in total and under this ruleset. A group's first match is its learning match: it is kept and flagged, not hidden.
- **More tables beat more matches at one table.** Ten matches by one group are one group's habits. Record the group for every match.

## Session conditions to record

Write these on the session form before the first match. They are not controlled; they are recorded so that results can be read in context.

| Condition | What to write |
| --- | --- |
| Venue | Home, workplace, public venue, lab or other |
| Seating | One table or not; whether everyone can see everyone; whether anyone could see another player's screen from where they sat |
| Public board | Physical board and tokens, shared display, both or none. Who moves the tokens |
| Devices | Phone models and browsers; the display, if any |
| Connection | Stable, interrupted or unusable |
| Noise | Quiet, moderate or loud |
| Language | The language spoken at the table and the language of the app |
| Teaching | Read aloud, explained by the facilitator, read alone, or a returning group; minutes spent; rulebook version |
| Facilitator | Whether the facilitator also played. Prefer not |
| Observers | How many people watched without playing |

## Running a match

**Teach the same way every time.** Read section 2 of the rulebook aloud, then let each player read their role in the app. Answer questions before the match starts. Record the minutes.

**During the match the facilitator:**

- starts a watch when the first turn opens and stops it when the result is shown;
- does not advise, hint, remind players of their options or comment on a play;
- answers a rule question only by reading the rule aloud from the rulebook, and logs the question;
- when the rulebook has no answer, says so, lets the app's behaviour stand, and logs it with its D number;
- writes each problem on the [rule problem log](rule-problem-log.md) when it happens, with the round and phase;
- notes every time the table stops while a clock is running, and roughly for how long;
- stays out of earshot of every Hack conversation and never writes down what was said;
- never looks at a player's phone.

**The app decides.** If the table believes the app is wrong, the facilitator logs it as "app and table disagreed" and play continues on the app's state. Nobody edits a result by hand.

**Stop a match at once** when hidden information has leaked through the app or the board, when a role was dealt wrongly, or when the state is plainly corrupt. The host aborts the match. Record it; it is excluded from rates and kept in the counts. Do not stop a match because it is going badly for one side or because it is slow.

**A player who must leave** ends the match as abandoned unless the table chooses to continue; either way it is recorded and excluded from outcome rates.

## After each match

1. **Questionnaire first, alone and in silence.** Every player fills in the [participant questionnaire](participant-questionnaire.md) before anyone discusses the match. Discussion changes what people report.
2. **Then a ten-minute debrief.** The facilitator asks three questions and writes down what is said: what was unclear, when did you have nothing to do, and what would you do differently next time. No names in the notes.
3. **Complete the [session form](facilitator-session-form.md)** for that match.
4. **Request the server export** for the match, if it exists, and join it with the forms into one record from the [template](match-record.template.json). Mark the record `incomplete` if the export is missing.
5. **Validate the record** and store it where the approved access plan says. Paper forms are stored or destroyed as that plan says.

## What to watch for

The audit derived these from the rules by counting. They are hypotheses about what might feel wrong, to be confirmed or dismissed by watching people play. Each has a place in the record.

| Watch for | Why | Where it is recorded |
| --- | --- | --- |
| Players with nothing to do on their turn, especially Insider and Alien | They have no role action (S-11) | `agency`, questionnaire |
| Supplier injured, jailed or alone in Round 3 | Blue then has no ordinary weapon (S-07) | `information.supplierDistributed`, rule problem log |
| Whether anyone is eliminated before the showdown | It needs two attacks on one player in one round (S-02) | `endgame.eliminatedBeforeShowdown` |
| A player surprised to be hit after moving away or entering Command Room | The location is fixed at registration (V1-06) | Rule problem log, R-ACT-06 |
| How Hacker gathers the Code, and whether Red treats the Code as reachable | Scans alone cannot make it certain with eight or nine players (S-12) | `information`, questionnaire |
| The first Officer shot: round, target faction, effect | The owner asked for it | `officer` |
| Jail: how many players, who, and how the last vote changes the end | Up to five can be jailed by the Round 5 check (S-08) | `endgame.jailedAtRoundFiveCheck` |
| Dead time inside 60-second windows, and time lost outside them | No window closes early (S-13, D17) | `pace`, facilitator notes |
| A tied Captain election that repeats | Only a broken tie, or a runoff in which nobody votes, ends it (D13) | `pace.phaseCounts.captainElections`, rule problem log |
| What eliminated players do | No rule covers it (D19) | Rule problem log |
| Whether the table knows who plays next | The order is not announced (D20) | Rule problem log |
| How a Hack conversation is actually held | Its format is undecided (D18). Record the shape, never the words | Facilitator notes |
| The board and the app out of step | Tokens are moved by hand | Rule problem log |
| Supplier unsure whether the weapons were given | The build does not tell them (G17) | Rule problem log, with G17 |
| A screen seen by a neighbour | Secrets live on the phone, and the approved role card is large and carries the team's color | Rule problem log, `information-leak`; seating on the session form |
| A room's color taken for a team | On the approved comic board the rooms include a red, a blue and a violet, which are also the teams' colors. Only once that board is connected | Rule problem log, `rule-misunderstood`; questionnaire |

## Reporting

Follow [analysis-plan.md](analysis-plan.md). In short: one report per mode, every rate with its numerator and denominator, every excluded match counted with its reason, the number of distinct groups stated, and no conclusion about balance from the pilot.

## Time to plan for

By the clock alone a match with nobody eliminated lasts at least 41, 46 or 51 minutes with seven, eight or nine players, and about 57, 63 or 69 with a Hack per player, repeated elections, release windows and a showdown. Add teaching, the questionnaire and the debrief. Plan ninety minutes for a first match and do not promise a group two matches in two hours. These figures are arithmetic from the fixed windows; the pilot measures the real ones.
