// mothership:dev-only
//
// The state maps for library group 8, the successor sweep: the lobby's compact host and join states
// (the session snapshot, packages/contracts/src/planet-service.ts at 79418e7), the Round 3 Supply's
// private receipt, and the admission walk's plan. Every state reads the server's snapshot or view
// and the client's own memory; nothing decides a rule.
//
// The rules: the host creates a 7, 8 or 9 seat match and admits each player and display by its room
// code; bots fill seats; setup begins on the host's word, then the 30-second character choice and
// the 30-second minimum role read (the brief's lobby row: no initial-room picker; initial rooms are
// random). The Supplier's grant reaches each recipient at Round 3's Supply stage, after Rescue, as
// one ordinary weapon usable in Rounds 4 and 5; no delivery is public (the brief's Supplier row). An
// injured player is admitted to the Hospital by the server's placement; the walk follows it only
// when the previous placement is known (R4), and never shows a shooter or a trajectory.

// ---------- the lobby ----------

/**
 * The lobby on this phone, from the session snapshot and the client's own request memory:
 *   start       no snapshot: create (host) or join by room code
 *   requesting  requestAdmission sent, no response yet
 *   waiting     requestAdmission answered ok, not yet approved: the host has the request (it is in
 *               pendingAdmissions on the host's phone). What a pending requester can read is open (R14)
 *   host        the host's lobby: the code, the seats, requests to approve, bots, Begin when every seat is filled
 *   joined      a player's lobby: the code, the seats, "waiting for the host"
 *   display     a display's lobby: the code and the seats only
 *   refused     the request failed (PlanetServiceFailure's code; copy.mjs words each, and a general fallback)
 *   setup       choosing or reading: the existing character selection and role card take over
 */
export function lobbyState(snapshot, { requested = false, acknowledged = false, error = null, kind = 'player', code = null } = {}) {
  if (error) return { state: 'refused', code: error };
  if (!snapshot) return acknowledged ? { state: 'waiting', code } : { state: requested ? 'requesting' : 'start' };
  if (snapshot.status === 'choosing' || snapshot.status === 'reading') return { state: 'setup', status: snapshot.status };
  if (snapshot.status !== 'lobby') return { state: 'none' };
  const seats = { filled: snapshot.members.length, total: snapshot.playerCount, bots: snapshot.members.filter(m => m.controller === 'bot').length };
  if (snapshot.isHost) return { state: 'host', code: snapshot.roomCode, seats, members: snapshot.members, pending: snapshot.pendingAdmissions, canBegin: seats.filled === seats.total };
  // A display has no seat, so an admitted display and a pending one read alike (R14); the client's kind decides.
  if (snapshot.selfSeatId === null && kind === 'display') return { state: 'display', code: snapshot.roomCode, seats, members: snapshot.members };
  if (snapshot.selfSeatId === null) return { state: 'waiting', code: snapshot.roomCode };
  return { state: 'joined', code: snapshot.roomCode, seats, members: snapshot.members };
}

// ---------- the Round 3 Supply ----------

/**
 * The Supply's private receipt, against the previous view this screen drew (never on a reconnect):
 * the recipient's ordinary weapons grew. Only the recipient's own view says so; the Supplier's phone
 * only knows its own command was registered, and says when the delivery happens.
 */
export function supplyReceipt(previous, view) {
  if (!previous) return null;
  const gained = view.self.ordinaryWeapons - previous.self.ordinaryWeapons;
  return gained > 0 ? { gained, total: view.self.ordinaryWeapons, round: view.round } : null;
}

// ---------- the admission walk ----------

/** The walk's beats (ms): leave the room slot, cross between the board's panels, walk to the berth, lie down. */
export const WALK = Object.freeze({ leave: Object.freeze([0, 900]), cross: Object.freeze([900, 1200]), enter: Object.freeze([1200, 2000]), settle: Object.freeze([2000, 2400]), end: 2400 });

/**
 * The admission's plan, from the previous finalized placement and the new one (both the server's):
 *   walk  the origin slot is known and in a room: leave it with an injured gait, cross, walk to the berth
 *   snap  the origin is unknown (a reconnect without the previous snapshot: R4), or already in the Hospital
 *   none  not an admission (the seat is not newly in the Hospital)
 */
export function admissionPlan(previousSeat, seat) {
  if (!seat || seat.location !== 'Hospital') return { plan: 'none' };
  if (previousSeat?.location === 'Hospital') return { plan: 'none' };
  if (!previousSeat || !previousSeat.slotId || !['Room A', 'Room B', 'Command Room'].includes(previousSeat.location)) return { plan: 'snap', to: seat.slotId };
  return { plan: 'walk', from: { location: previousSeat.location, slotId: previousSeat.slotId }, to: seat.slotId, end: WALK.end };
}

export const LOBBY_STATES = Object.freeze(['start', 'requesting', 'waiting', 'host', 'joined', 'display', 'refused', 'setup', 'none']);
