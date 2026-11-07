# Rules contracts and authoritative resolution

This is the completed conceptual contract for the [game design](game-design.md). It allocates no executable schema, protocol, ruleset, engine or asset version. The [decision register](decision-register.md) records authority for the remaining recommendations and integration defaults.

## Command and state authority

Validate authenticated identity, seat, match/version pins, phase, authoritative eligibility and resources. Clients submit intent, never an effect, audience or clock result. Accepted commands have stable IDs and recoverable receipts. Recover an existing receipt before treating a retry as a new command; conflicting reuse of an ID cannot overwrite its meaning. Unknown outcomes reconcile with the same ID.

New invalid commands do not mutate state or spend resources. Accepted actions consume/reserve resources at the specified checkpoint; an accepted no-effect outcome does not refund them unless explicitly stated. One transaction/journal order serializes immediate commands. End-round competing effects use stored round turn order, not network arrival.

Preserve exact historical creation, deal, replay, receipt and asset pins. Future consumers must adopt a new immutable behavior tuple together; running matches are never silently upgraded. Optional original powers remain disabled in V1.

| Domain | Required authoritative concepts |
| --- | --- |
| Positions | Room/slot identity, layout revision, occupancy, starting roster count and frozen Blackout snapshot |
| Movement | One round use and an explicit final-ordinary-turn cutoff, independent of the mover's own turn |
| Blackout | Secret registered request, admission/cancellation, bound room, shared deadlines, final selected slot, frozen occupant and terminal outcome |
| Clone | Lifetime use, Main Action use, activation round, active state and expiry after `min(activation round + 1, 5)` normal resolution |
| Protection | Existing pending/active state and once-per-recipient grant receipt; no activation/duration changes |
| Hospital | Health, injury episode, admission round, due death round and current medical slot |
| Detention | Separate jailed status; Hospital location does not clear it |
| Captain | Current office holder, own-turn/Command eligibility and two independent match-wide used flags |
| Hack | Public pair and stage, participant-only claim, authoritative declaration/result/conversation deadlines |
| Events | Opaque audience-scoped identity, authorized subject/room/checkpoint, bounded lifetime and sanitized outcome |

## Authoritative normal-round schedule

| Step | Processing and boundary |
| --- | --- |
| 1 | Apply next-normal-round Protection activation and existing round-start Captain election/turn-order rules. Reset ordinary round quotas; do not reset match-wide uses. |
| 2 | Run ordinary turns and intervening Hack stages. Apply accepted moves, Scan, Clone and Captain commands at their defined immediate checkpoints. Record queued attacks/role effects and Rescue. Each own turn retains independent Main Action, Shot and Hack opportunities; Captain office commands are separate. |
| 3 | At the final ordinary turn's end, close voluntary movement. Complete any already-requested final Hack without reopening movement. |
| 4 | Resolve the Jail vote under existing voter/threshold/tie rules. Apply detention/location changes and immediate Captain loss, then show the full five-second public tally/result. |
| 5 | Cancel untargeted Blackout requests whose actors are no longer Healthy/free, without consuming their lifetime use. Open the common Blackout window in every normal round, including when no request survives. Bind eligible requesters to their current rooms and freeze occupancy. Five seconds lit, ten dark; no early close. |
| 6 | Register all final Blackout attempts before resolving any. In recorded turn order, resolve each actor's queued Main Action, then ordinary Shot. Blackout occupies its role Main Action position. Already-immediate Scan/Clone/commands are not applied twice. Rescue and Round 3 Supplier distribution stay deferred to steps 7 and 8 respectively. |
| 7 | Resolve registered Rescue in stored turn order. An Injured target becomes Healthy; an Eliminated target cannot be revived. An accepted no-heal Rescue still spends its existing use. |
| 8 | Preserve Round 3 Supplier distribution immediately after Rescue under its existing recipient rules. Then apply due Hospital deaths only to episodes still Injured after Rescue. |
| 9 | Finalize forced placement, in player-number order where competing returns matter: admit all Injured to Hospital, return healed detained patients to Jail, then place free ordinary returners. Do not route an injured former Captain through A/B. |
| 10 | Publish permitted faction reveals after the complete resolution; exact role/Code disclosure remains match-end only. Expire Clone effects whose scheduled normal round just completed, then evaluate existing victory conditions after the complete stage. Expiry does not change health or faction power. Flag a needed next-round Captain election only if play continues. |
| 11 | After normal Round 5, end with the winner or run the existing conditional showdown. Do not create Round 6 or postpone a valid terminal result for a Hospital/Clone deadline. |

