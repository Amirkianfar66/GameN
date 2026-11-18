# Food snapshot fence refresh for #274

Base `020a84dbdddb54a9fb242316ab8319d263de15f5`. PR #275 merged as `afd54cf409e2025d7de6bb5023ba2985a700bd9b` with the same tree. Food retains the same saved protocol 3 and engine 1.4 tuple.

The first staging diagnostic sample on `planetapi-00009-nep` contained 141 successful READ envelopes at 20:48–20:52 CET on 15 November. Service time was 146 ms median, 4,071 ms p95 and 16,649 ms maximum. Fourteen reads entered ordered admission. That subset's admission median was 2,142.586 ms and maximum 15,273.723 ms. Its drain lease-wait median was 997.079 ms and maximum 2,901.429 ms, including lease probes and claims. There were 49 SDK completion failure spans among the 14 reads and three observed SDK retry gaps in the sample. These counts do not identify the failing SDK operation or why a read took the ordered route. The sample contained no Food command timings.

The longest admission spent at least 6,755.076 ms outside recorded read-only and read-write SDK transaction intervals. This lower bound uses the cohort maxima for both kinds of SDK time and does not attribute the remainder to a particular worker. The existing ordered path takes a Session writer lease, admits the read, and waits for ordered processing. Its outbox can trigger independent deadline or bot work on the same match. The HTTP request does not await Cloud Tasks enqueue.

A second window at 20:53–20:58 CET contained 184 successful READ envelopes and no Food command timings. Service time was 156 ms median, 5,128 ms p95 and 12,080 ms maximum. Thirty-one reads entered ordered admission, with 2,201.404 ms median and 8,653.355 ms p95. Their drain lease-wait median was 1,051.277 ms and maximum was 4,915.538 ms. The two windows establish a repeated slow path in reads. Neither identifies how often a benign fence change caused it.

## Narrow correction

Two eligible snapshots of one quiescent match can overlap. The first captures Session and Control. The second can advance only the two Control time watermarks. The first then loses its exact fence and the old code unnecessarily enters ordered admission, even though there is no pending entry or boundary to process.

The candidate recognizes only a settled fence mismatch explained by monotonic advancement of the two watermarks to the same timestamp, with no prior callback entering the write path. It makes one fresh, authorized Session and Control capture and tries the original exact fence again. The successful attempt samples current server time and applies the existing rate and own-contact rules once in the reproduced clean race. A second mismatch, pending or uninitialized Control, or an authority boundary uses the existing ordered path. Storage or acknowledgment errors retain their existing handling. An SDK retry after a potentially committed write does not enable the new refresh.

The optional trace adds `readFenceRefresh` and `sessionWriterWait`. The first counts fresh captures due to the benign mismatch. The second measures probing, waiting and claiming the zero-target writer lease. It ends before work under that lease starts. It overlaps the existing admission and SDK metrics.

## Verification boundary

Controlled 7/8/9-player service reproductions fail on the original candidate because an extra ingress entry is committed. The candidate checks the unchanged Session, one rate charge, no extra ingress or wakes, and correct current contact renewal. Separate controls exercise two benign races, presence due exactly at recapture, and a potentially committed write before an SDK retry. Existing tests cover revoked identity and original pending input ordering.

On Node 22.21.1 and npm 10.9.4, the Backend/Firebase TypeScript build passed, followed by 92 focused Food/timing tests and 669 service/Firebase unit tests, with zero failures or skips. The three baseline reproductions failed at the extra-ingress assertion.

The service reproduction does not establish how many live reads took this route. The fix applies to initialized running Food snapshots. It does not establish the cause of a slow Boarding transition, a missed invite or slow Food button completion. Exact staging before/after service traces and real input outcomes are still needed.
