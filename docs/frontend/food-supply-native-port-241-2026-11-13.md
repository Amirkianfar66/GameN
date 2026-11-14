# Food test 1: approved #241 native port

> Historical gauge/text source checkpoint. The [final 336-pair native review packet](food-supply-native-final-review-2026-11-13.md) records the completed run and current approval gates.

This ports Designer source `3f4cb5e78a5e8d4f1bb17eb3487dcec26df6a594`,
including its newer food-gauge decision. Integration confirmed the owner's
approval and recorded it at `8caa059629a99908808c939e6a2cfdbf13d18ad2`.
The earlier banner proposal at `36518b65` is superseded. The exact Designer
source is merged as a dependency; no Designer file is independently rewritten.

## Implemented presentation

- The compact gauge sits under the clock on Food screens and the ordinary
  native phone/display header. It uses authorized integer doses: one line per
  package (at most ten), a short half line and a package figure. At one package
  or less it is amber; zero is red. The lines disappear at the approved large
  text width. There is no food-warning banner or visible warning sentence.
- Screen-reader labels retain `Food: 4½ packages`,
  `Food low: ½ package left` and `No food left`. Stock changes and meal arithmetic
  remain server facts. Other phones' gauge reads only the sanitized public
  projection; it never receives a private Task or an outcome/cause.
- The exact Food/art tuple alone labels the shared `FOOD_RETURNED` publication
  `After Food Supply · Round N`, with the existing current-board prefix where
  appropriate. N is the publication's Task round. Older tuples still reject
  this caption; other checkpoint labels are unchanged.
- The scoped CSS follows the approved name wrapping, two-line scrolling hint,
  wrapping toasts/banners, stacked sheet buttons and Partner-card body/footer.
  At the compact width, the Partner card starts just below the bar, omits its
  stamp and keeps its answers and answer-time line visible while its body
  scrolls. These styles affect only the Food surface.
- The exact tag-fitting calculation keeps the complete Partner name and state
  inside the view and gives way on the player's own `You` tag if the two meet.
  The existing visible drawing tick reapplies it after each drawing replacement,
  including font/viewport changes. No additional ResizeObserver, font promise
  callback or event listener is added; the existing tick is cancelled on dispose.
- The seven independent initial-review corrections remain in place, including
  focus-safe absolute dialogs, the hidden native-sheet marker, own-player-first
  title, key-only next styling, original-receipt recovery and delivered check icon.

## Scope and reproducible source records

The complete closure now records **17 render modules and 13 existing host/client
inputs** in `food-supply-render-closure.json`. `food-gauge.mjs` and `food-tags.mjs`
are the two new pure native modules. The existing Food scoped CSS adopts #241;
the seven existing ui/kit/icon/drawing foundation copies are unchanged.
All 37 SVG bytes are unchanged. The source record additionally pins
`design/food-supply/hints.mjs`, which supplies the gauge's approved count words.
This is a candidate record, not Integration's production registration.

The comparison map now has **82 states**: the initial 76, the two new flow
gauge frames, and four new large-text frames (three with twelve-character
operator names and one with half stock). Every state is scheduled for both
sizes and both motion settings, yielding 328 pairs. The three long-name
fixtures rename only the two publicly named operators to `WWWWWWWWWWWW`.
They preserve all canonical seats, characters, engine inputs and mechanics.

During Backend's exclusive timing slot, the six new packets were generated
individually and the original 76 packet bodies reused unchanged. Full canonical
regeneration and browser comparison are pending the noncompeting slot. The
capture tool now records visible gauge labels, full tag bounds, answer-button
bounds and original-receipt transitions as well as controls and briefing size.
Its phone-frame selector excludes the ordinary gauge's small token/style island.

## Verification and remaining gates

The first full comparison stopped after 33 pairs at `food-panel-16`: the
engine's public and own stock both contain 12 doses after the delivery, while
the reference Task header still passes its initial 2-dose constant. Native six
packages is retained. The capture harness now validates each side against its
own independent input: native public doses from the engine packet, and the
reference's declared stock setup/query/outcome. It records the input difference
explicitly, rather than requiring unrelated fixture counts to be equal. This
changes no native byte or gauge value. The failed run is preserved as a
historical harness diagnostic, and
[the reference question is recorded in #222](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6863654263).

Light checks completed: the presentation package builds; all seven focused Food
presentation tests pass, including exact-tuple caption gating and package/level
labels; the Node engine/receipt audit passes. Missing receipts still remain
unknown and block LOCK, and only the exact original authoritative rejection
settles it, without a replacement command. No controller, command, timer or
game-rule change is made by this port.

`winch-10` still follows the approved early-Hold offer and pending-contact
behavior. Designer is aligning its reference in
[the existing #222 exchange](https://github.com/Amirkianfar66/GameN/issues/222#issuecomment-6860167378);
no Backend rule change or new owner gameplay decision is requested. Any
reference amendment will be adopted by its exact reviewed commit.

No browser/capture/connected pass is claimed for this source checkpoint.
Backend retains the actual-time 7/8/9 slot. Full native comparisons, long-name
frames, ordinary-part regression captures, native connected tests, final CI,
Integration's source registration and Designer's explicit #240 visual verdict
remain separate gates. The earlier screenshots remain historical initial-review
evidence. No broader #227/#228/#230 change or deployment is included.
