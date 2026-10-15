// Run against a LOCAL static server. Only the local auth/session endpoint is stubbed.
// PLAYWRIGHT_MODULE=/path/to/playwright CLI_TEST_ORIGINS=http://127.0.0.1:8463 node test/expert-cli.browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const origins=(process.env.CLI_TEST_ORIGINS || 'http://127.0.0.1:8463').split(',');
// Portada sin modo Experto (Carlos, 15-oct-2026): ni ⌘ ni consola, aunque la pestaña recuerde ⌘ abierto
// (ax-experto-abierto). La píldora de idioma ocupa su hueco con la caja de ▤ y la Biblioteca queda en el centro.
for(const base of origins)for(const [home,word] of [['/','ENG'],['/en/','ESP']])for(const width of [1440,390]){
 assert(['localhost','127.0.0.1'].includes(new URL(base).hostname), 'Local test origins only');const c=await b.newContext({viewport:{width,height:900}});await c.addInitScript(()=>{try{sessionStorage.setItem('ax-experto-abierto','1');}catch(_){}});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/auth/session',r=>r.fulfill({json:{ok:true}}));await p.goto(base+home,{waitUntil:'domcontentloaded'});
 await p.waitForSelector('.cuad-center .library',{state:'attached'});await p.waitForTimeout(300);
 const seen=await p.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return [r.width,r.height];},pill=document.querySelector('.pf-topbar .pix-nav-icon-lang');return {expert:document.querySelectorAll('.pf-window-expert,.pix-nav-icon-expert').length,cli:document.querySelectorAll('.pf-cli,.rail-bottom').length,suite:!!document.querySelector('script[src*="suite/experto.js"]'),word:pill&&pill.textContent,last:!!pill&&document.querySelector('.pf-topbar-right').lastElementChild===pill,pill:pill&&box(pill),advanced:box(document.querySelector('.pf-topbar .pix-nav-icon-advanced'))};});
 assert.deepEqual({expert:seen.expert,cli:seen.cli,suite:seen.suite,word:seen.word,last:seen.last},{expert:0,cli:0,suite:false,word,last:true});
 assert.deepEqual(seen.pill,seen.advanced,'language pill has the advanced icon box');
 assert.deepEqual(errors,[]);console.log('PASS',base,home,width,'home without Expert, language pill');await c.close();
}
// La consola se prueba en una interior: Stock, en castellano y en inglés.
for(const base of origins)for(const lang of ['/stock.html','/en/stock.html'])for(const width of [1440,390]){
 assert(['localhost','127.0.0.1'].includes(new URL(base).hostname), 'Local test origins only');const c=await b.newContext({viewport:{width,height:900}});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/auth/session',r=>r.fulfill({json:{ok:true}}));await p.goto(base+lang,{waitUntil:'domcontentloaded'});await p.waitForSelector('.pf-cli',{state:'attached'});
 await p.locator('.cc-reject').click({timeout:1000}).catch(()=>{});
 await p.locator('.pf-window-expert').click();const panel=p.locator('.pf-cli'),grip=p.locator('.pf-cli-grip'),input=p.locator('#pf-cli-input');
 assert.equal((await panel.boundingBox()).height,48);
 await input.fill('help');await input.press('Enter');assert.match(await p.locator('.pf-cli-output').innerText(),/open/);
 let box=await grip.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+4);await p.mouse.down();await p.mouse.move(box.x+box.width/2,box.y-70,{steps:5});await p.mouse.up();let height=(await panel.boundingBox()).height;assert(height>260);
 assert.equal(await p.evaluate(()=>Number(localStorage.getItem('pixeria_cli_height'))),height);
 await grip.dblclick();assert.equal((await panel.boundingBox()).height,48);await grip.dblclick();assert.equal((await panel.boundingBox()).height,height);
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForSelector('.pf-cli');assert.equal((await panel.boundingBox()).height,48);await grip.dblclick();assert.equal((await panel.boundingBox()).height,height);
 await input.fill('echo <img src=x onerror=alert(1)>');await input.press('Enter');assert.equal(await p.locator('.pf-cli-output img').count(),0);assert.match(await p.locator('.pf-cli-output').innerText(),/<img/);
 await input.press('ArrowUp');assert.match(await input.inputValue(),/^echo/);await input.fill('clear');await input.press('Enter');assert.equal(await p.locator('.pf-cli-output').innerText(),'');
 await input.fill('unknown');await input.press('Enter');assert.match(await p.locator('.pf-cli-output').innerText(),/help/);
 await grip.focus();await grip.press('Home');assert.equal((await panel.boundingBox()).height,48);await grip.press('ArrowUp');assert.equal((await panel.boundingBox()).height,64);
 const dims=await p.evaluate(()=>{const v=document.querySelector('.pf-cli-viewport'),pan=document.querySelector('.pf-cli');v.scrollTop=v.scrollHeight;return {v:v.getBoundingClientRect().bottom,p:pan.getBoundingClientRect().top,scroll:v.scrollHeight>v.clientHeight,width:document.documentElement.scrollWidth,inner:innerWidth}});assert(dims.v<=dims.p+1);assert(dims.scroll);assert(dims.width<=dims.inner);
 await p.locator('.pf-window-expert').click();assert.equal(await panel.isVisible(),false);await p.locator('.pf-window-expert').click();assert.equal((await panel.boundingBox()).height,48);
 await p.locator('.pf-cli-viewport').evaluate(el=>el.scrollTop=0);await p.screenshot({path:'/tmp/4663-'+(base.endsWith('8464')?'studio':'pixeria')+'-'+(lang.startsWith('/en/')?'en':'root')+'-'+width+'.png'});
 assert.deepEqual(errors,[]);console.log('PASS',base,lang,width,'drag/reload/history/safe-output/keyboard/scroll');await c.close();
}await b.close()})().catch(e=>{console.error(e);process.exit(1)});
