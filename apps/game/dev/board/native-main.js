// mothership:dev-only
// Production screen/host over local Auth tokens and Firestore Rules. The initial journal
// is a legal synthetic setup; this entry does not prove native role randomness or Cloud Tasks.
globalThis[Symbol.for('mothership:dev-only')]=true;
import {createConnectedPlayerScreen,createConnectedTableScreen,createComicFeeds,documentPath,collectionPath,shellTokenStylesheet} from '@mothership/game';
import {renderComicPlayerShell,renderComicTableShell} from '@mothership/presentation';
import {nextDesignTokens} from '@mothership/design-tokens';
import {browserPorts,mountScreen} from '../../hosted/browser-host.js';
import {loadArt} from '../../hosted/art.mjs';
import '../../src/styles/shell.css';
import '../../hosted/preview.css';
import '../../hosted/comic-tokens.css';
import '../../hosted/comic.css';
import '../../hosted/comic-layout.css';
import '../../hosted/setup.css';
import '../../hosted/phone.css';
import '../../hosted/compact-phone.css';
import '../../hosted/board-play.css';
import '../../hosted/private-card.css';
import '../../hosted/scene-board.css';
import '../../hosted/ability-art.css';
import '../../hosted/phase-feedback.css';
import '../../hosted/claude-phone-kit.css';
import '../../hosted/board-v2.css';
import '../../hosted/setup-art.css';
const seat=new URLSearchParams(location.search).get('seat')??'display';
const context=await fetch(`http://127.0.0.1:19291/context?seat=${encodeURIComponent(seat)}`,{cache:'no-store'}).then(r=>r.json());
const display=seat==='display',base='http://127.0.0.1:18298/v1/projects/demo-mothership/databases/(default)/documents';
const headers={authorization:`Bearer ${context.identity.idToken}`,'content-type':'application/json'};
const decode=v=>v.nullValue!==undefined?null:v.stringValue??v.booleanValue??(v.integerValue!==undefined?Number(v.integerValue):v.doubleValue??(v.arrayValue?v.arrayValue.values?.map(decode)??[]:v.mapValue?Object.fromEntries(Object.entries(v.mapValue.fields??{}).map(([k,v])=>[k,decode(v)])):null));
const documentValue=v=>v?.fields?Object.fromEntries(Object.entries(v.fields).map(([k,v])=>[k,decode(v)])):null;
function polling(load,listener){let closed=false;async function tick(){try{const value=await load();if(!closed)listener.onSnapshot({value,fresh:true});}catch{if(!closed)listener.onError('failed');}if(!closed)setTimeout(tick,150);}void tick();return()=>{closed=true;};}
const transport={mode:'emulator',currentUid:()=>context.identity.uid,signIn:async()=>context.identity.uid,
 post:async(operation,body)=>{const response=await fetch('http://127.0.0.1:19291/'+operation,{method:'POST',headers,cache:'no-store',redirect:'error',body:JSON.stringify(body)});return response.json();},
 listenDocument(target,listener){return polling(async()=>{const r=await fetch(base+'/'+documentPath(target,context.identity.uid).join('/'),{headers,cache:'no-store'});if(r.status===404)return null;if(!r.ok)throw Error('Rules read refused: '+r.status);return documentValue(await r.json());},listener);},
 listenCollection(target,listener){return polling(async()=>{const path=collectionPath(target),collectionId=path.at(-1),parent=path.slice(0,-1).join('/');const conditions=[{fieldFilter:{field:{fieldPath:'audience.kind'},op:'EQUAL',value:{stringValue:display?'public':'player'}}},...(!display?[{fieldFilter:{field:{fieldPath:'audience.seatId'},op:'EQUAL',value:{stringValue:seat}}}]:[])];const query={structuredQuery:{from:[{collectionId}],where:conditions.length===1?conditions[0]:{compositeFilter:{op:'AND',filters:conditions}}}};const r=await fetch(base+'/'+parent+':runQuery',{method:'POST',headers,body:JSON.stringify(query)});if(!r.ok)throw Error('Rules event query refused: '+r.status);return(await r.json()).filter(x=>x.document).map(x=>({id:x.document.name.split('/').at(-1),data:documentValue(x.document)}));},listener);},
};
const style=document.createElement('style');style.textContent=shellTokenStylesheet(nextDesignTokens);document.head.append(style);await loadArt(display?'display':'player');
const ports=browserPorts(),options={transport,matchId:context.matchId,ports,host:{reload:()=>location.reload()}};
const screen=display?createConnectedTableScreen(options):createConnectedPlayerScreen({...options,seatId:seat,actionTiming:{recheckDelaysMs:[100,100,100]}});
const feeds=createComicFeeds({...options,...(display?{}:{seatId:seat})});
await transport.signIn();const render=display?renderComicTableShell:renderComicPlayerShell;
mountScreen({container:document.getElementById('app'),screen,render:(model,phone)=>render(model,{...phone,identities:feeds.identities()?.seats??[]}),subscribeExtra:l=>feeds.subscribe(l),onDispose:()=>feeds.dispose()});feeds.start();
window.__native={model:()=>screen.getFrame().model,context:{matchId:context.matchId,seat},status:()=>fetch('http://127.0.0.1:19291/status').then(r=>r.json())};
