# Connected Food evidence, 16 November 2026

The two native browser phones ran at 390 × 844 with full motion and 430 × 932 with reduced motion. Each used a distinct desktop Chromium context, trusted touch events, and the exact production response headers. Both focused sessions used Chromium focus emulation. The lifecycle run disabled it while the Winch document actually became hidden. Firestore v1.20.2 ran on a dedicated loopback instance, and the art came from all 67 verified files in the approved `design-0.9.0` Hosting inventory.

The initial client `06f8937858c953edd62349607c807afac8d99b60` passed the invitation and timed journeys. Its shutdown left two SSE watches attached when Firestore terminated, so the lifecycle case remained unrun. The dev bridge fix stops its watches before datastore shutdown. Client `83fca1ec10e6d6dc3bd87896691f578177ade7ca` and the isolated Backend checkout `0d2969db3ad851cb489fd2e3ed5706e5d4ec9942` then completed all three cases and shut down cleanly.

| Journey | Observed |
| --- | --- |
| Ordinary service invitations | Ask, Decline, Ask and Join retained their exact PENDING, DECLINED, PENDING and JOINED receipts. Both participants saw briefing. |
| Timed owner-FIFO | Hold DOWN, Panel RELEASE, Panel LOCK, Hold UP and both KEY inputs returned accepted originals. Both phones showed Delivered. |
| Lifecycle | An original UP dispatched 71.0 ms before the corresponding DOWN receipt. A later held contact produced another accepted original UP across hide and reconnect. The Task concealed while hidden and resumed on a fresh authorized stream epoch. |

The six timed presses produced local pending DOM feedback in 4.7–5.6 ms, verified receipts in 78.7–122.7 ms, and correlated visible rendering opportunities in 88.7–132.9 ms. These are six observations at the tested loopback configuration. The measurements use one document's monotonic clock. A committed frame and receipt can arrive in either order. A matching receipt and changed rendered control are required to attribute the observed state to the command. Missing observations remain null. For example, the invitation service supplies receipts but lacks the timed coordinator's per-frame witness, and the hide-generated UP has no trusted touch timestamp.

The lifecycle run also returned two `STALE_RECOVERY` receipts for automatic recovery-close inputs. Each original UP was accepted. These automatic results remain distinct in the receipt evidence. The recorded successful journeys do not prove hosted transport, same-seat UID recovery, parent-match handoff, physical-device timing or the wider network and bot matrix. [Redacted report](report.json) · [Tracking issue #274](https://github.com/Amirkianfar66/GameN/issues/274)

## Reproduce

Use Node 22.21.1 and npm 10.9.4. Build the app and its Vite bundle as shown in the [harness runbook](../../food-connected-validation-2026-11-16.md). Build `infra/firebase` in a clean, isolated checkout of the pinned Backend. Supply the installed Java executable, the Firestore v1.20.2 emulator jar and the approved artwork artifact. The runner starts and closes its own Chromium and Firestore processes and uses an empty results directory.

```sh
node apps/game/dev/phone/food-coordinator/run-connected.mjs \
  --backend=/absolute/path/to/isolated-backend \
  --bundle=/absolute/path/to/dev-bundle \
  --artwork=/absolute/path/to/reviewed-hosting-artifact \
  --output=/absolute/path/to/new-private-output \
  --java=/absolute/path/to/bin/java \
  --firestore-jar=/absolute/path/to/cloud-firestore-emulator-v1.20.2.jar \
  invitations timed lifecycle
```

The checked-in runner uses parameterized paths. The report retains the hashes of the runners and byte inventories used for the original attempts. Keep local process logs and seat links in the private output environment.
