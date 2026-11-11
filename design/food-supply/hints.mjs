// mothership:dev-only
//
// The Food Supply Task's hint line: what one participant's phone says under the view, from their own
// projection (./task.mjs view()) and the events of the last moment. The next press, a wait, a warning,
// a bump, a stop. Short on purpose: every hint fits three lines at the game's 200% text on a 320-pixel
// phone (packages/design-tokens/test/food-supply.test.mjs holds them to 40 characters).

import { seatOf } from '../phone-ui/prototype/fixtures.mjs';
import { CAST } from './boards.mjs';

/** A participant from the fixtures, with their crew character. */
export const person = role => ({ ...seatOf(CAST[role].seat), character: CAST[role].character });
export const other = role => (role === 'hoist' ? 'boom' : 'hoist');

/** What the hint line says, from the participant's own view: the next press, a wait, a warning, a bump. */
export function hintFor(v, recent) {
  const partner = person(other(v.role)).name;
  if (v.phase === 'briefing') return { tone: 'quiet', icon: 'timer', text: `The controls work in ${v.briefingLeft} s.` };
  if (v.phase === 'ended') return { tone: 'quiet', icon: 'info', text: 'The Task is over.' };
  if (v.you === 'down') return { tone: 'quiet', icon: 'eliminated', text: 'You are out.' };
  if (v.warnings.includes('crate-over-partner')) return { tone: 'hazard', icon: 'warning', text: `Lower now drops the crate on ${partner}.` };
  if (v.warnings.includes('crate-over-you')) return { tone: 'hazard', icon: 'warning', text: 'The crate is over you.' };
  if (v.warnings.includes('bumper-at-partner-cab')) return { tone: 'hazard', icon: 'warning', text: `Left now rams ${partner}'s cab.` };
  if (v.warnings.includes('bumper-at-your-cab')) return { tone: 'hazard', icon: 'warning', text: "The gantry is at your cab's door." };
  if (v.partner === 'down') {
    if (v.docked) return { tone: 'next', icon: 'key', text: v.role === 'boom' && !v.buttons.some(b => b.key) ? `${partner} is out. You can send it alone.` : `${partner} is out. Turn your key.` };
    return { tone: 'quiet', icon: 'info', text: `${partner} is out.` };
  }
  if (v.partner === 'offline') return { tone: 'quiet', icon: 'offline', text: `${partner} is offline. The Task goes on.` };
  const bump = recent.find(e => e.type === 'BUMPED');
  const stopped = recent.find(e => e.type === 'STOPPED');
  if (stopped) return { tone: 'quiet', icon: 'block', text: stopped.kind === 'ram' ? 'Stopped: the spring buffer held.' : 'Stopped: the safety catch held.' };
  if (v.docked) {
    if (v.keys.you) return { tone: 'quiet', icon: 'key', text: `Key turned. Waiting for ${partner}.` };
    return { tone: 'next', icon: 'key', text: v.role === 'boom' && !v.buttons.some(b => b.key) ? 'Docked. Turn your key at the end stop.' : 'Docked. Turn your key.' };
  }
  const next = v.buttons.find(b => b.next);
  if (bump && bump.by === v.role) return { tone: 'quiet', icon: 'block', text: { rib: 'Blocked: the rib. It has to be higher.', pulpit: 'Blocked: the pulpit.', stop: 'Blocked: the end stop.', rail: 'It is at the top.', deck: 'It cannot go lower here.', 'in-intake': 'Lift it out of the intake first.', lift: 'Blocked: the lift.', wall: 'Blocked: the wall.', cradle: 'It is in the cradle.', 'key-turned': 'Your key is already turned.' }[bump.why] ?? 'Blocked.' };
  if (next) return { tone: 'next', icon: 'move', text: { up: v.docked ? 'Turn your key.' : 'Raise the crate over the rib.', down: 'Lower it into the cradle.', right: 'Drive it across to the lift.', left: 'Drive left.' }[next.dir] };
  const theirs = { hoist: 'lifting it', boom: 'driving it across' }[other(v.role)];
  return { tone: 'quiet', icon: 'hourglass', text: `${partner} is ${theirs}.` };
}
