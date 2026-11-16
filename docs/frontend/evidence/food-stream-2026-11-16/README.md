# Food delivery review

The production service, authenticated HTTP handler and private inbox worker ran against disposable loopback Firestore. Desktop Chrome 157 used trusted touch at 390 × 844 and 430 × 932, the production response headers and 67 hash-verified files from the approved Food art inventory. The trial supplied local test credentials to those handlers and recorded desktop focus emulation. The runtime candidate was `491e2819ada55c303b4c25b74c4ac3a408dda16a`. The connected harness used `a53d887406a90bf63a99ba3300f60a8f237394d8` with byte-identical production client, renderer, presentation and contract sources. [Connected measurements](connected.json)

## Three timed attempts

Each attempt injected 40–60 ms before the POST handler and 40–60 ms before each JSON reply. The nominal network round trip was 100 ms with a combined jitter bound of ±20 ms. SSE bytes kept their order and received the same one-way outbound delay. The touch driver waited for the actual `data-next` LOCK at the visible stop. It read the reticle and pointer cue from the rendered interface. Pointer and cue times use the same document monotonic clock. Admission offsets use the two original server receipt times.

| Attempt | Stop and cue at touch | Cue time, ms | Pointer time, ms | RELEASE to LOCK admission, ms | Applied stop | Outcome |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| 1 | 6, next | 6286.0 | 6308.0 | 1201 | 6 | Delivered on both phones |
| 2 | 6, next | 6318.8 | 6340.3 | 1227 | 6 | Delivered on both phones |
| 3 | 6, next | 6284.5 | 6311.9 | 1359 | 7 | Task lost |

All three matches recorded the saved `food-owner-inbox-1` profile, one scoped ownership epoch and the authorized return to `PRE_TURN`. In attempt 3 the Winch remained visible and alive. The Panel displayed “Locked at 7,” and the Winch never received the platform let-go cue. Winch UP and both keys were absent from that attempt's input sequence. The stop-7 miss blocks playability acceptance at this network setting. [Stop 7 on the Panel](430x932-stop-7-attempt-3.png)

| Attempt | Side | Input | Pending DOM, ms | Authorized frame, ms | Visible rendering opportunity, ms | Exact receipt, ms |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 1 | Winch | DOWN | 5 | 271 | 293 | 289 |
| 1 | Panel | RELEASE | 5 | 255 | 272 | 273 |
| 1 | Panel | LOCK | 5 | 295 | 321 | 315 |
| 1 | Winch | UP | 5 | 240 | 277 | 233 |
| 1 | Winch | KEY | 4 | 229 | 262 | 239 |
| 1 | Panel | KEY | 6 | 234 | 262 | 253 |
| 2 | Winch | DOWN | 5 | 327 | 354 | 340 |
| 2 | Panel | RELEASE | 5 | 273 | 305 | 322 |
| 2 | Panel | LOCK | 6 | 322 | 340 | 361 |
| 2 | Winch | UP | 5 | 222 | 247 | 239 |
| 2 | Winch | KEY | 4 | 217 | 232 | 245 |
| 2 | Panel | KEY | 5 | 229 | 261 | 250 |
| 3 | Winch | DOWN | 5 | 278 | 306 | 295 |
| 3 | Panel | RELEASE | 5 | 259 | 289 | 273 |
| 3 | Panel | LOCK | 6 | 471 | 499 | 494 |

Durations start at the trusted input. A visible rendering opportunity is a changed native DOM state sustained across two animation callbacks. Production SSE carries an audience view with no command witness. The harness pairs a uniquely matching observed state change with the independently verified original receipt. The recorded maximum was 494 ms for a receipt and 499 ms for a rendering opportunity. This sample supports individual measurements. Hosted latency, physical devices and wider network coverage remain pending.

## Invitations, lifecycle and delivery silence

