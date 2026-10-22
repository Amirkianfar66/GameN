# Officer/Protection engine slice

This package implements the internal nine-seat Round 2 integration fixture from
`docs/backend/first-slice.md`. It is not a complete match engine. All time,
recorded turn order and opaque phase/deadline identities come from the trusted
adapter. The engine imports only the shared contracts and performs no network,
clock, randomness, logging or rendering work.

The adapter selects the supported handler using `ENGINE_VERSION` and
`SOURCE_MANIFEST_SHA256`. It owns the private `journalSequence` used to replay
committed transitions in total order; pure engine transitions preserve that
counter and never expose it in projections.

`registerShot` reserves the Officer's single ordinary shot and returns a safe
receipt. It updates only the Officer's projection revision. The transactional
adapter owns caller-scoped request digests and receipt deduplication; it must
return a recorded receipt before evaluating expiry. Calling the engine twice
without that adapter does not reproduce the accepted receipt.

`advanceDeadline` checks the phase ID, private token and trusted expiry time.
Every later scripted turn receives a fresh 60-second window starting at the
actual transition time. Expiry of the final recorded turn marks a private
`turnsComplete` prerequisite and clears the token. It leaves the expired public
phase unchanged because voting phases and durations are not approved here.

`resolveSlice` is an internal harness transition requiring completed turns and
an explicit completed Jail vote with nobody newly jailed. It opens an untimed
resolution phase and applies the single registered attack. Later actor injury,
Jail or elimination cannot cancel that attack. Active, unconsumed Protection
blocks it and is consumed; otherwise one damage changes health. No caller-facing
skip-vote or resolution endpoint belongs to this package.

The fixture fixes target locations, turns off optional powers, and excludes
competing effects and self-shooting. Excluding self-shooting is a fixture scope
restriction, not a decision about its legality in the full game. Target movement
and competing-effect precedence still need owner decisions. This stage does not
implement Hospital relocation, Rescue, faction reveals or victory checks.

`project` builds independent composed snapshots from an explicit public-field
allowlist. Protection, queues, deadlines and other players' roles remain
server-only. `shotAvailable` means remaining resource, not current eligibility.
The recipient policy for Protection consumption remains unresolved; projections
contain no block/defense explanation, attack cause or target-registration cue.

Tests and synthetic fixture seeds live only under `test/`; they are outside the
runtime exports and TypeScript production inputs. After installing dependencies
and building at the repository root, run:

```sh
node --test packages/engine/test/*.test.mjs
```

The tests pin the reviewed bootstrap base and source-manifest hash, cover both
Protection variants, privacy and time boundaries, and replay identical recorded
inputs. Firebase transaction races, authentication, Security Rules, receipts and
scheduling-outbox recovery require the separate API/emulator tests.
