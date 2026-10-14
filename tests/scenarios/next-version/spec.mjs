// The specification this suite is written against: the owner's motion and gameplay specification
// of 13 October 2026, as Integration handed it to Game Balance on 14 October. It is not a ruleset:
// no protocol, ruleset or engine version exists for it, and no engine plays it. The packet is six
// Markdown files that are not committed anywhere; the hashes below say which bytes were read.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SPEC = Object.freeze({
  name: 'owner-motion-2026-10-13',
  recordedOn: '2026-10-13',
  // Where Integration keeps the packet. The files were local and uncommitted when they were read.
  path: 'docs/specifications/owner-motion-2026-10-13',
  branch: 'codex/owner-motion-spec-2026-10-13',
  // What the packet names as its source basis. It is also the base of this suite's branch.
  sourceBasis: Object.freeze({
    commit: 'abb6839524b6dc3e5225e600f2f067c3fa3f9501',
    engineVersion: 'full-game-1.3.0',
    rulesetVersion: 'in-person-v1-capacity-resolution-2026-10-12',
    rulesetHash: 'aef288266055bfc6f9905b97ba3262400044af84c689dbcc4a979e544bdf2b1e',
  }),
  files: Object.freeze({
    'README.md': 'd434066f630f8c023b88d556f37b2ac80cbc0fda19acb9ba3471ba147ed0dd13',
    'decision-register.md': 'ecbe6dd4fef8cb0a8534811a605615aaf01a1f312af7e9c2fa498c9815121fa4',
    'game-design.md': '002c5d9bcf5d1bcf2896533c34c5da277b3c0cdbc1dd555cad87816b08b026a2',
    'motion-requirements.md': '976eeee03c51a704e42fdfd8cb2d8384aaa82567b2e5190eb3a0af87cd381bba',
    'motion-storyboards.md': '1642ed84153e83443367bfd29bfdda3328786030199f7dd6804a14025f590d56',
    'rules-contracts.md': '6090fc0081b26b9426113db72c86d2651026a015a63e72e211aa270d13340f6b',
  }),
  // One digest for the six: see packetDigest below.
  packetSha256: 'fd90accca7c3e39d86e7f6ab6ac38a1804ac2877523b560fa0c03928bb9a1aca',
  // The handoff of 14 October 2026 that carried the packet, as one text file.
  handoff: Object.freeze({ name: 'GameN-Balance-follow-up-2026-10-14.txt', bytes: 113028, sha256: 'eace479997f10f709c875ac28f0f1470d5cac18a1dae0d21c7b2aeeb307828ec' }),
});

// The sections of game-design.md.
export const SECTIONS = Object.freeze({
  'G-01': 'Blackout Strike',
  'G-02': 'Private Chamber',
  'G-03': 'Alien Phantom Clone',
  'G-04': 'Room-visible defensive outcomes',
  'G-05': 'Medical Drone and Emergency Revival',
  'G-06': 'Captain RELEASE and EJECT',
  'G-07': 'One full Hospital round',
  'G-08': 'Global interaction requirements',
  'G-09': 'Movement during player turns',
});

// The entries of decision-register.md and whose answer each one is. `owner`: answered by the
// owner one by one. `blanket`: a recommendation closed by the owner's "approve all
// recommendations". `integration`: a detail Integration completed under that approval; the
// register says the owner did not answer these one by one.
export const QUESTIONS = Object.freeze({
  'Q-B01': 'owner', 'Q-B02a': 'owner', 'Q-B02b': 'owner', 'Q-B02c': 'owner', 'Q-B02d': 'owner',
  'Q-B03a': 'owner', 'Q-B03b': 'owner', 'Q-B03c': 'owner', 'Q-B03d': 'owner', 'Q-B03e': 'owner', 'Q-B03f': 'owner',
  'Q-C01': 'owner', 'Q-C01b': 'owner', 'Q-C02a': 'owner', 'Q-C02b': 'owner', 'Q-C02c': 'owner', 'Q-C02d': 'owner',
  'Q-C02e': 'owner', 'Q-C02f': 'owner', 'Q-H01': 'owner', 'Q-M01': 'owner', 'Q-M02': 'owner', 'Q-P01a': 'owner',
  'Q-B03': 'integration', 'Q-C02': 'integration', 'Q-D01': 'blanket', 'Q-D02': 'blanket', 'Q-H02': 'integration',
  'Q-H03': 'integration', 'Q-H03a': 'blanket', 'Q-H04': 'integration', 'Q-HK01': 'blanket', 'Q-HK02': 'blanket',
  'Q-HK03': 'integration', 'Q-P01': 'integration', 'Q-P02': 'integration',
});

export const isSpecReference = reference => reference in SECTIONS || reference in QUESTIONS;

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** The digest of the packet: the six lines "<sha256>  <file name>", in order of file name, each ended by a line feed. */
export function packetDigest(files = SPEC.files) {
  const lines = Object.keys(files).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map(name => `${files[name]}  ${name}\n`);
  return sha256(lines.join(''));
}

/**
 * Compare a copy of the packet on disk with the recorded hashes. The packet is not in this
 * repository, so no test can do this; whoever holds a copy can.
 * @returns {{ file: string, expected: string, found: string | null, same: boolean }[]}
 */
export function comparePacket(directory) {
  return Object.entries(SPEC.files).map(([file, expected]) => {
    const path = join(directory, file);
    const found = existsSync(path) ? sha256(readFileSync(path)) : null;
    return { file, expected, found, same: found === expected };
  });
}
