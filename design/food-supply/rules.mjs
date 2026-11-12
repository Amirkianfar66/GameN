// mothership:dev-only
//
// The Food Supply Task's rule record for the handoff (design/tools/food-supply-export.mjs) and its
// document (docs/design/food-supply.md): the owner's confirmed highlights of 11 November 2026 and
// how the design meets each; what each player may see; the genuine rule conflicts, each with a
// solution inside the confirmed rules; and the open items. PROPOSED marks the design's own choices.

/** The owner's confirmed rules (11 and 12 November 2026), each with how the design meets it. */
export const RULES = Object.freeze([
  ['food-stock', 'Initial food stock: five packages. Each successful supply delivery adds five packages.', 'FOOD.initial 5, FOOD.perDelivery 5; the delivered card and the return toast say +5 packages.'],
  ['food-warning', 'The food warning appears when one package remains.', 'FOOD.warnAt 1: the room banner "Food low: 1 package left" (PROPOSED: on every phone).'],
  ['eating', 'Each player consumes one dose at their Eating step. Not eating transfers them to Hospital under the existing Hospital rules.', 'Not designed here (ship life shows the eating visits); see the open items.'],
  ['volunteer-partner', 'A volunteer selects a Partner. Tasks happen outside ordinary turns; Task travel is separate from normal movement.', 'Tasks sheet outside the turn order, then Choose your Partner; both travel to the Supply Room and back without a move.'],
  ['next-round', 'There is no limit of one Task per match. The Volunteer and their Partner cannot go for food the next round (the owner, 12 November 2026, replacing the highlight "Each player may initiate one Task total per match").', 'No Task count is kept. When a Task starts, the server notes the two; in the next round neither can volunteer for food or be asked as a Partner. Their Food Supply row says "You went for food last round", and the partner list marks them. From the round after, both can go again. PROPOSED: it holds whether the Task delivers, is lost or is cancelled; a refusal starts no Task, so it does not count.'],
  ['axes', 'One participant controls vertical movement; the other controls horizontal movement.', 'The Winch: Raise and Lower (vertical). The Panel: RELEASE and LOCK, the locking panel running left and right along the rail (horizontal). Once the crate has landed, a key each; nothing else.'],
  ['betrayal', 'Both can betray their partner using movement of the same controller: dropping the crate onto the other player, or driving a moving panel into them.', 'The Winch\'s Lower while the crate\'s swing has it over the Panel operator drops it on them (the drop); the Panel\'s LOCK while the panel passes the cab\'s stop drives its blade into the Winch operator\'s cab (the cut).'],
  ['no-attack-button', 'There is no separate attack button, special trigger, confirmation or armed mode.', 'The attack is the ordinary press at a dangerous moment. While it is dangerous, the button is striped and says what it would do; nothing asks to confirm.'],
  ['no-escape', 'There is no escape opportunity. An unblocked attack is lethal and does not send its victim to Hospital. Protection applies.', 'A lethal press resolves when the server receives it; the victim has nothing to press. KILLED is final (Eliminated). Applicable Protection gives STOPPED (CLANK!) and the block uses it up, as the existing rules do; the catch also stops it by luck, one time in four (the owner).'],
  ['one-opportunity', 'Each player has one attack opportunity. Its reset scope across repeated Task participation remains unspecified; do not silently choose it.', 'Not touched by this Task: the owner decided that a kill on the Task is not an attack (below). The Task never reads, spends or shows an attack opportunity.'],
  ['survivor', 'After a partner dies, the survivor can complete the delivery alone if the crate is in the correct position. Otherwise the Task is lost.', 'The correct position is over the platform: the crate on it, or on the hook of the panel locked over it. A death there: the survivor finishes alone (the Winch lowers it in and turns its key; the Panel turns its key). Anywhere else: lost.'],
  ['disconnect', 'A participant disconnect cancels the Task.', 'Cancelled after the grace (PROPOSED 8 s, see conflict 1). Nothing delivered; both return. Leaving on purpose costs nothing more (the owner, below).'],
  ['visibility', 'Other players do not see the Task space on their phones. This does not automatically authorize public killer attribution or Protection disclosure.', 'Only the two participants\' phones draw the Supply Room. No phone ever shows a killer, an attack kind or Protection to anyone else (see the visibility).'],
  ['return', 'The ordinary return flow restores participants to their previous positions, accounting for death and cancellation.', 'Each returns to the place they left; a dead participant is shown Eliminated there, as the board draws any death.'],
  ['experience', 'A short, understandable cooperative activity; low puzzle difficulty; coordination and trust are the challenge; both contribute without talking.', 'Four presses and two keys: raise, release, lock over the platform, lower as the swing passes over it. The challenge is timing and trust, without talking: the next press glows, and every danger shows on both phones.'],
  // The owner's answers to Designer's questions, the same day.
  ['away-visible', 'Other players can check on the board who is not here, so they can understand who went on the Task.', 'While the Task runs, the two participants\' places are empty on every board. A banner says that two players are away on the Food Supply Task, without names: the board shows who.'],
  ['opportunity-per-match', 'One attack opportunity per match, not one per Task.', 'The owner\'s answer for attacks in general. A kill on the Task is not one (the owner, 12 November), so this Task never spends it.'],
  ['block-uses-it', 'A blocked attack uses up the opportunity.', 'Not touched by this Task, where a kill is not an attack (the owner, 12 November).'],
  ['accidents', 'Near each other, a small movement by both can kill one of them by mistake (a chance).', 'In the timing, with no dice: a LOCK made late in the panel\'s rest at 6 reaches the server as it snaps on to 7, and cuts the Winch operator; a lock sets the crate swinging, so a Lower a moment too soon can drop it on the Panel operator. Each kill takes both moving the crane, the lock and the Lower. A kill on the Task is not an attack, so a mistake costs the presser nothing (the owner).'],
  ['partner-decline', 'The Partner can decline.', 'The Partner request has Decline and Join. A decline passes the Task to the next volunteer (the owner, below). PROPOSED: 15 s to answer, and no answer is a decline.'],
  // The owner's crane (11 November 2026), which replaced the gantry the same day.
  ['crane-sides', 'The vertical operator is to the right of the platform where the crate should land.', 'Hana\'s Winch cab hangs under the rail at stop 7, right of the landing platform at stop 6; Cleo\'s console is at stop 5, on the other side of it.'],
  ['locking-panel', 'The horizontal operator works a locking panel that moves fast left and right and must be locked in the correct position; locked at the vertical operator\'s place, by mistake or not, it cuts them.', 'RELEASE sets the panel clicking from stop to stop, end to end and back: a fast snap, then a rest at each stop (the owner\'s click, below). LOCK drops its blade at the stop it rests at, or at the one it is snapping to. The correct position is stop 6, over the platform; locked at stop 7, the blade drops into the cab.'],
  // The owner's answers of 12 November 2026.
  ['task-kills', 'A kill on the Task is not an attack, because it can be a mistake. Nothing limits how often a player kills on Tasks.', 'The Task never reads or spends an attack opportunity. Every lethal press kills unless the catch holds (below), as often as it happens; a betrayer can kill on every Task they join and say it was a mistake.'],
  ['lucky-catch', 'The safety catch sometimes saves by luck: 25%.', 'A lethal press on an unprotected participant is stopped one time in four by the server\'s own roll, looking exactly as a Protection block looks: the roof buffer catches the blade, or the winch\'s brake catches the crate (CLANK!). A participant with applicable Protection is stopped by it, and the block uses it up (the existing rules). So a CLANK! proves nothing.'],
  ['time-limit', 'The overall time to complete the Task is 30 seconds, the briefing inside it.', 'The timer on both phones counts down from 0:30 from the Task\'s start; the briefing (PROPOSED 4 s) runs inside it, so the controls work for the last 26 s. At 0:00 the Task is lost and nothing is delivered. A cooperative run takes about 11 seconds from the start.'],
  ['pendulum', 'The crate swings like a pendulum, so lowering it without killing the partner takes attention.', 'A lock sets the crate swinging, wide at first and calming but never still (PROPOSED: 0.9 of a stop, settling to 0.38, a swing every 1.3 s). Lowered, it falls where its swing has it: over the platform it lands, over the console it falls on the Panel operator, anywhere else it misses.'],
  // The owner's answers to Designer's questions, 12 November 2026.
  ['next-volunteer', 'If the asked player declines, the game goes to the next volunteer: anyone who volunteers.', 'A decline, or no answer, ends the Volunteer\'s request, and the Food Supply Task is open to anyone: the first player to ask a Partner goes next. PROPOSED: the refused Volunteer can volunteer again from the next round, and withdrawing a request counts as a refusal.'],
  ['random-controls', 'The game assigns the controls at random.', 'When the Partner joins, the server assigns the Winch and the Panel at random, and the briefing tells each which they run. Neither player can choose the control that is easier to betray with.'],
  ['food-count-only', 'Other players learn the result only through the food count.', 'A delivery raises the food stock by five, and every phone shows the new count, naming no Task. Nothing else tells anyone else how the Task went: no message when nothing is delivered, and a death shows as any death.'],
  ['leaving-free', 'Leaving the Task on purpose costs nothing.', 'A participant who goes offline on purpose is treated as any disconnect: after the grace (PROPOSED 8 s) the Task is cancelled, nothing is delivered and both go back, and a kill in the grace still stands (conflict 1).'],
  // The owner's answer to Designer's question after Integration's review, 12 November 2026.
  ['click-stop', 'The locking panel clicks from stop to stop.', 'Chosen when Integration ruled that a press is resolved when the server receives it: with the panel sliding a stop every 0.22 s, the network\'s delay alone would have turned a LOCK at 6 into a cut at 7. Now the panel snaps to each stop and rests there (PROPOSED: a 0.1 s snap, a 0.4 s rest), and a LOCK takes the stop it rests at or the one it is snapping to: each stop owns half a second, longer than the delay. A late LOCK at 6 still cuts the Winch operator, and the warning starts 0.15 s before the snap (PROPOSED margin).'],
].map(([id, rule, design]) => Object.freeze({ id, rule, design })));

