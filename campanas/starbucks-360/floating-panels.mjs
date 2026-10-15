export function installFloatingPanels(cleanButton){
  const panels=[...document.querySelectorAll('header,aside,[data-stage-panel]')];
  let z=5;
  panels.forEach((panel,index)=>{
    const title=panel.getAttribute('aria-label')||(index===0?'Centro y reproducción':'Superficies y dispositivos');
    const rect=panel.getBoundingClientRect();
    panel.dataset.stagePanel='';panel.setAttribute('role','dialog');panel.setAttribute('aria-label',title);
    Object.assign(panel.style,{left:rect.left+'px',top:rect.top+'px',right:'auto',bottom:'auto',width:rect.width+'px',height:Math.min(innerHeight-32,rect.height+48)+'px',maxWidth:'calc(100vw - 16px)',maxHeight:'calc(100vh - 16px)'});
    const bar=document.createElement('div');bar.className='panel-bar';bar.setAttribute('aria-label','Mover '+title);bar.title='Arrastra para mover · H oculta o restaura los paneles';bar.tabIndex=0;
    const label=document.createElement('span');label.textContent=title;
    const close=document.createElement('button');close.className='panel-close';close.textContent='×';close.setAttribute('aria-label','Cerrar '+title);
    close.onclick=()=>{panel.hidden=true;cleanButton.textContent='Mostrar paneles';cleanButton.setAttribute('aria-label','Mostrar paneles')};bar.append(label,close);panel.prepend(bar);
    const grip=document.createElement('span');grip.className='resize-grip';grip.setAttribute('aria-label','Redimensionar '+title);grip.setAttribute('role','button');grip.title='Arrastra para cambiar el tamaño';grip.tabIndex=0;panel.append(grip);
    const place=(left,top)=>{const r=panel.getBoundingClientRect();panel.style.left=Math.max(0,Math.min(innerWidth-r.width,left))+'px';panel.style.top=Math.max(0,Math.min(innerHeight-r.height,top))+'px'};
    const size=(width,height)=>{const r=panel.getBoundingClientRect();panel.style.width=Math.max(Math.min(270,innerWidth-16),Math.min(innerWidth-r.left-8,width))+'px';panel.style.height=Math.max(Math.min(150,innerHeight-16),Math.min(innerHeight-r.top-8,height))+'px'};
    window.addEventListener('resize',()=>{const r=panel.getBoundingClientRect();place(r.left,r.top)});
    let move=null;
    bar.onpointerdown=e=>{if(e.target.closest('button'))return;e.preventDefault();const r=panel.getBoundingClientRect();move={x:e.clientX,y:e.clientY,left:r.left,top:r.top};bar.setPointerCapture(e.pointerId);panel.style.zIndex=String(++z)};
    bar.onpointermove=e=>{if(!move)return;place(move.left+e.clientX-move.x,move.top+e.clientY-move.y)};
    bar.onpointerup=()=>move=null;bar.onpointercancel=()=>move=null;
    let resize=null;
    grip.onpointerdown=e=>{e.preventDefault();e.stopPropagation();const r=panel.getBoundingClientRect();resize={x:e.clientX,y:e.clientY,width:r.width,height:r.height,left:r.left,top:r.top};grip.setPointerCapture(e.pointerId)};
    grip.onpointermove=e=>{if(!resize)return;size(resize.width+e.clientX-resize.x,resize.height+e.clientY-resize.y)};
    grip.onpointerup=()=>resize=null;grip.onpointercancel=()=>resize=null;
    bar.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const r=panel.getBoundingClientRect(),step=e.shiftKey?40:10;place(r.left+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),r.top+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0))};
    grip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const r=panel.getBoundingClientRect();size(r.width+(e.key==='ArrowRight'?20:e.key==='ArrowLeft'?-20:0),r.height+(e.key==='ArrowDown'?20:e.key==='ArrowUp'?-20:0))};
  });
  cleanButton.title='H oculta o restaura todos los controles';
  cleanButton.onclick=()=>{const hidden=document.body.classList.contains('clean')||panels.some(p=>p.hidden&&!p.hasAttribute('data-auxiliary'));if(hidden){document.body.classList.remove('clean');panels.filter(p=>!p.hasAttribute('data-auxiliary')||!p.hidden).forEach(p=>p.hidden=false)}else document.body.classList.add('clean');cleanButton.textContent=hidden?'Ocultar paneles':'Mostrar paneles';cleanButton.setAttribute('aria-label',cleanButton.textContent)};
  window.addEventListener('keydown',e=>{if(e.key.toLowerCase()!=='h'||e.metaKey||e.ctrlKey||e.altKey||/^(INPUT|TEXTAREA)$/.test(e.target.tagName)||e.target.isContentEditable)return;e.preventDefault();document.body.classList.toggle('stage-hidden')});
}
