// Reporting boundary only. Scenario adapters and any execution begin in issue #5.
export type ScenarioEvidence =
  | { readonly status: 'not-run'; readonly scenarioId: string }
  | { readonly status: 'blocked'; readonly scenarioId: string; readonly decisionIds: readonly string[] }
  | { readonly status: 'passed' | 'failed'; readonly scenarioId: string; readonly evidencePath: string };
