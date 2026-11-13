/** #241 fitTags. The existing visible render tick calls this after replacing
 * the drawing, so font/viewport changes need no additional observer or listener. */
export function fitFoodTags(art,viewEl){
 const tags=[...art.querySelectorAll('.tag')];
 for(const tag of tags){tag.dataset.top??=tag.style.top;Object.assign(tag.style,{top:tag.dataset.top,maxWidth:'',display:''});}
 const v=viewEl.getBoundingClientRect(),a=art.getBoundingClientRect();
 for(const tag of tags){
  const x=a.left+parseFloat(tag.style.left)/100*a.width;
  const room=tag.dataset.anchor==='end'?x-v.left-4:2*Math.min(x-v.left,v.right-x)-8;
  tag.style.maxWidth=`${Math.max(0,Math.floor(room))}px`;
  const r=tag.getBoundingClientRect();
  if(r.bottom>v.bottom-2)tag.style.top=`${Math.max(0,Math.floor(r.top-a.top-(r.bottom-v.bottom+2)))}px`;
 }
 const [p,q]=tags.map(t=>t.getBoundingClientRect());
 if(p&&q&&p.left<q.right&&q.left<p.right&&p.top<q.bottom&&q.top<p.bottom)for(const t of tags)if(t.dataset.self!==undefined)t.style.display='none';
}
