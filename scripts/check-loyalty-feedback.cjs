const fs = require('fs');
const {build} = require('esbuild');
const {chromium} = require('@playwright/test');
const assert = require('node:assert/strict');

(async()=>{
 const bundle=await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import {LoyaltyCardFeedback} from './src/components/loyalty/loyalty-card-feedback'; createRoot(document.getElementById('app')).render(<LoyaltyCardFeedback token="RBLOY_ABCDEFGH" organizationName="Institut de test" collectProfile={location.search.includes("new=1")} firstName={location.search.includes("new=1") ? "" : "Sara"} lastName={location.search.includes("new=1") ? "" : "Amrani"} phone={location.search.includes("new=1") ? null : "0612345678"} staffOptions={[{id:'staff_a',name:'Lina Amrani'},{id:'staff_b',name:'Nora Idrissi'}]} />);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,alias:{'@':process.cwd()+'/src'},write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},minify:true});
 const css=fs.readFileSync('.tmp/feedback-preview.css','utf8');
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  for(const width of [390,1280]) {
   const page=await browser.newPage({viewport:{width,height:1000}});
   let submitted;
   await page.route('http://loyalty-preview.test/**',route=>{
    if(route.request().method()==='POST') { submitted=route.request().postDataJSON(); return route.fulfill({json:{ok:true}}); }
    return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${css}</style></head><body style="background:#f8f3f5;padding:16px"><main id="app" style="max-width:420px;margin:auto"></main><script>${bundle.outputFiles[0].text}</script></body></html>`});
   });
   await page.goto('http://loyalty-preview.test/');
   await page.locator('fieldset').nth(0).locator('label').nth(3).click();
   assert.equal(await page.getByRole('checkbox').count(),2);
   assert.equal(await page.locator('input[type=search]').count(),0);
   await page.getByText('Lina Amrani',{exact:true}).click();
   await page.getByText('Nora Idrissi',{exact:true}).click();
   await page.getByRole('group',{name:'Votre note pour Nora Idrissi'}).locator('label').nth(4).click();
   assert.equal(await page.getByRole('checkbox',{checked:true}).count(),2);
   await page.getByRole('group',{name:'Votre note pour Lina Amrani'}).locator('label').nth(1).click();
   await page.getByLabel('Écrivez votre avis').fill('Très bon accueil, merci Lina.');
   assert.equal(await page.locator('fieldset').nth(0).getByRole('radio',{checked:true}).inputValue(),'4');
   assert.equal(await page.getByRole('group',{name:'Votre note pour Lina Amrani'}).getByRole('radio',{checked:true}).inputValue(),'2');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:`.tmp/loyalty-feedback-${width}.png`,fullPage:true});
   await page.getByRole('button',{name:'Envoyer mon avis'}).click();
   await page.getByText('Votre avis est enregistré',{exact:false}).waitFor();
   assert.equal(submitted.rating,4);
   assert.deepEqual(submitted.staffRatings,[{staffId:'staff_a',rating:2},{staffId:'staff_b',rating:5}]);

   assert.equal(submitted.comment,'Très bon accueil, merci Lina.');
   console.log(`${width}: PASS all employees visible, multiple selections, independent scores and submission`);
   await page.getByRole('button',{name:'Écrire un autre avis'}).click();
   assert.equal(await page.getByLabel('Écrivez votre avis').inputValue(),'');
   await page.getByLabel('Écrivez votre avis').fill('Un deuxième avis après une autre visite.');
   await page.getByRole('button',{name:'Envoyer mon avis'}).click();
   await page.getByText('Votre avis est enregistré',{exact:false}).waitFor();
   assert.equal(submitted.comment,'Un deuxième avis après une autre visite.');
   assert.equal('rating' in submitted,false);
   assert.equal('staffRatings' in submitted,false);
   console.log(`${width}: PASS a second review can be written and submitted after the first one`);
   await page.goto('http://loyalty-preview.test/?new=1');
   await page.getByLabel('Prénom',{exact:true}).fill('Nadia');
   await page.getByLabel('Nom',{exact:true}).fill('Alaoui');
   await page.getByLabel('Téléphone',{exact:true}).fill('0612345678');
   await page.getByLabel('Écrivez votre avis').fill('Très bonne expérience.');
   await page.getByRole('group',{name:'Votre note pour l’institut'}).locator('label').nth(4).click();
   await page.getByRole('button',{name:'Envoyer mon avis'}).click();
   await page.getByText('Merci Nadia.',{exact:false}).waitFor();
   assert.equal(submitted.firstName,'Nadia');
   assert.equal(submitted.rating,5);
   assert.equal(submitted.comment,'Très bonne expérience.');
   assert.equal('staffId' in submitted,false);
   console.log(`${width}: PASS new customer can enter details and written feedback without a prior registration`);
   await page.goto('http://loyalty-preview.test/?new=1');
   assert.equal(await page.locator('[required]').count(),0);
   await page.getByRole('button',{name:'Envoyer mon avis'}).click();
   await page.getByText('Votre carte est prête.',{exact:false}).waitFor();
   assert.equal('rating' in submitted,false);
   assert.equal(submitted.firstName,'');
   assert.equal(submitted.phone,'');
   await page.goto('http://loyalty-preview.test/?new=1');
   await page.getByLabel('Écrivez votre avis').fill('Merci pour votre accueil.');
   await page.getByRole('button',{name:'Envoyer mon avis'}).click();
   await page.getByText('Votre avis est enregistré',{exact:false}).waitFor();
   assert.equal('rating' in submitted,false);
   assert.equal(submitted.comment,'Merci pour votre accueil.');
   console.log(`${width}: PASS empty form and comment-only feedback without required fields or an invented rating`);
   await page.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
