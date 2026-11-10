import {PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS,PLANET_BLACKOUT_PINS} from '@mothership/contracts';
import type {SeatId,PlanetVersions} from '@mothership/contracts';
import type {PlanetScreenModel,PlanetView} from './model.js';

const matches=(v:PlanetVersions|null|undefined,pins:Omit<PlanetVersions,'assetManifestVersion'>)=>!!v&&Object.entries(pins).every(([key,value])=>v[key as keyof PlanetVersions]===value);
export const planetHasPrivateOffers=(v:PlanetVersions|null|undefined):boolean=>[PLANET_PHONE_OFFER_PINS,PLANET_BLACKOUT_PINS].some(p=>matches(v,p));
export const planetHasPrivateFeedback=(v:PlanetVersions|null|undefined):boolean=>[PLANET_GAME_PINS,PLANET_PHONE_OFFER_PINS,PLANET_BLACKOUT_PINS].some(p=>matches(v,p));

/** New library art belongs only to the reviewed new gameplay tuple. */
export function planetHasLibraryArt(v:PlanetVersions|null|undefined):boolean{
 return planetHasPrivateFeedback(v)&&(v?.assetManifestVersion==='design-0.6.0'||v?.assetManifestVersion==='design-0.7.0'||v?.assetManifestVersion==='design-0.8.0');
}
export function planetSupportsAssets(v:PlanetVersions):boolean{return v.assetManifestVersion==='design-0.5.0'||planetHasLibraryArt(v);}

/** Publication metadata names the last shared board, including on PLAYER_CURRENT. */
export function planetBoardLabel(view:Pick<PlanetView,'versions'|'board'>):string|null{
 const board=view.board;
 if(!matches(view.versions,PLANET_BLACKOUT_PINS))return board.kind==='FINALIZED'?`Last finalized board · Round ${board.finalizedRound}`:null;
 if(!board.checkpoint)return null;
 const labels={INITIAL:'Initial board',PRE_BLACKOUT:`Before Blackout · Round ${board.finalizedRound}`,AFTER_BLACKOUT:`After Blackout · Round ${board.finalizedRound}`,ROUND_FINALIZED:`Round ${board.finalizedRound} complete`};
 const shared=labels[board.checkpoint];
 return board.kind==='FINALIZED'?shared:`Current board · shared: ${shared}`;
}

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
