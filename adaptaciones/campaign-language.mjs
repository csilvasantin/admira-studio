export const CONTENT_LANGUAGES=['es','en'];
const clone=x=>JSON.parse(JSON.stringify(x));
const pairs=[
 ['Tu café sigue contigo.','Your coffee goes with you.'],
 ['Disfruta el momento.','Enjoy the moment.'],
 ['TU TITULAR','YOUR HEADLINE'],['TU LLAMADA A LA ACCIÓN','YOUR CALL TO ACTION'],
 ['ESTRENA TU PRÓXIMO PASO.','TAKE YOUR NEXT STEP.'],['DESCUBRE LA COLECCIÓN','DISCOVER THE COLLECTION'],
 ['TU CALLE. TU RITMO.','OWN THE STREET'],['MUÉVETE A TU MANERA','MOVE YOUR WAY'],
 ['ENCUENTRA TU RITMO','FIND YOUR FLOW'],['HAZLO TUYO','MAKE IT YOURS'],
 ['SIENTE LA CIUDAD','FEEL THE CITY'],['EMPIEZA ALGO NUEVO','START SOMETHING'],
 ['ENTRA. ENCUENTRA TU PAR.','COME IN. FIND YOUR PAIR.']
];
export function contentLanguage(c){return c.contentLanguage||c.language||'es';}
export function campaignCopy(c){return {headline:c.headline||'',cta:c.cta||'',price:c.price||''};}
export function rememberLanguageCopy(c){c.copyByLanguage||={};c.copyByLanguage[contentLanguage(c)]=campaignCopy(c);return c;}
export function restoreLanguage(value,out){
 const lang=value.contentLanguage===undefined?'es':value.contentLanguage;if(!CONTENT_LANGUAGES.includes(lang))throw Error('campaign-content-language');out.contentLanguage=lang;
 if(value.translationDraft!==undefined&&typeof value.translationDraft!=='boolean')throw Error('campaign-translation-draft');out.translationDraft=value.translationDraft===true;
 const variants=value.copyByLanguage===undefined?{}:value.copyByLanguage;if(!variants||typeof variants!=='object'||Array.isArray(variants))throw Error('campaign-copy-language');out.copyByLanguage={};
 for(const [key,v] of Object.entries(variants)){
  if(!CONTENT_LANGUAGES.includes(key)||!v||typeof v!=='object'||Array.isArray(v))throw Error('campaign-copy-language');
  const copy={};for(const field of ['headline','cta','price']){const text=v[field]??'';if(typeof text!=='string'||text.length>500)throw Error('campaign-copy-language');copy[field]=text;}
  out.copyByLanguage[key]=copy;
 }
 // Active authored copy is authoritative; an imported stale variant cannot overwrite it.
 return rememberLanguageCopy(out);
}
export function selectContentLanguage(value,target,{allowDraft=false}={}){
 if(!CONTENT_LANGUAGES.includes(target))throw Error('campaign-content-language');
 const c=rememberLanguageCopy(clone(value)),source=contentLanguage(c);if(source===target)return c;
 let next=c.copyByLanguage[target],draft=false;
 if(!next){
  const translated=text=>{if(!text)return '';const pair=pairs.find(p=>p.includes(text));return pair?.[target==='en'?1:0];};
  const headline=translated(c.headline),cta=translated(c.cta);
  draft=headline===undefined||cta===undefined;
  if(draft&&!allowDraft)throw Error('campaign-translation-required');
  next={headline:headline||'',cta:cta||'',price:c.price||''};
 }
 draft=draft||!String(next.headline||'').trim();c.contentLanguage=target;if(c.language!==undefined)c.language=target;
 Object.assign(c,next);c.translationDraft=draft;c.revision=(c.revision||1)+1;
 return rememberLanguageCopy(c);
}
export function contentLanguageControl({id,value,t,onChange}){
 const label=document.createElement('label');label.className='campaign-content-language';label.append(document.createTextNode(t('Idioma del contenido','Content language')+' '));
 const select=document.createElement('select');select.id=id;select.setAttribute('aria-label',t('Idioma del contenido','Content language'));
 select.append(new Option(t('Castellano','Spanish'),'es'),new Option(t('Inglés','English'),'en'));select.value=value||'es';select.onchange=()=>onChange(select.value);label.append(select);return label;
}
