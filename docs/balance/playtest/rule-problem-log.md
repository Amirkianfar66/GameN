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

Not decided:

| Number | Question |
| --- | --- |
| D11 | May Supplier name themself as a recipient? |
| D12 | What can Supplier do with fewer than two players in the room? |
| D16 | May a player move during a Captain election? |
| D17 | May a player end their turn or a Hack conversation early? Does the Captain's choice close its window at once? |
| D18 | How is a Hack conversation held: who asks, how many questions? |
| D19 | What may an Eliminated player say or show? |
| D20 | Is the turn order announced? |
| D34 | May a player aim the showdown's special shot at themself? |
| D35 | Does an aborted match reveal roles and the Code? |

Decided rules that a table may not expect. They are rules, not questions. If a table plays against one, or is surprised by one, log it as `rule-misunderstood` with its number; that tells the owner how the rule lands with people.

| Number | Rule |
| --- | --- |
| D13 | A tied Captain election repeats until the tie is broken. A runoff in which nobody votes elects nobody (R-CAPT-13) |
| D14 | A Healthy but Jailed player counts as a Healthy member when a win is judged (R-WIN-11) |
| D38 | A released player is free at once and can be voted back into Jail in the same round (R-VOTE-10) |

The other readings are D21 to D28, D30 to D33, D36, D37 and D39 in [the register](../rules-audit-v1.md#decision-register).

Known gaps of the build. They are not questions about the rules. When one touches play, log it as `app-and-table-disagreed` with its number, and say whether it affected the outcome. The [protocol](protocol.md#the-hosted-preview) says what each one looks like at a table.

| Number | Gap |
| --- | --- |
| G17 | Supplier is not told whether the weapons were given |
| G18, G14 | The phone no longer says what was entered after a Code attempt or a release choice |
| G15 | An old vote count stays on screen without its round |
| G20, G22 | Moving a seat needs a long code; the host's own device cannot be replaced |
