import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {browserOptions,exportDocument} from './export.mjs';
import {elementGeometry} from './src/geometry.js';
import JSZip from 'jszip';
let browser,editor;
before(async()=>{editor=await readFile('html-design/editor.js','utf8');browser=await chromium.launch(browserOptions());await mkdir('.export-test/issue25-evidence',{recursive:true});});
after(async()=>browser?.close());
const near=(a,b,t=.08)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function fixture(layout='absolute',extra='') {
 const mode=layout==='absolute'?'artboard':'flow';
 const container=layout==='grid'?'display:grid;grid-template-columns:130px 160px 130px;gap:30px;':layout==='flex'?'display:flex;gap:30px;align-items:flex-start;':'';
 const shape=(id,x,w=130)=>`<div data-el="${id}" id="${id}" style="${layout==='absolute'?`position:absolute;left:${x}px;top:150px;`:''}width:${w}px;height:100px;border:2px solid #abc;border-radius:10px;background:#dce8e0;padding:12px;box-sizing:border-box">${id==='a'?'Editable A':'Card '+id}</div>`;
 return `<!doctype html><html><head><meta charset="utf-8"><title>组合</title><style>body{margin:0}[data-artboard]{position:relative;width:800px;height:500px;background:#faf8f2;font:20px Arial}.layout{position:absolute;left:0;top:0;width:800px;height:500px;padding:40px;box-sizing:border-box;${container}}${extra}</style></head><body><main data-stage><section data-artboard="p1" data-mode="${mode}"><div class="layout">${shape('a',100)}${shape('b',300,160)}${shape('c',570)}</div></section><section data-artboard="p2" data-mode="flow"><p data-el="other">Other page</p></section></main></body></html>`;
}
async function open(layout,extra,narrow=false) {
 const p=await browser.newPage({viewport:narrow?{width:390,height:844}:{width:1440,height:1000}});p.errors=[];p.on('pageerror',e=>p.errors.push(e.message));await p.setContent(fixture(layout,extra));await p.addScriptTag({content:editor});await p.locator('[data-act=edit]').click();await p.keyboard.press(narrow?'Control+1':'Control+0');return p;
}
async function choose(p,ids){await p.locator(`[data-el=${ids[0]}]`).click();for(const id of ids.slice(1))await p.locator(`[data-el=${id}]`).click({modifiers:['Shift']});}
const action=(p,act)=>p.locator(`.tbar [data-act=${act}]`).click();
const facts=p=>p.locator('[data-el=a],[data-el=b],[data-el=c]').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return{id:n.id,box:[r.x,r.y,r.width,r.height],font:s.fontSize,color:s.color,background:s.backgroundColor};}));
async function same(p,before){const after=await facts(p);assert.equal(after.length,before.length);after.forEach((f,i)=>{assert.equal(f.id,before[i].id);f.box.forEach((v,j)=>near(v,before[i].box[j]));assert.equal(f.font,before[i].font);assert.equal(f.color,before[i].color);assert.equal(f.background,before[i].background);});}

test('DOM grouping preserves absolute/Grid/Flex members, unselected siblings, node identity and one-step structural Undo/Redo',async()=>{
 for(const layout of ['absolute','grid','flex']){const p=await open(layout);try{
 await p.evaluate(()=>{window.original=[...document.querySelectorAll('[data-el]')];});const before=await facts(p);await choose(p,['a','b']);await action(p,'group');assert.equal(await p.locator('[data-group]').count(),1,layout+': '+await p.locator('.toast').textContent());assert.equal(await p.locator('[data-group]').evaluate(n=>getComputedStyle(n).display),'contents');await same(p,before);
 assert.ok(await p.evaluate(()=>window.original.every(n=>n===document.querySelector(`[data-el="${n.dataset.el}"]`))));await p.keyboard.press('Control+z');assert.equal(await p.locator('[data-group]').count(),0);await same(p,before);await p.keyboard.press('Control+Shift+z');assert.equal(await p.locator('[data-group]').count(),1);await action(p,'ungroup');assert.equal(await p.locator('[data-group]').count(),0);await same(p,before);await p.keyboard.press('Control+z');assert.equal(await p.locator('[data-group]').count(),1);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}}
});

