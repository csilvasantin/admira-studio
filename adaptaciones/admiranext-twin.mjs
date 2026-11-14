import * as T from '../assets/xpaces/engine/premium-three.mjs';
import {createLifeScene} from '../assets/xpaces/engine/life-scene.mjs?v=px-1';
import {createLifeRenderer} from '../assets/xpaces/engine/life-renderer.mjs?v=installation-20261009';
import {previewSize,screenCrop} from './gemelo-core.mjs?v=coffee-footer-1';
import {observerPoint} from './gemelo-reference.mjs?v=installation-20261009';
import {ADMIRANEXT_ROOM,admiraNextPlacement} from './admiranext-twin-core.mjs';
function release(root){const resources=new Set();root.traverse(n=>{if(n.geometry)resources.add(n.geometry);for(const m of [n.material].flat().filter(Boolean)){resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);}});resources.forEach(r=>r.dispose());root.clear();}
export async function createAdmiraNextTwin({canvas,geometry,formatId,quality='best',signal,onCameraChange}={}){
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const presentation=new T.Group(),room=new T.Group(),surface=new T.Group();presentation.name='admiranext:gdg51-first-floor';presentation.add(room,surface);
 const mat=color=>new T.MeshStandardMaterial({color,roughness:.65});
 const palette={black:mat('#151c22'),wall:mat('#d9ddd8'),oak:mat('#98704d'),steel:mat('#aab1b8'),floor:mat('#787f82')};
 function mesh(name,geo,material,x,y,z,parent=room){const m=new T.Mesh(geo,material);m.name=name;m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 const box=(name,x,y,z,w,h,d,m=palette.black,parent)=>mesh(name,new T.BoxGeometry(w,h,d),m,x,y,z,parent);
 const {width:W,depth:D,height:H}=ADMIRANEXT_ROOM;
 box('office-floor',W/2,-.05,D/2,W,.1,D,palette.floor);
 box('office-back',W/2,H/2,-.06,W,H,.12,palette.wall);
 box('office-side',-.06,H/2,D/2,.12,H,D,palette.wall);
 for(const [n,x] of [1.85,5.35].entries()){
  const name=n?'MacMini':'MacStudio';box(name+'-desk',x,.78,.95,3.15,.08,1.15,palette.oak);
  for(const dx of [-1.4,1.4])box(name+'-desk-leg',x+dx,.38,.95,.06,.76,.8,palette.steel);
  box(name+'-computer',x+1.25,.88,1.05,.22,n?.06:.18,.22,palette.steel);
  box(name+'-keyboard',x,.84,1.35,.5,.03,.18,palette.steel);
  box(name+'-chair',x,.48,2.1,.55,.1,.55);box(name+'-chair-back',x,.9,2.34,.55,.8,.07);
  const cv=document.createElement('canvas');cv.width=512;cv.height=80;const c=cv.getContext('2d');c.fillStyle='#142522';c.fillRect(0,0,512,80);c.fillStyle='#abffca';c.font='bold 40px sans-serif';c.textAlign='center';c.fillText(name+' · V-H-V',256,54);
  const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;mesh(name+'-label',new T.PlaneGeometry(1.5,.24),new T.MeshBasicMaterial({map}),x,2.1,.02);
 }
 let model,viewer,placement=admiraNextPlacement(geometry),panels=[],disposed=false,sz=previewSize(geometry);
 const snapshot={cols:W,rows:D,wallHeight:H,layout:[],actors:[],moving:false};
 viewer=createLifeRenderer({canvas,snapshot,stockCamera:true,assetQuality:quality,renderProfile:quality==='best'?'studio-best':'standard',onCameraChange,sceneFactory:(s,o)=>{model=createLifeScene(s,{...o,inventory:true});model.world.add(presentation);return model;}});
 const master=document.createElement('canvas');master.width=sz.ancho;master.height=sz.alto;
 function home(){viewer.preset('home');viewer.frameObject(presentation,{margin:1.08,angle:1.15,elevation:.48});}
 function front(){viewer.preset('front');viewer.frameObject(presentation,{margin:1.03,angle:Math.PI/2,elevation:.04});}
 function setLayout(){release(surface);panels=[];placement=admiraNextPlacement(geometry);
  for(const piece of placement.pieces){const crop=screenCrop(piece.wall,geometry.pared,sz),cv=document.createElement('canvas');cv.width=Math.max(1,crop.w);cv.height=Math.max(1,crop.h);const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.generateMipmaps=false;
   const frame=box('admiranext:screen-'+piece.screen,piece.position.x,piece.position.y,piece.position.z,piece.width+.026,piece.height+.026,.048,palette.black.clone(),surface);
   const screen=mesh('admiranext:content-'+piece.screen,new T.PlaneGeometry(piece.width,piece.height),new T.MeshBasicMaterial({map:texture,toneMapped:false}),0,0,.026,frame);screen.userData.crop={...piece.wall};panels.push({cv,crop,texture});
  }viewer.invalidateShadows();home();
 }
 setLayout();
 return {sceneKind:'admiranext',reference:{assetId:'lab-gran-de-gracia-51-vhv-v1'},quality,viewer,master,home,front,setLayout,
  setGeometry(next,options={}){geometry=next;formatId=options.formatId;sz=previewSize(geometry);master.width=sz.ancho;master.height=sz.alto;setLayout();},
  observe:settings=>viewer.setObservation(observerPoint(placement,settings)),get arrangements(){return [];},get surfaces(){return panels.length;},get placement(){return placement;},
  draw(draw){if(disposed)return;draw(master);for(const p of panels){const c=p.cv.getContext('2d');c.clearRect(0,0,p.cv.width,p.cv.height);c.drawImage(master,p.crop.x,p.crop.y,p.crop.w,p.crop.h,0,0,p.cv.width,p.cv.height);p.texture.needsUpdate=true;}viewer.render(performance.now());},
  dispose(){if(disposed)return;disposed=true;viewer.dispose();release(presentation);master.width=master.height=0;}
 };
}
