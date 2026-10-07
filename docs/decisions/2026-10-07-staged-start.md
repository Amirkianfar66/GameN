# Owner decision: staged V1 start

Recorded 7 October 2026 for [issue #73](https://github.com/Amirkianfar66/GameN/issues/73),
from deployed base `af797838dee531d7874da2145e99a50c67d32b45` (practice bots, PR #72).
The game owner requested this order: everyone joins, the host starts setup, each
player selects a character, the server assigns private roles, then gameplay starts.
The owner explicitly answered **“Yes—wait until everyone confirms their role”**
when asked whether each human must tap Ready before the first turn timer begins.
Bots complete their selection and readiness automatically.

## Timing update from the owner

While implementation was in progress, the owner added a **30-second character
selection window after the host starts**, followed by **30 seconds to see and
read the private role card**. Both windows use server time. Characters and roles
must not be dealt or gameplay started early just because players or bots confirm
quickly. The initial gameplay turn still receives its normal full duration.

The owner explicitly approved both timeout policies: automatically assign an
available character when selection expires, and keep the all-human Ready
requirement after the minimum 30-second reading window. Humans may acknowledge
during that window; gameplay starts only when both requirements are satisfied.
An all-bot match still waits both full windows. Delayed task delivery starts the
reading window from the actual committed deal, preserving its full duration.

## Approved sequence

1. The host creates a seven-, eight- or nine-seat lobby. Humans choose their initial
   Room A/B when requesting admission, as required by V1-01. The host seats humans
   and may configure practice bots until every seat is filled.
2. The host starts setup. This freezes the roster and bot count and opens a full 30-second public
   character selection window. No gameplay timer or bot gameplay runs during setup.
3. Every human confirms a public name and an available character. Claims are
   unique and authoritative. Characters are visual identities and never select a
   role, faction or ability. At the deadline, the server fills any unconfirmed
   choice with an available character and safe unique name. Confirmed choices
   are preserved; neither early confirmations nor bots shorten this window.
4. The server deals the normal mode-specific roles randomly, independently of
   names, characters and initial rooms. It persists this one deal. Each human can
   reveal and conceal only their own private role and then press Ready. This
   reading stage lasts at least 30 seconds from the actual deal.
5. When the reading deadline has passed and every required human is ready, the
   server starts gameplay exactly once,
   with a fresh full first turn window. An all-bot match completes both timed stages
   automatically. The host and display show neutral selection/readiness progress,
   never private roles or factions.

Reloads, retries, disconnects and seat recovery retain the same seat, character
and dealt role. Recovery cannot create a second role deal. A disconnected player
who has not confirmed remains required before gameplay; the host can recover that
seat or abort the unusable test. Once gameplay starts, V1-12's continuing server
deadlines still apply. The normal recorded host abort is available during setup.

## Scope and precedence

This supersedes the permissive start-without-character fallback and pre-host-start
selection timing in [the earlier identity decision](2026-10-07-crew-identity.md).
Already-running matches keep their current engine state and roles. Treatment of
existing unstarted lobbies is part of the implementation handoff and must require
confirmation in the new selection stage rather than silently bypassing it.

This is a pregame lifecycle decision. Role composition, randomization, initial
room rules, gameplay durations/resolution, Original Powers off and the approved
comic assets remain as before. The engine/ruleset pins remain `full-game-1.0.1`,
`in-person-v1-2026-10-06`, hash
`6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90`, protocol 2.
New setup documents and operations must have strict, separately versioned
contracts. This decision record is owner authorization, not proof of completed
implementation, deployment or affected-role review.
