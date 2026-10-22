// Read-only authenticated UI regression. STUDIO_WORKFLOW_OVERLAY=1 serves the
// four changed documents and the Studio-owned presentation assets from this checkout.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.STUDIO_WORKFLOW_SHOTS || '/tmp/studio-workflow-proof';
const overlay = process.env.STUDIO_WORKFLOW_OVERLAY === '1';
const base = 'https://admira.studio';
const pages = new Set(['index.html', 'en/index.html', 'creador/index.html', 'en/creador/index.html']);

(async () => {
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report = {checkedAt:new Date().toISOString(), overlay, checks:[]};
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
    const entry = await context.request.get(base+'/auth/agente', {maxRedirects:0});
    assert.equal(entry.status(),200);
    assert((await entry.text()).includes('ADMIRA_AGENT_LOGIN_TOKEN'));
    let token = cp.execFileSync('bash',['/Users/csilvasantin/Claude/admira-vault/vault-get.sh','ADMIRA_AGENT_LOGIN_TOKEN'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:20000}).trim();
    const login = await context.request.post(base+'/auth/agente',{maxRedirects:0,headers:{Authorization:'Bearer '+token,'X-Agente':'TrinityMBP16'}});
    token = null;
    assert.equal(login.status(),200);
    await context.route('**/*', route => {
      if (!['GET','HEAD','OPTIONS'].includes(route.request().method())) return route.abort();
      const url = new URL(route.request().url());
      let file = url.pathname.slice(1);
      if (!file || file.endsWith('/')) file += 'index.html';
      if (overlay && url.origin === base && (pages.has(file) || file.startsWith('assets/studio-workflow/'))) {
        const full = path.resolve(root,file);
        assert(full.startsWith(root+path.sep));
        const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.mjs') ? 'application/javascript' : 'text/html';
        return route.fulfill({body:fs.readFileSync(full),contentType:type});
      }
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    async function assertControlsFit() {
      const overflow = await page.locator('.studio-creator-toolbar').evaluate(element=>[...element.querySelectorAll('button, summary, select')].filter(e=>{const r=e.getBoundingClientRect();return e.checkVisibility() && r.width && (r.left < -1 || r.right > innerWidth+1);}).map(e=>({id:e.id,text:e.textContent.slice(0,60),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})));
      assert.deepEqual(overflow,[],'visible Creator controls fit the viewport');
    }
    for (const language of ['es','en']) {
      const prefix = language === 'en' ? '/en' : '';
      for (const width of (process.env.STUDIO_WORKFLOW_WIDTHS || '1440,390,320').split(',').map(Number)) {
        await page.setViewportSize({width,height:1000});
        await page.goto(base+prefix+'/?lang='+language,{waitUntil:'domcontentloaded'});
        const hero = page.locator('.hero-actions');
        await hero.waitFor();
        assert.deepEqual(await hero.locator('a').evaluateAll(links=>links.map(a=>a.getAttribute('href'))),[prefix+'/creador/',prefix+'/adaptaciones/',prefix+'/stock.html']);
        assert(!(await page.locator('.hero').innerText()).match(/julio 2026|July 2026/));
        assert.equal(await page.locator('.hero a[href="#radar"]').count(),1);
        assert.equal(await page.locator('.hero a[href="#'+(language==='en'?'method':'metodo')+'"]').count(),1);
        await page.screenshot({path:path.join(out,`home-${language}-${width}.png`)});
        await hero.locator('a').first().click();
        await page.waitForSelector('#campaign-workshop[data-studio-workflow="compact"]');
        await page.waitForFunction(()=>document.querySelector('#campaign-save-status').textContent.includes(document.documentElement.lang==='en'?'Saved in':'Guardado en'));
        await page.waitForSelector('#campaign-pair canvas');
        assert.equal(await page.locator('#campaign-new:visible').count(),1);
        assert.equal(await page.locator('#campaign-edit:visible').count(),1);
        assert.equal(await page.locator('#campaign-demo:visible').count(),0);
        assert.equal(await page.locator('#campaign-save:visible').count(),0);
        const box = await page.locator('#campaign-pair').boundingBox();
        assert(box.y < 850,`preview should appear without a screen of demo controls: ${box.y}`);
        await page.screenshot({path:path.join(out,`creator-${language}-${width}.png`)});
        await assertControlsFit();
        const examples = page.locator('#studio-creator-examples > summary');
        await examples.focus(); await page.keyboard.press('Enter');
        assert(await page.locator('#campaign-starbucks').isVisible());
        assert(await page.locator('#campaign-demo').isVisible());
        assert.equal(await page.locator('#studio-creator-examples a[href*="demo=creador"]').count(),2);
        await assertControlsFit();
        await examples.press('Enter');
        await page.locator('#studio-creator-tools > summary').click();
        assert(await page.locator('#campaign-save').isVisible());
        assert(await page.locator('#campaign-twin').isVisible());
        assert(await page.locator('#campaign-geometry').isVisible());
        await assertControlsFit();
        await page.locator('#studio-creator-tools > summary').click();
        await page.locator('#studio-creator-formats > summary').click();
        assert(await page.locator('#campaign-format-client').isVisible());
        assert(await page.locator('.campaign-content-language input[value="es"]').isVisible());
        await assertControlsFit();
        await page.locator('#studio-creator-formats > summary').click();
        await page.locator('#studio-creator-resume > summary').click();
        assert(await page.locator('#campaign-resume').isVisible());
        assert(await page.locator('#campaign-resume-open').isVisible());
        await assertControlsFit();
        await page.locator('#studio-creator-resume > summary').click();
        await page.locator('#campaign-edit').click();
        const headline = page.locator('.campaign-options [data-field="headline"]');
        await headline.waitFor({state:'visible'});
        const copy = language==='en' ? 'YOUR NEXT CAMPAIGN' : 'TU PRÓXIMA CAMPAÑA';
        await headline.fill(copy); await headline.dispatchEvent('change');
        await page.locator('#campaign-content-done').click();
        await page.waitForFunction(()=>document.querySelector('#campaign-save-status').textContent.includes(document.documentElement.lang==='en'?'Saved in':'Guardado en'));
        await page.reload({waitUntil:'domcontentloaded'});
        await page.waitForSelector('#campaign-workshop[data-studio-workflow="compact"]');
        await page.locator('#campaign-edit').click();
        assert.equal(await page.locator('.campaign-options [data-field="headline"]').inputValue(),copy,'existing recovery preserves edits');
        await page.locator('#campaign-content-done').click();
        assert.equal(await page.locator('#campaign-approve').count(),1);
        assert.equal(await page.locator('#campaign-delivery-prepare').count(),1);
        report.checks.push({language,width,homeActions:true,previewTop:Math.round(box.y),controlsPreserved:true,keyboard:true,recovery:true});
        console.log(`PASS ${language} ${width}px: home actions, compact Creator, controls, keyboard and recovery`);
      }
    }
    await page.goto(base+'/adaptaciones/',{waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('[data-studio-workflow]').count(),0,'Adapter is unchanged');
    assert.deepEqual(errors,[],'no JavaScript errors');
    report.errors = errors;
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
