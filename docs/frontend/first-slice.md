# Frontend first slice

**Status:** Implementation plan, not a built or measured release. Progress by slice, with the stage each one has actually reached, is tracked in [README.md](README.md).

## Slice and information boundaries

Use a seeded, non-production **nine-seat** match state containing Officer and an already-active Protection effect. Connect two actual player phones and one public display; other seats may be scripted fixtures. This is an integration scenario, not a two-player game mode. Preserve Protection's next-normal-round activation and one ordinary Officer shot. Advance through a Backend-controlled fixture harness rather than adding public skip-phase controls.

Show Officer selecting a same-location numbered target, confirming and receiving an authorized registration receipt. Later, the agreed resolution produces only the outcomes each audience may know. The public display must show no aiming line, camera focus, sound or document-derived activity indicator solely because a secret shot was registered. A blocked-shot public animation is conditional on the approved disclosure contract; never assume it reveals the shooter or Protection source.

## Client structure and approved contracts

Use React for layout, readable cards, role drawer, targeting controls and voting; R3F/Three.js owns a fixed-camera board with Room A/B, neutral numbered tokens and restrained depth. Designer defines the finished visual treatment. One primary board renderer is sufficient; PixiJS is not an additional dependency by default.

A transport adapter exposes subscribe, submit, receipt lookup and reconnect operations. A view-model adapter converts approved snapshots into DOM/scene inputs without importing private engine state or implementing damage logic. Keep server facts, local selection and presentation progress separate. Per-frame scene updates stay outside ordinary React state updates. Dispose scene resources, event handlers and subscriptions on teardown.

Require these contract concepts; field names remain subject to integration review:

| Contract | Required behavior |
| --- | --- |
| Audience view | Match/seat identity, compatible versions, audience revision, public facts and permitted private fields |
| Phase | Stable phase ID, authoritative start/end times, active participant and server-time synchronization strategy |
| Command | Stable request ID, match/phase/version context and action payload; identity supplied by authenticated transport |
| Receipt | Registered/rejected/pending-unknown distinction, safe error code and reconciliation reference |
| Presentation event | Audience-scoped ID, corresponding view revision and only authorized visual facts |

Prefer one composed player snapshot; never temporarily combine mismatched public and private revisions. Reject incompatible protocol versions with a recoverable update screen. Buffer revision-linked events until the matching facts arrive and suppress already-consumed events. The client must never inspect internal sequence gaps.

## Interaction and timing

Use **Available → Selected → Targeting → Confirming → Submitting → Registered** for the shot, with explicit rejected and unknown-result states. Provide immediate selection feedback but reserve resource/outcome assertions for server responses. Target hints and disabled reasons use authorized facts; an explanation must not reveal a hidden defense.

Double taps cannot submit separate commands. After an uncertain request, reconcile its receipt or retry the same ID and payload. A changed target is a new intentional action and must not silently replace an unresolved request. Preserve only a non-secret reconciliation identifier if cross-refresh recovery requires local persistence; do not store target/role payloads or queue offline gameplay. The Backend receipt contract must support this recovery.

Display the ordinary 60 seconds and the additional requested Hack's 60 seconds as separate phases. Estimate remaining time from trusted deadlines, resynchronize on foreground/reconnect, and never write countdown ticks to the database. At zero, display “Waiting for phase update” and disable expired phase controls. Only the server advances the phase. Do not globally disable movement or Round 5 Code merely because another player's ordinary turn is active; eligibility is command-specific.

On disconnect, mark the view stale, block new submissions and preserve local reading/navigation. On reconnect, restore the same authenticated seat, consume the latest authorized snapshot, reconcile pending receipts and skip obsolete cinematic playback. Never redeal roles or infer elimination from presence loss. A missing pause/disconnect rule remains a decision dependency.

## Presentation, privacy and fallback

Apply [the comic motion direction](../design/motion-direction.md). Build the development-only fixture gallery first, then connect its approved cues to the event director. Selection, registration, movement, resolution and phase transition have different treatments; a queued shot never receives the resolved-impact animation. Use the proposal values in `docs/design/design-tokens.json` rather than scattered durations.

Private DOM panels are hidden by default and concealed on backgrounding; this is best-effort screen privacy. Public routes request only public projections and cannot switch into private debug views. Keep private match data out of persistent offline caches, analytics, error attachments and public assets. Load role-art bundles uniformly to avoid assignment-dependent downloads.

An animation director consumes authorized events; it never changes health, resources or turn state. Cosmetic motion cannot block the next player's input or consume their turn. Any dedicated presentation phase requires an approved rule. One system owns each animated property. Start audio through a user gesture, provide mute, and use no public cue for confidential activity.

Render the full target/action flow in semantic DOM even when 3D is unavailable. Provide labels beyond color, visible focus, keyboard operation, reduced motion, readable zoomed text and a complete tap path. Dragging remains optional. Respect mobile safe areas; keep confirmation buttons reachable without obscuring targets. Handle lost graphics context with a recoverable board state and usable DOM controls.

## Evidence and acceptance

Test iOS Safari and Android Chrome on named physical devices plus a desktop/table display. Record browser/OS, viewport, quality preset, network conditions, ruleset and build. Browser automation supplements physical-device checks.

Initial **targets**, pending measurement: selection feedback under 100 ms; ordinary board interaction at 60 fps on an agreed midrange reference device; a usable 30 fps reduced-effects mode; critical compressed assets within the architecture's 6 MB budget. Record frame-time distribution, cold load, decoded texture memory and sustained-session behavior. Backend acknowledgment and view-delivery targets require integrated staging measurements and cannot be inferred from fixture animation.

Acceptance journeys cover duplicate submission, lost acknowledgment, refresh during pending registration, background/resume across a deadline, obsolete event delivery, rejected targeting, hidden-action non-disclosure, reduced motion, keyboard/tap parity and unavailable graphics. Confirm no role/resource reset after reconnect and no unauthorized fields in network payloads. Use Backend/Game Balance fixtures to distinguish registration from resolution after actor status changes.

Deliver the adapter and UI, one Designer-approved card/board treatment, reproducible journeys, captured evidence and a renderer evaluation. Accept Three.js for production only after reviewing measured cost, readability and visual value. Record unresolved disclosures, target rechecks and timeout policies explicitly; do not implement them by inference.