The logical working state moves a newly Injured player directly into Hospital in the same damage transition. Step 9 atomically reconciles final positions after all effects; no intermediate projection exposes an Injured player in another room. Health/position changes and authorized event records commit consistently. Rendering can represent the medical transition without becoming state authority.

Queued targeted actions keep the registration-time target and applicable location/Command checks, even if actor/target later moves or the actor becomes Injured, Jailed or Eliminated. Recheck target health and defenses at resolution. The untargeted Blackout admission exception is explicit and separate. Captain EJECT executes immediately but does not discard already-registered actions or trigger victory before the normal full resolution checkpoint.

## Blackout validation and resolution

The shared phase and all-room lighting schedule are fixed independently of private requests. Public payloads carry no requester, faction, request count, source path or actor-correlated completion time. Spectators cannot submit a valid target command for another seat.

Preserve slots for existing occupants. Allocate the lowest free logical slot for an entrant; departures leave holes until a later entrant uses one. Counts are five in A/B/Jail, one in Command and the starting roster count in Hospital, including empty slots. Finalized state has at most one occupant per slot and one slot per seat. Existing eliminated bodies retain their slot/capacity except for EJECT's explicit off-board cleanup.

At window opening, snapshot slot occupancy and each occupant's health. Freeze through the full five-second preview and ten-second dark stage. Client coordinates map to logical slot IDs under a versioned layout; the submitted command identifies the slot and snapshot, not a name, pixel coordinate or replacement seat. Resizing preserves the selected logical position.

Selection is accepted only during the half-open dark interval `[dark start, window end)`. Wrong phase/snapshot/room, unknown slot or malformed input is rejected without locking selection or immediate resource use. The first valid position locks the attempt. A second new selection cannot replace it; exact retries recover the original receipt. If invalid requests leave no accepted choice at the deadline, the ordinary timeout miss still consumes the admitted use.

| Case | Outcome |
| --- | --- |
| Pending requester jailed/ineligible before admission | Cancel that request, preserve lifetime use, no later resurrection or public cancellation cue |
| Empty, own or already-Eliminated snapshot occupant | Accepted final miss, no damage, consume use, no replacement |
| Admitted request without accepted selection at deadline | Miss, consume use once; no random target; timely accepted-but-unacknowledged choice takes precedence |
| Both Disablers choose the same living snapshot occupant | Keep both attack records and resolve each independently in stored turn order |
| Target alive in snapshot, eliminated by an earlier effect | Later attack has no further effect or replacement; its use remains spent |
| Normal eligible attack, active Clone | Block; keep Clone active and preserve Protection |
| Normal eligible attack, no Clone, active Protection | Block the first applicable attack and consume that Protection |
| No applicable defense | Healthy becomes Injured/Hospital; Injured becomes Eliminated |

For two valid attacks on a Healthy target: no defense yields injury then elimination before Rescue; Protection alone blocks one and the next injures; Clone blocks both without consuming Protection. An own-position miss is evaluated per requester and never deletes the other Disabler's attack on that occupant.

Position history cannot be made unknowable to a player who memorizes, records or inspects it. Do not claim stronger anti-cheat guarantees than the intended memory interaction.

## Clone and Protection

Clone uses one role Main Action and its one lifetime use on acceptance, Healthy/free and on the Alien's own ordinary turn. It activates immediately. Preserve independent ordinary Shot/Hack eligibility. Injury or detention later does not cancel it; elimination or match completion ends it. No event, move, heal, reconnect or duplicate command restarts its original expiry.

