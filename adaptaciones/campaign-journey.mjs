import {travelGeometry} from './campaign-travel.mjs?v=coffee-footer-1';

export const COFFEE_JOURNEY={schema:'admira.coffee-journey.v1',steam:true,copy:{
 es:['Tu café sigue contigo.','Haz una pausa.','Respira. Saborea.','Cambia de ritmo.','Este momento es tuyo.','Disfruta el camino.','Volvemos a empezar.'],
 en:['Your coffee goes with you.','Take a moment.','Breathe. Savour.','Find your rhythm.','This moment is yours.','Enjoy the journey.',"Let’s go again."]
},lowerCopy:{
 es:['Empieza por un buen café.','Baja el ritmo. Sube el ánimo.','Quédate con este instante.','Dale otro sabor a tu día.','Hazlo a tu manera.','La próxima pausa te espera.','Nos vemos en el siguiente sorbo.'],
 en:['Start with a great coffee.','Slow down. Lift your spirits.','Stay in this moment.','Give your day a new flavour.','Make it your own.','Your next pause awaits.','See you at the next sip.']
}};
export function restoreJourney(value){
 if(!value||value.schema!==COFFEE_JOURNEY.schema||!value.copy||typeof value.steam!=='boolean')throw Error('campaign-journey');
 const count=value.copy.es?.length;
 if(!Number.isInteger(count)||count<2||count>30)throw Error('campaign-journey-copy');
 for(const lang of ['es','en'])if(!Array.isArray(value.copy[lang])||value.copy[lang].length!==count||value.copy[lang].some(s=>typeof s!=='string'||!s.trim()||s.length>180))throw Error('campaign-journey-copy');
 if(value.lowerCopy!==undefined)for(const lang of ['es','en'])if(!Array.isArray(value.lowerCopy?.[lang])||value.lowerCopy[lang].length!==count||value.lowerCopy[lang].some(s=>typeof s!=='string'||!s.trim()||s.length>100))throw Error('campaign-journey-lower-copy');
 return {schema:COFFEE_JOURNEY.schema,steam:value.steam,copy:{es:[...value.copy.es],en:[...value.copy.en]},...(value.lowerCopy?{lowerCopy:{es:[...value.lowerCopy.es],en:[...value.lowerCopy.en]}}:{})};
}
export function journeyArrival(c,i,s){
 const g=travelGeometry(i,c),start=g.x0+g.w*.5;
 return Math.max(0,Math.min(c.seconds,(s.x-start)/(g.x1-g.x0)*c.seconds));
}
export function journeyStory(c,i,s){
 if(!c.journeyStory||i.phase==='unit')return null;
 const ordered=[...i.screens].sort((a,b)=>a.x-b.x||a.y-b.y),slot=ordered.findIndex(v=>v.id===s.id),lang=c.contentLanguage||'es',copy=c.journeyStory.copy[lang];
 if(slot<0)throw Error('journey-screen-count');
 if(c.seconds<ordered.length*2)throw Error('journey-duration');
 // Adapt the source message sequence to this installation, keeping its
 // opening and closing messages when a campaign has different wall layouts.
 const message=ordered.length===1?0:Math.round(slot*(copy.length-1)/(ordered.length-1));
 const arrival=journeyArrival(c,i,s),motion=slot%2?1:-1;
 const after={text:copy[message],cta:c.journeyStory.lowerCopy?.[lang]?.[message]||c.cta,language:lang,start:Math.max(0,arrival-.1),end:c.seconds,motion};
 return arrival<.75?[after]:[{text:c.headline,cta:'',language:lang,start:0,end:arrival+.25,motion:-motion},after];
}

// A small periodic sprite is shared by canvas preview and the native encoder.
// Its bottom centre stays on the coffee surface in the original photograph.
export const STEAM={size:256,frames:24,fps:12};
export function steamGeometry(g){return {x:g.w*.5-g.w*.19/2,y:g.y+g.h*.405-g.h*.36,w:Math.round(g.w*.19),h:Math.round(g.h*.36)};}
export function steamAtlas(){
 const {size,frames}=STEAM,cv=document.createElement('canvas');cv.width=size;cv.height=size*frames;const x=cv.getContext('2d');
 for(let frame=0;frame<frames;frame++){
  x.save();x.translate(0,frame*size);x.beginPath();x.rect(0,0,size,size);x.clip();
  for(let n=0;n<7;n++){
   const phase=(frame/frames+n/7)%1,fade=Math.sin(Math.PI*phase)**1.5;
   const bottom=size*(.99-.43*phase),top=bottom-size*(.2+.37*phase),origin=size*(.5+.13*Math.sin(n*2.4));
   const curl=Math.sin(phase*Math.PI*2+n)*size*.17;
   const gradient=x.createLinearGradient(0,top,0,bottom);gradient.addColorStop(0,'rgba(255,250,235,0)');gradient.addColorStop(.42,`rgba(255,250,235,${.38*fade})`);gradient.addColorStop(1,`rgba(255,250,235,${.08*fade})`);
   x.strokeStyle=gradient;x.lineWidth=7+phase*12;x.lineCap='round';x.shadowColor=`rgba(255,250,235,${.2*fade})`;x.shadowBlur=11;
   x.beginPath();x.moveTo(origin,bottom);x.bezierCurveTo(origin-curl,bottom-(bottom-top)*.35,origin+curl,top+(bottom-top)*.35,origin+curl*.35,top);x.stroke();
  }
  x.restore();
 }
 return cv;
}
export function drawSteam(x,atlas,g,time){
 const r=steamGeometry(g),frame=Math.floor(Math.max(0,time)*STEAM.fps)%STEAM.frames;
 x.drawImage(atlas,0,frame*STEAM.size,STEAM.size,STEAM.size,g.x+r.x,r.y,r.w,r.h);
}
