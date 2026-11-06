// Native Planet composition. Artwork is optional and remains subject to shared adoption review.
// Names reference ff7b689a's library bundles; no Designer page, fixture or state engine is imported.
const PREFIX={lib:'lib',nav:'nav',hp:'hp',pr:'pr',wn:'wn',of:'of',en:'en',sw:'sw'};
const TOKENS={lib:'library',nav:'navigation',hp:'hospital-panel',pr:'promises',wn:'windows',of:'offices',en:'end',sw:'successor'};
export function createPlanetLibrary(document){
 const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 const available=name=>(document.documentElement.dataset.art??'').split(' ').includes(TOKENS[name.split('-')[0]])&&!!document.defaultView.getComputedStyle(document.documentElement).getPropertyValue(`--${PREFIX[name.split('-')[0]]}-asset-${name}`).trim();
 function art(name,cls='planet-library-icon'){
  const n=node('span',null,cls),prefix=PREFIX[name.split('-')[0]];
  if(!prefix||!/^[a-z0-9-]+$/.test(name))throw TypeError('Unknown library asset');
  n.style.backgroundImage=`var(--${prefix}-asset-${name})`;n.hidden=!available(name);n.setAttribute('aria-hidden','true');return n;
 }
 function roleFile(model,p){
  const role=p?.role?.name,a=p?.abilities;if(!a||!['Hacker','Engineer'].includes(role))return null;
  const file=node('section',null,'planet-library-file');file.setAttribute('aria-label',`${role} file`);
  if(role==='Hacker'){
   const state=a.shipHackSpent?'used':a.shipHackUnlocked?'armed':'sealed';file.append(art(`lib-ship-cartridge${state==='armed'?'':`-${state}`}`,'planet-library-prop'),node('strong',a.shipHackSpent?'Hack Spaceship used':a.shipHackUnlocked?'Hack Spaceship unlocked':'Hack Spaceship locked'));
   if(Number.isInteger(a.shipHackRound)&&a.shipHackSpent)file.append(node('p',`Registered in Round ${a.shipHackRound}.`));
  }else{
   file.append(art(a.engineerSpent?'lib-clamp-used':'lib-viewfinder','planet-library-prop'),node('strong',a.engineerSpent?'Capture used':'Capture the opposite room'));
   const record=a.engineerCapture;
   if(a.engineerSpent&&record)file.append(node('p',record.seatIds.length?`Fixed identities in Round ${record.round}: ${[...record.seatIds].sort().map(id=>`Player ${id.slice(5)}`).join(', ')}.`:`Round ${record.round}: no players were captured.`));
   else if(!a.engineerSpent){const own=model.board?.seats.find(s=>s.seatId===model.ownSeatId),opposite=own?.location==='Room A'?'Room B':own?.location==='Room B'?'Room A':null;
    if(opposite){const ids=model.board.seats.filter(s=>s.location===opposite).map(s=>s.seatId);file.append(node('p',`Current preview in ${opposite}: ${ids.length?ids.map(id=>`Player ${id.slice(5)}`).join(', '):'empty'}. The server fixes identities when registered.`));}
   }
  }
  return file;
 }
 // Static marker anchors from navigation/art.mjs at ff7b689a (320 x 236).
 // They describe a picture; they never predict or advance the authoritative route.
 const anchors={Start:[160,210],Junction:[160,164],B1:[114,126],B2:[78,88],'Blue Planet':[46,46],R1:[206,126],R2:[242,88],'Red Planet':[274,46]};
 function route(navigation){
  const at=anchors[navigation.position];if(!at||!available('nav-panel'))return null;
  const panel=node('div',null,'planet-route-picture');panel.setAttribute('role','img');panel.setAttribute('aria-label',`Private route: ${navigation.position}; direction ${navigation.direction??'awaiting resolution'}.`);
  panel.append(art('nav-panel','planet-library-fill'));const ship=art('nav-ship','planet-route-ship');ship.style.left=`${at[0]/320*100}%`;ship.style.top=`${at[1]/236*100}%`;panel.append(ship);
  for(const [label,x,y]of [['Blue',46,14],['Red',274,14]]){const n=node('small',label,'planet-route-label');n.style.left=`${x/320*100}%`;n.style.top=`${y/236*100}%`;panel.append(n);}return panel;
 }
 function panelConsole(model,p){
  const selected=model.action?.type==='PANEL_CODE'&&['number','confirm'].includes(model.action.step)?model.action.selected[0]:null;
  if(!available('hp-console'))return node('p',selected?`Doctor number ${selected.slice(5)}`:p?.panelAttemptSpent?'Your panel attempt is used.':'One panel attempt in the match.');
  const box=node('div',null,'planet-panel-console');box.append(art('hp-console','planet-library-fill'));
  const caption=node('strong',selected?selected.slice(5):p?.panelAttemptSpent?'USED':'—','planet-panel-number');box.append(caption);return box;
 }
 function decorateChoice(button,action,choice){
  if(action.type==='PANEL_CODE'&&/^seat-[1-9]$/.test(choice.value)){button.textContent=choice.value.slice(5);button.setAttribute('aria-label',`Doctor number ${choice.value.slice(5)}`);button.classList.add('planet-number-key');}
  if(action.type==='OFFER_PROMISE'&&action.step==='promise')button.prepend(art(`pr-kind-${choice.value.toLowerCase().replaceAll('_','-')}`));
 }
 function decoratePromise(card,promise){
  card.prepend(art(`pr-kind-${promise.kind.toLowerCase().replaceAll('_','-')}`));
  if(promise.accepted)card.append(art(`pr-seal-${promise.status.toLowerCase().replaceAll(' ','-')}`));
 }
 return {art,roleFile,route,panelConsole,decorateChoice,decoratePromise};
}
