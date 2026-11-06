# Requester-bound Planet admission consumer

The R14 consumer accepts an admitted display only when the authenticated read confirms its original match, room code, request ID and `display` kind. Pending, closed, declined, unavailable and mismatched reads expose no roster, role, gameplay projection or game transport. An admitted player additionally requires its assigned seat. The original request context remains UID-bound through approval and reload; a lost admitted view does not become a new pending request.

Recovery consumes the strict `{matchId, seatId}` result, checks the requested match and the next authorized snapshot's seat, and clears the old admission context only after the verified result. Recovery secrets remain in memory. This follows the separate Match ID/recovery-code presentation change at `4333fa7cb39882969d0378650c50735ccb4c7797`.

The base is `9508fa33d88a54d1e51ceee01483df1ecae0d2cf`. Integration's shared admission commit `7528d54538ffaa960094624de1122877f47975a9` was adopted as `fd30bf00e72907ccc9ad4afc2f2b09020d8d348c`; shared recovery schema `6c025628235c48e557b92e6e0b5c19b0435622e3` was adopted as `9508fa33d88a54d1e51ceee01483df1ecae0d2cf`. The rule tuple remains protocol 3 / `planet-game-1.1.0` / `in-person-planet-private-feedback-2026-11-06` / `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa` / `design-0.6.0`. There is no engine, service, game rule, approval-manifest or artwork-byte change.

## Runtime checkpoint

- `npm run test:frontend`: 860 passed (216 presentation, 644 game); zero failed, skipped or cancelled. Loopback test servers require local network permission.
- `npm run typecheck`, `npm run check:workspace`, `npm run check:sources`: passed.
- The five selected bootstrap contract files passed 48 tests, including R14 and typed recovery.
- Native browser admission matrix: 32 passing cases across 320×568 and 390×844, normal/reduced motion. It covers pending reload, unavailable reads, wrong request/kind, admitted display and reload, closed/declined requests, admitted player, recovery/context clearing/UID changes, and an admitted player with no seat. These are explicit synthetic authority through the native consumer in desktop Chromium phone emulation.

The real Auth/Firestore/Functions emulator-to-native-UI smoke and the remaining browser/art regression refresh are still in progress at this checkpoint. They are required before final acceptance. This document does not claim hosted, production App Check, physical-device, Safari, multiplayer correctness or human playtest acceptance.

## Consumer inventory impact

Integration must refresh the still-unpublished `design-0.6.0` consumer source hashes after adopting this change and `4333fa7c`. The exact 18 approved library outputs, their source bytes, the nine historical base bundles and the approval JSON are unchanged. No review video, withdrawn EJECT proposal or Designer ancestry is adopted.
