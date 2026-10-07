// A stand-in that adds, to any engine binding, the one thing finding G17 says the engine lacks:
// it tells Supplier whom the Supplier stage armed. It is used to show that the Supplier disclosure
// cases CAN pass, and that each of their expectations checks something, before any engine makes
// that disclosure itself. It is not an engine and it holds no rule: it reads from server truth
// which players' weapon counts went up when Round 3 resolved, which is the only moment the rules
// let a weapon be gained, and puts that list where Supplier can read it.
//
// A run made through it is not evidence about an engine. Its reports name it as their adapter, and
// the report gate refuses them.
export const SUPPLY_DISCLOSURE_STAND_IN = 'supply-disclosure';

// Ways a private read beside the view, or a receipt, could be built wrongly, each telling somebody
// something that V1-16, the secrecy of roles, the secrecy of the Code or another disclosure rule
// does not allow. The stand-in can be asked to make one of them, so that the paired cases can be
// shown to catch it. They are the negative controls of those cases. None of them uses a word the
// invariants look for or changes another player's view at the moment of a command: only a
// comparison of two runs can find them.
export const LEAKS = {
  'supplier-seat-to-recipient': 'each recipient is told which seat armed them, which is to say who Supplier is',
  'supplier-seat-to-recipient-on-their-turn': 'each recipient is told which seat armed them, but only from their own next turn',
  'other-recipient-to-recipient': 'each recipient is told who else was armed',
  'first-recipient-to-second': 'the recipient who was named second is told who was named first',
  'armed-list-to-table': 'everyone can read the list of players Supplier armed',
  'weapons-given-count-to-table': 'everyone can read how many weapons were given, and nothing about to whom',
  'recipient-team-to-supplier': 'Supplier is told the team of each player they armed',
  'usable-to-supplier': 'Supplier is told whether each weapon they gave can be used',
  'team-to-table': 'everyone can read a mark on each seat that follows the player\'s team',
  'red-team-mates-to-red': 'each Red player is shown who the other Red players are',
  'code-mark-to-table': 'everyone can read a mark on each seat that follows whether its number is in the Code',
  'code-verdict-to-hacker': 'Hacker is told at once whether the Code attempt was right',
  // Found by an independent reading: each of these passed every paired case as the cases first stood.
  'weapons-held-to-supplier': 'Supplier is told how many weapons each player they armed then held',
  'fired-to-supplier': 'from the phase after it happens, Supplier is told which of the players they armed has fired',
  'supplier-seat-to-recipient-when-they-fire': 'a recipient is told which seat armed them at the moment they register a shot',
  'supplier-seat-to-recipient-in-round-5': 'each recipient is told which seat armed them, from their own Round 5 turn',
  'supplier-seat-to-recipient-not-blue': 'a recipient who is not Blue is told which seat armed them',
  'armed-mark-when-hurt-to-table': 'everyone can read a mark on each armed seat whose player is no longer Healthy and free',
  'registered-count-at-vote-to-table': 'during a Jail vote everyone can read how many actions were registered in the round',
  'alien-seat-mark-to-table': 'everyone can read a mark on one seat, and it is always the seat of Alien',
  'supplier-seat-mark-to-table': 'everyone can read a mark on one seat, and it is always the seat of Supplier',
  'code-verdict-to-alien-next-phase': 'from the phase after the attempt, Alien is told whether the Code attempt was right',
  'code-attempted-to-table-next-phase': 'from the phase after the attempt, everyone can read that the Code attempt was used',
  // In the receipt of a command, which only its sender reads.
  'code-verdict-in-receipt': 'the receipt of the Code attempt says whether it was right',
  'recipient-teams-in-receipt': 'the receipt of Supplier\'s choice says which team each named player is on',
  // Of the two other roles whose knowledge is theirs alone. Told in the same phase, either would
  // break an invariant at once; told a phase later, only a comparison finds it.
  'protected-to-recipient-next-phase': 'from the phase after the grant, a player who was given a Protection is told so',
  'scanned-to-target-next-phase': 'from the phase after the Scan, a player whom Hacker scanned is told so',
};
// The player counts in which a leak tells anybody anything, and in each of which it has to be
// caught. Only with nine players is there an Officer, so only there can a weapon be of no use to
// the player who holds it; with seven and eight that leak says the same of every weapon.
export const leakModes = leak => (leak === 'usable-to-supplier' ? [9] : [7, 8, 9]);
// A mark that follows a team without naming it.
const TEAM_MARK = { Blue: 'a', Red: 'b', Alien: 'c' };