test('structure selectors and noncontiguous selections reject atomically without changing history or source DOM',async()=>{
 for(const extra of ['.layout > [data-el]:nth-child(2){color:red}', '.layout > [data-el]:nth-child(2){width:180px!important}']){const p=await open('absolute',extra);try{await choose(p,['a','b']);const before=await p.locator('[data-stage]').evaluate(n=>n.outerHTML);await action(p,'group');assert.equal(await p.locator('[data-group]').count(),0);assert.equal(await p.locator('[data-stage]').evaluate(n=>n.outerHTML),before);assert.equal(await p.locator('[data-act=undo]').isDisabled(),true);assert.match(await p.locator('.toast').textContent(),/保留原样/);}finally{await p.close();}}
 const p=await open('absolute');try{await choose(p,['a','c']);assert.equal(await p.locator('.tbar [data-act=group]').isDisabled(),true);}finally{await p.close();}
});

test('logical group selection, nested entry, native member text, Escape and scoped directional selection stay coherent',async()=>{
 const p=await open('absolute');try{await choose(p,['a','b']);await action(p,'group');await p.locator('[data-el=c]').click({modifiers:['Shift']});await action(p,'group');assert.equal(await p.locator('[data-group]').count(),2);await p.locator('[data-el=a]').click();assert.equal(await p.locator('.selection-count').textContent(),'组合 · 3 个对象');await p.locator('[data-el=a]').dblclick();assert.equal(await p.locator('.selection-count').textContent(),'组合 · 2 个对象');await p.locator('[data-el=a]').dblclick();assert.equal(await p.locator('.tbar [data-act=group-exit]').isVisible(),true);assert.equal(await p.locator('[contenteditable]').count(),0);await p.locator('[data-el=a]').dblclick();assert.equal(await p.locator('[data-el=a]').getAttribute('contenteditable'),'true');await p.keyboard.press('Escape');assert.equal(await p.locator('[contenteditable]').count(),0);assert.equal(await p.locator('.tbar [data-act=group-exit]').isVisible(),true);await p.keyboard.press('Control+Shift+ArrowRight');assert.equal(await p.locator('.selection-member').count(),2);await p.keyboard.press('Escape');assert.equal(await p.locator('.selection-count').textContent(),'组合 · 2 个对象');await p.keyboard.press('Escape');assert.equal(await p.locator('.selection-count').textContent(),'组合 · 3 个对象');assert.equal(await p.locator('.tbar [data-act=group-exit]').isVisible(),false);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});
const geometry=(p,id)=>p.locator(`[data-el=${id}]`).evaluate(elementGeometry);
async function rotateGroup(p,degrees){
 const box=await p.locator('.sel').boundingBox(),center={x:box.x+box.width/2,y:box.y+box.height/2},h=await p.locator('.rotate-handle').boundingBox(),x=h.x+h.width/2,y=h.y+h.height/2,rad=degrees*Math.PI/180;
 await p.keyboard.down('Alt');await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(center.x+(x-center.x)*Math.cos(rad)-(y-center.y)*Math.sin(rad),center.y+(x-center.x)*Math.sin(rad)+(y-center.y)*Math.cos(rad),{steps:5});await p.mouse.up();await p.keyboard.up('Alt');
}
test('group move/rotation/proportional corners and transformed ungroup preserve member geometry, author transforms and single-step histories',async()=>{
 for(const layout of ['absolute','grid','flex']){const p=await open(layout);try{
 await p.locator('[data-el=b]').evaluate(n=>{n.style.transform='rotate(12deg) scale(.9)';n.style.transformOrigin='10% 70%';});
 await choose(p,['a','b']);await action(p,'group');const original=await facts(p),a=await geometry(p,'a'),b=await geometry(p,'b');await p.keyboard.press('Shift+ArrowRight');near((await geometry(p,'a')).cx,a.cx+10);near((await geometry(p,'b')).cx,b.cx+10);await p.keyboard.press('Control+z');await same(p,original);
 await rotateGroup(p,30);near((await geometry(p,'a')).angle,30,.1);near((await geometry(p,'b')).angle,42,.1);assert.equal(await p.locator('[data-el=b]').evaluate(n=>n.style.transform),'rotate(12deg) scale(0.9)');assert.equal(await p.locator('[data-el=b]').evaluate(n=>n.style.transformOrigin),'10% 70%');const rotatedA=await geometry(p,'a'),rotatedB=await geometry(p,'b');
 const box=await p.locator('.sel').boundingBox(),handle=await p.locator('[data-h=se]').boundingBox();assert.equal(await p.locator('[data-h=e]').isVisible(),false);await p.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await p.mouse.down();await p.mouse.move(handle.x+handle.width/2+box.width*.2,handle.y+handle.height/2+box.height*.2,{steps:5});await p.mouse.up();near((await geometry(p,'a')).scale,rotatedA.scale*1.2,.005);near((await geometry(p,'b')).scale,rotatedB.scale*1.2,.005);near((await geometry(p,'b')).angle,42,.1);
 const transformed=await facts(p);await action(p,'ungroup');assert.equal(await p.locator('[data-group]').count(),0);await same(p,transformed);await p.keyboard.press('Control+z');assert.equal(await p.locator('[data-group]').count(),1);await same(p,transformed);await p.keyboard.press('Control+z');near((await geometry(p,'a')).scale,rotatedA.scale,.005);await p.keyboard.press('Control+z');await same(p,original);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}}
});

test('group clone rekeys nested identifiers, delete/Undo keeps identities, and deleting the last member removes empty wrappers reversibly',async()=>{
 const p=await open('absolute');try{
 await choose(p,['a','b']);await action(p,'group');await p.locator('[data-el=c]').click({modifiers:['Shift']});await action(p,'group');await p.evaluate(()=>window.oldGroups=[...document.querySelectorAll('[data-group]')]);await p.keyboard.press('Control+d');assert.equal(await p.locator('[data-group]').count(),4);assert.ok(await p.locator('[data-artboard=p1] [data-el]').evaluateAll(ns=>new Set(ns.map(n=>n.dataset.el)).size===ns.length));assert.ok(await p.locator('[data-artboard=p1] [id]').evaluateAll(ns=>new Set(ns.map(n=>n.id)).size===ns.length));await p.keyboard.press('Delete');assert.equal(await p.locator('[data-group]').count(),2);await p.keyboard.press('Control+z');assert.equal(await p.locator('[data-group]').count(),4);await p.keyboard.press('Control+z');assert.equal(await p.locator('[data-group]').count(),2);
 await p.locator('[data-el=a]').dblclick();await p.locator('[data-el=a]').dblclick();await p.keyboard.press('Control+Shift+ArrowRight');await p.keyboard.press('Delete');assert.equal(await p.locator('[data-group]').count(),1);await p.keyboard.press('Control+z');assert.equal(await p.locator('[data-group]').count(),2);assert.ok(await p.evaluate(()=>window.oldGroups.every(n=>n.isConnected)));await p.keyboard.press('Control+Shift+z');assert.equal(await p.locator('[data-group]').count(),1);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});

test('live semantic wrappers survive saved/offline reopen and emit nested native PPTX groups with editable text',async()=>{
 const p=await open('absolute');try{await choose(p,['a','b']);await action(p,'group');await p.locator('[data-el=c]').click({modifiers:['Shift']});await action(p,'group');await rotateGroup(p,25);
 await p.locator('[data-act=export]').click();const download=p.waitForEvent('download');await p.locator('[data-menu=export] [data-act=download]').click();const file=await download;const html=await readFile(await file.path(),'utf8');assert.match(html,/data-group="1"/);assert.doesNotMatch(html,/<[^>]+data-editor-group-context/);
 const second=await browser.newPage();try{await second.setContent(html);await second.locator('[data-act=edit]').click();await second.locator('[data-el=a]').click();assert.equal(await second.locator('.selection-count').textContent(),'组合 · 3 个对象');}finally{await second.close();}
 const result=await exportDocument({html,format:'pptx',title:'DOM groups',baseUrl:'http://127.0.0.1/'}),zip=await JSZip.loadAsync(result.bytes),xml=await zip.file('ppt/slides/slide1.xml').async('string');assert.equal((xml.match(/<p:grpSp>/g)||[]).length,2);assert.match(xml,/<a:t>Editable A/);assert.match(xml,/<a:t>Card b/);assert.match(xml,/<a:t>Card c/);assert.equal((xml.match(/<p:sp>/g)||[]).length,6);assert.ok(!/\b(?:cx|cy)="-/.test(xml));
 }finally{await p.close();}
});

test('real group drag/cancel and corner cancel stay one history action at 50/100/200%; scoped marquee and page exit reset context',async()=>{
 for(const z of [.5,1,2]){const p=await open('absolute');try{await choose(p,['a','b']);await action(p,'group');await p.keyboard.press('Control+0');for(let i=0;i<(z===.5?4:z===2?5:0);i++)await p.keyboard.press(z===.5?'Control+-':'Control+=');const initial=await facts(p),g=await geometry(p,'a');
 await p.keyboard.down('Alt');await p.mouse.move(g.cx,g.cy);await p.mouse.down();await p.mouse.move(g.cx+25*g.scale,g.cy+15*g.scale,{steps:4});await p.mouse.up();await p.keyboard.up('Alt');near((await geometry(p,'a')).cx,g.cx+25*g.scale);const after=await geometry(p,'b');await p.keyboard.press('Control+z');await same(p,initial);await p.keyboard.press('Control+Shift+z');near((await geometry(p,'b')).cx,after.cx);
 const moved=await facts(p),a=await geometry(p,'a');await p.mouse.move(a.cx,a.cy);await p.mouse.down();await p.mouse.move(a.cx+35,a.cy+20,{steps:4});await p.keyboard.press('Escape');await p.mouse.up();await same(p,moved);const h=await p.locator('[data-h=se]').boundingBox();await p.mouse.move(h.x+4,h.y+4);await p.mouse.down();await p.mouse.move(h.x+60,h.y+40,{steps:4});await p.keyboard.press('Escape');await p.mouse.up();await same(p,moved);
 await p.locator('[data-el=a]').dblclick();const br=await p.locator('[data-artboard=p1]').boundingBox(),scale=br.width/800;await p.mouse.move(Math.max(180,br.x+70*scale),Math.max(64,br.y+110*scale));await p.mouse.down();await p.mouse.move(Math.min(1420,br.x+750*scale),Math.min(950,br.y+330*scale),{steps:5});await p.mouse.up();assert.equal(await p.locator('.selection-member').count(),2,JSON.stringify({z,exit:await p.locator('.tbar [data-act=group-exit]').isVisible(),text:await p.locator('.selection-count').textContent(),boxes:await facts(p)}));await p.keyboard.press('PageDown');assert.equal(await p.locator('[data-artboard=p2]').getAttribute('data-editor-current'),'');await p.keyboard.press('PageUp');await p.locator('[data-el=c]').click();assert.equal(await p.locator('.tbar [data-act=group-exit]').isVisible(),false);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}}
});

test('crop frames remain members and grouped QA checks member boxes instead of empty semantic wrappers',async()=>{
 const {measureDocumentText}=await import('./text-measure.mjs');
 const p=await open('absolute');try{
 const source='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="300" height="300" fill="red"/><rect x="300" width="300" height="300" fill="blue"/></svg>');
 await p.locator('[data-el=b]').evaluate((n,src)=>{const img=document.createElement('img');for(const a of n.attributes)img.setAttribute(a.name,a.value);img.src=src;img.style.padding='0';img.style.objectFit='cover';n.replaceWith(img);},source);await p.locator('[data-el=b]').evaluate(n=>n.decode());await p.locator('[data-el=b]').dblclick();await p.locator('.crop-zoom-value').fill('150');await p.locator('.crop-zoom-value').press('Enter');await choose(p,['a','b']);await action(p,'group');assert.equal(await p.locator('[data-crop-frame]').count(),1);await p.locator('[data-el=b]').dblclick();await p.locator('[data-el=b]').dblclick();assert.equal(await p.locator('.crop-panel').isVisible(),true);await p.keyboard.press('Escape');await p.keyboard.press('Escape');assert.equal(await p.locator('.selection-count').textContent(),'组合 · 2 个对象');
 const html=await p.evaluate(()=>document.documentElement.outerHTML);const result=await measureDocumentText({mode:'qa',html});assert.ok(!result.issues.some(i=>i.code==='HIDDEN_CONTENT'&&i.elementId?.includes('-group-')),JSON.stringify(result));assert.ok(!result.issues.some(i=>i.code==='GEOMETRY_UNSUPPORTED'),JSON.stringify(result));assert.equal(result.coverage.elements.hidden,0);
 const pptx=await exportDocument({html,format:'pptx',baseUrl:'http://127.0.0.1/',title:'Grouped crop'}),zip=await JSZip.loadAsync(pptx.bytes),xml=await zip.file('ppt/slides/slide1.xml').async('string');assert.ok((xml.match(/<p:grpSp>/g)||[]).length>=1);assert.equal((xml.match(/<p:pic>/g)||[]).length,1);assert.match(xml,/<a:srcRect[^>]+[lrtb]="[1-9]/);assert.deepEqual(p.errors,[]);
 }finally{await p.close();}
});

test('managed save and AI handoff finish an in-flight group transform and reset logical editing context',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),path=await import('node:path'),{createPreviewServer}=await import('./server.mjs');
 const dir=await mkdtemp(path.join(tmpdir(),'dom-groups-')),file=path.join(dir,'groups.html');await writeFile(file,fixture('absolute').replace('</body>',()=>`<script data-editor>${editor}</script></body>`));const server=await createPreviewServer({root:dir,port:0}),origin=`http://127.0.0.1:${server.address().port}`,p=await browser.newPage({viewport:{width:1440,height:1000}});
 const call=async(action,body={})=>{const r=await fetch(origin+'/__html-design/document/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:'/groups.html',...body})});assert.equal(r.status,200,await r.clone().text());return r.json();};let ai;
 try{
 await p.goto(origin+'/groups.html');await p.locator('.state-text').filter({hasText:/^已保存$/}).waitFor();await p.locator('[data-act=edit]').click();await p.keyboard.press('Control+0');await choose(p,['a','b']);await action(p,'group');await p.locator('[data-el=a]').dblclick();assert.equal(await p.locator('.tbar [data-act=group-exit]').isVisible(),true);await p.keyboard.press('Escape');
 const g=await geometry(p,'a');await p.mouse.move(g.cx,g.cy);await p.mouse.down();await p.mouse.move(g.cx+30,g.cy+18,{steps:4});ai=await call('ai/begin');await p.locator('[data-act=retry]').evaluate(n=>n.click());let state;for(let i=0;i<60;i++){state=await call('ai/status',{token:ai.token});if(state.ready)break;await new Promise(r=>setTimeout(r,100));}assert.ok(state.ready);await p.mouse.up();assert.equal(await p.locator('html').getAttribute('data-editing'),null);assert.match(await readFile(file,'utf8'),/data-group="1"/);assert.equal(await p.locator('.tbar').isVisible(),false);
 await call('ai/commit',{token:ai.token,revision:state.revision,html:state.html.replace('Editable A','AI revised A')});ai=null;await p.locator('[data-el=a]').filter({hasText:'AI revised A'}).waitFor();await p.locator('[data-act=edit]').click();await p.locator('[data-el=a]').click();assert.equal(await p.locator('.selection-count').textContent(),'组合 · 2 个对象');assert.equal(await p.locator('.tbar [data-act=group-exit]').isVisible(),false);
 }finally{if(ai)await call('ai/cancel',{token:ai.token});await p.close();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});

test('new group controls retain the editor visual language and fit desktop/narrow workspaces in one combined visual pass',async()=>{
 for(const narrow of [false,true]){const p=await open('absolute','',narrow);try{await choose(p,['a','b']);await action(p,'group');await p.locator('[data-el=c]').click({modifiers:['Shift']});await action(p,'group');await p.locator('[data-el=a]').dblclick();const r=await p.locator('.tbar').boundingBox();assert.ok(r.x>=0&&r.x+r.width<=(narrow?390:1440));await p.screenshot({path:`.export-test/issue25-evidence/groups-${narrow?'narrow':'desktop'}.png`});await p.locator('.tbar [data-act=element-more]').click();const m=await p.locator('[data-menu=element]').boundingBox();assert.ok(m.x>=0&&m.x+m.width<=(narrow?390:1440));assert.equal(await p.locator('[data-menu=element] [data-act=group-enter]').isVisible(),true);assert.equal(await p.locator('[data-menu=element] [data-act=group-exit]').isVisible(),true);assert.deepEqual(p.errors,[]);}finally{await p.close();}}
});

async function downloadedHtml(p) {
 await p.locator('[data-act=export]').click();const ready=p.waitForEvent('download');await p.locator('[data-menu=export] [data-act=download]').click();return readFile(await (await ready).path(),'utf8');
}
async function reopen(p, html) {
 await p.setContent(html);await p.locator('[data-act=edit]').click();await p.keyboard.press('Control+0');
}
test('review P1: phrasing links reject block groups without source/history changes; legal layouts roundtrip after group and ungroup',async()=>{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});
 try{
 const html='<!doctype html><html><head><title>Linked phrasing</title><style>body{margin:0}[data-artboard]{position:relative;width:800px;height:500px;background:white}p{font:20px/30px Arial;margin:40px}span[data-el]{display:inline-block;width:80px;height:40px;background:#def}</style></head><body><main data-stage><section data-artboard="p1" data-mode="flow"><p id="paragraph">Before <a href="#safe"><span data-el="a">A</span><span data-el="b">B</span></a> After</p></section></main></body></html>';
 await p.setContent(html);await p.addScriptTag({content:editor});await p.locator('[data-act=edit]').click();await p.keyboard.press('Control+0');await choose(p,['a','b']);const before=await p.locator('[data-stage]').evaluate(n=>n.outerHTML),boxes=await p.locator('span[data-el]').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return[r.x,r.y,r.width,r.height];}));await p.evaluate(()=>window.phrasingA=document.querySelector('[data-el=a]'));
 await p.locator('.tbar [data-act=group]').evaluate(n=>n.click());assert.equal(await p.locator('[data-group]').count(),0);assert.equal(await p.locator('.tbar [data-act=group]').isDisabled(),true);assert.equal(await p.locator('[data-stage]').evaluate(n=>n.outerHTML),before);assert.equal(await p.locator('[data-act=undo]').isDisabled(),true);assert.ok(await p.evaluate(()=>window.phrasingA===document.querySelector('[data-el=a]')));
 const saved=await downloadedHtml(p),second=await browser.newPage({viewport:{width:1440,height:1000}});try{await reopen(second,saved);assert.equal(await second.locator('#paragraph').textContent(),'Before AB After');assert.equal(await second.locator('#paragraph > a > span[data-el]').count(),2);assert.equal(await second.locator('[data-group]').count(),0);const actual=await second.locator('span[data-el]').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return[r.x,r.y,r.width,r.height];}));actual.forEach((r,i)=>r.forEach((v,j)=>near(v,boxes[i][j])));}finally{await second.close();}
 }finally{await p.close();}
 // Removing a contents table body can also render unchanged live yet be
 // implicitly reconstructed on HTML parsing; the post-change guard must roll back.
 const table=await browser.newPage({viewport:{width:1440,height:1000}});try{
 await table.setContent('<!doctype html><html><head><title>Table roundtrip</title><style>body{margin:0}[data-artboard]{width:800px;height:500px;position:relative}table{position:absolute;left:100px;top:100px;border-collapse:collapse}td{width:100px;height:35px}</style></head><body><main data-stage><section data-artboard="p1"><table><tbody data-group="1" data-el="rows" style="display:contents"><tr data-el="row-a"><td>A</td></tr><tr data-el="row-b"><td>B</td></tr></tbody></table></section></main></body></html>');await table.addScriptTag({content:editor});await table.locator('[data-act=edit]').click();await table.keyboard.press('Control+0');await table.locator('[data-el=row-a]').click();const before=await table.locator('table').evaluate(n=>n.outerHTML);await action(table,'ungroup');assert.equal(await table.locator('[data-group]').count(),1);assert.equal(await table.locator('table').evaluate(n=>n.outerHTML),before);assert.equal(await table.locator('[data-act=undo]').isDisabled(),true);assert.match(await table.locator('.toast').textContent(),/保留原样/);
 }finally{await table.close();}
 for(const layout of ['absolute','grid','flex']){const p=await open(layout);try{await choose(p,['a','b']);await action(p,'group');const before=await facts(p);for(const grouped of [true,false]){if(!grouped)await action(p,'ungroup');const saved=await downloadedHtml(p),second=await browser.newPage({viewport:{width:1440,height:1000}});try{await reopen(second,saved);assert.equal(await second.locator('[data-group]').count(),grouped?1:0,layout);await same(second,before);assert.equal(await second.locator('.layout').evaluate(n=>{const clone=n.cloneNode(true),t=document.createElement('template');t.innerHTML=clone.outerHTML;return t.content.childNodes.length===1&&t.content.firstChild.isEqualNode(clone);}),true);}finally{await second.close();}}}finally{await p.close();}}
});

