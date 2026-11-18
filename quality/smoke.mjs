import assert from'node:assert/strict';import{chromium}from'playwright';
const base=process.env.QA_BASE_URL;if(!base)throw Error('QA_BASE_URL is required');const target=new URL(base.endsWith('/')?base:base+'/');let serving=false;for(let attempt=0;attempt<40;attempt++){try{const r=await fetch(new URL('en/',target),{signal:AbortSignal.timeout(1000)});if(r.ok){serving=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}if(!serving)throw Error('Reader preview unavailable');const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();const errors=[];
page.on('pageerror',error=>errors.push(error.message));
// Browser smoke never starts model inference, reads external publishers or sends mail.
await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===target.origin?route.continue():route.abort();});
const url=path=>new URL(path,target).href;
try{
 await page.goto(url('en/'));await page.locator('[data-feed-ready=true]').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('india-news-reading-v1')),null);
 const daily=await page.locator('#daily-news li').count();assert.ok(daily<=5,'daily cap exceeded');
 await page.goto(url('en/stories/ganga-cleaning/'));await page.locator('[data-comparison-ready=true]').waitFor();assert.ok(await page.locator('[data-compare-source]').count()>=2);
 await page.locator('[data-compare-leaning="left"]').click();if(await page.locator('[data-compare-count]').innerText()==='0')assert.equal(await page.locator('[data-compare-empty]').isVisible(),true);
 await page.locator('[data-compare-leaning="all"]').click();await page.locator('[data-compare-language]').selectOption('hi');assert.ok(await page.locator('[data-compare-source]:visible').count()>0);
 await page.goto(url('en/my-reading/'));await page.locator('[data-reading-ready=true]').waitFor();await page.locator('[data-reading-enable]').click();await page.locator('[data-reading-empty] a').click();await page.locator('[data-comparison-ready=true]').waitFor();
 await page.goto(url('en/my-reading/'));await page.locator('[data-reading-ready=true]').waitFor();assert.equal(await page.locator('[data-reading-stories]').innerText(),'1');await page.locator('[data-reading-disable]').click();await page.locator('[data-reading-confirm-delete]').click();assert.equal(await page.locator('[data-reading-enable]').isVisible(),true);
 await page.goto(url('en/coverage-desk/'));await page.locator('[data-coverage-ready=true]').waitFor();await page.locator('[name=query]').fill('no-match-'+Date.now());await page.locator('[data-coverage-filters] button[type=submit]').click();assert.equal(await page.locator('.coverage-record').count(),0);await page.locator('[data-coverage-filters] button[type=reset]').click();
 const records=await page.locator('.coverage-record').count();if(records){await page.locator('.coverage-actions a').nth(1).click();await page.waitForFunction(()=>document.querySelector('form[data-hosted-review] [name=url]')?.value?.startsWith('https://'));}
 for(const path of ['hi/my-reading/','hi/stories/ganga-cleaning/','hi/coverage-desk/']){await page.setViewportSize({width:320,height:760});await page.goto(url(path));await page.locator('h1').waitFor();const fit=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);assert.ok(fit,path+' overflows at 320px');}
 assert.deepEqual(errors,[],'browser runtime errors');console.log('Browser smoke passed: consent, comparison, coverage, reviewer prefill, Hindi mobile. No model calls.');
}finally{await context.close();await browser.close();}
