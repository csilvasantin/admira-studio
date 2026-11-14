/* Project-owned formats only; MyBlu is a subset, never an extra count. */
(function(root){
  const idOK = id => typeof id === 'string' && /^[a-z0-9][a-z0-9:-]{0,79}$/.test(id);
  const label = value => typeof value === 'string' ? value : value?.es || value?.en || '';
  function options(ficha, lists) {
    const formats = new Map();
    for (const f of [...(lists.estandar || []), ...(lists.especiales || [])]) {
      if (!idOK(f.id)) continue;
      const size=f.custom || f.entrega;
      formats.set('project:'+f.id, {value:'project:'+f.id, id:f.id, kind:'format', name:label(f.nombre || f.name)||f.id,
        ...(Array.isArray(size)?{size}: {})});
    }
    for (const i of ficha.instalaciones || []) {
      if (!idOK(i.id) || !Array.isArray(i.screens) || !i.screens.length) continue;
      const pattern=i.screens.map(s=>s.w>s.h?'H':s.h>s.w?'V':'C').join('-');
      formats.set('layout:'+i.id,{value:'layout:'+i.id,id:i.id,kind:'layout',name:label(i.name || i.nombre)||i.id,pattern,
        screens:i.screens.map(s=>({id:s.id,w:s.w,h:s.h,x:s.x,y:s.y}))});
    }
    return [...formats.values()];
  }
  async function catalog(projects, origin, fetcher=fetch) {
    const read=async path=>{const u=new URL(path,origin);if(u.origin!==origin || !u.pathname.startsWith('/adaptaciones/'))throw Error('Referencia de formatos no válida');
      const r=await fetcher(u.href,{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(6000)});
      if(!r.ok)throw Error('No se pudieron cargar los formatos');return r.json();};
    const index=await read('/adaptaciones/proyectos/index.json');
    return Promise.all(projects.map(async p=>{
      const entry=index.proyectos?.find(e=>e.id===p.id || e.alias?.includes(p.id));
      if(!entry)return {...p,formats:[],formatsKnown:true};
      try {
        if(!/^[a-z0-9-]+\.json$/.test(entry.archivo))throw Error('Ficha no válida');
        const path='/adaptaciones/proyectos/'+entry.archivo, ficha=await read(path), lists={};
        for(const kind of ['estandar','especiales']){const ref=ficha.formatos?.[kind];
          lists[kind]=Array.isArray(ref)?ref:ref?.archivo?(await read(new URL(ref.archivo,new URL(path,origin)).href))[ref.clave]:[];}
        const formats=options(ficha,lists);
        const custom=formats.some(f=>f.kind==='layout' || !f.size || !((f.size[0]===1920&&f.size[1]===1080)||(f.size[0]===1080&&f.size[1]===1920))) || formats.length>2;
        return {...p,formatProject:entry.id,formats,hasCustom:custom,formatsKnown:true};
      }catch{return {...p,formats:[],formatsKnown:false};}
    }));
  }
  root.AdmiraProjectFormats={options,catalog,label:p=>p.hasCustom?`${p.name} (${p.formats.length}) formatos`:p.name};
})(globalThis);
