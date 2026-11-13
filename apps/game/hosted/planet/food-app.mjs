import {createFoodTaskController,readPlanetView,readPlanetFood} from '@mothership/game';
import {foodPackageCount} from '@mothership/presentation';
import {mountFoodRenderer} from './food-render.mjs';
import {createFoodUi} from './food-ui.mjs';

/** Bind both Food surfaces to the existing session feed, never a second poller. */
export function mountFoodApp(root,{session,game,transport,binding,ports,recovery,assets,preferences,renderer}){
 const controller=createFoodTaskController(session.foodTransport(),{...ports,recovery},{binding,readClock:()=>transport.readClock?.()??{status:'unsynced'}});
 let identities=transport.identities?.()??[],view=null,disposed=false;
 const foodRoot=root.ownerDocument.createElement('div');root.append(foodRoot);
 view=mountFoodRenderer(foodRoot,controller,{identities:()=>identities,ordinary:()=>game.getModel(),assets,preferences,
  navigate:next=>renderer.navigate(next),settings:()=>renderer.navigate('settings'),surface:next=>renderer.foodSurface(next),boardMode:()=>renderer.view,bars:()=>renderer.bars()});
 const stop=transport.listen({matchId:binding.matchId,seatId:binding.seatId},{snapshot:s=>{
  const ordinary=readPlanetView(s.value,binding.matchId,binding.seatId),food=ordinary&&readPlanetFood(s,ordinary,binding.seatId);
  if(!ordinary||!food?.playerView){controller.disconnect('authorization');return;}
  identities=transport.identities?.()??identities;
  if(controller.observe(food.playerView,{matchId:ordinary.matchId,versions:food.playerView.versions,phaseId:ordinary.phase.id,round:ordinary.round,serverNowMs:food.serverTimeMs},s.fresh)){
   if(controller.getModel().canCheck)void controller.checkReceipts();
  }
 },error:kind=>controller.disconnect(kind??'network')});
 return {controller,recovery,setVisible(value){if(!value)view?.release();controller.setVisible(value);},
  openTasks(){view?.openTasks();},refresh(){view?.refresh();},
  detach(){view?.dispose();view=null;foodRoot.remove();},
  dispose(){if(disposed)return;disposed=true;view?.dispose();view=null;stop();controller.dispose();foodRoot.remove();}};
}

/** A display receives only neutral Food facts. No own-seat controller or cards. */
export function mountFoodPublic(root,game){
 const document=root.ownerDocument,ui=createFoodUi(document),frame=ui.h('div.planet-food.ph');root.classList.add('planet-food-host');root.append(frame);
 let previous=null,doses=null;
 const stop=game.subscribe(model=>{
  if(!model.food||model.concealed||model.connection!=='live'){frame.hidden=true;return;}
  frame.hidden=false;const f=model.food,delta=doses===null?0:f.stock.doses-doses;doses=f.stock.doses;
  if(delta>0)previous=`Food stock: ${foodPackageCount(doses)} packages (+${foodPackageCount(delta)})`;
  else if(delta<0)previous=null;
  const top=root.parentElement?.querySelector('.planet-header')?.getBoundingClientRect().height??0;
  const node=f.step?.kind==='AWAY'?ui.banner({icon:'supply',title:'Two players are away on the Food Supply Task',sub:'The board shows who. They come back when its time is up; the Task shows on their phones only.'})
   :ui.toast(previous??`Food stock: ${foodPackageCount(doses)} packages`,'supply');
  frame.replaceChildren(ui.h('div.fs-banner',{style:{top:`${top+44}px`}},node));
 });
 return {dispose(){stop();frame.remove();}};
}
