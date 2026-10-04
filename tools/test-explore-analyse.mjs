import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { setLanguage, openTab, startStory } from './mobile-helpers.mjs';
const url=process.argv[2] || 'http://127.0.0.1:5175/';
const out=new URL('../output/explore-release/',import.meta.url);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try {
 for(const [name,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1440,height:900}],['small',{width:320,height:568}]]){
 const p=await browser.newPage({viewport});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('ks_tour_seen','1'));
 await p.goto(url);await p.locator('#loading[hidden]').waitFor({state:'attached',timeout:90000});
 await setLanguage(p,'en');
 const layer=id=>p.evaluate(id=>__map.getLayoutProperty(id,'visibility'),id);
 const mode=async id=>{await p.locator('button[data-mode="'+id+'"]').click();await p.waitForTimeout(200)};
 assert.equal(await p.locator('body').getAttribute('data-mode'),'explore');
 assert.equal(await layer('landcover'),'none'); assert.equal(await layer('corridors'),'none');
 assert.equal(await layer('rivers-main'),'visible');
 assert(await p.locator('[data-basemap="ortho"]').isVisible());
 assert(await p.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 await p.screenshot({path:new URL(name+'-explore.png',out).pathname.replace(/^\/(\w:)/,'$1')});
 await p.locator('[data-basemap="ortho"]').click();assert.equal(await layer('ortho'),'visible');
 await mode('analyse');assert.equal(await layer('ortho'),'none'); assert.equal(await layer('corridors'),'visible');
 await p.waitForFunction(()=>__map.queryRenderedFeatures(undefined,{layers:['corridors']}).length>0);
 assert(await p.locator('[data-view="landcover"]').isVisible());
 await p.screenshot({path:new URL(name+'-analyse.png',out).pathname.replace(/^\/(\w:)/,'$1')});
 await p.locator('[data-view="landcover"]').click(); assert.equal(await layer('corridors'),'none');assert.equal(await layer('landcover'),'visible');
 await mode('explore');assert.equal(await layer('ortho'),'visible');assert.equal(await layer('landcover'),'none');
 await mode('analyse'); assert.equal(await layer('landcover'),'visible');
 await p.locator('[data-view="corridors"]').click();
 await p.locator('[data-free-corridors]').check();
 await p.locator('[data-meander-example]').click();
 assert.equal(await layer('meander-proposal'),'visible');
 await mode('explore');assert.equal(await layer('meander-proposal'),'none');
 await setLanguage(p,'pl');assert.equal(await layer('corridors'),'none'); assert.equal(await layer('meander-proposal'),'none');
 assert.equal(await p.locator('button[data-mode="explore"]').innerText(),'Odkrywaj');
 await setLanguage(p,'en');
 await mode('analyse');assert.equal(await layer('meander-proposal'),'visible');
 await openTab(p,'reports');assert(await p.locator('#panel-reports').isVisible());
 await openTab(p,'about');assert(await p.locator('#panel-about').isVisible());
 await mode('explore');await p.locator('[data-basemap="light"]').click();
 await startStory(p);await p.locator('#tour:not([hidden])').waitFor();
 await mode('explore');assert(await p.locator('#tour').isHidden());
 assert.equal(await layer('corridors'),'none');
 assert.deepEqual(errors,[]);console.log('PASS',name,'mode isolation, themes, remembered basemap, meanders, language, reports/about, story, no page errors');
 await p.close();
 }
}finally{await browser.close()}

