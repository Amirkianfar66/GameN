# Frontend review of the bootstrap contracts

**Reviewer:** Frontend (issue [#3](https://github.com/Amirkianfar66/GameN/issues/3)), Claude Code, model `claude-opus-5-5`.
**For:** Codex Astra, Backend and Integration (INT-003).
**Reviewed at:** `BASE_SHA` `333c9e820f362a211352bc689372663f29b73ac4`; contracts package `0.1.0`, wire protocol `1`.
**Rule-source manifest SHA-256:** `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` (recomputed locally from `rules/source-manifest.json`; matches the issue and the fixture provenance).
**Date:** 6 October 2026.

**Status of this review: reviewed with required changes. This is not an adoption approval.** The schemas remain a draft until Codex Integration resolves or explicitly defers the items below and Game Balance completes its own review. Nothing in this document changes a shared file; every change is a request to the integration owner. Nothing here decides a game rule.

Scope: `packages/contracts/src/{protocol,views,presentation,fixtures}.ts`, the `GameTransport` shell that bootstrap placed in `apps/game/src/index.ts`, `PresentationInput` in `packages/presentation/src/index.ts`, and the contract text in `docs/integration-baseline.md`.

## Summary

The draft is a sound base for the first slice. The audience separation, the absence of client authority in commands, the split between durable receipts and transport failures, and the neutral identifiers are all usable as written.

What is missing is mostly **stated behavior**, not shape. The schemas say what a payload looks like; several things the client must rely on to be safe under retry, reconnect and version change are not written down anywhere. Seven items need an answer before Frontend can depend on a connected backend. None of them blocks the fixture-tested work in this PR.

| ID | Topic | Severity | Needed by |
| --- | --- | --- | --- |
| [FE-C01](#fe-c01) | Rejected receipts: durable and terminal? | **Required** | Connected command slice |
| [FE-C02](#fe-c02) | Which `ApiFailure` codes guarantee nothing was committed | **Required** | Connected command slice |
| [FE-C03](#fe-c03) | A late command for a closed phase is never accepted | **Required** | Connected command slice |
| [FE-C04](#fe-c04) | Presentation events have no delivery contract | **Required** | Event director slice |
| [FE-C05](#fe-c05) | `shotAvailable` meaning and legal targets | **Required** | DOM target flow |
| [FE-C06](#fe-c06) | Protocol compatibility policy and version probe | **Required** | Connected snapshot slice |
| [FE-C07](#fe-c07) | Feed and revision invariants the client pins | **Required** | Connected snapshot slice |
| [FE-C08](#fe-c08) | Display identity: time sync and expiry catch-up | Needed | Connected table display |
| [FE-C09](#fe-c09) | Own registered action cannot be recalled after refresh | Decision | DOM target flow |
| [FE-C10](#fe-c10) | Event facts are not self-describing enough for cue choice | Needed | Event director slice |
| [FE-C11](#fe-c11) | Event identity and ordering | Needed | Event director slice |
| [FE-C12](#fe-c12) | Fixture coverage for frontend journeys | Needed | Each later slice |
| [FE-C13](#fe-c13) | Schema permits states the docs call impossible | Advisory | — |
| [FE-C14](#fe-c14) | Free-form version strings | Advisory | — |
| [FE-C15](#fe-c15) | Named types for enums and nested shapes | Advisory | — |
| [FE-C16](#fe-c16) | Rate limiting has no error code | Advisory | Connected command slice |
| [FE-C17](#fe-c17) | Turn order and own faction are absent | Question | — |

"Required" means Frontend will not treat connected behavior as correct until it is answered. "Needed" means there is a workable interim, described under each item. "Decision" needs the integration owner or the game owner to choose.

## Accepted as written

These were checked and need no change.

- **Commands carry no client authority.** `RegisterShotSchema` is strict: no actor, clock, damage, role or archived third-player identification field survives parsing. `protocol.ts:17-21`.
- **Registration is not damage.** The only accepted code is `REGISTERED`; a receipt has no target, defense or outcome field. `protocol.ts:25-28`. The client models "registered" and "resolved" as different states and will never render an impact from a receipt.
- **Transport failure, game rejection and unknown outcome are three different things.** `ApiFailure`, `Receipt.rejected` and `ReceiptLookupResponse.unknown` do not overlap. This is the distinction the frontend specification asks for.
- **Receipt recovery needs only non-secret identifiers.** `ReceiptLookupRequestSchema` takes match and command IDs and nothing else, so the client can keep a reconciliation reference without storing a target or a role.
- **Expiry catch-up cannot carry a clock.** `AdvanceIfExpiredRequestSchema` rejects `now`, `force` and a scheduler token.
- **Composed player view.** One strict document with its own revision; the audience seat must equal `self.seatId`. The client never merges a public document with a private patch and has no code path that could.
- **A player payload cannot be parsed as public.** Verified locally: `PublicViewSchema` rejects the Officer view on `audience.kind`, on the extra `audience.seatId`, and on `self` and `ownPendingCommandIds`. The public route validates with this schema, so a mis-delivered player document cannot enter table state.
- **Neutral identifiers.** Seat, match, phase and event identifiers carry no role. The client keeps the same rule for DOM ids, class names and data attributes.
- **The event vocabulary omits what is undecided.** No shooter, trajectory, `BANG`, `BLOCKED` or Protection fact exists, so the director cannot emit one by accident.
- **Timing encodes only what is confirmed.** Ordinary turn is exactly 60 000 ms; resolution has `endsAt: null`; no vote or showdown duration is invented.
- **Fixtures are labeled and isolated.** `fixtureOnly: true`, provenance, assumptions and a separate subpath that the workspace guard blocks in runtime source trees.

## Required before connected work

### FE-C01

**Rejected receipts: are they durable and terminal?**

`docs/integration-baseline.md` says a retry of the same request gets the original receipt, and that `unknown` "is never stored as a terminal receipt". It does not say whether a **rejected** receipt is stored.

This matters. Suppose the first attempt is delayed in the network and the client retries. If the retry is evaluated first and rejected (`NOT_ALLOWED`), and rejections are not stored, the delayed first attempt can still arrive and be accepted. The player has been told "rejected" and the shot is registered.

**Required:** state, and test in #2, that every `Receipt` — accepted or rejected — is terminal and durable for `(caller, matchId, commandId)` for the retention window, and that a same-ID, same-payload retry always returns it regardless of phase. Shape is unchanged.

**Interim:** the client's command state machine treats both statuses as terminal for that command ID. If the backend decides rejections are not durable, the client design must change, so this is the first item to settle.

### FE-C02

**Which `ApiFailure` codes guarantee that this attempt committed nothing?**

`ApiErrorSchema` lists six codes (`protocol.ts:32-34`). The baseline calls them "separate safe errors" and does not say which ones leave the command's outcome unknown.

**Required:** add this table (or a corrected one) to the contract:

| Code | This attempt committed a gameplay effect? | Client action |
| --- | --- | --- |
| `UNAUTHENTICATED`, `FORBIDDEN` | Never | Stop; re-authenticate or leave |
| `INVALID_REQUEST` | Never | Client defect; report, do not retry |
| `UNSUPPORTED_PROTOCOL` | Never | Update screen |
| `COMMAND_ID_CONFLICT` | Never; the original command is untouched | Look up the original |
| `UNAVAILABLE` | **Unknown** | Reconcile: lookup, then same-ID retry |

**Interim:** the client is conservative. Any result that is not a receipt, on any attempt after the first, leaves the command in *unknown* and triggers reconciliation. Only a first-attempt pre-transaction failure is treated as "not sent". The table lets the client be faster, not safer.

### FE-C03

**A command whose phase is no longer open is never accepted.**

The client needs a way to close an unknown outcome when the player can no longer retry. The reasoning it wants to use:

1. The authoritative view shows a phase ID different from the command's `phaseId`.
2. A lookup issued after receiving that view returns `unknown`.
3. Therefore no attempt has committed, and any attempt still in flight will be rejected as `PHASE_CLOSED`.

Step 3 holds only if acceptance requires the command's `phaseId` to be the currently open phase, and the lookup reads committed state. Both are implied by `docs/backend/first-slice.md` ("validate phase, trusted time…") but neither is stated as a guarantee.

**Required:** state both guarantees and cover them with a test in #2 (a delayed duplicate arriving after phase advance yields `PHASE_CLOSED`, stored). Without this, an unknown command stays unknown forever and the spec's rule — a changed target must not silently replace an unresolved request — would lock the player out.

### FE-C04

**Presentation events have no delivery contract.**

`PublicPresentationEventSchema` and `PlayerPresentationEventSchema` define what an event looks like. Nothing defines how one reaches a client. The transport shell delivers views only; `PresentationInput` pairs a view with events but nothing produces that pair. The architecture document mentions `publicEvents/{seq}` and has no player equivalent.

The director has to "present an event only when its corresponding authorized state is available" and "skip obsolete cinematic playback" on reconnect. Both depend on the channel.

**Required:** choose one and document ordering, retention and what is re-delivered after reconnect.

- **(a) Events travel inside the audience view document** — a bounded `recentEvents` array on `PublicView` and `PlayerView`. An event and its state arrive atomically; there is no second listener, no cross-stream ordering, and no buffering. A hidden registration already rewrites the actor's own document and nobody else's, so noninterference is unchanged.
- **(b) A separate per-audience event stream.** Then define an audience-scoped ordering key that counts only that audience's events, the retention window, and replay on resubscribe.

**Frontend preference: (a).** It removes a class of client bugs (event before state, state before event, replay after reconnect) by construction. Under (b) the client buffers by `viewRevision`, which works but must be tested against real listener coalescing.

**Interim:** this PR delivers no director. The client transport interface is written so either option fits without changing callers.

### FE-C05

**What does `shotAvailable` mean, and what are the legal targets?**

`PlayerViewSchema.self.shotAvailable` is one boolean (`views.ts:44`). It could mean "has an unspent shot" or "may register a shot in this phase right now". In the fixture both readings give the same values. They diverge the moment the Officer watches another player's turn.

The view also carries no legal-target set. `docs/design/art-direction.md` says movement destinations "come from the authorized action view, not geometric proximity"; the same should hold for targets. Today the client would have to derive targets from public seat facts, which duplicates engine eligibility in the UI and surfaces every disagreement as a `NOT_ALLOWED`.

Verified locally: the schema accepts `shotAvailable: true` together with a pending command ID, so the two fields are not tied either.

**Required:** define eligibility as server-computed and command-specific. Proposed shape, replacing the boolean:

```ts
self: z.strictObject({
  seatId: SeatIdSchema,
  role: RoleSchema,
  shot: z.strictObject({
    // The viewer may register a shot in the current phase at evaluation time.
    canRegisterNow: z.boolean(),
    // Exactly the seats the server would accept as targetSeatId now. Computed only from
    // public facts and the viewer's own state; must not vary with any hidden defense.
    eligibleTargetSeatIds: z.array(SeatIdSchema).max(9),
  }),
}),
```

A safe unavailability reason (`NOT_YOUR_TURN`, `SPENT`, `STATUS`) would let the UI explain a disabled card without guessing. It must describe only the viewer's own state.

**Interim (provisional, flagged in code):** when the target flow is built, the client will show a *hint* — other seats in the viewer's own location — and gate the control on `shotAvailable`, own turn, an open ordinary turn, a live connection and an unexpired local deadline. That is the confirmed same-location requirement from `direct-shot-decision.json` and nothing else: no health, Jail or Captain inference. The server's answer stays authoritative. Whether a player may target themselves is not stated in any source; the hint excludes self and this is recorded as an assumption, not a rule.

### FE-C06

**Protocol compatibility policy, and a way to recognize an incompatible payload.**

`versions.protocolVersion` is `z.literal(1)`. Verified locally: a payload with `protocolVersion: 2` fails with a plain `invalid_value` at that path. To the client it is indistinguishable from a corrupt payload, yet the specification requires a *recoverable update screen* for one and not the other.

Because every object is strict, any added field — a new phase kind, a new event fact — is rejected by an older client. So every audience-payload change is a breaking change.

**Required:**

1. Export a loose probe from `@mothership/contracts`, for example `readProtocolVersion(payload: unknown): number | null`, so consumers do not hand-roll it. `apps/game` may not import `zod` directly.
2. State the policy: any change to an audience payload shape bumps `PROTOCOL_VERSION`; a match pins its version for its lifetime and the server keeps serving that version; a client build declares the versions it supports.
3. State that a request with another `protocolVersion` yields `UNSUPPORTED_PROTOCOL`, not `INVALID_REQUEST`. The request schemas use the same literal, so a naive parse reports the wrong code.

**Interim:** this PR includes a hand-written structural probe in `apps/game` and shows the update screen for a readable, unsupported version. It should be replaced by the exported helper.

### FE-C07

**Invariants the client pins on the feed.**

The client enforces the following as integrity checks. They are implied by the architecture; none is stated in the contract. Please confirm or correct each.

| Invariant | Client behavior on violation |
| --- | --- |
| After every subscribe or resubscribe, the feed delivers the current composed view, **even if unchanged** | The client stays *stale* until it sees one |
| `viewRevision` strictly increases per audience per match and is never reused with different content | Lower: ignored. Equal with different content: blocking error |
| `matchId`, `versions` and `playerCount` never change during a match | Blocking error |
| A player feed never changes its audience seat or `self.role` | Blocking error ("never re-deal roles on refresh") |
| Views carry no timestamp and no global sequence | The client reads no meaning into the size of a revision step |

The first row is the one that needs a deliberate answer. A Firestore listener does not re-emit an unchanged document after a reconnect unless metadata changes are requested, so the production transport has to arrange it. If the backend prefers another freshness signal, name it and the client will use that instead.

## Needed, with a workable interim

### FE-C08

**Table display: time sync and expiry catch-up.** The display needs `serverTime` to show a countdown. May an admitted display identity call it, and may it call `advanceIfExpired`? The baseline says "authentication/membership still required" and does not address display identities. Proposed: `serverTime` yes; `advanceIfExpired` optional. Also confirm the intended call pattern for `advanceIfExpired` — once after local expiry, idempotent, and `unchanged` means "not expired by the server clock, recalibrate from `serverTimeMs`".

*Interim:* the client transport types give the display `serverTime` and `advanceIfExpired` and never give it `submitCommand` or `lookupReceipt`.

### FE-C09

**Own registered action cannot be recalled after a refresh.** `ownPendingCommandIds` holds IDs only, and the client is forbidden to persist a target. After a reload the Officer sees "Registered" and cannot see whom they targeted. Either accept that, or add the actor's own registered target to their own private view. This discloses nothing to anyone else; it is a decision about what a player's own device shows, with a shoulder-surfing trade-off. **Needs the integration owner's or game owner's choice.**

*Interim:* within one page session the client remembers its own target in memory and never writes it to storage.

### FE-C10

**Event facts are not self-describing enough to choose a cue.** `PHASE_CHANGED` carries only `phaseId` (`presentation.ts:12`). The motion direction gives a round transition a 700 ms panel sweep and an ordinary turn change nothing of the kind. To tell them apart the director would compare against a previous snapshot, which does not exist after a reconnect. Proposed: `{ type: 'PHASE_CHANGED', phaseId, round, kind, roundChanged }`, or a separate `ROUND_STARTED { round }` fact.

`PUBLIC_HEALTH_CHANGED` correctly has no cause. The director will give it a neutral status treatment and no impact lettering until RULE-003/D09 is decided.

### FE-C11

**Event identity and ordering.** State the uniqueness scope of `eventId` (proposed: per audience per match, so the dedupe key is match + audience + event ID) and the order of events that share a `viewRevision`. `COMMAND_REGISTERED` and the accepted receipt both announce the same registration; the client dedupes the stamp by `commandId`.

### FE-C12

**Fixture coverage for frontend journeys.** The authored fixtures cover one transition: before and after registration. The acceptance journeys in `docs/frontend/first-slice.md` also need, as authored and schema-validated examples:

- rejected receipts for both codes, and one `ApiFailure` per code;
- lookup `found` and `unknown`;
- a phase advance to another ordinary turn and to round resolution;
- one public move and one public health change, each with its event.

A post-resolution player view is correctly absent while RULE-003 is open.

*Interim:* Frontend authors synthetic derivations in `apps/game/dev/`, outside the runtime source tree. Each is validated against the contract schemas in tests, labeled as frontend-authored, and makes no claim about backend sequencing. They should be replaced by backend-authored examples.

## Advisory

### FE-C13

**The schema accepts states the documents treat as impossible.** Verified locally, all of these parse: two Captains; `jailed: true` in Room A; a seat in `Final Zone` during an ordinary turn; an ordinary turn with `activeSeatId: null`. Keeping health, Jail and location independent is deliberate and correct. If "at most one Captain" and "an ordinary turn has an active seat" are invariants, a refinement would let the client stop handling them. The client renders whatever is supplied and shows the Final Zone only when a seat is in it.

### FE-C14

**Free-form version strings.** `engineVersion` and `assetManifestVersion` accept any 1–128 characters; verified locally that markup parses. The client escapes all text centrally, so this is not an injection path here, but constraining the character set would keep diagnostics and logs safe everywhere.

### FE-C15

**Named types.** The package exports schemas for `Location`, `Health`, `Role`, `Phase`, `PublicSeat` and the API error code but no named types. Consumers derive them by indexed access (`PublicView['seats'][number]['location']`). Exporting the names would remove that coupling to shape.

### FE-C16

**Rate limiting.** The architecture requires per-user and per-match limits; the error enum has no code for one. State whether a limited request returns `UNAVAILABLE` (then say the client should back off) or add a code.

### FE-C17

**Two absences worth a decision.** The architecture lists turn order among the table's public facts; `PublicView` has only `activeSeatId`. And the token set defines faction accents for private use, but the view gives a role and no faction. The client will not derive either from a hard-coded table of canon. Add them to the views in a later protocol if they should be shown.

## What Frontend changed in its own package because of this review

`apps/game` is Frontend-owned, so these are not requests:

- The transport delivers **unvalidated** payloads (`unknown`) and a single adapter validates them. A transport cannot skip validation, and there is one place to test it.
- The display transport type has no command methods. A table route cannot submit, by construction.
- Responses from the API are parsed, and a receipt whose identifiers do not match the request is treated as unreadable rather than trusted.

## Requested next step

Codex Integration: answer FE-C01 to FE-C07 in `docs/integration-baseline.md` or in a contracts PR, and say which of FE-C08 to FE-C12 are accepted, changed or deferred. Frontend will re-review that change and only then record adoption for the affected slice.
