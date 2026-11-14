// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {launchBrowser,connect,openPage,sleep} from '../capture/browser.mjs';
import {foodLabel,packagesFigure} from '../../../../design/food-supply/hints.mjs';
import {FOOD} from '../../../../design/food-supply/task.mjs';
import {boardOf} from '../../../../design/food-supply/boards.mjs';
import {foodStyleSnapshotSource,assertFoodStyleSnapshot} from './food-style-review.mjs';
import {run} from '../../../../design/food-supply/stage.mjs';
const repo=resolve(new URL('../../../../',import.meta.url).pathname),directory='/private/tmp/gamen-food-preview',out=process.argv[2]??'/private/tmp/gamen-food-native-comparison';await mkdir(out,{recursive:true});
const map=JSON.parse(await readFile(resolve(repo,'docs/frontend/food-supply-comparison-map.json'),'utf8')),provenance=JSON.parse(await readFile(resolve(directory,'food-review-provenance.json'),'utf8'));
const packets=JSON.parse(await readFile(resolve(repo,'apps/game/dev/phone/food/native-fixtures.json'),'utf8'));
const referenceSource=await readFile(resolve(repo,'design/food-supply/phone.mjs'),'utf8'),referenceStock=referenceSource.match(/const STOCK_BEFORE = ([\d.]+);/);
assert.ok(referenceStock,'Reference stock setup must be explicit');
assert.equal(createHash('sha256').update(referenceSource).digest('hex'),map.referencePins['design/food-supply/phone.mjs'],'Reference source differs from its exact planned pin');
const referenceBeforeDoses=Number(referenceStock[1])*FOOD.dosesPerPackage;
function referenceDoses(query){
 const p=new URLSearchParams(query);
 if(p.get('s')==='stock')return Math.round(Number(p.get('n')??1)*FOOD.dosesPerPackage);
 if(p.get('s')==='return'){const outcome=run(boardOf(p.get('board')??'cooperation')).at(-1).state.outcome;
  return referenceBeforeDoses+(outcome.result==='delivered'?outcome.packages*FOOD.dosesPerPackage:0);}
 return referenceBeforeDoses;
}
async function verify(){for(const m of provenance.modules){const b=await readFile(resolve(repo,m.path));assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256,m.path+' changed after build');}}
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://local'),reference=url.pathname.startsWith('/reference/'),base=reference?repo:directory;
 const name=reference?url.pathname.slice(10):url.pathname,path=resolve(base,'.'+name);if(!path.startsWith(base+sep))throw Error('path');
 res.setHeader('content-type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp','.json':'application/json'})[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,chrome=await launchBrowser(),browser=await connect(chrome.endpoint);
const facts={scope:'Full native app comparison on typed synthetic packets, with original candidate-engine Task inputs and explicit presentation/recovery boundary fixtures. Reference-only simulation is confined to its page and the Node reference-input audit, never imported into the native app. Desktop Chromium; captures/measurements are not visual acceptance, API/emulator, production release or device evidence.',provenance,referenceInputs:{designerHead:map.designerHead,source:'design/food-supply/phone.mjs',sha256:createHash('sha256').update(referenceSource).digest('hex'),stockBeforeDoses:referenceBeforeDoses},browser:await browser.send('Browser.getVersion'),cases:[],errors:[]};
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const measure=page=>page.evaluate(`(()=>{const food=document.querySelector('.planet-food.ph'),root=food??document.querySelector('.ph'),problems=[],rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
 const controls=[...root.querySelectorAll('.fs-ctl:not([hidden])')].map(n=>{const r=n.getBoundingClientRect();if(r.left<-.5||r.right>innerWidth+.5||r.top<-.5||r.bottom>innerHeight+.5)problems.push(n.id+' leaves viewport');for(const t of n.querySelectorAll('.fs-label,.fs-sub'))if(t.scrollWidth>t.clientWidth+1)problems.push(n.id+' clips text');return {label:n.textContent,rect:rect(n),disabled:n.getAttribute('aria-disabled')};});
 for(const n of root.querySelectorAll('.fs-brief'))if(n.scrollHeight>n.clientHeight+1)problems.push('briefing scrolls');
 const visible=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(n).display!=='none';};
 const gauges=[...document.querySelectorAll('.fs-food')].filter(visible).map(n=>({label:n.getAttribute('aria-label'),level:n.dataset.level,figure:n.querySelector('b')?.textContent,lines:n.querySelectorAll('.fs-food-lines i').length,rect:rect(n)}));
 const tags=[...root.querySelectorAll('.fs-art .tag')].filter(visible).map(n=>{const r=n.getBoundingClientRect(),v=root.querySelector('.fs-view').getBoundingClientRect();if(r.left<v.left-.5||r.right>v.right+.5||r.bottom>v.bottom+.5)problems.push('name tag leaves view');return {text:n.textContent,rect:rect(n)};});
 for(const n of root.querySelectorAll('.fs-card-foot button')){const r=n.getBoundingClientRect();if(r.left<-.5||r.right>innerWidth+.5||r.top<-.5||r.bottom>innerHeight+.5)problems.push('card answer leaves viewport');}
 const subtitle=root.querySelector('.tb-sub');return {width:innerWidth,height:innerHeight,text:root.innerText,screen:root.dataset.screen,hidden:root.hidden,controls,gauges,tags,problems,subtitle:subtitle?{text:subtitle.textContent,rect:rect(subtitle),clip:getComputedStyle(subtitle).clipPath}:null,
 styles:${foodStyleSnapshotSource},
 native:window.foodAppHarness?{game:foodAppHarness.app.game?.getModel().connection,phase:foodAppHarness.app.game?.getModel().phase?.kind,canonicalSeats:foodAppHarness.app.game?.getModel().board?.seats.length??foodAppHarness.app.food?.getModel().view?.rosterSeatIds.length,participant:!!foodAppHarness.app.food?.getModel().view?.participantTask,feedback:foodAppHarness.app.food?.getModel().feedback,recoveryTransitions:foodAppHarness.recoveryTransitions,construction:foodAppHarness.entry.native.construction??foodAppHarness.entry.native.recovery?.construction??null}:null};})()`);
async function capture(page,path){const r=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const b=Buffer.from(r.data,'base64');await writeFile(resolve(out,path),b);return {path,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length};}
try{
 await verify();
 for(const p of map.profiles)for(const motion of map.motion){const profile=`${p.width}-${p.height}-text${p.textScale}-${motion}`,native=await openPage(browser,{width:p.width,height:p.height,mobile:true,ownContext:true}),reference=await openPage(browser,{width:p.width,height:p.height,mobile:true,ownContext:true});
  try{for(const c of map.cases){if(process.env.GAMEN_FOOD_COMPARE_IDS&&!process.env.GAMEN_FOOD_COMPARE_IDS.split(',').includes(c.id))continue;
   const extra=`text=${p.textScale}&safe=${p.safeTop},${p.safeBottom}&motion=${motion}&chrome=0`;
   await native.goto(`${origin}/app.html?case=${c.id}&${extra}`,'window.foodAppHarness?.ready');await native.evaluate('Promise.all([foodAppHarness.app.artReady,document.fonts.ready])');await sleep(40);
   await reference.goto(`${origin}/reference/${c.reference.page}?${c.reference.query}&${extra}`,'window.__phoneReady');await reference.evaluate('document.fonts.ready');await sleep(40);
   const n=await measure(native),r=await measure(reference),path=`${c.id}-${profile}`;
   try{assertFoodStyleSnapshot(n.styles,r.styles,{id:c.id,motion});}catch(error){facts.failedStyleCase={id:c.id,profile,message:error.message,native:n,reference:r};throw error;}
   assert.equal(n.hidden,false,c.id+' native Food hidden');assert.ok(n.native.game==='live'||c.reference.query.includes('press=lost')&&n.native.game==='stale',c.id+' unexpected game connection');assert.equal(n.native.canonicalSeats,9,c.id+' canonical roster changed');
   assert.equal(n.gauges.length,1,c.id+' requires one visible public Food gauge');assert.equal(r.gauges.length,1,c.id+' reference gauge missing');
   const setup=packets.cases.find(p=>p.id===c.id).native,packet=setup.next??setup.initial,authoritativeStockDoses=packet.value.foodPublicView.stock.doses;
   assert.equal(n.gauges[0].label,foodLabel(authoritativeStockDoses),c.id+' gauge differs from its actual authoritative public packet');
   assert.equal(n.gauges[0].figure,packagesFigure(authoritativeStockDoses),c.id+' visible native figure differs from public doses');
   const referenceStockDoses=referenceDoses(c.reference.query);
   assert.equal(r.gauges[0].label,foodLabel(referenceStockDoses),c.id+' reference label differs from its own explicit fixture input');
   assert.equal(r.gauges[0].figure,packagesFigure(referenceStockDoses),c.id+' reference figure differs from its own fixture input');
   const referenceGaugeDifference=n.gauges[0].label===r.gauges[0].label?null:{native:n.gauges[0].label,reference:r.gauges[0].label,scope:'Reference synthetic count differs from the actual engine packet. Native is validated against authorized public doses, never frozen to the reference constant.'};
   if(!n.native.participant)assert.equal(await native.evaluate('document.querySelectorAll(".fs-art").length'),0,c.id+' private scene on outsider');
   facts.cases.push({id:c.id,title:c.title,profile,referenceQuery:c.reference.query,authoritativeStockDoses,referenceStockDoses,referenceGaugeDifference,native:n,reference:r,images:{native:await capture(native,path+'-native.png'),reference:await capture(reference,path+'-reference.png')}});
   if(facts.cases.length%20===0)console.log(`${facts.cases.length} native/reference pairs captured`);
  }}finally{await native.close();await reference.close();}
 }
 await verify();facts.sourcesVerifiedBeforeAndAfter=true;
 facts.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params);assert.deepEqual(facts.errors,[]);
}finally{
 facts.errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params);await writeFile(resolve(out,'result.json'),JSON.stringify(facts,null,2));
 await writeFile(resolve(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>Native Food comparison</title><style>body{background:#121822;color:#eee;font:16px system-ui;margin:20px}article{border-top:1px solid #555;padding:16px 0}figure{display:inline-block;vertical-align:top;margin:8px}img{max-width:390px;border:1px solid #888}small{display:block;max-width:820px}</style><h1>Native Food comparison</h1><p>${esc(facts.scope)}</p>${facts.cases.map(c=>`<article id="${c.id}-${c.profile}"><h2>${esc(c.id+' · '+c.title+' · '+c.profile)}</h2><small>${esc(c.native.construction??'')}</small>${c.referenceGaugeDifference?`<p>Gauge inputs differ: ${esc(c.referenceGaugeDifference.native)} in the authoritative native packet; ${esc(c.referenceGaugeDifference.reference)} in the reference. ${esc(c.referenceGaugeDifference.scope)}</p>`:''}<figure><figcaption>Native app</figcaption><img src="${c.images.native.path}"></figure><figure><figcaption>Designer reference</figcaption><img src="${c.images.reference.path}"></figure><p>Native measurements: ${esc(c.native.problems.join('; ')||'No control/briefing overflow measured')}. Reference: ${esc(c.reference.problems.join('; ')||'No control/briefing overflow measured')}.</p></article>`).join('')}</html>`);
 browser.close();await chrome.close();server.close();
}
console.log(`${facts.cases.length} native/reference pairs; ${out}`);
