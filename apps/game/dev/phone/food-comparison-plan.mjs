// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
// Reference addresses only, resolved from exported fixture times. No simulator runs here.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const handoff=JSON.parse(readFileSync(resolve(root,'design/food-supply/handoff.json'),'utf8'));
const given=id=>handoff.acceptance.find(s=>s.id===id);
const stepAt=(id,n)=>given(id).when[n].at;
const first=(id,act)=>given(id).when.find(s=>s.act===act).at;
const B=handoff.timing.briefing,G=handoff.timing.grace,R=first('cooperation','release');
const PLATFORM_AT=first('cooperation','lock'),CAB_AT=first('chop','lock'),OVER=PLATFORM_AT+975;
const LOWER_AT=first('cooperation','lower'),LANDED=LOWER_AT+handoff.timing.lower,OUT=stepAt('disconnect',2);
const taskRows={
 winch:[
  ['cooperation',2500,'Briefing: a reminder'],['cooperation',B+300,'Hold: the next press'],['cooperation',R+400,'Holding: Cleo moves it'],
  ['chop',CAB_AT-260,'Warning: the panel moving to your cab'],['chop',CAB_AT-100,'Warning: the panel at your cab'],['cooperation',OVER-75,'Hazard: a let-go may drop it on Cleo'],
  ['cooperation',PLATFORM_AT+1625,'Keep holding: it would break'],['cooperation',LOWER_AT,'Let go now: steady over the platform','&before=1'],['protection-drop',OVER+175,'Stopped: the brake has it'],
  ['mistakes',stepAt('mistakes',5)+500,'Broken: Cleo fetches a new one'],['mistakes',stepAt('mistakes',7)+200,'The hook at 1: hold to lift'],['cooperation',LANDED+200,'Landed: turn your key'],
  ['standoff',stepAt('standoff',4)+300,'Key turned: waiting'],['chop',CAB_AT+1200,'Killed: out of the match'],['drop',OVER+1300,'Lost: the crate broke on Cleo'],
  ['disconnect',OUT+G-2100,'Partner offline: the Task goes on'],['disconnect',OUT+G+1500,'Cancelled'],['timeout',handoff.timing.deadline+1500,'Lost: the time ran out'],
 ],
 panel:[
  ['cooperation',2500,'Briefing: a reminder'],['cooperation',B+300,'Waiting: Hana lifts it'],['cooperation',B+1300,'RELEASE: the next press'],
  ['cooperation',PLATFORM_AT-100,'Resting at 6: LOCK now'],['chop',CAB_AT-250,'Leaving 6: LOCK striped'],['chop',CAB_AT-100,'At 7: LOCK cuts Hana'],
  ['mistakes',stepAt('mistakes',2)+650,'Locked over you: release'],['cooperation',OVER-75,'Warning: the crate over you'],['cooperation',PLATFORM_AT+1500,'Locked: Hana lets go over it'],
  ['protection-cut',CAB_AT+250,"Stopped: the cab's buffer"],['mistakes',stepAt('mistakes',5)+600,'Broken: fetch a new one at 1'],['mistakes',stepAt('mistakes',7)-100,'At 1: LOCK to fetch it'],
  ['cooperation',LANDED+200,'Landed: turn your key'],['standoff',stepAt('standoff',6)+500,'Hana out: turn your key alone'],['drop',OVER+1300,'Killed: out of the match'],
  ['standoff',stepAt('standoff',7)+1100,'Delivered alone'],['chop',CAB_AT+2300,'Lost: not over the platform'],['disconnect',OUT+G-2000,'Own phone reconnecting'],
 ],
};
const flow=[
 ['s=volunteer&step=task','Volunteer: start a Task'],['s=volunteer&step=partner','Volunteer: ask a Partner'],['s=volunteer&step=asking','Volunteer: waiting for the answer'],
 ['s=called','Partner: Join or Decline (15 s)'],['s=volunteer&step=declined','Volunteer: declined, the next volunteer goes'],['s=called&answer=join','Partner: joined'],
 ['s=volunteer&step=starting','Volunteer: starting'],['s=task&board=cooperation&t=2500&as=panel','Both: briefing'],['s=away','Another player: the board shows who is away'],
 ['s=return&board=cooperation&as=winch','Return after a delivery'],['s=return&board=cooperation&as=other','Another player after a delivery: food count only'],['s=return&board=chop&as=other','Another player after a death: board only'],
 ['s=stock&n=1','Food gauge: one package'],['s=volunteer&step=rested','Next round: the two cannot go for food'],
 ['s=stock&n=0.5','Food gauge: half a package'],['s=stock&n=0','Food gauge: empty'],
];
const states=[
 [`s=task&board=cooperation&t=${PLATFORM_AT-100}&as=panel&press=sending&act=lock`,'Panel: LOCK on its way'],[`s=task&board=cooperation&t=${R+1200}&as=panel&press=refused&act=lock`,'Panel: LOCK refused'],
 [`s=task&board=cooperation&t=${B+600}&as=winch&press=sending&act=raise&before=1`,'Winch: Hold on its way'],[`s=task&board=cooperation&t=${LOWER_AT-10}&as=winch&press=unknown&act=lower`,'Winch: let-go answer unknown'],
 [`s=task&board=cooperation&t=${LANDED+200}&as=winch&press=through&act=lower`,'Winch: let-go went through'],[`s=task&board=cooperation&t=${PLATFORM_AT-100}&as=panel&press=lost&act=lock`,'Panel: LOCK did not go through'],
 ['s=called&answer=joining','Partner: Join on its way'],['s=called&answer=late-withdrawn','Partner: too late after withdrawal'],['s=called&answer=late-expired','Partner: too late after expiry'],
 ['s=volunteer&step=withdrawn','Volunteer: request withdrawn'],['s=volunteer&step=withdraw-late','Volunteer: too late to cancel'],['s=volunteer&step=busy','Another request is waiting'],
 ['s=volunteer&step=closed','Food Supply closed'],['s=howto','How it works before the Task'],
];
const large=[
 ['s=task&board=cooperation&t=2500&as=winch','Briefing: no scrolling'],[`s=task&board=cooperation&t=${B+300}&as=winch`,'Winch: Hold next'],
 [`s=task&board=cooperation&t=${OVER-75}&as=winch`,'Winch: hazard'],[`s=task&board=chop&t=${CAB_AT-100}&as=panel`,'Panel: hazard'],
 [`s=task&board=cooperation&t=${PLATFORM_AT-100}&as=panel`,'Panel: LOCK now'],[`s=task&board=cooperation&t=${LANDED+200}&as=panel`,'Panel: landed'],
 [`s=task&board=disconnect&t=${CAB_AT-100}&as=winch`,'Winch: offline and cab hazard'],[`s=task&board=chop&t=${CAB_AT+2300}&as=panel`,'Lost'],
 [`s=task&board=cooperation&t=${PLATFORM_AT-100}&as=panel&press=sending&act=lock`,'Panel: LOCK sending'],[`s=task&board=cooperation&t=${R+1200}&as=panel&press=refused&act=lock`,'Panel: LOCK refused'],
 [`s=task&board=disconnect&t=${CAB_AT-100}&as=winch&names=long`,'Twelve-letter names: offline and cab hazard'],
 [`s=task&board=chop&t=${CAB_AT-100}&as=panel&names=long`,'Twelve-letter names: LOCK hazard'],
 ['s=called&names=long','Twelve-letter names: Partner request'],['s=stock&n=0.5','Food gauge: half a package'],
];
const cases=[];
function rows(group,items){items.forEach(([query,title],i)=>cases.push({id:`food-${group}-${String(i+1).padStart(2,'0')}`,title,reference:{page:'design/food-supply/phone.html',query},nativeScenario:{page:'apps/game/dev/phone/food/app.html',query:`case=food-${group}-${String(i+1).padStart(2,'0')}`,packets:'apps/game/dev/phone/food/native-fixtures.json'}}));}
for(const role of ['winch','panel'])rows(role,taskRows[role].map(([board,t,title,extra=''])=>[`s=task&board=${board}&t=${t}&as=${role}${extra}`,title]));
rows('flow',flow);rows('states',states);rows('large',large);rows('stock',[['s=stock&n=0.5','Half a package'],['s=stock&n=0','No packages']]);
if(cases.length!==82||new Set(cases.map(c=>c.id)).size!==82)throw Error('Exact named reference coverage required');
const pins=Object.fromEntries(['design/food-supply/review.mjs','design/food-supply/phone.mjs','design/food-supply/phone.css','design/food-supply/handoff.json'].map(path=>[path,createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')]));
const plan={schema:'mothership.food-supplemental-comparison-plan/1',status:'native-packet-mapping-implemented-capture-evidence-separate',issue:235,designerHead:'3f4cb5e78a5e8d4f1bb17eb3487dcec26df6a594',referencePins:pins,scope:'Food-specific supplement including #241 gauge and twelve-character frames; the existing 49-part catalogue does not cover these new states. A plan is not capture evidence or Designer acceptance.',profiles:[{width:390,height:844,textScale:1,safeTop:47,safeBottom:34},{width:320,height:568,textScale:2,safeTop:20,safeBottom:0}],motion:['normal','reduced'],existingPartsToRecheck:['actions','panels','board','round-order','reconnecting','largest-text'],cases};
const target=resolve(root,'docs/frontend/food-supply-comparison-map.json'),bytes=JSON.stringify(plan,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==bytes)throw Error('Food comparison reference plan differs');}
else writeFileSync(target,bytes);
console.log(`Food reference mapping: ${cases.length} named states; typed native packet mappings present; capture/acceptance evidence remains separate.`);
