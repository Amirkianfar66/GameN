import {FOOD_TASK_PARAMETERS as P} from '@mothership/contracts';
import type {FoodTaskParticipant} from '@mothership/contracts';

export const foodClamp=(u:number)=>Math.max(0,Math.min(1,u));
export function foodEase(kind:'QUADRATIC_IN_OUT'|'CUBIC_IN'|'CUBIC_OUT',u:number):number {
 const t=foodClamp(u);
 return kind==='CUBIC_IN'?t*t*t:kind==='CUBIC_OUT'?1-(1-t)**3:t<.5?2*t*t:1-(-2*t+2)**2/2;
}
const lerp=(a:number,b:number,u:number)=>a+(b-a)*u;
/** A display sample of the approved click. Logical stop is the snap's destination
 * for both motion preferences; this function cannot authorize or resolve LOCK. */
export function foodPanelAt(panel:FoodTaskParticipant['panel'],nowMs:number,reduced=false){
 if(panel.locked)return {at:panel.stop,stop:panel.stop,direction:panel.direction,locked:true,resting:true};
 const dt=Math.max(0,nowMs-panel.anchorAt),beat=P.snapMs+P.restMs,n=Math.floor(dt/beat),r=dt-n*beat;
 const origin=(panel.direction>0?panel.stop:12-panel.stop)+n;
 const fold=(u:number)=>{const w=((u%12)+12)%12;return w<=6?w:12-w;};
 const stop=Math.round(fold(origin+1)),resting=r>=P.snapMs;
 const u=foodClamp(r/P.snapMs),at=fold(origin+(resting?1:u*u*(3-2*u)));
 return {at:reduced?stop:at,stop,direction:fold(origin+.5)>fold(origin)?1 as const:-1 as const,locked:false,resting};
}
export function foodSwingAt(swing:FoodTaskParticipant['panel']['swing'],nowMs:number):number {
 if(!swing)return 0;const dt=Math.max(0,nowMs-swing.startedAt);
 const amplitude=P.leastAmplitude+(swing.amplitude-P.leastAmplitude)*Math.exp(-dt/P.swingSettleMs);
 return swing.direction*amplitude*Math.sin(2*Math.PI*dt/P.swingPeriodMs);
}
export function foodTrajectoryAt(motion:NonNullable<FoodTaskParticipant['crate']['motion']>,nowMs:number,{reduced=false,lifting=false}={}){
 const progress=motion.endsAt===motion.startedAt?1:foodClamp((nowMs-motion.startedAt)/(motion.endsAt-motion.startedAt));
 const u=reduced?1:foodEase(motion.easing,progress),horizontal=reduced?1:lifting?foodEase('QUADRATIC_IN_OUT',foodClamp(progress/.35)):u;
 return {x:lerp(motion.fromX,motion.toX,horizontal),height:lerp(motion.fromHeight,motion.toHeight,u),progress};
}
/** Complete current pose from persisted anchors, including an empty cue suffix.
 * Reduced motion changes only the drawing, never an interlock or an offer. */
export function foodCrateAt(task:FoodTaskParticipant,nowMs:number,reduced=false){
 const c=task.crate,p=foodPanelAt(task.panel,nowMs,reduced);
 if(c.motion)return {...foodTrajectoryAt(c.motion,nowMs,{reduced,lifting:c.state==='LIFTING'}),tilt:0};
 if(c.state==='HELD'||c.state==='BRAKED'){
  const d=p.locked?foodSwingAt(task.panel.swing,nowMs):0;
  const angle=Math.asin(Math.max(-.95,Math.min(.95,d*128/268)));
  const y=reduced?408:140+268*Math.cos(angle);
  return {x:p.at+d,height:(658-y)/250,progress:1,tilt:reduced?0:p.locked?-angle:p.resting?0:p.direction*.07};
 }
 return {x:c.x,height:c.height,progress:1,tilt:0};
}
export function foodPackageCount(doses:number):string {
 const whole=Math.floor(doses/2);return doses%2?whole?`${whole}½`:'½':String(whole);
}
/** #241's public gauge words, from authorized doses only. */
export function foodPackagesText(doses:number):string {
 return `${foodPackageCount(doses)} ${doses===1||doses===2?'package':'packages'}`;
}
export function foodGaugeLevel(doses:number):'empty'|'low'|'ok' {
 return doses<=0?'empty':doses<=2?'low':'ok';
}
export function foodGaugeLabel(doses:number):string {
 const level=foodGaugeLevel(doses);
 return level==='empty'?'No food left':level==='low'?`Food low: ${foodPackagesText(doses)} left`:`Food: ${foodPackagesText(doses)}`;
}