Rounds 1–4 expire after the following normal round's complete resolution. Round 5 activation is the explicit terminal exception: protect during its remaining normal effects, expire at normal Round 5 completion and provide no showdown protection. All five-round matches use this boundary; it is not a client timeout.

Clone blocks only normal ordinary shots and Blackout, including multiple attacks. It cannot block voting, Hack, Scan, Rescue, Hospital death or Captain powers. Special showdown shots bypass Clone and consume applicable Protection normally. Protection's grant limits, next-normal-round activation and independent duration rules remain unchanged; a pending grant is never activated early to manufacture a showdown defense.

## Hospital, detention and forced placement

A new injury episode records admission during normal round R and automatic death at the end of R+1 after Rescue. Damage does not create duplicate episodes; successful healing clears the episode, and a later new injury creates a fresh one. An existing injury cannot be prolonged by failed/no-op Rescue or by detention.

A second unblocked damage eliminates before Rescue. Automatic death and EJECT bypass both defenses. Medical recovery and flatline events never identify the Cracker. R4 admissions are due after R5 Rescue; new R5/showdown injuries are not automatically killed merely because the game ends. There is no new rescue window after showdown and no guaranteed extra round once the match terminates.

Detained Injured players remain in Hospital and retain detention. A Jail vote against an Injured player changes detention without a room transfer. They cannot start role actions or move merely because Hospital replaced Jail as their physical location. Healing a detained patient returns them to Jail; Captain commands affect them only once physically there. No remote release or medical-patient ejection is introduced.

Healthy/free healed players and released prisoners return to their last actually occupied A/B room if space permits, otherwise the other room. Process competing returners by ascending player number and remember the room actually reached. These forced transfers spend no voluntary move. Hospital holds the complete roster, so no injured overflow exists. Existing bodies count toward their physical room capacity.

With at most nine unique seats and ten combined A/B places, a legal off-room returner always has an ordinary-room place. With at most one new detention per each of five normal rounds, physical Jail occupants plus detained patients awaiting return cannot exhaust more than five Jail places. An impossible overcapacity state is an invariant failure, not permission to place an Injured player outside Hospital or leave a successfully released player detained.

## Captain commands

Validate current Captain identity, their own ordinary turn, Command Room occupancy, unused relevant allowance and at least one living detained occupant physically in Jail. Empty/invalid attempts change neither state nor allowance. Each accepted command atomically captures and affects the complete current eligible set.

RELEASE clears detention for that set and immediately places them in A/B using the return rule. EJECT eliminates that set, removes every physical Jail occupant from room/slot occupancy and retains an off-board elimination record, including historical corpses. Medical detainees in Hospital are outside both target sets. No defense changes either result.

Each allowance is independent and shared across all Captains in the match. Commands are separate from role-action resources. Revalidate after a preceding command or move; an EJECT following RELEASE normally finds no eligible target and spends no use. Duplicate delivery recovers the original receipt; competing new commands observe committed state and cannot spend a shared use twice. Losing the title or leaving Command before a new command is accepted makes it invalid, without undoing an earlier accepted result.

Publish neutral status/location consequences immediately. Keep faction reveal at the normal end-round checkpoint and victory after all registered effects; exact roles and Code remain private until match end.

## Audiences and delivery

| Information | Authorized recipients and exclusions |
| --- | --- |
| Public board health/location/Captain facts and aggregate vote result | Existing public audience, without appended hidden causes |
| Fixed all-room Blackout phase/lighting | Everyone and shared display every normal round, independent of requests; private selection/receipt only to requester |
| Successful defensive block and subject | Seats occupying the affected target's room at its logical resolution checkpoint; no cause, grantor, hidden role or resource counter |
| Clone activation/use/expiry | Alien's private view only; no role-specific public asset fetch or sound |
| Protection grant/activation/consumption | Existing authorized Undercover-private information; its observable generic block does not reveal grantor |
| Hack participant pair and cinematic stage | Everyone and shared display |
| Hack claim, declared side and conversation information | The two participants only; not host/display/unrelated seats |
| Medical recovery/death and Captain command outcomes | Public authorized state/outcome; no Cracker source cue or early faction/role disclosure |

