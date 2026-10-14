// One authored timeline, cut into native per-screen files. No playback of hardware.
export const TRAVEL_FPS=25;
export function travelGeometry(i,c){
 const screens=[...i.screens].sort((a,b)=>a.x-b.x||a.y-b.y);
 const top=Math.max(...screens.map(s=>s.y)),bottom=Math.min(...screens.map(s=>s.y+s.h));
 if(bottom-top<240)throw Error('travel-no-common-line');
 if((i.masks||[]).length)throw Error('travel-masked-wall');
 if(screens.some(s=>s.rotation||s.w%2||s.h%2))throw Error('travel-native-geometry');
 const integrated=c?.visualStyle==='coffee-integrated';const h=integrated?bottom-top:Math.min(680,(bottom-top)*.63),w=integrated?h*16/9:h*.8;
 return {x0:screens.length===1?screens[0].x-w:screens[0].x+screens[0].w/2-w/2,x1:screens.length===1?screens[0].x+screens[0].w:screens.at(-1).x+screens.at(-1).w/2-w/2,y:(top+bottom-h)/2,w,h};
}
export function travelPosition(c,i,time=0){const g=travelGeometry(i,c),p=Math.max(0,Math.min(1,time/c.seconds));return {...g,x:g.x0+(g.x1-g.x0)*p};}
export function travelPlan(c,i,measure,fit){
 const layers=[],errors=[];let g;try{g=travelGeometry(i,c);}catch(e){return{valid:false,errors:[e.message],layers:[]};}
 for(const s of i.screens){
  const p=Math.min(s.w,s.h)*.055,box={x:s.x+p,y:s.y+p+105,w:s.w-2*p,h:Math.min(190,g.y-s.y-p-105)};
  layers.push({role:'logo',x:s.x+p,y:s.y+p,w:Math.min(440,s.w-2*p),h:84});
  for(const [role,text,r,min,max] of [['headline',c.headline,box,24,82],['cta',c.cta,{x:s.x+p,y:s.y+s.h-p-100,w:s.w-2*p,h:100},20,44]]){
   if(!text.trim())continue;const type=fit(text,r,min,max,measure);if(!type)errors.push('text-overflow:'+role);else layers.push({role,text,...r,...type});
  }
 }
 layers.push({role:'product',x:g.x0,y:g.y,w:g.w,h:g.h});
 return {valid:!errors.length,errors,layers,direction:'travel',installation:i.id,width:i.width,height:i.height,animation:{kind:'travel',...g},regions:i.screens};
}
export function travelJob(c,i,s){
 const g=travelGeometry(i,c),W=s.w,H=s.h;
 if(W%2||H%2||s.rotation)throw Error('travel-native-geometry');
 const filename=`${c.id}-${i.id}-travel-${s.id}-r${c.revision}${c.contentLanguage==='en'?'-en':''}-${W}x${H}.mp4`;
 // Output-only crop: each worker composites at the panel's resolution, never 8K.
 const x=`${g.x0-s.x}+${g.x1-g.x0}*min(t/${c.seconds},1)`;
 const vf=`[1:v]scale=${Math.round(g.w)}:${Math.round(g.h)}:force_original_aspect_ratio=decrease,pad=${Math.round(g.w)}:${Math.round(g.h)}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba[p];[0:v][p]overlay=x='${x}':y=${g.y-s.y}:eval=frame:shortest=1,format=yuv420p,setsar=1[out]`;
 return {filename,W,H,input:'input.png',durationSeconds:c.seconds,kind:'animated-travel',args:['-loop','1','-framerate','25','-i','input.png','-loop','1','-framerate','25','-i','product.png','-filter_complex',vf,'-map','[out]','-frames:v',String(c.seconds*25),'-an','-c:v','libx264','-preset','veryfast','-threads','1','-profile:v','high','-pix_fmt','yuv420p','-r','25','-g','25','-crf','21','-movflags','+faststart','output.mp4']};
}
export function mixedProgram(c,files=[]){
 const mural=c.installations.find(i=>i.phase==='mural');if(!mural)throw Error('mixed-mural-required');
 const units=c.installations.filter(i=>i.phase==='unit');
 return {schema:'admira.mixed-screen-program.v1',campaign:c.id,revision:c.revision,contentLanguage:c.contentLanguage||'es',clock:'https://brain.digitalavatar.ai/sync/state',fps:25,totalSeconds:c.seconds+(c.unitSeconds||8),hardwareVerified:false,screens:mural.screens.map(s=>{
  const unit=units.find(i=>i.width/i.height===s.w/s.h);if(!unit)throw Error('mixed-orientation-required');
  const file=(installation,screen)=>files.find(f=>f.installation===installation&&f.screen===screen)?.filename||null;
  return {screen:s.id,format:{width:s.w,height:s.h},items:[{kind:'mural',seconds:c.seconds,file:file(mural.id,s.id)},{kind:'individual',seconds:c.unitSeconds||8,file:file(unit.id,unit.screens[0].id)}]};
 })};
}

// Each registered location receives its own programme and shared wall clock.
export function mixedPrograms(c,files=[]){
 const units=c.installations.filter(i=>i.phase==='unit');
 return c.installations.filter(i=>i.phase==='mural'&&i.enabled!==false).map(i=>{
  const complete=!(c.wallStory&&c.direction==='travel'&&c.visualStyle==='coffee-integrated')&&i.screens.every(s=>units.some(u=>u.enabled!==false&&u.width/u.height===s.w/s.h));
  const program=complete?mixedProgram({...c,installations:[i,...units.filter(u=>u.enabled!==false)]},files):{schema:'admira.mixed-screen-program.v1',campaign:c.id,revision:c.revision,contentLanguage:c.contentLanguage||'es',clock:'https://brain.digitalavatar.ai/sync/state',fps:25,totalSeconds:c.seconds,hardwareVerified:false,screens:i.screens.map(s=>({screen:s.id,format:{width:s.w,height:s.h},items:[{kind:'mural',seconds:c.seconds,file:files.find(f=>f.installation===i.id&&f.screen===s.id)?.filename||null}]}))};
  if(files.length&&program.screens.some(s=>s.items.some(item=>!item.file)))throw Error('mixed-export-file-required');
  return {installation:i.id,program:{...program,installation:i.id}};
 });
}
