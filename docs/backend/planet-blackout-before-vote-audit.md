# Independent Blackout-before-vote audit

Implementation base: `7958c9f590b2bf0e074cd32c67ce0bf0202b6279`. Independent tests belong to `codex/blackout-independent-tests`; engine implementation and shared contracts belong to separate workstreams.

Integration recorded its review and Frontend's acknowledgement of exact shared contract `44d008df0f1cc6fbb2d6c4c0b4b9c95f50c752c3`: the minimal candidate wire shape has no blocker for Backend implementation. This is contract review, not final consumer/runtime acceptance, merge, activation or deployment. The authority hash is `2505515ad41e9d49c06bd14aaf9dab56dcf0adb471725c1c15d877a0f0b97556`.

## Expected invariants recorded before implementation

Authority is the [10 November owner decision](../specifications/planet-successor/blackout-before-vote-owner-decision-2026-11-10.md), selecting Proposal B in the [timing analysis](planet-blackout-timing-proposals.md). That decision supersedes the proposal's historical pending status and the earlier post-vote ordering. Engineering details remain reviewable implementation choices.

- Every normal round opens the same five-second lit / ten-second dark window after ordinary turns/final talk and any whole-reality Sync plus independent six-second presentation. The selected reality alone supplies requests, costs and targets.
- Freeze logical geometry and admission before targeting. Collect all valid admitted choices before damage. Later incapacity of another admitted Disabler cannot cancel that Disabler's already-admitted attempt. Empty/self/dead positions and timeout consume the admitted use without replacement.
- Complete only the Blackout batch before voting. Clone blocks before Protection and does not consume it. Otherwise Protection blocks one applicable attack; remaining damage changes Healthy to Injured and Injured to Eliminated.
- Commit health, offices and physical Hospital placement atomically before opening voting. Four beds include retained bodies. New candidates compete in numeric seat order. Overflow is permanent offboard elimination; a later reserved heal cannot retroactively admit or revive the victim.
- Open a fresh full sixty-second vote from the committed state, including an empty electorate, then the full five-second result. Injured/Jailed living voters retain permission. Evaluate giver-only Meet at this actual opportunity after forced transfers.
- Keep ordinary attacks, new Protection grants, Doctor/panel Rescue, Round 3 Supply, injury aging, Clone expiration, faction reveals and No survivors at their proper later finalization boundary. Accepted remaining actions survive actor incapacity.
- Preserve P18: a living Hacker may submit the one final Code from Round 2 until navigation, including during Blackout/vote/result while Injured or Jailed, without a Role Action.
- Publish the selected targeting board and the completed After Blackout checkpoint without announcing requesters, choices, count, hidden actor order, defense source, role, Code or discarded-reality state. Defensive feedback is cause-neutral and room-only. Both board packets carry the candidate checkpoint as shared-publication metadata; it does not certify a private speculative board.
- Historical 1.1/1.2 states, receipts, checkpoints and old phase ordering remain unchanged; new rules require their exact inactive candidate tuple.
- Abort preserves the last actual publication category, publication round, board and authorized occurrences. Reconnect preserves the same persisted checkpoint. In particular, abort before Sync cannot publish a private reposition or relabel an older public board as a current-round result.
- Previously published Blackout injury/defense occurrences keep their IDs, clinical anchors, publication/expiry times and first-publication revisions through Jail republishing, later Rescue and full finalization. A complete board replacement is not permission to rewrite earlier facts.

## Coverage boundaries

Native histories use only constructor, public commands and trusted deadlines and must replay exactly. Constructed predecessor controls isolate valid physical boundaries and explicitly do not prove native reachability, service transactions, browser behavior, human balance or physical-device performance.

All common cases cover seven, eight and nine players. A canonical seven-player deal has only Blue Disabler: dual-Disabler mutual/same-slot cases apply to eight and nine players. Inventing a second seven-player Disabler would violate the roster authority.

The constructed last-two-survivor case has four retained Hospital bodies, other prior offboard eliminations, and two Healthy Disablers. Their admitted mutual hits both overflow, leaving no survivors at the partial checkpoint. This still requires the entire empty-electorate vote and result before terminal evaluation. It exercises a reachable consequence of the four-bed rule more directly than starting with an already empty electorate.

Native checkpoint coverage includes Round 1 completion, Round 2 election, a genuine tied runoff, both election result intervals, Officer appointment and next-round carry. Separate constructed coverage exercises no eligible Officer with an Alien Captain's authorized optional Sync. A retained room-body defensive-audience control is explicitly constructed; it is not evidence that a newly Injured player may bypass Hospital admission.

