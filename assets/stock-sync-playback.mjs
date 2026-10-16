// The preview clock follows continuous playback. Small decoder/rAF differences
// must not trigger a seek, which flushes a decoder and can stall the whole wall.
export function loopDrift(target,current,duration){
 if(![target,current,duration].every(Number.isFinite)||duration<=0)return 0;
 let delta=(target-current)%duration;
 if(delta>duration/2)delta-=duration;
 if(delta<-duration/2)delta+=duration;
 return delta;
}
export function previewCorrection({target,current,duration,fps=25,seeking=false,playing=true,now=0,lastSeek=-Infinity}){
 if(!playing||seeking)return {kind:'hold',rate:1};
 const delta=loopDrift(target,current,duration),gap=Math.abs(delta);
 if(gap>.6&&now-lastSeek>=1500)return {kind:'seek',time:target,rate:1};
 if(gap<=Math.max(.08,2/Math.max(1,fps)))return {kind:'rate',rate:1};
 return {kind:'rate',rate:Math.max(.97,Math.min(1.03,1+delta*.15))};
}
export function followPreviewVideo(row,options){
 const v=row.v;
 if(options.now-(row.lastCheck??-Infinity)<250)return;
 row.lastCheck=options.now;
 const fix=previewCorrection({...options,current:v.currentTime,seeking:v.seeking,lastSeek:row.lastSeek??-Infinity});
 if(v.playbackRate!==fix.rate)v.playbackRate=fix.rate;
 if(fix.kind==='seek'){row.lastSeek=options.now;v.currentTime=fix.time;}
}
