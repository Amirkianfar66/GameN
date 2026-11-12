// mothership:dev-only
//
// The Food Supply Task's hint line: what one participant's phone says under the view, from their own
// projection (./task.mjs view()) and the events of the last moment. The next press, a wait, a warning,
// a stop, a miss. Short on purpose: every hint fits three lines at the game's 200% text on a 320-pixel
// phone (packages/design-tokens/test/food-supply.test.mjs holds them to 40 characters).

import { seatOf } from '../phone-ui/prototype/fixtures.mjs';
import { FIXTURES } from './task.mjs';
import { CAST } from './boards.mjs';

/** A participant from the fixtures, with their crew character. */
export const person = role => ({ ...seatOf(CAST[role].seat), character: CAST[role].character });
export const other = role => (role === 'winch' ? 'panel' : 'winch');

const say = (tone, icon, text) => ({ tone, icon, text });

/** What the hint line says, from the participant's own view: the next press, a wait, a warning, a stop. */
export function hintFor(v, recent) {
  const partner = person(other(v.role)).name;
  if (v.phase === 'briefing') return say('quiet', 'timer', `The controls work in ${v.briefingLeft} s.`);
  if (v.phase === 'ended') return say('quiet', 'info', 'The Task is over.');
  if (v.you === 'down') return say('quiet', 'eliminated', 'You are out.');
  // The dangers, live: both phones say them while they last, from a moment before (the margin for a
  // press already on its way). Never a promise: the server decides where a press lands when it arrives.
  const atCab = v.panel.stop === FIXTURES.cab.stop;
  if (v.warnings.includes('panel-at-partner-cab')) return say('hazard', 'warning', atCab ? `LOCK here cuts ${partner}.` : `Too late for 6: LOCK may cut ${partner}.`);
  if (v.warnings.includes('panel-at-your-cab')) return say('hazard', 'warning', atCab ? 'The panel is over your cab.' : 'The panel is moving to your cab.');
  if (v.warnings.includes('crate-over-partner')) return say('hazard', 'warning', `Lower now may drop it on ${partner}.`);
  if (v.warnings.includes('crate-over-you')) return say('hazard', 'warning', 'The crate is swinging over you.');
  const stopped = recent.find(e => e.type === 'STOPPED');
  if (stopped) return say('quiet', 'block', stopped.kind === 'cut' ? "Stopped: the cab's buffer held." : 'Stopped: the winch brake held.');
  if (v.partner === 'offline') return say('quiet', 'offline', `${partner} is offline. The Task goes on.`);
  const c = v.crate, p = v.panel;
  const overPlatform = p.locked && p.stop === FIXTURES.platform.stop;
  if (c.state === 'landed') {
    if (v.keys.you) return say('quiet', 'key', `Key turned. Waiting for ${partner}.`);
    return v.partner === 'down' ? say('next', 'key', `${partner} is out. Turn your key alone.`) : say('next', 'key', 'Landed. Turn your key.');
  }
  const missed = recent.some(e => e.type === 'MISSED');
  if (v.role === 'panel') {
    if (c.state !== 'hanging') return say('quiet', 'hourglass', missed ? `Missed. ${partner} raises it again.` : `Wait: ${partner} raises the crate.`);
    if (!c.settled) return say('quiet', 'hourglass', 'Wait: the crate is rising.');
    if (!p.locked) return say('next', 'lock', 'Lock it over the platform, at 6.');
    if (overPlatform) return say('quiet', 'hourglass', `Locked. ${partner} lowers it in.`);
    if (p.stop === FIXTURES.console.stop) return say('caution', 'release', 'Locked over you. Release it.');
    if (p.stop === FIXTURES.intake.stop) return say('next', 'release', 'Release the panel.');
    return say('next', 'release', `Locked at ${p.stop + 1}. Release and try again.`);
  }
  // The Winch.
  if (c.state !== 'hanging') {
    if (v.partner === 'down') return say('next', 'move', `${partner} is out. Raise it, lower it in.`);
    return say('next', 'move', missed ? 'Missed. Raise it again.' : 'Raise the crate.');
  }
  if (!c.settled) return say('quiet', 'hourglass', 'Raising…');
  if (!p.locked) return say('quiet', 'hourglass', `Wait for ${partner} to lock it.`);
  if (v.buttons.find(b => b.act === 'lower')?.next) return say('next', 'move', 'Lower now: over the platform.');
  if (overPlatform) return say('caution', 'hourglass', 'Wait for the swing over 6.');
  return say('quiet', 'hourglass', `Wait: ${partner} moves the panel.`);
}
