export const STARBUCKS_STORY={acts:[
 {es:['Cada café','tiene una','historia.'],en:['Every coffee','has a','story.']},
 {es:['Una pausa.','Un encuentro.','Tu momento.'],en:['A pause.','A connection.','Your moment.']},
 {es:['Elige tu café.','Disfruta el momento.','Hazlo tuyo.'],en:['Choose your coffee.','Enjoy the moment.','Make it yours.']}
]};
export function restoreStory(value){
 if(!value||!Array.isArray(value.acts)||value.acts.length!==3)throw Error('campaign-story');
 for(const act of value.acts)for(const lang of ['es','en'])if(!Array.isArray(act?.[lang])||act[lang].length!==3||act[lang].some(s=>typeof s!=='string'||!s.trim()||s.length>180))throw Error('campaign-story-copy');
 return JSON.parse(JSON.stringify(value));
}
export function screenLanguages(c,i,s){
 if(!c.wallStory||c.direction!=='travel'||c.visualStyle!=='coffee-integrated')return[c.contentLanguage||'es'];
 if(i.phase==='unit')return['es','en'];
 const ordered=[...i.screens].sort((a,b)=>a.x-b.x||a.y-b.y);
 if(ordered.length!==6)throw Error('story-six-screens');
 return[ordered.findIndex(v=>v.id===s.id)<3?'es':'en'];
}
export function screenStory(c,i,s){
 if(!c.wallStory)return null;
 const duration=i.phase==='unit'?(c.unitSeconds||8):c.seconds;
 if(duration<6)throw Error('story-duration');
 if(i.phase==='unit')return[
  {text:c.copyByLanguage?.es?.headline||c.headline,cta:c.copyByLanguage?.es?.cta||c.cta,language:'es',start:0,end:duration/2-.12,motion:1},
  {text:c.copyByLanguage?.en?.headline||'Every coffee has a story.',cta:c.copyByLanguage?.en?.cta||'Enjoy the moment.',language:'en',start:duration/2,end:duration-.12,motion:-1}
 ];
 const lang=screenLanguages(c,i,s)[0],ordered=[...i.screens].sort((a,b)=>a.x-b.x||a.y-b.y),slot=ordered.findIndex(v=>v.id===s.id)%3,step=duration/3;
 return c.wallStory.acts.map((act,n)=>({text:act[lang][slot],cta:'',language:lang,start:n*step+slot*.16,end:(n+1)*step-.22-(2-slot)*.08,motion:slot%2?-1:1}));
}
export function layerMotion(l,time){
 const p=Math.max(0,Math.min(1,(time-l.start)/l.duration));
 if(!l.motion)return{alpha:p,x:0,y:24*(1-p)**3};
 const exit=Math.max(0,Math.min(1,(time-(l.end-.55))/.55)),drift=Math.max(0,Math.min(1,(time-l.start)/(l.end-l.start)));
 return{alpha:time<=l.start||time>=l.end?0:Math.min(p,1-exit),x:l.motion*(32*(1-p)**3+10*drift-32*exit**3),y:18*(1-p)**3-14*exit**3};
}
export function motionExpressions(l){
 const p=`max(0,min(1,(t-${l.start})/${l.duration}))`;
 if(!l.motion)return{x:'0',y:`24*pow(1-(${p}),3)`};
 const q=`max(0,min(1,(t-${l.end-.55})/.55))`,d=`max(0,min(1,(t-${l.start})/${l.end-l.start}))`;
 return{x:`${l.motion}*(32*pow(1-(${p}),3)+10*(${d})-32*pow(${q},3))`,y:`18*pow(1-(${p}),3)-14*pow(${q},3)`};
}
