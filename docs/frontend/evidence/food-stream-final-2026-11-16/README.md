# Food delivery evidence at 68000faa

The three timed attempts used the clean combined candidate `68000faa1fa6f508d2a6cfe766f88eff9cf4ab3d`. It includes the four-timestamp display clock, the server read reduction and the recovery fix. Desktop Chrome 157 used trusted touch at 390 × 844 and 430 × 932 against the production HTTP handler and private inbox on disposable Firestore. The loopback path added 40–60 ms in each direction for a nominal 100 ms round trip and ±20 ms combined jitter. Each attempt used the existing visible LOCK cue. [Timing data](timing.json) · [Earlier timing and stop-7 miss](../food-stream-2026-11-16/README.md)

| Attempt | Cue stop | Cue time, ms | Pointer stop | Pointer time, ms | RELEASE to LOCK admission, ms | Applied stop | Outcome |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 6 | 6352.2 | 6 | 6374.5 | 1201 | 6 | Delivered |
| 2 | 6 | 6349.5 | 6 | 6371.7 | 1186 | 6 | Delivered |
| 3 | 6 | 6319.4 | 6 | 6330.5 | 1215 | 6 | Delivered |

Both phones showed Delivered and returned to `PRE_TURN` in all three attempts. Each of the 18 trusted inputs received an exact accepted receipt on its originating seat. Cue and pointer times use the same document monotonic clock. The admission offset uses the two original server receipt timestamps.

| Measurement from trusted input | Samples | Maximum, ms |
| --- | ---: | ---: |
| Pending DOM | 18 | 5.6 |
| Matching authorized frame | 18 | 326.9 |
| Changed DOM | 18 | 331.9 |
| Visible rendering opportunity | 18 | 359.7 |
| Verified original receipt | 18 | 364.9 |

The visible rendering measurement records a matching DOM change sustained across two animation callbacks. The exact receipt is measured independently. Each role and input has three samples. Six rendering observations exceeded 300 ms, leaving the proposed per-input percentile and hosted timing open. The match reports retain each input, outcome and measured duration.

## Visual evidence

The eight causal fixture captures ran from the same clean candidate with the production response headers. Their report records the fixture URL, approved 67-file artwork inventory, exact headers and capture digests. The fixture reported six expected blocked Zod eval compatibility probes and passed its CSP check. The connected runner also checked the production headers on the document response. [Capture report](report.json)

The connected open-socket fault withheld three authorized watch writes for 4501 ms. Five Panel heartbeats succeeded during the interruption. RELEASE was disabled 3006 ms after the last watch traffic and the client started a same-scope reconnect while the socket remained silent. The two supplemental captures show that state. [Silent-watch report](silent-watch.json)

The side-by-side covers the same five Food parts at both phone presets. It uses the pinned canonical Food references, the four parts previously accepted in PR #276 and the earlier connected reconnecting state. The manifest lists the reference page and query and records each capture hash. [Side-by-side index](compare.md) · [Comparison manifest](compare.json)

## Reproduce

Use Node 22.21.1 and npm 10.9.4 with the clean candidate and its compiled local service. Use an empty directory per attempt and the approved Hosting artifact. The connected runner starts disposable loopback Firestore and Chromium. Run `timed` serially in three fresh output directories. For the two connected reconnecting screenshots, use the `silence` case with `--expect-silence-cutoff` in its own directory. [Connected runner](../../../../apps/game/dev/phone/food-coordinator/run-connected.mjs)

```sh
npm ci
npm run build
node_modules/.bin/vite build \
  --config apps/game/dev/phone/food-coordinator/vite.config.mjs \
  --outDir /absolute/path/to/connected-bundle
node apps/game/dev/phone/food-coordinator/run-connected.mjs \
  --production=68000faa1fa6f508d2a6cfe766f88eff9cf4ab3d \
  --rtt100 \
  --backend=/absolute/path/to/clean-candidate \
  --bundle=/absolute/path/to/connected-bundle \
  --artwork=/absolute/path/to/approved-hosting-artifact \
  --java=/absolute/path/to/bin/java \
  --firestore-jar=/absolute/path/to/cloud-firestore-emulator-v1.20.2.jar \
  --output=/absolute/path/to/new-result-directory \
  timed
node apps/game/dev/phone/food-causal-capture.mjs \
  --baseline-hosted-output=/absolute/path/to/approved-hosting-artifact \
  --output=/absolute/path/to/new-visual-directory
```
