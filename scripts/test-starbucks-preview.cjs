/* Real DOM checks for #5767. Serve this checkout, then set AUDIT_BASE.
 * npm dependency: playwright; PLAYWRIGHT_CHROMIUM_EXECUTABLE is optional.
 * Local auth is mocked; HTTPS uses the fleet's authorised agent login. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const base=process.env.AUDIT_BASE||'http://127.0.0.1:8577';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 try{for(const lang of ['es','en'])for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}});
  if(base.startsWith('https:')){
   const token=execFileSync('bash',[process.env.AGENT_TOKEN_SCRIPT||'/Users/csilvasantin/Claude/admira-vault/vault-get.sh','ADMIRA_AGENT_LOGIN_TOKEN'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
   const login=await context.request.post(base+'/auth/agente',{headers:{Authorization:'Bearer '+token,'X-Agente':'OraculoMBP16'}});assert.equal(login.status(),200);
  }else await context.route('**/auth/session',r=>r.fulfill({json:{ok:true,superusuario:true,clientes:null}}));
  const page=await context.newPage(),errors=[],providerCalls=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.method()==='POST'&&/xai|creator-ai|suno-queue|stock-publish/.test(r.url()))providerCalls.push(r.url())});
  const path=l=>base+'/'+(l==='en'?'en/':'')+'musica.html?lang='+l;
  await page.goto(path(lang));await page.waitForFunction(()=>document.querySelector('.ax-experto.ax-min'));
  if(lang==='en'){
   assert.equal(await page.locator('#m-tonalidad').inputValue(),'C minor');
   assert.equal(await page.locator('#m-uso').inputValue(),'Menu bed + closing stinger');
   // Shared persisted examples follow the language; user edits survive both routes.
   await page.goto(path('es'));await page.goto(path('en'));
   assert.equal(await page.locator('#m-tonalidad').inputValue(),'C minor');
   await page.locator('#m-uso').fill('Carlos: una pieza personalizada');
   await page.goto(path('es'));await page.goto(path('en'));
   assert.equal(await page.locator('#m-uso').inputValue(),'Carlos: una pieza personalizada');
  }
  const run=`qa-${lang}-${width}-${Date.now()}`;
  await page.evaluate(run=>sessionStorage.setItem('admira-native-demo-v1:studio',JSON.stringify({run,index:7,active:true,muted:true,voice:false})),run);
  await page.goto(base+'/'+(lang==='en'?'en/':'')+'?lang='+lang+'&ax_demo=studio&ax_run='+run+(base.startsWith('http:')?'&ax_preview=studio':''));
  await page.waitForFunction(()=>window.AdmiraDemoControl?.state().fase===9,{timeout:30000});
  await page.evaluate(()=>AdmiraDemoControl.control('pause'));
  await page.waitForFunction(()=>document.querySelector('.ax-experto.ax-min'));
  await page.waitForTimeout(500);
  let frame=page.frames().find(f=>/musica/.test(f.url()));assert(frame);
  const spacing=await frame.evaluate(()=>{
   const rect=e=>e.getBoundingClientRect(),label=document.querySelector('label[for="m-letra"]'),button=document.querySelector('#genLyrics');
   const previous=document.querySelector('#m-uso')||document.querySelector('#m-titulo');
   const l=rect(label),b=rect(button),p=rect(previous);
   const use=document.querySelector('label[for="m-uso"]'),title=document.querySelector('#m-titulo');
   return {lyricsGap:l.top-p.bottom,buttonGap:b.left-l.right,centerDelta:Math.abs((l.top+l.bottom-b.top-b.bottom)/2),useGap:use?rect(use).top-rect(title).bottom:null,accent:getComputedStyle(document.querySelector('.pix-nav-icon')).color,chip:document.querySelector('.chip.active')?getComputedStyle(document.querySelector('.chip.active')).color:null};
  });
  assert(spacing.lyricsGap>=8);assert(spacing.buttonGap>=8);assert(spacing.centerDelta<1);
  if(spacing.useGap!==null)assert(spacing.useGap>=8);assert.equal(spacing.accent,'rgb(255, 51, 204)');
  if(spacing.chip)assert.equal(spacing.chip,'rgb(255, 51, 204)');
  async function stage(){return page.evaluate(()=>{
   let p=document.querySelector('#admira-native-demo').getBoundingClientRect(),d=document.querySelector('.ax-experto').getBoundingClientRect(),f=document.querySelector('#admira-native-studio'),doc=f.contentDocument;
   let buttons=[...document.querySelectorAll('#admira-native-demo button')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().top);
   return {height:innerHeight-p.top,panelBottom:p.bottom,dockTop:d.top,dockHeight:d.height,pad:parseFloat(getComputedStyle(doc.body).paddingBottom),buttons,expertOnTop:!!document.elementFromPoint(50,d.top+20)?.closest('.ax-experto')};
  })}
  const closed=await stage();console.log('MEASURE',lang,width,JSON.stringify(closed));assert(closed.height<180);assert(closed.panelBottom<=closed.dockTop+1);assert(closed.pad>=closed.height);assert(closed.expertOnTop);assert(Math.max(...closed.buttons)-Math.min(...closed.buttons)<1);
  if(width===390){
   const more=page.locator('#admira-native-demo summary');assert(await more.isVisible());
   await more.click();assert(await page.getByRole('button',{name:lang==='en'?'Return control':'Devolver control',exact:true}).isVisible());await more.click();
   const nav=page.locator('.pf-topbar .pf-nav-more');assert(await nav.isVisible());
   await nav.click();await page.waitForTimeout(500);assert(await page.locator('.pf-topbar .pf-topbar-nav').evaluate(e=>e.scrollLeft>0));
  }
  await page.locator('.pf-window-expert').click();await page.waitForTimeout(600);
  const opened=await stage();assert(opened.panelBottom<=opened.dockTop+1);assert(opened.pad>=opened.height);
  // At the end of the content, the footer can scroll above the guide.
  await frame.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const footer=await frame.locator('footer').boundingBox();if(footer)assert(footer.y+footer.height<=900-opened.height+2);
  await page.locator('.pf-window-expert').click();await page.waitForTimeout(400);
  await page.evaluate(l=>AdmiraDemoControl.idioma(l),lang==='en'?'es':'en');await page.waitForTimeout(1400);
  assert.equal(await page.evaluate(()=>AdmiraDemoControl.state().fase),9);assert(await page.evaluate(()=>AdmiraDemoControl.state().pausado));
  frame=page.frames().find(f=>/musica/.test(f.url()));assert.equal(await frame.locator('html').getAttribute('lang'),lang==='en'?'es':'en');
  await page.evaluate(()=>AdmiraDemoControl.control('stop'));assert.equal(await page.locator('#admira-native-demo').count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(providerCalls,[]);
  console.log('PASS',lang,width,JSON.stringify({spacing,closed,opened}));await context.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
