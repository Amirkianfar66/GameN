# Planet consumer corrections, 6 November 2026

Independent Frontend fixes from `822a1581682cb6f58c4edd5139c0605fd3b15a53`, on `codex/frontend-planet-successor`. Owned paths only; the protocol-3 `planet-game-1.0.1` pins, P27 timings, Designer sources and shared approvals are unchanged.

## Implemented

- Meet A/B terms name the giver alone at the authoritative voting-start opportunity. This corrects the Frontend's earlier both-participants wording while preserving Designer's confirmed terms. The separate engine correction belongs to Backend.
- Navigation buttons follow private legal offers. A stage/availability flag is not treated as acknowledgement history or sufficient authority to enable a command.
- Join names use the shared limit of 12 Unicode code points. The form gives visible validation and accepts twelve supplementary-plane characters; programmatic requests receive useful validation before anything is sent.
- An acknowledged join request retains UID-bound request context across reload. Forbidden or unavailable reads show a safe waiting screen. A pending request supplies no roster, role, player view, shared display, recovery secret or game transport. A null seat and remembered display kind cannot approve it.
- A server-assigned player seat confirms that player's membership. Existing direct authorized display reads remain supported. A known pending display stays waiting until the service supplies explicit standing; the current contract cannot distinguish its approval.
- Redeeming a recovery code reads the server-confirmed match. Recovery secrets stay in memory and never enter resume/request storage.

## R14 service dependency

Integration owns the response and Backend owns shared contract changes. The concrete proposed response needed by this consumer is requester-specific standing on an authenticated read, bound by the server to the authenticated caller and the registered request:

```json
{
  "admission": {
    "requestId": "original-request-id",
    "kind": "display",
    "status": "admitted"
  }
}
```

Proposed statuses are `pending`, `admitted`, `declined` and `closed`. Pending/declined/closed responses must carry no private role/player view or admitted-only roster/board. `closed` must cover an unapproved request when setup no longer accepts it. The host's `pendingAdmissions` list remains host-only. No UID is accepted from a client request body.

This is a request for a reviewed typed contract, not a field this implementation silently accepts. Until that arrives, a known pending seatless display cannot complete approval from a successful null-seat snapshot alone. The UI says the request is registered and waits for confirmation. Missing standing is never repaired from the remembered device mode.

## Verification

All 827 Frontend tests pass (212 presentation, 615 game), including giver-only terms, legal-offer gating, pending reload/audience boundaries, twelve-code-point names and seat recovery without persisted secrets. Build, both typecheck programs, workspace/source checks, production build and production-bundle exclusion pass. The production build retains its existing large-chunk advisory.

[Browser facts](evidence/planet-consumer-fixes/facts.json) record 16 checks and screenshots at 320×568 and 390×844, normal/reduced motion, with no runtime exceptions. They cover name validation, request submission by actual browser tap, pending reload, a null-seat snapshot remaining unapproved, assigned-player transition, acknowledgement offer removal and giver-only terms.

Reproduce after the workspace build:

```sh
node scripts/test-frontend.mjs
./node_modules/.bin/vite build --config apps/game/dev/planet/vite.config.mjs
node apps/game/dev/planet/capture-consumer-fixes.mjs
```

These are synthetic authoritative responses through the production consumer in desktop Chromium phone emulation. Real service/Firebase, Safari, physical devices, assistive-technology acceptance and hosted multiplayer remain unrun.

## Continuing dependencies

P28 is settled at Integration commit `8572fc0abb717ab07e09b4db3c25d6748ec8800b`. Its fixed neutral 15000ms window requires Backend's next immutable tuple and neutral phase before consumer adoption. This change does not retrofit P28 into the old tuple. Integration retains R14 service work and approval fences; Designer retains artwork ownership. Designer baseline `ff7b689a17282e63606506bbf151d79c7da858fc` remains pending named runtime adoption. No merge, deployment or activation was performed.
