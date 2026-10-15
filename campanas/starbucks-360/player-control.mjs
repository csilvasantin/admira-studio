const program=await fetch('./programa-siete.json',{cache:'no-store'}).then(r=>r.json());
const status=document.querySelector('#physical-status'),button=document.querySelector('#start-native');
const names=['MacStudio V1','MacStudio H','MacStudio V3','MacMini V1','MacMini H','MacMini V3','MacBookPro16'];
let starting=false;
async function inspect(){
 const results=await Promise.all(program.screens.map(async (screen,index)=>{
  try{const d=await fetch('https://api.admira.store/signage/now?screen='+encodeURIComponent(screen.screen)+'&t='+Date.now(),{cache:'no-store'}).then(r=>r.json()),item=d.item,expected=screen.items.find(x=>x.id===item?.id&&x.url===item?.url);
   return {screen:names[index],on:!!expected&&item?.sinc?.on===1&&!d.standby&&Date.now()-item.ts<35000};
  }catch{return {screen:names[index],on:false};}
 }));
 const live=results.filter(r=>r.on).length;
 if(live===7&&!starting)button.textContent='Relanzar la demo en las siete pantallas';
 status.textContent=live+'/7 pantallas del laboratorio emitiendo esta campaña · '+(live===7?'sincronización confirmada':'pendientes: '+results.filter(r=>!r.on).map(r=>r.screen).join(', '));
}
async function start(){
 if(starting)return;starting=true;button.disabled=true;button.textContent='Activando las siete pantallas…';
 try{const r=await fetch('/starbucks-360',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start'})}),d=await r.json();
  if(!r.ok||!d.ok)throw Error(r.status===401?'Inicia sesión en Studio para activar los players.':r.status===403?'La activación requiere la cuenta propietaria.':'No se pudo confirmar el envío a todas las pantallas.');
  button.textContent='Conectando las siete pantallas…';await inspect();
 }catch(e){status.textContent=e.message;button.textContent='Reintentar activación';}
 finally{starting=false;button.disabled=false;}
}
button.addEventListener('click',start);inspect();setInterval(inspect,5000);
if(new URLSearchParams(location.search).get('start')==='1')start();