/** Who sees what. */
export const VISIBILITY = Object.freeze({
  participants: 'Both see the whole Supply Room and its crane: the panel running or locked, the crate\'s swing, every press\'s effect, both warnings, both keys, the time, and each other\'s alive or offline state. Both see a STOPPED alike, with no reason. Neither ever sees an attack opportunity, Protection, or the other\'s refused presses.',
  others: 'Never the Supply Room. The board shows who is away: the two participants\' places are empty, so anyone can tell who went (the owner, 11 November 2026). A banner says only that two players are away on the Food Supply Task. The result only through the food count: a delivery raises it by five, and nothing says how the Task went (the owner, 12 November 2026).',
  ask: 'PROPOSED: a Partner request and its answer are private to the two players: no one else learns who was asked, or that someone declined. The next volunteer needs no message: anyone can open Tasks at any time.',
  death: 'A participant killed on the Task is Eliminated at their previous position on the return, as any death is shown. No phone says who killed them, how, or that a Task killed them; the two participants already know.',
  protection: 'Never shown. The server reads it from the game at each press that would kill, and a block uses it up. A stop is the same CLANK! whether Protection or the catch\'s luck (1 in 4) caused it, so it proves nothing (the owner, 12 November 2026).',
  mistakes: 'Both participants see a lethal press as it happens (CHOP!, THUD!), and neither phone says whether it was meant: the server cannot tell. Everyone else sees only the death, as any death: no cause, so a survivor can always say it was a mistake.',
  foodStock: 'Public: the count, so a delivery shows as five more (the owner, 12 November 2026); the ship-life food capsules show it. PROPOSED: every phone shows the new count when it changes, and the warning at one package.',
  server: 'Only the server holds Protection, the catch\'s roll and the reason for a STOPPED (its CATCH record, kept for replay), the role assignment\'s randomness, the press revisions and the command receipts. A refusal and a receipt go to their presser only.',
});

