import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chooseRenderedPanelInput,renderedPanelTouchAllowed,touchRenderedPanel} from '../dev/phone/food-connected-panel.mjs';
const model=()=>({visible:true,fresh:true,live:true,clock:{status:'synced'},pendingCount:0,feedback:'accepted',canPanelRelease:false,canPanelLock:true,canKey:false,
 controls:[{id:'food-panel-main',action:'lock',visible:true,disabled:false,busy:false,sending:false,inert:false,next:true,hazard:false}]});
const hit={documentVisible:true,hitMatches:true,inViewport:true};
test('PANEL chooses only the drawn next control and leaves its authorized model unchanged',()=>{
 const m=model(),before=structuredClone(m);assert.deepEqual(chooseRenderedPanelInput(m),{action:'lock',id:'food-panel-main',kind:'PANEL_LOCK'});assert.deepEqual(m,before);
 m.controls[0].next=false;assert.equal(chooseRenderedPanelInput(m),null);
});
test('stale, hidden, disabled, pending, hazard or non-live PANEL cannot generate an input',()=>{
 for(const [key,value]of Object.entries({visible:false,fresh:false,live:false,pendingCount:1,feedback:'unknown',canPanelLock:false})){
  const m=model();m[key]=value;assert.equal(chooseRenderedPanelInput(m),null,key);
 }
 const unsynced=model();unsynced.clock.status='unsynced';assert.equal(chooseRenderedPanelInput(unsynced),null);
 for(const [key,value]of Object.entries({visible:false,disabled:true,busy:true,sending:true,inert:true,hazard:true})){
  const m=model();m.controls[0][key]=value;assert.equal(chooseRenderedPanelInput(m),null,key);
 }
});
test('immediate touch guard refuses an obscured/offscreen document or a control that changed since selection',()=>{
 const m=model(),expected=chooseRenderedPanelInput(m);assert.equal(renderedPanelTouchAllowed(m,expected,hit),true);
 for(const key of Object.keys(hit))assert.equal(renderedPanelTouchAllowed(m,expected,{...hit,[key]:false}),false,key);
 m.controls[0].action='release';m.canPanelRelease=true;assert.equal(renderedPanelTouchAllowed(m,expected,hit),false);
});
test('a valid visible PANEL touch sends only physical down/up; a blocked guard sends nothing',async()=>{
 const m=model(),expected=chooseRenderedPanelInput(m),sent=[],page={evaluate:async()=>({model:m,facts:hit,point:{x:30,y:40,id:1}}),send:async(method,params)=>{sent.push({method,type:params.type});}};
 assert.equal((await touchRenderedPanel(page,expected)).acted,true);assert.deepEqual(sent,[{method:'Input.dispatchTouchEvent',type:'touchStart'},{method:'Input.dispatchTouchEvent',type:'touchEnd'}]);
 sent.length=0;m.controls[0].hazard=true;assert.equal((await touchRenderedPanel(page,expected)).acted,false);assert.deepEqual(sent,[]);
});
