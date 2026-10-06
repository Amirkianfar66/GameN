// Reading and writing the materialized scenario files. One file per mode keeps the 7-, 8- and
// 9-player cases apart. A file lists its recorded setups once, by seed label, and every
// scenario names the setup it starts from.
import { readFileSync } from 'node:fs';
import { CATALOG_FILES } from './catalog.mjs';

export const SCENARIO_SCHEMA = 'mothership.balance.scenarios/1';
export const RULEBOOK_VERSION = 'rulebook-v1-2026-10-06-r3';
export const SOURCE_MANIFEST_SHA256 = '34e7c08cda13dcc329f7a1d5f7656ab59db1fc834460b5ad9d3590619b5479cc';
export const V1_RULESET_VERSION = 'in-person-v1-2026-10-06';
export const V1_OVERLAY_SHA256 = '6ca355ebf3553e24a16eae847f5b550b1d3da8bd0a2daf80f69ec94dd2809a90';
export const V1_OVERLAY_PATH = 'rules/overlays/in-person-v1-owner-decisions-2026-10-06.json';
// The reason a test gives when it needs that file and the checkout has none. The static check
// accepts a skip with exactly this reason, and only where it is told that the file is expected to be absent.
export const OVERLAY_ABSENT = 'the owner-decision file is not in this checkout';

const directory = new URL('./', import.meta.url);
export const scenarioFileUrl = group => new URL(CATALOG_FILES[group], directory);

function renderSetup(setup) {
  return [
    '{',
    `      "seed": ${JSON.stringify(setup.seed)},`,
    `      "playerCount": ${setup.playerCount},`,
    `      "roleOrder": ${JSON.stringify(setup.roleOrder)},`,
    `      "initialRooms": ${JSON.stringify(setup.initialRooms)},`,
    `      "codeExtraSeatIds": ${JSON.stringify(setup.codeExtraSeatIds)},`,
    '      "roundOrders": [',
    setup.roundOrders.map(order => `        ${JSON.stringify(order)}`).join(',\n'),
    '      ]',
    '    }',
  ].join('\n');
}

function renderScenario(scenario) {
  const lines = [
    `      "id": ${JSON.stringify(scenario.id)},`,
    `      "title": ${JSON.stringify(scenario.title)},`,
    `      "status": ${JSON.stringify(scenario.status)},`,
    `      "kind": ${JSON.stringify(scenario.kind)},`,
    `      "areas": ${JSON.stringify(scenario.areas)},`,
    `      "ruleRefs": ${JSON.stringify(scenario.ruleRefs)},`,
    `      "dependsOn": ${JSON.stringify(scenario.dependsOn)},`,
    `      "lineage": ${JSON.stringify(scenario.lineage)},`,
    `      "decisionIds": ${JSON.stringify(scenario.decisionIds)},`,
    `      "setup": ${JSON.stringify(scenario.setup === null ? null : scenario.setup.seed)},`,
    `      "note": ${JSON.stringify(scenario.note)},`,
    scenario.steps.length === 0 ? '      "steps": []' : `      "steps": [\n${scenario.steps.map(step => `        ${JSON.stringify(step)}`).join(',\n')}\n      ]`,
  ];
  return `    {\n${lines.join('\n')}\n    }`;
}

/** Deterministic text of one scenario file. */
export function renderFile(group, scenarios) {
  const setups = new Map();
  for (const scenario of scenarios) if (scenario.setup !== null) setups.set(scenario.setup.seed, scenario.setup);
  const count = status => scenarios.filter(scenario => scenario.status === status).length;
  const header = {
    schema: SCENARIO_SCHEMA,
    group,
    mode: group === 'unsupported' ? null : Number(group),
    rulebook: RULEBOOK_VERSION,
    pins: { sourceManifestSha256: SOURCE_MANIFEST_SHA256, rulesetVersion: V1_RULESET_VERSION, v1OverlaySha256: V1_OVERLAY_SHA256 },
    optionalPowers: false,
    generatedFrom: 'tests/scenarios/v1/catalog.mjs',
    execution: 'Declarative fixtures. Results of actual runs are in docs/balance/evidence/. A fixture is not a result.',
    counts: { total: scenarios.length, ready: count('ready'), blocked: count('blocked'), manual: count('manual') },
  };
  const head = Object.entries(header).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(',\n');
  const setupText = [...setups.entries()].map(([seed, setup]) => `    ${JSON.stringify(seed)}: ${renderSetup(setup)}`).join(',\n');
  return `{\n${head},\n  "setups": {\n${setupText}\n  },\n  "scenarios": [\n${scenarios.map(renderScenario).join(',\n')}\n  ]\n}\n`;
}

/** Parse a scenario file back into self-contained scenarios. */
export function parseFile(text) {
  const file = JSON.parse(text);
  const group = file.group === 'unsupported' ? 'unsupported' : `mode-${file.mode}`;
  const scenarios = file.scenarios.map(item => ({
    id: item.id, group, mode: file.mode, title: item.title, status: item.status, kind: item.kind, areas: item.areas,
    ruleRefs: item.ruleRefs, dependsOn: item.dependsOn, lineage: item.lineage, decisionIds: item.decisionIds, optionalPowers: file.optionalPowers,
    setup: item.setup === null ? null : file.setups[item.setup] ?? null, steps: item.steps, note: item.note,
  }));
  return { header: { ...file, setups: undefined, scenarios: undefined }, setups: file.setups, scenarios };
}

export function loadGroup(group) {
  return parseFile(readFileSync(scenarioFileUrl(group), 'utf8'));
}

export const GROUPS = ['7', '8', '9', 'unsupported'];

export function loadAll() {
  return GROUPS.flatMap(group => loadGroup(group).scenarios);
}

// The reviewed list of fixtures that are not ready. The report gate holds the catalogue against it.
export const EXCEPTIONS_PATH = 'tests/scenarios/v1/exceptions.json';

export function loadExceptions() {
  return JSON.parse(readFileSync(new URL('exceptions.json', directory), 'utf8'));
}
