# Staged character and role setup

Combined implementation for [#73](https://github.com/Amirkianfar66/GameN/issues/73), based on
`af797838dee531d7874da2145e99a50c67d32b45`. The
[owner decision](../decisions/2026-10-07-staged-start.md) defines the sequence.
Implementation, executed checks and publication are reported separately below;
source implementation is not evidence of cloud publication.

## Player and host flow

- A newly seated player waits for the host. Character controls open only after the
  host starts setup with every seat occupied.
- Each human chooses an available character, enters their public name and confirms
  the choice. The original comic character catalog and names remain public. A
  taken-character refusal keeps the player on selection with their name retained.
- The host and shared display show who has confirmed a character. The server deals roles
  after the full 30-second selection window, automatically filling any missing
  choices from the available characters.
- Every player then has a private Reveal role control. Its closed state contains
  no role name, faction, private art hooks or role-specific announcements. The open
  state reuses the approved comic role device on their chosen character, with a
  concise reminder sourced from the existing role rules and confirmed overlays.
  Private starting knowledge arrives only with the gameplay view; the reminder
  explains this and never invents a target or reveals another player’s role.
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
   leave the timer unstarted; gameplay starts once both the reading deadline and every Ready are satisfied,
   with one fresh full gameplay window.
6. All-bot start, existing running-match continuity, private concealment and normal
   cleanup. Physical phones and human balance are separate acceptance work.


## Countdown implementation

The interface reads the choosing/reading deadlines from the strict public setup
document. A server-time sample calibrates its monotonic countdown; it invalidates
the estimate on suspension or a failed sample. Reaching zero only changes the
waiting text. Server transactions and tasks alone may deal roles or begin play.
The server owns both transitions, including when the host page is closed. Local
acceptance below does not establish Cloud Tasks or Scheduler delivery.


## Integrated verification on 8 October 2026

The combined branch is `codex/v1-start-sequence`, based on the deployed practice-bot
commit `af797838dee531d7874da2145e99a50c67d32b45`. It adopts the backend timed runtime
`f44562d3575c6a23cba105b85e90b694badfce63`, Rules correction
`14fb2ed8a7f9d2b388771085d54a7361f5f441fc`, and test/handoff follow-up
`f058028cfd6e90513a6479e0e4bb6c4372259703`. The lifecycle is `staged-start-1`;
protocol 2, engine/ruleset pins, initial room policy, Original Powers off and the
approved comic assets are unchanged.

Executed integration evidence:

- `npm run verify` passed 912 workspace tests: 50 bootstrap/contracts, 97 engine,
  118 backend, 96 tooling, 151 presentation and 400 frontend. Both typechecks,
  builds, workspace/source integrity and production exclusion passed.
- Balance gates passed 70 static checks and 483 catalogue cases, with 33 reviewed
  blocked and 6 explicit manual entries. All 4,388 negative controls were detected;
  30 seven/eight/nine-seat playouts completed with no invariant/replay mismatches.
- The real Firebase web SDK regression uses two humans and five bots, both full
  30-second windows, automatic character assignment, an early Ready and a final
  Ready after expiry. Both active clients receive the deal and launch without
  reload or listener errors; roles clear on launch. This catches a real listener
  failure found during browser acceptance that REST-only checks did not expose.
- A fresh browser test with one human and six bots passed through auto-assignment,
  private Reveal, waiting after the reading deadline, and final Ready opening the
  approved comic board immediately with a fresh 60-second turn. A host-away
  all-bot test preserved exact 30-second selection and reading intervals and a
  fresh 60-second first turn. Disposable matches were aborted afterward.

The Firestore fix removes a clock predicate from read authorization and lets a
current human binding observe only its own missing/deleted preview. Existing
preview data still requires the current matching deal, stage, windows and binding.
Host, display, peers, displaced identities, collection reads and writes remain
refused. Server time checks still enforce when roles may be published and when
play may launch; no client timer becomes authoritative.

The pinned Firebase CLI automatically starts its Tasks emulator with Functions.
SDK/REST acceptance observes those real local transitions through each participant's
own identity and Rules. Injected-clock service fixtures run in a separate fresh
Auth/Firestore suite, so real-time handlers cannot advance their simulated clocks.
The interactive local preview has a separate, clearly labeled server tick. Local
Tasks/preview behavior does not prove deployed scheduling accuracy or queue IAM.

GitHub CI, source-bound staging publication and hosted task delivery are separate
release checks. No merge is implied. Physical phones, real network loss, complete
hosted games and human social-deduction balance remain separate acceptance work.
There are no unresolved owner decisions for this startup sequence. Affected-role
contract review remains a merge gate. The historical connected development lobby
still uses its earlier start workflow; use the hosted/practice entry for this flow.

The initial combined CI run at `c0f5a1a` passed workspace checks but failed 55 of
114 backend emulator cases: live Tasks handlers advanced injected-clock fixtures.
The follow-up separates those fixtures from real Functions acceptance, retains
every suite, and checks that required HTTP suites cannot disappear. The rerun is
required before publication; the earlier failure is not reported as passing CI.