/** The genuine rule conflicts, each with a solution inside the confirmed rules. */
export const CONFLICTS = Object.freeze([
  {
    id: 'disconnect-escape',
    rules: ['no-escape', 'disconnect'],
    conflict: 'If a disconnect cancelled the Task at once, a player could escape an attack by dropping their connection (switching off the network), which "no escape" forbids, and a network blip would wipe out a Task.',
    solution: 'The server judges a disconnect only after a grace (PROPOSED 8 s) in which the Task runs on: the panel keeps running, a cut or a drop in the grace resolves, and a death that resolved before the cancellation stands (a dead participant\'s connection no longer matters). Back in time, nothing paused. Out longer, the Task is cancelled and both return.',
    residual: 'A participant can still end a Task they dislike by staying offline. The owner decided that leaving on purpose costs nothing (12 November 2026): nothing left to decide.',
  },
  {
    id: 'survivor-paths',
    rules: ['betrayal', 'survivor'],
    conflict: 'Both can betray, but a survivor completes only from the correct position. A betrayal that also takes the crate away from the platform can never deliver, so the rules can make the two betrayals unequal: the gantry this crane replaced let only one operator kill and still deliver.',
    solution: 'The crane gives each operator exactly one way to kill and still deliver. The Winch: from the platform stop, a Lower during the swing over the console, then lowered in alone and its own key. The Panel: after the landing, a cut while the keys wait, then its own key. Every other kill loses the Task. The server assigns the controls at random (the owner, 12 November 2026), and both phones show both dangers equally.',
    residual: 'Game Balance to judge with tools/balance whether the two paths are equally tempting; the owner accepts them or asks for a change.',
  },
  {
    id: 'blocked-attack-disclosure',
    rules: ['no-escape', 'visibility', 'task-kills', 'lucky-catch'],
    conflict: 'Protection applies, but a stopped kill is something both participants see. With a kill on the Task not an attack (the owner, 12 November), nothing else could stop one: every CLANK! would have meant Protection, which "does not automatically authorize Protection disclosure".',
    solution: 'The owner\'s luck: the catch also holds by chance one time in four, by the server\'s own roll. A CLANK! is the same for Protection and for luck, with no reason on either phone, and no one else learns anything.',
    residual: 'Settled by the owner (12 November 2026). Protection stops once and a block uses it up (Integration, 12 November), so a second stop on the same partner can only be luck; the owner had already accepted that an attacker may infer Protection (11 November).',
  },
  {
    id: 'deduced-attribution',
    rules: ['visibility', 'return'],
    conflict: 'With two participants, a death on the Task names the killer to anyone who knows who went: the return shows the body, and the other participant is the only possible cause. The rules forbid automatic attribution but make it deducible.',
    solution: 'No phone states a killer, a cause or a Task death; the death is shown as any death. The owner has decided that other players can see on the board who is away (11 November 2026), so after a death everyone can work out the survivor; that is accepted, and nothing states it. The crane\'s mistakes (the owner\'s accidents) make any Task death possibly a mistake, so the survivor always has a story.',
    residual: 'Settled by the owner\'s decision: nothing left to decide.',
  },
  {
    id: 'mistake-or-attack',
    rules: ['accidents', 'one-opportunity', 'task-kills'],
    conflict: 'Kills by mistake are wanted, and each player has one attack per match. Nothing can tell a mistake from an attack: if a Task kill were an attack, an honest mistake would spend it; if not, the one-attack rule cannot limit kills on Tasks.',
    solution: 'The owner\'s decision (12 November 2026): a kill on the Task is not an attack, and nothing limits how often a player kills on Tasks.',
    residual: 'Settled by the owner: nothing left to decide.',
  },
]);

