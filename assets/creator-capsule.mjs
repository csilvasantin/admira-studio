import {CONSEJEROS,TEMAS} from './capsula-publicar.mjs';
const en=document.documentElement.lang.startsWith('en')||new URLSearchParams(location.search).get('lang')==='en',t=(es,eng)=>en?eng:es;
const dialog=document.createElement('dialog');dialog.id='capsulaPanel';dialog.className='creator-capsule-modal';dialog.setAttribute('aria-labelledby','creator-capsule-title');
dialog.innerHTML=`<h2 id="creator-capsule-title">📚 ${t('Nueva cápsula','New capsule')}</h2><p>${t('Crea una cápsula de conocimiento, un «¿Sabías que?» o un resumen de libro. Se guarda como texto en Stock.','Create a knowledge capsule, a “Did you know?” or a book summary. It is saved as text in Stock.')}</p><form id="capsulaForm"><div class="creator-capsule-grid">
<label class="full">${t('Tipo de cápsula','Capsule type')}<select id="cap-kind"><option value="knowledge">${t('Conocimiento','Knowledge')}</option><option value="didyouknow">${t('¿Sabías que?','Did you know?')}</option><option value="blinkist">${t('Libro · Blinkist','Book · Blinkist')}</option></select></label>
<label class="full">${t('Idioma de la cápsula','Capsule language')}<select id="cap-language"><option value="es">Castellano</option><option value="en">English</option></select></label>
<label class="full">${t('Título','Title')}<input id="cap-tesis" required maxlength="300"></label>
<label class="full">${t('Contenido de la cápsula','Capsule content')}<textarea id="cap-carbono" required rows="6" maxlength="8000"></textarea></label>
<label class="full" data-knowledge>${t('Fuente verificable · referencia o URL','Verifiable source · reference or URL')}<input id="cap-source" maxlength="1000" required></label>
<label class="full" data-knowledge>${t('Tema o etiqueta (opcional)','Topic or tag (optional)')}<input id="cap-topic" maxlength="80"></label>
<label class="full" data-book hidden>URL Blinkist<input id="cap-url" type="url" maxlength="2000" placeholder="https://www.blinkist.com/en/books/…"></label>
<label data-book hidden>${t('Título del libro','Book title')}<input id="cap-libro" maxlength="2000"></label><label data-book hidden>${t('Autor','Author')}<input id="cap-autor" maxlength="2000"></label>
<label data-book hidden>${t('Consejero','Advisor')}<select id="cap-consejero"></select></label><label data-book hidden>${t('Tema','Topic')}<select id="cap-tema"></select></label>
<label class="full" data-book hidden>${t('Para agentes (opcional)','For agents (optional)')}<textarea id="cap-silicio" rows="2" maxlength="2000"></textarea></label><label class="full" data-book hidden>${t('Aplicación (opcional)','Application (optional)')}<textarea id="cap-aplicacion" rows="2" maxlength="2000"></textarea></label>
</div><div class="creator-capsule-actions"><button type="submit" class="pill accent">📌 ${t('Publicar cápsula','Publish capsule')}</button><button type="button" class="pill" id="cap-close">${t('Cerrar','Close')}</button><a class="pill" id="cap-view" href="${en?'/en':''}/stock.html?type=capsula" hidden>${t('Ver en Stock','View in Stock')} →</a></div><p id="cap-status" role="status" aria-live="polite"></p></form>`;
document.body.append(dialog);const $=id=>document.getElementById(id),form=$('capsulaForm'),submit=form.querySelector('[type=submit]');
for(const x of CONSEJEROS)$('cap-consejero').add(new Option(x.label,x.id));for(const x of TEMAS)$('cap-tema').add(new Option(x.label,x.id));
let opener=null,busy=false;
function open(button){opener=button;const group=button?.closest('.campaign-content-language'),lang=group?.querySelector('select')?.value||group?.querySelector('input:checked')?.value||(en?'en':'es');$('cap-language').value=lang==='en'?'en':'es';if(!dialog.open)dialog.showModal();$('cap-tesis').focus();}
function mount(){document.querySelectorAll('.adapt-main .campaign-content-language').forEach(group=>{if(group.querySelector('.creator-capsule-open'))return;const b=document.createElement('button');b.type='button';b.id=group.id?group.id+'-capsule':'';b.className='pill creator-capsule-open';b.textContent='📚 '+t('Nueva cápsula','New capsule');b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls','capsulaPanel');b.onclick=()=>open(b);group.append(b);});}
const main=document.querySelector('.adapt-main');if(main)new MutationObserver(mount).observe(main,{childList:true,subtree:true});mount();
$('cap-kind').onchange=()=>{const book=$('cap-kind').value==='blinkist';dialog.querySelectorAll('[data-book]').forEach(e=>e.hidden=!book);dialog.querySelectorAll('[data-knowledge]').forEach(e=>e.hidden=book);$('cap-source').required=!book;};
$('cap-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>opener?.focus());
form.onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;submit.disabled=true;$('cap-kind').disabled=true;$('cap-view').hidden=true;$('cap-status').textContent=t('Guardando cápsula en Stock…','Saving capsule to Stock…');
 const raw={kind:$('cap-kind').value,language:$('cap-language').value,source:$('cap-source').value,topic:$('cap-topic').value};for(const [key,id]of Object.entries({url:'url',libro:'libro',autor:'autor',tesis:'tesis',consejeroId:'consejero',tema:'tema',carbono:'carbono',silicio:'silicio',aplicacion:'aplicacion'}))raw[key]=$('cap-'+id).value;
 try{const r=await fetch('/stock-capsule',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(raw)}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.errors?.join(' · ')||d.error||'publish-failed');$('cap-status').textContent=t('Cápsula guardada como texto en Stock','Capsule saved as text in Stock')+(d.num?' · #'+d.num:d.id?' · '+d.id:'');$('cap-view').hidden=false;}
 catch(err){$('cap-status').textContent=t('No se pudo guardar: ','Could not save: ')+err.message;}
 finally{busy=false;submit.disabled=false;$('cap-kind').disabled=false;}
};
if(new URLSearchParams(location.search).get('capsula')==='new')open(null);
