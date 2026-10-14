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
export function contentLanguages(c){return c.contentLanguages||[contentLanguage(c)];}
export function campaignCopy(c){return {headline:c.headline||'',cta:c.cta||'',price:c.price||'',translationDraft:c.translationDraft===true};}
export function rememberLanguageCopy(c){c.copyByLanguage||={};c.copyByLanguage[contentLanguage(c)]=campaignCopy(c);return c;}
export function validateLanguages(values){if(!Array.isArray(values)||!values.length||values.length>2||new Set(values).size!==values.length||values.some(v=>!CONTENT_LANGUAGES.includes(v)))throw Error('campaign-content-languages');return [...values];}
export function restoreLanguage(value,out){
 const lang=value.contentLanguage===undefined?'es':value.contentLanguage;if(!CONTENT_LANGUAGES.includes(lang))throw Error('campaign-content-language');out.contentLanguage=lang;
 out.contentLanguages=validateLanguages(value.contentLanguages===undefined?[lang]:value.contentLanguages);if(!out.contentLanguages.includes(lang))throw Error('campaign-content-languages');
 if(value.translationDraft!==undefined&&typeof value.translationDraft!=='boolean')throw Error('campaign-translation-draft');out.translationDraft=value.translationDraft===true;
 const variants=value.copyByLanguage===undefined?{}:value.copyByLanguage;if(!variants||typeof variants!=='object'||Array.isArray(variants))throw Error('campaign-copy-language');out.copyByLanguage={};
 for(const [key,v] of Object.entries(variants)){
  if(!CONTENT_LANGUAGES.includes(key)||!v||typeof v!=='object'||Array.isArray(v))throw Error('campaign-copy-language');
  const copy={};for(const field of ['headline','cta','price']){const text=v[field]===undefined?'':v[field];if(typeof text!=='string'||text.length>500)throw Error('campaign-copy-language');copy[field]=text;}
  if(v.translationDraft!==undefined&&typeof v.translationDraft!=='boolean')throw Error('campaign-copy-language');copy.translationDraft=v.translationDraft===true;out.copyByLanguage[key]=copy;
 }
 return rememberLanguageCopy(out);
}
export function selectContentLanguage(value,target,{allowDraft=false}={}){
 if(!CONTENT_LANGUAGES.includes(target))throw Error('campaign-content-language');
 const c=rememberLanguageCopy(clone(value)),source=contentLanguage(c);if(source===target)return c;
 let next=c.copyByLanguage[target],draft=false;
 if(!next){
  const translated=text=>{if(!text)return '';const pair=pairs.find(p=>p.includes(text));return pair?.[target==='en'?1:0];};
  const headline=translated(c.headline),cta=translated(c.cta);draft=headline===undefined||cta===undefined;
  if(draft&&!allowDraft)throw Error('campaign-translation-required');next={headline:headline||'',cta:cta||'',price:c.price||'',translationDraft:draft};
 }
 draft=draft||next.translationDraft===true||!String(next.headline||'').trim();c.contentLanguage=target;if(c.language!==undefined)c.language=target;
 if(c.contentLanguages&&!c.contentLanguages.includes(target))c.contentLanguages=[target];Object.assign(c,next);c.translationDraft=draft;c.revision=(c.revision||1)+1;return rememberLanguageCopy(c);
}
export function languageVariant(value,target,{allowDraft=false}={}){const c=selectContentLanguage(value,target,{allowDraft});c.revision=value.revision;if(c.translationDraft&&!allowDraft)throw Error('campaign-copy-language-required');return c;}
export function campaignVariants(c,{allowDraft=false}={}){return contentLanguages(c).map(lang=>languageVariant(c,lang,{allowDraft}));}
export function setContentLanguages(value,values,{allowDraft=false}={}){
 const langs=validateLanguages(values),c=rememberLanguageCopy(clone(value));c.contentLanguages=langs;
 for(const lang of langs){const variant=languageVariant(c,lang,{allowDraft});c.copyByLanguage[lang]=campaignCopy(variant);}
 const active=langs.includes(contentLanguage(c))?contentLanguage(c):langs[0],out=languageVariant(c,active,{allowDraft});out.contentLanguages=langs;out.revision=(value.revision||1)+1;return out;
}
export function contentLanguageControl({id,value,values=[value||'es'],t,onChange,onSelect}){
 const group=document.createElement('fieldset');group.className='campaign-content-language';const legend=document.createElement('legend');legend.textContent=t('Idiomas a crear','Languages to create');group.append(legend);
 const checks=CONTENT_LANGUAGES.map(lang=>{const l=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=lang;input.id=id+'-'+lang;input.checked=values.includes(lang);l.append(input,document.createTextNode(lang==='es'?t('Castellano','Spanish'):t('Inglés','English')));group.append(l);input.onchange=()=>{const chosen=checks.filter(x=>x.checked).map(x=>x.value);if(!chosen.length){input.checked=true;return;}onSelect?.(chosen);};return input;});
 const label=document.createElement('label');label.append(document.createTextNode(t('Idioma que estás revisando','Language under review')+' '));const select=document.createElement('select');select.id=id;select.setAttribute('aria-label',t('Idioma que estás revisando','Language under review'));label.append(select);group.append(label);
 group.update=({value,values,disabled=false})=>{for(const check of checks){check.checked=values.includes(check.value);check.disabled=disabled;}select.replaceChildren(...values.map(lang=>new Option(lang==='es'?t('Castellano','Spanish'):t('Inglés','English'),lang)));select.value=value;select.disabled=disabled;label.hidden=values.length===1;};select.onchange=()=>onChange?.(select.value);group.update({value,values});return group;
}
