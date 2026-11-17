# Corrected Food component in the native app

Clean local review assembly `0aef655b56ed1a83701b2a8c5342534979fdaf4a` combines Frontend adapter `60f7e1b0` on PR #290 with Designer’s corrected PR #303 at `714edac9`. The review builds selected the canonical composition with `MOTHERSHIP_FOOD_COMPONENT=designer`. Both recorded the adapter and 17 Designer runtime files, with 19 Food modules total and zero frozen Food modules. The connected manifest identifies the written CSS and the causal report matches its composition CSS hash against the files served. [Composition](connected-composition.json) · [Causal report](causal-captures.json)

## Five parts at both phone sizes

| Part | State |
| --- | --- |
| `food-panel-03` | RELEASE is sending while the older READ remains pending |
| `food-panel-04` | A new authorized view enables LOCK |
| `food-winch-03` | The original let-go is unknown while its separate contact closure is in flight |
| `food-winch-12` | The authorized landed view enables KEY after closure |
| `food-panel-18` | The native Panel displays Reconnecting and disables RELEASE during watch silence |

The eight causal fixture PNGs and two connected PNGs were captured at 390 × 844 and 430 × 932 under the production response headers. The capture report verifies the approved 67-file artwork inventory and records six expected blocked Zod eval probes. The connected runner also checked the document headers. The comparison pairs these files with the corrected Designer preview at both viewports. [Side-by-side comparison](compare.md) · [SHA-256 and dimensions](compare.json)

## Connected lifecycle

- The first causal Hold UP was sent before DOWN acknowledgement. Both original DOWN and both original UP receipts were accepted. A held contact released when its tab went into the background. The Task DOM was absent while hidden, and the same seat received a fresh watch epoch on resume.
- The Panel’s open watch withheld three authorized writes for 4,502 ms. Five independent heartbeats succeeded. RELEASE disabled 3,002 ms after the last delivery and the same scoped watch retried once during the interruption. The same seat resumed a fresh view when delivery recovered.
- Both cases ran desktop Chromium against disposable loopback Firestore using the production HTTP handler, at nominal 100 ms round trip with 10 ms one-way jitter. A first startup attempt stopped before Firestore opened because the Java installation lacked `lib/jvm.cfg`. The successful run used the existing complete Java 21 runtime. [Redacted connected report](connected-lifecycle.json)

The workspace build, two adapter checks and eleven Designer component checks passed on `0aef655b`, including the status-only concealment regression. These checks cover desktop Chromium and isolated review artifacts. Exact Hosting source admission, Designer’s integrated visual acceptance and deployed evidence are pending.

The [16 November](../food-stream-final-2026-11-16/README.md) timing evidence retains its original source, renderer and outcomes. The provisional `5623c0a0` Winch smoke retains its original dirty-source report. In that report the final served CSS identity is in `fixtureFiles`, because the initial composition manifest was written before the bundler finalized CSS.

## Reproduce

Use Node 22.21.1 and npm 10.9.4 from the clean assembly with the approved Hosting art and the local Firestore emulator:

```sh
npm ci
npm run build
node --test apps/game/test/food-component-view.test.mjs packages/design-tokens/test/food-component.test.mjs

export MOTHERSHIP_FOOD_COMPONENT=designer
food_review_output="$(mktemp -d)"
node_modules/.bin/vite build \
  --config apps/game/dev/phone/food-coordinator/vite.config.mjs \
  --outDir "$food_review_output/bundle"
node apps/game/dev/phone/food-coordinator/run-connected.mjs \
  --production="$(git rev-parse HEAD)" --rtt100 --expect-silence-cutoff \
  --backend="$PWD" --bundle="$food_review_output/bundle" \
  --artwork="$FOOD_REVIEW_HOSTING_ARTIFACT" \
  --java="$FOOD_REVIEW_JAVA" --firestore-jar="$FOOD_REVIEW_FIRESTORE_JAR" \
  --output="$food_review_output/connected" lifecycle silence
node apps/game/dev/phone/food-causal-capture.mjs \
  --baseline-hosted-output="$FOOD_REVIEW_HOSTING_ARTIFACT" \
  --output="$food_review_output/causal"
```
