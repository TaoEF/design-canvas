import{test,before,after}from'node:test';import assert from'node:assert/strict';import{readFile,mkdir,writeFile}from'node:fs/promises';import{chromium}from'playwright';import{browserOptions}from'./export.mjs';import{snapMove,spacingCandidates}from'./src/guides.js';import{elementGeometry}from'./src/geometry.js';
const near=(a,b,t=.05)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const flip=r=>({x:r.y,y:r.x,w:r.h,h:r.w});
test('coincident edge/page alignment keeps its correction and also reports true outer spacing in all four directions',()=>{
 for(const before of[false,true])for(const vertical of[false,true]){
 const moving={x:before?304:396,y:160,w:100,h:60},peers=[{x:before?500:0,y:160,w:100,h:60},{x:before?700:200,y:160,w:100,h:60}],board={x:0,y:0,w:800,h:450},axis=vertical?'y':'x',transform=vertical?flip:r=>r;
 const candidates=spacingCandidates(transform(moving),peers.map(transform),axis,6),result=snapMove(transform(moving),[transform(board),...peers.map(transform)],{x:0,y:0},6,peers.map(transform));
 assert.equal(candidates.length,1);assert.equal(result[axis],before?-4:4);assert.notEqual(result.matches.find(m=>m.axis===axis).kind,'spacing','ordinary alignment stays first');
 const spaces=result.matches.filter(m=>m.axis===axis&&m.kind==='spacing');assert.equal(spaces.length,1);assert.equal(spaces[0].gap,100);assert.equal(spaces[0].mode,before?'before':'after');
 }
 const moving={x:396,y:160,w:100,h:60},peers=[{x:0,y:160,w:100,h:60},{x:200,y:160,w:100,h:60}];
 const different=snapMove(moving,[...peers,{x:397,y:320,w:50,h:50}],{x:0,y:0},6,peers);assert.equal(different.x,1);assert.equal(different.matches.filter(m=>m.kind==='spacing'&&m.axis==='x').length,0,'a closer different target must not claim equal gaps');
 const blocked=snapMove(moving,[{x:0,y:0,w:800,h:450},...peers,{x:130,y:160,w:30,h:60}],{x:0,y:0},6,[...peers,{x:130,y:160,w:30,h:60}]);assert.equal(blocked.matches.filter(m=>m.kind==='spacing'&&m.axis==='x').length,0);
});
let browser,editor;before(async()=>{browser=await chromium.launch(browserOptions());editor=await readFile('html-design/editor.js','utf8');await mkdir('.export-test/issue24-evidence',{recursive:true});});after(async()=>browser?.close());
async function open({vertical=false,before=false,narrow=false,fractional=false}={}){
 const p=await browser.newPage({viewport:narrow?{width:390,height:844}:{width:1600,height:1800}});p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));
 const a=fractional?{x:40,w:60.25}: {x:before?500:0,w:100},b=fractional?{x:170.5,w:100.75}:{x:before?700:200,w:100},moving={x:fractional?323.5:before?312:388,w:fractional?80:100};
 const node=(id,r)=>`<div data-el="${id}" style="position:absolute;${vertical?'top':'left'}:${r.x}px;${vertical?'left':'top'}:160px;${vertical?'height':'width'}:${r.w}px;${vertical?'width':'height'}:60px;background:#dae5de;border:1px solid #b8c8be;box-sizing:border-box"></div>`;
 await p.setContent(`<!doctype html><html><head><title>距离与方向</title><style>body{margin:0}[data-artboard]{position:relative;width:${vertical?450:fractional?1000:800}px;height:${vertical?800:450}px;background:#f9f8f3}</style></head><body><main data-stage><section data-artboard="p1" data-mode="artboard">${node('a',a)}${node('b',b)}${node('moving',moving)}</section></main></body></html>`);await p.addScriptTag({content:editor});await p.locator('[data-act=edit]').click();await p.keyboard.press(narrow?'Control+1':'Control+0');return p;
}
async function zoom(p,scale){await p.keyboard.press('Control+0');for(let i=0;i<(scale===.5?4:scale===2?5:0);i++)await p.keyboard.press(scale===.5?'Control+-':'Control+=');}
const geometry=p=>p.locator('[data-el=moving]').evaluate(elementGeometry);
async function drag(p,vertical=false,before=false){const g=await geometry(p);await p.mouse.move(g.cx,g.cy);await p.mouse.down();const delta=(before?-10:10)*g.scale;await p.mouse.move(g.cx+(vertical?0:delta),g.cy+(vertical?delta:0),{steps:4});return g;}

