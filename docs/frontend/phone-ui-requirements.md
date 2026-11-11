# Phone candidate requirements and evidence

Issue #208, stacked on Backend #210 (`19564d0c618dae9995bbd92979d248e82dba0a8f`). Native source candidate: `838558bdc8d9eb3793d268375583260d8e4c4433`. The original 62-case synthetic run belongs to `0af438bc5a2ef2b05ec84e49c2c35f09225adf48`; affected follow-up runs use the final source. Every run has its own module/art provenance and verifies the loaded input hashes before and after. These are native consumer captures with explicit synthetic or real-emulator authority, never Designer prototype screenshots.

The owner/reference direction is Designer #207 at `d52a8ae94f7639dd853f04b4e897b9b77aecff42`. No source or asset from #207 or the redrawn rooms #197 is imported. Final visual review and Integration source adoption remain open.

| Requirement | Native behavior | Evidence and limits |
| --- | --- | --- |
| Clean entry and lobby | Host/Join/Recover, admission-gated roster, room-code copy with feedback; recovery code hidden until Reveal | `synthetic/` entry cases; real connected admission, character selection and recovery |
| Character grid | Nine stable call-sign cells, taken/yours state; whole grid at normal text | Entry cases at all three sizes and both motion settings; decoded portraits in real connected capture |
| Role stage | Saved flow 3: card before 20 s, existing role film sought within 20–30 s, manual Ready after 30 s; independent full ten-second boarding | `reading-privacy-follow-up/` six timed flows; real server deadlines in `connected/`; no animation/Skip Ready or advance |
| Deliberate privacy | Explicit Conceal remains until explicit Reveal or a different reading identity, across failed reads, foreground and same-context reload | Six explicit-privacy follow-ups; real connected foreground check; two focused session regressions |
| Room first and view switch | The player's current room opens first; Board/Room sends no movement | Original 36-case viewport/roster/text matrix; command-count assertion |
| Top bar | Authorized active portrait/name, phase when no active player, timer, Promises and Settings | Original normal/200% captures; no stale portrait in darkness |
| Actions icons | Offered tiles have native semantic icons. The same action icon remains through selected, confirmation, sending and registered UI | `controls-follow-up/`: Actions, Scan selected, confirm and registered captures at every size/motion; server offers still determine availability |
| Panels icons | Windows, Navigation, Hospital panel, Players and Round order have distinct icons, visible labels and accessible names | `controls-follow-up/` Panels captures and five-row/path assertions; the body scrolls when needed |
| Board-first targets | Offers open the relevant room or board. Cancel stays in the centre control; ordinary targets scroll above the prompt, with an optional text list | Follow-up directly checks all four Hospital target centres at 200% text, with one capture per target; includes cross-room Scan |
| Vote and result grid | Authoritative Vote/Voted replaces Pass, stable seat n in cell n, empty eighth/ninth cells, permitted totals only | Original 7/8/9 matrix includes actual UI ballot command, long names, scrollable body and reachable footer |
| Glass and text | Owner's glass treatment with bounded body backing; solid reduced-transparency/no-filter fallback; enlarged text scrolls | Original measured worst-white contrast cases and normal/200% matrix. This is not a WCAG conformance claim |
| Blackout geometry and privacy | All fixed places determine framing. Lit/dark and reconnect use geometry-only cached Room/Board coordinates. Darkness removes people, names, private panels and accessibility roster content | Original matrix plus follow-up geometry checks; every offered dark slot centre stays directly reachable without an overlay |
| Final Code during darkness | An offered living injured/jailed Hacker keeps the original-number keypad, without names, portraits or positions | Six P18 cases in `synthetic/`; offer-driven eligibility remains Backend-owned |
| Retained artwork | Exact 1.1 and 1.2 dispatcher, existing approved asset releases, private Clone and pair capsule retained | Original 62-case run, follow-up loaded-art checks, focused dispatcher regression and corrected real connected assertions. Original blank-crew evidence is preserved as failed visual evidence |
| Registration and recovery | Action-specific pending/current-state words; projections alone publish effects; uncertain command identity retained | Controller/session/presentation tests, Scan follow-up registered state and connected seat recovery |
| Saved versions | Absent/2 setup behavior and exact older tuples retained; mixed/unknown tuples rejected | Frontend tests. The historical recovery-suppression omission #205 is not claimed fixed for absent/2 |
| Blackout before voting | Separate exact 1.3 contract accepted for Backend implementation; this candidate deliberately remains on reviewed 1.1/1.2 semantics | Owner decision `8685e5fb…`; contract `44d008df…`. Runtime/consumer adoption belongs in a separate follow-up |
| Ambient motion and new rooms | Not adopted in this native candidate | Requires separate artwork/source adoption and review; no prototype modules copied |
| Device acceptance | Desktop Chromium emulation only | Physical iPhone/Android startup/frame/input/memory, iOS Safari and VoiceOver remain unrun; see device-access record |

Evidence paths above are relative to [the evidence folder](evidence/phone-ui-2026-11-10/). [Verification](phone-ui-verification.json) records actual counts, commands, source identity and the expected source-guard refusal. This candidate does not authorize a merge, deployment, cloud/default change or production source approval.
