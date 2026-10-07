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

// Three ways a disclosure to Supplier could be built wrongly, each telling somebody something that
// V1-16 and the secrecy of roles do not allow. The stand-in can be asked to make one of them, so
// that the paired cases can be shown to catch it. They are the negative controls of those cases.
export const LEAKS = {
  'supplier-seat-to-recipient': 'each recipient is told which seat armed them, which is to say who Supplier is',
  'other-recipient-to-recipient': 'each recipient is told who else was armed',
  'armed-list-to-table': 'everything that everyone can read carries the list of players Supplier armed',
};

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
      let armed = [];
      return {
        observe() {
          const observation = match.observe();
          const supplier = observation.truth.seats.find(seat => seat.role === 'Supplier')?.seat ?? null;
          const players = {};
          for (const [seat, view] of Object.entries(observation.playerViews)) {
            view.knowledge.armedBySupply = seat === supplier ? [...armed] : [];
            // What a further read might carry: Supplier's list, and for a recipient their own receipt only.
            const received = armed.includes(seat);
            players[seat] = seat === supplier ? { armed: [...armed] } : { armed: [], received };
            if (received && leak === 'supplier-seat-to-recipient') players[seat].from = supplier;
            if (received && leak === 'other-recipient-to-recipient') players[seat].alsoArmed = armed.filter(other => other !== seat);
          }
          observation.raw = { ...observation.raw, also: { players, ...(leak === 'armed-list-to-table' ? { public: { armed: [...armed] } } : {}) } };
          return observation;
        },
        command: (actor, command, atMs) => match.command(actor, command, atMs),
        advance(atMs) {
          const before = match.observe();
          const advanced = match.advance(atMs);
          const after = match.observe();
          if (advanced && before.round === 3 && after.round !== 3) {
            armed = after.truth.seats.filter(seat => seat.ordinaryWeapons > (before.truth.seats.find(item => item.seat === seat.seat)?.ordinaryWeapons ?? 0)).map(seat => seat.seat);
          }
          return advanced;
        },
        abort: atMs => match.abort(atMs),
      };
    },
  };
}
