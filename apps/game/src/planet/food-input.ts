/** One physical contact per visible Hold. The host follows releases at window
 * scope and keeps this instance across button/text/viewport redraws. */
export interface FoodHoldActions {down():boolean; up():void; held?():boolean}
export interface FoodHoldInput {
 pointerDown(pointerId:number):boolean;
 pointerUp(pointerId:number):void;
 keyDown(key:string,repeat?:boolean):boolean;
 keyUp(key:string):void;
 assistiveClick():void;
 releaseAll():void;
 dispose():void;
}
export function createFoodHoldInput(actions:FoodHoldActions):FoodHoldInput {
 let contact:{kind:'pointer';id:number}|{kind:'key';key:string}|{kind:'assistive'}|null=null,disposed=false;
 const holdKey=(key:string)=>key===' '||key==='Enter';
 function release(){if(!contact||disposed)return;contact=null;actions.up();}
 return {
  pointerDown(id){if(disposed||contact||!Number.isSafeInteger(id))return false;contact={kind:'pointer',id};return actions.down();},
  pointerUp(id){if(contact?.kind==='pointer'&&contact.id===id)release();},
  keyDown(key,repeat=false){if(disposed||repeat||contact||!holdKey(key))return false;contact={kind:'key',key};return actions.down();},
  keyUp(key){if(contact?.kind==='key'&&contact.key===key)release();},
  assistiveClick(){if(disposed)return;if(contact?.kind==='assistive')release();else if(!contact){
   if(actions.held?.())actions.up();else {contact={kind:'assistive'};actions.down();}
  }},
  releaseAll:release,
  dispose(){release();disposed=true;},
 };
}
