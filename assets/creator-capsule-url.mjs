// «Crear cápsula desde URL» (Creador · 22-oct-2026). Se monta dentro del panel 📚 Nueva cápsula.
// URL → extraer + redactar (gancho · giro · remate) → Carlos edita → encargar render v5 → Stock (#capsula).
export const CAMPOS=[['objeto','Título de la ficha','Card title',90],['subtitulo','Subtítulo de la cartela','Title card subtitle',60],['gancho','Gancho (línea 1)','Hook (line 1)',70],['giro','Giro (línea 2)','Twist (line 2)',80],['remate','Remate (línea 3)','Payoff (line 3)',90],['fuente','Fuente en pantalla','On-screen source',80],['idea','Idea clave','Key idea',280]];
export function readGuion(get){const g={};for(const [k] of CAMPOS)g[k]=get('capurl-'+k).trim();const h=get('capurl-cifra').trim();g.cifra={hasta:h===''?null:Number(h.replace(/\./g,'').replace(',','.')),unidad:get('capurl-unidad').trim()};g.tema=get('capurl-tema')||'tecnología';return g;}
export function statusText(d,t){const e=d.existing||{},n=x=>x?('#'+(x.num??x.id)):'';if(d.status==='publicada')return t('✅ Cápsula en Stock: vertical '+n(e.vertical)+' · horizontal '+n(e.horizontal),'✅ Capsule in Stock: vertical '+n(e.vertical)+' · horizontal '+n(e.horizontal));if(d.status==='parcial')return t('⏳ Publicando: ya hay '+(e.vertical?'vertical':'horizontal'),'⏳ Publishing: '+(e.vertical?'vertical':'horizontal')+' done');if(d.status==='en-cola')return t('⏳ En cola de render v5 (GrokBotBox, Python + ffmpeg). Se publica sola en vertical y horizontal.','⏳ Queued for v5 render (GrokBotBox). It will be published in vertical and horizontal.');return '';}
if(typeof document!=='undefined'){
 const en=document.documentElement.lang.startsWith('en'),t=(es,eng)=>en?eng:es,dialog=document.getElementById('capsulaPanel');
 if(dialog){
  const box=document.createElement('section');box.className='creator-capsule-url';box.setAttribute('aria-labelledby','capurl-title');
  box.innerHTML=`<h3 id="capurl-title">🔗 ${t('Crear cápsula desde URL','Create capsule from URL')}</h3><p>${t('Pega un enlace de LinkedIn, YouTube, X, TikTok o un artículo. Extraigo el contenido, redacto un «¿Sabías que?» y lo revisas antes de generarlo con la plantilla v5.','Paste a LinkedIn, YouTube, X, TikTok or article link. I extract it, draft a “Did you know?” and you review it before rendering with template v5.')}</p>
<div class="creator-capsule-grid"><label class="full">URL<input id="capurl-url" type="url" inputmode="url" maxlength="2000" placeholder="https://lnkd.in/…"></label>
<details class="full"><summary>${t('¿No se puede leer la página? Pega aquí el texto o la transcripción','Page unreadable? Paste text or transcript here')}</summary><textarea id="capurl-texto" rows="4" maxlength="12000"></textarea></details></div>
<div class="creator-capsule-actions"><button type="button" class="pill accent" id="capurl-extraer">✍️ ${t('Extraer y redactar guion','Extract and draft script')}</button></div>
<div id="capurl-editor" hidden><p id="capurl-origen" class="capurl-origen"></p><div class="creator-capsule-grid">${CAMPOS.map(([k,es,eng,max])=>`<label class="full">${t(es,eng)}${k==='idea'?`<textarea id="capurl-${k}" rows="2" maxlength="${max}"></textarea>`:`<input id="capurl-${k}" maxlength="${max}">`}</label>`).join('')}
<label>${t('Cifra (opcional, solo si está en la fuente)','Figure (optional, only if in source)')}<input id="capurl-cifra" inputmode="decimal" maxlength="14"></label><label>${t('Unidad de la cifra','Figure unit')}<input id="capurl-unidad" maxlength="16"></label>
<label>${t('Tema','Topic')}<select id="capurl-tema">${['tecnología','ciencia','negocio','creatividad','música','marketing','salud','cultura'].map(x=>`<option>${x}</option>`).join('')}</select></label></div>
<div class="creator-capsule-actions"><button type="button" class="pill accent" id="capurl-generar">🎬 ${t('Generar cápsula v5 y guardar en Stock','Render v5 capsule and save to Stock')}</button><a class="pill" id="capurl-ver" hidden>${t('Ver en Stock','View in Stock')} →</a></div></div>
<p id="capurl-status" role="status" aria-live="polite"></p><hr>`;
  dialog.querySelector('#capsulaForm').before(box);
  const $=id=>document.getElementById(id),val=id=>$(id).value;let borrador=null,poll=null;
  const say=s=>$('capurl-status').textContent=s;
  const verStock=d=>{const e=d.existing||{},x=e.vertical||e.horizontal;if(x){$('capurl-ver').href=(en?'/en':'')+'/stock.html?highlight='+encodeURIComponent(x.id);$('capurl-ver').hidden=false;}};
  async function estado(ref){const r=await fetch('/creator-capsule-url?ref='+encodeURIComponent(ref),{credentials:'same-origin'}),d=await r.json();if(d.ok){say(statusText(d,t));verStock(d);if(d.status==='publicada'){clearInterval(poll);poll=null;}}return d;}
  const watch=ref=>{clearInterval(poll);poll=setInterval(()=>estado(ref).catch(()=>{}),20000);};
  async function call(body){const r=await fetch('/creator-capsule-url',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok&&!d.ref)throw Error(d.error||('HTTP '+r.status));return d;}
  $('capurl-extraer').onclick=async()=>{const url=val('capurl-url').trim();if(!url){$('capurl-url').focus();return;}$('capurl-extraer').disabled=true;say(t('Leyendo la fuente y redactando con Gemini…','Reading the source and drafting with Gemini…'));
   try{const d=await call({accion:'borrador',url,texto:val('capurl-texto')});borrador=d;
    if(d.source)$('capurl-origen').textContent=`${t('Fuente','Source')}: ${d.source.title||d.source.resolvedUrl} · ${d.source.kind}${d.source.sourceKey?' · '+d.source.sourceKey:''}`;
    if(d.status==='publicada'||d.status==='en-cola'||d.status==='parcial'){say(t('Esta URL ya tiene cápsula. ','This URL already has a capsule. ')+statusText(d,t));verStock(d);if(d.status!=='publicada')watch(d.ref);}
    if(!d.ok){say(t('No pude redactar: ','Could not draft: ')+(d.error||'')+t(' · pega el texto abajo y repite.',' · paste the text below and retry.'));return;}
    const g=d.guion;for(const [k] of CAMPOS)$('capurl-'+k).value=g[k]||'';$('capurl-cifra').value=g.cifra?.hasta??'';$('capurl-unidad').value=g.cifra?.unidad||'';$('capurl-tema').value=g.tema||'tecnología';
    $('capurl-editor').hidden=false;if(d.status==='sin-encargo')say(t('Borrador listo: revisa y edita antes de generar.','Draft ready: review and edit before rendering.'));$('capurl-gancho').focus();
   }catch(e){say(t('No se pudo leer la URL: ','Could not read URL: ')+e.message);}finally{$('capurl-extraer').disabled=false;}};
  $('capurl-generar').onclick=async()=>{if(!borrador)return;$('capurl-generar').disabled=true;say(t('Encargando render v5…','Queuing v5 render…'));
   try{const d=await call({accion:'encargar',url:val('capurl-url').trim(),guion:readGuion(val),image:borrador.source?.image||'',author:borrador.source?.author||'',title:borrador.source?.title||''});
    if(!d.ok)throw Error((d.errors||[]).join(' · ')||d.error);say((d.reused?t('Ya estaba encargada. ','Already queued. '):'')+statusText(d,t));verStock(d);if(d.status!=='publicada')watch(d.ref);
   }catch(e){say(t('No se pudo encargar: ','Could not queue: ')+e.message);}finally{$('capurl-generar').disabled=false;}};
  const q=new URLSearchParams(location.search).get('capsula-url');if(q){$('capurl-url').value=q;}
 }
}
