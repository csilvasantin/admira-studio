// The photo establishes finishes and relative 2+1+3 spacing, not surveyed metres.
// Content crops always retain the editor's native pixel geometry.
export const STARBUCKS_PHOTO='/assets/xpaces/starbucks/pg103-reference.png';
export const STARBUCKS_ROOM=Object.freeze({width:12.2,depth:3.1,height:3.75});
export function isStarbucksFormat(f){return /starbucks|alsea/i.test([f?.id,f?.nombre,f?.client?.id,f?.installation?.catalogClient].filter(Boolean).join(' '));}
export function starbucksPlacement(g,{formatId=''}={}){
 const {ancho:W,alto:H}=g?.pared||{},segments=g?.segments;
 if(!Number.isFinite(W)||!Number.isFinite(H)||W<=0||H<=0||!Array.isArray(segments)||!segments.length||segments.length>64)throw Error('invalid-starbucks-geometry');
 for(const {wall:r} of segments)if(!r||![r.x,r.y,r.w,r.h].every(Number.isFinite)||r.x<0||r.y<0||r.w<=0||r.h<=0||r.x+r.w>W+.01||r.y+r.h>H+.01)throw Error('invalid-starbucks-screen');
 const pg=/pg103/.test(formatId),gdg=/gdg51/.test(formatId),scale=Math.min(1.65/H,10.8/W);
 // Six equally sized verticals, separated into the photo's wide 2+1+3 groups.
 const photoCentres=[1.13,2.18,4.78,8.66,9.71,10.76];
 const photoLayout=pg&&segments.length===6&&segments.every(s=>s.wall.h>s.wall.w),bezelGap=photoLayout?0:Math.min(.05,Math.max(0,(STARBUCKS_ROOM.width-1-W*scale)/Math.max(1,segments.length-1)));
 const pieces=segments.map((s,n)=>{const r=s.wall;let width=r.w*scale,height=r.h*scale;
  if(photoLayout){height=1.65;width=height*r.w/r.h;}
  return {screen:s.n,wall:{...r},width,height,position:{x:photoLayout?photoCentres[n]:STARBUCKS_ROOM.width/2+(r.x+r.w/2-W/2)*scale+(n-(segments.length-1)/2)*bezelGap,y:2.65+(H/2-r.y-r.h/2)*scale,z:.105},rotation:0,flipU:false,group:photoLayout?(n<2?1:n===2?2:3):1};
 });
 const bounds={min:{x:Infinity,y:Infinity,z:.075},max:{x:-Infinity,y:-Infinity,z:.14}};
 for(const p of pieces){bounds.min.x=Math.min(bounds.min.x,p.position.x-p.width/2);bounds.max.x=Math.max(bounds.max.x,p.position.x+p.width/2);bounds.min.y=Math.min(bounds.min.y,p.position.y-p.height/2);bounds.max.y=Math.max(bounds.max.y,p.position.y+p.height/2);}
 return {referenceId:'starbucks-pg103-photo',trial:true,source:'photo-reference',photo:STARBUCKS_PHOTO,location:pg?'pg103':gdg?'gdg51':'individual',photoLayout,pattern:photoLayout?'2V–1V–3V':pieces.map(p=>p.width>p.height?'H':'V').join('–'),pieces,bounds,width:bounds.max.x-bounds.min.x,height:bounds.max.y-bounds.min.y,centre:{x:(bounds.min.x+bounds.max.x)/2,y:(bounds.min.y+bounds.max.y)/2,z:.105},faceCount:1,roomWidth:STARBUCKS_ROOM.width,roomDepth:STARBUCKS_ROOM.depth,roomHeight:STARBUCKS_ROOM.height,native:{width:W,height:H,screens:segments.length},exportGeometryUnchanged:true,measuredGeometry:false};
}
