# Native phone interface candidate

Issue #208. Frontend base: `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`. Backend implementation dependency: `2b2e6eac71992a96a057047b5f36823a9b5f802d` (#210); shared schema `090429d764e11c9b594e2707aad9e5fe71601c07`. The separate type-only compatibility checkpoint is `eec7a5f83598324a4653839b808ed4afdb1c2461`.

This is a native UI consumer of existing approved artwork. It imports **no file from Designer #207 or #197**, copies none of their assets, and changes no drawing port, published artwork manifest, approval or canonical rule. #207 at `d52a8ae94f7639dd853f04b4e897b9b77aecff42` supplies the owner decisions/reference direction. Its unused prototype corrections are not an asset-adoption dependency for this implementation. Designer still needs to review the actual native captures against that direction before final merge.

## Behavior

- Join/Host/Recover, admitted lobby and one-tap room-code copy feedback use the existing session machinery. Recovery codes stay hidden until revealed and clear on concealment. The character picker is one stable 3×3 grid with call signs, taken seats and selection state.
- The player's room is the default. Board/Room changes only the view. Actions open the relevant room or board and highlight offered figures first; a separate text target list is available. Pass retains its confirmation. Vote replaces it only in the authoritative election/Jail phase, using private own-ballot state and offer/eligibility guards. Ballot and permitted result grids retain seat n in cell n, with empty cells for missing eighth/ninth seats. Results expose no individual ballots.
- Active-player portrait/name, top-bar Promises and Settings, and Panels/Windows use the native controller's audience-limited projections. Private-talk participants get the existing capsule; private Clone/card drawings retain their existing consumers. No target is invented when the server supplies none.
- Sheets reflow and scroll between the measured bars. Their footer remains outside the scrolling body. Names wrap fully at enlarged text. Native semantic icons have accessible names. Glass keeps the owner's direction, adds a bounded body backing for readability, and becomes solid with reduced transparency or without backdrop-filter. Reduced motion settles decoration without changing progression. No new ambient drawing or room redesign is adopted.

## Versions and authority

Setup flow 3 consumes the exact server interval: card until `roleFilmStartsAt = startedAt + 20000`, then the existing film sought within the final 10000 ms, ending at `endsAt = startedAt + 30000`. Fresh authorized entry reveals the card; blur conceals it, and a fresh authorized foreground read seeks the current film time. Skip returns locally to the card. Film end and Skip send no Ready, advance or start command. Ready remains manual after the minimum. The separate full ten-second boarding interval follows the server's Ready transition; expiry waits for a running snapshot.

Absent/2 setup flows keep their released Reveal/reading behavior and historical art. The old recovery-suppression omission (#205) is not claimed fixed for those flows. Flow 3 follows its explicit authoritative interval even after Return to lobby into a different match. A saved setup version or same-identity timed interval cannot silently change.

The exact engine 1.2 candidate inherits the existing canonical rules under Backend's compatibility record. Its private `DECLARE_HACK_SIDE.declaredSides` drives the enabled subset in a constant three-card layout. No public role cue or inferred permission is added. Hospital numbers come only from the server's original-seat offer and submit stable seat IDs, including an offered eliminated original player. P18 final-Code eligibility remains offer-driven. Existing 1.1/1.0.x tuples keep their saved rules/assets; unknown/mixed tuples stay rejected.

Receipts mean registration. Clone/Engineer refer to the current card state, talk follows the current turn, Protection names the next normal round, and attacks/Rescue stay pending. Only authorized projections describe effects. Promise views use actual lifetime quotas and at most one accepted given/received history; Captain Support covers each election ballot in which the recipient is a candidate. Uncertain commands retain their original identity/body and receipt recovery.

## Blackout

No phase sequence or damage/cancellation outcome is changed. The UI follows the phase it receives; DSN-REQ-20 remains an owner/Backend decision.

Room framing derives from all fixed places, not occupants, so reconnecting directly into darkness needs no saved roster. The lit window caches only geometry for **both** Room and Board, including bar offsets, press rectangles and clinical badge coordinates. That safe cache survives conceal/reconnect until fresh phase data retires it. Darkness removes figures, names, roster accessibility content, drawings and private identity content from all alternate panels. Only the requesting player's offered fixed slots are selectable; authoritative `slotId` remains the command identity. No hit is inferred from a selection.

## Review and evidence

Final exact commit/hash inventory, commands, capture provenance and actual results are recorded in `phone-ui-verification.json` and `phone-ui-consumer-inventory.json` after the final run. The excluded development harness executes the candidate's native app/controller/render modules. Its unchanged asset plugins read and verify art from a clean exact `fb33cecb` release tree. Every loaded candidate module, relevant TypeScript source, asset-tooling file and emitted art file is hashed; captures verify candidate hashes before and after. This does **not** mean ordinary production packaging accepts the changed source.

The ordinary source guard is expected to reject changed native hashes until Integration adds a separately reviewed follow-up approval. Historical pregame/crew approval bytes remain immutable. Integration owns that adoption, combined CI, merge, configuration and release. Existing saved assets are never repinned here, and no creation default, deployment or cloud configuration is changed.

Desktop Chromium emulation is not real iPhone/Android performance or VoiceOver evidence. Physical startup/frame/input/memory, iOS Safari and screen-reader checks remain unrun without devices. Contrast evidence tests an actual white background bound and the solid fallback; it does not establish WCAG compliance.
