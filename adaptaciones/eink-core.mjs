export const EINK_STYLE='eink-poster';
export const EINK_PROFILES=[
 {id:'samsung-em13dx',name:{es:'Samsung EM13DX · 13″ · 1200×1600',en:'Samsung EM13DX · 13″ · 1200×1600'},width:1200,height:1600,palette:'color'},
 {id:'bridge-bwry',name:{es:'Etiqueta · 480×800 · negro, blanco, rojo y amarillo',en:'Label · 480×800 · black, white, red and yellow'},width:480,height:800,palette:'bwry'},
 {id:'custom',name:{es:'Otra etiqueta · medidas propias',en:'Other label · custom size'},palette:'color'}
];
export function restoreEink(value){
 if(!value||!Array.isArray(value.profiles)||!value.profiles.length||new Set(value.profiles).size!==value.profiles.length||value.profiles.some(id=>!EINK_PROFILES.some(p=>p.id===id)))throw Error('eink-profile');
 const out={profiles:[...value.profiles]};
 if(value.source){
  const s=value.source,source={};
  if(s.campaignId!==undefined){if(!/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(s.campaignId)||!Number.isInteger(s.revision)||s.revision<1)throw Error('eink-source');source.campaignId=s.campaignId;source.revision=s.revision;}
  if(s.stockId!==undefined){if(!/^[a-zA-Z0-9_-]{1,160}$/.test(s.stockId)||!Number.isFinite(s.frameSeconds)||s.frameSeconds<0||s.frameSeconds>36000)throw Error('eink-source');source.stockId=s.stockId;source.frameSeconds=s.frameSeconds;}
  if(!Object.keys(source).length)throw Error('eink-source');out.source=source;
 }
 return out;
}
export function einkInstallations(eink,{posterWidth=1080,posterHeight=1920}={}){
 return restoreEink(eink).profiles.map(id=>{const p=EINK_PROFILES.find(p=>p.id===id),w=p.width||posterWidth,h=p.height||posterHeight;
  return {id:'eink-'+id,name:p.name,width:w,height:h,mediaType:'image',phase:'unit',einkProfile:id,palette:p.palette,screens:[{id:'label',x:0,y:0,w,h,rotation:0}]};
 });
}
export function einkPlan(c,i,direction,measure,fit){
 if(i.mediaType!=='image'||i.screens.length!==1)return {valid:false,errors:['eink-image-only'],layers:[]};
 const s=i.screens[0],w=s.w,h=s.h,box=(x,y,bw,bh)=>({x:s.x+x*w,y:s.y+y*h,w:bw*w,h:bh*h});
 const layers=[{role:'logo',...box(.07,.045,.15,.095)},{role:'product',...box(.07,.43,.86,.33)}],errors=[];
 for(const [role,text,b,lo,hi] of [['headline',c.headline,box(.07,.17,.86,.22),w*.04,w*.105],['cta',c.cta,box(.07,.81,.86,.095),w*.025,w*.04],['price',c.price,box(.07,.925,.86,.04),w*.025,w*.035]]){
  if(!String(text||'').trim())continue;const type=fit(text,b,lo,hi,measure);if(!type)errors.push('text-overflow:'+role);else layers.push({role,text,...b,...type});
 }
 for(const l of layers){const p=c.placements?.[`${i.id}:${direction}:${l.role}`];if(p){Object.assign(l,{x:p.x*i.width,y:p.y*i.height,w:p.w*i.width,h:p.h*i.height});if(l.text){const type=fit(l.text,l,w*.025,w*.105,measure);if(type)Object.assign(l,type);else errors.push('text-overflow:'+l.role);}}
  if(l.x<s.x||l.y<s.y||l.x+l.w>s.x+w+.01||l.y+l.h>s.y+h+.01)errors.push('unsafe-layer:'+l.role);
 }
 for(let a=0;a<layers.length;a++)for(let b=a+1;b<layers.length;b++){const x=layers[a],y=layers[b];if(x.x<y.x+y.w-.01&&x.x+x.w>y.x+.01&&x.y<y.y+y.h-.01&&x.y+x.h>y.y+.01)errors.push('layer-overlap');}
 return {valid:!errors.length,errors:[...new Set(errors)],layers,direction,installation:i.id,width:i.width,height:i.height};
}
export const BWRY=[[0,0,0],[255,255,255],[215,0,0],[255,215,0]];
// Serpentine error diffusion keeps photographs readable on the four-colour bridge.
export function quantizeBWRY(image){
 const {width:w,height:h,data}=image,work=new Float32Array(w*h*3);
 for(let n=0;n<w*h;n++)for(let k=0;k<3;k++)work[n*3+k]=data[n*4+k];
 const spread=(x,y,e,f)=>{if(x<0||x>=w||y<0||y>=h)return;for(let k=0;k<3;k++)work[(y*w+x)*3+k]+=e[k]*f;};
 for(let y=0;y<h;y++){const step=y%2?-1:1;for(let a=0;a<w;a++){const x=step===1?a:w-1-a,n=y*w+x,r=[0,1,2].map(k=>Math.max(0,Math.min(255,work[n*3+k])));let best=BWRY[0],distance=Infinity;
  for(const p of BWRY){const d=(r[0]-p[0])**2*.3+(r[1]-p[1])**2*.59+(r[2]-p[2])**2*.11;if(d<distance){distance=d;best=p;}}
  const e=r.map((v,k)=>v-best[k]);for(let k=0;k<3;k++)data[n*4+k]=best[k];data[n*4+3]=255;
  spread(x+step,y,e,7/16);spread(x-step,y+1,e,3/16);spread(x,y+1,e,5/16);spread(x+step,y+1,e,1/16);
 }}return image;
}
