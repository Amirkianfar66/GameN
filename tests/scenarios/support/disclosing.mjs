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

// Ways a private read beside the view could be built wrongly, each telling somebody something
// that V1-16, the secrecy of roles or the secrecy of the Code does not allow. The stand-in can be
// asked to make one of them, so that the paired cases can be shown to catch it. They are the
// negative controls of those cases. None of them uses a word the invariants look for: only a
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
      return {
        observe() {
          const observation = match.observe();
          const seats = observation.truth.seats;
          const supplier = seats.find(seat => seat.role === 'Supplier')?.seat ?? null;
          if (armed.length > 0 && observation.phaseKind === 'ORDINARY_TURN' && observation.activeSeat !== null) hadTurn.add(observation.activeSeat);
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
            players[seat] = read;
          }
          const everyone = leak === 'armed-list-to-table' ? { armed: [...armed] }
            : leak === 'weapons-given-count-to-table' ? { given: armed.length }
              : leak === 'team-to-table' ? { marks: Object.fromEntries(seats.map(seat => [seat.seat, TEAM_MARK[seat.faction]])) }
                : leak === 'code-mark-to-table' ? { marks: Object.fromEntries(seats.map(seat => [seat.seat, observation.truth.code.includes(seat.seat) ? 'a' : 'b'])) }
                  : undefined;
          observation.raw = { ...observation.raw, also: { players, ...(everyone === undefined ? {} : { public: everyone }) } };
          return observation;
        },
        command(actor, command, atMs) {
          const outcome = match.command(actor, command, atMs);
          if (outcome === 'REGISTERED' && command.type === 'SUPPLY') named = [...(command.targets ?? [])];
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
          }
          return advanced;
        },
        abort: atMs => match.abort(atMs),
      };
    },
  };
}
