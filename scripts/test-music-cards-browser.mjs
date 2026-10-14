// Read-only source overlay on Studio with its real, approved agent session.
// All content writes and generation requests are blocked. Stock data is a small labelled fixture.
// STUDIO_REVIEW_TOKEN, PLAYWRIGHT_PATH, STUDIO_REVIEW_OUT, STUDIO_REVIEW_INDEX configure the run.
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),out=process.env.STUDIO_REVIEW_OUT||'/tmp/studio-music-card-review';await mkdir(out,{recursive:true});
const token=process.env.STUDIO_REVIEW_TOKEN;if(!token)throw Error('An approved Studio review session is required');
const source=JSON.parse(await readFile(process.env.STUDIO_REVIEW_INDEX,'utf8')),items=source.items;
const suno=items.filter(it=>/^suno(?:$|[-_\s])/i.test(it.motor||''));
const fixture=[suno.find(it=>it.type==='video'),suno.find(it=>it.type==='audio'),suno.find(it=>it.type==='music'&&it.thumbnail),items.find(it=>it.type==='video'&&!/^suno/i.test(it.motor||'')),items.find(it=>it.type==='image'&&!/^suno/i.test(it.motor||'')),items.find(it=>it.type==='locucion')].filter(Boolean);
assert.equal(fixture.length,6);const musicIds=new Set(fixture.slice(0,3).map(it=>it.id));
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,serviceWorkers:'block'});
const checks=[],errors=[],blocked=[],mockGenerations=[];
try{
 const login=await context.request.post('https://admira.studio/auth/agente',{headers:{Authorization:'Bearer '+token,'X-Agente':'OraculoMacMini'}});
 assert.equal(login.status(),200,'Real agent sign-in must succeed');
 const session=await context.request.get('https://admira.studio/auth/session');assert.equal(session.status(),200);assert.equal((await session.json()).ok,true);checks.push('Real Studio session accepted; authentication was not simulated');
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());
  if(u.origin==='https://macmini.tail48b61c.ts.net'&&u.pathname.startsWith('/suno/')){
   const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'content-type'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(u.pathname==='/suno/healthz')return route.fulfill({json:{ok:true,total_credits_left:100,fixture:true},headers});
   if(u.pathname==='/suno/generate'){mockGenerations.push(JSON.parse(req.postData()));return route.fulfill({json:{ids:['review-clip-one','review-clip-two']},headers});}
   if(u.pathname==='/suno/status')return route.fulfill({json:[1,2].map((n)=>({id:n===1?'review-clip-one':'review-clip-two',title:'Fixture music '+n,audio_url:fixture[0].url,video_url:fixture[0].url,status:'complete',metadata:{duration:125}})),headers});
   return route.abort('blockedbyclient');
  }
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){blocked.push(u.origin+u.pathname);return route.abort('blockedbyclient');}
  if(['admira.studio','www.admira.studio'].includes(u.hostname)){
   const local=u.pathname.replace(/^\/en\/assets\//,'/assets/').replace(/^\/en\/app\.js$/,'/app.js');
   if(['/stock.html','/en/stock.html','/musica.html','/en/musica.html','/app.js','/assets/music/cards.mjs','/assets/music/cards.css'].includes(local)){
    let body=await readFile(path.join(root,local));
    if(local.endsWith('.html'))body=Buffer.from(body.toString().replace('</body>','<aside style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#773600;color:white;padding:8px;text-align:center;font:14px system-ui">REVISIÓN · índice de prueba · sin publicar · no se modifica Stock</aside></body>'));
    return route.fulfill({body,contentType:local.endsWith('.html')?'text/html':local.endsWith('.css')?'text/css':'text/javascript'});
   }
   if(local==='/stock-index')return route.fulfill({json:{items:fixture,builtAt:new Date().toISOString()}});
  }
  if(u.pathname==='/stock/index.json'||u.pathname==='/stock/list')return route.fulfill({json:{items:fixture,builtAt:new Date().toISOString()}});
  return route.continue();
 });
 for(const lang of process.env.STUDIO_MUSIC_ONLY==='1'?[]:['es','en']){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`https://admira.studio/${lang==='en'?'en/':''}stock.html?type=music&lang=${lang}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('.stock-card[data-type="music"]').length===3);
  assert.equal(await page.locator('.music-card-tools').count(),3);
  assert.deepEqual(new Set(await page.locator('.stock-card').evaluateAll(cards=>cards.map(c=>c.dataset.id))),musicIds);
  const card=page.locator('.music-card-tools').first();
  await page.screenshot({path:path.join(out,'initial-'+lang+'.png'),fullPage:true});

  await card.locator('[data-format="portrait"]').click();assert.equal(await page.locator('#stockLightbox').isVisible(),false,'format switch does not also open the lightbox');
  assert.equal(await card.getAttribute('data-music-format'),'portrait');
  for(const [format,w,h] of [['landscape',1920,1080],['portrait',1080,1920]]){
   await card.locator(`[data-format="${format}"]`).click();
   const downloadPromise=page.waitForEvent('download');await card.locator('[data-music-action="download"]').click();
   const download=await downloadPromise,file=path.join(out,`${lang}-${format}.png`);await download.saveAs(file);const data=await readFile(file);
   assert.equal(data.readUInt32BE(16),w);assert.equal(data.readUInt32BE(20),h);
   assert.match(download.suggestedFilename(),new RegExp(`${w}x${h}\\.png$`));
   await page.screenshot({path:path.join(out,`stock-${lang}-${format}.png`),fullPage:true});
  }
  checks.push(`${lang}: three legacy Suno media shown as music; both PNG formats download at exact dimensions`);
  for(const format of ['portrait','landscape']){await page.locator('#stockFormatFilter').selectOption(format);await page.waitForFunction(f=>Array.from(document.querySelectorAll('.music-card-tools')).every(e=>e.dataset.musicFormat===f),format);assert.equal(await page.locator('.music-card-tools').count(),3);}
  await page.locator('#stockFormatFilter').selectOption('');
  // The covered track also exports without sending artwork or generated card to Stock.
  const covered=page.locator(`[data-music-id="${fixture[2].id}"]`);const coverDownload=page.waitForEvent('download');await covered.locator('[data-music-action="download"]').click();await (await coverDownload).saveAs(path.join(out,`${lang}-cover.png`));
  for(const type of ['image','video']){
   await page.locator('#stockTypeFilter').selectOption(type);await page.waitForFunction(t=>Array.from(document.querySelectorAll('.stock-card')).every(c=>c.dataset.type===t),type);
   assert.equal(await page.locator('.music-card-tools').count(),0);assert.equal(await page.locator('.stock-card').count(),1);
   assert.ok((await page.locator('.stock-card').getAttribute('data-id'))&&!musicIds.has(await page.locator('.stock-card').getAttribute('data-id')));
  }
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.stock-card').length===1);assert.equal(await page.locator('#stockTypeFilter').inputValue(),'video');
  await page.locator('#stockTypeFilter').selectOption('music');await page.waitForFunction(()=>document.querySelectorAll('.music-card-tools').length===3);
  assert.equal(await page.locator('[data-music-id]').first().getAttribute('data-music-format'),'landscape','orientation choices do not modify the source or persist globally');
  await page.locator('.stock-card [data-act="max"]').first().click();await page.waitForFunction(()=>!document.querySelector('#stockLightbox').hidden);
  assert.equal(await page.locator('#stockLightbox .music-card-tools').count(),1);
  const modal=page.locator('#stockLightbox .music-card-tools');await modal.locator('[data-format=portrait]').click();const md=page.waitForEvent('download');await modal.locator('[data-music-action=download]').click();const mf=path.join(out,`lightbox-${lang}.png`);await (await md).saveAs(mf);assert.equal((await readFile(mf)).readUInt32BE(16),1080);
  checks.push(`${lang}: no music cards or Suno tracks in image/video; filter survives reload; lightbox retains music controls`);
  for(const type of ['image','video']){
   await page.goto(`https://admira.studio/${lang==='en'?'en/':''}stock.html?type=${type}&origen=${fixture[0].id}&lang=${lang}`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.querySelector('#stockEmpty').hidden);
   assert.equal(await page.locator('.music-card-tools').count(),0,'Source deep link cannot bypass music-only filtering');
   assert.equal(await page.locator('.stock-card').count(),0);
  }
  checks.push(`${lang}: source deep links also exclude music from image/video filters`);
  await page.close();
 }
 for(const lang of ['es','en']){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`https://admira.studio/${lang==='en'?'en/':''}musica.html?lang=${lang}`,{waitUntil:'domcontentloaded'});
  await page.screenshot({path:path.join(out,'music-initial-'+lang+'.png'),fullPage:true});
  if(await page.locator('#m-titulo').count())await page.locator('#m-titulo').fill('Fixture music');else await page.locator('#m-letra').fill('Fixture lyrics for review');await page.locator('#playOutput').click();
  await page.waitForFunction(()=>document.querySelectorAll('#player .music-card-tools').length===2,{},{timeout:20000});
  assert.ok((await page.locator('#player [data-publish-meta]').evaluateAll(els=>els.map(e=>JSON.parse(e.dataset.publishMeta).type))).every(t=>t==='music'));
  const first=page.locator('#player .music-card-tools').first();await first.locator('[data-format="portrait"]').click();
  const d=page.waitForEvent('download');await first.locator('[data-music-action="download"]').click();await (await d).saveAs(path.join(out,`generated-${lang}-portrait.png`));
  await page.screenshot({path:path.join(out,`generated-${lang}.png`),fullPage:true});checks.push(`${lang}: mocked generation creates two music cards with both formats and music-only publish metadata, zero provider credits`);
  await page.close();
 }
 assert.equal(mockGenerations.length,2);
 assert.deepEqual(errors,[]);assert.equal(blocked.length,0,'No write should be attempted by the review');
 await writeFile(path.join(out,'proof.json'),JSON.stringify({ok:true,checks,errors,blocked,fixtureIds:fixture.map(it=>it.id),mockGenerations:mockGenerations.length,providerCreditsSpent:0,liveWrites:0,sourceOverlay:true,published:false},null,2));console.log(JSON.stringify({ok:true,checks,liveWrites:0,output:out},null,2));
}finally{await context.close();await browser.close();}
