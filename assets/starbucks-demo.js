/* Studio-owned snapshot of the 27-step native walkthrough, retrieved 2026-10-11.
 * Upstream: https://www.admiranext.com/suite/demo-control.js?v=20261009-idioma-demo-1
 * Limited to Studio: no macro engine, provider calls or deployment actions.
 * This branch is preview-only; upstream and frozen clones are unchanged. */
/* Native Suite Admira walkthrough. Runs only after an explicit launch URL.
 * Fixed, reviewed DOM actions; no arbitrary commands or provider requests.
 * The visible pointer belongs to the page, not the operating system.
 */
(function (G) {
  'use strict';
  var D = document, query = new URLSearchParams(location.search), platform = query.get('ax_demo');
  if (G.top !== G.self) return;
  if (G.AdmiraDemoControl) return;
  var hosts = {studio:['admira.studio','pixeria.com'],store:['admira.store','xpaceos.com'],tv:['admira.tv'],biz:['admira.biz','clearchannel.tv'],app:['admira.app','yokup.com']};
  var host = location.hostname.replace(/^www\./,''), EN = (query.get('lang') || D.documentElement.lang || '').slice(0,2)==='en';
  var preview = /^(localhost|127\.0\.0\.1)$/.test(host) && query.get('ax_preview')===platform;
  var pagesPreview = /^(?:[a-z0-9-]+\.)?admira-studio\.pages\.dev$/.test(host);
  if (platform !== 'studio') return;
  var studioOrigin = hosts.studio.includes(host) || /^(?:[a-z0-9-]+\.)?admira-studio\.pages\.dev$/.test(host) || preview;
  if (!studioOrigin) return;
  function enAhora(){ return (D.documentElement.lang || query.get('lang') || '').slice(0,2)==='en'; }
  function rutaIdioma(path){
    if (platform !== 'studio' || !path) return path;
    var base = String(path).replace(/^\/en(?=\/|$)/, '') || '/';
    if (base.charAt(0) !== '/') base = '/' + base;
    return enAhora() && base !== '/' ? '/en' + base : base;
  }
  function mismoPath(a, b){
    function norm(p){ return String(p || '').replace(/^\/en(?=\/|$)/, '').replace(/\/$/, '') || '/'; }
    return norm(a) === norm(b);
  }
  // El texto se elige al pintarlo: /idioma cambia html.lang y el mismo paso sigue, en el otro idioma.
  var T = function(a,b){
    var frase = {es:a, en:b};
    frase.toString = function(){ return enAhora() ? frase.en : frase.es; };
    frase.valueOf = frase.toString;
    return frase;
  }, steps = [], run = query.get('ax_run') || 'direct', key='admira-native-demo-v1:'+platform;
  function add(action, selector, text, value, path) { steps.push({action:action,selector:selector || '',text:text,value:value,path:path || ''}); }
  function point(s,t,p){add('point',s,t,null,p);} function click(s,t,p){add('click',s,t,null,p);} function fill(s,v,t,p){add('fill',s,t,v,p);} function select(s,v,t,p){add('select',s,t,v,p);}
  function reel(id,p){add('video','',T('Veamos el resultado preparado de esta función.','Let us see the prepared result of this feature.'),'https://www.admiranext.com/assets/demos/suite-v1/'+platform+'-'+id+'.mp4',p);}
  if(platform==='studio'){
    var audio='/audio',music='/musica',image='/imagenes',video='/video',adapt='/adaptaciones/';
    fill('#proj-cliente',T('Alsea · Starbucks · demostración','Alsea · Starbucks · demonstration'),T('Prepararemos el mensaje de bienvenida de la cafetería.','We will prepare the coffee shop welcome message.'),audio);
    fill('#a-personaje',T('Voz adulta cálida y cercana','Warm, friendly adult voice'),T('Definimos la identidad de la voz.','We define the voice identity.'),audio);
    select('#a-idioma',T('Espanol (ES)','Ingles (UK)'),T('Elegimos el idioma de la locución.','We choose the voiceover language.'),audio);
    select('#a-tono','Cercano',T('Elegimos un tono cercano al cliente.','We choose a warm tone.'),audio);
    fill('#a-guion',T('Bienvenidos a Starbucks. Haz una pausa y disfruta de un café recién hecho.','Welcome to Starbucks. Take a break and enjoy a freshly brewed coffee.'),T('Escribimos el texto que escucharía el cliente en tienda.','We write the message the customer would hear in store.'),audio);
    point('#playOutput',T('Este botón genera una locución nueva. En este recorrido escuchamos una ya preparada.','This button generates a new voiceover. Here we play a prepared one.'),audio);reel('voz',audio);
    select('#m-versiones','Loop instrumental ~15s',T('Para el ambiente de tienda elegimos un loop instrumental.','For the store atmosphere we choose an instrumental loop.'),music);
    select('#m-style','blues',T('Escogemos el estilo musical.','We choose the musical style.'),music);
    fill('#m-titulo',T('Una pausa con café','A coffee break'),T('Damos nombre a la pieza.','We name the piece.'),music);
    fill('#m-letra',T('[Instrumental]\nPiano cálido, guitarra suave y contrabajo. Sin voz.','[Instrumental]\nWarm piano, soft guitar and double bass. No vocals.'),T('Describimos instrumentos y ambiente, sin letra cantada.','We describe the instruments and atmosphere, without sung lyrics.'),music);
    point('#playOutput',T('Aquí se solicita la música. Escuchemos la muestra preparada.','Music is requested here. Let us hear the prepared sample.'),music);reel('musica',music);
    fill('#proj-cliente',T('Alsea · Starbucks · demostración','Alsea · Starbucks · demonstration'),T('La creatividad conserva el contexto del proyecto.','The creative retains the project context.'),image);
    fill('#i-prompt',T('Fotografía publicitaria de café humeante en una taza de cerámica, barra de madera, luz cálida de mañana, fondo de cafetería desenfocado, sin texto.','Advertising photograph of steaming coffee in a ceramic cup, wooden counter, warm morning light, blurred coffee shop background, no text.'),T('Describimos producto, luz y composición.','We describe the product, light and composition.'),image);
    point('#playOutput',T('Aquí comienza la creación de imagen; ahora vemos el resultado preparado.','Image creation starts here; we now show the prepared result.'),image);reel('imagen',image);
    fill('#clip-stock','1791230658801-jnv969',T('Partimos de una imagen preparada de la biblioteca.','We start with a prepared library image.'),video);
    fill('#clip-prompt',T('La cámara se acerca lentamente al café y el vapor asciende suavemente. Conserva la taza y el fondo, sin texto.','The camera slowly approaches the coffee as steam gently rises. Keep the cup and background, without text.'),T('Definimos el movimiento sin cambiar el producto.','We define motion without changing the product.'),video);
    point('#clip-one',T('Este control solicita el clip. Veamos el movimiento del ejemplo preparado.','This control requests the clip. Let us see the prepared example in motion.'),video);reel('video',video);
    click('#stock-pick',T('Abrimos la biblioteca para elegir un contenido existente.','We open the library to choose existing content.'),adapt);
    add('stock','#stock-list li[role="option"]',T('Elegimos el anuncio de café de la demostración.','We choose the coffee ad prepared for this demonstration.'),'Un anuncio elegante de café recién hecho',adapt);
    click('#btn-adaptar',T('Abrimos los formatos de salida de esta pieza.','We open the output formats for this content.'),adapt);
    point('#grid',T('La misma pieza se adapta a pantallas horizontales, verticales y otros tamaños.','The same content adapts to landscape, portrait and other screen sizes.'),adapt);
    point('#export-all',T('La exportación produciría los archivos. Comparemos las cuatro variantes ya preparadas.','Export would produce the files. Let us compare the four prepared variants.'),adapt);reel('adaptar',adapt);
  }

  var state={run:run,index:0,active:true,paused:false,muted:false,voice:true,error:'',audioNote:'',pending:false}, saved;
  try{saved=JSON.parse(G.sessionStorage.getItem(key)||'null');if(saved && saved.run===run && Number.isInteger(saved.index) && saved.index>=0 && saved.index<=steps.length){state.index=saved.index;state.paused=!!saved.paused;state.active=!!saved.active;state.muted=!!saved.muted;state.voice=saved.voice!==false;}}catch(_){}
  if(!steps.length)return;
  var generation=0,timer=0,waitResolve=null,utterance=null,videoEl=null,originals=[],target=null,nativeFrame=null;
  function pageDocument(){var doc=nativeFrame?nativeFrame.contentDocument:D;if(nativeFrame&&doc&&doc.head&&!doc.querySelector('#admira-native-target-style')){var st=doc.createElement('style');st.id='admira-native-target-style';st.textContent='.admira-demo-target{outline:3px solid var(--mbx-brand,#FF33CC)!important;outline-offset:5px!important}html:root[data-ax-experto] .ax-experto.ax-dock,html:root .ax-dock-spacer{display:none!important}';doc.head.appendChild(st);}return doc;}
  function pagePath(){return nativeFrame?nativeFrame.contentWindow.location.pathname:location.pathname;}
  var panel=D.createElement('section');panel.id='admira-native-demo';panel.setAttribute('role','region');panel.setAttribute('aria-label',T('Demostración autónoma en vivo','Autonomous live walkthrough'));
  var style=D.createElement('style');style.textContent='#admira-native-demo{position:fixed;z-index:2147483200;left:14px;right:14px;bottom:calc(14px + var(--ax-dock-pad,62px));background:var(--mb-superficie,#10201c);color:var(--mbx-ink,#f1f5ef);border:1px solid var(--mbx-brand,#9bd6bc);border-radius:12px;padding:12px 16px;box-shadow:0 8px 40px #0008;font:14px/1.45 system-ui;max-height:34vh;overflow:auto}#admira-native-demo p{margin:3px 0 9px}#admira-native-demo strong{color:var(--mbx-accent,#a4dfc3)}#admira-native-demo button{background:var(--mb-fondo,#223c32);color:var(--mbx-ink,#fff);border:1px solid var(--mb-borde,#759d88);border-radius:6px;padding:7px 12px;margin:3px 5px 0 0;font:inherit;cursor:pointer}#admira-native-demo button:disabled{opacity:.5}#admira-demo-pointer{position:fixed;z-index:2147483199;pointer-events:none;width:27px;height:34px;transition:left .55s ease,top .55s ease;filter:drop-shadow(1px 2px 2px #000)}.admira-demo-target{outline:3px solid #9be4ba!important;outline-offset:5px!important}#admira-native-cinema{position:fixed;z-index:2147483198;inset:12px 16px 190px;display:flex;align-items:center;justify-content:center;background:#07120feb;border-radius:12px;padding:12px}#admira-native-cinema[hidden]{display:none}#admira-native-cinema video{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}@media(max-width:600px){#admira-native-demo{left:5px;right:5px;bottom:calc(5px + var(--ax-dock-pad,62px));padding:9px;max-height:40vh;font-size:12px}#admira-native-cinema{inset:5px 5px 230px}#admira-native-demo button{padding:6px 9px}}';D.head.appendChild(style);
  if(platform==='studio'){nativeFrame=D.createElement('iframe');nativeFrame.id='admira-native-studio';nativeFrame.title=T('Interfaz real de Admira Studio','Actual Admira Studio interface');nativeFrame.style.cssText='position:fixed;inset:0 0 180px;width:100%;height:calc(100% - 180px);border:0;background:#07120f;z-index:2147483197';D.body.appendChild(nativeFrame);}
  var title=D.createElement('strong'),status=D.createElement('p'),caption=D.createElement('p'),bar=D.createElement('div');status.setAttribute('aria-live','polite');caption.setAttribute('data-demo-phase','');title.textContent=((preview||pagesPreview)?T('VISTA PREVIA · ','PREVIEW · '):T('EN VIVO · ','LIVE · '))+platform.toUpperCase();panel.appendChild(title);panel.appendChild(status);panel.appendChild(caption);panel.appendChild(bar);
  function button(label,fn){var b=D.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;bar.appendChild(b);return b;}
  var pauseBtn=button('',function(){control(state.paused?'resume':'pause');}),muteBtn=button('',function(){control('mute');}),voiceBtn=button('',function(){state.voice=!state.voice;state.audioNote='';persist();if(!state.voice&&G.speechSynthesis)G.speechSynthesis.cancel();paint();}),nextBtn=button(T('Siguiente','Next'),function(){control('next');}),stopBtn=button(T('Devolver control','Return control'),function(){var href=nativeFrame&&nativeFrame.contentWindow?nativeFrame.contentWindow.location.href:'';control('stop');if(href&&new URL(href).origin===location.origin)location.assign(href);});
  var pointer=D.createElement('div');pointer.id='admira-demo-pointer';pointer.setAttribute('aria-hidden','true');pointer.innerHTML='<svg viewBox="0 0 27 34" xmlns="http://www.w3.org/2000/svg"><path d="M2 2v26l7-7 6 11 5-3-6-10h10Z" fill="#FF33CC" stroke="#251327" stroke-width="2"/></svg>';
  var cinema=D.createElement('div');cinema.id='admira-native-cinema';cinema.hidden=true;D.body.appendChild(cinema);D.body.appendChild(pointer);D.body.appendChild(panel);
  function fitStage(){var dock=D.querySelector('.ax-experto'),dh=0;if(dock){var dr=dock.getBoundingClientRect();if(dr.height&&getComputedStyle(dock).display!=='none')dh=Math.max(0,innerHeight-dr.top);if(stageObserver)stageObserver.observe(dock);}panel.style.bottom=(dh+(innerWidth<=600?5:14))+'px';var h=Math.ceil(panel.getBoundingClientRect().height),b=Math.ceil(innerHeight-panel.getBoundingClientRect().bottom);nativeFrame.style.bottom=(h+b+10)+'px';nativeFrame.style.height='calc(100dvh - '+(h+b+10)+'px)';cinema.style.bottom=(h+b+20)+'px';}
  var stageObserver=new ResizeObserver(fitStage);stageObserver.observe(panel);var dockObserver=new MutationObserver(fitStage);dockObserver.observe(D.documentElement,{attributes:true,attributeFilter:['style','data-ax-dock']});G.addEventListener('resize',fitStage);fitStage();
  function persist(){try{G.sessionStorage.setItem(key,JSON.stringify({run:run,index:state.index,active:state.active,paused:state.paused,muted:state.muted,voice:state.voice}));}catch(_){} }
  function paint(){nextBtn.textContent=T('Siguiente','Next');stopBtn.textContent=T('Devolver control','Return control');panel.setAttribute('aria-label',T('Demostración autónoma en vivo','Autonomous live walkthrough'));nativeFrame.title=T('Interfaz real de Admira Studio','Actual Admira Studio interface');title.textContent=((preview||pagesPreview)?T('VISTA PREVIA · ','PREVIEW · '):T('EN VIVO · ','LIVE · '))+platform.toUpperCase();panel.dataset.state=state.active?(state.paused?'paused':'running'):'complete';status.textContent=state.error||(state.audioNote?state.audioNote+' · ':'')+T('Paso ','Step ')+Math.min(state.index+1,steps.length)+'/'+steps.length+' · '+(state.active?(state.paused?T('En pausa','Paused'):T('Recorriendo la interfaz','Walking through the interface')):T('Recorrido terminado · tienes el control','Walkthrough complete · you have control'));caption.textContent=steps[state.index]?String(steps[state.index].text):String(T('La Suite conecta creación, gestión, emisión y operación del retail.','The Suite connects content creation, management, broadcasting and retail operations.'));pauseBtn.textContent=state.paused?T('Reanudar','Resume'):T('Pausar','Pause');pauseBtn.disabled=nextBtn.disabled=!state.active;muteBtn.textContent=state.muted?T('Activar sonido','Enable sound'):T('Silenciar demo','Mute demo');muteBtn.setAttribute('aria-pressed',String(state.muted));voiceBtn.textContent=state.voice?T('Voz: activa','Voice: on'):T('Voz: apagada','Voice: off');}
  function cancel(){generation++;clearTimeout(timer);if(waitResolve){waitResolve(false);waitResolve=null;}if(G.speechSynthesis)G.speechSynthesis.cancel();if(videoEl)videoEl.pause();}
  function cleanupTarget(){if(target)target.classList.remove('admira-demo-target');target=null;pointer.hidden=true;}
  function restore(){originals.forEach(function(o){if(o.el.isConnected&&o.el.value===o.written){o.el.value=o.value;o.el.dispatchEvent(new Event('input',{bubbles:true}));o.el.dispatchEvent(new Event('change',{bubbles:true}));}});originals=[];}
  function control(c){if(c==='stop'){cancel();state.active=false;state.paused=false;state.error='';restore();cleanupTarget();cinema.hidden=true;try{G.sessionStorage.removeItem(key);var u=new URL(location.href);u.searchParams.delete('ax_demo');u.searchParams.delete('ax_run');G.history.replaceState(null,'',u);}catch(_){}stageObserver.disconnect();dockObserver.disconnect();G.removeEventListener('resize',fitStage);panel.remove();pointer.remove();cinema.remove();style.remove();if(nativeFrame)nativeFrame.remove();return getState();}if(c==='mute'){state.muted=!state.muted;if(videoEl)videoEl.muted=state.muted;if(state.muted&&G.speechSynthesis)G.speechSynthesis.cancel();persist();paint();return getState();}if(!state.active)return getState();if(c==='next'){cancel();cinema.hidden=true;state.index++;state.pending=false;state.error='';state.paused=false;persist();paint();execute();return getState();}if(c==='pause'){cancel();state.paused=true;persist();paint();}if(c==='resume'){state.paused=false;state.error='';if(state.audioNote){state.voice=true;state.audioNote='';}persist();paint();execute();}return getState();}
  function fail(msg){cancel();state.paused=true;state.error=msg;persist();paint();}
  function getState(){return {activo:state.active,pausado:state.paused,demo:platform,fase:Math.min(state.index+1,steps.length),fases:steps.length,numero:1,total:1,error:state.error,control:'interfaz'};}
  function delay(ms,token){return new Promise(function(resolve){if(token!==generation||state.paused)return resolve(false);waitResolve=resolve;timer=setTimeout(function(){waitResolve=null;resolve(token===generation&&!state.paused);},ms);});}
  function visible(el){if(!el||!el.isConnected)return false;var r=el.getBoundingClientRect(),s=(el.ownerDocument?.defaultView||G).getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';}
  async function find(step,token){for(var n=0;n<80;n++){if(platform==='app'&&pageDocument().querySelector('#workspace')?.hidden){throw new Error(T('Entra en tu cuenta del comercio y pulsa Reanudar para mostrar tu inventario e incidencias.','Sign in to your retailer account and press Resume to show inventory and incidents.'));}var list=Array.prototype.slice.call(pageDocument().querySelectorAll(step.selector));if(step.action==='dismiss'&&!list.some(visible))return false;var el=step.action==='stock'?list.filter(function(e){return e.textContent.toLowerCase().indexOf(step.value.toLowerCase())>=0;})[0]:list.filter(visible)[0];var ready=platform!=='tv'||(D.querySelector('#loading')?.classList.contains('done')&&typeof D.querySelector('#human-exit')?.onclick==='function'&&typeof D.querySelector('#universe-center')?.onclick==='function');if(ready&&el&&visible(el)&&(!('disabled'in el)||!el.disabled||step.action==='point'))return el;if(!await delay(250,token))return null;}throw new Error(T('No puedo manejar este control todavía: ','This control is not ready: ')+step.selector+T('. Revisa la pantalla y pulsa Reanudar.','. Check the screen and press Resume.'));}
  async function aim(el,token){cleanupTarget();target=el;el.classList.add('admira-demo-target');el.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'});if(!await delay(650,token))return false;var r=el.getBoundingClientRect();pointer.hidden=false;pointer.style.left=Math.max(4,Math.min(innerWidth-30,r.left+r.width/2))+'px';pointer.style.top=Math.max(4,Math.min(innerHeight-40,r.top+r.height/2))+'px';return delay(650,token);}
  async function narrate(text,token){if(!state.voice||state.muted||!G.speechSynthesis||!G.SpeechSynthesisUtterance)return delay(2400,token);return new Promise(function(resolve){var done=false,dicho=String(text);function finish(){if(done)return;done=true;clearTimeout(timer);waitResolve=null;resolve(token===generation&&!state.paused);}waitResolve=function(){done=true;resolve(false);};utterance=new G.SpeechSynthesisUtterance(dicho);utterance.lang=enAhora()?'en-GB':'es-ES';utterance.rate=1;utterance.onend=finish;utterance.onerror=function(e){if(e.error==='not-allowed'){state.voice=false;state.audioNote=T('Voz bloqueada por el navegador; pulsa Voz para activarla','Browser voice blocked; press Voice to enable it');persist();paint();}finish();};G.speechSynthesis.speak(utterance);timer=setTimeout(function(){if(G.speechSynthesis)G.speechSynthesis.cancel();finish();},Math.max(6500,dicho.length*105));});}
  async function playClip(step,token){cleanupTarget();cinema.hidden=false;if(!videoEl){videoEl=D.createElement('video');videoEl.controls=true;videoEl.playsInline=true;videoEl.preload='metadata';cinema.appendChild(videoEl);}if(videoEl.getAttribute('src')!==step.value){videoEl.src=step.value;videoEl.currentTime=0;}videoEl.muted=state.muted;caption.textContent=T('Muestra preparada en español · no se genera contenido nuevo.','Prepared Spanish sample · no new content is generated.');
    return new Promise(function(resolve,reject){var ended=function(){clean();resolve(token===generation&&!state.paused);},error=function(){clean();reject(new Error(T('No se pudo reproducir el vídeo. Pulsa Reanudar para reintentar.','The video could not play. Press Resume to retry.')));};function clean(){videoEl.removeEventListener('ended',ended);videoEl.removeEventListener('error',error);waitResolve=null;}waitResolve=function(){clean();resolve(false);};videoEl.addEventListener('ended',ended);videoEl.addEventListener('error',error);try{var p=videoEl.play();if(p&&p.catch)p.catch(function(e){clean();reject(new Error(e.name==='NotAllowedError'?T('Pulsa Reanudar para activar el vídeo con sonido, o Silenciar demo para continuar sin audio.','Press Resume to enable video sound, or Mute demo to continue without audio.'):T('Error del vídeo; pulsa Reanudar.','Video error; press Resume.')));});}catch(e){error();}});
  }
  async function studioPage(path,token){
    var dest = rutaIdioma(path);
    var cur = '';
    try { cur = nativeFrame.contentWindow && nativeFrame.contentWindow.location ? nativeFrame.contentWindow.location.pathname : ''; } catch (_) {}
    if (cur && (cur === dest || cur.replace(/\/$/, '') === String(dest).replace(/\/$/, ''))) return true;
    restore();cleanupTarget();
    return new Promise(function(resolve,reject){var finished=false;function clean(){nativeFrame.removeEventListener('load',loaded);clearTimeout(timer);waitResolve=null;}function loaded(){if(finished)return;try{var doc=nativeFrame.contentDocument;if(!doc||/^\/auth\//.test(nativeFrame.contentWindow.location.pathname))throw new Error(T('Tu sesión de Studio necesita acceso. Abre Studio, entra y pulsa Reanudar.','Your Studio session needs access. Open Studio, sign in and press Resume.'));pageDocument();finished=true;clean();resolve(token===generation&&!state.paused);}catch(e){finished=true;clean();reject(e);}}
      nativeFrame.addEventListener('load',loaded);waitResolve=function(){finished=true;clean();resolve(false);};timer=setTimeout(function(){finished=true;clean();reject(new Error(T('La herramienta de Studio no ha terminado de cargar. Pulsa Reanudar para reintentar.','The Studio tool did not finish loading. Press Resume to retry.')));},30000);
      var u=new URL(dest,location.origin);['lang','marca','project','cliente'].forEach(function(k){if(query.get(k))u.searchParams.set(k,query.get(k));});nativeFrame.src=u.href;
    });
  }
  async function execute(){if(!state.active||state.paused)return;var token=++generation;paint();try{while(token===generation&&state.active&&!state.paused&&state.index<steps.length){var s=steps[state.index];paint();if(s.path&&!mismoPath(pagePath(),s.path)){if(nativeFrame){if(!await studioPage(s.path,token))return;}else{restore();persist();var u=new URL(rutaIdioma(s.path),location.origin);u.searchParams.set('ax_demo',platform);u.searchParams.set('ax_run',run);['lang','marca','project','cliente','loc','circuit','ax_preview'].forEach(function(k){if(query.get(k))u.searchParams.set(k,query.get(k));});location.assign(u.href);return;}}
      if(s.action==='video'){if(!await playClip(s,token))return;cinema.hidden=true;}
      else{if(!state.pending){var el=await find(s,token);if(el===false){state.index++;persist();continue;}if(!el||!await aim(el,token))return;if(!el.isConnected)continue;if(s.action==='fill'||s.action==='select'){var old=el.value;var record=originals.find(function(o){return o.el===el;});if(!record){record={el:el,value:old,written:old};originals.push(record);}el.focus({preventScroll:true});if(s.action==='select'){if(el.tagName!=='SELECT')throw new Error('Expected a select control: '+s.selector);var match=Array.prototype.slice.call(el.options||[]).find(function(o){return o.value===String(s.value)||o.textContent.trim()===String(s.value);});if(!match)throw new Error(T('Esta opción no está disponible: ','This option is unavailable: ')+s.value);el.value=match.value;record.written=el.value;}else{el.value='';var written=String(s.value);for(var i=0;i<written.length;i++){if(!await delay(24,token))return;el.value=written.slice(0,i+1);record.written=el.value;el.dispatchEvent(new Event('input',{bubbles:true}));}}el.dispatchEvent(new Event('change',{bubbles:true}));}
        if(s.action==='click'||s.action==='stock'||s.action==='dismiss')el.click();if(s.action==='reveal'&&!visible(pageDocument().querySelector(s.value)))el.click();if(s.action==='open'){var acc=el.closest('[data-acc]');if((acc&&!acc.classList.contains('open'))||(!acc&&el.getAttribute('aria-expanded')!=='true'))el.click();}if(s.action==='close'&&el.getAttribute('aria-expanded')==='true')el.click();if(s.action==='details')el.open=true;state.pending=true;}if(!await narrate(s.text,token))return;}
      state.index++;state.pending=false;persist();}
    if(state.index===steps.length){state.active=false;cleanupTarget();restore();persist();paint();}
  }catch(e){if(token===generation)fail(e.message||T('El recorrido se ha detenido.','The walkthrough stopped.'));}}
  D.addEventListener('keydown',function(e){if(e.key==='Escape'&&state.active)control('pause');});
  // /idioma en mitad del recorrido: mismo índice, el marco pasa a /en/… o vuelve, sin reiniciar.
  function aplicarIdioma(l){
    var wasPaused=state.paused;
    cancel();restore();state.pending=false;
    query.set('lang', l === 'en' ? 'en' : 'es');
    D.documentElement.lang = l === 'en' ? 'en' : 'es';
    paint();
    if (!nativeFrame) return getState();
    var cur = '';
    try { cur = nativeFrame.contentWindow && nativeFrame.contentWindow.location ? nativeFrame.contentWindow.location.pathname : ''; } catch (_) {}
    if (!cur || cur === 'blank' || /^about:/.test(cur)) cur=steps[state.index]&&steps[state.index].path;
    if (!cur) return getState();
    var token=generation;
    studioPage(cur,token).then(function(){
      if(token!==generation)return;
      state.paused=wasPaused;persist();paint();
      if(state.active&&!wasPaused)execute();
    }).catch(function(e){if(token===generation)fail(e.message);});
    return getState();
  }
  G.AdmiraDemoControl={control:control,state:getState,idioma:aplicarIdioma,steps:function(){return steps.map(function(s){return Object.assign({},s);});}};
  paint();persist();if(state.active&&!state.paused)execute();

})(window);
