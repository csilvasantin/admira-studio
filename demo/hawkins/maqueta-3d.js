import * as THREE from './three.module.min.js';

const scale = 0.04;
const point = (x, z) => [(x - 315) * scale, (z - 250) * scale];
const colors = {
  1: 0x9ea8b7, 2: 0x4399ba, 3: 0xf04560, 4: 0xd5955d, 5: 0xae639c,
  6: 0x647dfc, 7: 0x65b589, 8: 0x8767c7, 9: 0xfe556f, 10: 0xd64c58
};
const furniture = {
  2: [[356,388,22,38,0.8]],
  4: [[90,185,86,18,1.05],[63,224,34,21,0.45],[168,219,21,80,1.5]],
  5: [[315,178,118,14,1.3],[272,272,30,26,0.75],[363,272,30,26,0.75]],
  6: [[270,34,18,20,1.3],[302,34,18,20,1.3],[334,34,18,20,1.3],[366,34,18,20,1.3]],
  7: [[520,35,135,16,1.1],[584,83,17,30,0.8]],
  8: [[523,181,125,15,1.35]]
};
const routes = [
  [[292,453],[292,429]], [[192,373],[154,373]], [[108,339],[108,303]],
  [[236,229],[198,229]], [[316,156],[316,113]], [[395,201],[414,201],[414,64],[434,64]],
  [[395,235],[434,235]]
];

