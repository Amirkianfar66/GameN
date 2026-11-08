/** Non-secret presentation settings. Browser text preferences remain the base for relative sizing. */
export function createPlanetPreferences(document){
 const win=document.defaultView,key='mothership:planet:presentation-preferences',html=document.documentElement;
 const media=win.matchMedia('(prefers-reduced-motion: reduce)'),previousFont=html.style.fontSize,previousMotion=html.dataset.motion;
 let reduced=false,textScale=1,disposed=false;
 try{const value=JSON.parse(win.localStorage.getItem(key));if(value?.reduced===true)reduced=true;if([1,1.5,2].includes(value?.textScale))textScale=value.textScale;}catch{}
 function apply(){if(disposed)return;html.style.fontSize=`${textScale*100}%`;html.dataset.motion=reduced||media.matches?'reduced':'normal';document.dispatchEvent(new win.CustomEvent('mothership:preferences-change'));}
 function save(){try{win.localStorage.setItem(key,JSON.stringify({reduced,textScale}));}catch{}apply();}
 apply();media.addEventListener('change',apply);
 return {get:()=>({reduced:reduced||media.matches,textScale}),
  controls(parent){
   const details=document.createElement('details');details.className='planet-display-settings';const summary=document.createElement('summary');summary.textContent='Display settings';details.append(summary);
   const motionLabel=document.createElement('label'),motion=document.createElement('input');motion.type='checkbox';motion.checked=reduced||media.matches;motion.disabled=media.matches;motionLabel.append(motion,document.createTextNode('Reduce motion'));motion.addEventListener('change',()=>{reduced=motion.checked;save()});details.append(motionLabel);
   const textLabel=document.createElement('label'),select=document.createElement('select');select.setAttribute('aria-label','Text size');for(const [value,label]of [[1,'Standard'],[1.5,'Large'],[2,'Largest']]){const o=document.createElement('option');o.value=String(value);o.textContent=label;select.append(o);}select.value=String(textScale);textLabel.append(document.createTextNode('Text size'),select);select.addEventListener('change',()=>{textScale=Number(select.value);save()});details.append(textLabel);parent.append(details);
  },
  dispose(){disposed=true;media.removeEventListener('change',apply);html.style.fontSize=previousFont;if(previousMotion===undefined)delete html.dataset.motion;else html.dataset.motion=previousMotion;},
 };
}
