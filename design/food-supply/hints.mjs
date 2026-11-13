// mothership:dev-only
//
// The Food Supply Task's hint line: what one participant's phone says under the view, from their own
// projection (./task.mjs view()) and the events of the last moment. The next press, a wait, a warning,
// a stop, a broken crate. Short on purpose: every hint fits three lines at the game's 200% text on a 320-pixel
// phone (packages/design-tokens/test/food-supply.test.mjs holds them to 40 characters).

import { seatOf } from '../phone-ui/prototype/fixtures.mjs';
import { FIXTURES, FOOD } from './task.mjs';
import { CAST } from './boards.mjs';

// Review fixtures only: the two operators drawn under other names, such as the widest permitted twelve-character
// name, to check that every name stays whole (phone.html?…&names=long). Null draws the fixtures' own names.
let renamed = null;
export function nameOperators(names = null) { renamed = names; }

/** A participant from the fixtures, with their crew character. */
export const person = role => ({ ...seatOf(CAST[role].seat), ...(renamed?.[role] ? { name: renamed[role] } : {}), character: CAST[role].character });
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
  if (v.warnings.includes('crate-over-partner')) return say('hazard', 'warning', `Don't let go: it falls on ${partner}.`);
  if (v.warnings.includes('crate-over-you')) return say('hazard', 'warning', 'The crate is over you.');
  const stopped = recent.find(e => e.type === 'STOPPED');
  if (stopped) return say('quiet', 'block', stopped.kind === 'cut' ? "Stopped: the cab's buffer held." : 'Stopped: the winch brake held.');
  if (v.partner === 'offline') return say('quiet', 'offline', `${partner} is offline. The Task goes on.`);
  const c = v.crate, p = v.panel;
  const overPlatform = p.locked && p.stop === FIXTURES.platform.stop;
  if (c.state === 'landed') {
    if (v.keys.you) return say('quiet', 'key', `Key turned. Waiting for ${partner}.`);
    return v.partner === 'down' ? say('next', 'key', `${partner} is out. Turn your key alone.`) : say('next', 'key', 'Landed. Turn your key.');
  }
  // A crate that broke a moment ago, or one that dropped back into the hatch.
  const broke = recent.some(e => e.type === 'BROKEN');
  const back = recent.some(e => e.type === 'MISSED');
  const hookHome = p.locked && p.stop === FIXTURES.intake.stop;
  if (v.role === 'panel') {
    if (c.state === 'intake') {
      if (!c.settled) return say('quiet', 'hourglass', broke ? 'It broke. A new crate comes up.' : 'Wait: a new crate.');
      if (hookHome) return say('quiet', 'hourglass', back ? `Back in the hatch. ${partner} holds again.` : `Wait: ${partner} lifts the crate.`);
      if (!p.locked) return say('next', 'lock', 'Lock it over the hatch, at 1.');
      return say('next', 'release', broke ? 'Broken. Fetch a new one at 1.' : 'Release: fetch the crate at 1.');
    }
    if (c.holder !== 'winch') return say('quiet', 'hourglass', `Wait: ${partner} takes it back.`);
    if (!c.settled) return say('quiet', 'hourglass', 'Wait: the crate is rising.');
    if (!p.locked) return say('next', 'lock', 'Lock it over the platform, at 6.');
    if (overPlatform) return say('quiet', 'hourglass', `Locked. ${partner} lets go over it.`);
    if (p.stop === FIXTURES.console.stop) return say('caution', 'release', 'Locked over you. Release it.');
    if (p.stop === FIXTURES.intake.stop) return say('next', 'release', 'Release the panel.');
    return say('next', 'release', `Locked at ${p.stop + 1}. Release and try again.`);
  }
  // The Winch: one button, Hold.
  const hold = v.buttons.find(b => b.act === 'hold');
  if (c.state === 'intake') {
    if (!c.settled) return say('quiet', 'hourglass', broke ? 'It broke. A new crate comes up.' : 'Back in the hatch.');
    if (hookHome) return say('next', 'move', broke ? 'Hold to lift the new crate.' : back ? 'Hold again to lift it.' : 'Press and hold to lift it.');
    return say('quiet', 'hourglass', broke ? `Broken. ${partner} fetches a new one.` : `Wait: ${partner} brings the hook.`);
  }
  if (c.holder !== 'winch') return say('next', 'move', 'Hold again to take it back.');
  if (!c.settled) return say('quiet', 'hourglass', 'Lifting… keep holding.');
  if (!p.locked) return say('quiet', 'hourglass', `Keep holding. ${partner} moves it.`);
  if (hold?.next) return say('next', 'move', 'Let go now: over the platform.');
  if (overPlatform) return say('caution', 'hourglass', 'Keep holding: wait for the swing.');
  return say('quiet', 'hourglass', `Keep holding. ${partner} moves it.`);
}

// ── The food count's words, on every phone ─────────────────────────────

/**
 * The food count in words: packages, as the owner decided (12 November 2026), from the server's count of doses
 * (two a package). A single dose is half a package, written "½": "½ package", "1 package", "4½ packages",
 * "0 packages".
 */
export function packagesText(doses) {
  const whole = Math.floor(doses / FOOD.dosesPerPackage), half = doses % FOOD.dosesPerPackage !== 0;
  const one = doses === FOOD.dosesPerPackage || (whole === 0 && half);
  return `${whole === 0 && half ? '' : whole}${half ? '½' : ''} ${one ? 'package' : 'packages'}`;
}

/**
 * The food warning's title on every phone, while one package or less remains (FOOD.warnAt), or null above it
 * (#222, 13 November 2026): "Food low: 1 package left", "Food low: ½ package left", and at none "No food left".
 */
export function foodWarning(doses) {
  if (doses > FOOD.warnAt * FOOD.dosesPerPackage) return null;
  return doses <= 0 ? 'No food left' : `Food low: ${packagesText(doses)} left`;
}
export const FOOD_WARNING_SUB = 'Each meal takes half a package. A Food Supply Task adds five.';
