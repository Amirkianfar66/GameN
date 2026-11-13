import {foodPackageCount,foodGaugeLabel,foodGaugeLevel} from '@mothership/presentation';

/** #241 foodGauge/withFood, adapted to the native component factory. The
 * authoritative caller supplies doses; no Task result or private cause is read. */
export function foodGauge(ui,doses){
 if(!Number.isSafeInteger(doses)||doses<0)return null;
 const {h,ic}=ui,whole=Math.floor(doses/2),half=doses%2!==0;
 const lines=Array.from({length:Math.min(whole,10)},()=>h('i'));
 if(half&&whole<10)lines.push(h('i',{'data-half':''}));
 return h('span.fs-food',{role:'img','aria-label':foodGaugeLabel(doses),'data-level':foodGaugeLevel(doses)},
  ic('supply',{filled:true}),lines.length?h('span.fs-food-lines',{'aria-hidden':'true'},lines):null,h('b',{'aria-hidden':'true'},foodPackageCount(doses)));
}
export function withFoodGauge(ui,bar,doses){
 const right=bar.querySelector('.tb-right'),clock=right.querySelector('.timer'),stack=ui.h('span.fs-clock',foodGauge(ui,doses));
 if(clock){right.insertBefore(stack,clock);stack.prepend(clock);}else right.insertBefore(stack,right.querySelector('.tb-menu'));
 return bar;
}
