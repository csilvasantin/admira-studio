// A viewing copy of already-published outputs. Delivery files and geometry stay
// unchanged; all screens in the twin then sample one decoded frame.
export function previewJob(a){
 if(!a||!Number.isFinite(a.width)||!Number.isFinite(a.height)||a.width<=0||a.height<=0||!Number.isFinite(a.seconds)||a.seconds<=0||a.seconds>600||!Number.isInteger(a.fps)||a.fps<1||a.fps>120||!Array.isArray(a.screens)||a.screens.length<2||a.screens.length>16)throw Error('invalid-preview-layout');
 const scale=Math.min(1,4032/a.width,2160/a.height),W=Math.max(2,Math.floor(a.width*scale/2)*2),H=Math.max(2,Math.floor(a.height*scale/2)*2);
 const inputs=a.screens.map((s,n)=>{
  const u=new URL(s.url);
  if(u.protocol!=='https:'||u.hostname!=='stock.admira.store'||!/^\/stock\/[a-zA-Z0-9-]+\/asset\.mp4$/.test(u.pathname)||![s.x,s.y,s.w,s.h].every(Number.isFinite)||s.x<0||s.y<0||s.w<=0||s.h<=0||s.x+s.w>a.width+.01||s.y+s.h>a.height+.01||![0,90,180,270].includes(s.rotation||0))throw Error('invalid-preview-input');
  const x=Math.round(s.x*W/a.width),y=Math.round(s.y*H/a.height),w=Math.max(1,Math.round((s.x+s.w)*W/a.width)-x),h=Math.max(1,Math.round((s.y+s.h)*H/a.height)-y);
  return {name:n?'preview-source-'+n+'.mp4':'input',url:s.url,x,y,w,h,rotation:s.rotation||0};
 });
 const filters=inputs.map((s,n)=>`[${n}:v]${s.rotation===90?'transpose=2,':s.rotation===180?'hflip,vflip,':s.rotation===270?'transpose=1,':''}scale=${s.w}:${s.h}:flags=lanczos,setsar=1,setpts=PTS-STARTPTS[s${n}]`);
 filters.push(`color=c=0x10251f:s=${W}x${H}:r=${a.fps}:d=${a.seconds}[base]`);
 inputs.forEach((s,n)=>filters.push(`[${n?'p'+(n-1):'base'}][s${n}]overlay=x=${s.x}:y=${s.y}:eof_action=repeat[p${n}]`));
 filters.push(`[p${inputs.length-1}]format=yuv420p[out]`);
 const args=['-y',...inputs.flatMap(s=>['-i',s.name]),'-filter_complex_threads','1','-filter_complex',filters.join(';'),'-map','[out]','-an','-t',String(a.seconds),'-r',String(a.fps),'-c:v','libx264','-preset','ultrafast','-crf','18','-pix_fmt','yuv420p','-g',String(a.fps),'-bf','0','-threads','1','-movflags','+faststart','output.mp4'];
 return {sourceURL:inputs[0].url,input:'input',extraFiles:inputs.slice(1).map(({name,url})=>({name,url})),durationSeconds:a.seconds,args,outputs:[{file:'output.mp4',filename:'preview-'+a.id+'.mp4',W,H}],width:W,height:H,inputs};
}
export const previewIdentity=a=>JSON.stringify({width:a.width,height:a.height,seconds:a.seconds,fps:a.fps,screens:a.screens.map(s=>[s.id,s.stockId,s.url,s.x,s.y,s.w,s.h,s.rotation||0,s.languages,s.seconds,s.fps])});
