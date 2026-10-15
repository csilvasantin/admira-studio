// Authenticated, read-only navigation audit. No generation, publication or player control.
// STUDIO_SOURCE_OVERLAY=1 serves only locally changed sources; auth/API stay real.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=process.env.STUDIO_NAV_TEST_URL || 'https://admira.studio';
const exceptions=JSON.parse(fs.readFileSync(path.join(__dirname,'studio-page-exceptions.json')));
function pages(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.name==='.git'?[]:e.isDirectory()?pages(path.join(folder,e.name)):e.name.endsWith('.html')?[path.join(folder,e.name)]:[]);}
function route(file){return '/'+file.replace(/index\.html$/,'');}
async function shell(p,language){
 await p.waitForFunction(language=>{const h=document.querySelector('.pf-topbar');return h&&document.documentElement.lang===language&&h.querySelector('.pix-nav-icon-menu')&&[...h.querySelectorAll('a')].some(a=>new URL(a.href).pathname===(language==='en'?'/en/':'/'));},language,{timeout:8000}).catch(async e=>{console.log('Shell not ready',p.url(),await p.locator('html').getAttribute('lang'),await p.locator('.pf-topbar').evaluateAll(headers=>headers.map(h=>({buttons:[...h.querySelectorAll('button')].map(b=>b.className),links:[...h.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),href:a.href}))}))));throw e;});
 assert.equal(await p.locator('.pf-topbar').count(),1);
 assert.equal(await p.locator('html').getAttribute('lang'),language);
 // Portada sin modo Experto (Carlos, 15-oct-2026): ☰ ▤ y la píldora de idioma, con la caja de ▤.
 // suite/header.js escala sus controles al vuelo; se espera a que la píldora y ▤ midan igual.
 const home=await p.evaluate(()=>/^\/(en\/?)?(index\.html)?$/.test(location.pathname));
 if(home)await p.waitForFunction(()=>{const h=document.querySelector('.pf-topbar'),a=h.querySelector('.pix-nav-icon-advanced'),l=h.querySelector('.pix-nav-icon-lang');if(!a||!l)return false;const x=a.getBoundingClientRect(),y=l.getBoundingClientRect();return Math.abs(x.width-y.width)<.5&&Math.abs(x.height-y.height)<.5;},null,{timeout:8000}).catch(()=>{});
 const data=await p.evaluate(()=>{const h=document.querySelector('.pf-topbar'),box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.width*10)/10,Math.round(r.height*10)/10];};return {links:[...h.querySelectorAll('a')].map(a=>new URL(a.href).pathname),buttons:['menu','advanced','expert'].map(role=>h.querySelectorAll('.pix-nav-icon-'+role).length),lang:h.querySelectorAll('.pix-nav-icon-lang').length,langBox:box(h.querySelector('.pix-nav-icon-lang')),advancedBox:box(h.querySelector('.pix-nav-icon-advanced')),height:h.getBoundingClientRect().height};});
 data.home=home;
 assert(data.links.includes(language==='en'?'/en/':'/'),'Home points to current UI language');
 assert(data.links.includes(language==='en'?'/en/stock.html':'/stock.html'),'Stock points to current UI language');
 if(home){
  assert.deepEqual(data.buttons,[1,1,0],'home has no Expert');
  assert.equal(data.lang,1,'home language pill');
  assert.deepEqual(data.langBox,data.advancedBox,'language pill has the advanced icon box');
 }else assert.deepEqual(data.buttons,[1,1,1]);
 return data;
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const token=cp.execFileSync('bash',['/Users/csilvasantin/Claude/admira-vault/vault-get.sh','ADMIRA_AGENT_LOGIN_TOKEN'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  assert.equal((await context.request.post(base+'/auth/agente',{headers:{Authorization:'Bearer '+token,'X-Agente':'OraculoMacMini'}})).status(),200);
  const changed=new Set(cp.execFileSync('git',['diff','--name-only','HEAD'],{cwd:root,encoding:'utf8'}).trim().split('\n'));
  if(process.env.STUDIO_SOURCE_OVERLAY)await context.route(base+'/**',r=>{
   let file=new URL(r.request().url()).pathname.slice(1);
   if(!file||file.endsWith('/'))file+='index.html';
   else if(!path.extname(file)){file=fs.existsSync(path.join(root,file,'index.html'))?file+'/index.html':file+'.html';}
   if(changed.has(file)&&fs.existsSync(path.join(root,file)))return r.fulfill({body:fs.readFileSync(path.join(root,file)),contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'application/javascript'});
   return r.continue();
  });
  const report={verifiedAt:new Date().toISOString(),origin:base,sourceOverlay:!!process.env.STUDIO_SOURCE_OVERLAY,documents:pages(root).length,rows:[],failures:[],languageTransitions:[]};
  const jobs=process.env.STUDIO_NAV_FOCUS?[]:pages(root).map(f=>path.relative(root,f)).filter(f=>!['screen-output','external-redirect'].includes(exceptions[f]?.kind)).flatMap(file=>['es','en'].map(language=>({file,language})));
  let next=0;
  await Promise.all(Array.from({length:4},async()=>{
   const p=await context.newPage();
   while(next<jobs.length){
    const job=jobs[next++],errors=[];const error=e=>errors.push(e.message);p.on('pageerror',error);
    const record={...job};
    try{
     await p.goto(base+route(job.file)+'?lang='+job.language,{waitUntil:'domcontentloaded',timeout:18000});
     const nav=await shell(p,job.language);await p.waitForTimeout(150);
     const main=p.locator('main').first(),before=await main.boundingBox();
     for(const role of nav.home?['menu','advanced']:['menu','advanced','expert']){
      const button=p.locator('.pf-topbar .pix-nav-icon-'+role);
      await button.click();
      const after=await main.boundingBox();
      assert(Math.abs(before.x-after.x)<2&&Math.abs(before.width-after.width)<2,role+' overlays without moving main');
      await button.click();
     }
     await p.evaluate(()=>window.scrollTo(0,Math.min(1100,document.documentElement.scrollHeight-innerHeight)));
     const top=await p.locator('.pf-topbar').evaluate(h=>h.getBoundingClientRect().top);
     assert(Math.abs(top)<2,'navigation stays visible when document scrolls: '+top);
     assert.deepEqual(errors,[]);
     Object.assign(record,{url:p.url(),header:1,home:true,stock:true,overlay:true,sticky:true,errors});
    }catch(e){record.failure=e.message;record.errors=errors;report.failures.push(record);}
    report.rows.push(record);p.off('pageerror',error);
    fs.writeFileSync('/tmp/oraculo-studio-navigation-browser-proof.json',JSON.stringify(report,null,2));
    if(report.rows.length%20===0)console.log('Audited '+report.rows.length+'/'+jobs.length);
   }
   await p.close();
  }));
  const p=await context.newPage();
  for(const source of ['/creador/?demo=starbucks-six&content=en&probe=navigation&lang=es#navigation-check','/adaptaciones/?probe=navigation&lang=es#navigation-check','/capsulas/?probe=navigation&lang=es#navigation-check']){
   await p.goto(base+source,{waitUntil:'domcontentloaded'});await shell(p,'es');
   for(const language of ['en','es']){
    const input=p.locator('#pf-cli-input.ax-cli-input');await input.waitFor({state:'attached'});
    if(!await input.isVisible())await p.locator('.pf-topbar .pix-nav-icon-expert').click();
    await input.fill('/language '+(language==='en'?'ENG':'ESP'));await input.press('Enter');
    await p.waitForTimeout(500);console.log('CLI',source,language,p.url(),await p.locator('html').getAttribute('lang'));await p.waitForFunction(l=>document.documentElement.lang===l,language);await p.waitForTimeout(800);await shell(p,language);
    const url=new URL(p.url());assert.equal(url.searchParams.get('probe'),'navigation');assert.equal(url.searchParams.get('lang'),language);assert.equal(url.hash,'#navigation-check');
    if(source.includes('starbucks')){assert.equal(url.searchParams.get('demo'),'starbucks-six');assert.equal(url.searchParams.get('content'),'en');}
    report.languageTransitions.push({source,language,url:p.url()});
   }
   if(source.startsWith('/capsulas/')){await p.reload({waitUntil:'domcontentloaded'});await shell(p,'es');}
  }
  // Exercise actual header links after language changes, including mobile navigation.
  for(const width of [1440,390])for(const language of ['es','en'])for(const folder of ['creador/','adaptaciones/']){console.log('Link path',width,language,folder);
   await p.setViewportSize({width,height:1000});await p.goto(base+'/'+(language==='en'?'en/':'')+folder+'?lang='+language);await shell(p,language);
   await p.locator('.pf-topbar-nav a').filter({hasText:'Stock'}).click();await shell(p,language);assert.match(new URL(p.url()).pathname,/\/stock(?:\.html)?$/);
   await p.locator('.pf-topbar-nav a').filter({hasText:language==='en'?'Home':'Inicio'}).click();await shell(p,language);assert.equal(new URL(p.url()).pathname,language==='en'?'/en/':'/');
  }
  for(const width of [1440,390]){await p.setViewportSize({width,height:1000});await p.goto(base+'/?lang=es');await shell(p,'es');for(const language of ['en','es']){await p.locator('.pf-topbar-lang').click();await shell(p,language);assert.equal(new URL(p.url()).searchParams.get('lang'),language);}}
  await p.setViewportSize({width:1440,height:1000});await p.goto(base+'/en/adaptaciones/?lang=en');await shell(p,'en');await p.screenshot({path:'/tmp/oraculo-studio-navigation-final-en.png',fullPage:true});
  await p.goto(base+'/creador/?demo=starbucks-six&content=en&lang=es');await shell(p,'es');await p.screenshot({path:'/tmp/oraculo-studio-navigation-final-es.png',fullPage:true});
  report.completedAt=new Date().toISOString();fs.writeFileSync('/tmp/oraculo-studio-navigation-browser-proof.json',JSON.stringify(report,null,2));
  for(const row of report.failures)console.error(row.file,row.language,row.failure);
  assert.equal(report.failures.length,0,'all navigable Studio documents conform');
  console.log('PASS '+report.rows.length+' document/language visits; six CLI language changes; desktop/mobile Creator and Adapter → Stock → Home');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exit(1)});
