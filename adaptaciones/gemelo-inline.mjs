import {createFormatTwin,isStarbucksFormat} from './gemelo-factory.mjs?v=coffee-footer-1';
import {twinGeometry} from './gemelo-core.mjs?v=coffee-footer-1';

// One WebGL context for all visible cards. Snapshot previews never own media time.
export function mountInlineTwins(h){
 const entries=new Map(),cache=new Map(),gl=document.createElement('canvas');
 let built=null,loading=null,running=false,requested=false,disposed=false,revision=0;
 const ctl=new AbortController();
 const observer=new IntersectionObserver(rows=>{for(const row of rows){const e=entries.get(row.target);if(e)e.visible=row.isIntersecting;}void pump();},{rootMargin:'160px'});
 const wait=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 async function model(f){const kind=isStarbucksFormat(f)?'starbucks':'retail';if(built&&built.sceneKind!==kind){built.dispose();built=null;loading=null;}if(!built){loading||=createFormatTwin({format:f,canvas:gl,geometry:twinGeometry(f,h.destino(f)),formatId:f.id,quality:'best',signal:ctl.signal}).then(twin=>{if(disposed){twin.dispose();throw new DOMException('Aborted','AbortError');}return twin;}).catch(e=>{loading=null;throw e;});built=await loading;}return built;}

 function prune(){for(const [node] of entries)if(!node.isConnected){observer.unobserve(node);entries.delete(node);}}
 async function pump(){
  if(disposed)return;if(running){requested=true;return;}running=true;requested=false;
  try{prune();for(const e of entries.values()){
   if(disposed)break;if(!e.visible||e.done===revision||!h.ready()||!e.node.isConnected)continue;
   const version=revision,key=(isStarbucksFormat(e.f)?'starbucks:':'retail:')+e.stamp+':'+version;
   e.node.disabled=false;e.status.textContent=h.t('Cargando previo 3D…','Loading 3D preview…');
   try{let cached=cache.get(key);
    if(!cached){const twin=await model(e.f);if(disposed||!e.node.isConnected)continue;
     twin.setGeometry(twinGeometry(e.f,h.destino(e.f)),{formatId:e.f.id});twin.viewer.resize(640,360,1);twin.home();
     // Settle camera without redrawing textures or advancing the campaign clock.
     for(let n=0;n<45;n++)twin.viewer.render(0);
     twin.draw(cv=>(e.draw||h.draw)(cv,e.f,h.background?.(e.f)?.el));
     cached=document.createElement('canvas');cached.width=640;cached.height=360;cached.getContext('2d').drawImage(gl,0,0);
     cache.set(key,cached);while(cache.size>40)cache.delete(cache.keys().next().value);
    }
    if(version!==revision||!e.node.isConnected)continue;
    e.canvas.getContext('2d').drawImage(cached,0,0);e.done=version;e.node.dataset.state='ready';e.status.textContent=h.t('Previo 3D · abrir gemelo','3D preview · open twin');
   }catch(error){if(disposed)break;e.done=version;e.node.dataset.state='error';e.status.textContent=h.t('Abrir gemelo · reintentar 3D','Open twin · retry 3D');console.warn('Inline twin preview:',error);}
   await wait();
  }}finally{running=false;if(requested)queueMicrotask(pump);}
 }
 function preview(f,{draw,stamp=f.id}={}){
  const node=document.createElement('button');node.type='button';node.className='inline-twin view-twin';node.disabled=!h.ready();
  node.setAttribute('aria-label',h.t('Ver en gemelo digital','View in digital twin')+': '+f.nombre);
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;canvas.setAttribute('aria-label',h.t('Modelo 3D con esta adaptación','3D model with this adaptation'));
  const status=document.createElement('span');status.className='inline-twin-status';status.textContent=h.t('Previo 3D','3D preview');
  const note=document.createElement('small');note.textContent=isStarbucksFormat(f)?h.t('Starbucks · referencia fotográfica PG103','Starbucks · PG103 photo reference'):h.t('Modelo de ensayo · medidas nominales','Trial model · nominal dimensions');node.append(canvas,status,note);
  node.onclick=e=>{e.stopPropagation();h.open(f);};entries.set(node,{node,canvas,status,f,draw,stamp,done:-1,visible:false});observer.observe(node);return node;
 }
 function sync(){revision++;cache.clear();prune();for(const e of entries.values())e.node.disabled=!h.ready();void pump();}
 function dispose(){disposed=true;ctl.abort();observer.disconnect();entries.clear();cache.clear();built?.dispose();gl.width=gl.height=0;}
 window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
 return {preview,sync,dispose};
}
