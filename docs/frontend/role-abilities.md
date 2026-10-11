# Role abilities on the phone, prepared for the Designer's treatments

Issue [#99](https://github.com/Amirkianfar66/GameN/issues/99) · branch `codex/frontend-role-abilities`, stacked on the Insider board ([#100](https://github.com/Amirkianfar66/GameN/pull/100)) · 11 October 2026

The owner commissioned the Designer to create artwork and interactive comic animation for every V1 role ability and shared action. **No such delivery exists yet**: at Designer head `08409392d1040f20d559a9f36a2a1d9bb23468c4` the runtime manifest is still `design-0.2.0`.

This change prepares the phone for those treatments without replacing them. It does four things:

- states every ability state that the seat's own view or its own command's receipt actually states;
- adds hooks a treatment can style, which say no more than the words beside them;
- adds dev-only examples of each state in the board simulation;
- records what is missing, both from the Designer and from the view.

**Nothing here is finished art.** The phone keeps using the approved role-device art, character cards and tokens.

## Baseline

The baseline is the same as [insider-board.md](insider-board.md):

- **Base:** `1a92f37` on `codex/v1-board-release`.
- **Protocol 2**, with gameplay tuples:
  - `full-game-1.1.0` / `in-person-v1-pass-2026-10-08`;
  - legacy `full-game-1.0.1` / `in-person-v1-2026-10-06`.
- **Assets / tokens:** `design-0.2.0` / `0.4.0`.
- **Toolchain:** Node 22.21.1, npm 10.9.4.

Backend's room-capacity tuple, `full-game-1.2.0` / `in-person-v1-capacity-2026-10-11` ([#98](https://github.com/Amirkianfar66/GameN/pull/98)), changes no field read here. Under it, a full room is simply absent from the movement offers.

The rule sources:

- `rules/sources/v2.1-decisions.json` (roles);
- the V1 owner decisions in `rules/overlays/in-person-v1-owner-decisions-2026-10-06.json`: V1-05, V1-06, V1-08 and V1-13 to V1-17;
- `rules/overlays/player-modes-officer.json` (the Officer in nine-player matches).

## What this change does

1. **Protection: queued, active or used up** (Undercover only, V1-17).
   - **Queued.** A Protection registered but not yet resolved is not in the view, so its receipt speaks for it: "Protection for Player 4 registered. This is not a result. Registered actions are resolved at the end of the round."
   - **Active.** Once resolved, "What you know" says "Protection for Player 4: active." The view's `activeFromRound` has been reached by the view's own `round`; this is the contract field's own meaning, and the engine uses the same comparison.
   - **Used up.** When the view says it is consumed: "Protection for Player 4: used up."
   - **Not yet active.** A Protection granted in round 5 is "active from round 6" during the showdown, as the view says.

   This replaces the earlier deliberate choice not to compare the two rounds. The owner asked for the three states, and the comparison is two fields of the same authoritative view, not an inference.
2. **A Cracker with none left is told so.** "What you know" says "You have no Rescues left." when the Cracker's `rescuesRemaining` is 0. Other roles are told nothing of Rescues. The tray still lists Rescue only while the view opens it.
3. **Hooks for the Designer's art.**
   - The tray: each line is `li.ms-offer[data-kind][data-offer]`. `data-offer` is one of `available`, `paused`, `unavailable`, `no-target` or `too-few`, exactly the state its words say.
   - The strip: `.phone-strip > .ms-card__state` now carries `data-kind`, the action it is about, beside the existing `data-status` and `data-step`. It is present while choosing, confirming, sending, checking, registered, not accepted or unknown. It is absent idle, and after a reload that knows only the command's identifiers.
   - **No hooks on "What you know".** That region's markup does not vary with what is known; an existing test holds this. Treatments for knowledge go in its words, or in a component like the Insider board.
4. **Dev-only examples** in the board simulation, one per ability state: `protection-states`, `cracker-no-rescues`, `scan-results`, `alien-code`, `officer-round-1` and `supplier-results`. The simulation can now pass a schema-checked own-acknowledgments document. Its starting weapons and Rescues now follow the roles: Officer and Undercover hold one weapon, the Cracker two Rescues.

## Coverage, role by role

Each row is what the phone does now, from what it reads.

**Hacker**

| Requirement | Phone behavior | Read from | Tests and evidence |
| --- | --- | --- | --- |
| Undercover knowledge | "The Undercover is Player N." in "What you know" | `knowledge.undercoverSeatId` | compound-actions, connected-screens; `scan-results` card |
| Scan: board target, faction guess, private result | Tap a character the view offers. Blue, Red or Alien in the strip. One result line per round: wrong, right and in the Code, or right and not in the Code | `legalTargets.SCAN`, `knowledge.scanResults` | compound-actions, board-play; board capture `scan-*`, `scan-results` card |
| Code: four distinct, unordered seats | Four numbered picks on the board; the numbers are pick order, for taking one back. The confirmation lists the four in seat order, and any order is the same set. Once sent, the attempt is never written out again | `self.codeAttemptAvailable`, every seat of the match | compound-actions; board capture `code-*` |

**Cracker**

| Requirement | Phone behavior | Read from | Tests and evidence |
| --- | --- | --- | --- |
| Rescue, remaining uses, registration, recovery | Rescue is offered from the view, including the Hospital from Room A/B (V1-05). "Rescues you have left: N", or **"You have no Rescues left."** The receipt says "Rescue of X registered. This is not a result." Recovery is the public health change. A lost answer is recovered by receipt lookup without a second send | `legalTargets.RESCUE`, `self.rescuesRemaining`, receipts, public health | role-abilities, connected-player, board-recovery; `rescue-registered`, `cracker-no-rescues` |

**Blue and Red Disabler**

| Requirement | Phone behavior | Read from | Tests and evidence |
| --- | --- | --- | --- |
| Private art | The approved `device-blue-disabler` and `device-red-disabler` art, on the role card in the open card only | `self.role` | comic-shell; board capture `card` |
| Targeting and registration | Targets on the board from the view. The receipt says "Disable at X registered. This is not a result." After it is registered, no mark is left on the target | `legalTargets.DISABLE`, receipts | role-abilities; `disable-registered`, `disable-not-accepted` |
| Spent | **Not stated by the view.** The phone says "Not available", which is all it knows. The gap is proposed on #99 | `self.disablerAvailable` | role-abilities |
| No distinguishing public animation | Public cues come only from public facts: a move, a health change, a phase | public view | comic-motion |

**Supplier**

| Requirement | Phone behavior | Read from | Tests and evidence |
| --- | --- | --- | --- |
| Two distinct recipients, registration, delivery feedback | Two numbered, distinct picks in round 3, then the receipt. The Supply results appear with the actions (the Actions view), not in the card: "Your Round 3 Supply granted one weapon each to …". A recipient is told "You received one ordinary weapon…" (V1-16) | `legalTargets.SUPPLY`, own acknowledgments | compound-actions, comic-shell; board capture `supply-*`, `supplier-results` |

**Undercover**

| Requirement | Phone behavior | Read from | Tests and evidence |
| --- | --- | --- | --- |
| Protection queued, active and consumed | As item 1 above. Never shown to the recipient or the public | receipts, `knowledge.protections`, `round` | role-abilities, compound-actions; `protect-registered`, `protection-states` |
| Ordinary shots | The shared shot, when the view offers it (from round 4) | `self.shotAvailable`, `legalTargets.REGISTER_SHOT` | connected-player, shot tests |

**Officer**

| Requirement | Phone behavior | Read from | Tests and evidence |
| --- | --- | --- | --- |
| One shot, from round 1, nine players only | The shot whenever the view offers it, round 1 included; the phone has no round rule of its own. The contract refuses an Officer below nine players | `self.shotAvailable`, `legalTargets.REGISTER_SHOT` | role-abilities; `officer-shot-registered` |
| Spent | **Not stated by the view.** "Not available", never "used". The gap is proposed on #99 | — | role-abilities |

**Alien**

| Requirement | Phone behavior | Read from | Tests and evidence |
| --- | --- | --- | --- |
| Unordered starting Code | One sentence in seat order. Every one of the 24 orders the view could give draws identical markup | `knowledge.code` | role-abilities; `alien-code` |

**Insider:** the investigation board, in [insider-board.md](insider-board.md) (#100).

**Shared actions**

| Requirement | Phone behavior | Tests and evidence |
| --- | --- | --- |
| Ordinary shot | One strip and receipt for every role. Offered only by the view | shot tests, board capture |
| Character ≠ role | Portraits are the characters players chose. A role appears only in its own open card. The display has no role words | insider-board, board capture `display-*` |
| Original Powers off | No Original Powers control exists. The Balance gate records "Original Powers off" | `npm run verify` output |

The shared lifecycle was integrated and verified in #92 and its recovery follow-ups ([board-play.md](board-play.md), [board-recovery.md](board-recovery.md), [motion-os-preference.md](motion-os-preference.md)), and this change keeps it. It covers:

- selection and reveal;
- move and arrival;
- targeting and confirmation;
- Hack, Pass and votes;
- injury, elimination and recovery;
- Hospital, Jail and Command;
- the Showdown and the end reveal;
- rejection, unavailable and reconnecting states;
- reduced motion.

## Missing from the Designer

These are recorded for the role-ability commission. Until each arrives, the phone keeps the words and the approved assets above.

| Missing | Where it would attach | Constraint |
| --- | --- | --- |
| Per-ability art for the tray rows: shot, Disable, Protection, Rescue, Hack, Scan, Supply, Code attempt, Showdown shot, in each `data-offer` state | `li.ms-offer[data-kind][data-offer]` | Loaded in the uniform role bundle every phone already preloads, never on demand |
| Per-ability art for the strip in each step | `.phone-strip > .ms-card__state[data-kind][data-status][data-step]` | Same. The strip shows only in the player's own open action |
| A spent treatment | Rescue none left now; Disable and the Officer's shot once the view states them | Must not appear on a guess |
| Private result art | Scan result (three cases); Supply results (Supplier, recipient); Protection states; the Alien's Code; the Hacker's known Undercover | Inside the open card only. No art may pair an Insider candidate with a role |
| Registration and not-accepted motion per ability | Today one reviewed generic stamp (`cue-registration`) and a not-accepted proposal | A reduced-motion form for each. No public motion for any private ability |
| The Insider board's frame, role group, motion and words | `#phone-investigation` ([insider-board.md](insider-board.md)) | As recorded there |

## Missing from the view

Proposed on #99 for Integration's decision ([comment](https://github.com/Amirkianfar66/GameN/issues/99#issuecomment-6111541217)):

- **Own one-time uses.** The view does not state that a Disable, the Officer's shot, a Hack request or the Code attempt has been used. The engine records each at acceptance. Until the view says so, the phone says "Not available" and never infers "used" from the engine's gates.
- **FULL room tags (#97).** These need the reviewed capacity table in a form the presentation package can read. Movement itself needs nothing new.

## Changed files

- `packages/presentation/src/model/types.ts` and `connected-player.ts`: `ActionOfferModel.state`.
- `packages/presentation/src/model/knowledge.ts` and `copy/en.ts`: the Protection states and "You have no Rescues left."
- `packages/presentation/src/markup/connected-player.ts` and `comic-shell.ts`: `data-offer` and `data-kind`.
- Tests:
  - new `packages/presentation/test/role-abilities.test.mjs`;
  - updated offer expectations in four test files;
  - the Protection and Rescue knowledge expectations, changed on purpose as described above.
- Development only:
  - `apps/game/dev/board/scenarios.mjs` and `main.js`: the six scenarios, own acknowledgments, and role-based weapons and Rescues;
  - the new `apps/game/dev/capture-role-abilities.mjs`.

## Verification

All checks ran locally with Node 22.21.1 and npm 10.9.4.

| Check | Actual result |
| --- | --- |
| Full `npm run verify` on the clean commit `4409bfdfe05b8d6b7d13ab36e7fffa8a470c8968`, after merging the Insider board's role-set change | Passed, exit 0. Tests: 53 bootstrap, 148 engine, 130 Backend, 102 tooling, 186 presentation, 430 game, with no failures. Production exclusion and the full Balance gate passed, with provenance at this commit. See [verification.txt](evidence/role-abilities-2026-10-11/verification.txt) |
| Full `npm run verify` on the earlier clean commit `43693edce20ee178eee0887a9d9580dcc5a6064f` | Passed, exit 0. Tests: 53 bootstrap, 148 engine, 130 Backend, 102 tooling, 186 presentation, 430 game, with no failures. Production exclusion: 54 reachable modules and 40 labeled development files, with no fixture or development code reachable. Balance: static 71/71; 522 scenarios (483 passed, 33 reviewed blocked, 6 manual, zero errors); 475 baselines with 4,388 controls detected; 10 playouts in each of 7/8/9. Summary lines are in [verification.txt](evidence/role-abilities-2026-10-11/verification.txt) |
| New presentation tests | 7, in `role-abilities.test.mjs`. They cover the offer hooks, the strip and card `data-kind`, the Protection states and audience, Rescues, the Alien's 24 orders, the Officer (nine players, round 1, never "used" by guesswork) and the Disable |
| Role-ability capture (simulation) | 20 steps, 0 problems at 320×568 and 390×844. See [evidence/role-abilities-2026-10-11/](evidence/role-abilities-2026-10-11/README.md). Its first version missed hidden lines, which was found and fixed as described there |
| Existing board capture and Insider capture, re-run on this branch | 124 steps clean, and 18 steps with 0 problems |

## Limits

- Browser emulation only. No physical device, deployed service or multiplayer run was tested.
- Screenshots do not establish multiplayer correctness or social-deduction balance.
- No Designer treatment is integrated, because none has been delivered.
