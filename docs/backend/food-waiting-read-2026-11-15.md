# Recheck a Food snapshot while it waits for the Session writer

Follow-up to [#274](https://github.com/Amirkianfar66/GameN/issues/274).
Base and actual starting commit `c96e0925aa99db891c19ac49ebf67836285e9200`,
the merge of #282. The protocol, engine and rule pins are unchanged.

The seven-player staging retest on `planetapi-00011-nep` reached the Task
Panel after Join. It showed briefing at zero and later lacked an enabled
RELEASE offer. No Panel press was sent. The bounded API aggregate contains 43
successful READs at 8,027 ms service p95, 15 with a writer-wait span, and one
failed READ that spent 20,018.967 ms waiting for the writer. That request had
263 read-only transactions and 20 write transactions with failed commits and
no successful claim. The source and counts are consistent with repeated
clean claim losses and live-owner polling. The aggregate does not identify
the winners, record the bot lift, or measure acceptance of a timed press.

A READ routed to the ordered path currently keeps trying for the writer even
after earlier admitted work is fully committed. A controlled service test holds
a positive owner's post-commit acknowledgment. A waiting reader found its input
pending at first and stays blocked on the base after that input becomes
durable and the prefix becomes quiescent. In the candidate the reader returns
a fresh authorized snapshot during that same lease without an extra ingress,
claim, wake, or Session write. This is a reproduced contributor to wait time,
separate from identifying the writers in the staging sample.

After seeing a live owner or losing a claim, a READ can reconsider the existing
fast snapshot path once, then at most once per existing 500 ms snapshot
interval while the original writer wait is still running. The current
authorization, exact Control fence, pending work, engine deadlines and
effective human presence checks still run. A definitely unsuccessful recheck
continues waiting. Requests that may already have staged a snapshot charge or
attempted ordered admission cannot re-enter via this new path. The private
`readWhileWriterWait` timing span counts attempts when diagnostics are enabled.
It overlaps writer wait and does not expose identities, input contents, or
outcomes. Wait, input, presence, and grace limits stay the same.

A participant can renew the current binding's contact before expiry even
while a committed heartbeat's acknowledgment is held. The original expiry
wake hydrates that contact and rearms. At exact expiry the reader still
processes offline and reconnect in order. The tests also verify normal
revocation, restored UID with a newer binding, and possibly committed SDK
retries at equal and changed Control samples.

## Worker source and rollout scope

The [Nov. 14 release record](https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-6880814123)
pins the workers to tested source `eca35079432dfa2fd00380338fc3e63278d7800d`,
merge `7dd2fb708b243f0c2067f1605911c35a385ac316`, and artifact
`8b15d731233b13ab25ce6e4aa0b90d603d4a56609b0b09600f325830c8ab91ec`.
Saved post-deploy metadata confirms the worker revisions were held through
the #282 API change. Cloud code bytes were not downloaded again.

The new recheck is used only by API READs. Separately, the old workers still
use the pre-#275 Firestore adapter, which reads existing chunk heads for
unread buffered writes one at a time. The reviewed #282 package batches these
metadata reads in the same transaction. Engine, deadline payload, and
persisted authority formats are compatible. Aligning authority evaluators
requires `planetRunBots`, `planetDeadlineTask`, and `planetRepairDeadlines`
because repair can advance overdue jobs directly. `planetDispatchDeadline`
forwards the same private payload and updates a single record, so it can stay
on the existing revision. The batch does not combine per-bot intent reads.

A coordinated staging rollout should preserve creation disabled and the
existing worker configuration, routes, task queue, and permissions. The
prior private deadline update removed two pre-existing scoped grants, then
Integration restored the same grants from fresh policies. Verify those
existing permissions after a worker rollout. This PR does not deploy or
change access. A repeat live acceptance is required to measure any benefit.

## Verification

The base failed all three 7/8/9-player wait witnesses. It passed the control
with a new engine boundary due exactly at the recheck. A real Firestore
nine-seat fixture reproduced the same defect while briefing advancement was
already committed and the heartbeat owner still held its lease. The
candidate returned the authorized ACTIVE snapshot and renewed contact
before that owner released. A second real Firestore case loses the snapshot
acknowledgment after commit and retains exactly one rate charge without
admitting another read. The suite also exercised the three existing lost
heartbeat acknowledgments and concurrent passive readers.
