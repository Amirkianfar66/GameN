# Planet requester admission contract

Service contract addition from base `97a4c0ec83bb8113f4ca87610acbdce5a133c6fc`, addressing Frontend R14. Gameplay protocol 3 / `planet-game-1.1.0` and its exact ruleset/hash are unchanged. This is an additive service response change requiring Frontend review before release; historical engine views and tuples are unchanged.

Every authenticated `read` snapshot now requires `admission`, either `null` (host or a recovered member without a registered request) or `{requestId, kind, status}`. `requestId` is the original `requestAdmission.requestId`, bound server-side to the authenticated caller. `kind` is `player` or `display`; status is `pending`, `admitted`, `declined`, or `closed`. Current API has no decline operation; the schema reserves that explicit denied standing without inventing a host control. An unapproved request becomes `closed` when setup stops accepting it. A successful read or a null seat never implies display approval.

Pending, declined and closed snapshots have empty `members` and `pendingAdmissions`, `isHost:false`, and null `selfSeatId`, `setup`, `privateRole`, `publicView` and `playerView`. An admitted display can receive admitted public/session data and no player seat, role or player view. The host-only admission list never appears for another caller. No client-supplied UID is accepted. Recovery revokes the old identity's match capabilities rather than converting it into a pending requester.

Frontend must match the standing to its retained original request ID, retain UID-bound request context, and clear it after account recovery. A recovered member uses the server-assigned seat. Admission data is transport metadata and cannot change character placement, role allocation, rules or audience event revisions.

Validation: the three focused contract tests in `tests/bootstrap/planet-service-contract.test.mjs` passed, including denied roster/setup/seat leakage, forged UID/status, required standing and display/player separation. Service/Firebase implementation and independent consumer review are separate release gates.