Room recipient membership is frozen for the particular event, from authoritative physical location immediately before applying that effect. It includes the subject and any retained eliminated seat still occupying that room; it is not based on which panel a viewer opens. A later entrant gains no historical room events. A host with a player seat has only that seat's player permissions plus ordinary host controls, never every private view.

Buffer outcome publication through the complete resolution checkpoint. Public/room animation order and timestamps must not encode the hidden actor's resolution index or request arrival. Use audience-scoped opaque event identities and a presentation order independent of hidden actors. Deliver only sanitized payloads to authorized recipients, not globally distributed facts hidden by CSS. No global block badge, count or sound goes to the shared display.

Reconnect supplies current authorized state, remaining deadlines and private accepted receipts; it does not replay historical cinematics. Event delivery is bounded and deduplicated. Existing public state history, if retained, cannot be expanded into hidden room-event history. Room-effect audio defaults to silent; physical eavesdropping or shoulder-surfing remains outside technical confidentiality guarantees.

## Hack timing and final showdown

Hack declaration lasts at most fifteen seconds, result lasts a full five, conversation a full sixty. Entry fits inside the result stage and does not obscure the private claim. Server deadlines advance independently of animation completion. Exit at conversation end is nonblocking and returns art to latest authoritative positions; it creates no movement action or extra timer phase. Disconnect follows existing non-pausing V1 recovery. In-person speech is delivered physically, with no new voice/chat/recording service.

After normal R5 Rescue, due Hospital deaths, reveals, Clone expiry and victory evaluation, run showdown only if no winner exists. Keep authoritative locations and detention, including Injured in Hospital. A cinematic shared showdown is not a sixth gameplay room. Every non-eliminated participant gets the existing separate special shot; only these shots ignore room separation, ordinary injury/Jail shooting restrictions and Command Room immunity.

All targets are registered before any special shot resolves; keep the existing sixty-second server window, missing-shot behavior and Round 5 turn-order resolution. A validly registered shot survives later shooter elimination. Apply current defenses except Clone, then one damage; maintain Hospital-only injury. Resolve the whole batch before reveals/final victory, otherwise draw. There are no new role actions, Rescue window or Hospital aging tick after that exchange.

## Required implementation evidence

These are acceptance requirements for later code, not executed game tests:

- 7/8/9-player coverage of fixed slots, roster-sized Hospital, voluntary movement until the last ordinary turn, and no overflow or duplicate occupant.
- Blackout no-request/canceled/single/dual requests share the same public window and lighting; five lit plus ten dark, fixed snapshot, no early close or reconnect preview reset.
- Empty/self/dead/timeout misses consume once; invalid inputs do not lock; accepted-but-unacknowledged choices survive retry. Two legitimate attacks are retained separately.
- Turn-order resolution, actor death after registration, changed target location, repeated damage, each defense combination and no resurrection by a later Rescue.
- Clone action cost, Healthy/free initial eligibility, later imprisonment, original R+1 expiry, R5 exception, terminal cleanup and showdown bypass. Protection preservation for normal blocks and consumption for showdown blocks.
- Hospital R2/R3 rescue/death, repeated injury episodes, R4/R5 due deaths, fresh R5/showdown injury, detention without a medical transfer, and healthy prisoner return to Jail.
- RELEASE/EJECT complete physical-Jail target sets, medical-detainee exclusion, independent global allowances, empty-Jail rejection, title/location races, immediate placement and deferred full-stage victory.
- Room audiences including a moved/injured recipient, outsiders/host/display exclusion, sanitized batched ordering, no late-entry historical access and no cinematic replay on reconnect.
- Public Hack pair with private claims, exact declaration/result/conversation timing, entry not reducing speech time, late movement respected and physical V1 conversation limits.
- A complete five-round game and conditional showdown preserve actual Hospital locations, legal special-shot targets, full-batch victory checks and a possible draw.
- Independent actor authorization, receipt replay, transaction conflicts, deadline duplication and immutable-version compatibility checks. Real phone/reduced-motion/device and human balance evidence remain separate gates.
