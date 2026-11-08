const fs = require('fs');
const {build} = require('esbuild');
const {chromium} = require('@playwright/test');
const assert = require('node:assert/strict');

(async()=>{
 const bundle=await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {ProfessionnelForm} from './src/components/www/ProfessionnelForm'; createRoot(document.getElementById('app')).render(<ProfessionnelForm />);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,alias:{'@':process.cwd()+'/src'},write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},minify:true});
 const css=fs.readFileSync('.tmp/feedback-preview.css','utf8');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  for(const width of [390,1280]) {
   const page=await browser.newPage({viewport:{width,height:1100}});
   let submitted;
   await page.route('http://signup-preview.test/**',async route=>{
    if(route.request().method()==='POST') {
      const form=await new Response(route.request().postDataBuffer(),{headers:{'Content-Type':route.request().headers()['content-type']}}).formData();
      submitted=Object.fromEntries(form.entries());
      return route.fulfill({json:{ok:true,credentials:{identifier:'0612345678',temporaryPassword:'314159'}}});
    }
    return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css}</style></head><body style="background:#f8f3f5;padding:16px;font-family:Arial,sans-serif"><main id="app" style="max-width:640px;margin:auto;padding:16px;background:white;border-radius:20px"></main><script>${bundle.outputFiles[0].text}</script></body></html>`});
   });
   await page.goto('http://signup-preview.test/');
   assert.equal(await page.locator('input[name=email]').count(),0);
   await page.getByRole('button',{name:'Ville d’implantation'}).click();
   await page.getByRole('button',{name:'Casablanca',exact:true}).waitFor();
   await page.screenshot({path:`.tmp/professional-city-${width}.png`,fullPage:true});
   await page.getByRole('button',{name:'Casablanca',exact:true}).click();
   assert.equal(await page.locator('input[name=ville]').inputValue(),'Casablanca');
   await page.locator('input[name=name]').fill('Sara Amrani');
   await page.locator('input[name=institut]').fill('Institut de test');
   await page.locator('input[name=phone]').fill('0612345678');
   await page.getByRole('checkbox',{name:'Non',exact:true}).check();
   await page.getByRole('button',{name:'Créer mon accès'}).click();
   await page.getByText('Votre compte est prêt',{exact:true}).waitFor();
   await page.getByText('314159',{exact:true}).waitFor();
   assert.equal(submitted.ville,'Casablanca');
   assert.equal(submitted.phone,'0612345678');
   assert.equal('email' in submitted,false);
   const loginHref=await page.getByRole('link',{name:'Se connecter',exact:true}).getAttribute('href');
   assert.ok(loginHref.includes('identifier=0612345678'));
   assert.ok(!loginHref.includes('314159'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`.tmp/professional-access-${width}.png`,fullPage:true});
   console.log(`${width}: PASS styled city dropdown, signup without email, displayed credentials and login link without password`);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
