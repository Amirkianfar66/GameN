import type {SeatId,PlanetVersions} from '@mothership/contracts';
import type {PlanetScreenModel} from './model.js';

/** New library art belongs only to the reviewed new gameplay tuple. */
export function planetHasLibraryArt(v:PlanetVersions|null|undefined):boolean{
 return v?.protocolVersion===3&&v.engineVersion==='planet-game-1.1.0'&&v.rulesetVersion==='in-person-planet-private-feedback-2026-11-06'&&v.rulesetHash==='4a1fc0e0dc21255253e31ae46e6042f9bd71e3fdec0f82f8a79b3ce213d01bfa'&&(v.assetManifestVersion==='design-0.6.0'||v.assetManifestVersion==='design-0.7.0');
}
export function planetSupportsAssets(v:PlanetVersions):boolean{return v.assetManifestVersion==='design-0.5.0'||planetHasLibraryArt(v);}

/** Number labels never replace the canonical identities carried by a command. */
export function planetPlayerNumberChoices(ids:readonly SeatId[]):readonly {value:SeatId;label:string}[]{
 return ids.map(value=>({value,label:value.slice(5)})).sort((a,b)=>Number(a.label)-Number(b.label));
}

/** Only the patient's authorized request record supplies an outcome. */
export function planetPanelRequestText(record:NonNullable<PlanetScreenModel['privateArea']>['panelRequest']):string|null{
 if(!record)return null;
 const words={WRONG:'The number was wrong. Your panel attempt is used.',QUEUED:'Your request is queued. An injection was reserved; treatment is not confirmed.',TREATED:'Your panel request treated you.',NO_EFFECT:'Your queued panel request had no effect. Your attempt remains used.',DISCARDED:'Your queued panel request was discarded. Your attempt remains used.'};
 return `Round ${record.round}: ${words[record.status]}`;
}

/** Colored arrival artwork requires the matching authoritative terminal facts. */
export function planetTerminalArrival(model:Pick<PlanetScreenModel,'connection'|'concealed'|'phase'|'result'|'navigation'>):'Blue'|'Red'|null{
 if(model.connection!=='live'||model.concealed||model.phase?.kind!=='FINISHED'||!model.phase.trusted||model.result?.reason!=='ARRIVAL')return null;
 const side=model.navigation?.arrivedAt;
 return (side==='Blue'||side==='Red')&&model.result.winner===side?side:null;
}
