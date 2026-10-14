// mothership:dev-only
// Extend the frozen board catalogue with the separately reviewed phone-kit flow.
// The original capture inputs remain unchanged; this mapping does not redraw them.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function readReleaseActionCoverage(root) {
  const coverage = JSON.parse(await readFile(resolve(root, 'design/board-motion/contract/coverage.json'), 'utf8'));
  const kit = JSON.parse(await readFile(resolve(root, 'design/phone-kit/contract/phone-kit.json'), 'utf8'));
  const declaration = kit.components.find(component => component.id === 'hack.panel');
  if (!declaration || !declaration.inputs.some(input => input.includes('legalTargets.DECLARE_HACK_SIDE'))) {
    throw new Error('Reviewed phone-kit declaration coverage is missing');
  }
  return { ...coverage, actions: [...coverage.actions, {
    kind: 'declare-hack-side', command: 'DECLARE_HACK_SIDE',
    offers: 'legalTargets.DECLARE_HACK_SIDE contains only the fixed target\'s own seat during the authoritative HACK_DECLARE window.',
    board: 'Participant-private phone-kit panel: select Blue, Red or Alien and confirm. No player target picker; the exchange target is already fixed.',
    inline: ['Blue', 'Red', 'Alien'],
    self: 'Only the target declares their own claim; every role receives the same choices.',
    hospitalJail: 'Preserve the legal offer and current location; declaration creates no movement or release.',
    cues: ['cue-pending', 'cue-registration', 'cue-not-accepted', 'cue-unknown'],
    public: 'No side, claim or partner association. Current feedback is private to the two participants, bound to the exchange and phase.',
    scenarios: ['hack.declare', 'hack.declare-undercover', 'hack.declare-confirm', 'hack.declare-sending', 'hack.declare-not-accepted', 'hack.declare-unknown', 'hack.declare-accepted', 'hack.public'],
  }] };
}
