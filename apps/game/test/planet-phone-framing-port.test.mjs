import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {phoneFrame as reference,paintedExtent as referenceExtent} from '../../../design/phone-ui/prototype/art.mjs';
import {phoneFrame,paintedExtent,framingInput} from '../hosted/planet/phone-framing.mjs';
import {FIGURE_EXTENTS_SOURCES} from '../hosted/planet/phone-figure-extents.mjs';
import {BOARD_ROOMS,sceneOf,slotsOf} from '../hosted/board-v2-drawing/slots-four.mjs';
import {phoneLayouts,createBlackoutGeometry} from '../hosted/planet/phone-layout.mjs';
const read=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('the #229 numeric port and measured data retain exact source provenance',()=>{
 const meta=JSON.parse(read('docs/frontend/phone-framing-port-229.json'));
 const art=read('design/phone-ui/prototype/art.mjs'),block=art.slice(art.indexOf('const clamp ='),art.indexOf('/** Each place\'s press area'));
 assert.equal(sha(block),meta.sourceFramingBlockSha256);
 const adapted=block.replace('present = []) {','present = [], input = null) {').replace('const xs = present.map(slot => slot.pressAt[0]);','const xs = input ? (input.populated ? [input.pressMin, input.pressMax] : []) : present.map(slot => slot.pressAt[0]);').replace('const outlines = present.map(paintedExtent);','const outlines = input ? (input.populated ? [[input.figureMin, 0, input.figureMax, 0]] : []) : present.map(paintedExtent);\n  const populated = input ? input.populated : present.length;').replaceAll('present.length','populated').replace('const populated = input ? input.populated : populated;','const populated = input ? input.populated : present.length;');
 const runtime=read('apps/game/hosted/planet/phone-framing.mjs');assert.equal(runtime.slice(runtime.indexOf('const clamp ='),runtime.indexOf('/** Derived public')),adapted);
 const tables=read('design/phone-ui/prototype/figure-extents.mjs'),data=tables.slice(tables.indexOf('/** The modules measured'));
 assert.equal(sha(data),meta.runtimeTableBodySha256);assert.ok(read('apps/game/hosted/planet/phone-figure-extents.mjs').endsWith(data));
 for(const [path,hash]of Object.entries(FIGURE_EXTENTS_SOURCES))assert.equal(sha(read(path)),hash,path+' must be measured again before changing framing');
});

test('every occupancy subset, mirrored/down pose and supported panel matches the authoritative calculation exactly',()=>{
 const panels=[{width:386,height:712,cap:44,pad:8},{width:316,height:294,cap:44,pad:8},{width:316,height:430,cap:44,pad:8},{width:426,height:790,cap:44,pad:8},{width:386,height:530,cap:44,pad:8}];
 for(const count of [7,8,9])for(const room of BOARD_ROOMS)for(const down of [false,true]){
  const slots=slotsOf(room,count).map(s=>({...s,eliminated:down})),scene=sceneOf(room,count);
  for(const s of slots)assert.deepEqual(paintedExtent(s),referenceExtent(s));
  for(let mask=0;mask<2**slots.length;mask++){
   const present=slots.filter((_,i)=>mask&(1<<i)),input=framingInput(present);assert.ok(Object.values(input).every(Number.isFinite));
   for(const panel of panels){const expected=reference(scene,panel,present);assert.deepEqual(phoneFrame(scene,panel,present),expected);assert.deepEqual(phoneFrame(scene,panel,[],input),expected,`${room}/${count}/${mask}/${down}`);}
  }
 }
});

test('dark viewport reflow uses immutable numeric bounds and canonical fallback ignores hidden occupants',()=>{
 const view={width:390,height:844,top:60,nav:68},small={width:320,height:568,top:140,nav:100},cache=createBlackoutGeometry();
 const shown=[{location:'Room A',slotId:'A3'}],lit=cache.read('one',()=>phoneLayouts(view,9,shown),{viewportKey:'large'});
 const dark=cache.read('one',()=>{throw Error('A later dark packet may not replace inputs');},{viewportKey:'large'});assert.strictEqual(dark,lit);
 const reflow=cache.read('one',()=>{throw Error('A viewport change may not read later occupancy');},{viewportKey:'small',reflow:roomInputs=>phoneLayouts(small,9,[],{roomInputs})});
 assert.deepEqual(reflow,phoneLayouts(small,9,shown));assert.strictEqual(reflow.roomInputs,lit.roomInputs);
 const fallback=phoneLayouts(view,9,[],{frameAll:true});assert.deepEqual(phoneLayouts(view,9,[{location:'Room A',slotId:'A3',health:'Injured'}],{frameAll:true}),fallback);
 assert.ok(!/seatId|slotId|characterId|displayName|eliminated|health/.test(JSON.stringify(reflow.roomInputs)));
});

test('a failed new-window reconstruction retires the former window bounds',()=>{
 const cache=createBlackoutGeometry(),view={width:390,height:844,top:60,nav:68};
 cache.read('old',()=>phoneLayouts(view,9,[],{frameAll:true}));
 assert.equal(cache.read('new',()=>null),null);
 assert.equal(cache.read('old',()=>null),null,'No camera from the retired window can be resurrected');
});
