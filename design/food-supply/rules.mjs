// mothership:dev-only
//
// The Food Supply Task's rule record for the handoff (design/tools/food-supply-export.mjs) and its
// document (docs/design/food-supply.md): the owner's confirmed highlights of 11 November 2026 and
// how the design meets each; what each player may see; the genuine rule conflicts, each with a
// solution inside the confirmed rules; and the open items. PROPOSED marks the design's own choices.

/** The owner's confirmed rules (11 November 2026), each with how the design meets it. */
export const RULES = Object.freeze([
  ['food-stock', 'Initial food stock: five packages. Each successful supply delivery adds five packages.', 'FOOD.initial 5, FOOD.perDelivery 5; the delivered card and the return toast say +5 packages.'],
  ['food-warning', 'The food warning appears when one package remains.', 'FOOD.warnAt 1: the room banner "Food low: 1 package left" (PROPOSED: on every phone).'],
  ['eating', 'Each player consumes one dose at their Eating step. Not eating transfers them to Hospital under the existing Hospital rules.', 'Not designed here (ship life shows the eating visits); see the open items.'],
  ['volunteer-partner', 'A volunteer selects a Partner. Tasks happen outside ordinary turns; Task travel is separate from normal movement.', 'Tasks sheet outside the turn order, then Choose your Partner; both travel to the Supply Room and back without a move.'],
  ['one-initiation', 'Each player may initiate one Task total per match across Food and Engine. Partner participation can repeat without spending that initiation.', 'The Tasks sheet says so; the server spends the Volunteer\'s initiation (when, see the open items).'],
  ['axes', 'One participant controls vertical movement; the other controls horizontal movement.', 'The Hoist: Raise and Lower. The Boom: Left and Right. Two buttons each, nothing else.'],
  ['betrayal', 'Both can betray their partner using movement of the same controller: dropping the crate onto the other player, or driving a moving panel into them.', 'The Hoist\'s Lower over the pulpit drops the crate on the Boom operator; the Boom\'s Left at the cab\'s door drives the gantry\'s bumper plate into the Hoist\'s cab.'],
  ['no-attack-button', 'There is no separate attack button, special trigger, confirmation or armed mode.', 'The attack is the same button\'s ordinary press. The button is striped and says what it will do; nothing asks to confirm.'],
  ['no-escape', 'There is no escape opportunity. An unblocked attack is lethal and does not send its victim to Hospital. Protection applies.', 'An attack resolves on the press, at once; the victim has nothing to press. KILLED is final (Eliminated); Protection gives STOPPED.'],
  ['one-opportunity', 'Each player has one attack opportunity. Its reset scope across repeated Task participation remains unspecified; do not silently choose it.', 'The server passes each participant\'s opportunity into the Task; the design never resets it and never shows it.'],
  ['survivor', 'After a partner dies, the survivor can complete the delivery alone if the crate is in the correct position. Otherwise the Task is lost.', 'The correct position is the cradle (docked). A death with the crate docked: the survivor\'s key alone sends it. Otherwise: lost.'],
  ['disconnect', 'A participant disconnect cancels the Task.', 'Cancelled after the grace (PROPOSED 8 s, see conflict 1). Nothing delivered; both return.'],
  ['visibility', 'Other players do not see the Task space on their phones. This does not automatically authorize public killer attribution or Protection disclosure.', 'Only the two participants\' phones draw the Supply Room. No phone ever shows a killer, an attack kind or Protection to anyone else (see the visibility).'],
  ['return', 'The ordinary return flow restores participants to their previous positions, accounting for death and cancellation.', 'Each returns to the place they left; a dead participant is shown Eliminated there, as the board draws any death.'],
  ['experience', 'A short, understandable cooperative activity; low puzzle difficulty; coordination and trust are the challenge; both contribute without talking.', 'Nine presses and two keys; the next press glows on the right phone; every risk is visible to both.'],
  // The owner's answers to Designer's questions, the same day.
  ['away-visible', 'Other players can check on the board who is not here, so they can understand who went on the Task.', 'While the Task runs, the two participants\' places are empty on every board. A banner says that two players are away on the Food Supply Task, without names: the board shows who.'],
  ['partner-decline', 'The Partner can decline.', 'The Partner request has Decline and Join. After a decline the Volunteer asks someone else or closes. PROPOSED: 15 s to answer, and no answer is a decline; the Volunteer\'s Task is used only when a Partner joins.'],
].map(([id, rule, design]) => Object.freeze({ id, rule, design })));

/** Who sees what. */
export const VISIBILITY = Object.freeze({
  participants: 'Both see the whole Supply Room and its shared machine, every move and bump, both warnings, both keys, the time, and each other\'s alive or offline state. Both see a STOPPED alike, with no reason. Neither ever sees an attack opportunity, Protection, or the other\'s refused presses.',
  others: 'Never the Supply Room. The board shows who is away: the two participants\' places are empty, so anyone can tell who went (the owner, 11 November 2026). A banner says only that two players are away on the Food Supply Task. PROPOSED: the result as the food stock shows it, delivered (+5) or nothing delivered; not how it went.',
  ask: 'PROPOSED: a Partner request and its answer are private to the two players: no one else learns who was asked, or that someone declined.',
  death: 'A participant killed on the Task is Eliminated at their previous position on the return, as any death is shown. No phone says who killed them, how, or that a Task killed them; the two participants already know.',
  protection: 'Never shown. A blocked attack is the same STOPPED as an attack by a participant with no opportunity left (see conflict 3).',
  foodStock: 'PROPOSED public: the count (the ship-life food capsules show it) and the warning at one package.',
  server: 'Only the server holds attack opportunities, Protection, and the reason for a STOPPED.',
});

