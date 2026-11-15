# Passive Food snapshot admission for #274

Review candidate based on `0a643c7eb9ca00d04ec3533c14142969346f7c66` (PR #279).
The shipped API trace contained six heartbeat envelopes. Their fifteen admission
spans show nine extra captures after a settled Control mismatch. The trace does
not identify which mismatches were due to polling. A 7/8/9-player fixture isolates
that cause by pausing a heartbeat capture while the host, display and the other
non-Task crew request snapshots.

A running Food snapshot keeps the exact Control fence, consistent authorized
state capture, committed per-UID rate charge, and the quiescent prefix and due
boundary checks. A caller with no own live Task contact writes only their
snapshot rate record. A living online participant renewing their own contact
still writes both Control watermarks and that contact. Pending entries, due
boundaries and reconnects still take ordered processing. Every heartbeat
retains the existing ingress, journal and bot/deadline publication path.

## Clock behavior for review

A passive observation no longer sets a match-wide floor for subsequent inputs.
Ordered inputs and contact renewals retain their existing match-wide time floor.
The optional `lastSnapshotAt` on the existing UID snapshot rate record rejects
backward snapshot samples for that UID across Food matches on the updated API.
Old rate records remain readable. Snapshot response arrival may still be
reordered. Older API revisions do not enforce the optional floor.

For example, with actual authority at 6,000 ms, a display can observe at 7,000 ms,
then a different server can admit a heartbeat at 6,500 ms. The display's same
later request at 6,500 ms is refused. The timestamp on a passive snapshot refers
to the committed state observed by that request. It no longer advances the
match's authority clock. Integration must accept this technical clock contract
before release.

The per-UID budget still charges once on a normal successful request. If an SDK
retry after a passive write cannot establish its original rate record and current
Control fence, the request reports an unknown outcome without a second charge
or an ordered fallback. The test includes a lost acknowledgment at the rate cap.

The authority transaction still reads Control and Contacts and can wait for
other work. This candidate removes writes and avoidable fence changes from
passive polling. The observed improvement in fixture admission attempts does not
measure hosted latency, phone responsiveness, or the share of staging retries
caused by passive reads.

## Verification

The three causal service fixtures fail at the shared-Control write on the base.
The candidate passes all three, with one admission attempt and no observer
contact, Session, ingress or deadline changes. The focused suite also checks
one UID's overlapping reads, its 60-second rate reset, current authorization
after recovery, exact due fallback, and discarded versus possibly committed SDK
retries. The real Firestore SDK loopback test observes the same unchanged
Control and single admission for concurrent host/display polling in a normal
nine-seat setup. The existing real Firestore lost-ACK cases pass at all three
player counts.
