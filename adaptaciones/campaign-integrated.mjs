import {screenStory,screenLanguages,motionExpressions} from './campaign-story.mjs?v=starbucks-story-1';
// Photography, copy and brand share one composition. Native export and canvas
// preview use the same layer positions, entrance timing and global journey.
export const COFFEE_STYLE='coffee-integrated';
export const entrance=(time,start=0,duration=.6)=>{
 const p=Math.max(0,Math.min(1,(time-start)/duration));
 return {alpha:p,slide:24*(1-p)**3};
};
export function integratedPlan(c,i,measure,fit){
 const layers=[],errors=[];
 for(const s of i.screens){
  const portrait=s.h>s.w,p=Math.min(s.w,s.h)*.065;
  const logoSize=Math.min(s.w,s.h)*.128;
  layers.push({role:'logo',x:s.x+p,y:s.y+p,w:logoSize,h:logoSize,start:0,duration:.4});
  const box={x:s.x+p,y:s.y+(portrait?s.h*.142:s.h*.28),w:s.w*(portrait?.86:.47),h:s.h*(portrait?.245:.39)};
  const stories=screenStory(c,i,s);
  const max=Math.min(s.w,s.h)*(stories?(portrait?.13:.115):(portrait?.1:.095));
  const ctaBox={x:s.x+p,y:s.y+s.h*(portrait?.885:.805),w:s.w-2*p,h:s.h*.07};
  for(const segment of stories||[{text:c.headline,cta:c.cta,start:0}]){
  let type;
  if(!stories&&['Tu café sigue contigo.','Your coffee goes with you.'].includes(c.headline)){
   const lines=c.headline==='Your coffee goes with you.'?(portrait?['Your coffee','goes with','you.']:['Your coffee','goes with you.']):(portrait?['Tu café','sigue','contigo.']:['Tu café','sigue contigo.']);
   let px=max;while(px>24&&lines.some(t=>measure(t,px)>box.w))px--;
   type={px,lines,lineHeight:px*1.14};
  }else type=fit(segment.text,box,24,max,measure);
  if(!type||type.lines.length*type.lineHeight>box.h)errors.push('text-overflow:headline');
  else layers.push({role:'headline',text:segment.text,...box,...type,start:segment.start,duration:.6,...(stories?{end:segment.end,motion:segment.motion,language:segment.language}:{} )});
  if(segment.cta.trim()){
   const ct=fit(segment.cta,ctaBox,20,Math.min(s.w,s.h)*.044,measure);
   if(!ct)errors.push('text-overflow:cta');else layers.push({role:'cta',text:segment.cta,...ctaBox,...ct,start:segment.start+(stories?.8:1),duration:.5,...(stories?{end:segment.end,motion:segment.motion,language:segment.language}:{} )});
  }
  }
  if(c.price?.trim()){
   const r={...ctaBox,y:ctaBox.y-s.h*.07},pt=fit(c.price,r,20,Math.min(s.w,s.h)*.05,measure);
   if(!pt)errors.push('text-overflow:price');else layers.push({role:'price',text:c.price,...r,...pt,start:.7,duration:.5});
  }
 }
 return {valid:!errors.length,errors,layers,regions:i.screens,direction:c.direction,installation:i.id,width:i.width,height:i.height,visualStyle:COFFEE_STYLE,animation:{kind:'coffee-integrated',unit:i.phase==='unit'}};
}
const colour=(hex,a)=>hex+Math.round(a*255).toString(16).padStart(2,'0');
export function integratedBackground(x,c,s,assets,{mural=false}={}){
 const portrait=s.h>s.w,photo=portrait?(assets.portraitPhoto||assets.product):assets.product;
 x.fillStyle=c.background;x.fillRect(s.x,s.y,s.w,s.h);
 if(photo){
  const k=Math.max(s.w/photo.naturalWidth,(portrait?s.h*.62:s.h)/photo.naturalHeight);
  const w=photo.naturalWidth*k,h=photo.naturalHeight*k;
  x.globalAlpha=mural?.18:1;x.drawImage(photo,s.x+(s.w-w)/2,s.y+s.h-h,w,h);x.globalAlpha=1;
 }
 const g=portrait?x.createLinearGradient(0,s.y,0,s.y+s.h):x.createLinearGradient(s.x,0,s.x+s.w,0);
 for(const [stop,a] of (portrait?[[0,1],[.36,1],[.54,.78],[.72,.06],[1,.16]]:[[0,.97],[.28,.95],[.48,.68],[.7,.09],[1,.04]]))g.addColorStop(stop,colour(c.background,a));
 x.fillStyle=g;x.fillRect(s.x,s.y,s.w,s.h);
 const floor=x.createLinearGradient(0,s.y+s.h*.68,0,s.y+s.h);floor.addColorStop(0,colour(c.background,0));floor.addColorStop(1,colour(c.background,.82));x.fillStyle=floor;x.fillRect(s.x,s.y,s.w,s.h);
}
export function integratedLayerCanvas(l,c,assets){
 const cv=document.createElement('canvas');cv.width=Math.ceil(l.w);cv.height=Math.ceil(l.h+12);const x=cv.getContext('2d');
 if(l.role==='logo'){
  const image=assets.logo,k=Math.min(l.w/image.naturalWidth,l.h/image.naturalHeight);x.drawImage(image,(l.w-image.naturalWidth*k)/2,(l.h-image.naturalHeight*k)/2,image.naturalWidth*k,image.naturalHeight*k);
 }else{
  x.font=`${l.role==='headline'?'900':'600'} ${l.px}px 'Campaign Sans',sans-serif`;x.fillStyle=l.role==='headline'?c.foreground:c.accent;x.textBaseline='top';
  if(l.blockLines)l.blockLines.forEach((text,n)=>x.fillText(text,l.w*.001,n*l.lineHeight));else x.fillText(l.text,l.w*.001,0);
 }
 return cv;
}
export function integratedLayers(plan){
 return plan.layers.flatMap(l=>l.motion&&l.lines?[{...l,h:l.lines.length*l.lineHeight,blockLines:l.lines,lines:undefined}]:l.lines?l.lines.map((text,n)=>({...l,text,lines:undefined,y:l.y+n*l.lineHeight,h:l.lineHeight,start:l.start+(l.role==='headline'?n*.12:0)})):[l]);
}
export function integratedProductCanvas(c,i,assets,geometry){
 const cv=document.createElement('canvas');cv.width=Math.round(geometry.w);cv.height=Math.round(geometry.h);const x=cv.getContext('2d'),image=assets.product;
 const k=Math.max(cv.width/image.naturalWidth,cv.height/image.naturalHeight);x.drawImage(image,(cv.width-image.naturalWidth*k)/2,(cv.height-image.naturalHeight*k)/2,image.naturalWidth*k,image.naturalHeight*k);
 // The photograph dissolves into the shared brand field; no framed photo card.
 x.globalCompositeOperation='destination-in';
 const g=x.createLinearGradient(0,0,cv.width,0);for(const [p,a] of [[0,0],[.22,.4],[.37,1],[.72,1],[.9,.3],[1,0]])g.addColorStop(p,`rgba(0,0,0,${a})`);x.fillStyle=g;x.fillRect(0,0,cv.width,cv.height);
 const v=x.createLinearGradient(0,0,0,cv.height);for(const [p,a] of [[0,0],[.18,1],[.82,1],[1,0]])v.addColorStop(p,`rgba(0,0,0,${a})`);x.fillStyle=v;x.fillRect(0,0,cv.width,cv.height);
 return cv;
}
export function integratedJob(c,i,s,plan,geometry){
 const W=s.w,H=s.h;if(W%2||H%2||s.rotation)throw Error('travel-native-geometry');
 const seconds=i.phase==='unit'?(c.unitSeconds||8):c.seconds;
 const layers=integratedLayers(plan).filter(l=>l.x>=s.x&&l.x<s.x+s.w&&l.y>=s.y&&l.y<s.y+s.h),mural=i.phase!=='unit'&&c.direction==='travel';
 const files=[...(mural?['product.png']:[]),...layers.map((l,n)=>`layer-${n}.png`)];
 const args=['-filter_complex_threads','1','-loop','1','-framerate','25','-threads','1','-i','input.png'];for(const f of files)args.push('-loop','1','-framerate','25','-threads','1','-i',f);
 const filters=[];let previous='0:v',index=1;
 if(mural){const g=geometry;filters.push(`[${index}:v]format=rgba[p]`);filters.push(`[${previous}][p]overlay=x='${g.x0-s.x}+${g.x1-g.x0}*min(t/${c.seconds},1)':y=${g.y-s.y}:eval=frame:shortest=1[base]`);previous='base';index++;}
 for(const [n,l] of layers.entries()){
  const tag='layer'+n,next='stage'+n,m=motionExpressions(l);
  const exit=l.motion?`,fade=t=out:st=${l.end-.55}:d=0.55:alpha=1`:'';
  filters.push(`[${index++}:v]format=rgba,fade=t=in:st=${l.start}:d=${l.duration}:alpha=1${exit}[${tag}]`);
  filters.push(`[${previous}][${tag}]overlay=x='${l.x-s.x}+(${m.x})':y='${l.y-s.y}+(${m.y})':eval=frame:shortest=1${l.motion?`:enable='between(t,${l.start},${l.end})'`:''}[${next}]`);previous=next;
 }
 filters.push(`[${previous}]format=yuv420p,setsar=1[out]`);
 args.push('-filter_complex',filters.join(';'),'-map','[out]','-frames:v',String(seconds*25),'-an','-c:v','libx264','-preset','veryfast','-threads','1','-profile:v','high','-pix_fmt','yuv420p','-r','25','-g','25','-crf','19','-movflags','+faststart','output.mp4');
 const contentLanguages=screenLanguages(c,i,s),suffix=contentLanguages.length===2?'-bilingual':contentLanguages[0]==='en'?'-en':'';
 return {filename:`${c.id}-${i.id}-${c.direction}-${s.id}-r${c.revision}${suffix}-${W}x${H}.mp4`,W,H,input:'input.png',durationSeconds:seconds,kind:'animated-integrated',visualStyle:COFFEE_STYLE,contentLanguages,layers,files,mural,args};
}
