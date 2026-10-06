# In-person V1 backend handoff

Product Version 1 supports people playing together at one table with private phone controls and an admitted public display. Firebase connectivity is required; offline gameplay and automatic disconnect pauses are disabled. The complete backend is developed on the reviewed-source checkpoint `ad976db57a1e2c5cf29142fc097bc462913e718b`, with bootstrap baseline `333c9e820f362a211352bc689372663f29b73ac4`. The checkpoint PRs #11 and #12 remain dependencies until reviewed and merged.

The owner explicitly approved the complete V1-01–V1-21 sheet on 6 October 2026 by answering “Use the proposed V1 decisions”. The [current register](v1-decision-register.md) supersedes the frozen bootstrap register. Historical source files, their source manifest, the Canvas snapshot and the comic motion direction remain unchanged. The approved rule overlay is immutable and separately checked.

| Pin | Value |
| --- | --- |
| Full-game wire protocol | `2` (product V1; independent of product version numbering) |
| Ruleset version | `in-person-v1-2026-10-06` |
| Ruleset content hash | `6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90` |
| Historical source manifest SHA-256 | `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc` |
| Engine | `full-game-1.0.0` |
| Original Powers | Off |
| Art manifest | Explicit server configuration; emulator permits `0.0.0-no-assets` |

Protocol 1 remains the Officer development fixture. Existing consumers keep their current schema and source pin. Frontend and Balance review protocol-2 adoption before depending on it; this handoff does not edit Claude-owned worktrees.

## Complete game behavior

`packages/engine/src/full-game/` supplies deterministic setup, vote arithmetic, victory predicates, lifecycle and audience projection. It reads no network, ambient clock or random source. Server-created role permutations, Code extras and five independently randomized turn permutations are recorded once outside transaction retries. Each player picks an A/B room before the deal; roles are independent of that choice.

The lifecycle begins with Round 1 ordinary turns. Each non-eliminated seat retains a 60-second turn for speaking, including Injured/Jailed players. An accepted Standard Hack opens a separate 60-second phase immediately afterwards. Voluntary movement is independent of whose turn it is and consumes one movement before voting. Code submission is likewise independent of the active player, limited to the surviving Hacker's one Round 5 attempt.

After all turns, a Captain with an unused release opportunity can select one prisoner in a fixed choice window; the release vote then precedes the Jail vote. Windows close only at server expiry, with missing responses treated as abstentions. Ballots remain private until the aggregate tally. The first Captain election follows Round 1; replacement elections occur at the next round boundary. Ties repeat runoffs, and no-candidate/all-abstain cases continue without an invented Captain.

The Jail result applies before queued effects. Main Actions precede Shots for each actor in the recorded round order, followed by Rescue, Round 3 Supplier grants, final placement/reveals, the complete victory check and Captain eligibility. Valid registration reserves resources and fixes the target; later actor status or target location does not cancel or redirect it. Target health and active Protection are rechecked. Protection activates at the next normal round and can be received only once per match; its grant/activation/consumption belongs only to Undercover. Supplier grants are visible through the authorized Supplier/recipient state, never a public weapon marker. Officer's ordinary-shot cap remains one, including after a Supplier grant.

Hacker Scan results are immediate and private; a failed guess gives no Code membership. Code victory is checked after complete normal Round 5 effects. If no winner exists, all non-eliminated players receive separate special ammunition in Final Zone, register targets during one fixed window and resolve in Round 5 order, including shots of actors eliminated earlier in that stage. The complete final check yields a winner or Draw. Exact roles and Code become public only at Finished. Explicit host abort is terminal without a fabricated winner or secret reveal.

Only explicitly sourced starting ammunition is initialized: Undercover and Officer get one weapon; other roles need a grant. This does not prohibit Alien from receiving a Supplier weapon. Original Power descriptions and older identification mechanics remain historical and are not enabled by this profile.

## Shared contract and disclosure

`packages/contracts/src/full-game.ts` defines strict commands, receipts, phases, complete public/player snapshots and audience events. `v1-service.ts` adds strict lobby, admission, lifecycle, recovery and endpoint response schemas. Client intent includes match, phase and command ID; actor identity, time, damage and result are obtained or determined by the server. Invalid schemas are transport failures; legal-schema game rejections are durable `PHASE_CLOSED` or `NOT_ALLOWED` receipts. Accepted receipts say only `REGISTERED`, without target defense or failure causes.

Player snapshots include only their own role/resources, role-authorized knowledge, legal target hints, pending command IDs and ballot. Movement destinations and release-vote availability are explicit. The validator checks roster references and rejects premature roles/Code, healthy-seat faction disclosures and knowledge belonging to another role. Public phase IDs and tokens carry no role names. Public revisions and events change only for authorized public facts; private registration leaves unrelated snapshots unchanged. Presentation reconciles each event with its audience-specific view revision and derives comic cues from these authorized facts.

## Technical service and reproducible checks

The focused Firebase follow-up for issue #14 adds admission, identity binding/recovery, atomic command receipts, journals, bounded durable scheduling, runtime guards and standalone packaging. Its endpoint/request reference and verification record accompany that follow-up. The pure engine/contracts deliverable is issue #13; both are independent review steps with explicit dependencies.

Run the pinned Node `22.21.1` and npm `10.9.4` toolchain. `npm ci`, `npm run verify`, `npm run test:emulator`, and `npm run package:backend -- --verify-install` provide the reproducible local checks. Emulator execution needs Java 21 and only the loopback `demo-mothership` suite. Actual final counts, pure-engine evidence is in [V1 engine verification](v1-engine-verification.md); the Firebase follow-up records its own emulator and artifact evidence.

No cloud project was provisioned or deployed. Production task/IAM delivery, App Check attestation, device integration, the accepted Designer asset manifest, Frontend/Balance contract adoption and human playtests remain separate acceptance gates. Spoken Hack truthfulness and content embargo remain player responsibilities, not automatic server guarantees. A passing simulation or emulator is not evidence of human social-deduction balance.
