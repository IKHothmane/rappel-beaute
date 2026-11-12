const { chromium } = require('playwright');
const fs = require('node:fs');
const paths = ['/', '/fonctionnalites/', '/creation-site-web/', '/tarifs/', '/a-propos/', '/solutions/institut-beaute/', '/gestion-rendez-vous/', '/reservation-en-ligne/', '/gestion-clientes/', '/gestion-stock/', '/caisse/', '/fidelite/', '/whatsapp/', '/professionnel/', '/faq/', '/blog/', '/demo/', '/contact/', '/connexion/', '/confidentialite/', '/mentions-legales/'];
(async () => {
 const browser = await chromium.launch({headless:true, channel:'chrome'});
 fs.mkdirSync('artifacts/typography', {recursive:true});
 const results=[];
 for (const width of [1440,390]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  for(const path of paths){
   const response = await page.goto('http://localhost:3002'+path,{waitUntil:'networkidle'});
   if (response.status() !== 200) throw new Error(`${path}: HTTP ${response.status()}`);
   await page.waitForTimeout(300);
   await page.evaluate(()=>document.fonts.ready);
   const data=await page.evaluate(()=>{
    const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&getComputedStyle(e).visibility!=='hidden';
    const info=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,text:e.textContent.trim().replace(/\s+/g,' ').slice(0,85),font:parseFloat(s.fontSize),line:s.lineHeight,width:Math.round(r.width),height:Math.round(r.height),padding:s.padding,gap:s.gap};};
    const elements=[...document.querySelectorAll('main h1,main h2,main h3,main p,main button,main a,main input,main label')].filter(visible).map(info);
    return {elements,small:elements.filter(e=>e.font<14),short:elements.filter(e=>['BUTTON','INPUT'].includes(e.tag)&&e.height<44),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   results.push({path,width,...data});
   fs.writeFileSync('artifacts/typography/measurements.json',JSON.stringify(results,null,2));
   if(['/','/tarifs/','/creation-site-web/','/professionnel/','/connexion/'].includes(path))await page.screenshot({path:'artifacts/typography/'+(path==='/'?'home':path.split('/')[1])+'-'+width+'.png',fullPage:true});
   console.log(width,path,JSON.stringify({h1:data.elements.filter(e=>e.tag==='H1'),small:data.small.length,short:data.short.length,overflow:data.overflow}));
  }
  await page.close();
 }
 fs.writeFileSync('artifacts/typography/measurements.json',JSON.stringify(results,null,2));
 await browser.close();
})();