/** The genuine rule conflicts, each with a solution inside the confirmed rules. */
export const CONFLICTS = Object.freeze([
  {
    id: 'disconnect-escape',
    rules: ['no-escape', 'disconnect'],
    conflict: 'If a disconnect cancelled the Task at once, a player could escape an attack by dropping their connection (switching off the network), which "no escape" forbids, and a network blip would wipe out a Task.',
    solution: 'The server judges a disconnect only after a grace (PROPOSED 8 s) in which the Task runs on: an attack pressed in the grace resolves, and a death that resolved before the cancellation stands (a dead participant\'s connection no longer matters). Back in time, nothing paused. Out longer, the Task is cancelled and both return.',
    residual: 'A participant can still end a Task they dislike by staying offline. Whether a deliberate disconnect should cost anything is the owner\'s call (open item).',
  },
  {
    id: 'survivor-asymmetry',
    rules: ['betrayal', 'survivor'],
    conflict: 'The drop puts the crate onto the Boom operator, out of the cradle, so a Hoist who drops can never complete alone. Only the Boom\'s ram, after docking, can kill and still deliver. The rules make the two betrayals unequal.',
    solution: 'Inside the rules: the server assigns the controls at random (PROPOSED), so neither player chooses the stronger seat; both phones show both risks equally; the two-key send makes docking a visible standoff (the Hoist\'s key turned and waiting is the moment to watch the gantry). Game Balance to judge the asymmetry with tools/balance.',
    residual: 'Accepting the asymmetry, or asking for a symmetric mechanic, is the owner\'s decision.',
  },
  {
    id: 'blocked-attack-disclosure',
    rules: ['no-escape', 'visibility', 'one-opportunity'],
    conflict: 'Protection applies, but a blocked attack is something the attacker sees fail. An attacker who knows they still had their opportunity learns that the victim is Protected, which "does not automatically authorize Protection disclosure".',
    solution: 'The design discloses as little as the rules allow: one STOPPED for Protection and for a spent opportunity alike, with no reason on either phone; the victim cannot tell which it was; no one else learns anything. The attacker\'s inference cannot be removed without a third reason for a stop, which the rules do not have.',
    residual: 'The owner confirms that the attacker\'s inference is acceptable, or chooses a different block.',
  },
  {
    id: 'deduced-attribution',
    rules: ['visibility', 'return'],
    conflict: 'With two participants, a death on the Task names the killer to anyone who knows who went: the return shows the body, and the other participant is the only possible cause. The rules forbid automatic attribution but make it deducible.',
    solution: 'No phone states a killer, a cause or a Task death; the death is shown as any death. The owner has decided that other players can see on the board who is away (11 November 2026), so after a death everyone can work out the survivor; that is accepted, and nothing states it.',
    residual: 'Settled by the owner\'s decision: nothing left to decide.',
  },
]);

/** What the owner, Game Balance, Backend or Integration still decide. */
export const OPEN_ITEMS = Object.freeze([
  { id: 'opportunity-reset', owner: 'owner', item: 'The attack opportunity\'s reset scope across repeated Task participation (unspecified by the owner; the design never chooses it).' },
  { id: 'block-spends', owner: 'owner', item: 'Whether a blocked attack spends the attacker\'s opportunity. PROPOSED: yes, an attempt is the opportunity.' },
  { id: 'dose-package', owner: 'owner', item: 'Whether one dose is one package. PROPOSED: yes.' },
  { id: 'initiation-spent', owner: 'owner', item: 'When a Volunteer\'s initiation is spent. PROPOSED: when a Partner joins and the Task starts (a decline or a withdrawn request does not spend it); a Task cancelled by the Partner\'s disconnect gives it back, one cancelled by the Volunteer\'s own does not.' },
  { id: 'deliberate-disconnect', owner: 'owner', item: 'Whether a deliberate disconnect costs anything (conflict 1).' },
  { id: 'partner', owner: 'owner', item: 'Who can be asked as a Partner (PROPOSED: a living player outside the Hospital and the Jail, not on a Task), how long they have to answer (PROPOSED: 15 s, and no answer is a decline), and whether a Volunteer may ask the same player again after a decline (PROPOSED: not for this start). That a Partner can decline is the owner\'s decision.' },
  { id: 'roles', owner: 'owner', item: 'Who runs which control. PROPOSED: the server at random (conflict 2).' },
  { id: 'public-result', owner: 'owner', item: 'Whether other players learn the result. PROPOSED: only as the food stock shows it, delivered (+5) or not. That they can see who is away is the owner\'s decision.' },
  { id: 'when', owner: 'owner, Backend', item: 'When a Task may start (which phases count as outside ordinary turns), and whether two Tasks may run at once.' },
  { id: 'timing', owner: 'Game Balance', item: 'The PROPOSED timing: 4 s briefing, 45 s deadline, 8 s grace, 300 ms between presses.' },
  { id: 'asymmetry', owner: 'Game Balance', item: 'The survivor asymmetry (conflict 2) and the food economy: five packages, five per delivery, one dose per player at each Eating step.' },
  { id: 'eating-order', owner: 'owner, Game Balance', item: 'The Eating step\'s place in the round and its order: with the stock short, the order decides who goes to the Hospital.' },
  { id: 'deliberate-attacks', owner: 'owner, Backend', item: 'PROPOSED deliberate attacks only: a hold\'s repeat stops at a warning, and a press made on an older picture never attacks (TASK_MOVE shown and repeat).' },
  { id: 'contract', owner: 'Integration', item: 'TASK_MOVE and the Task projection in packages/contracts/, and the ruleset version that adopts this Task.' },
  { id: 'engine-task', owner: 'owner', item: 'The Engine Task is not designed here.' },
].map(Object.freeze));