/** What the owner, Game Balance, Backend or Integration still decide. */
export const OPEN_ITEMS = Object.freeze([
  { id: 'dose-package', owner: 'owner', item: 'Whether one dose is one package. PROPOSED: yes.' },
  { id: 'next-round', owner: 'owner', item: 'The edges of the next-round rule. PROPOSED: it holds once a Task starts, whether it delivers, is lost or is cancelled (both went for food); a refusal starts no Task, so it does not count; it covers the Food Supply Task only (the Engine Task is designed separately).' },
  { id: 'next-volunteer', owner: 'owner', item: 'After a refusal. PROPOSED: the refused Volunteer can volunteer again from the next round; no answer, or a withdrawn request, counts as a refusal; the first player to ask a Partner goes next.' },
  { id: 'partner', owner: 'owner', item: 'Who can be asked as a Partner (PROPOSED: a living player outside the Hospital and the Jail, not on a Task; the owner rules out the two who went for food last round), and how long they have to answer (PROPOSED: 15 s, and no answer is a decline). That a Partner can decline, and that a refusal passes to the next volunteer, are the owner\'s decisions.' },
  { id: 'when', owner: 'owner, Backend', item: 'When a Task may start (which phases count as outside ordinary turns), how many Food Supply Tasks a round may have, and whether two Tasks may run at once.' },
  { id: 'timing', owner: 'owner, Game Balance', item: 'The PROPOSED timing (the 30 s deadline and the click are the owner\'s): the click\'s 0.1 s snap and 0.4 s rest; the 0.15 s warning margin; a 4 s briefing, an 8 s grace; the swing (0.9 of a stop after a lock, settling to 0.38 with a 2.2 s time constant, a swing every 1.3 s; 0.25 after a raise); the zones (0.3 of a stop either side of the platform, 0.42 either side of the console and the intake); 0.45 s to raise, 0.3 s to fall. The rest and the margin need real-network evidence (Integration).' },
  { id: 'paths', owner: 'Game Balance', item: 'The two kill-and-deliver paths (conflict 2) and the food economy: five packages, five per delivery, one dose per player at each Eating step.' },
  { id: 'eating-order', owner: 'owner, Game Balance', item: 'The Eating step\'s place in the round and its order: with the stock short, the order decides who goes to the Hospital.' },
  { id: 'press-timing', owner: 'Backend, Integration', item: 'Integration\'s direction (12 November 2026): a press is resolved when the server receives it, on the server\'s monotonic clock; a phone\'s own time is diagnostic only, and any other lag policy needs its own review and real-network evidence. Backend: the clock sync the phones draw by, finite timestamps, the revisions a press is bound to, command ids and durable receipts (a retry reuses its id: no second press, roll, cooldown or delivery).' },
  { id: 'timing-access', owner: 'owner, Game Balance', item: 'A Task of timing is harder for some players (slower reactions, motor or sight impairments, a slow network). Whether a player can ask for a slower panel or a calmer swing, which changes the danger for their partner too, is the owner\'s call; nothing is proposed here. A polite live region is no channel for a danger that lasts half a second: PROPOSED, a short vibration on the presser\'s phone while their press would kill, besides the button\'s own name. Untested with a screen reader.' },
  { id: 'clone', owner: 'owner', item: 'Whether Clone stops a Task hazard. Not assumed (Integration, 12 November 2026): only applicable Protection is read.' },
  { id: 'contract', owner: 'Integration, Backend', item: 'Integration accepted the command families TASK_PRESS, TASK_ASK, TASK_ANSWER and TASK_ASK_WITHDRAW for contract design (12 November 2026), not their wire format, the PROPOSED defaults or the timing. Planning target: protocol 3, planet-game-1.4.0, ruleset in-person-planet-food-task-2026-11-12, opt-in, inheriting the 1.3.0 predecessor exactly; historical schemas, matches and payloads unchanged. Backend owns the shared contract; Frontend waits for it.' },
  { id: 'adoption', owner: 'owner, Integration', item: 'Before the Task can be played (Integration, 12 November 2026): the start window and concurrency; who can be asked; the edges of the next-round rule and of a refusal; Eating\'s units and cadence; return positions and forced transfers; the Blackhole; and how the Task\'s state, the food, the deaths, Protection and participation history pass through a whole-reality Sync. The public "away" must not show guessed room positions, a fixture\'s origin cannot decide a real return, and a picture that was never played cannot decide whether a meal was eaten.' },
  { id: 'engine-task', owner: 'owner', item: 'The Engine Task is not designed here.' },
].map(Object.freeze));
