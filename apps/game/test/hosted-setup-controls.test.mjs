import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlayerSetup, createSetupProgress } from '../hosted/setup-controls.js';
class Node {
  constructor(tag,text,attrs={}) { Object.assign(this,{tag,textContent:text??'',attrs:{...attrs},children:[],handlers:{},hidden:false,disabled:false,innerHTML:'',value:''}); }
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;this.innerHTML='';}
  setAttribute(key,value){this.attrs[key]=value;}
  getAttribute(key){return this.attrs[key];}
  addEventListener(key,value){this.handlers[key]=value;}
  async press(){if(!this.disabled&&!this.hidden)await this.handlers.click?.();}
  async enter(value){this.value=value;await this.handlers.input?.();}
}
function make() {
  const nodes=new Map(),listeners=new Set(),calls=[],kept=new Map();
  let setup=null,binding={bindingRevision:1},own=null,outcome='done';
  const doc={seats:[{seatId:'seat-1',displayName:'Previous',characterId:'c1'},{seatId:'seat-2',displayName:'Bot',characterId:'c2'}]};
  const el=(tag,text,attrs)=>{const node=new Node(tag,text,attrs);if(attrs?.id)nodes.set(attrs.id,node);if(attrs?.['data-character'])nodes.set(attrs['data-character'],node);return node;};
  const subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
  const control=createPlayerSetup({matchId:'setup-match',seatId:'seat-1',el,
    feed:{public:()=>setup,binding:()=>binding,own:()=>own,subscribe},identities:{identities:()=>doc,practice:()=>({botSeatIds:['seat-2']}),subscribe},
    lifecycle:{unsettled:key=>kept.get(key)??null,abandon:key=>{kept.delete(key);return true;}},
    api:{confirmSetupChoice:async request=>{calls.push(request);},readyForMatch:async request=>{calls.push(request);}},
    operate:async(key,build,call)=>{const request=kept.get(key)?.request??build(`request-${calls.length+1}`);await call(request);
      if(outcome==='unsettled'){kept.set(key,{request});return{kind:'unsettled'};}kept.delete(key);
      return outcome==='taken'?{kind:'refused',code:'CHARACTER_TAKEN'}:{kind:'done',result:{revision:setup.revision+1}};},
  });
  const publish=(stage,confirmed=false,ready=false)=>{setup=stage?{stage,dealId:stage==='awaiting-ready'?'deal-1':null,playerCount:7,revision:2,seats:[{seatId:'seat-1',confirmed,ready}]}:null; for(const listener of listeners)listener();};
  return{control,nodes,calls,publish,el,takeCharacter(id){doc.seats[1].characterId=id;for(const listener of listeners)listener();},outcome:value=>{outcome=value;},role(value){own=value;for(const listener of listeners)listener();},binding(value){binding=value;for(const listener of listeners)listener();}};
}
const role={dealId:'deal-1',bindingRevision:1,self:{role:'Hacker'}};
test('one available character tap submits the pair only after the host starts selection',async()=>{
  const s=make();s.publish('lobby');await s.nodes.get('c3').press();assert.equal(s.calls.length,0);
  s.publish('choosing');assert.equal(s.nodes.get('c2').disabled,true);
  await s.nodes.get('c3').press();assert.equal(s.calls.length,1);
  assert.equal(s.calls[0].characterId,'c3');assert.equal(s.calls[0].displayName,'Previous');assert.equal(s.calls[0].bindingRevision,1);
  await s.nodes.get('c4').press();assert.equal(s.calls.length,1);
  s.publish('choosing',true);assert.equal(s.nodes.get('crew-save').hidden,true);
  for(let i=1;i<=9;i++)assert.equal(s.nodes.get(`c${i}`).disabled,true);
  s.control.dispose();
});
test('uncertain confirmation freezes the grid and retries the exact request until a definitive conflict',async()=>{
  const s=make();s.publish('choosing');s.outcome('unsettled');await s.nodes.get('c3').press();
  assert.equal(s.nodes.get('c4').disabled,true);assert.equal(s.nodes.get('crew-save').hidden,false);
  await s.nodes.get('crew-save').press();assert.deepEqual(s.calls[0],s.calls[1]);
  s.outcome('taken');await s.nodes.get('crew-save').press();assert.match(s.nodes.get('crew-status').textContent,/Taken/);
  assert.equal(s.nodes.get('c4').disabled,false);s.outcome('done');await s.nodes.get('c4').press();assert.equal(s.calls.at(-1).characterId,'c4');
  s.control.dispose();
});
test('Ready names the current deal/binding and removes the private card without starting locally',async()=>{
  const s=make();s.publish('awaiting-ready',true);s.role(role);
  assert.equal(s.nodes.get('setup-role-ready').disabled,true);
  await s.nodes.get('setup-role-toggle').press();assert.match(s.nodes.get('setup-role-card').innerHTML,/Hacker/);
  await s.nodes.get('setup-role-ready').press();assert.equal(s.calls.length,1);assert.equal(s.calls[0].dealId,'deal-1');
  assert.equal(s.nodes.get('setup-role-card').innerHTML,'');assert.equal(s.nodes.get('setup-ready-waiting').hidden,false);
  assert.match(s.nodes.get('setup-ready-waiting').attrs['aria-label'],/timer and other players/);
  s.role(null);assert.equal(s.nodes.get('setup-role-card').innerHTML,'');s.control.dispose();
});
test('shared setup progress contains only neutral seat confirmation and readiness',()=>{
  const s=make(),progress=createSetupProgress({el:s.el});
  progress.update({stage:'awaiting-ready',playerCount:7,seats:[{seatId:'seat-1',confirmed:true,ready:false},{seatId:'seat-2',confirmed:true,ready:true}]});
  const text=node=>[node.textContent,...node.children.map(text)].join(' ');
  assert.match(text(progress.node),/1 of 7 ready/);assert.doesNotMatch(text(progress.node),/Hacker|Alien|device-|team-|role-card/);
  progress.update(null);assert.doesNotMatch(text(progress.node),/Player 1/);s.control.dispose();
});
test('a character taken by another seat cannot submit, and leaving selection stops all tile requests',async()=>{
  const s=make();s.publish('choosing');s.takeCharacter('c3');
  await s.nodes.get('c3').press();assert.equal(s.calls.length,0);
  s.publish('awaiting-ready',true);await s.nodes.get('c4').press();assert.equal(s.calls.length,0);s.control.dispose();
});
test('compact progress changes only timer presentation and never advances the stage',()=>{
  const s=make(),progress=createSetupProgress({el:s.el,compact:true});
  const value={stage:'choosing',choosingEndsAt:30000,playerCount:7,seats:[]};
  progress.update(value,{status:'synced',serverNowMs:9000});assert.equal(s.nodes.get('setup-countdown').textContent,'0:21');
  progress.update(value,{status:'synced',serverNowMs:30000});assert.equal(s.nodes.get('setup-countdown').textContent,'0:00');
  assert.equal(progress.node.attrs['data-stage'],'choosing');assert.equal(s.nodes.get('setup-progress-status').hidden,true);s.control.dispose();
});