The engine implementation workstream captures the immutable 1.2 predecessor evidence before edits. This audit will independently execute that fixture and the existing fixed 1.1 evidence; it will not regenerate predecessor expectations with candidate code.

## Actual verification

The isolated branch adopted shared contract `44d008df` as `bee5233c`, immutable predecessor evidence `6fb7a2ef` as `1e527f99`, and engine source checkpoint `6a49af53` as `1a541590`. Node `22.21.1` / npm `10.9.4`; offline `npm ci` installed 887 packages from the existing writable cache. Targeted contracts/engine build passed.

- Independent execution of the fixed 1.1 golden plus the new immutable 1.2 predecessor corpus passed **20/20**, with no skipped/cancelled cases, in 97218.794 ms. The 1.2 fixture's SHA-256 is `79c839089ee686173e9951e9fd699eb46b4b4dc734da7e4932570d13914201b3`; provenance is the unmodified `7958c9f5` runtime. Expectations were not regenerated with candidate code. Log: `/private/tmp/gamen-blackout-independent-history.log`.
- The first draft run was interrupted before completion because it repeatedly reconstructed identical native R3/R4 prefixes. It supplies no pass/fail evidence. The test helper now caches an immutable native predecessor and gives each constructed control a fresh deep clone; authority expectations are unchanged.
- The first completed candidate run passed **78/81** in 416620.087 ms. All three failures were the same test-boundary error: full private-packet equivalence included the Protection donor, whose inherited `abilities.protectionGrants[].consumed` evidence legitimately differs when Protection is used instead of Clone. Integration confirmed that distinction. The corrected test keeps exact cause-neutral cue parity for every audience, whole-packet equality for unrelated viewers/public, explicit donor-consumption assertions, and packet equality for donor/defender after normalizing only their authorized consumption/Clone-active fields. No production behavior was changed to satisfy the test.
- The three selected corrected defense cases passed **3/3** in 9915.868 ms, with no skipped/cancelled cases. The complete corrected outcome/publication file then passed **81/81**, no skipped/cancelled cases, in 154881.985 ms on source `6a49af53`. Logs: `/private/tmp/gamen-blackout-independent.log`, `/private/tmp/gamen-blackout-independent-defense.log`, `/private/tmp/gamen-blackout-independent-final.log`.

## Confirmed fail-closed finding and bounded correction

On source `6a49af53`, `assertPlanetGameState` accepts a contradictory candidate save with an `INITIAL` / `PRE_TURN` publication and a copied genuine `blackoutBatch.status = RESOLVED`, after the trusted timestamp is moved forward. The reproduced output was `{accepted:true,checkpoint:"INITIAL",phase:"PRE_TURN",batch:"RESOLVED"}`. The completion validator currently requires merely a non-Blackout phase. When ordinary turns later finish, normal admission rejects the non-null batch, so this accepted inconsistent save cannot progress.

This is a new candidate ledger-consistency/fail-closed gap, not a demonstrated player-command exploit or a claim that clients can edit private authority. Integration authorized the bounded new-ledger-only correction: `RESOLVED` must belong to current `AFTER_BLACKOUT` or current `ROUND_FINALIZED`, including their preserved Abort categories; reject `INITIAL`, `PRE_BLACKOUT` and previous-round carry. `ABORTED` pending batches must retain current `PRE_BLACKOUT`.

The independent restore matrix reproduced the original defect for all three roster sizes: **0/3 passed before the fix**, because each first refusal assertion observed the accepted contradictory save. Log: `/private/tmp/gamen-blackout-restore-before-guard.log`. The matrix also retains legitimate native open/completed/full/abort restores and rejects completion/pending-abort transplants into incompatible publication categories.

The engine owner supplied the bounded fix as `ac83316f34ff0c91778e5b22d1400354c0e67eb7`, adopted here as `084b9265` after its test-only dependency `fdc08fd` (`3162128b` locally). Targeted contracts/engine build passed. The independent restore matrix then passed **3/3** in 9569.874 ms with no skipped/cancelled cases, including the valid native replay and all positive/negative restores. Log: `/private/tmp/gamen-blackout-restore-after-guard.log`. This closes the reproduced finding. This branch did not manually edit production validation.

The 81-case outcome/publication result and 20-case historical result above are explicitly the pre-guard source checkpoint; they were not repeated after the bounded candidate-only marker change. The post-fix restore matrix exercises the new guard's accepted and rejected categories. Combined release checks and final consumer/runtime acceptance remain Integration-owned; no additional source blocker was confirmed within this audit's executed scope.

No emulator, cloud, default activation or Frontend changes are part of this audit. Service retry/outbox and connected consumer checks belong to the other workstreams; final consumer/runtime acceptance, human balance and physical-device performance are not claimed here.
