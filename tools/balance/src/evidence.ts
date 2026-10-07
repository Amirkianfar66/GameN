import type { EnginePins } from './model.js';
import { summarize } from './runner.js';
import type { RunSummary, ScenarioRun } from './runner.js';
import type { ScenarioGroup } from './scenario.js';

// Reporting boundary established by bootstrap #1. A scenario is never reported as passed
// unless it was executed and an evidence artifact exists.
export type ScenarioEvidence =
  | { readonly status: 'not-run'; readonly scenarioId: string }
  | { readonly status: 'blocked'; readonly scenarioId: string; readonly decisionIds: readonly string[] }
  | { readonly status: 'passed' | 'failed'; readonly scenarioId: string; readonly evidencePath: string };

export function toEvidence(run: ScenarioRun, evidencePath: string): ScenarioEvidence {
  if (run.status === 'blocked') return { status: 'blocked', scenarioId: run.scenarioId, decisionIds: run.decisionIds };
  if (run.status === 'not-run') return { status: 'not-run', scenarioId: run.scenarioId };
  return { status: run.status, scenarioId: run.scenarioId, evidencePath };
}

export interface RunPins {
  repository: string;
  baseCommit: string;
  branch: string;
  workingTreeCommit: string;
  sourceManifestSha256: string;
  ruleSourceHashes: Record<string, string>;
  v1OverlaySha256: string | null;
  // The combined Version 1 manifest of the engine's checkout, where it exists.
  v1ManifestSha256: string | null;
  scenarioFileHashes: Record<string, string>;
  rulebookSha256: string;
  engine: EnginePins | null;
  engineCommit: string | null;
  // How the commit is known: read from Git, here or in the engine's own checkout, or only stated.
  engineCommitBasis: string;
  engineTreeClean: boolean | null;
  // One digest of the built engine and contracts modules that were loaded.
  engineBuildSha256: string | null;
  engineOrigin: string;
  runner: string;
  node: string;
  generatedAt: string;
}

export interface EvidenceReport {
  schema: 'mothership.balance.scenario-run/1';
  pins: RunPins;
  totals: RunSummary;
  // Modes are reported separately and never pooled.
  byGroup: Record<ScenarioGroup, RunSummary>;
  runs: ScenarioRun[];
}

const GROUPS: readonly ScenarioGroup[] = ['mode-7', 'mode-8', 'mode-9', 'unsupported'];

export function buildReport(runs: readonly ScenarioRun[], pins: RunPins): EvidenceReport {
  const byGroup = Object.fromEntries(GROUPS.map(group => [group, summarize(runs.filter(run => run.group === group))])) as Record<ScenarioGroup, RunSummary>;
  // Keep the committed artifact small: end-state digests are compared in memory, not stored.
  return {
    schema: 'mothership.balance.scenario-run/1', pins, totals: summarize(runs), byGroup,
    runs: runs.map(run => ({ ...run, finalDigest: null })),
  };
}