test('review P2: invisible group members cannot create snap/selection targets and mixed bounds use only visible members',async()=>{
 for(const kind of ['leaf','ancestor','outer','visible','mixed'])for(const grouped of [false,true]){
 const p=await browser.newPage({viewport:{width:1440,height:1000}});try{
 const hidden=kind==='leaf',visible=kind==='visible'||kind==='mixed',ancestor=kind==='ancestor';
 const a=`<div data-el="a" style="position:absolute;left:${ancestor?0:300}px;top:${ancestor?0:100}px;width:100px;height:60px;background:#ddd;${hidden?'opacity:0':''}"></div>`,b=`<div data-el="b" style="position:absolute;left:${ancestor?120:420}px;top:${ancestor?0:100}px;width:100px;height:60px;background:#ddd;${hidden||kind==='mixed'?'opacity:0':''}"></div>`;
 let peers=ancestor?`<div data-el="parent" style="position:absolute;left:300px;top:100px;width:220px;height:60px;opacity:0">${a+b}</div>`:a+b;
 if(grouped)peers=`<div data-group="1" data-el="group" style="display:contents">${peers}</div>`;
 if(kind==='outer')peers=`<div style="opacity:0">${peers}</div>`;
 await p.setContent(`<!doctype html><html><head><title>Visibility</title><style>body{margin:0}[data-artboard]{position:relative;width:800px;height:500px;background:white}</style></head><body><main data-stage><section data-artboard="p1" data-mode="artboard">${peers}<div data-el="moving" style="position:absolute;left:100px;top:100px;width:80px;height:60px;background:#abc"></div></section></main></body></html>`);await p.addScriptTag({content:editor});await p.locator('[data-act=edit]').click();await p.keyboard.press('Control+0');const g=await geometry(p,'moving');await p.mouse.move(g.cx,g.cy);await p.mouse.down();await p.mouse.move(g.cx+196,g.cy,{steps:8});near(await p.locator('[data-el=moving]').evaluate(n=>parseFloat(n.style.left)),visible?300:296);assert.equal((await p.locator('.guide-line').count())>0,visible,`${kind}, grouped=${grouped}`);await p.mouse.up();
 if(!visible&&grouped){await p.keyboard.press('Control+Shift+ArrowRight');assert.equal(await p.locator('.selection-member').count(),0,`${kind}, grouped=${grouped}`);}
 else if(grouped){await p.locator('[data-el=a]').click({position:{x:95,y:30}});const frame=await p.locator('.sel').boundingBox(),r=await p.locator('[data-el=a]').boundingBox();near(frame.x,r.x);near(frame.width,kind==='mixed'?100:220);}
 }finally{await p.close();}}
});
