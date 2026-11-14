// GDG51 laboratory reference recovered from the 2026-10-15 model.
// Room positions remain schematic; the two V-H-V configurations were specified 2026-11-14.
export const ADMIRANEXT_ROOM={width:7.2,depth:4.5,height:3};
export function admiraNextPlacement(g){
 const W=g?.pared?.ancho,H=g?.pared?.alto;
 if(!(W>0&&H>0)||!g.segments?.length)throw Error('invalid-office-geometry');
 const scale=Math.min(2.7/W,.85/H),pieces=[];
 for(let station=0;station<2;station++)for(const s of g.segments){const r=s.wall;
  if(![r.x,r.y,r.w,r.h].every(Number.isFinite)||r.w<=0||r.h<=0||r.x<0||r.y<0||r.x+r.w>W||r.y+r.h>H)throw Error('invalid-office-screen');
  pieces.push({screen:s.n,station:station?'MacMini':'MacStudio',wall:{...r},width:r.w*scale,height:r.h*scale,position:{x:1.85+station*3.5+(r.x+r.w/2-W/2)*scale,y:1.35+(H/2-r.y-r.h/2)*scale,z:.65}});
 }
 return {referenceId:'lab-gran-de-gracia-51',pieces,faceCount:1,width:6.3,height:.85,centre:{x:3.6,y:1.35,z:.65},bounds:{min:{x:.4,y:.9,z:.6},max:{x:6.8,y:1.8,z:.7}},pattern:'V-H-V + V-H-V',measuredGeometry:false};
}