- The combined run recorded PENDING, DECLINED, PENDING and JOINED for the four original invitations, then showed briefing on both phones.
- Native hide concealed the Winch view, then the same seat received a new watch epoch. The first original UP was dispatched 244.6 ms before DOWN acknowledgement. Both original UP receipts were accepted.
- The open-socket fault withheld three authorized watch writes for 4502 ms. Five independent Panel heartbeats still succeeded. RELEASE disabled 3010 ms after the last watch traffic, and the client tried the same scope while the connection was still silent. Fresh authorized delivery restored the seat after the fault cleared. The separate screenshot run measured 3009 ms.
- The Watch emits the exact `: food-alive` comment on its fixed cadence with recent authorization. The harness forwards this callback to the same client parser. Comments maintain delivery health. Only a verified fresh view and a paired clock can reopen controls. No renewal READ was dispatched between offering the active watch and accepting its planned closure.

The unshaped `d4967a1a` trial admitted LOCK 1251 ms after RELEASE and showed the Winch eliminated. Its separate 4501 ms watch fault left RELEASE enabled while five heartbeats succeeded. The checkpointed `262d99a9` baseline at the same 100 ms nominal round trip delivered with LOCK at stop 6 and reproduced the stale enabled control during silence. The first attempt at that baseline produced Delivered captures before a terminated Firestore client interrupted teardown and prevented the aggregate report. Those captures remain diagnostic. The checkpointed repeat supplies the baseline measurements. [Earlier elimination](390x844-d496-eliminated.png) · [Delivered](390x844-delivered-attempt-1.png)

## Designer comparison

The exact eight comparison captures were made from clean candidate `491e2819` using the production-header causal appearance harness and controlled fixtures. The approved art inventory and screenshot hashes are in the unmodified report. The two connected `food-panel-18` captures show the actual watchdog transition. [Visual capture report](report.json)

| Part | State | 390 × 844 | 430 × 932 |
| --- | --- | --- | --- |
| `food-panel-03` | RELEASE sending | [Capture](390x844-panel-release-sending.png) | [Capture](430x932-panel-release-sending.png) |
| `food-panel-04` | LOCK from a newly authorized view | [Capture](390x844-panel-lock-from-new-read.png) | [Capture](430x932-panel-lock-from-new-read.png) |
| `food-winch-03` | Original release uncertain during contact recovery | [Capture](390x844-winch-recovered-release-sending.png) | [Capture](430x932-winch-recovered-release-sending.png) |
| `food-winch-12` | Turn key after verified contact closure | [Capture](390x844-winch-key-after-closure.png) | [Capture](430x932-winch-key-after-closure.png) |
| `food-panel-18` | Native reconnecting state, RELEASE disabled | [Supplement](food-panel-18-watch-silence-390x844.png) | [Supplement](food-panel-18-watch-silence-430x932.png) |

The production-header visual suite passed. The combined candidate passed 855 frontend tests, both typechecks, the production exclusion scan and the workspace build. Designer approval and Integration source admission remain pending.

## Reproduce

Build the candidate and its Backend dependencies with Node 22.21.1 and npm 10.9.4. Use a separate, clean Backend checkout, an empty output directory and the approved Hosting artifact. The runner starts its own Firestore emulator and Chromium and reports transport, receipt and DOM timings. Use the `timed` case with `--rtt100` for the two repeats in fresh result directories. [Connected runner](../../../../apps/game/dev/phone/food-coordinator/run-connected.mjs)

```sh
node_modules/.bin/tsc --build apps/game
node_modules/.bin/vite build \
  --config apps/game/dev/phone/food-coordinator/vite.config.mjs \
  --outDir /absolute/path/to/connected-bundle
node apps/game/dev/phone/food-coordinator/run-connected.mjs \
  --production=491e2819ada55c303b4c25b74c4ac3a408dda16a \
  --rtt100 --expect-silence-cutoff \
  --backend=/absolute/path/to/clean-backend \
  --bundle=/absolute/path/to/connected-bundle \
  --artwork=/absolute/path/to/approved-hosting-artifact \
  --java=/absolute/path/to/bin/java \
  --firestore-jar=/absolute/path/to/cloud-firestore-emulator-v1.20.2.jar \
  --output=/absolute/path/to/new-result-directory \
  invitations timed lifecycle silence
```

Run the exact visual comparison from the clean combined candidate.

```sh
node apps/game/dev/phone/food-causal-capture.mjs \
  --baseline-hosted-output=/absolute/path/to/approved-hosting-artifact \
  --output=/absolute/path/to/new-visual-directory
```
