# Preserved first connected attempt

Five cases passed before the harness immediately asserted `ownBallot` after settling a deliberately lost successful ballot response. The receipt had settled (the actual UI showed Ballot registered and disabled another submission), but no updated own-ballot projection had been awaited. The dropped command response also skipped the session transport's success-triggered refresh. Receipt settlement and projection publication are independent in the consumer.

This run is **failed**, not connected acceptance. Its original facts, provenance and images are unchanged. Cleanup independently confirmed a successful native abort and aborted session; Firebase CLI then stopped the owned emulators.

The development harness was corrected to request a fresh authenticated session read after original receipt recovery and wait for the actual phase/target in `ownBallot`. No native runtime byte changed. A fresh full journey is required before acceptance. The successful replacement, if any, is recorded separately in `../connected/` with its own provenance.
