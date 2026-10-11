/* Four complete native ES/EN tours at 1440/390; all writes blocked after authorised login. */
const {chromium}=require('playwright');
const {execFileSync}=require('child_process');const fs=require('fs');
const base=process.env.AUDIT_BASE||'http://127.0.0.1:8577',label=process.env.AUDIT_LABEL||'tour';
const output=process.env.AUDIT_OUTPUT||'/tmp/5774-evidence';fs.mkdirSync(output,{recursive:true});
const token=base.startsWith('https:')?execFileSync('bash',['/Users/csilvasantin/Claude/admira-vault/vault-get.sh','ADMIRA_AGENT_LOGIN_TOKEN'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim():'';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const results=await Promise.all(['es','en'].flatMap(lang=>[1440,390].map(async width=>{
  const c=await browser.newContext({viewport:{width,height:900},locale:lang});
  if(base.startsWith('https:')){const r=await c.request.post(base+'/auth/agente',{headers:{Authorization:'Bearer '+token,'X-Agente':'OraculoMBP16'}});if(r.status()!==200)throw Error('Authorized login status '+r.status());}
  else await c.route('**/auth/session',r=>r.fulfill({json:{ok:true,superusuario:true,clientes:null}}));
  const p=await c.newPage();const row={lang,width,label,mutations:[],blockedPresence:[],errors:[],bad:[],phases:[],failures:[],routes:[]};let phase=0,lastPath='',start=Date.now();
  await c.route('**/*',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){const url=r.request().url();(/\/api\/presence$/.test(url)?row.blockedPresence:row.mutations).push({method:r.request().method(),url});return r.abort('blockedbyclient')}return r.fallback()});
  p.on('pageerror',e=>row.errors.push(e.message));p.on('response',r=>{if(r.status()>=400)row.bad.push({url:r.url(),status:r.status()})});
  await p.goto(base+'/'+(lang==='en'?'en/':'')+'?lang='+lang+'&ax_demo=studio&ax_run='+label+'-'+lang+'-'+width+(base.startsWith('http:')?'&ax_preview=studio':''),{waitUntil:'domcontentloaded',timeout:45000});
  await p.waitForFunction(()=>window.AdmiraDemoControl,{timeout:15000});
  await p.evaluate(()=>AdmiraDemoControl.control('mute'));
  while(Date.now()-start<420000){
   const state=await p.evaluate(()=>AdmiraDemoControl.state());
   if(phase!==state.fase){phase=state.fase;row.phases.push(state);console.log(label,lang,width,'PHASE',phase,state.error);}
   const frame=p.frames().find(f=>f!==p.mainFrame()&&!f.url().startsWith('about:')&&new URL(f.url()).origin===new URL(base).origin);
   if(frame){const path=new URL(frame.url()).pathname;
    if(lastPath!==path){lastPath=path;await p.waitForTimeout(700);
     const info=await frame.evaluate(()=>({path:location.pathname,lang:document.documentElement.lang,text:document.body.innerText.slice(0,18000),width:document.documentElement.scrollWidth,viewport:innerWidth,images:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.currentSrc),links:[...document.querySelectorAll('a[href]')].map(a=>({text:a.textContent.trim(),href:a.href})),accent:getComputedStyle(document.documentElement).getPropertyValue('--green')}));row.routes.push(info);
     await p.screenshot({path:`${output}/${label}-${lang}-${width}-${path.replace(/[^a-z]/gi,'')||'home'}.png`});
    }
   }
   if(process.env.AUDIT_ASSERT_VALUES==='1'&&frame){
    const fields=await frame.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#proj-cliente,#a-personaje,#a-idioma,#a-guion,#m-versiones,#m-style,#m-titulo,#m-letra,#i-prompt,#clip-prompt,#clip-stock')].map(e=>[e.id,e.value])));
    row.phases[row.phases.length-1].fields=fields;
   }
   if(state.error){row.failures.push(state);console.log('FAIL',label,lang,width,state.error);await p.screenshot({path:`${output}/${label}-${lang}-${width}-failure-${phase}.png`});break;}
   if(!state.activo){row.final=state;break;}
   await p.waitForTimeout(800);
  }
  row.final||=await p.evaluate(()=>AdmiraDemoControl.state());row.duration=Date.now()-start;
  await p.screenshot({path:`${output}/${label}-${lang}-${width}-end.png`});
  await c.close();fs.writeFileSync(`${output}/${label}-${lang}-${width}.json`,JSON.stringify(row,null,2));return row;
 })));
 fs.writeFileSync(`${output}/${label}-tour.json`,JSON.stringify(results,null,2));await browser.close();
 {
  const assert=require('node:assert/strict');
  for(const r of results){assert.equal(r.final.activo,false);assert.equal(r.final.fase,27);assert.deepEqual(r.failures,[]);assert.deepEqual(r.errors,[]);assert.deepEqual(r.mutations,[]);assert.equal(r.phases.length,27);assert.equal(r.routes.length,5);assert(r.routes.every(x=>new URL(base).origin===new URL(base+x.path).origin));}
  console.log('PASS: four complete 27-step tours, no skips, no JavaScript errors, five native routes per tour');
 }
})().catch(e=>{console.error(e);process.exit(1)});
