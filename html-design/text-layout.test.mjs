import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { browserOptions, exportDocument } from './export.mjs';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
let browser, editor, measurement;
const fixture = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>文字适配实验</title><style>
body{margin:0}[data-stage]{display:flex}[data-artboard]{position:relative;width:1000px;height:650px;box-sizing:border-box;background:white;padding:50px}
[data-el]{position:absolute;box-sizing:border-box;font:32px/40px Arial,"PingFang SC",sans-serif;overflow-wrap:break-word;word-spacing:normal;width:310px;height:84px;padding:2px;border:1px solid transparent;overflow:hidden;margin:0}
#plain{left:60px;top:90px}#rich{left:450px;top:90px}#cjk{left:60px;top:280px}#spaces{left:450px;top:280px;word-spacing:5px}#rich span{font-size:20px;line-height:26px;color:red}
</style></head><body><main data-stage><section data-artboard="p1" data-title="实验" data-mode="flow"><p id="plain" data-el="p1-plain">Design is how it works. This paragraph intentionally needs several lines in its small text box.</p><p id="rich" data-el="p1-rich">Big title <span>small words remain proportionally smaller when fitting this rich paragraph</span> to its frame.</p><p id="cjk" data-el="p1-cjk">人与 AI 共用同一份设计文件。中文标点、英文 Canvas 与数字 2026 都需要正确换行。</p><p id="spaces" data-el="p1-spaces">Special word spacing needs actual browser measurement instead of assuming normal text.</p></section></main></body></html>`;
before(async()=>{
 editor = await readFile('html-design/editor.js','utf8');
 const result=await build({entryPoints:['html-design/src/text-layout.js'],bundle:true,write:false,format:'iife',globalName:'TextLayoutModule'});
 measurement=result.outputFiles[0].text;
 browser=await chromium.launch(browserOptions());
});
after(async()=>browser?.close());
async function open(edit=false,html=fixture){
 const p=await browser.newPage({viewport:{width:1440,height:1000}});
 p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));
 await p.setContent(html.replace(/<script data-editor>[\s\S]*?<\/script>/g,''));
 if(edit){await p.addScriptTag({content:editor});await p.locator('[data-act=edit]').click();}
 await p.addScriptTag({content:measurement});
 await p.evaluate(()=>{const host=document.createElement('div');document.documentElement.append(host);window.measurement=TextLayoutModule.createTextLayout({ui:host.attachShadow({mode:'open'})});});
 return p;
}
const inspect=(p,id)=>p.evaluate(id=>measurement.inspect(document.getElementById(id)),id);
async function panel(p,id){await p.locator('#'+id).click();await p.locator('[data-act=element-more]').click();await p.locator('[data-act=text-layout]').click();await p.waitForFunction(()=>document.querySelector('html-design-editor').shadowRoot.querySelector('.text-layout-status').dataset.engine);}

test('Pretext validates English and CJK against browser; rich text and word spacing fall back without changing DOM',async()=>{
 const p=await open();try{
  const initial=await p.locator('[data-stage]').evaluate(n=>n.outerHTML);
  for(const id of ['plain','cjk']){const r=await inspect(p,id);assert.equal(r.engine,'pretext');assert.ok(r.lineCount>2);assert.ok(r.overflow);}
  for(const id of ['rich','spaces']){const r=await inspect(p,id);assert.equal(r.engine,'browser');assert.ok(r.overflow);assert.ok(r.adaptable);}
  assert.equal(await p.locator('[data-stage]').evaluate(n=>n.outerHTML),initial);
  assert.equal(await p.locator('[data-pretext-probe]').count(),0);
  await p.locator('#plain').evaluate(n=>n.textContent='Short');assert.equal((await inspect(p,'plain')).overflow,false);
  await p.locator('#plain').evaluate(n=>n.style.width='80px');assert.ok((await inspect(p,'plain')).requiredHeight>0);
  await p.locator('#plain').evaluate(n=>{n.textContent='One\nTwo\nThree';n.style.whiteSpace='pre-wrap';n.style.width='310px'});
  assert.equal((await inspect(p,'plain')).lineCount,3);
  assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});

test('height and font fitting are zoom invariant, preserve rich-text HTML, and each undo as one operation',async()=>{
 const results=[];
 for(const zoom of [.5,1,2]){
  const p=await open(true);try{
   await p.setViewportSize({width:2600,height:1600});
   await p.locator('[data-act=zoom-reset]').click();
   const count=zoom===.5?4:zoom===2?5:0;
   for(let i=0;i<count;i++)await p.locator(`[data-act=${zoom<1?'zoom-out':'zoom-in'}]`).click();
   assert.equal(await p.locator('.zv').textContent(),`${zoom*100}%`);
   await panel(p,'plain');const before=await p.locator('#plain').getAttribute('style');
   await p.locator('[data-act=text-height]').click();
   await p.waitForFunction(()=>parseFloat(document.querySelector('#plain').style.height)>100);
   const height=await p.locator('#plain').evaluate(n=>parseFloat(n.style.height));
   assert.equal((await inspect(p,'plain')).overflow,false);
   await p.locator('[data-act=undo]').click();assert.equal(await p.locator('#plain').getAttribute('style'),before);
   await panel(p,'rich');
   const richBefore=await p.locator('#rich').evaluate(n=>({html:n.innerHTML,style:n.getAttribute('style'),child:n.querySelector('span').getAttribute('style')}));
   await p.locator('[data-act=text-fit]').click();
   await p.waitForFunction(()=>parseFloat(document.querySelector('#rich').style.fontSize)<32);
   const rich=await p.locator('#rich').evaluate(n=>({font:parseFloat(n.style.fontSize),small:parseFloat(n.querySelector('span').style.fontSize),text:n.textContent}));
   assert.ok(Math.abs(rich.small/rich.font-20/32)<.001);assert.equal((await inspect(p,'rich')).overflow,false);
   await p.locator('[data-act=undo]').click();
   assert.deepEqual(await p.locator('#rich').evaluate(n=>({html:n.innerHTML,style:n.getAttribute('style'),child:n.querySelector('span').getAttribute('style')})),richBefore);
   results.push({height,font:rich.font});assert.deepEqual(p.errors,[]);
  }finally{await p.close();}
 }
 assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});

test('font fit saves and reopens without measurement state or network dependencies',async()=>{
 const p=await open(true);let saved;try{
  await panel(p,'plain');await p.locator('[data-act=text-fit]').click();
  await p.waitForFunction(()=>parseFloat(document.querySelector('#plain').style.fontSize)<32);
  await panel(p,'rich');await p.locator('[data-act=text-fit]').click();
  await p.waitForFunction(()=>parseFloat(document.querySelector('#rich').style.fontSize)<32);
  const rich=await p.locator('#rich').evaluate(n=>({html:n.innerHTML,text:n.textContent,font:n.style.fontSize}));
  await p.locator('[data-act=export]').click();
  const downloading=p.waitForEvent('download');await p.locator('[data-act=download]').click();const file=await downloading;
  saved=await readFile(await file.path(),'utf8');
  const pptx=await exportDocument({html:saved,format:'pptx',baseUrl:'http://127.0.0.1/',title:'Adapted text'});
  const zip=await JSZip.loadAsync(pptx.bytes);const xml=await zip.file('ppt/slides/slide1.xml').async('string');
  const shape=xml.split('<p:sp>').find(s=>s.includes('name="p1-plain"'));
  assert.ok(shape);assert.match(shape,/<a:t>Design/);
  const size=Number(shape.match(/<a:rPr[^>]*sz="(\d+)"/)[1]);assert.ok(size<2400 && size>=450);
  const richShape=xml.split('<p:sp>').find(s=>s.includes('name="p1-rich"'));
  assert.match(richShape,/FF0000/);assert.match(richShape,/wrap="square"/);
  assert.ok(new Set([...richShape.matchAll(/<a:rPr[^>]*sz="(\d+)"/g)].map(m=>m[1])).size>1);
  const pdf=await exportDocument({html:saved,format:'pdf',baseUrl:'http://127.0.0.1/',title:'Adapted text'});
  assert.equal((await PDFDocument.load(pdf.bytes)).getPageCount(),1);
  // Check the saved DOM, not the bundled source's strings.
  const q=await browser.newPage();try{await q.route('**/*',r=>r.abort());await q.setContent(saved);await q.waitForSelector('html-design-editor',{state:'attached'});
   assert.equal(await q.locator('html').getAttribute('data-editing'),null);
   assert.equal(await q.locator('[data-stage] [data-pretext-probe]').count(),0);
   assert.equal(await q.locator('[data-stage] .text-layout-status').count(),0);
   assert.equal(await q.locator('[data-stage] [contenteditable]').count(),0);
   assert.equal((await q.locator('#plain').evaluate(n=>n.style.fontSize)),await p.locator('#plain').evaluate(n=>n.style.fontSize));
   assert.deepEqual(await q.locator('#rich').evaluate(n=>({html:n.innerHTML,text:n.textContent,font:n.style.fontSize})),rich);
   await q.locator('[data-act=edit]').click();await panel(q,'plain');assert.equal(await q.locator('.text-layout-status').getAttribute('data-engine'),'pretext');
  }finally{await q.close();}
 }finally{await p.close();}
});

test('real Flex siblings reflow during a side resize and survive undo, save/reopen and editable PPTX export',async()=>{
 const demo=await readFile('demos/flex-text-layout.html','utf8');
 const p=await open(true,demo);
 const geometry=()=>p.locator('.comparison').evaluate(row=>({display:getComputedStyle(row).display,gap:parseFloat(getComputedStyle(row).gap),width:row.getBoundingClientRect().width,children:[...row.children].map(n=>({x:n.offsetLeft,w:n.offsetWidth,h:n.offsetHeight,position:getComputedStyle(n).position,font:getComputedStyle(n).fontSize}))}));
 try{
  const initial=await geometry();assert.equal(initial.display,'flex');assert.ok(initial.children.every(n=>n.position==='static'));
  const beforeMeasure=await p.locator('[data-stage]').evaluate(n=>n.outerHTML);
  const leftReport=await inspect(p,'flex-left');assert.equal(leftReport.engine,'pretext');assert.equal((await inspect(p,'flex-right')).engine,'browser');
  assert.equal(await p.locator('[data-stage]').evaluate(n=>n.outerHTML),beforeMeasure);
  await p.locator('#flex-left').click();
  const handle=await p.locator('[data-h=e]').boundingBox();
  const zoom=await p.locator('[data-artboard]').evaluate(n=>n.getBoundingClientRect().width/n.offsetWidth);
  await p.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await p.mouse.down();
  await p.mouse.move(handle.x+handle.width/2+96*zoom,handle.y+handle.height/2,{steps:8});await p.mouse.up();
  const resized=await geometry();
  assert.ok(Math.abs(resized.children[0].w-initial.children[0].w-96)<=1);
  assert.ok(Math.abs(initial.children[1].w-resized.children[1].w-96)<=1);
  assert.ok(Math.abs(resized.children[1].x-initial.children[1].x-96)<=1);
  assert.ok(resized.children[1].h>=initial.children[1].h);assert.equal(resized.children[0].font,initial.children[0].font);
  assert.ok((await inspect(p,'flex-left')).requiredHeight<leftReport.requiredHeight,'wider text needs fewer lines without font scaling');
  assert.ok(resized.children.every(n=>n.position==='static'));
  await p.locator('[data-act=undo]').click();assert.deepEqual(await geometry(),initial);
  await p.locator('[data-act=redo]').click();assert.deepEqual(await geometry(),resized);
  await p.locator('[data-act=export]').click();const downloading=p.waitForEvent('download');await p.locator('[data-act=download]').click();
  const saved=await readFile(await (await downloading).path(),'utf8');
  const q=await browser.newPage({viewport:{width:1440,height:1000}});
  try{await q.setContent(saved);await q.waitForSelector('html-design-editor',{state:'attached'});
   const widths=await q.locator('.comparison p').evaluateAll(nodes=>nodes.map(n=>({w:n.offsetWidth,position:getComputedStyle(n).position})));
   assert.deepEqual(widths,resized.children.map(n=>({w:n.w,position:n.position})));
   assert.equal(await q.locator('[data-stage] [data-pretext-probe]').count(),0);
  }finally{await q.close();}
  const {bytes}=await exportDocument({html:saved,format:'pptx',baseUrl:'http://127.0.0.1/',title:'Flex reflow'});
  const xml=await (await JSZip.loadAsync(bytes)).file('ppt/slides/slide1.xml').async('string');
  for(const name of ['flex-left','flex-right']){const shape=xml.split('<p:sp>').find(s=>s.includes(`name="${name}"`)&&s.includes('<p:txBody>'));assert.ok(shape);assert.match(shape,/wrap="square"/);assert.equal([...shape.matchAll(/<a:p>/g)].length,1);}
  assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});

test('a failed web font leaves text untouched and removing that font restores rich-text browser measurement',async()=>{
 const p=await open();try{
  await p.route('**/missing-font.woff2',r=>r.abort());
  const sheet=await p.addStyleTag({content:'@font-face{font-family:MissingDemoFont;src:url(http://127.0.0.1:1/missing-font.woff2)}#rich{font-family:MissingDemoFont,Arial}'});
  const before=await p.locator('#rich').evaluate(n=>n.outerHTML);
  await assert.rejects(inspect(p,'rich'));
  await assert.rejects(p.evaluate(()=>measurement.plan(document.querySelector('#rich'),'fit')));
  assert.equal(await p.locator('#rich').evaluate(n=>n.outerHTML),before);
  assert.equal(await p.locator('[data-pretext-probe]').count(),0);
  await sheet.evaluate(n=>n.remove());
  const report=await inspect(p,'rich');assert.equal(report.engine,'browser');assert.ok(report.adaptable);
  assert.equal(await p.locator('#rich').evaluate(n=>n.outerHTML),before);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});

test('unfittable text and cancelled async operations leave user content unchanged',async()=>{
 const p=await open(true);try{
  await p.locator('#plain').evaluate(n=>{n.style.height='8px';n.style.width='15px';});
  const original=await p.locator('#plain').evaluate(n=>n.outerHTML);
  await assert.rejects(p.evaluate(()=>measurement.plan(document.querySelector('#plain'),'fit')),/最小字号/);
  assert.equal(await p.locator('#plain').evaluate(n=>n.outerHTML),original);
  await p.locator('#plain').evaluate(n=>{n.style.height='84px';n.style.width='310px';});
  await panel(p,'plain');
  await p.evaluate(()=>{window.oldLoad=document.fonts.load.bind(document.fonts);document.fonts.load=()=>new Promise(r=>window.resumeFont=r);});
  await p.locator('[data-act=text-fit]').click();await p.locator('[data-act=done]').click();
  await p.evaluate(()=>{document.fonts.load=oldLoad;resumeFont([]);});await p.waitForTimeout(80);
  assert.equal(await p.locator('#plain').evaluate(n=>n.style.fontSize),'');assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});

test('document CSS that prevents fitting rolls back every style rather than keeping a failed adaptation',async()=>{
 const p=await open(true);try{
  await p.addStyleTag({content:'#plain{height:84px!important;font-size:32px!important;line-height:40px!important}'});
  await panel(p,'plain');const before=await p.locator('#plain').evaluate(n=>n.outerHTML);
  await p.locator('[data-act=text-height]').click();
  await p.waitForFunction(()=>document.querySelector('html-design-editor').shadowRoot.querySelector('.toast').textContent.includes('已保留原样'));
  assert.equal(await p.locator('#plain').evaluate(n=>n.outerHTML),before);
  assert.equal(await p.locator('[data-act=undo]').isDisabled(),true);
 }finally{await p.close();}
});

test('aspect ratio and size containment cannot conceal vertical overflow or turn content height into zero',async()=>{
 for(const constraint of ['aspect-ratio:2','contain:size','container-type:size']){
  const p=await open(true);try{
   await p.locator('#plain').evaluate((n,css)=>n.style.cssText=`width:300px;height:80px;${css}`,constraint);
   const before=await p.locator('#plain').evaluate(n=>({style:n.getAttribute('style'),scroll:n.scrollHeight}));
   const measured=await inspect(p,'plain');assert.ok(measured.overflow);assert.ok(measured.requiredHeight>=before.scroll);
   await panel(p,'plain');await p.locator('[data-act=text-height]').click();
   await p.waitForFunction(()=>parseFloat(document.querySelector('#plain').style.height)>150);
   assert.equal((await inspect(p,'plain')).overflow,false);
   assert.ok(await p.locator('#plain').evaluate(n=>n.scrollHeight<=n.clientHeight+1));
   await p.locator('[data-act=undo]').click();assert.equal(await p.locator('#plain').getAttribute('style'),before.style);
   assert.equal((await inspect(p,'plain')).overflow,true);
  }finally{await p.close();}
 }
});
