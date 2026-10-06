# Product release direction

## PRODUCT-001 — in-person V1 before full remote online V2

**Confirmed by the game owner:** 6 October 2026. **Status:** confirmed delivery priority, not a gameplay-rule change. Tracked in [issue #9](https://github.com/Amirkianfar66/GameN/issues/9).

The first goal is a complete Mothership game that people can play together in person. After that, Version 2 focuses on full remote online play. Apply this priority to all four workstreams and their review plans.

## Version 1 goal and working interface

Players are together in the same physical space and talk face to face. The existing hybrid tabletop direction supplies private player phones and a physical or shared digital public board. Host/session controls support the same group. The final required hardware and display arrangement still need acceptance planning.

V1 completion means a complete base-game match from setup and private role assignment through rounds, actions, voting, resolution, Code, applicable showdown and the final result. Preserve the confirmed 7/8/9 configurations and applicable role behavior. Base-game acceptance uses optional powers off; Original Powers remain optional, and their inclusion in the initial release needs a separately scoped decision.

Private phone views, secure shared state, trusted deadlines, retry-safe commands and seat recovery remain useful for people playing in person. Firebase remains the selected backend direction. This owner decision does not establish offline operation; required connectivity and outage behavior remain operating-policy decisions.

The existing comic art and motion direction remains part of V1. Frontend evaluates the R3F/Three.js board with readable DOM controls and fallback, using actual device evidence before claiming renderer acceptance.

## Milestones and evidence

| Milestone | Deliverable | Completion evidence |
| --- | --- | --- |
| Reviewed foundation | Bootstrap #1 and shared contracts | Merged PR #7 and recorded `BASE_SHA`; affected-role contract adoption review still applies |
| First V1 integration checkpoint | Issues #2–#5: Officer/Protection fixture, two controlled player phones, public display and initial comic treatment | Executed engine/emulator checks, authorized views, one real interaction, timer/retry/reconnect evidence and measured presentation checks |
| Complete V1 base game | Setup-to-result flow across the confirmed configurations and required phases/roles | Agreed rule scenarios pass and complete in-person matches run without developer-console intervention or scripted gameplay prerequisites |
| V1 release readiness | Accepted phones/display, privacy, failure recovery, readable presentation and in-person playtest protocol | Actual device/browser and access/recovery checks, owner decisions resolved for shipped behavior, observed human sessions and separately reported limits |

Completing the Officer/Protection checkpoint does not complete V1. Seven scripted seats and a predetermined vote are development-harness inputs. The four first-slice issues retain their current scope; subsequent full-game deliverables need their own focused issues and PRs.

The complete-base-game milestone follows [production architecture stage 2](architecture/production-v1.0.md#14-implementation-sequence). Human conversation remains part of the game: spoken Hack truthfulness cannot be automatically proved by the app. Automated rule correctness and human social-deduction balance require different evidence.

## Version 2 boundary

V2 enables a complete match between players in different physical locations. Remote communication and the experience needed to replace face-to-face play belong to that later product definition. This decision does not select a voice/video/chat implementation or promise a detailed V2 feature list.

Build reusable rules, contracts and audience boundaries in V1. Do not make V1 completion depend on remote communication or other features required only for geographically separate play.

## Ownership and open decisions

| Workstream | Immediate V1 focus |
| --- | --- |
| Codex Backend/Integration | Authoritative rules, private/public views, session integrity, deadlines and recovery; integrate reviewed shared changes |
| Claude Frontend | In-person player/host/public-display flows, readable private information, tap/keyboard controls and reliable reconnection |
| Claude Visual/Motion Designer | Readable phone/table assets, neutral public tokens, comic interaction states and normal/reduced-motion handoff |
| Claude Game Design/Balance | Source-linked scenarios and in-person human playtests, with 7/8/9 evidence kept separate |

The open gameplay and disclosure choices in [integration-baseline.md](integration-baseline.md#decisions-and-adoption-gates) and [decisions.md](decisions.md) remain unresolved. In-person priority does not approve location rechecks, competing-effect order, private-result recipients, exits, Captain/Cracker routing, Code checkpoint, vote/showdown timing, disconnect/pause policy or optional-power interactions. Isolate affected work and obtain owner decisions before shipping it.

The reviewed implementation baseline remains `333c9e820f362a211352bc689372663f29b73ac4`; the source-manifest hash remains `34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc`. This record changes delivery priority only. Canon, contracts, preserved Canvas source and source-integrity locks remain unchanged.
