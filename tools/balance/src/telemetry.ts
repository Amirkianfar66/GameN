import { ROLES_BY_MODE, factionOf, isMode, sameSet, seatIdsFor } from './model.js';
import type { Role } from './model.js';

// Validation of one restricted post-match research record. The specification is
// docs/balance/telemetry-spec.md and docs/balance/telemetry-export.schema.json.

export const MATCH_RECORD_SCHEMA = 'mothership.balance.match-record/1';

export const EXCLUSION_REASONS = [
  'aborted-by-host', 'abandoned-by-players', 'rules-deviation-affected-outcome', 'app-defect-affected-outcome',
  'wrong-player-count', 'optional-powers-enabled', 'facilitator-coached-play', 'incomplete-record',
  'different-ruleset', 'consent-withdrawn', 'practice-or-teaching-match',
] as const;

export const VICTORY_CAUSES = ['blue-elimination', 'blue-power', 'red-elimination', 'red-code', 'alien-solo', 'draw'] as const;

// Keys that must never appear anywhere in a record. Spoken Hack content is not collected by
// default (agents/game-balance.md), and direct identifiers do not belong in a research export.
export const FORBIDDEN_KEYS = [
  'hackContent', 'hackQuestion', 'hackAnswer', 'hackTranscript', 'transcript', 'audio', 'video',
  'realName', 'fullName', 'email', 'phone', 'address', 'uid', 'authUid', 'ipAddress', 'deviceId',
] as const;

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function forbiddenKeys(value: unknown, path: string, out: string[]): void {
  if (Array.isArray(value)) { value.forEach((item, index) => { forbiddenKeys(item, `${path}[${index}]`, out); }); return; }
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if ((FORBIDDEN_KEYS as readonly string[]).includes(key)) out.push(`${path}.${key}: this field must not be collected`);
    forbiddenKeys(item, `${path}.${key}`, out);
  }
}

const CAUSE_RESULT: Readonly<Record<string, string>> = {
  'blue-elimination': 'Blue', 'blue-power': 'Blue', 'red-elimination': 'Red', 'red-code': 'Red', 'alien-solo': 'Alien', draw: 'Draw',
};

/**
 * Returns every problem found. A record marked "template" is checked for shape only.
 * An excluded session must keep its facts: exclusion never deletes a result.
 */
