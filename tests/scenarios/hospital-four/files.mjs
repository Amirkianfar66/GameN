// Where the record, the document and the evidence of the four-bed Hospital are, and how they are read.
import { existsSync, readFileSync } from 'node:fs';

const repository = new URL('../../../', import.meta.url);
export const repositoryUrl = path => new URL(path, repository);
export const RECORD_URL = repositoryUrl('tests/scenarios/hospital-four/record.json');
export const DOCUMENT_URL = repositoryUrl('docs/balance/hospital-four.md');
export const CHECK_SOURCES = ['tests/scenarios/hospital-four/checks.mjs', 'tests/scenarios/hospital-four/driver.mjs'];
export const REPORT_SCHEMA = 'mothership.balance.hospital-four/1';
export const REPORT_PATH = 'docs/balance/evidence/2026-10-19-hospital-four.json';
// True from the commit that carries the report. Before it, the document says that nothing was
// run, and a test refuses a report that is lying about.
export const EVIDENCE_COMMITTED = false;

export const loadRecord = () => JSON.parse(readFileSync(RECORD_URL, 'utf8'));
export const loadReport = () => (existsSync(repositoryUrl(REPORT_PATH)) ? JSON.parse(readFileSync(repositoryUrl(REPORT_PATH), 'utf8')) : null);
