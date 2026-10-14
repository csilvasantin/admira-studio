// The twin shares the authored 25 fps timeline used by native MP4 exports.
export function createCampaignPlayback(now=()=>performance.now()){
 let active=false,playing=false,anchor=0,offset=0,format='',duration=1;
 const elapsed=()=>offset+(playing?(now()-anchor)/1000:0);
 const time=()=>Math.floor(((elapsed()%duration+duration)%duration)*25+1e-7)/25;
 function select(i,c){
  const next=i.phase==='unit'?(c.unitSeconds||8):c.seconds;
  if(!Number.isFinite(next)||next<1||next>60)throw Error('playback-duration');
  if(format!==i.id||duration!==next){format=i.id;duration=next;offset=0;anchor=now();}
 }
 return {
  start(i,c){select(i,c);active=playing=true;offset=0;anchor=now();},
  stop(){active=playing=false;offset=0;format='';},
  toggle(){if(!active)return;offset=time();anchor=now();playing=!playing;},
  seek(value){if(!active||!Number.isFinite(value))return;offset=Math.floor(Math.max(0,Math.min(duration-.04,value))*25+1e-7)/25;anchor=now();},
  snapshot(i,c){select(i,c);return{active,playing,time:active?time():0,duration,fps:25};},
  get active(){return active;}
 };
}
