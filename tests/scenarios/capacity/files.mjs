// Reading and writing the materialized room-capacity fixtures. One file per mode, as in the
// Version 1 catalogue, in the same format.
import { readFileSync } from 'node:fs';
import { parseFile, renderFile, RULEBOOK_VERSION, SOURCE_MANIFEST_SHA256 } from '../v1/files.mjs';
import { CAPACITY_FILES } from './catalog.mjs';

// The ruleset that carries the rule, as Backend named it in issue #96 on 11 October 2026. A run of
// this suite asks the engine for this ruleset, and an engine that does not name it runs nothing.
export const CAPACITY_RULESET_VERSION = 'in-person-v1-capacity-2026-10-11';
// Where the rule is recorded. The decision is the owner's; these are its two written records.
export const CAPACITY_DECISION = {
  issue: 'https://github.com/Amirkianfar66/GameN/issues/96',
  record: 'docs/design/owner-decisions.md',
  recordCommit: 'e01bbd7daf873a514948021b89098c8459bae19d',
  recordSha256: '28addfef446053a74b7047a361fad77fa925abd3125e0a7e7ef34d222bdaa682',
};
// The rows the fixtures cite beside the rulebook's are in this document.
export const CAPACITY_RULES_PATH = 'docs/balance/capacity-audit.md';
export const CAPACITY_SUITE = 'room-capacity';

const directory = new URL('./', import.meta.url);
export const capacityFileUrl = group => new URL(CAPACITY_FILES[group], directory);
export const GROUPS = ['7', '8', '9'];

/** Deterministic text of one capacity file. */
export function renderCapacityFile(group, scenarios) {
  return renderFile(group, scenarios, {
    schema: 'mothership.balance.scenarios/1',
    suite: CAPACITY_SUITE,
    group,
    mode: Number(group),
    rulebook: RULEBOOK_VERSION,
    capacityRules: CAPACITY_RULES_PATH,
    pins: { sourceManifestSha256: SOURCE_MANIFEST_SHA256, rulesetVersion: CAPACITY_RULESET_VERSION, roomCapacity: 5, ownerDecision: CAPACITY_DECISION },
    optionalPowers: false,
    generatedFrom: 'tests/scenarios/capacity/catalog.mjs',
    execution: 'Declarative fixtures. Results of actual runs are in docs/balance/evidence/. A fixture is not a result.',
  });
}

export function loadGroup(group) {
  return parseFile(readFileSync(capacityFileUrl(group), 'utf8'));
}

export function loadAll() {
  return GROUPS.flatMap(group => loadGroup(group).scenarios);
}
