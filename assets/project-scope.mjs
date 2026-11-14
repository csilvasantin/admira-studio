// Project filtering is UI state, never a change to account permissions or saved formats.
export const SCOPE_KEY='admira.studio.projectScope';
export const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function resolveScope(input,index){
  const q=normalize(input);
  if(['all','todos','todas','default','general'].includes(q))return 'all';
  const matches=index.filter(p=>[p.id,p.nombre,...(p.alias||[])].some(x=>normalize(x)===q));
  return matches.length===1?matches[0].id:null;
}
export function availableProjects(index,session){
  if(!session?.ok || !(session.clientes===null||Array.isArray(session.clientes)))return [];
  return session.clientes===null?index:index.filter(p=>[p.id,p.cliente,...(p.alias||[])].some(id=>session.clientes.includes(id)));
}
export function readScope(storage){try{return storage.getItem(SCOPE_KEY)||'all';}catch{return 'all';}}
export async function projectCatalog(fetcher=fetch){
  const responses=await Promise.all(['/adaptaciones/proyectos/index.json','/auth/session'].map(url=>fetcher(url,{credentials:'same-origin',cache:'no-store'})));
  if(responses.some(r=>!r.ok))throw Error('No se pudo comprobar el catálogo de proyectos y tu sesión.');
  const [index,session]=await Promise.all(responses.map(r=>r.json()));
  return availableProjects(index.proyectos||[],session);
}
export async function runProjectCommand(arg,win=window){
  const index=await projectCatalog(win.fetch.bind(win)),en=win.document.documentElement.lang.startsWith('en');
  if(!String(arg||'').trim())return (en?'Project: ':'Proyecto: ')+readScope(win.sessionStorage)+'\n'+index.map(p=>p.nombre).join(' · ')+'\n/proyecto AdmiraNeXT · /project all';
  const id=resolveScope(arg,index);
  if(!id)throw Error(en?'Unknown or unavailable project. Use /project to list projects.':'Proyecto desconocido o no disponible. Usa /proyecto para ver la lista.');
  if(win.AdmiraProjectView){await win.AdmiraProjectView.select(id);}
  else {
    win.sessionStorage.setItem(SCOPE_KEY,id);
    const url=new URL(en?'/en/adaptaciones/':'/adaptaciones/',win.location.origin);
    url.searchParams.set('expertProject',id);url.searchParams.set('proyecto',id==='all'?'general':id);
    win.location.assign(url.pathname+url.search);
  }
  return id==='all'?(en?'All available projects · filter removed.':'Todos los proyectos disponibles · filtro eliminado.'):(en?'Project selected: ':'Proyecto seleccionado: ')+index.find(p=>p.id===id).nombre;
}
export async function mountProjectView({host,onSelect,onLayout,fetcher=fetch,storage=sessionStorage,doc=document}){
  const index=await projectCatalog(fetcher),en=doc.documentElement.lang.startsWith('en');
  const panel=doc.createElement('section');panel.className='studio-project-view';panel.setAttribute('aria-label',en?'Project adaptation formats':'Formatos de adaptación por proyecto');
  const heading=doc.createElement('h2');heading.textContent=en?'Projects · adaptation formats':'Proyectos · formatos de adaptación';
  const picker=doc.createElement('select');picker.setAttribute('aria-label',en?'Project filter':'Filtro de proyecto');
  picker.append(new Option(en?'All projects':'Todos los proyectos','all'),...index.map(p=>new Option(p.nombre,p.id)));
  const status=doc.createElement('p');status.setAttribute('role','status');
  const cards=doc.createElement('div');cards.className='studio-project-cards';panel.append(heading,picker,status,cards);host.prepend(panel);
  let sequence=0;
  async function select(id){
    if(id!=='all'&&!index.some(p=>p.id===id))throw Error('Proyecto no disponible');
    const turn=++sequence;picker.value=id;status.textContent=en?'Loading formats…':'Cargando formatos…';cards.replaceChildren();
    await onSelect(id==='all'?'general':id);if(turn!==sequence)return;
    try{storage.setItem(SCOPE_KEY,id);}catch{}
    const chosen=id==='all'?index:index.filter(p=>p.id===id);
    for(const p of chosen){
      const card=doc.createElement('article'),title=doc.createElement('h3');card.className='studio-project-card';title.textContent=p.nombre;card.append(title);cards.append(card);
      try{
        if(!/^[a-z0-9-]+\.json$/.test(p.archivo))throw Error('Invalid project file');
        const r=await fetcher('/adaptaciones/proyectos/'+p.archivo,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error('Unavailable');const ficha=await r.json();if(turn!==sequence)return;
        const layouts=ficha.instalaciones||[];
        for(const layout of layouts){
          const line=doc.createElement('div'),label=doc.createElement('b'),map=doc.createElement('div');line.className='studio-project-layout';
          label.textContent=layout.name?.[en?'en':'es']||layout.nombre||layout.id;map.className='studio-screen-map';
          (layout.screens||[]).forEach((screen,n)=>{const cell=doc.createElement('span'),vertical=screen.h>screen.w;cell.className=vertical?'portrait':'landscape';cell.textContent=`${n+1} · ${vertical?'V':'H'}`;cell.title=`${screen.w} × ${screen.h}`;map.append(cell);});
          const open=doc.createElement('button');open.type='button';open.textContent=en?'Choose layout':'Elegir montaje';open.onclick=async()=>{await select(p.id);if(onLayout)await onLayout(layout.id);const target=doc.querySelector(`[data-installation="${layout.id}"]`);if(target){target.hidden=false;target.scrollIntoView({block:'center'});}};
          line.append(label,map,open);card.append(line);
        }
        if(!layouts.length){const info=doc.createElement('p');const count=(p.formatos?.estandar||0)+(p.formatos?.especiales||0);info.textContent=count?`${count} ${en?'formats':'formatos'}`:(en?'Portrait and landscape':'Vertical y horizontal');card.append(info);}
        if(id==='all'){const choose=doc.createElement('button');choose.type='button';choose.textContent=en?'Filter this project':'Filtrar este proyecto';choose.onclick=()=>select(p.id).catch(error=>status.textContent=error.message);card.append(choose);}
      }catch{const error=doc.createElement('p');error.textContent=en?'Formats unavailable. Try again.':'Formatos no disponibles. Vuelve a intentarlo.';card.append(error);}
    }
    if(turn===sequence)status.textContent=id==='all'?(en?'All available projects':'Todos los proyectos disponibles'):index.find(p=>p.id===id).nombre;
  }
  picker.onchange=()=>select(picker.value).catch(error=>status.textContent=error.message);
  const params=new URLSearchParams(location.search);
  const requested=params.get('expertProject')||params.get('proyecto')||readScope(storage);
  await select(requested==='all'||index.some(p=>p.id===requested)?requested:'all');
  return {select};
}
