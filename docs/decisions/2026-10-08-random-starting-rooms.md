# Owner decision: random starting rooms

Recorded 8 October 2026 for [issue #83](https://github.com/Amirkianfar66/GameN/issues/83), from deployed base `2bcd23069505e8c93fac174fe2750346887a9d5e` (PR #80).

The owner requested: “players when join a lobby should not choose their initial room A, B, initial starting location is randomly assigned by app.” This supersedes the player-choice clause of V1-01, the initial-room clause in the earlier identity/staged-start decisions, and older join-screen designs. Historical source files remain evidence.

## Assignment and persistence

The server assigns each new human admission and newly added practice bot to Room A or Room B. The implementation uses an independent 50/50 draw for each assignment; there is no role, faction, character or seat-number dependency and no equal-count quota. This distribution is the implementation interpretation of random assignment, not a separately measured balance claim.

The assignment is persisted before the role deal and reused by approval, setup, launch, retries, reconnect and recovery. A repeated request cannot re-roll an existing assignment. Already assigned admissions/seats and already-running games retain their stored rooms. Adding bots preserves retained bots and human seats; newly added bots get their own random assignment.

## Contract and user flow

The join form asks for the room code only. New protocol-2 admission requests omit `initialRoom`. The strict request schema temporarily accepts an optional deprecated Room A/B value from already-loaded clients, but the server ignores it. Other rooms, client random seeds and unknown fields remain invalid. Admission, lobby and seat document shapes do not change; they carry the server-assigned room.

Deploy the compatible backend before the new client. Existing clients may still display their old room control until refreshed; its submitted value has no authority. Existing persisted requests keep their original receipt identity.

## Rule-version scope

This is an admission/setup policy override. The pure engine still consumes recorded `initialRooms`, with unchanged gameplay, role/Code/turn randomization, movement, resolution and audience rules. It adds no engine randomness. Preserve protocol 2, engine `full-game-1.0.1`, the historical `in-person-v1-2026-10-06` engine ruleset/hash and `staged-start-1` compatibility so existing games can continue. This later decision and the deployed service commit identify the amended V1-01 setup behavior. The old ruleset pin must not be cited alone as evidence that players still choose their rooms.

Character selection remains 30 seconds; private role reading remains at least 30 seconds plus every human Ready. Original Powers remain off. Canonical art and Canvas are unchanged.

This record describes authorization and intended behavior, not proof of verification, deployment or affected-role review. Actual evidence belongs in the focused PR.
