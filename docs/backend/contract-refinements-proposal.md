# Protocol-2 contract refinements proposed for review

Proposal only, against Backend `230cc39bdced7f54dbd44eabeef6aa91e9462ce0` and Frontend consumer `ba716d71b3c5a2e15acf3cd80c4bb458e657fc9f`. No contract, engine, rule manifest or consumer is changed here. V1-01–V1-21 remain approved under `in-person-v1-2026-10-06`, SHA-256 `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`. Frontend and Balance must review before shared adoption; Integration owns the focused schema/runtime change.

The repository's policy in [contract-review-response.md](contract-review-response.md), FE-C06, requires a protocol bump for strict audience shape changes, pins versions per active match and requires tested routing before serving multiple versions. The approved full-game profile uses protocol 2; product V1 and wire protocol numbering are independent. A proposal cannot silently revise the meaning or shape of an active protocol-2 match.

## CR-P2-01: restrict legal target keys

Current `FullPlayerViewSchema.legalTargets` is `z.record(z.string(), z.array(SeatIdSchema))`. The engine currently emits `REGISTER_SHOT`, `REQUEST_HACK`, `DISABLE`, `PROTECT`, `SUPPLY`, `SCAN`, `RESCUE`, `SHOWDOWN_SHOT`, `VOTE`, and `RELEASE_CHOICE`. Unknown keys pass schema validation even though they cannot drive supported commands.

Propose an exported enum derived from the targeting subset of `FullCommand['type']`, and `z.partialRecord(TargetedCommandTypeSchema, z.array(SeatIdSchema))`. `MOVE` destinations, `SUBMIT_CODE` selections and `RELEASE_VOTE` boolean/null choices use their dedicated fields; their keys do not belong in this seat-target map. Keep the existing roster/unique-seat checks. The enum must be checked against every supported command variant so additions cannot drift from dispatch.

This tightens accepted schema content and TypeScript keys. Although current server output would be unchanged, existing consumers may use arbitrary keys. Adopt only through a reviewed compatibility decision and new contract release; use the next wire protocol if the change accompanies CR-P2-03 or otherwise changes strict audience shape. Do not publish a stricter validator under protocol 2 without recording why pinned consumers remain compatible. Tests must reject unknown/non-targeting keys, accept every supported targeting key, and prove private hints disclose only approved own information. Balance review verifies the subset and eligibility remain canon-neutral.

## CR-P2-02: clarify empty-target shot availability

Protocol 1's first-slice `shotAvailable` described an unspent shot resource. Protocol 2 sets it with `!!targets['REGISTER_SHOT']`; it reflects existence of the current ordinary-shot eligibility key and can therefore be `true` when that key has `[]`. It is `false` during Showdown even when `SHOWDOWN_SHOT` is available. `ordinaryWeapons` is the resource count, subject to Officer's lifetime cap. Neither field alone authorizes an intent.

Immediate protocol-2 guidance requires `self.shotAvailable && (legalTargets.REGISTER_SHOT?.length ?? 0) > 0` plus fresh match/phase/audience and unresolved-command gates before enabling target selection. Showdown uses its own nonempty target set. Key absence means this command category is unavailable; an empty present key means no current legal seat. `SUPPLY` likewise needs two distinct targets; `VOTE` and `RELEASE_CHOICE` can accept null decline/abstention where the command is available, so nonempty targets are not a universal rule for every command.

Recommend preserving this documented protocol-2 behavior through adoption, then making any revised wire field name/meaning explicit in the next reviewed protocol. If Frontend and Balance instead want `shotAvailable` to mean "a shot can currently be selected", propose computing it from nonempty targets and versioning that semantic change with CR-P2-03. It changes no game eligibility, resources or defense rule; clients must not infer hidden Protection from hints. Tests should exercise isolated actor/no legal target, another player in Command, spent Officer cap, ordinary versus Showdown, and fresh versus expired window.

## CR-P2-03: distinguish own pending kinds without retaining targets

