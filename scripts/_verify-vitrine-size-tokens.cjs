const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 const results=[];
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  for(const route of ['/','/fonctionnalites/','/tarifs/','/professionnel/','/connexion/']){
   const response=await page.goto('http://localhost:3002'+route,{waitUntil:'networkidle'});
   const result=await page.evaluate(()=>{
    const site=document.querySelector('.marketing-site');
    const h1=document.querySelector('main h1');
    const style=site&&getComputedStyle(site);
    const names=style?[...style].filter(n=>/^--vt-(text|size|leading|line)-/.test(n)):[];
    return {title:h1?.textContent,font:h1&&getComputedStyle(h1).fontSize,overflow:document.documentElement.scrollWidth>innerWidth,unresolved:names.filter(n=>!style.getPropertyValue(n).trim())};
   });
   if(response.status()!==200||result.title?.includes('introuvable')||result.overflow||result.unresolved.length)throw new Error(JSON.stringify({route,width,status:response.status(),...result}));
   results.push({route,width,...result});
   console.log(JSON.stringify(results.at(-1)));
   if(['/tarifs/','/professionnel/'].includes(route))await page.screenshot({path:`artifacts/typography/verified-${route.split('/')[1]}-${width}.png`,fullPage:true});
  }
  await page.close();
 }
 fs.writeFileSync('artifacts/typography/centralization-check.json',JSON.stringify(results,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
