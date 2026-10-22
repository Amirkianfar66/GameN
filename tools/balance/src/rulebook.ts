// Reads the consolidated rulebook (docs/balance/game-rules.md) and the decision register
// (docs/balance/rules-audit-v1.md) so that every rule, source pointer and scenario reference
// can be checked mechanically. The Markdown tables are the single authored copy.

export const RULE_STATUSES = ['CONFIRMED', 'OWNER-V1', 'DERIVED', 'CONDUCT', 'OPEN'] as const;
export type RuleStatus = typeof RULE_STATUSES[number];

// RESOLVED: an approved decision or a confirmed source states it. READING: the approved sources
// give the answer when read closely; no approval is asked. OPEN: an open rule edge that no
// approved source answers. DEFERRED: outside Version 1.
export const DECISION_STATUSES = ['RESOLVED', 'READING', 'OPEN', 'DEFERRED'] as const;
export type DecisionStatus = typeof DECISION_STATUSES[number];

export interface SourceRef {
  raw: string;
  kind: 'pointer' | 'v1' | 'rule' | 'decision' | 'issue';
  key: string;
  pointer: string;
}

export interface RuleEntry {
  id: string;
  section: string;
  text: string;
  status: RuleStatus;
  refs: SourceRef[];
  line: number;
}

export interface DecisionEntry {
  id: string;
  topic: string;
  status: string;
  resolution: string;
  line: number;
}

export interface ParsedTable<T> {
  entries: T[];
  issues: string[];
}

function cells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
  return trimmed.slice(1, -1).split('|').map(cell => cell.trim());
}

export function parseRef(raw: string): SourceRef | null {
  if (/^R-[A-Z]+-\d{2}$/.test(raw)) return { raw, kind: 'rule', key: raw, pointer: '' };
  if (/^D\d{2}$/.test(raw)) return { raw, kind: 'decision', key: raw, pointer: '' };
  if (/^#\d+$/.test(raw)) return { raw, kind: 'issue', key: raw, pointer: '' };
  const v1 = /^v1#(V1-\d{2})$/.exec(raw);
  if (v1 !== null) return { raw, kind: 'v1', key: 'v1', pointer: v1[1] as string };
  // `v1#/field` points into the owner-decision file itself, for example its optional_powers flag.
  const pointer = /^([a-z][a-z0-9_]*)#(\/.*)?$/.exec(raw);
  if (pointer !== null) return { raw, kind: 'pointer', key: pointer[1] as string, pointer: pointer[2] ?? '' };
  return null;
}

function backticked(cell: string): string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map(match => match[1] as string);
}

function citesOwnerFileOf(entry: RuleEntry): boolean {
  return entry.refs.some(ref => ref.kind === 'v1' || (ref.kind === 'pointer' && ref.key === 'v1'));
}

export function parseRulebook(markdown: string): ParsedTable<RuleEntry> {
  const entries: RuleEntry[] = [];
  const issues: string[] = [];
  let section = '';
  markdown.split('\n').forEach((line, index) => {
    const heading = /^##+\s+(.*)$/.exec(line);
    if (heading !== null) { section = (heading[1] as string).trim(); return; }
    if (!/^\|\s*R-[A-Z]+-\d{2}\s*\|/.test(line)) return;
    const row = cells(line);
    const id = row[0] ?? '';
    if (row.length !== 4) { issues.push(`${id}: a rule row needs exactly four cells (line ${index + 1})`); return; }
    const status = row[2] as RuleStatus;
    if (!RULE_STATUSES.includes(status)) { issues.push(`${id}: unknown status "${row[2] ?? ''}" (line ${index + 1})`); return; }
    const refs: SourceRef[] = [];
    for (const raw of backticked(row[3] ?? '')) {
      const ref = parseRef(raw);
      if (ref === null) issues.push(`${id}: unreadable reference \`${raw}\` (line ${index + 1})`);
      else refs.push(ref);
    }
    if (entries.some(entry => entry.id === id)) issues.push(`${id}: duplicate rule identifier (line ${index + 1})`);
    if ((row[1] ?? '').length === 0) issues.push(`${id}: empty rule text (line ${index + 1})`);
    entries.push({ id, section, text: row[1] ?? '', status, refs, line: index + 1 });
  });
  for (const entry of entries) {
    const kinds = entry.refs.map(ref => ref.kind);
    const sourced = kinds.includes('pointer') || kinds.includes('v1');
    const pinned = entry.refs.some(ref => ref.kind === 'pointer' && ref.key !== 'v1');
    if (entry.status === 'CONFIRMED' && !pinned) issues.push(`${entry.id}: CONFIRMED needs a pointer into a pinned rule source`);
    if (entry.status === 'CONFIRMED' && citesOwnerFileOf(entry)) issues.push(`${entry.id}: a rule that rests on the owner decision is OWNER-V1, not CONFIRMED`);
    const citesOwnerFile = kinds.includes('v1') || entry.refs.some(ref => ref.kind === 'pointer' && ref.key === 'v1');
    if (entry.status === 'OWNER-V1' && !citesOwnerFile) issues.push(`${entry.id}: OWNER-V1 needs a reference into the owner decision`);
    if (entry.status === 'DERIVED' && !sourced && !kinds.includes('rule')) issues.push(`${entry.id}: DERIVED needs the rules or sources it follows from`);
    if (entry.status === 'CONDUCT' && !sourced) issues.push(`${entry.id}: CONDUCT needs its source`);
    if (entry.status === 'OPEN' && !kinds.includes('decision')) issues.push(`${entry.id}: OPEN needs its decision identifier`);
    if (entry.status !== 'OPEN' && entry.status !== 'DERIVED' && kinds.includes('decision')) issues.push(`${entry.id}: only OPEN rules and DERIVED readings cite a decision`);
  }
  const known = new Set(entries.map(entry => entry.id));
  for (const entry of entries) {
    for (const ref of entry.refs) {
      if (ref.kind === 'rule' && !known.has(ref.key)) issues.push(`${entry.id}: cites unknown rule ${ref.key}`);
    }
  }
  return { entries, issues };
}

export function parseDecisionRegister(markdown: string): ParsedTable<DecisionEntry> {
  const entries: DecisionEntry[] = [];
  const issues: string[] = [];
  markdown.split('\n').forEach((line, index) => {
    if (!/^\|\s*D\d{2}\s*\|/.test(line)) return;
    const row = cells(line);
    const id = row[0] ?? '';
    if (row.length !== 4) { issues.push(`${id}: a decision row needs exactly four cells (line ${index + 1})`); return; }
    if (entries.some(entry => entry.id === id)) { issues.push(`${id}: duplicate decision identifier (line ${index + 1})`); return; }
    const status = row[2] ?? '';
    if (!(DECISION_STATUSES as readonly string[]).includes(status)) issues.push(`${id}: status must be one of ${DECISION_STATUSES.join(', ')} (line ${index + 1})`);
    entries.push({ id, topic: row[1] ?? '', status, resolution: row[3] ?? '', line: index + 1 });
  });
  return { entries, issues };
}

/** RFC 6901 JSON Pointer lookup. An empty pointer names the whole document. */
export function resolvePointer(document: unknown, pointer: string): { found: boolean; value: unknown } {
  if (pointer === '') return { found: true, value: document };
  if (!pointer.startsWith('/')) return { found: false, value: undefined };
  let current: unknown = document;
  for (const token of pointer.slice(1).split('/')) {
    const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!/^\d+$/.test(key) || index >= current.length) return { found: false, value: undefined };
      current = current[index];
    } else if (current !== null && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else return { found: false, value: undefined };
  }
  return { found: true, value: current };
}
