## Problem and outcome

Explain the player/developer problem and the resulting behavior.

## Workstream and scope

- Agent role:
- Issue:
- Base commit:
- Ruleset / engine / protocol version:
- Owned paths changed:
- Shared-contract or cross-workstream changes:

## Evidence

List only checks actually run, with commands/results or linked artifacts. State what remains untested.

## Rules and information visibility

- Confirmed rule implemented or proposed change:
- Public/private visibility impact:
- Unresolved decisions and dependencies:

## Visual component ownership

For visual work, follow `docs/architecture/visual-component-ownership.md`; otherwise mark not applicable.

- Canonical visual source paths, owner and version/hash; preview and runtime consumers:
- Agreed inputs, audiences, intent events and playback/lifecycle contract:
- Direct consumption of Designer's runtime-safe component in `design/`; evidence of no Frontend rebuild, restyle or source copy:
- Frontend screen-controller owner and early native integration evidence:

## Phone interface visual gate

Required by the owner's 11 November 2026 decision and `AGENTS.md`. A green CI run does not replace Designer's visual approval of the native build.

- Phone interface changed: yes / no. If no, explain why this PR cannot change the playable phone interface:
- Affected comparison part IDs (`node design/tools/phone-ui-native-compare.mjs --list`), sheet IDs and states:
- Compared candidate commit, design commit and artwork release; link to `compare.json` and harness provenance:
- Side-by-side captures: 390 × 844 and 430 × 932 (current development scope):
- Capture origin: deployed candidate URL, or harness with exact production headers; source/art identities and actual header values/hash:
- Approved-design coverage: included deliverables and evidence; any omitted/deferred deliverable with the owner's explicit decision:
- Supplemental states/sizes not supported by the comparison tool, capture errors, and motion/reduced-motion evidence where relevant:
- Designer's explicit visual acceptance **in this PR**, with reviewed commit, parts and evidence (pending until given):
- Exceptions from the sheets: none, or link to the exact `docs/design/owner-decisions.md` record containing Designer's agreement and the owner's approval:
- Changes since visual acceptance: none, renewed Designer approval, or Integration's evidence that the approved rendered inputs are unchanged:

Do not mark the visual gate complete using a historical `same`/`close` finding, a source-art approval or self-approval by Frontend/Integration. A missing comparison state needs supplemental evidence, not an automatic pass.

## Readiness

- [ ] Scope matches the assigned issue and ownership boundaries.
- [ ] Any rule change is explicit and versioned.
- [ ] Relevant verification passed; untested areas are documented.
- [ ] No secrets or private production match data are included.
- [ ] Shared contracts and dependencies have been reviewed.
- [ ] Phone visual gate satisfied: Designer's approval and required comparisons/exceptions are linked above, or Integration has verified the stated no-interface-change reason.
