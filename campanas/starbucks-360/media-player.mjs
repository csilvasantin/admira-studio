import * as T from './three.mjs';

export class SurfacePlayer {
  constructor(surface, tracks, screenIndex, onTexture, onState) {
    Object.assign(this,{surface,tracks,screenIndex,onTexture,onState,index:-1,generation:0,video:null,texture:null,pending:null,warm:null,blend:null,state:'Cargando',error:'',lastCorrection:0,offset:0,running:true});
    this.total=tracks.reduce((sum,t)=>sum+t.seconds,0);
    this.bucket=document.querySelector('#media-elements');
  }
  locate(time) {
    let t=((time+this.offset)%this.total+this.total)%this.total;
    for(let i=0;i<this.tracks.length;i++) {if(t<this.tracks[i].seconds)return {index:i,time:t};t-=this.tracks[i].seconds;}
    return {index:0,time:0};
  }
  setOffset(trackId) {this.offset=0;for(const t of this.tracks){if(t.id===trackId)break;this.offset+=t.seconds;}}
  release(v,texture) {if(v){v.pause();v.removeAttribute('src');v.load();v.remove();}texture?.dispose();}
  create(index) {
    const track=this.tracks[index],video=document.createElement('video');
    video.muted=true;video.playsInline=true;video.loop=false;video.preload='auto';video.crossOrigin='anonymous';
    video.setAttribute('muted','');video.setAttribute('playsinline','');
    video.dataset.surfaceId=this.surface.id;video.dataset.trackId=track.id;
    video.src=track.files?track.files[this.screenIndex]:track.file;this.bucket.appendChild(video);video.load();return video;
  }
  ready(video) {
    if(video.readyState>=2)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const done=error=>{clearTimeout(timer);video.removeEventListener('loadeddata',ok);video.removeEventListener('error',bad);error?reject(error):resolve();};
      const ok=()=>done(),bad=()=>done(new Error(video.error?.message||'Archivo de vídeo no disponible'));
      const timer=setTimeout(()=>done(new Error('Tiempo de carga agotado')),15000);
      video.addEventListener('loadeddata',ok,{once:true});video.addEventListener('error',bad,{once:true});
    });
  }
  prepare(index) {
    if(this.tracks.length<2||this.warm?.index===index)return;
    if(this.warm)this.release(this.warm.video);
    const entry={index,video:this.create(index),taken:false};this.warm=entry;
    this.ready(entry.video).then(async()=>{
      if(entry.taken||this.warm!==entry)return;
      try{await entry.video.play();const stop=()=>{if(!entry.taken&&this.warm===entry)entry.video.pause();};
        if(entry.video.requestVideoFrameCallback)entry.video.requestVideoFrameCallback(stop);else requestAnimationFrame(stop);
      }catch{}
    }).catch(()=>{});
  }
  decoded(video,generation) {
    if(!this.running&&video.readyState>=2&&!video.seeking)return Promise.resolve(true);
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Esperando fotograma decodificado')),10000);
      const frame=(now,metadata)=>{
        if(generation!==this.generation){clearTimeout(timer);resolve(false);return;}
        const wanted=this.latestTime??video.currentTime,decodedTime=metadata?.mediaTime??video.currentTime;
        if(video.seeking||video.readyState<2||(this.running&&Math.abs(decodedTime-wanted)>.3)){
          if(!video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-wanted)>.3)video.currentTime=Math.min(wanted,Math.max(0,video.duration-.04));
          schedule();return;
        }
        clearTimeout(timer);resolve(true);
      };
      const schedule=()=>video.requestVideoFrameCallback?video.requestVideoFrameCallback(frame):requestAnimationFrame(()=>requestAnimationFrame(frame));
      schedule();
    });
  }
  finishBlend() {
    const b=this.blend;if(!b)return;this.blend=null;
    this.onTexture(this.texture,this.video.videoWidth/this.video.videoHeight);
    this.release(b.old,b.oldTexture);b.texture.dispose();
  }
  blendFrame(now) {
    const b=this.blend;if(!b)return;
    const alpha=Math.min(1,Math.max(0,(now-b.start)/320)),ctx=b.canvas.getContext('2d');
    ctx.globalAlpha=1;ctx.drawImage(b.old,0,0,b.canvas.width,b.canvas.height);
    ctx.globalAlpha=alpha;ctx.drawImage(this.video,0,0,b.canvas.width,b.canvas.height);ctx.globalAlpha=1;b.texture.needsUpdate=true;
    if(alpha>=1)this.finishBlend();
  }
  async load(index,time) {
    const generation=++this.generation,track=this.tracks[index];
    this.finishBlend();if(this.pending)this.release(this.pending);
    this.requested=index;this.state='Cargando';this.error='';this.onState();
    let video;if(this.warm?.index===index){const entry=this.warm;this.warm=null;entry.taken=true;video=entry.video;}else video=this.create(index);
    this.pending=video;
    try {
      await this.ready(video);if(generation!==this.generation)return;
      time=this.latestTime??time;
      if(Math.abs(video.currentTime-time)>.04){
        video.currentTime=Math.min(time,Math.max(0,video.duration-.04));
        if(video.seeking)await new Promise(resolve=>{const done=()=>{clearTimeout(timer);resolve();};const timer=setTimeout(done,1000);video.addEventListener('seeked',done,{once:true});});
      }
      if(generation!==this.generation)return;
      let autoplay=true;if(this.running)try{await video.play()}catch{autoplay=false;}
      if(!await this.decoded(video,generation)||generation!==this.generation)return;
      const texture=new T.VideoTexture(video);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;
      const old=this.video,oldTexture=this.texture;
      this.video=video;this.texture=texture;this.pending=null;this.index=index;
      if(old&&old.readyState>=2){
        old.pause();const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
        const blendTexture=new T.CanvasTexture(canvas);blendTexture.colorSpace=T.SRGBColorSpace;blendTexture.minFilter=T.LinearFilter;blendTexture.magFilter=T.LinearFilter;blendTexture.generateMipmaps=false;
        this.blend={old,oldTexture,canvas,texture:blendTexture,start:performance.now()};this.blendFrame(performance.now());this.onTexture(blendTexture,video.videoWidth/video.videoHeight);
      }else{this.onTexture(texture,video.videoWidth/video.videoHeight);this.release(old,oldTexture);}
      this.state=this.running?(autoplay?'Reproduciendo':'Pulsa Reproducir'):'Pausado';this.onState();this.prepare((index+1)%this.tracks.length);
    }catch(error){
      if(generation!==this.generation)return;
      if(track.cacheFile&&!track.cached){this.tracks[index]={...track,file:track.cacheFile,cached:true};this.state='Cargando copia Stock';this.error='';this.retryAt=0;}
      else{this.state='Error';this.error=error.message;this.retryAt=performance.now()+5000;}
      this.requested=-1;this.release(video);this.pending=null;this.onState();
    }
  }
  tick(time,now,running) {
    this.running=running;this.blendFrame(now);const wanted=this.locate(time);this.latestTime=wanted.time;
    if(wanted.index!==this.requested){if(now<(this.retryAt||0))return;this.load(wanted.index,wanted.time);return;}
    const v=this.video;if(!v||this.index!==wanted.index||this.pending)return;
    if(now-this.lastCorrection>250&&!v.seeking&&v.readyState>=2){
      this.lastCorrection=now;const drift=wanted.time-v.currentTime;
      if(Math.abs(drift)>.75){v.currentTime=Math.min(wanted.time,Math.max(0,v.duration-.04));v.playbackRate=1;}
      else v.playbackRate=running?Math.max(.97,Math.min(1.03,1+drift*.1)):1;
    }
    if(!running&&!v.paused)v.pause();
    this.state=running?(v.paused?'Pulsa Reproducir':v.readyState<2?'Cargando':'Reproduciendo'):'Pausado';
  }
  async resume(){this.running=true;if(this.video)try{await this.video.play();this.state='Reproduciendo'}catch{this.state='Pulsa Reproducir'}this.onState();}
  pause(){this.running=false;this.video?.pause();this.state='Pausado';this.onState();}
  get track(){return this.tracks[this.index>=0?this.index:this.requested>=0?this.requested:0];}
  get seconds(){return this.pending?.currentTime||this.video?.currentTime||0;}
}
