import * as T from '../assets/xpaces/engine/premium-three.mjs';
import {createLifeScene} from '../assets/xpaces/engine/life-scene.mjs?v=px-1';
import {createLifeRenderer} from '../assets/xpaces/engine/life-renderer.mjs?v=installation-20261009';
import {previewSize,screenCrop} from './gemelo-core.mjs?v=stock-sync-1';
import {observerPoint} from './gemelo-reference.mjs?v=installation-20261009';
import {STARBUCKS_ROOM,STARBUCKS_PHOTO,starbucksPlacement} from './starbucks-twin-core.mjs?v=stock-sync-1';

function release(root){const resources=new Set();root.traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of [n.material].flat().filter(Boolean)){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}});resources.forEach(r=>r.dispose());root.clear();}
export async function createStarbucksTwin({canvas,geometry,formatId,quality='best',signal,onCameraChange}={}){
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const presentation=new T.Group(),room=new T.Group(),surface=new T.Group();presentation.name='starbucks:pg103-photo-model';room.name='starbucks:coffee-bar';surface.name='starbucks:adapted-screens';presentation.add(room,surface);
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.68,...extra});
 const palette={wall:mat('#8b8174'),stone:mat('#393a37'),white:mat('#e0ded4'),black:mat('#171b19',{roughness:.36}),steel:mat('#adb4af',{metalness:.85,roughness:.25}),oak:mat('#b48b59'),wood:mat('#755336'),green:mat('#006241'),glass:mat('#a3b4ae',{transparent:true,opacity:.23,roughness:.12,depthWrite:false}),paper:mat('#f6f1e2'),bread:mat('#c79145'),light:mat('#ffdfa2',{emissive:'#ffb853',emissiveIntensity:2})};
 function mesh(name,geo,material,x,y,z,parent=room){const m=new T.Mesh(geo,material);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 const box=(name,x,y,z,w,h,d,m=palette.black,parent)=>mesh(name,new T.BoxGeometry(w,h,d),m,x,y,z,parent);
 const cylinder=(name,x,y,z,r,h,m=palette.paper,parent)=>mesh(name,new T.CylinderGeometry(r,r*.95,h,20),m,x,y,z,parent);
 function canvasMap(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;return map;}
 const grain=canvasMap(512,256,(c,w,h)=>{c.fillStyle='#a47a4f';c.fillRect(0,0,w,h);for(let n=0;n<180;n++){c.strokeStyle=n%3?'#63472a35':'#e2ba7955';c.lineWidth=n%3+1;c.beginPath();let y=(n*37.71)%h;c.moveTo(0,y);c.bezierCurveTo(w*.25,y+4,w*.7,y-3,w,y);c.stroke();}});palette.oak.map=grain;
 const {width:W,depth:D,height:H}=STARBUCKS_ROOM;
 box('starbucks:stone-floor',W/2,-.055,D/2,W,.11,D,mat('#aaa293',{roughness:.9}));
 box('starbucks:taupe-display-wall',W/2,H/2,-.065,W,H,.13,palette.wall);
 box('starbucks:charcoal-backsplash',W/2,1.38,.018,W,.58,.04,palette.stone);
 // Photo: a long warm LED strip under the screen fascia, chrome equipment and pastry station.
 box('starbucks:fascia-led',W/2,1.71,.085,W-.16,.035,.06,palette.light);
 box('starbucks:service-counter',W/2,.51,1.03,W-.16,1.02,1.02,palette.oak);
 box('starbucks:stone-countertop',W/2,1.06,1.06,W,.085,1.1,palette.stone);
 for(let x=.12;x<W;x+=.24)box('starbucks:counter-panel-joint',x,.51,1.545,.012,.98,.008,palette.wood);
 box('starbucks:counter-plinth',W/2,.07,1.59,W,.14,.08,palette.black);
 // Small ceiling cutaway and exposed tracks stay behind the camera sight lines.
 box('starbucks:ceiling-soffit',W/2,3.72,.24,W,.11,.65,palette.white);
 for(const z of [.2,.7])box('starbucks:ceiling-track',W/2,3.55,z,W,.035,.035,palette.steel);
 for(const x of [1,3.1,5.2,7.3,9.4,11.5]){cylinder('starbucks:ceiling-spot-body',x,3.45,.7,.09,.18,palette.white);cylinder('starbucks:ceiling-spot-lens',x,3.35,.7,.073,.012,palette.light);}
 for(const x of [1.5,5.2,9.2]){const lamp=new T.PointLight('#ffc376',1.3,3.6,2);lamp.position.set(x,1.68,.25);room.add(lamp);}
 function cup(x,y,z,r=.075,h=.16){cylinder('starbucks:white-cup',x,y+h/2,z,r,h);cylinder('starbucks:cup-lid',x,y+h,z,r*1.08,.018,palette.white);const badge=mesh('starbucks:green-cup-mark',new T.CircleGeometry(r*.45,20),palette.green,x,y+h*.55,z+r+.001);return badge;}
 // Left coffee/preparation station visible in the supplied photograph.
 for(const x of [1.55,2.15]){box('starbucks:coffee-brewer',x,1.36,.63,.43,.55,.45,palette.black);box('starbucks:brewer-trim',x,1.50,.87,.32,.18,.015,palette.steel);box('starbucks:brewer-driptray',x,1.13,.93,.42,.045,.32,palette.steel);cylinder('starbucks:brew-urn',x,1.38,.9,.13,.28,palette.steel);}
 // Pastry display in the centre, with stacked cups beside it.
 box('starbucks:pastry-display-base',5.75,1.14,.79,1.44,.12,.58,palette.wood);
 for(const y of [1.28,1.48]){box('starbucks:pastry-shelf',5.75,y,.75,1.4,.025,.5,palette.steel);for(let k=0;k<7;k++){const p=mesh('starbucks:pastry',new T.SphereGeometry(.09,16,8),palette.bread,5.19+k*.17,y+.04,.8);p.scale.set(1,.55,.75);}}
 box('starbucks:pastry-glass',5.75,1.43,1.03,1.48,.5,.012,palette.glass);
 for(const x of [6.65,6.88])for(let n=0;n<6;n++)cup(x,1.10+n*.045,.7,.065,.1);
 // Right-hand espresso machine: three brew groups, dark chassis, steel fascia and steam wands.
 box('starbucks:espresso-chassis',10.1,1.37,.63,1.66,.56,.6,palette.black);
 box('starbucks:espresso-fascia',10.1,1.43,.946,1.57,.30,.035,palette.steel);
 box('starbucks:espresso-driptray',10.1,1.14,1.05,1.7,.05,.46,palette.steel);
 for(const x of [9.57,10.1,10.63]){cylinder('starbucks:grouphead',x,1.29,1.0,.095,.12,palette.steel);box('starbucks:portafilter',x,1.25,1.14,.04,.04,.24);cup(x,1.17,1.10,.06,.1);cylinder('starbucks:pressure-dial',x,1.5,.98,.055,.024,palette.paper).rotation.x=Math.PI/2;}
 for(const x of [9.25,10.93]){const wand=cylinder('starbucks:steam-wand',x,1.28,.99,.012,.28,palette.steel);wand.rotation.z=.25;}
 for(let n=0;n<10;n++)cup(9.4+n*.15,1.66,.63,.045,.09);
 // POS on the near edge of the counter, as in the reference photo.
 box('starbucks:pos-base',6.7,1.13,1.36,.32,.08,.29);
 box('starbucks:pos-stand',6.7,1.26,1.30,.06,.25,.06,palette.steel);
 const pos=box('starbucks:pos-terminal',6.7,1.43,1.25,.62,.39,.055);pos.rotation.x=-.2;
 box('starbucks:pos-glass',6.7,1.43,1.29,.55,.32,.012,palette.green).rotation.x=-.2;
 const nameMap=canvasMap(1024,128,(c,w,h)=>{c.fillStyle='#006241';c.fillRect(0,0,w,h);c.fillStyle='#f4efdf';c.textAlign='center';c.textBaseline='middle';c.font='700 54px Arial';c.fillText('STARBUCKS  COFFEE',w/2,h/2);});
 mesh('starbucks:counter-wordmark',new T.PlaneGeometry(2.45,.31),new T.MeshBasicMaterial({map:nameMap,toneMapped:false}),3.55,.65,1.557);
 let model,viewer,placement=starbucksPlacement(geometry,{formatId}),panels=[],disposed=false,sz=previewSize(geometry);
 const snapshot={cols:W,rows:D,wallHeight:H,layout:[],actors:[],moving:false};
 viewer=createLifeRenderer({canvas,snapshot,stockCamera:true,assetQuality:quality,renderProfile:quality==='best'?'studio-best':'standard',onCameraChange,sceneFactory:(s,o)=>{model=createLifeScene(s,{...o,inventory:true});model.world.add(presentation);return model;}});
 const master=document.createElement('canvas');master.width=sz.ancho;master.height=sz.alto;
 function home(){viewer.preset('home');viewer.frameObject(presentation,{margin:1.08,angle:1.36,elevation:.22});}
 function front(){viewer.preset('front');viewer.frameObject(presentation,{margin:1.03,angle:Math.PI/2,elevation:.04});}
 function setLayout(){release(surface);panels=[];placement=starbucksPlacement(geometry,{formatId});
  for(const piece of placement.pieces){const crop=screenCrop(piece.wall,geometry.pared,sz),cv=document.createElement('canvas');cv.width=Math.max(1,crop.w);cv.height=Math.max(1,crop.h);const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;
   const frame=box('starbucks:screen-'+piece.screen,piece.position.x,piece.position.y,piece.position.z,piece.width+.026,piece.height+.026,.048,palette.black.clone(),surface);
   const screen=mesh('starbucks:content-'+piece.screen,new T.PlaneGeometry(piece.width,piece.height),new T.MeshBasicMaterial({map:texture,toneMapped:false}),0,0,.026,frame);screen.userData.crop={...piece.wall};panels.push({cv,crop,texture});
  }viewer.invalidateShadows();home();
 }
 setLayout();
 return {sceneKind:'starbucks',reference:{assetId:'starbucks-pg103-photo-model-v1',url:STARBUCKS_PHOTO},quality,viewer,master,home,front,setLayout,
  setGeometry(next,options={}){geometry=next;formatId=options.formatId;sz=previewSize(geometry);master.width=sz.ancho;master.height=sz.alto;setLayout();},
  observe:settings=>viewer.setObservation(observerPoint(placement,settings)),get arrangements(){return [];},get surfaces(){return panels.length;},get placement(){return placement;},
  draw(draw){if(disposed)return;draw(master);for(const p of panels){const c=p.cv.getContext('2d');c.clearRect(0,0,p.cv.width,p.cv.height);c.drawImage(master,p.crop.x,p.crop.y,p.crop.w,p.crop.h,0,0,p.cv.width,p.cv.height);p.texture.needsUpdate=true;}viewer.render(performance.now());},
  dispose(){if(disposed)return;disposed=true;viewer.dispose();release(presentation);master.width=master.height=0;}
 };
}