/**
 * @param adapter an engine binding
 * @param {keyof typeof LEAKS | null} leak one deliberate fault from LEAKS, or none
 */
export function withSupplyDisclosure(adapter, leak = null) {
  if (leak !== null && !(leak in LEAKS)) throw new Error(`unknown leak ${leak}`);
  return {
    pins: { ...adapter.pins, adapter: `${adapter.pins.adapter} with the stand-in ${SUPPLY_DISCLOSURE_STAND_IN}${leak === null ? '' : `, leaking: ${leak}`}` },
    createMatch(setup, matchId) {
      const match = adapter.createMatch(setup, matchId);
      let named = [];   // whom Supplier named, in the order they were named
      let armed = [];   // those of them who were given a weapon when Round 3 resolved
      const hadTurn = new Set();   // players whose own turn has come since then
      // What the further leaks need to know. None of it is a rule: it is read from truth and from the commands sent.
      let heldWhenArmed = [];      // how many weapons each armed player held right after the Supplier stage
      const fired = new Set();     // armed players who have registered a shot
      let firedAtPhaseStart = [];  // those of them who had done so when the current phase began
      const hadTurnInRound5 = new Set();
      let registered = 0;          // actions registered in the current round
      let countedRound = null;
      let attemptAtPhaseStart = null;   // null: no Code attempt when the current phase began; else 'a' right, 'b' wrong
      const sentBy = {};           // seat -> the commands that player has sent, in order, with whether each was accepted
      const scanned = new Set();   // players whom Hacker has scanned
      let scannedAtPhaseStart = [];     // those of them who had been when the current phase began
      let shieldedAtPhaseStart = [];    // players who had been given a Protection when the current phase began
      return {
        observe() {
          const observation = match.observe();
          const seats = observation.truth.seats;
          const supplier = seats.find(seat => seat.role === 'Supplier')?.seat ?? null;
          if (armed.length > 0 && observation.phaseKind === 'ORDINARY_TURN' && observation.activeSeat !== null) hadTurn.add(observation.activeSeat);
          if (observation.round === 5 && observation.phaseKind === 'ORDINARY_TURN' && observation.activeSeat !== null) hadTurnInRound5.add(observation.activeSeat);
          const factionOf = seat => seats.find(item => item.seat === seat).faction;
          const players = {};
          for (const [seat, view] of Object.entries(observation.playerViews)) {
            view.knowledge.armedBySupply = seat === supplier ? [...armed] : [];
            // What a further read might carry: Supplier's list, and for a recipient their own receipt only.
            const received = armed.includes(seat);
            const read = seat === supplier ? { armed: [...armed] } : { armed: [], received };
            if (received && leak === 'supplier-seat-to-recipient') read.from = supplier;
            if (received && leak === 'supplier-seat-to-recipient-on-their-turn' && hadTurn.has(seat)) read.from = supplier;
            if (received && leak === 'other-recipient-to-recipient') read.alsoArmed = armed.filter(other => other !== seat);
            if (received && leak === 'first-recipient-to-second' && armed.indexOf(seat) === 1) read.before = armed[0];
            if (seat === supplier && leak === 'recipient-team-to-supplier') read.marks = armed.map(other => TEAM_MARK[seats.find(item => item.seat === other).faction]);
            if (seat === supplier && leak === 'usable-to-supplier') {
              read.usable = armed.map(other => { const holder = seats.find(item => item.seat === other); return !(holder.role === 'Officer' && holder.officerShotSpent); });
            }
            if (leak === 'red-team-mates-to-red' && seats.find(item => item.seat === seat).faction === 'Red') {
              read.allies = seats.filter(item => item.faction === 'Red' && item.seat !== seat).map(item => item.seat);
            }
            if (leak === 'code-verdict-to-hacker' && seats.find(item => item.seat === seat).role === 'Hacker' && observation.truth.codeSubmitted) read.attempt = observation.truth.codeCorrect ? 'a' : 'b';
            if (seat === supplier && leak === 'weapons-held-to-supplier') read.held = [...heldWhenArmed];
            if (seat === supplier && leak === 'fired-to-supplier') read.fired = [...firedAtPhaseStart];
            if (received && leak === 'supplier-seat-to-recipient-when-they-fire' && fired.has(seat)) read.from = supplier;
            if (received && leak === 'supplier-seat-to-recipient-in-round-5' && hadTurnInRound5.has(seat)) read.from = supplier;
            if (received && leak === 'supplier-seat-to-recipient-not-blue' && factionOf(seat) !== 'Blue') read.from = supplier;
            if (leak === 'code-verdict-to-alien-next-phase' && seats.find(item => item.seat === seat).role === 'Alien' && attemptAtPhaseStart !== null) read.attempt = attemptAtPhaseStart;
            if (leak === 'protected-to-recipient-next-phase' && shieldedAtPhaseStart.includes(seat)) read.shielded = true;
            if (leak === 'scanned-to-target-next-phase' && scannedAtPhaseStart.includes(seat)) read.looked = true;
            players[seat] = read;
          }
          const everyone = leak === 'armed-list-to-table' ? { armed: [...armed] }
            : leak === 'weapons-given-count-to-table' ? { given: armed.length }
              : leak === 'team-to-table' ? { marks: Object.fromEntries(seats.map(seat => [seat.seat, TEAM_MARK[seat.faction]])) }
                : leak === 'code-mark-to-table' ? { marks: Object.fromEntries(seats.map(seat => [seat.seat, observation.truth.code.includes(seat.seat) ? 'a' : 'b'])) }
                  : leak === 'armed-mark-when-hurt-to-table' ? { marked: armed.filter(seat => { const holder = seats.find(item => item.seat === seat); return holder.health !== 'Healthy' || holder.jailed; }) }
                    : leak === 'registered-count-at-vote-to-table' ? { registered: observation.phaseKind === 'JAIL_VOTE' ? (countedRound === observation.round ? registered : 0) : null }
                      : leak === 'alien-seat-mark-to-table' ? { marked: seats.find(seat => seat.role === 'Alien').seat }
                        : leak === 'supplier-seat-mark-to-table' ? { marked: supplier }
                        : leak === 'code-attempted-to-table-next-phase' ? { attempted: attemptAtPhaseStart !== null }
                          : undefined;
          // A receipt that says more than that the command was registered.
          const receipts = structuredClone(observation.raw.receipts ?? {});
          for (const [seat, list] of Object.entries(receipts)) {
            list.forEach((receipt, index) => {
              const command = sentBy[seat]?.[index];
              if (command === undefined || !command.accepted) return;
              if (leak === 'code-verdict-in-receipt' && command.type === 'SUBMIT_CODE') receipt.mark = observation.truth.codeCorrect ? 'a' : 'b';
              if (leak === 'recipient-teams-in-receipt' && command.type === 'SUPPLY') receipt.marks = command.targets.map(target => TEAM_MARK[factionOf(target)]);
            });
          }
          observation.raw = { ...observation.raw, receipts, also: { players, ...(everyone === undefined ? {} : { public: everyone }) } };
          return observation;
        },
        command(actor, command, atMs) {
          const round = match.observe().round;
          const outcome = match.command(actor, command, atMs);
          // One entry for each command the binding kept a receipt of: a malformed one gets none.
          if (outcome !== 'INVALID') (sentBy[actor] ??= []).push({ type: command.type, targets: [...(command.targets ?? [])], accepted: outcome === 'REGISTERED' });
          if (outcome !== 'REGISTERED') return outcome;
          if (command.type === 'SUPPLY') named = [...(command.targets ?? [])];
          if (command.type === 'SCAN' && typeof command.target === 'string') scanned.add(command.target);
          if (command.type === 'REGISTER_SHOT' && armed.includes(actor)) fired.add(actor);
          if (['DISABLE', 'REGISTER_SHOT', 'PROTECT', 'RESCUE', 'SUPPLY'].includes(command.type)) {
            if (countedRound !== round) { countedRound = round; registered = 0; }
            registered += 1;
          }
          return outcome;
        },
        advance(atMs) {
          const before = match.observe();
          const advanced = match.advance(atMs);
          const after = match.observe();
          if (advanced && before.round === 3 && after.round !== 3) {
            const gained = after.truth.seats.filter(seat => seat.ordinaryWeapons > (before.truth.seats.find(item => item.seat === seat.seat)?.ordinaryWeapons ?? 0)).map(seat => seat.seat);
            // In the order they were named, where that is known.
            armed = [...named.filter(seat => gained.includes(seat)), ...gained.filter(seat => !named.includes(seat))];
            heldWhenArmed = armed.map(seat => after.truth.seats.find(item => item.seat === seat).ordinaryWeapons);
          }
          if (advanced) {
            scannedAtPhaseStart = [...scanned];
            shieldedAtPhaseStart = after.truth.seats.filter(seat => seat.protection !== 'none').map(seat => seat.seat);
            firedAtPhaseStart = armed.filter(seat => fired.has(seat));
            attemptAtPhaseStart = after.truth.codeSubmitted ? (after.truth.codeCorrect ? 'a' : 'b') : null;
          }
          return advanced;
        },
        abort: atMs => match.abort(atMs),
      };
    },
  };
}
