# Planet successor game design

Authority: [final owner decisions](owner-decisions.md), then [October owner record](../../design/owner-decisions-2026-10-25.md) and its overlays, then unsuperseded historical rules. All names below are current English names.

## Setup and identity

Use 7/8/9 players only. Seven roles are Insider, Doctor, Blue Disabler, Supplier, Undercover, Hacker, Alien; eight adds Red Disabler; nine adds Engineer. Team counts are 4/2/1, 4/3/1 and 5/3/1. Officer is exclusively a public office, never a secret role. Only Undercover starts with one ordinary weapon. Preserve randomized initial A/B placement, the nine-character selection, 30-second selection auto-assignment, 30-second minimum role read, human Ready and automatic bot readiness.

Code is the unordered set of the four original player IDs assigned Undercover, Alien, Insider and Doctor. Original identities survive elimination/offboarding. Insider receives an unmapped trio of Undercover, Alien and Doctor: adding self gives full Code. Hacker and Red Disabler know Undercover. Alien does not receive full Code.

## Ordinary round and offices

Retain 60-second ordinary turns, Pass, board-targeted actions, original one Role Action / one Shot / independent Standard Hack allowances and the final-turn voluntary-movement cutoff. Officer's block is a separate once-per-round Public Action, not unlimited public actions. An elected Captain appoints an eligible other Officer; appointment lasts for that Captain term. Existing Captain tenure, loss-of-office and election rules remain unless expressly superseded. There is no invented midround reassignment.

Before turns, fixed pre-turn time permits a final public voluntary-movement block and eligible secret Blackhole. No repeated block target in consecutive rounds. Forced Hospital/Jail transfers, otherwise-eligible votes/actions and window access are unaffected. Captain retains direct once-per-match RELEASE and EJECT during their own turn in Command, targeting physical Jail occupants, with independent spent flags across Captain changes.

## Navigation and endings

After resolution, actual hidden factions of eligible A/B occupants determine direction. Captain doubles their eligible contribution; Engineer's fixed-ID suppression sets it to zero. No other location contributes. A retained spaceship hack forces Red before tie handling/disclosure; never show the unmodified direction or totals. Round 1 automatically reaches Junction. Later same-side movement advances one step; opposite-side movement switches arm at the same depth. Route is Start → Junction → B1 → B2 → Blue Planet or R1 → R2 → Red Planet. Each round has exactly one movement. Earliest arrival is end Round 4.

Captain then Officer acknowledge the direction with deadlines and no veto. Officer chooses only an actual tie; absent response uses an equal-probability authoritative draw. Blue/Red wins at its planet. Alien co-wins with either team only if alive and personally used Blackhole; Injured is still alive. No five-round limit, Showdown, power comparison, Code win or elimination-only team win. The finalized no-survivors exception has no winner. Voluntary host abort retains its existing no-winner semantics.

## Role changes

Engineer: once per match from A/B during own eligible Role Action, capture the occupants of the opposite room by identity. Suppress those identities' navigation contribution through current round; later movement does not remove it and later arrivals are not added. Ballots are unaffected.

Hacker: correct faction Scan returns only Code membership; wrong Scan consumes this round and blocks the next entire round. One final Code submission from Round 2, alive, anywhere before navigation, without Role Action cost. Correct Code permanently replaces Scan with unlocked Hack Spaceship; no automatic activation. Wrong final Code leaves Scan, not another submission. Hack Spaceship is one retained activation, eligible on own turn while Healthy/free in A/B with unused Role Action. Force Red for normal one-step navigation. Global discovery state and reality-owned activation state are deliberately separate.

Alien: retain confirmed Clone and add Blackhole while holding Captain/Officer before turns. Blackhole consumes that round's Role Action and its global lifetime use. Branch only when the acting player crosses A↔B; copy the full current world at that instant. A branch is an equally weighted candidate regardless of population. Selected current state includes inherited activations and costs. Uniform choice and Sync occur before voting; an actual Sync is followed by the fixed six-second Blackhole presentation and then a full 60-second Jail vote. Rounds without Blackhole skip the presentation. No early activation announcement.

Doctor and panel: two shared injections per reality, inherited without refills. Doctor Rescue preserves existing eligibility and targets. Each living Hospital patient has one globally spent code attempt using Doctor's original player number; accepted correct request reserves a shared injection and queues self-Rescue, wrong input spends only attempt, empty inventory checks no code. Attacks before Rescue, no revival, no refund for accepted no-effect Rescue, healing does not release detention. Four Hospital beds and admitted bodies/capacity/order rules remain.

## Promises and windows

One accepted Promise given and one received per player for the whole match. Exact terms require recipient acceptance during permitted private talk. Draft/rejected offers consume neither slot. Pair-private records survive; no coercion. Six types: Captain Support, Officer Selection, Jail Vote, No Jail Vote, Meet in A, Meet in B. Actual ballots matter, not the outcome/admission. Officer Selection is conditional on giver winning the specified next election. Evaluate meeting at voting start after Sync. P23/P24 govern runoff and absent-opportunity semantics.

Windows are only A↔B, A↔Hospital and B↔Jail, accessible at either endpoint without transitive access or new voice. A1 draws to B, B1 draws to A; A2 draws to Hospital, B2 draws to Jail (technical slot mapping, distinct positions). Only the current occupant of that drawing slot can Show; Hospital/Jail have no drawing slot. Choose an empty destination slot as part of movement or reposition using the same movement allowance. Draw locally, Show an immutable image, append author and chronological order, no erase/replace, expire at same round end. Preserve global shown records and window-only access across Sync. Arbitrary claims are not verified facts.

## Timing and uncertainty

Ordinary/Hack 60 seconds; target declaration up to 15 seconds and private result 5 seconds before the full talk; vote results 5 seconds; authorized Blackhole post-Sync presentation 6 seconds before the full 60-second Jail vote; Blackout 5 seconds lit plus 10 dark in every normal round. Officer appointment 30 seconds; pre-turn fixed 15 seconds; tie/each confirmation 15 seconds. Server time is authoritative. Missing responses follow confirmed defaults. These timings are approved starting rules, not demonstrated human pacing/balance.

