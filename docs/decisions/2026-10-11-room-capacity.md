# Hard room capacity — owner decision, 11 October 2026

Issue: [#96](https://github.com/Amirkianfar66/GameN/issues/96). The owner approved “yes enforce 5 as a hard rule” and [all six recommendations](https://github.com/Amirkianfar66/GameN/issues/96#issuecomment-6109813817). The direct implementation assignment further states that Injured players denied Hospital entry remain where they are and retry at subsequent end-of-round processing.

The recorded Designer owner sheet is `docs/design/owner-decisions.md` at `e01bbd7daf873a514948021b89098c8459bae19d`, SHA-256 `28addfef446053a74b7047a361fad77fa925abd3125e0a7e7ef34d222bdaa682`. This new decision supersedes the historical provisional layout note against artificial room limits for the new behavior tuple. Historical rule sources, the original V1 manifest and previous overlays remain unchanged.

| Decision | Approved behavior |
| --- | --- |
| CAPACITY-01 | A, B, Hospital and Jail each hold at most five occupants. Eliminated occupants count. Command holds one current Captain. Final Zone holds all remaining participants. |
| CAPACITY-02 | Full destinations are absent from own movement offers and authoritative MOVE rejects them with the existing receipt and client words. |
| CAPACITY-03 | Random starting placement respects capacity, is independent of identity/role selection, and is persisted through retries, setup and recovery. |
| CAPACITY-04 | Injured players denied a Hospital place remain at their current location; later end-round processing retries. Released Injured players waiting physically in Jail are free (`jailed=false`). Existing immediate Captain-loss return happens before Hospital finalization. |
| CAPACITY-05 | Healing, Healthy release and Captain-loss return to the remembered A/B room if available, otherwise the other ordinary room. Forced returns consume no voluntary move. |
| CAPACITY-06 | Jail is bounded by at most one admission at each of five normal round closures. |

The executable overlay is [room-capacity-owner-decision-2026-10-11.json](../../rules/overlays/room-capacity-owner-decision-2026-10-11.json). It introduces protocol 2 / `full-game-1.2.0` / `in-person-v1-capacity-2026-10-11`. Existing matches keep their exact creation/deal/state pins.

## CAP-ORDER-01 — confirmed in this assignment

The owner selected: **“Free healed Hospital places first, then use existing seat order.”**

After all registered attacks, Rescue and Supplier effects resolve, the new tuple first returns Healthy/free Hospital occupants in the existing stored seat-array order. Only then does placement consider Injured entrants in that same order. A later-seat healed occupant therefore frees a bed before an earlier-seat waiter is considered. Multiple entrants competing for one place admit the earlier stored seat; later entrants remain where they are and are reconsidered at a subsequent end-round.

Eliminated Hospital occupants do not vacate. The canonical roster stores numeric seat order; this is distinct from randomized round turn order. Immediate Captain-loss returns and the Jail tally retain their established positions before finalization. Existing matches under Pass/pre-Pass tuples retain the original single-pass loop even when a healed departure would now occur first in the new rules.

The independent Balance audit reviewed this ordering separately from V1-07 registered-effect order. There is no unresolved capacity gameplay decision. Designer/Frontend scene station retention remains a separate presentation review; it introduces no capacity rule or shared protocol field.