export function mountModel(root, tour = false) {
  const stage = root.querySelector('#hawkins-stage');
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x100e19);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(tour?64:39,1,0.055,160);
  let tourPose;
  const target = new THREE.Vector3(0,0,0);
  let yaw = 0.37;
  let pitch = 0.99;
  let radius = 44;
  let drag;
  let selected = 1;
  const floors = new Map();
  scene.add(new THREE.HemisphereLight(0xf1e6ff,0x5b6386,2.1));
  const key = new THREE.DirectionalLight(0xffe5c5,2.4);
  key.position.set(-12,19,11);
  scene.add(key);

  function box(x,z,w,d,h,color,y=h/2) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w*scale,h,d*scale),
      new THREE.MeshStandardMaterial({color,roughness:0.76}));
    const [worldX,worldZ] = point(x,z);
    mesh.position.set(worldX,y,worldZ);
    scene.add(mesh);
    return mesh;
  }
  function label(id,x,z) {
    const canvas = document.createElement('canvas');
    canvas.width=canvas.height=96;
    const g=canvas.getContext('2d');
    g.fillStyle='#181525';
    g.beginPath();
    g.roundRect(8,12,80,72,18);
    g.fill();
    g.strokeStyle='#f9efe9';
    g.lineWidth=2;
    g.stroke();
    g.fillStyle='#fff7eb';
    g.font='600 45px system-ui';
    g.textAlign='center';
    g.textBaseline='middle';
    g.fillText(String(id).padStart(2,'0'),48,49);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));
    const [worldX,worldZ]=point(x,z);
    sprite.position.set(worldX,1.56,worldZ);
    sprite.scale.set(1.22,1.22,1);
    sprite.renderOrder=2;
    scene.add(sprite);
  }
  box(315,250,625,495,0.15,0x211d31,-0.36);
  for(const room of root.querySelectorAll('[data-room]')){
    const id=Number(room.dataset.room);
    const rect=room.querySelector('.room');
    const [x,z,w,d]=['x','y','width','height'].map(key=>Number(rect.getAttribute(key)));
    const color=colors[id];
    const floor=box(x+w/2,z+d/2,w,d,0.22,color,-0.12);
    floors.set(id,floor);
    // Low sections on the rear edges leave the observed thresholds visible.
    const wallColor=new THREE.Color(color).multiplyScalar(0.43);
    box(x+w*0.22,z+2,w*0.44,4,0.74,wallColor);
    box(x+w*0.78,z+2,w*0.44,4,0.74,wallColor);
    for(const [fx,fz,fw,fd,h] of (tour&&id===4?[]:furniture[id]||[])){
      box(fx,fz,fw,fd,h,wallColor);
      box(fx,fz,fw,fd,0.055,color,h);
    }
    if(id===1){
      for(let i=0;i<7;i++){
        if(tour)box(292,454+i*6,43,6,0.08+i*0.095,wallColor);
        else box(244+i*12,477,10,27,0.10+i*0.085,wallColor);
      }
    }
    if(id===3) for(const x of [66,149])box(x,371,4,57,0.82,0xf72d48);
    if(!tour)for(const tag of room.querySelectorAll('text'))label(Number(tag.textContent),Number(tag.getAttribute('x')),Number(tag.getAttribute('y')));
  }
  box(519,286,27,4,1.28,colors[9]);
  if(!tour)for(const route of routes){
    const points=route.map(([x,z])=>{const [a,b]=point(x,z);return new THREE.Vector3(a,0.095,b)});
    for(let i=1;i<points.length;i++){
      const curve=new THREE.LineCurve3(points[i-1],points[i]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve,1,0.035,6,false),new THREE.MeshBasicMaterial({color:0xf9ecd7})));
    }
    const end=points.at(-1);
    const direction=end.clone().sub(points.at(-2)).normalize();
    scene.add(new THREE.ArrowHelper(direction,end.clone().addScaledVector(direction,-0.33),0.37,0xf9ecd7,0.25,0.22));
  }
  for(let z=311;z<353;z+=9)box(519,z,2,4,0.035,0xff8e9d,0.035);

  function render() {
    const {clientWidth:w,clientHeight:h}=stage;
    if(!w||!h)return;
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
    if(tour&&tourPose){
      camera.position.copy(tourPose.eye);
      camera.lookAt(tourPose.look);
      renderer.render(scene,camera);
      return;
    }
    const distance=radius/Math.min(1,camera.aspect);
    camera.position.set(
      target.x+distance*Math.cos(pitch)*Math.sin(yaw),
      target.y+distance*Math.sin(pitch),
      target.z+distance*Math.cos(pitch)*Math.cos(yaw)
    );
    camera.lookAt(target);
    renderer.render(scene,camera);
  }
  function highlight(id) {
    const old=floors.get(selected===9?8:selected);
    old?.material.emissive.setHex(0);
    const floor=floors.get(id===9?8:id);
    if(!floor)return;
    selected=id;
    floor.material.emissive.setHex(colors[id]).multiplyScalar(0.28);
  }
  function setupTour(){
    const panel=root.querySelector('#hawkins-tour');
    panel.hidden=false;
    root.querySelector('.legend').hidden=true;
    for(const button of root.querySelectorAll('[data-zone]'))button.hidden=Number(button.dataset.zone)>4;
    root.querySelector('#hawkins-controls').hidden=true;
    root.querySelector('#hawkins-orbit-note').hidden=true;
    const play=panel.querySelector('[data-tour=play]');
    const slider=panel.querySelector('[data-tour=time]');
    const status=panel.querySelector('[data-tour=status]');
    const chapters=[
      {time:0,id:1,name:'Escalera · 0:54'},
      {time:5,id:2,name:'Vestíbulo · 1:03'},
      {time:10,id:3,name:'Pasillo rojo · 1:35'},
      {time:15,id:4,name:'Salón Byers · 1:41'}
    ];
    // Each pose contains time, eye X/Z/height, and a point ahead on the filmed route.
    const poses=[
      [0,292,489,2.15,292,432],[3,292,455,1.65,292,399],
      [5,292,412,1.48,278,374],[7,286,375,1.48,191,373],
      [9,165,373,1.48,108,368],[10,112,373,1.48,108,332],
      [13,108,327,1.48,108,284],[15,108,288,1.48,101,187],[18,104,254,1.48,97,177]
    ];
    const end=poses.at(-1)[0];
    let time=0, frame=0, last=0, chapter=-1, syncing=false;
    function setTime(value){
      time=THREE.MathUtils.clamp(value,0,end);
      slider.value=time;
      const next=chapters.findLastIndex(stop=>stop.time<=time);
      if(next!==chapter){
        chapter=next;
        status.textContent=(next+1)+' / '+chapters.length+' · '+chapters[next].name;
        syncing=true;
        root.querySelector('[data-zone="'+chapters[next].id+'"]').click();
        syncing=false;
      }
      const index=Math.max(0,Math.min(poses.length-2,poses.findLastIndex(pose=>pose[0]<=time)));
      const a=poses[index],b=poses[index+1];
      const f=(time-a[0])/(b[0]-a[0]);
      const position=(i)=>THREE.MathUtils.lerp(a[i],b[i],f);
      const [x,z]=point(position(1),position(2));
      const [lookX,lookZ]=point(position(4),position(5));
      tourPose={eye:new THREE.Vector3(x,position(3),z),look:new THREE.Vector3(lookX,1.25,lookZ)};
      render();
    }
    function pause(){
      cancelAnimationFrame(frame);
      frame=0;
      play.textContent='Reproducir';
    }
    function tick(now){
      setTime(time+Math.min((now-last)/1000,0.1));
      last=now;
      if(time>=end)pause();
      else frame=requestAnimationFrame(tick);
    }
    play.onclick=()=>{
      if(frame){pause();return;}
      if(time>=end)setTime(0);
      last=performance.now();
      play.textContent='Pausar';
      frame=requestAnimationFrame(tick);
    };
    slider.oninput=()=>{pause();setTime(Number(slider.value));};
    panel.querySelector('[data-tour=prev]').onclick=()=>{pause();setTime(chapters[Math.max(0,chapter-1)].time);};
    panel.querySelector('[data-tour=next]').onclick=()=>{pause();setTime(chapters[Math.min(chapters.length-1,chapter+1)].time);};
    root.addEventListener('hawkins-zone',({detail:id})=>{
      if(syncing)return;
      const stop=chapters.find(item=>item.id===id);
      if(stop){pause();setTime(stop.time);}
    });
    setTime(0);
  }
  if(tour){
    // Dressing for the eye-level reconstruction, using the plan's coordinate grid.
    const wall=0x3c2535, wood=0x754934, red=0xfa193c;
    box(267,475,4,44,2.8,wall);
    box(317,475,4,44,2.8,wall);
    box(292,440,54,26,0.16,0x48768b,-0.08);
    box(172,373,39,31,0.16,0x493346,-0.08);
    box(108,321,43,36,0.16,0x663343,-0.08);
    for(const [x,z,length] of [[83,348,98],[133,332,66],[133,393,9]]){
      box(x,z,4,length,2.8,wall);
      for(const y of [0.65,1.25,1.85,2.45]){
        const neon=box(x,z,4.5,length-1,0.037,red,y);
        neon.material.emissive.setHex(red).multiplyScalar(1.5);
      }
    }
    box(109,157,178,4,3.05,0x957055);
    for(const x of [22,197])box(x,227,4,140,2.7,wood);
    box(91,190,87,22,0.52,0xaa6647);
    box(91,182,87,8,0.95,0xb57950);
    box(67,224,35,21,0.43,wood);
    for(let i=0;i<26;i++){
      const bulb=box(39+(i%13)*10.6,160,1.4,1.4,0.075,i%2?0xf5bc42:0x53b7ff,2.5-Math.floor(i/13)*0.36);
      bulb.material.emissive.copy(bulb.material.color);
    }
    const sign=document.createElement('canvas');
    sign.width=512;sign.height=128;
    const g=sign.getContext('2d');
    g.font='bold 34px Georgia';g.textAlign='center';g.fillStyle='#271a26';
    g.fillText('A B C D E F G H I J K L M',256,53);
    g.fillText('N O P Q R S T U V W X Y Z',256,105);
    const texture=new THREE.CanvasTexture(sign);
    texture.colorSpace=THREE.SRGBColorSpace;
    const letters=new THREE.Mesh(new THREE.PlaneGeometry(5.3,1.32),new THREE.MeshBasicMaterial({map:texture,transparent:true}));
    const [x,z]=point(104,160);
    letters.position.set(x,1.99,z);
    scene.add(letters);
    const light=new THREE.PointLight(0xff965a,22,9);
    const [lx,lz]=point(110,195);
    light.position.set(lx,2.4,lz);scene.add(light);
    setupTour();
    new ResizeObserver(render).observe(stage);
    return;
  }
  highlight(1);
  root.addEventListener('hawkins-zone',({detail:id})=>{
    highlight(id);
    const floor=floors.get(id===9?8:id);
    if(!floor)return;
    target.set(floor.position.x,0,floor.position.z);
    radius=15;
    render();
  });
  root.querySelector('#hawkins-controls').addEventListener('click',({target:button})=>{
    const action=button.dataset.camera;
    if(action==='left')yaw-=0.27;
    if(action==='right')yaw+=0.27;
    if(action==='in')radius=Math.max(7,radius-4);
    if(action==='out')radius=Math.min(65,radius+4);
    if(action==='reset'){yaw=0.37;pitch=0.99;radius=44;target.set(0,0,0);}
    render();
  });
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{
    canvas.setPointerCapture(event.pointerId);
    drag=[event.clientX,event.clientY];
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag)return;
    yaw-=(event.clientX-drag[0])*0.007;
    pitch=THREE.MathUtils.clamp(pitch+(event.clientY-drag[1])*0.007,0.29,1.45);
    drag=[event.clientX,event.clientY];
    render();
  });
  canvas.addEventListener('lostpointercapture',()=>{drag=null});
  new ResizeObserver(render).observe(stage);
  render();
}
