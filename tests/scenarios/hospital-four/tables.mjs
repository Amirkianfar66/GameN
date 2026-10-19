// The tables of docs/balance/hospital-four.md, as text. The materialize command writes them into
// the document between generated markers, and its check fails when the document differs. Every
// number in them comes from the record, the check catalogue or the committed report.
import { LINES, MODES, REQUIREMENTS, SOURCES, linesFor } from './checks.mjs';
import { EVIDENCE_COMMITTED, REPORT_PATH, loadRecord, loadReport } from './files.mjs';

const row = cells => `| ${cells.join(' | ')} |`;
const table = (head, rows) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const code = value => `\`${value}\``;
const link = path => `[${path}](../../${path})`;
const KIND = { contract: 'Contract', native: 'Native', constructed: 'Constructed' };

export function pinsTable(record = loadRecord()) {
  const pins = record.pins;
  return table(['Pin', 'Value'], [
    ['Protocol', String(pins.protocolVersion)], ['Engine', code(pins.engineVersion)], ['Ruleset', code(pins.rulesetVersion)],
    ['Rules hash, the SHA-256 of the overlay', code(pins.rulesetHash)], ['Logical layout', code(pins.layout)], ['Art', code(pins.art)],
    ['Parent ruleset', code(pins.parentRuleset)],
  ]);
}

export function sourcesTable(record = loadRecord()) {
  const canonical = record.canonical;
  return table(['File', 'SHA-256', 'What it is'], [
    [link(canonical.overlay.path), code(canonical.overlay.sha256), `The canonical rule, decisions ${canonical.overlay.decisions.join(', ')}`],
    [link(canonical.ownerEvidence.path), code(canonical.ownerEvidence.sha256), 'The owner\'s decision of 18 October and the clarification, as recorded'],
    [link(canonical.runtimeContract.path), code(canonical.runtimeContract.sha256), 'Backend\'s runtime contract: the checkpoint, the four constructed regression expectations, the consumer boundary'],
    [link(canonical.backendVerification.path), code(canonical.backendVerification.sha256), 'Backend\'s own verification and its limits. Backend\'s evidence, not this record\'s'],
    [link(canonical.keptRules.path), '', `The rules the tuple keeps that the checks also cite: ${canonical.keptRules.decisions.join(', ')}`],
  ]);
}

export function implementationTable(record = loadRecord()) {
  const implementation = record.implementation;
  return table(['', ''], [
    ['Pull request', `[#${implementation.pullRequest}](https://github.com/Amirkianfar66/GameN/pull/${implementation.pullRequest}), branch ${code(implementation.branch)}`],
    ['Final head', code(implementation.finalHead)], ['Tested source', code(implementation.testedSource)], ['Base', code(implementation.base)],
    ['Status', implementation.status],
  ]);
}

export function coverageTable() {
  const covering = (requirement, mode) => {
    const lines = linesFor(mode).filter(line => line.covers.includes(requirement) || (line.kind !== 'contract' && ['beds', 'replay'].includes(requirement)));
    const of = kind => lines.filter(line => line.kind === kind).map(line => line.id);
    return [['native', of('native')], ['constructed', of('constructed')], ['contract', of('contract')]]
      .filter(([, ids]) => ids.length > 0).map(([kind, ids]) => `${kind}: ${ids.join(', ')}`).join('; ') || 'none';
  };
  return table(['What is verified', ...MODES.map(mode => `${mode} players`)], REQUIREMENTS.map(requirement => [requirement.text, ...MODES.map(mode => covering(requirement.id, mode))]));
}

export function sourceTable() {
  return table(['Source', 'Where'], Object.entries(SOURCES).map(([id, where]) => [id, where]));
}

export function resultsTable(report = EVIDENCE_COMMITTED ? loadReport() : null) {
  if (report === null) return 'No report is committed: nothing has been run for this record yet.';
  return table(['Players', 'Line', 'Kind', 'Claims passed', 'Result'], MODES.flatMap(mode => report.modes[mode].lines.map(result =>
    [String(mode), result.line, KIND[result.kind], `${result.claims.filter(item => item.passed).length} of ${result.claims.length}`, result.status === 'error' ? `error: ${result.error}` : result.status])));
}

export function claimsSection(report = EVIDENCE_COMMITTED ? loadReport() : null) {
  return LINES.map(line => {
    const results = Object.fromEntries(MODES.map(mode => [mode, report?.modes[mode].lines.find(item => item.line === line.id) ?? null]));
    const first = MODES.map(mode => results[mode]).find(item => item !== null);
    const claims = first ? first.claims : [];
    const cell = (mode, id) => {
      if (!line.modes.includes(mode)) return '';
      const result = results[mode];
      if (result === null) return 'not run';
      const claim = result.claims.find(item => item.id === id);
      return claim === undefined ? 'missing' : claim.passed ? 'passed' : 'FAILED';
    };
    const header = `#### ${line.id}: ${line.title}\n\n${KIND[line.kind]}; ${line.modes.length === 3 ? 'seven, eight and nine players' : `${line.modes.join(' and ')} players only`}.`;
    const how = first?.constructed?.length ? ` Constructed state: ${first.constructed.join('; ')}.` : '';
    if (claims.length === 0) return `${header}${how} No result is committed.`;
    return `${header}${how}\n\n${table(['Claim', 'Sources', ...MODES.map(mode => `${mode}`)], claims.map(claim => [claim.text, claim.sources.join(', '), ...MODES.map(mode => cell(mode, claim.id))]))}`;
  }).join('\n\n');
}

export function verdict(report = EVIDENCE_COMMITTED ? loadReport() : null) {
  if (report === null) return 'Nothing has been run for this record yet.';
  const results = MODES.flatMap(mode => report.modes[mode].lines);
  const claims = results.flatMap(result => result.claims);
  const failed = results.filter(result => result.status !== 'passed');
  const perMode = MODES.map(mode => `${report.modes[mode].lines.length} with ${mode} players`).join(', ');
  return `Run on ${report.generatedAt.slice(0, 10)} from a clean clone at ${code(report.pins.commit)}, against the engine, contracts and service of that commit, which are byte for byte those of the tested source ${code(report.pins.testedSource)}. ${results.length} line runs (${perMode}), ${claims.length} claims: ${failed.length === 0 ? 'all passed. No line failed or stopped with an error.' : `${failed.length} line runs did not pass: ${failed.map(result => `${result.line} with ${result.mode} players`).join(', ')}.`} The report is ${link(REPORT_PATH)}.`;
}

export const DOCUMENT_TABLES = () => ({
  pins: pinsTable(), sources: sourcesTable(), implementation: implementationTable(), coverage: coverageTable(), 'source-ids': sourceTable(),
  verdict: verdict(), results: resultsTable(), claims: claimsSection(),
});

/** Replaces the text between each pair of generated markers by its table. */
export function fillGenerated(text, tables) {
  let out = text;
  for (const [name, body] of Object.entries(tables)) {
    const start = `<!-- generated:${name} -->`, end = `<!-- /generated:${name} -->`;
    const from = out.indexOf(start), to = out.indexOf(end);
    if (from === -1 || to === -1 || to < from) throw new Error(`the document has no generated block ${name}`);
    out = `${out.slice(0, from + start.length)}\n${body}\n${out.slice(to)}`;
  }
  return out;
}