export function validateMatchRecord(record: unknown): string[] {
  const issues: string[] = [];
  const say = (message: string) => { issues.push(message); };
  if (!isObject(record)) return ['record must be an object'];
  forbiddenKeys(record, 'record', issues);
  if (record['schema'] !== MATCH_RECORD_SCHEMA) say(`schema must be ${MATCH_RECORD_SCHEMA}`);
  if (record['classification'] !== 'restricted-research') say('classification must be restricted-research');
  const status = record['recordStatus'];
  if (status !== 'template' && status !== 'complete' && status !== 'incomplete') say('recordStatus must be template, complete or incomplete');
  const complete = status === 'complete';

  const provenance = record['provenance'];
  if (!isObject(provenance)) { say('provenance is required'); return issues; }
  const mode = provenance['mode'];
  // A blank template has no mode yet. Every other record belongs to exactly one mode.
  if (!isMode(mode)) {
    if (!(status === 'template' && mode === null)) say('provenance.mode must be 7, 8 or 9');
    if (!isObject(record['information']) || record['information']['hackContentRecorded'] !== false) say('information.hackContentRecorded must be false: spoken Hack content is not collected by default');
    return issues;
  }
  if (provenance['optionalPowers'] !== false) say('the base comparison records optionalPowers: false; a powers-on match belongs to another cohort');
  if (complete) {
    for (const key of ['matchId', 'playedOn', 'rulesetVersion', 'engineVersion', 'engineCommit', 'groupId', 'facilitatorId', 'cohort']) {
      if (typeof provenance[key] !== 'string' || (provenance[key] as string).length === 0) say(`provenance.${key} is required`);
    }
    for (const key of ['sourceManifestSha256', 'rulesetHash']) {
      if (typeof provenance[key] !== 'string' || !/^[a-f0-9]{64}$/.test(provenance[key] as string)) say(`provenance.${key} must be a SHA-256 hex digest`);
    }
    if (!Number.isInteger(provenance['protocolVersion'])) say('provenance.protocolVersion is required');
  }

  const participants = record['participants'];
  if (!Array.isArray(participants)) { say('participants must be a list'); return issues; }
  if (complete) {
    if (participants.length !== mode) say(`a mode-${mode} match needs exactly ${mode} participants`);
    const seats = participants.map(item => (isObject(item) ? item['seat'] : null));
    if (!sameSet(seats.filter((seat): seat is string => typeof seat === 'string'), seatIdsFor(mode))) say('participants must occupy each seat exactly once');
    const roles = participants.map(item => (isObject(item) ? item['role'] : null)).filter((role): role is string => typeof role === 'string');
    if (!sameSet(roles, ROLES_BY_MODE[mode])) say(`roles must be exactly the mode-${mode} roles`);
    const ids = new Set<string>();
    for (const item of participants) {
      if (!isObject(item)) { say('each participant must be an object'); continue; }
      const id = item['participantId'];
      if (typeof id !== 'string' || !/^P-[A-Z0-9]{4,12}$/.test(id)) say('participantId must be a pseudonym such as P-7K2Q');
      else if (ids.has(id)) say(`participantId ${id} appears twice`);
      else ids.add(id);
      const role = item['role'];
      if (typeof role === 'string' && (ROLES_BY_MODE[9] as readonly string[]).includes(role) && item['faction'] !== factionOf(role as Role)) say(`participant ${String(id)}: faction does not follow the role`);
      if (!Number.isInteger(item['priorMatches']) || (item['priorMatches'] as number) < 0) say(`participant ${String(id)}: priorMatches is required`);
      if (item['consentRecorded'] !== true) say(`participant ${String(id)}: consent must be recorded before data is kept`);
    }
  }

  const outcome = record['outcome'];
  if (!isObject(outcome)) say('outcome is required');
  else if (complete) {
    const terminal = outcome['terminal'];
    const result = outcome['result'];
    const cause = outcome['victoryCause'];
    if (terminal !== 'Finished' && terminal !== 'Aborted' && terminal !== 'Abandoned') say('outcome.terminal must be Finished, Aborted or Abandoned');
    if (terminal === 'Finished') {
      if (typeof cause !== 'string' || !(VICTORY_CAUSES as readonly string[]).includes(cause)) say('outcome.victoryCause is required for a finished match');
      else if (CAUSE_RESULT[cause] !== result) say('outcome.result does not follow outcome.victoryCause');
      if (result === 'Draw' && outcome['checkpoint'] !== 'showdown') say('a Draw is recorded only at the showdown checkpoint');
      if (outcome['checkpoint'] !== 'normal-resolution' && outcome['checkpoint'] !== 'showdown') say('outcome.checkpoint must be normal-resolution or showdown');
      if (!Number.isInteger(outcome['round']) || (outcome['round'] as number) < 1 || (outcome['round'] as number) > 5) say('outcome.round must be 1..5');
    } else if (result !== null) say('an aborted or abandoned match records no winner');
    if (outcome['alienCoWin'] === true && result !== 'Blue') say('Alien co-win is recorded only with a Blue win');
  }

  const exclusion = record['exclusion'];
  if (!isObject(exclusion) || typeof exclusion['excluded'] !== 'boolean' || !Array.isArray(exclusion['reasons'])) say('exclusion.excluded and exclusion.reasons are required');
  else {
    const reasons = exclusion['reasons'] as unknown[];
    if (reasons.some(reason => typeof reason !== 'string' || !(EXCLUSION_REASONS as readonly string[]).includes(reason))) say('exclusion.reasons must use the listed reasons');
    if (exclusion['excluded'] === true && reasons.length === 0) say('an excluded session needs at least one reason');
    if (exclusion['excluded'] === false && reasons.length > 0) say('reasons are recorded only for an excluded session');
    if (complete && isObject(outcome) && outcome['terminal'] !== 'Finished' && exclusion['excluded'] !== true) say('an aborted or abandoned match must be excluded from outcome rates and stay visible');
  }

  const officer = record['officer'];
  if (mode !== 9 && officer !== null && officer !== undefined) say('the Officer section exists only in mode 9');
  if (mode === 9 && complete && !isObject(officer)) say('a mode-9 record needs the Officer section');

  const information = record['information'];
  if (!isObject(information)) say('information is required');
  else if (information['hackContentRecorded'] !== false) say('information.hackContentRecorded must be false: spoken Hack content is not collected by default');

  const experience = record['experience'];
  if (Array.isArray(experience)) {
    for (const item of experience) {
      if (!isObject(item)) continue;
      for (const key of ['clarity', 'agency', 'fairness', 'enjoyment']) {
        const score = item[key];
        if (score !== null && score !== undefined && (!Number.isInteger(score) || (score as number) < 1 || (score as number) > 5)) say(`experience.${key} must be 1..5 or null`);
      }
    }
  } else say('experience must be a list');
  if (!Array.isArray(record['ruleProblems'])) say('ruleProblems must be a list');
  if (!Array.isArray(record['rulesDeviations'])) say('rulesDeviations must be a list');
  return issues;
}
