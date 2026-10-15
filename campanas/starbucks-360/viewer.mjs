import * as T from './three.mjs';
import {SurfacePlayer} from './media-player.mjs?v=starbucks360-1';
import {installFloatingPanels} from './floating-panels.mjs';
const program=await fetch('./programa-siete.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Programa no disponible');return r.json()});
const scene=new T.Scene();scene.background=new T.Color('#14261e');
const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.1,100);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;document.body.append(renderer.domElement);
scene.add(new T.HemisphereLight(0xfff2d2,0x416b51,2.4));const light=new T.DirectionalLight(0xfff4d9,2.5);light.position.set(2,8,5);scene.add(light);
const solids=[],players=[],labels=[];let matrix=false,running=true,held=0,offset=0,clockVerified=false;
function box(x,y,z,w,h,d,color){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.7}));m.position.set(x,y,z);m.userData.color=color;scene.add(m);solids.push(m);return m;}
box(0,-.1,0,15,.2,8,'#777c71');box(0,1.9,-2.6,15,3.8,.15,'#3a5143');box(0,.75,-1.85,13,.12,.8,'#a58b5e');for(const x of [-5,0,5])box(x,.36,-1.85,.08,.7,.6,'#394539');
const grid=new T.GridHelper(22,44,0x00e293,0x174e3c);grid.position.y=.01;grid.visible=false;scene.add(grid);
const widths=program.screens.map(s=>s.format.width*.001),gap=.15,total=widths.reduce((a,b)=>a+b,0)+gap*6;let left=-total/2;
for(const [n,s]of program.screens.entries()){
 const w=widths[n],h=s.format.height*.001,x=left+w/2;left+=w+gap;
 const y=2,z=-2.4;
 box(x,y,z,w+.06,h+.06,.08,'#111d17');
 const face=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide,toneMapped:false}));face.position.set(x,y,z+.046);scene.add(face);
 if(n===6){box(x,y-h/2-.04,z+.12,w+.12,.04,.35,'#727d76');box(x,y-h/2-.07,z+.12,.08,.12,.08,'#727d76');}
 const c=document.createElement('canvas');c.width=640;c.height=90;const ctx=c.getContext('2d');ctx.fillStyle='#08251d';ctx.fillRect(0,0,640,90);ctx.fillStyle='#fffaf0';ctx.textAlign='center';ctx.font='bold 38px system-ui';const name=n<3?'MacStudio '+(n+1):n<6?'MacMini '+(n-2):'MacBookPro16';ctx.fillText(name+' · '+(s.format.height>s.format.width?'V':'H'),320,58);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const label=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false,toneMapped:false}));label.position.set(x,y+h/2+.15,z+.1);label.scale.set(1.2,.17,1);scene.add(label);labels.push(label);
 const tracks=s.items.map(item=>({id:item.id,title:item.title||'Tu café sigue contigo.',file:item.url,cacheFile:item.localFile?'./'+item.localFile:undefined,seconds:item.seconds,stockId:item.stockId}));
 const p=new SurfacePlayer({id:s.screen},tracks,n,texture=>{face.material.map=texture;face.material.needsUpdate=true},()=>{});players.push(p);
 const row=document.createElement('div');row.className='screen';row.dataset.screen=s.screen;row.innerHTML='<b></b><small></small>';row.querySelector('b').textContent=(n+1)+'. '+name+' · '+(s.format.height>s.format.width?'Vertical':'Horizontal');document.querySelector('#screens').append(row);p.row=row;
}
let yaw=0,pitch=.06,distance=13,target=new T.Vector3(0,1.65,-2),drag=null,lastUI=0;
function mode(value){matrix=value;scene.background.set(matrix?'#010c07':'#14261e');grid.visible=matrix;for(const m of solids){m.material.wireframe=matrix;m.material.color.set(matrix?'#00e293':m.userData.color)}document.querySelector('#mode3d').setAttribute('aria-pressed',String(!matrix));document.querySelector('#modeMatrix').setAttribute('aria-pressed',String(matrix));const u=new URL(location.href);u.searchParams.set('mode',matrix?'matrix':'3d');history.replaceState(null,'',u)}
document.querySelector('#mode3d').onclick=()=>mode(false);document.querySelector('#modeMatrix').onclick=()=>mode(true);
function phaseAt(seconds){let edge=0;for(const item of program.screens[0].items){edge+=item.seconds;if(seconds<edge)return (item.contentLanguage==='en'?'EN · ':item.contentLanguage==='es'?'ES · ':'')+(item.kind==='mural'?'recorrido con vapor':'cierre individual')}return 'recorrido'}
const time=()=>running?(Date.now()+offset)/1000:held;
document.querySelector('#pause').onclick=()=>{held=time();running=false;players.forEach(p=>p.pause())};document.querySelector('#play').onclick=()=>{running=true;players.forEach(p=>p.resume())};
renderer.domElement.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId)};renderer.domElement.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag.x)*.004;pitch=Math.max(-.2,Math.min(.9,pitch+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY}};renderer.domElement.onpointerup=()=>drag=null;renderer.domElement.onwheel=e=>{e.preventDefault();distance=Math.max(3,Math.min(30,distance+e.deltaY*.01))};
window.onresize=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)};
installFloatingPanels(document.querySelector('#clean'));mode(new URLSearchParams(location.search).get('mode')==='matrix');if(new URLSearchParams(location.search).get('clean')==='1')document.querySelector('#clean').click();
async function syncClock(){try{const before=Date.now(),d=await fetch(program.clock+'?t='+before,{cache:'no-store'}).then(r=>r.json()),after=Date.now();if(Number.isFinite(d.serverNow)){offset=d.serverNow-after;clockVerified=true}}catch{clockVerified=false}}
syncClock();setInterval(syncClock,15000);

function draw(now){requestAnimationFrame(draw);const t=time();for(const p of players)p.tick(t,now,running);if(now-lastUI>250){lastUI=now;const seconds=((t%program.totalSeconds)+program.totalSeconds)%program.totalSeconds;document.querySelector('#clock').textContent=seconds.toFixed(1)+' / '+program.totalSeconds+' s · '+phaseAt(seconds)+' · '+(clockVerified?'reloj común':'reloj local provisional');document.querySelector('#status').textContent=players.filter(p=>p.state==='Reproduciendo').length+'/7 reproduciendo';players.forEach(p=>p.row.querySelector('small').textContent=p.state+' · '+p.seconds.toFixed(1)+' s'+(p.error?' · '+p.error:''))}camera.position.set(target.x+distance*Math.sin(yaw)*Math.cos(pitch),target.y+distance*Math.sin(pitch),target.z+distance*Math.cos(yaw)*Math.cos(pitch));camera.lookAt(target);renderer.render(scene,camera)}requestAnimationFrame(draw);
