# Phone interface Backend contract

Issue #209. Implementation base: `fb33cecbf4b0fc2bef5d107e79ae2aac0ed7be70`. The original Backend branch was preserved at `82ea5aec787362dd6b66acfc4bcbae2fb64629ed`. Designer evidence is PR #207 at `d52a8ae94f7639dd853f04b4e897b9b77aecff42`; its visual assets are not adopted by this change.

## Independent saved versions

Protocol 3 and `PLANET_GAME_PINS` remain unchanged. `PLANET_PHONE_OFFER_PINS` explicitly registers engine `planet-game-1.2.0` as an implementation of the existing `in-person-planet-private-feedback-2026-11-06` canonical rules and hash. The frozen authority still declares engine 1.1; it is not relabeled. The separate [technical compatibility descriptor](planet-phone-interface-compatibility-2026-11-10.json) records this inheritance and the two private-offer changes. Existing engine 1.0.0, 1.0.1 and 1.1.0 packets/replays retain their semantics.

Creation profile `phone-private-choices-1.2` selects the new engine only when explicitly configured through `MOTHERSHIP_PLANET_ENGINE_PROFILE`. Absence retains engine 1.1. Unknown profiles reject. The asset pin, creation enable switch and saved setup flow are independent. No setting is activated here.

Setup version 3 is separately saved at creation. Unset/configured 1 retains historical packets with no saved version field; version 2 retains its existing reading/boarding behavior. Explicit saved version 1 and unknown saved values remain rejected. Changing a worker's current creation settings does not change an existing session's saved versions.

## Reading and manual Ready

Only a flow-3 reading snapshot carries all three server boundaries:

```json
{"id":"synthetic-reading","startedAt":100000,"roleFilmStartsAt":120000,"endsAt":130000}
```

- Card: `[startedAt, roleFilmStartsAt)`, exactly 20,000 ms.
- Existing own-role film: `[roleFilmStartsAt, endsAt)`, exactly 10,000 ms. Seek from authoritative server time; a late entry at elapsed 25 seconds is five seconds into the film.
- Ready: a human operation accepted at or after `endsAt`. An early request is rejected without changing Ready or storing a successful operation receipt. The same request may be retried after the boundary under existing request semantics.
- A human remains unready until their own accepted Ready operation. Bots remain automatically ready. No film completion, Skip, tab, blur, visibility or asset callback is a service operation or phase authority.
- The reading minimum's ordinary durable deadline is reused. There is no extra task at 20 seconds. Missing/late processing does not alter the saved interval.
- If humans are still pending after the minimum, the session remains reading. The last manual Ready starts a separate full 10,000 ms boarding interval from actual authoritative processing time. All-bot sessions enter it when the reading deadline is processed.

Recovery, reconnect, duplicate start/Ready and background return reuse the saved interval and deal. They never restart reading or re-deal roles. Frontend owns concealment, current-point presentation and missing-art/Reduced-motion behavior. Role data is still available only to its admitted owner; host/display receive common timing and public roster, not private roles. Pending/closed admission receives neither interval nor roster.

Boarding remains the existing server-owned stage for versions 2 and 3: public roster, no private role/game view, exact start/end, stale-task rejection, duplicate delivery and recovery safety. Actual initialization after boarding starts a fresh 15-second PRE_TURN, followed by the full ordinary-turn duration. Choosing/running/historical reading cannot carry the new film boundary.

## Private action offers

### Hospital keypad

Only the engine 1.2 candidate changes `PANEL_CODE` offer metadata. `targetSeatIds` is the original public number order `seat-1` through `seat-N`, including eliminated identities. Display player number `n` maps to stable `seat-n`; current room, living-target filters and secret roles do not define keypad choices.

The offer and its choices do not depend on remaining injections, the true Doctor identity or whether a proposed answer would be correct. This also fixes the old offer's inventory-dependent disappearance. The command remains unchanged:

```json
{"type":"PANEL_CODE","doctorSeatId":"seat-4"}
```

That is a synthetic guessed number, not disclosure of the Doctor. Authoritative eligibility, one lifetime attempt, selected-reality resources and queued Rescue remain unchanged. With no injection available, reject before evaluating correctness or spending the attempt; correct and incorrect guesses produce the same existing `NO_INJECTION` result and no new patient evidence. No injection inventory or answer is added to a patient offer.

### Standard Hack declaration

Only a candidate private `DECLARE_HACK_SIDE` offer has `declaredSides`. Its canonical order is Blue, Red, Alien, filtered by the existing command authority. Ordinary roles receive their truthful faction only; Undercover and Alien receive all three. Historical tuples and unrelated offers omit the field entirely.

Frontend can retain the same three private cards, disabling choices outside the subset. This grants no new bluffing permission. Permissions, private role, chosen side and claim validity must not become public projection metadata, revision cues, assets or sound. A declaration is an unverified claim, not a verified faction or resolved outcome.

### Distinct Hacker actions

P18 is settled and command mechanics are unchanged:

- Standard Hack retains its own turn/health/freedom/target and allowance rules, using the authoritative offers.
- Final Code: one global submission by a living Hacker from Round 2 before navigation, including while Injured/Jailed and with the Role Action already spent. It does not spend that action. An accepted attempt remains spent across reality selection.
- Hack Spaceship: correct Code unlocks it; activation separately requires a Healthy, free Hacker in A/B on their own ordinary turn and spends that round's Role Action. Code success alone does not activate it.

The 1.2 candidate explicitly inherits P27's full six-second Sync presentation, P28's neutral NAV_SETTING/eligible Officer privacy, private Engineer/patient feedback, and giver-only Meet evaluation. It does not revive NAV_TIE or omit inherited private evidence fields. Unknown/mixed canonical tuples reject.

## Blackout and consumer dependencies

No lifecycle, command-resolution or Blackout outcome code changes here. The owner-approved pre-vote placement still requires explicit outcome/binding/cancellation semantics. Both the post-vote-strike recommendation and the feasible pre-vote-damage alternative are technical proposals, not approval. Current matches and this private-offer candidate retain the existing post-vote Blackout sequence until a separately versioned gameplay decision is implemented.

Frontend's reviewed compatibility commit `eec7a5f83598324a4653839b808ed4afdb1c2461` derives the saved-version type honestly and explicitly refuses unfinished flow 3. The full timed consumer is Frontend-owned. The Backend branch alone retains native files; its full workspace build hits the known old model type. A paired validation tree compiles, but the native source approval correctly rejects the changed session consumer. Historical approvals/manifests must not be repinned to hide that dependency. A final exact consumer/adoption review and required combined checks remain before merge/release.

All five workers and a reviewed compatible consumer must understand the saved new flow/profile before any future authorized API selection. Rolling back new creation selections must retain workers/consumers capable of processing already-saved sessions. No cloud configuration, IAM, deployment, asset adoption or creation-default activation is performed by this work.
