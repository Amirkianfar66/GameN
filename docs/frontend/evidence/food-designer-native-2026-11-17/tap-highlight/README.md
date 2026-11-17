# RELEASE tap highlight in Food `food-panel-03`

The blue rectangle in both original RELEASE screenshots is Chromium’s transient tap highlight. The diagnostic touched the visible RELEASE button in desktop Chrome 157.0.8103.79 with touch emulation. It held the old read and the original RELEASE command response through the settled capture.

| Viewport | Before touch | Immediate Sending | Settled Sending | Original Sending |
| --- | --- | --- | --- | --- |
| 390 × 844 | [Before](390x844-before.png) | [Immediate](390x844-immediate.png) | [Settled](390x844-settled.png) | [Original](../390x844-panel-release-sending.png) |
| 430 × 932 | [Before](430x932-before.png) | [Immediate](430x932-immediate.png) | [Settled](430x932-settled.png) | [Original](../430x932-panel-release-sending.png) |

Both Sending captures retained the same button text, bounds, attributes, and sampled computed styles, including `aria-busy="true"`, `aria-disabled="true"`, background `rgb(32, 40, 55)`, and opacity `0.7`. The `:active` state cleared between samples and `:focus-visible` stayed false. The settled state was sampled 1.07–1.08 s after touch release. [Computed observations and screenshot hashes](observations.json)

At both sizes the settled left inset pixel was `(26, 33, 46)`. Compositing Chrome’s `rgba(51, 181, 229, 0.4)` tap color over that pixel gives `(36, 92, 119)` with simple rounding. Both original and immediate captures read `(36, 92, 120)`. All 5,376 sampled fill pixels per viewport matched the expected blend within one RGB level per channel in both original and immediate captures. [Pixel samples](pixel-samples.json)

The four rebuilt fixture files matched the original SHA-256 values. The run also verified the served preview headers, all 67 approved art files, and the two original PNG hashes. It used the runtime from `0aef655b56ed1a83701b2a8c5342534979fdaf4a`. [Original capture report](../causal-captures.json)
