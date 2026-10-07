# Staged character and role setup

Work in progress for [#73](https://github.com/Amirkianfar66/GameN/issues/73), based on
`af797838dee531d7874da2145e99a50c67d32b45`. The
[owner decision](../decisions/2026-10-07-staged-start.md) defines the sequence.
Implementation, executed checks and publication are reported separately below;
this plan is not evidence of a completed release.

## Player and host flow

- A newly seated player waits for the host. Character controls open only after the
  host starts setup with every seat occupied.
- Each human chooses an available character, enters their public name and confirms
  the choice. The original comic character catalog and names remain public. A
  taken-character refusal keeps the player on selection with their name retained.
- The host and shared display show who has confirmed a character. Roles are dealt
  only after every required choice is confirmed.
- Every player then has a private Reveal role control. Its closed state contains
  no role name, faction, private art hooks or role-specific announcements. The open
  state reuses the approved comic role device on their chosen character.
- Ready requires a current authorized own role. Acknowledgment hides the private
  card and shows neutral readiness progress. Repeated or lost replies retain the
  same operation identity; the server's current setup document is authoritative.
- Gameplay appears when the server says it is running. The first timer is created
  at that transition, never while people are choosing or reading roles.

Bots complete their selection/readiness automatically. Characters cannot change
after dealing. No role truth or private payload is written to browser storage.
A fresh page begins concealed, including after seat recovery. Host and display
never subscribe to pregame private role documents.

## Required acceptance before calling this complete

1. Strict requests, typed outcomes and allowlisted document paths; no browser can
   name another UID or send a role, faction, client time or winner.
2. Fail-closed setup/private feeds for stale, malformed, wrong-match, wrong-seat,
   regressing and conflicting snapshots and authorization uncertainty. Keep roles
   tied to the current binding and deal even when documents arrive out of order.
3. Public waiting/selection/readiness states; no early character selection,
   selection duplication, role disclosure, timer or gameplay action.
4. Lost/retried character and Ready operations; final selection/Ready races;
   refresh and recovery while choosing and while reading a dealt role; host abort.
5. Real service and browser path with two humans plus bots: one human Ready must
   leave the timer unstarted; the final Ready starts exactly one full window.
6. All-bot start, existing running-match continuity, private concealment and normal
   cleanup. Physical phones and human balance are separate acceptance work.


The owner subsequently requested two full server-timed startup windows: 30 seconds
for character selection and 30 seconds for private role reading. The current
frontend checkpoint implements the earlier untimed stages; timer integration and
the owner's timeout-policy answers are pending. This checkpoint must not be
published as the completed timed flow.
