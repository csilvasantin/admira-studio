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

export function mountModel(root) {
  const stage = root.querySelector('#hawkins-stage');
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x100e19);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39,1,0.1,160);
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
    for(const [fx,fz,fw,fd,h] of furniture[id]||[]){
      box(fx,fz,fw,fd,h,wallColor);
      box(fx,fz,fw,fd,0.055,color,h);
    }
    if(id===1) for(let i=0;i<7;i++)box(244+i*12,477,10,27,0.10+i*0.085,wallColor);
    if(id===3) for(const x of [66,149])box(x,371,4,57,0.82,0xf72d48);
    for(const tag of room.querySelectorAll('text'))label(Number(tag.textContent),Number(tag.getAttribute('x')),Number(tag.getAttribute('y')));
  }
  box(519,286,27,4,1.28,colors[9]);
  for(const route of routes){
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
