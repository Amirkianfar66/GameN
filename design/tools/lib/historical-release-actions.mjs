// mothership:dev-only
// The frozen design-0.3.0 / engine1.5 release, independent of newer supported
// mechanics. Successor entries reserve validation names, never art acceptance.
export const HISTORICAL_RELEASE_PINS=Object.freeze({protocolVersion:2,engineVersion:'full-game-1.5.0',
  rulesetVersion:'in-person-v1-declared-hack-2026-10-12',rulesetHash:'1d8a5e509372ea816af8d6782bf1d73720532ed672ee2f77e2938805976d8d6c'});
export const HISTORICAL_RELEASE_ACTIONS=Object.freeze({
  'declare-hack-side':'DECLARE_HACK_SIDE',pass:'PASS_TURN',move:'MOVE',shot:'REGISTER_SHOT',disable:'DISABLE',protect:'PROTECT',rescue:'RESCUE',
  scan:'SCAN',supply:'SUPPLY',hack:'REQUEST_HACK',code:'SUBMIT_CODE','showdown-shot':'SHOWDOWN_SHOT',vote:'VOTE','release-choice':'RELEASE_CHOICE','release-vote':'RELEASE_VOTE',
});
export const KNOWN_SUCCESSOR_COMMANDS=Object.freeze({CAPTAIN_RELEASE:'full-game-1.8.0',CAPTAIN_EJECT:'full-game-1.8.0',
  REQUEST_BLACKOUT:'full-game-1.9.0',SELECT_BLACKOUT_SLOT:'full-game-1.9.0',ACTIVATE_CLONE:'full-game-1.10.0'});
// Add exact affected-consumer kind names only with its reviewed adoption patch.
export const KNOWN_SUCCESSOR_ACTIONS=Object.freeze({'captain-release':'CAPTAIN_RELEASE','captain-eject':'CAPTAIN_EJECT',
  'blackout-request':'REQUEST_BLACKOUT','blackout-slot':'SELECT_BLACKOUT_SLOT'});
export function historicalReleaseCoverageProblems(coverage,kinds,commands,manifest) {
  const problems=[];
  const pins=manifest.gameplayPins;
  if(manifest.manifestVersion!=='design-0.3.0' || pins===null || typeof pins!=='object' || Array.isArray(pins)
    || Object.keys(pins).sort().join(',')!==Object.keys(HISTORICAL_RELEASE_PINS).sort().join(',')
    || !Object.entries(HISTORICAL_RELEASE_PINS).every(([key,value])=>pins[key]===value))problems.push('historical art gameplay tuple differs');
  for(const [kind,command] of Object.entries(HISTORICAL_RELEASE_ACTIONS)) {
    if(!kinds.includes(kind))problems.push(`historical action ${kind} removed from production reader`);
    if(!commands.includes(command))problems.push(`historical command ${command} removed from schema`);
    if(!coverage.actions.some(action=>action.kind===kind))problems.push(`action ${kind} of the release is not covered`);
    if(!coverage.actions.some(action=>action.command===command))problems.push(`command ${command} is not covered`);
    if(coverage.actions.some(action=>action.kind===kind && action.command!==command))problems.push(`historical action ${kind} has the wrong command`);
  }
  for(const kind of kinds)if(!Object.hasOwn(HISTORICAL_RELEASE_ACTIONS,kind) && !Object.hasOwn(KNOWN_SUCCESSOR_ACTIONS,kind))problems.push(`unreviewed successor action ${kind}`);
  for(const kind of kinds)if(Object.hasOwn(KNOWN_SUCCESSOR_ACTIONS,kind) && !commands.includes(KNOWN_SUCCESSOR_ACTIONS[kind]))problems.push(`successor action ${kind} has no reviewed command`);
  for(const command of commands)if(!Object.values(HISTORICAL_RELEASE_ACTIONS).includes(command) && !Object.hasOwn(KNOWN_SUCCESSOR_COMMANDS,command))problems.push(`unreviewed successor command ${command}`);
  for(const action of coverage.actions)if(!Object.hasOwn(HISTORICAL_RELEASE_ACTIONS,action.kind))problems.push(`action ${action.kind} is not an action of the release`);
  return problems;
}
