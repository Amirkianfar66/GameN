// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import assert from 'node:assert/strict';

// Serialized into the two excluded review pages. The temporary component probes
// receive no inputs and are removed before every screenshot. Actual hint/control
// facts below are measured from the mounted native/reference screens themselves.
function snapshotFoodStyles(){
 const root=document.querySelector('.planet-food.ph')??document.querySelector('.ph');
 const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const properties=['content','position','width','height','top','right','bottom','left','borderTopWidth','borderRightColor','borderRadius','backgroundColor','backgroundImage','animationName','animationDuration','opacity'];
 const pseudo=(n,part)=>{const s=getComputedStyle(n,part);return Object.fromEntries(properties.map(k=>[k,s[k]]));};
 const visible=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0;};
 const probe=document.createElement('div');probe.setAttribute('aria-hidden','true');
 Object.assign(probe.style,{position:'absolute',top:'0',left:'0',width:'280px',visibility:'hidden',pointerEvents:'none'});
 probe.innerHTML='<button class="tb-menu" aria-expanded="true" data-probe="menu"></button><span class="hero" data-mode="voted" data-probe="hero"></span><button class="icon-btn" data-probe="icon"></button><section class="sheet" style="position:relative;inset:auto;width:260px"><button class="icon-btn" data-probe="sheet-icon"></button><button class="btn btn-primary" aria-busy="true" data-probe="busy">Wait</button><button class="btn btn-secondary" aria-busy="true" data-probe="secondary">Wait</button><button class="btn btn-sm" data-probe="small">OK</button><button class="switch" data-probe="switch"></button><button class="switch" aria-checked="true" data-probe="checked"></button><div class="list"><div class="row">One</div><div class="row" data-probe="row">Two</div></div></section><div class="fs-view" data-probe="view"></div><button class="fs-ctl" data-sending><span class="fs-face" data-probe="sending">Sending</span></button>';
 root.append(probe);
 let probes;
 try{
  const get=name=>probe.querySelector(`[data-probe="${name}"]`);
  probes={menu:pseudo(get('menu'),'::before'),hero:pseudo(get('hero'),'::after'),icon:pseudo(get('icon'),'::before'),sheetIcon:pseudo(get('sheet-icon'),'::before'),busy:pseudo(get('busy'),'::after'),secondaryBusy:pseudo(get('secondary'),'::after'),small:pseudo(get('small'),'::before'),switchHit:pseudo(get('switch'),'::before'),switchKnob:pseudo(get('switch'),'::after'),checkedKnob:pseudo(get('checked'),'::after'),row:pseudo(get('row'),'::before'),view:pseudo(get('view'),'::after'),sending:pseudo(get('sending'),'::after')};
  for(const [name,target]of Object.entries({menu:'menu',hero:'hero',icon:'icon',sheetIcon:'sheet-icon',busy:'busy',secondaryBusy:'secondary',small:'small',switchHit:'switch',switchKnob:'switch',checkedKnob:'checked',row:'row',view:'view',sending:'sending'}))probes[name].controlRect=rect(get(target));
 }finally{probe.remove();}
 const actual={
  busy:[...root.querySelectorAll('.btn[aria-busy="true"]')].filter(visible).map(n=>pseudo(n,'::after')),
  sending:[...root.querySelectorAll('.fs-ctl[data-sending] .fs-face')].filter(visible).map(n=>pseudo(n,'::after')),
  roundButtons:[...root.querySelectorAll('.icon-btn')].filter(visible).map(n=>pseudo(n,'::before')),
  hairlines:[...root.querySelectorAll('.row + .row,.list > li + li > .row')].filter(visible).map(n=>pseudo(n,'::before')),
  viewFade:[...root.querySelectorAll('.fs-view')].filter(visible).map(n=>pseudo(n,'::after')),
 };
 const hint=root.querySelector('.fs-hint'),icon=hint?.querySelector('svg.ic'),text=hint?.lastElementChild;
 return {scope:'Computed pseudo-elements on inert temporary components plus actual mounted screen/hint facts; probes removed before capture.',probes,actual,hint:icon&&text&&visible(icon)?{icon:rect(icon),text:rect(text),gap:text.getBoundingClientRect().left-icon.getBoundingClientRect().right,wrapperFlex:icon.parentElement===hint?null:getComputedStyle(icon.parentElement).flex}:null};
}
export const foodStyleSnapshotSource=`(${snapshotFoodStyles.toString()})()`;

export function assertFoodStyleSnapshot(native,reference,{id,motion}){
 const label=message=>id+' '+motion+' '+message;
 // Compare real computed declarations, not exported selector strings. The native
 // keyframe prefix is the sole intentional style-name adaptation.
 const animation=name=>name.replaceAll('food-fs-spin','fs-spin').replaceAll('food-spin','spin');
 for(const [name,n]of Object.entries(native.probes)){
  const r=reference.probes[name];assert.ok(r,label('reference probe '+name));
  assert.equal(n.content,'""',label(name+' pseudo missing'));
  // Compare declarations the reference specifies. Used values of automatic
  // inset/size depend on the probe's containing box (for example, a centered
  // spinner in buttons of different heights); those are not style changes.
  const geometry={menu:['top','right','bottom','left'],hero:['width','height','top','right'],icon:['top','right','bottom','left'],sheetIcon:['top','right','bottom','left'],busy:['width','height'],secondaryBusy:['width','height'],small:['top','right','bottom','left'],switchHit:['top','right','bottom','left'],switchKnob:['width','height','top','left'],checkedKnob:['width','height','top','left'],row:['height','top','right','left'],view:['height','right','bottom','left'],sending:['width','height']};
  for(const property of ['position','borderTopWidth','borderRightColor','borderRadius','backgroundColor','backgroundImage','animationDuration','opacity',...geometry[name]])assert.equal(n[property],r[property],label(name+' '+property));
  assert.equal(animation(n.animationName),r.animationName,label(name+' animation'));
 }
 assert.equal(native.probes.small.top,'-4px',label('small-button top hit extension'));
 assert.equal(native.probes.small.bottom,'-4px',label('small-button bottom hit extension'));
 assert.ok(native.probes.small.controlRect.height+8>=44,label('small-button minimum hit extent'));
 assert.equal(native.probes.view.height,'28px',label('view fade height'));
 assert.notEqual(native.probes.view.backgroundImage,'none',label('view fade gradient'));
 if(motion==='reduced')assert.equal(native.probes.sending.animationName,'none',label('reduced control spinner'));
 for(const [kind,items]of Object.entries(native.actual))for(const p of items){assert.equal(p.content,'""',label(kind+' actual pseudo missing'));if(kind==='viewFade')assert.equal(p.height,'28px',label('actual view fade height'));}
 if(reference.hint){
  assert.ok(native.hint,label('actual hint icon'));
  assert.ok(Math.abs(native.hint.icon.width-reference.hint.icon.width)<=.5,label('hint icon width'));
  assert.ok(Math.abs(native.hint.icon.height-reference.hint.icon.height)<=.5,label('hint icon height'));
  assert.ok(Math.abs(native.hint.gap-reference.hint.gap)<=.5,label('hint icon/text gap'));
  assert.ok(Math.abs((native.hint.icon.y-native.hint.text.y)-(reference.hint.icon.y-reference.hint.text.y))<=.5,label('hint icon vertical alignment'));
  if(native.hint.wrapperFlex!==null)assert.equal(native.hint.wrapperFlex,'0 0 auto',label('hint wrapper must not shrink'));
 }
}
