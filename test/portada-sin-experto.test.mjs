// Portada sin modo Experto (Carlos, 15-oct-2026): en / y /en/ la barra lleva ☰ y ▤ y, en el
// hueco de ⌘, la píldora de idioma (ENG/ESP) con la misma caja que los iconos. Las interiores
// conservan ⌘. Se ejecuta cuadratura.js y expert-cli.js de verdad sobre un DOM mínimo.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ORIGIN='https://www.admira.studio';

class El{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attrs={};this.cls=new Set();this.parentNode=null;this.textContent='';this.style={setProperty(){}};}
 get className(){return [...this.cls].join(' ');}
 set className(v){this.cls=new Set(String(v).split(/\s+/).filter(Boolean));}
 get classList(){const s=this.cls;return {add:(...c)=>c.forEach(x=>s.add(x)),remove:(...c)=>c.forEach(x=>s.delete(x)),contains:c=>s.has(c),toggle:(c,f)=>{const on=f===undefined?!s.has(c):!!f;if(on)s.add(c);else s.delete(c);return on;}};}
 set href(v){this.rawHref=String(v);}
 get href(){return new URL(this.rawHref||'',ORIGIN+'/').href;}
 get pathname(){return new URL(this.rawHref||'',ORIGIN+'/').pathname;}
 setAttribute(k,v){this.attrs[k]=String(v);}
 getAttribute(k){return k in this.attrs?this.attrs[k]:null;}
 hasAttribute(k){return k in this.attrs;}
 appendChild(c){c.remove();c.parentNode=this;this.children.push(c);return c;}
 insertBefore(c,ref){c.remove();c.parentNode=this;const i=ref?this.children.indexOf(ref):-1;if(i<0)this.children.push(c);else this.children.splice(i,0,c);return c;}
 remove(){if(!this.parentNode)return;const k=this.parentNode.children;k.splice(k.indexOf(this),1);this.parentNode=null;}
 get firstChild(){return this.children[0]||null;}
 addEventListener(){}
 querySelector(){return null;}
 matches(sel){return sel.split(',').some(s=>s.trim().startsWith('.')&&this.cls.has(s.trim().slice(1)));}
 replaceChildren(){throw new Error('consola montada');}
}
const el=(tag,cls,text)=>{const e=new El(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};

// Réplica mínima de la cuadratura artesanal de index.html / en/index.html.
function page(pathname,{lang='es',word='ENG',target='/en/',label='Cambiar a inglés',open=false}={}){
 const body=el('body','pf-left-off pf-right-off pf-bottom-off'),cuad=el('div','cuad'),center=el('div','cuad-center');
 const left=el('aside','rail rail-left'),right=el('aside','rail rail-right'),bottom=el('div','rows rail-bottom');
 bottom.appendChild(el('div','rail-hd','🧪 Experto'));bottom.appendChild(el('section','library band','Biblioteca'));bottom.appendChild(el('div','rail-meta','Live'));
 [left,center,right,bottom].forEach(r=>cuad.appendChild(r));body.appendChild(cuad);
 const source=el('a','lang-toggle',word);source.setAttribute('href',target);source.setAttribute('aria-label',label);
 const fixed={'.cuad':cuad,'.cuad-center':center,'.rail-left':left,'.rail-right':right,'.rail-bottom':bottom,'.rail-bottom,.quad-bottom,#pixNavExpertLayer':bottom};
 const documentElement=el('html');documentElement.lang=lang;
 const document={readyState:'interactive',body,documentElement,createElement:t=>new El(t),getElementById:()=>null,addEventListener(){},
  querySelector(sel){
   if(sel==='.pf-topbar')return body.children.find(c=>c.classList.contains('pf-topbar'))||null;
   if(sel.startsWith('.language-switcher a'))return source;
   return fixed[sel]&&fixed[sel].parentNode?fixed[sel]:null;
  }};
 const store=open?{'ax-experto-abierto':'1'}:{};
 const context=vm.createContext({document,location:{pathname,href:ORIGIN+pathname},URL,
  localStorage:{getItem:()=>null,setItem(){}},sessionStorage:{getItem:k=>store[k]??null,setItem(k,v){store[k]=v;}},
  window:{innerHeight:900,innerWidth:1440},getComputedStyle:()=>({getPropertyValue:()=>''})});
 return {context,document,body,center,bottom,run:file=>vm.runInContext(read(file),context)};
}
function topbar(pathname,options){
 const p=page(pathname,options);p.run('assets/cuadratura.js');
 const bar=p.body.children.find(c=>c.classList.contains('pf-topbar'));
 assert.ok(bar,'hay barra en '+pathname);
 const right=bar.children.find(c=>c.classList.contains('pf-topbar-right'));
 return {...p,bar,right,all:[...bar.children.flatMap(c=>c.children)]};
}

test('portada ES y EN: ☰ ▤ y la píldora de idioma en el hueco de ⌘, sin botón Experto',()=>{
 const cases=[['/','es','ENG','/en/','Cambiar a inglés'],['/index.html','es','ENG','/en/','Cambiar a inglés'],
  ['/en/','en','ESP','/','Switch to Spanish'],['/en','en','ESP','/','Switch to Spanish'],['/en/index.html','en','ESP','/','Switch to Spanish']];
 for(const [path,lang,word,target,label] of cases){
  const {right,all}=topbar(path,{lang,word,target,label});
  assert.deepEqual(right.children.map(c=>c.tagName),['BUTTON','A'],path);
  const [advanced,pill]=right.children;
  assert.ok(advanced.classList.contains('pf-window-advanced'),path+': ▤ primero');
  for(const cls of ['pf-topbar-lang','pix-nav-icon','pix-nav-icon-lang'])assert.ok(pill.classList.contains(cls),path+': '+cls);
  assert.equal(pill.hasAttribute('data-admira-compact-control'),true,path+': misma escala que sus vecinos (suite/header.js)');
  assert.equal(pill.textContent,word);assert.equal(pill.getAttribute('href'),null);assert.equal(pill.rawHref,target);
  assert.equal(pill.getAttribute('aria-label'),label);assert.equal(pill.title,label);
  assert.equal(all.filter(c=>c.classList.contains('pf-window-expert')||c.classList.contains('pix-nav-icon-expert')).length,0,path+': sin ⌘');
  assert.equal(all.filter(c=>c.classList.contains('pf-window-left')).length,1,path+': ☰ sigue');
 }
});

test('interiores: ⌘ sigue montado después de ▤ y el idioma no se convierte en icono',()=>{
 for(const path of ['/stock.html','/en/stock.html','/_cuadopen.html','/en/_cuadopen.html','/creador/','/english.html','/en/index.htm']){
  const {right}=topbar(path);
  assert.deepEqual(right.children.map(c=>c.className.split(' ')[0]),['pf-topbar-lang','pf-ico','pf-ico'],path);
  assert.ok(right.children[1].classList.contains('pf-window-advanced'),path);
  assert.ok(right.children[2].classList.contains('pf-window-expert'),path+': ⌘ presente');
  assert.equal(right.children[0].classList.contains('pix-nav-icon-lang'),false,path);
  assert.equal(right.children[0].hasAttribute('data-admira-compact-control'),false,path);
 }
});

test('la portada conserva la barra aunque ⌘ no se monte (sigue haciendo falta .rail-bottom)',()=>{
 const src=read('assets/cuadratura.js');
 assert.match(src,/var bottomToggle = makeToggle\(PANELS\[2\]\);\s*if \(!leftToggle \|\| !rightToggle \|\| !bottomToggle\) return;/);
 for(const file of ['index.html','en/index.html']){
  const html=read(file);
  assert.match(html,/class="rows rail-bottom"/,file);
  assert.match(html,/class="language-switcher"[\s\S]*?<a class="lang-toggle"[^>]*>(ENG|ESP)<\/a>/,file);
 }
});

test('expert-cli.js en la portada: lleva Biblioteca al centro, quita la franja y no abre consola aunque la pestaña la recuerde',()=>{
 for(const path of ['/','/en/']){
  const p=page(path,{open:true});
  p.run('assets/expert-cli.js');
  assert.deepEqual(p.center.children.map(c=>c.className),['library band','rail-meta'],path);
  assert.equal(p.bottom.parentNode,null,path+': sin franja Experto');
  assert.ok(p.body.classList.contains('pf-bottom-off'),path+': no se reabre');
  assert.equal(p.body.classList.contains('pf-cli-open'),false,path);
 }
 // En una interior sigue hasta montar la consola (replaceChildren del DOM mínimo lo delata).
 const p=page('/stock.html',{open:true});
 assert.throws(()=>p.run('assets/expert-cli.js'),/consola montada/);
});

test('site-nav.js: en la portada carga expert-cli.js pero no la piel de la suite ni re-añade ⌘',()=>{
 const src=read('assets/site-nav.js');
 const boot=src.slice(src.indexOf("if (!document.querySelector('.rail-bottom,.quad-bottom,#pixNavExpertLayer')) return;"));
 const guard=boot.indexOf('if (isHome()) { document.body.appendChild(cli); return; }');
 assert.ok(guard>0,'guarda de portada');
 assert.ok(guard<boot.indexOf("'/assets/expert-cli.css'"),'sin CSS de consola en la portada');
 assert.ok(guard<boot.indexOf('suite/experto.js'),'sin piel de la suite en la portada');
 assert.ok(boot.indexOf("cli.src = '/assets/expert-cli.js'")<guard,'expert-cli.js sí se carga');
 assert.match(src,/if \(expert\) \{\s*expert\.classList\.add\('pix-nav-icon', 'pix-nav-icon-expert'\);/,'upgradeFrameControls tolera la falta de ⌘');
 assert.match(src,/'\.pix-nav-icon\{zoom:\.9;width:42px;height:42px;[^']*flex:0 0 42px/,'caja de los iconos');
});

test('cuadratura.css: la píldora solo pone el texto; la caja es la de .pix-nav-icon',()=>{
 const css=read('assets/cuadratura.css');
 const at=css.indexOf('body .pf-topbar .pix-nav-icon-lang{'),reset=css.indexOf('body .pf-topbar .pix-nav-icon{');
 assert.ok(at>0&&reset>0&&at>reset,'va después del reset de font de los iconos');
 const body=css.slice(at,css.indexOf('}',at));
 for(const decl of ['font-size:11px','font-weight:800','letter-spacing:.06em','text-decoration:none','color:inherit','box-sizing:border-box'])assert.ok(body.includes(decl),decl);
 assert.doesNotMatch(body,/(^|[;{\s])(width|height|min-width|min-height|padding|flex|zoom)\s*:/,'sin caja propia');
});
