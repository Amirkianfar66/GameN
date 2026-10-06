# Rule problem log

Kept by the facilitator during the match. Write an entry the moment something goes wrong, in a few words. Entries go into `ruleProblems` in [the match record](match-record.template.json).

A problem is anything where the rules, the app and the table did not line up: a question nobody could answer, a rule played wrongly, an argument about what the app did, a clock nobody understood, a secret that showed, or a token in the wrong place.

Do not write names. Write seat numbers only when the problem cannot be described without them. Never write what was said in a Hack.

**Match identifier:** ____________ **Mode:** 7 / 8 / 9 **Facilitator:** ____________

| # | Round | Phase | Category | Rule or decision | What happened | What the table did | Affected the outcome? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | | yes / no / unsure |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |

## Categories

Use exactly one per entry.

| Category | Use it when |
| --- | --- |
| `rule-misunderstood` | The rulebook has the answer and a player believed something else |
| `rule-missing` | The rulebook has no answer. Give the D number if the question is already registered |
| `rule-contradiction` | Two rules seemed to say different things |
| `app-and-table-disagreed` | The app did something the table thought was wrong. Play continues on the app's state |
| `clock-confusion` | Someone did not know a window was open, how long was left, or why the table was waiting |
| `information-leak` | Something secret became visible: on the display, on the board, on a phone seen by others, or by a pattern such as timing. **Stop the match if the app or the board caused it** |
| `board-and-app-out-of-sync` | A token, marker or card on the table did not match the app |
| `stalemate` | The table could not move on, for example a Captain election that kept tying |
| `other` | None of the above |

## Phases

Ordinary turn, Hack conversation, Captain election, release choice, release vote, Jail vote, resolution, showdown, result.

## Questions already registered

When one of these comes up, write its number in the "Rule or decision" column. The answer for the pilot is whatever the build does; the entry tells the owner how often it mattered.

| Number | Question |
| --- | --- |
| D11 | May Supplier name themself as a recipient? |
| D12 | What can Supplier do with fewer than two players in the room? |
| D13 | What ends a Captain election that keeps tying? |
| D14 | Does a Healthy but Jailed player count as a Healthy member for winning? |
| D15 | What ends a match that nobody can still win? |
| D16 | May a player move during a Captain election? |
| D17 | May a player end their turn early? |
| D18 | How is a Hack conversation held: who asks, how many questions? |
| D19 | What may an Eliminated player say or show? |
| D20 | Is the turn order announced? |

Working readings that the owner has been asked to confirm are D21 to D29 in [the register](../rules-audit-v1.md#decision-register). If a table plays against one of them, log it as `rule-misunderstood` with its D number.
