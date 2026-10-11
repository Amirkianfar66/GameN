// The two tables of docs/balance/capacity-audit.md that are arithmetic, as text. A test holds the
// document to this text, so that no number in them is typed by hand.
import { capacityReach, startingRoomFacts } from '@mothership/balance';
import { GROUPS, loadGroup } from '../capacity/files.mjs';

const MODES = [7, 8, 9];
const percent = value => `${(value * 100).toFixed(1)}%`;
const row = (label, cells) => `| ${label} | ${cells.join(' | ')} |`;
const HEAD = ['| | 7 players | 8 players | 9 players |', '| --- | --- | --- | --- |'];

/** Where the limits of Hospital and Jail can be reached at all. */
export function reachTable() {
  const reach = MODES.map(capacityReach);
  const starts = MODES.map(startingRoomFacts);
  return [
    ...HEAD,
    row('Places in Room A and Room B together that nobody holds when everyone is in a room', starts.map(item => item.freePlacesAtTheStart)),
    row('Damage a match has before the showdown', reach.map(item => item.damageBeforeShowdown)),
    row('Of it, damage that can fall before Round 4 resolves', reach.map(item => item.damageBeforeRound4)),
    row('Most players Injured at once', reach.map(item => item.mostInjuredAtOnce)),
    row('First round whose resolution can leave a sixth Injured player', reach.map(item => (item.firstRoundASixthCanBeInjured === null ? 'none' : `Round ${item.firstRoundASixthCanBeInjured}`))),
    row('Most players waiting for Hospital at once', reach.map(item => item.mostWaiting)),
    row('Most players Eliminated before the showdown', reach.map(item => item.mostEliminatedBeforeShowdown)),
    row('Most players sent to Jail in a match', reach.map(item => item.mostJailed)),
  ].join('\n');
}

/** What three ways of drawing starting rooms give. */
export function startingRoomTable() {
  const facts = MODES.map(startingRoomFacts);
  const splits = scheme => scheme.splits.map(share => `${share.split.join('/')} ${percent(share.probability)}`).join(', ');
  const together = scheme => (Math.abs(scheme.togetherHighest - scheme.togetherLowest) < 1e-12 ? percent(scheme.togetherLowest) : `${percent(scheme.togetherLowest)} to ${percent(scheme.togetherHighest)}`);
  return [
    ...HEAD,
    row('**An independent, even draw for each player** (the rule of 8 October): six or more land in one room', facts.map(item => percent(item.independentDrawOverCapacity))),
    row('**Every legal assignment equally likely**: splits', facts.map(item => splits(item.uniform))),
    row('a room starts full', facts.map(item => percent(item.uniform.aRoomStartsFull))),
    row('two given players start in the same room', facts.map(item => together(item.uniform))),
    row('**A draw for each player as they join, and none once a room holds five**: splits', facts.map(item => splits(item.sequential))),
    row('a room starts full', facts.map(item => percent(item.sequential.aRoomStartsFull))),
    row('two given players start in the same room, from the least to the most likely pair', facts.map(item => together(item.sequential))),
    row('the last player to join has no draw: their room is settled before they join', facts.map(item => percent(item.sequential.settledBeforeJoining.at(-1)))),
    row('**The most even split, in a random order**: splits', facts.map(item => splits(item.balanced))),
    row('a room starts full', facts.map(item => percent(item.balanced.aRoomStartsFull))),
    row('two given players start in the same room', facts.map(item => together(item.balanced))),
  ].join('\n');
}

/** How many capacity fixtures each mode has, by status, read from the committed files. */
export function fixtureTable() {
  const counts = GROUPS.map(group => loadGroup(group).header.counts);
  const sum = key => counts.reduce((total, item) => total + item[key], 0);
  return [
    '| | 7 players | 8 players | 9 players | All |',
    '| --- | --- | --- | --- | --- |',
    ...[['Fixtures', 'total'], ['Ready: an engine run decides them', 'ready'], ['Blocked: a question is open, the case records what an engine does', 'blocked'], ['Manual: not an engine run', 'manual']]
      .map(([label, key]) => `| ${label} | ${counts.map(item => item[key]).join(' | ')} | ${sum(key)} |`),
  ].join('\n');
}
