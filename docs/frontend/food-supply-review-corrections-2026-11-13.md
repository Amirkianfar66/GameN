# Food test 1: initial native review corrections

Designer reviewed the unchanged rendered inputs of combined PR #240 at
`e132341eaf0c3d277a0d3dded10b526f0c5592bb` in
[the initial visual verdict](https://github.com/Amirkianfar66/GameN/pull/240#issuecomment-6859626835).
This checkpoint starts from Frontend `45415db6d97ae6a34e2047c902da0a78c7e29cbd`.
It implements existing-sheet corrections; it is not a refreshed visual verdict.

## Native correction list

| Review item | Source correction / evidence | Remaining check |
| --- | --- | --- |
| 1. Empty Close-only sheet | The existing board skin forces `ms-private[data-open=true]` to `display:flex!important`, including a hidden native sheet. For the Food consumer, the ordinary renderer now keeps `data-open` equal to actual visibility. Older tuple behavior is unchanged. | Recapture room/return/stock states. |
| 2. Sheets mount at the top | The ordinary shell's `:focus-visible` rule changes focused elements to `position:relative`. Programmatically focused Food sheets now keep the pack's absolute bottom placement and sheet depth. No new detent or docked layout is introduced. | Recapture the named sheets. |
| 3. Briefing/end cards and focus | The same focus rule moved cards out of their absolute placement. Food cards now retain absolute placement without an amber dialog outline. Keyboard control focus keeps its ring. Card offsets use the current `--top` value: briefing +16px, end +24px, including safe-area/text changes after mounting. | Recapture both sizes/motion modes. |
| 4. Pair title | The pair is `[own player, Partner]`, including Panel phones. | Recapture Panel states. |
| 5. `winch-10` | **Source/contract conflict; not silently disabled.** See the exact mechanical/offer audit below. | Designer/owner resolution. |
| 6. `panel-14` | A landed crate makes only the offered key the next action. RELEASE remains offered/usable, with its ordinary style. | Recapture `panel-14`. |
| 7. `states-06` | A constructed original stale-revision LOCK is processed and rejected by the actual candidate engine. The native recovery fixture first returns no receipt (unknown, controls closed), then publishes that exact original receipt. It never resends the LOCK or invents a rejected result. | Browser recapture of the resolved state. |
| 8. `flow-10` | A participant's delivered return toast uses the check icon. Public stock updates retain the supply icon. Lost/cancelled participant return toasts use the reference's info icon. | Recapture return states. |

## `winch-10`: matching fixture, conflicting control availability

At `s=task&board=mistakes&t=8425&as=winch`, both the native engine
projection and Designer's simulator show a settled replacement crate in the
intake, with the panel locked at zero-based stop 5 (displayed stop 6).

The native projection offers `TASK_PRESS.inputs: ["HOLD"]`. Its `canHold`
remains enabled. The reference's `view()` enables Hold only for current
custody, immediate lift at the intake, or brake take-back, so its button is
disabled in that same mechanical state.

The approved design text, `docs/design/food-supply.md`, under **Hold and let go**,
says: “A finger already on Hold when the hook reaches the crate lifts it then:
the phone sends the hold as soon as Hold works.” The accepted engine admits
pending early contacts and binds them when eligible; its tests cover an early
contact acquiring a replacement crate. Disabling the genuinely offered Hold
would remove that approved behavior. No new client eligibility rule is added.
Designer must reconcile the disabled reference drawing with the approved early
contact and authoritative offer before item 5 can close.

The exact Node-only facts and receipt transition are in
[input-audit.json](evidence/food-supply-corrections-2026-11-13/input-audit.json).
Reproduce with Node22.21.1:

```
node apps/game/dev/phone/food-correction-audit.mjs
```

## Approval and evidence boundaries

Designer source PR #241 at `36518b65145580af464754d19d28994fed2ced37` has
been read. Its stock words, return caption and small-phone departures are
**not adopted at this checkpoint**: the owner approval and Integration's source
adoption are pending. The 37 SVGs and their hashes are unchanged.

The focused Node correction audit passes, including missing-receipt unknown,
the original engine-produced `STALE_CONTEXT` rejection, zero recovery commands,
and both Panel actions retaining their server offers. The deterministic three
component/style copies still match the old approved inputs. The 76 typed
fixtures have been regenerated for the new resolved recovery setup.

No browser batch or connected journey has run for these corrections. Backend
holds the exclusive actual-time test slot; full captures, long-name frames and
native 7/8/9 connected tests await its explicit handoff. Earlier screenshots
remain historical evidence of the initial reviewed build. Designer will review
the refreshed full packet after the approved correction source is ported.
Nothing here is visual acceptance, activation or deployment.
