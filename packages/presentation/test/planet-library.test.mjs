import assert from 'node:assert/strict';
import {test} from 'node:test';
import {planetPlayerNumberChoices,planetPanelRequestText,planetTerminalArrival} from '../dist/index.js';
test('number labels sort numerically while preserving offered canonical command identities',()=>{
 assert.deepEqual(planetPlayerNumberChoices(['seat-9','seat-2','seat-6']),[{value:'seat-2',label:'2'},{value:'seat-6',label:'6'},{value:'seat-9',label:'9'}]);
});
test('patient feedback uses its authorized request status, and queued never means treated',()=>{
 assert.equal(planetPanelRequestText(null),null);assert.equal(planetPanelRequestText(undefined),null);
 const request={commandId:'own-request',round:4,status:'QUEUED'};assert.match(planetPanelRequestText(request),/reserved; treatment is not confirmed/);
 assert.match(planetPanelRequestText({...request,status:'WRONG'}),/number was wrong/);assert.match(planetPanelRequestText({...request,status:'TREATED'}),/request treated you/);
 assert.match(planetPanelRequestText({...request,status:'NO_EFFECT'}),/no effect/);assert.match(planetPanelRequestText({...request,status:'DISCARDED'}),/discarded/);
});
test('colored arrivals require matching live authoritative terminal facts',()=>{
 const model={connection:'live',concealed:false,phase:{kind:'FINISHED',trusted:true},result:{reason:'ARRIVAL',winner:'Blue'},navigation:{arrivedAt:'Blue'}};
 assert.equal(planetTerminalArrival(model),'Blue');for(const changed of [{connection:'stale'},{concealed:true},{phase:{kind:'JAIL_VOTE',trusted:true}},{phase:{kind:'FINISHED',trusted:false}},{result:{reason:'NO_SURVIVORS',winner:null}},{navigation:{arrivedAt:'Red'}}])assert.equal(planetTerminalArrival({...model,...changed}),null);
});
