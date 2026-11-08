const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const { chromium } = require('@playwright/test');
const file = path.resolve('src/components/ui/metric-card.tsx');
const compiled = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const component = new Module(file,module);
component.filename=file;
component.paths=Module._nodeModulePaths(path.dirname(file));
component._compile(compiled,file);
const {MetricCard}=component.exports;
const cards = [
  {title:'Chiffre d’affaires',value:'8 420 MAD',hint:'Période sélectionnée',delta:'+12,5 %',onClick:()=>{}},
  {title:'Rendez-vous',value:'48',hint:'Période sélectionnée'},
  {title:'Nouvelles clientes',value:'17',hint:'Période sélectionnée'},
  {title:'Taux d’occupation',value:'76 %',hint:'Capacité disponible',progress:76},
  {title:'Fidélisation',value:'68 %',hint:'Clientes récurrentes'},
  {title:'Remboursements',value:'−240 MAD',hint:'Période sélectionnée',negative:true,alert:true},
];
const markup=renderToStaticMarkup(React.createElement('div',{className:'rb-metric-row'},cards.map((props,index)=>React.createElement(MetricCard,{key:index,...props}))));
const html=`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#fcf7fa;font-family:Arial,sans-serif}*{box-sizing:border-box}button{font-family:inherit}.min-w-0{min-width:0}${fs.readFileSync('src/app/metric-cards.css','utf8')}</style></head><body>${markup}</body></html>`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  for(const width of [1440,390]) {
   const page=await browser.newPage({viewport:{width,height:360}});
   await page.setContent(html);
   const result=await page.evaluate(()=>{
    const row=document.querySelector('.rb-metric-row');
    const cards=[...row.children];
    return {count:cards.length,tops:cards.map(card=>card.getBoundingClientRect().top),overflow:document.documentElement.scrollWidth>innerWidth,scrolls:row.scrollWidth>row.clientWidth,firstBackground:getComputedStyle(cards[0]).backgroundImage,button:cards[0].tagName,negative:document.querySelector('[data-negative]')?.textContent};
   });
   if(result.count!==6||new Set(result.tops).size!==1||result.overflow||!result.firstBackground.includes('gradient')||result.button!=='BUTTON'||!result.negative.includes('240')) throw Error(JSON.stringify(result));
   if(width===390&&!result.scrolls) throw Error('Mobile row must scroll');
   console.log(width+': PASS '+JSON.stringify(result));
   await page.screenshot({path:`.tmp/metric-cards-${width}.png`});
   await page.close();
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
