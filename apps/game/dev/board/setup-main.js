// mothership:dev-only
// Real native setup components over explicit synthetic prepared setup/identity documents.
globalThis[Symbol.for('mothership:dev-only')]=true;
import {CLONE_VERSION_PINS,FullSetupDocumentSchema,FullSetupPlayerViewSchema} from '@mothership/contracts';
import {shellTokenStylesheet} from '@mothership/game';
import {nextDesignTokens} from '@mothership/design-tokens';
import {createPlayerSetup} from '../../hosted/setup-controls.js';
import {loadArt} from '../../hosted/art.mjs';
import '../../src/styles/shell.css';
import '../../hosted/preview.css';
import '../../hosted/comic-tokens.css';
import '../../hosted/comic.css';
import '../../hosted/comic-layout.css';
import '../../hosted/setup.css';
import '../../hosted/phone.css';
import '../../hosted/compact-phone.css';
import '../../hosted/ability-art.css';
import '../../hosted/setup-art.css';
const style=document.createElement('style');style.textContent=shellTokenStylesheet(nextDesignTokens);document.head.append(style);await loadArt('player');
const start=Date.now(),matchId='synthetic-setup-art',seatId='seat-1',listeners=new Set(),calls=[];
let now=start+200,stage='choosing',confirmed=false,ready=false,own=null,revision=1;
const identities={seats:[{seatId,displayName:'Own fixture',characterId:null},{seatId:'seat-2',displayName:'Taken fixture',characterId:'c2'}]};
const publish=()=>{revision++;for(const f of listeners)f();};const subscribe=f=>{listeners.add(f);return()=>listeners.delete(f);};
const setupDocument=()=>FullSetupDocumentSchema.parse({schemaVersion:1,protocolVersion:2,lifecycleVersion:'staged-start-1',matchId,playerCount:9,revision,stage,dealId:stage==='choosing'?null:'deal-setup',setupId:'setup-art-choice',choosingStartedAt:start,choosingEndsAt:start+30000,readingStartedAt:stage==='choosing'?null:start+30000,readingEndsAt:stage==='choosing'?null:start+60000,seats:Array.from({length:9},(_,i)=>({seatId:`seat-${i+1}`,confirmed:stage==='choosing'?i===0?confirmed:i===1:true,ready:i===0&&ready}))});
const el=(tag,text,attrs={})=>{const n=globalThis.document.createElement(tag);if(text!==undefined)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const setup=createPlayerSetup({matchId,seatId,el,feed:{public:setupDocument,binding:()=>({bindingRevision:1}),own:()=>own,subscribe},identities:{identities:()=>identities,subscribe},clock:{setActive:()=>{},read:()=>({status:'synced',serverNowMs:now})},lifecycle:{unsettled:()=>null,abandon:()=>{}},api:{confirmSetupChoice:async body=>{calls.push(body);identities.seats[0].characterId=body.characterId;confirmed=true;publish();return{revision};},readyForMatch:async body=>{calls.push(body);ready=true;publish();return{revision};}},operate:async(key,build,deliver)=>({kind:'done',result:await deliver(build(crypto.randomUUID()))})});
globalThis.document.getElementById('app').append(setup.node);window.addEventListener('blur',()=>setup.conceal());
window.__setup={calls,reading(){stage='awaiting-ready';now=start+30001;own=FullSetupPlayerViewSchema.parse({schemaVersion:1,protocolVersion:2,lifecycleVersion:'staged-start-1',versions:{...CLONE_VERSION_PINS,assetManifestVersion:'design-0.4.0'},matchId,playerCount:9,dealId:'deal-setup',bindingRevision:1,audience:{kind:'player',seatId},self:{seatId,role:'Hacker'}});publish();},dispose:()=>setup.dispose()};