Current private views contain only `ownPendingCommandIds`; receipts and `COMMAND_REGISTERED` events carry no kind/target. After reload, persisting an ID while discarding the private payload protects secrecy but cannot tell which action slot the queued registration consumes. A lookup `unknown` while the original phase remains open cannot conclusively settle an earlier invocation still in flight. Adding a kind field does not by itself solve that race. Existing protocol 2 can clear unresolved acceptance once a fresh server view proves the original phase closed and a lookup requested afterwards returns unknown; a delayed rejected receipt can still appear, and the old ID must never be reused.

Recommend a next-protocol private field `ownPendingCommands: [{commandId, type}]`, where `type` is an exported queued-command enum (`REGISTER_SHOT`, `DISABLE`, `PROTECT`, `RESCUE`, `SUPPLY`, `SHOWDOWN_SHOT` at this base). It is composed only from the viewer's queued records and never carries target, scan result, Protection or Code. It replaces the ID-only field under an explicit next-protocol schema; old active matches retain their original shapes. Frontend can identify queued action categories without reconstructing target selection. The current queued records do not retain original phase ID; recover that association from the original durable receipt/journal if needed, or review a storage/model addition. Never label a queued command with the current projection phase as though it were the original phase. Immediate movement, scans, Code attempts, ballot commands and Hack registration are not all represented by the engine's queued array and must not be mislabeled as pending queued effects.

For durable receipt reconciliation across phase/round resolution, separately consider a next-protocol own lookup metadata field with the original command `type`. It must be read from the caller's receipt/journal context, remain private and cover accepted and rejected terminal decisions even after the queue clears. The receipt already carries its original phase ID. Review whether the extra kind metadata is necessary once replacement input is gated on reconciliation. No private target recall is proposed. If conclusive unknown settlement is required while the original phase remains open after payload loss, design a separate transactional settlement/barrier operation with explicit authorization, idempotency and race tests. A kind field or an unknown lookup alone cannot provide that guarantee. No new settlement API is required for the documented fresh-closed-phase-then-unknown-lookup sequence.

This is a strict payload change: bump wire protocol, publish separate schemas/fixtures/handlers, pin active matches and rebase consumers. Required tests include Main Action plus Shot, queue clearing, no kind leakage to display/other players, receipt/event/view arrival permutations, unresolved reload, concurrent earlier attempt versus proposed settlement, old/new binding recovery and retained receipt lookup. Frontend owns UI/reload tests; Balance verifies categories and game-rule neutrality; Integration verifies version routing and package exclusion.

## CR-P2-04: lifecycle conflict label consistency

`REQUEST_ID_CONFLICT` exists in `FullFailureSchema` and the HTTP mapper, but the current `operation()` implementation returns `COMMAND_ID_CONFLICT` for a mismatched lifecycle request-ID digest. Document and handle the current code; do not pretend the separate label is emitted. Propose changing lifecycle conflicts to the already-declared `REQUEST_ID_CONFLICT` in a focused reviewed adapter change with a contract release note and tests for same UID/ID across operations. This leaves gameplay command conflicts and existing durable decisions intact. Frontend must handle both during a transition; version-policy review determines whether an already-declared error-code change can remain on protocol 2. No game-owner canon change is needed.

## Review record to complete before adoption

| Gate | Required evidence | Current status |
| --- | --- | --- |
| Frontend | Exact consumer commit, accepted field/error/reload behavior, focused consumer tests | Pending; worktree read only |
| Balance | Targeting/queued-kind categories and no new rule/disclosure | Pending |
| Integration | Schema compatibility decision, release/wire pins, tested routing and active-match policy | Pending |
| Connected acceptance | Fresh server listeners, receipt recovery and identity transfer on a pinned combined candidate | Not established by this proposal |

The permanent examples intentionally use existing protocol-2 shapes, including an empty legal shot target set with `shotAvailable:true`. They do not present proposed fields as supported wire data. No historical source or approved rule is reopened.
