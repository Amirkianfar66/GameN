# Retain early gameplay deadline delivery

This focused continuation starts at the clean Backend release commit `7a8c8218b53db944c74131b8a03b90d7af944974`. Existing release configuration, historical tuples and prior work remain intact.

## Failure and correction

Root's explicit 1.5 Functions run accepted and recovered REQUEST_HACK, but the ordinary deadline never opened HACK_DECLARE. The Tasks emulator delivered the queued task immediately despite its future schedule time. The service returned the same successful `unchanged` result for both an early current timer and a stale timer; the worker acknowledged that early task, dropping future delivery. Scheduled repair was unavailable in that emulator run. A queue acknowledgment alone is not proof that the timer has run.

The trusted deadline evaluation now distinguishes an exact current phase/token whose end time is still in the future, inside the authoritative Firestore transaction. Its private result is `{ status: 'too-early', retryAfterMs }`. The task handler validates that result and throws the fixed retry error `Deadline has not elapsed`, retaining the same task identity without invoking bots. A due timer still commits through the original engine and journal path. Stale phases/tokens, terminal matches and missing engines retain their unchanged acknowledgment and bounded bot continuation.

Public `v1Advance` retains its existing strict response and predeadline `unchanged` behavior. TypeScript overloads keep the private retry result out of its exported response type. The worker also validates normal responses against the existing FullAdvanceResponse schema and the requested match/phase, and throws a sanitized retry error for failures or malformed responses. No payload, role, token or storage diagnostics are included in those errors.

Dispatched repair short-circuits the same early result before bots if the clock moves backward between candidate selection and transaction evaluation. Its durable intent remains dispatched with a later repair attempt; it cannot be retired as completed.

The first local Functions rerun reached HACK_DECLARE automatically, then exposed a separate acceptance-helper mistake: four private-feedback calls passed the entire view instead of its phase. Those arguments are corrected. All timing, privacy, receipt, journal and outbox assertions remain. No Pass, manual advance, task dispatch, worker call, Admin state write or injected clock supplies progression in this real-time acceptance.

## Version and validation boundaries

This changes delivery acknowledgment, not deterministic gameplay. No ruleset, engine behavior tuple, public wire schema, stored match, receipt, journal or asset pin is upgraded. Queue retry options, deployment configuration, IAM and cloud resources are unchanged.

The new adapter suite was independently run against the exact committed worker compiled in memory: 4 passed and 29 failed at `7a8c821`, then 33/33 passed with the correction. It covers early-to-due retries, stale acknowledgment, skipped early bot work, registered Functions delegation, strict response validation and sanitized failures. Actual Auth/Firestore cases cover each 7/8/9-player roster through ordinary, declaration, private result and talk windows, public early advance, wrong tokens, duplicate due delivery and complete journal replay. A separate repair case covers clock correction between eligibility and evaluation.

The complete data run additionally identified four cases whose fixtures still parsed an early trusted-task result as a public advance response: the concurrent PASS race and three native bot declarations. Their early assertions now check the exact private retry result; the PASS race also verifies the subsequent stale acknowledgment. Existing acceptance, duration, receipt and replay assertions remain. No additional runtime change was required.

Final local results, exact follow-up SHA and the automatic Functions acceptance result are recorded with the PR checkpoint. Combined Frontend/browser acceptance, CI and deployed configuration/readback remain separate release evidence. No deployment, merge or IAM change is performed here.
