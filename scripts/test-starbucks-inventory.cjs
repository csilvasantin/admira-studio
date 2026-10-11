/* #5774: real browser checks for Audio spacing, Adapter palette and entrypoints.
 * AUDIT_BASE supports localhost or authorised preview; no provider writes allowed. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const base=process.env.AUDIT_BASE||'http://127.0.0.1:8577';
const out=process.env.AUDIT_OUTPUT||'/tmp/5774-evidence';
const label=process.env.AUDIT_LABEL||'inventory';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const results=[];
 try{for(const lang of ['es','en'])for(const width of [1440,390]){
  const c=await browser.newContext({viewport:{width,height:900}}),writes=[],errors=[];
  if(base.startsWith('https:')){
   const token=execFileSync('bash',['/Users/csilvasantin/Claude/admira-vault/vault-get.sh','ADMIRA_AGENT_LOGIN_TOKEN'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
   const login=await c.request.post(base+'/auth/agente',{headers:{Authorization:'Bearer '+token,'X-Agente':'OraculoMBP16'}});assert.equal(login.status(),200);
  }else await c.route('**/auth/session',r=>r.fulfill({json:{ok:true,superusuario:true,clientes:null}}));
  await c.route('**/*',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){writes.push(r.request().url());return r.abort('blockedbyclient')}return r.fallback()});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  const route=s=>base+'/'+(lang==='en'?'en/':'')+s+'?lang='+lang;
  await p.goto(route('audio.html'));await p.waitForFunction(()=>document.querySelector('.pf-topbar'));
  const audio=await p.evaluate(()=>{
   const rect=e=>e.getBoundingClientRect();
   const person=rect(document.querySelector('#a-personaje')),tone=rect(document.querySelector('label[for="a-tono"]'));
   const rhythm=rect(document.querySelector('#a-ritmo')),script=rect(document.querySelector('label[for="a-guion"]'));
   const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
   const lum=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
   const input=document.querySelector('#a-personaje'),placeholder=getComputedStyle(input,'::placeholder');
   const a=lum(rgb(placeholder.color)),b=lum(rgb(getComputedStyle(input).backgroundColor));
   return {toneGap:tone.top-person.bottom,scriptGap:script.top-rhythm.bottom,placeholderOpacity:placeholder.opacity,placeholderContrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),alt:document.querySelector('.page-gif img').alt,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(audio.toneGap>=14);assert(audio.scriptGap>=14);assert.equal(audio.placeholderOpacity,'1');assert(audio.placeholderContrast>=4.5);assert(!audio.overflow);
  if(lang==='en')assert.equal(audio.alt,'Audio · Matrix letters');
  await p.locator('#a-personaje').evaluate(e=>{e.classList.add('admira-demo-target');e.scrollIntoView({block:'center',behavior:'instant'})});
  await p.waitForTimeout(600);
  await p.screenshot({path:`${out}/${label}-audio-${lang}-${width}.png`});
  await p.goto(route('adaptaciones/').replace('/?','?'));await p.waitForFunction(()=>getComputedStyle(document.body).getPropertyValue('--bg').trim()==='#100910');
  const adapter=await p.evaluate(()=>{const s=getComputedStyle(document.body);return Object.fromEntries(['--bg','--pn','--mu','--ac','--ok','--link','--field','--hover'].map(k=>[k,s.getPropertyValue(k).trim()]))});
  assert.equal(adapter['--ac'],'#FF33CC');assert.equal(adapter['--mu'],'#c9a9c2');assert.equal(adapter['--link'],'#ff9cde');
  await p.screenshot({path:`${out}/${label}-adapter-${lang}-${width}.png`});
  // Existing white-label contract must still override the Studio defaults.
  const branded=await p.evaluate(()=>{const root=document.documentElement;root.dataset.mbMarca='test';root.dataset.mbPlataforma='studio';root.style.setProperty('--mb-fondo','#123456');root.style.setProperty('--mbx-brand','#654321');const s=getComputedStyle(document.body);return {background:s.backgroundColor,accent:s.getPropertyValue('--ac').trim()}});
  assert.equal(branded.background,'rgb(18, 52, 86)');assert.equal(branded.accent,'#654321');
  await p.goto(base+'/demo/studio-preview.html?lang='+lang);await p.waitForSelector('#demos .card');
  assert.equal(await p.locator('html').getAttribute('lang'),lang);assert.equal(await p.locator('#demos .card').count(),5);
  assert.equal(await p.locator('header a[href*="ax_demo=studio"]').count(),2);
  assert.match(await p.locator('h1').innerText(),/Starbucks/);assert.match(await p.locator('#pack-note').innerText(),lang==='en'?/original Spanish/:/originales en español/);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:`${out}/${label}-entry-${lang}-${width}.png`});
  await p.goto(route('video.html'));await p.waitForFunction(()=>document.querySelector('.page-gif img')?.alt==='Video · Matrix cascade'||document.documentElement.lang==='es');
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  results.push({lang,width,audio,adapter,branded,writes,errors});console.log('PASS inventory',lang,width,JSON.stringify(audio));await c.close();
 }}finally{await browser.close()}
 fs.writeFileSync(out+'/'+label+'-inventory.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
