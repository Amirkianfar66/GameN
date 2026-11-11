# R17 boarding contract checkpoint

Implementation base: `469b709b6689a1063ec36a10c70b8b6e2420c18c`, branch `codex/backend-planet-boarding`, isolated worktree `/private/tmp/gamen-backend-boarding`. The original Backend worktree remains untouched at `82ea5aec787362dd6b66acfc4bcbae2fb64629ed`. Owner-authorized R17 from issue #188 and PR #198's handoff at `e43d5e675cecf5a5a3c8afadea246f8c22cb8a7c` inserts one shared ten-second interval after the existing reading minimum AND all Ready, before actual Round 1 initialization.

## Exact shared snapshot

`PlanetSessionSnapshotSchema` now permits an optional literal `setupFlowVersion: 2`, independent of `versions`. Missing means historical flow 1; no default field is injected into old JSON. Unsupported explicit versions fail closed. All snapshots of new flow-2 sessions include `setupFlowVersion: 2`, including lobby/terminal/denied snapshots. An admitted boarding snapshot has:

```json
{
  "setupFlowVersion": 2,
  "status": "boarding",
  "setup": {
    "id": "stable-server-generated-boarding-id",
    "startedAt": 1800000060000,
    "endsAt": 1800000070000
  },
  "privateRole": null,
  "publicView": null,
  "playerView": null
}
```

The example is a partial synthetic snapshot. Existing authorized `members[].seatId`, `characterId`, `displayName`, `controller`, `ready` and `playerCount` remain unchanged. Compose the film from seat/character/count only; do not pass secret data into a shared renderer. Use **`setup.startedAt`**, matching existing engine timestamp naming; Designer's `startsAt` means this same value, not a second clock. `endsAt - startedAt` is exactly `PLANET_BOARDING_DURATION_MS = 10000`.

Only boarding adds `setup.startedAt`; choosing/reading keep `{id, endsAt}`. Unapproved requests still receive `members: []`, `pendingAdmissions: []`, `setup: null` and no role/game views. Displays receive no private role/player view. Private setup deadline tokens are never projected. No new command, Skip endpoint, media-ready flag or playback acknowledgement exists.

## Frontend behavior

Read and validate the version/status and server interval. Mount only for an admitted `status: boarding` session, using the current authorized roster. Use existing synchronized server time for elapsed time, seek on reconnect, and never restart a passed interval. At `endsAt`, hide the obsolete film and await a server-confirmed `running` snapshot; local time cannot initialize the game. Skip, reduced motion, missing/slow assets, focus/tab state and playback completion affect pictures only. All clients share one interval; there is no client acknowledgement quorum.

Role films remain private inside the existing minimum thirty-second reading stage and cannot confirm Ready. The local two-second brand intro has no server gate. These are independent of R17 and of artwork identity. Include boarding in host abort/recovery controls. The private role is concealed during boarding; it is restored through the authorized player projection when running.

## Service, scheduling and activation

Creation setting: `MOTHERSHIP_PLANET_SETUP_FLOW_VERSION=2`. Unset or `1` creates legacy sessions and omits the saved/shared version field. The default remains legacy until Integration deliberately activates after consumer review. Changing artwork never changes this setting. Gameplay remains protocol 3 / `planet-game-1.1.0` / `in-person-planet-private-feedback-2026-11-06` / hash `4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa`. All saved tuples and exact creation retries retain their original setup/art behavior.

Enter boarding atomically after the reading minimum and every human Ready (bots remain automatically Ready). Preserve the prepared deal, selected characters, room assignments and turn order, with no active game state yet. At authoritative boarding completion, initialize the prepared engine once at actual processing time. Its existing 15000ms PRE_TURN and subsequent full 60000ms ordinary-turn windows are unchanged. Delayed delivery never backdates the engine start.

Reuse the existing private setup record and outbox: task payload `{matchId, phaseId: setup.id, deadlineToken, kind: "setup"}`, with the existing hash-based task ID. Outbox/state/journal/receipts commit atomically. Early tasks retry; duplicates, stale reading/boarding tasks and aborted tasks acknowledge without a second start. No new queue, worker export or IAM identity is required. Every existing Planet function must run saved-flow-2-capable code before the API creation setting is enabled: an old deadline or repair worker can otherwise discard boarding work. Rollback selects legacy creation while retaining flow-2-capable workers and consumers for already-created sessions. Recovery rebinds the same seat and preserves Ready, prepared data, stage ID and timestamps. Host abort before initialization leaves no running engine and makes boarding tasks stale.

Implementation and evidence follow this contract checkpoint. Frontend owns its consumer; Backend owns these shared setup-schema additions. No artwork manifest/fence or deployed configuration is changed here.