test('rotation handle remains a 24px screen circle through canvas zoom and a narrow workspace',async()=>{
 for(const narrow of[false,true]){const p=await open({narrow});try{for(const scale of narrow?[null]:[.5,1,2]){if(scale)await zoom(p,scale);const g=await geometry(p);await p.mouse.click(g.cx,g.cy);const actual=await p.locator('.rotate-handle').evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return{width:r.width,height:r.height,radius:s.borderRadius,minWidth:s.minWidth};});near(actual.width,24);near(actual.height,24);assert.equal(actual.radius,'50%');assert.deepEqual(p.errors,[]);}}finally{await p.close();}}
});

test('real left/right/top/bottom outer spacing shows integer badges with same-target alignment at 50/100/200%; Alt and Undo stay unchanged',async()=>{
 for(const vertical of[false,true])for(const before of[false,true])for(const scale of[.5,1,2]){const p=await open({vertical,before});try{await zoom(p,scale);const g=await drag(p,vertical,before),axis=vertical?'y':'x';
 assert.deepEqual(await p.locator('.guide-distance').allTextContents(),['100','100'],`direction=${vertical?'vertical':'horizontal'}, before=${before}, scale=${scale}`);assert.equal(await p.locator('.guide-distance-bg').count(),2);const style=await p.locator('.guide-distance').first().evaluate(n=>{const s=getComputedStyle(n);return{fill:s.fill,stroke:s.stroke,font:s.fontSize};});assert.equal(style.fill,'rgb(255, 255, 255)');assert.equal(style.stroke,'none');assert.equal(style.font,'11px');near((await geometry(p))[vertical?'cy':'cx'],g[vertical?'cy':'cx']+(before?-12:12)*g.scale);
 await p.keyboard.down('Alt');await p.mouse.move(g.cx+(vertical?0:(before?-7:7)*g.scale),g.cy+(vertical?(before?-7:7)*g.scale:0));assert.equal(await p.locator('.guide-distance').count(),0);await p.keyboard.up('Alt');await p.mouse.move(g.cx+(vertical?0:(before?-10:10)*g.scale),g.cy+(vertical?(before?-10:10)*g.scale:0));await p.mouse.up();assert.equal(await p.locator('.guide-distance-bg').count(),0);await p.keyboard.press('Control+z');near((await geometry(p))[vertical?'cy':'cx'],g[vertical?'cy':'cx']);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}}
});

test('fractional gap badges round display only and keep exact drag geometry; new feedback has one bounded visual pass',async()=>{
 for(const narrow of[false,true]){const p=await open({fractional:true,narrow});try{const g=await geometry(p),delta=14*g.scale;await p.mouse.move(g.cx,g.cy);await p.mouse.down();await p.mouse.move(g.cx+delta,g.cy,{steps:4});assert.deepEqual(await p.locator('.guide-distance').allTextContents(),['70','70']);near(await p.locator('[data-el=moving]').evaluate(n=>parseFloat(n.style.left)),341.5);const badges=await p.locator('.guide-distance-bg').evaluateAll(nodes=>nodes.map(n=>({rx:n.getAttribute('rx'),width:Number(n.getAttribute('width')),height:Number(n.getAttribute('height')),fill:getComputedStyle(n).fill})));assert.ok(badges.every(n=>n.rx==='5'&&n.height===21&&n.width>=20&&n.fill==='rgb(32, 32, 32)'));await p.screenshot({path:`.export-test/issue24-evidence/spacing-${narrow?'narrow':'desktop'}.png`});await p.mouse.up();await p.keyboard.press('Control+z');near(await p.locator('[data-el=moving]').evaluate(n=>parseFloat(n.style.left)),323.5);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}}
});
