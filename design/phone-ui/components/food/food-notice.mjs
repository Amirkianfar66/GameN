import {foodPackageCount,foodPackagesText} from '@mothership/presentation';
import {createFoodUi} from './food-ui.mjs';

/** A display receives only neutral Food facts. No own-seat controller or cards. */
export function mountFoodPublic(root,game){
 const document=root.ownerDocument,ui=createFoodUi(document),frame=ui.h('div.planet-food.ph',{'data-food-component':''});root.classList.add('planet-food-host');root.append(frame);
 let previous=null,doses=null;
 const stop=game.subscribe(model=>{
  if(!model.food||model.concealed||model.connection!=='live'){frame.hidden=true;return;}
  frame.hidden=false;const f=model.food,delta=doses===null?0:f.stock.doses-doses;doses=f.stock.doses;
  if(delta>0)previous=`Food stock: ${foodPackagesText(doses)} (+${foodPackageCount(delta)})`;
  else if(delta<0)previous=null;
  const top=game.top();
  const node=f.step?.kind==='AWAY'?ui.banner({icon:'supply',title:'Two players are away on the Food Supply Task',sub:'The board shows who. They come back when its time is up; the Task shows on their phones only.'})
   :previous?ui.toast(previous,'supply'):null;
  frame.replaceChildren(...(node?[ui.h('div.fs-banner',{style:{top:`${top+44}px`}},node)]:[]));
 });
 return {dispose(){stop();frame.remove();}};
}
