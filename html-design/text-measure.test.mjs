import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { chromium } from 'playwright';
import { browserOptions } from './export.mjs';
import { measureDocumentText, validateTextRequest } from './text-measure.mjs';

let dir;
before(async()=>dir=await mkdtemp(path.join(tmpdir(),'canvas-text-')));
after(async()=>rm(dir,{recursive:true,force:true}));
const input={text:'A canvas gives words a clear place. 中文也需要可靠的排版。',font:'32px Arial, "PingFang SC", sans-serif',lineHeight:42,widths:[200,400,800]};
const html=`<!doctype html><html lang="zh-CN"><head><style>
[data-stage]{transform:scale(.5)}[data-artboard]{width:800px;height:500px;position:relative;box-sizing:border-box}p{box-sizing:border-box;position:absolute;left:20px;top:20px;margin:0;font:32px/40px Arial;overflow-wrap:break-word;width:300px;height:60px;overflow:hidden}.second{display:none}.rich{top:150px;word-spacing:4px}.rich span{font-size:20px;line-height:26px}
</style></head><body><main data-stage><section data-artboard="p1"><p data-el="p1-title">A longer title that needs multiple lines and cannot fit in this tiny frame.</p><p class="rich" data-el="p1-rich">Mixed <span>text remains independently editable inside this small frame.</span></p></section><section data-artboard="p2" class="second"><p data-el="p2-title">SECOND PAGE MUST BE CHECKED AND NEVER CLEARED BY SCRIPT.</p></section></main><script>document.querySelector('[data-stage]').remove();fetch('/MUST-NOT-RUN');</script></body></html>`;
function command(args){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,['html-design/text.mjs',...args],{stdio:['ignore','pipe','pipe']});let out='',err='';p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('close',code=>{try{resolve({code,result:JSON.parse(out),err});}catch(e){reject(new Error(`${out}\n${err}\n${e}`));}});});}

test('candidate widths return natural width and validated line metrics without a running server',async()=>{
 const request=path.join(dir,'request.json');await writeFile(request,JSON.stringify(input));
 const {code,result}=await command(['measure',request]);assert.equal(code,0);assert.equal(result.status,'ok');assert.equal(result.units,'css-px');assert.equal(result.box,'content-box');
 assert.ok(result.naturalWidth>400);assert.ok(result.layouts[0].requiredHeight>result.layouts[2].requiredHeight);
 assert.ok(result.layouts.every(l=>l.maxHeight===null && l.verticalOverflow===null));assert.ok(result.layouts.every(l=>l.lineCount>0));
 const browser=await chromium.launch(browserOptions());try{
  const p=await browser.newPage();await p.setContent('<html lang="zh-CN"><body></body></html>');
  for(const l of result.layouts){const actual=await p.evaluate(({input,width})=>{const p=document.createElement('p');p.style.cssText=`position:absolute;left:0;top:0;margin:0;padding:0;font:${input.font};line-height:${input.lineHeight}px;width:${width}px;overflow-wrap:break-word`;p.textContent=input.text;document.body.append(p);const h=p.getBoundingClientRect().height;p.remove();return h;},{input,width:l.width});assert.ok(Math.abs(actual-l.requiredHeight)<=1);}
 }finally{await browser.close();}
 const narrow=await measureDocumentText({mode:'measure',input:{...input,maxHeight:50}});assert.equal(narrow.status,'issues');assert.equal(narrow.layouts[0].verticalOverflow,true);
 const empty=await measureDocumentText({mode:'measure',input:{...input,text:'',widths:[200]}});assert.equal(empty.naturalWidth,0);assert.equal(empty.layouts[0].requiredHeight,0);
 const pre=await measureDocumentText({mode:'measure',input:{...input,text:'One\nTwo\nThree',widths:[300],whiteSpace:'pre-wrap'}});assert.equal(pre.layouts[0].lineCount,3);
});

test('document checking covers hidden pages and rich text, blocks scripts, reports IDs and saved-byte revision without writes',async()=>{
 const file=path.join(dir,'deck.html');await writeFile(file,html);
 const {code,result}=await command(['check',file]);assert.equal(code,2);assert.equal(result.status,'issues');assert.equal(result.pageCount,2);assert.equal(result.textCount,3);assert.equal(result.checkedCount,3);
 assert.equal(result.source.kind,'saved-file');assert.equal(result.source.path,file);assert.match(result.revision,/^[0-9a-f]{64}$/);
 assert.deepEqual(result.issues.map(i=>i.elementId),['p1-title','p1-rich','p2-title']);assert.ok(result.issues.every(i=>i.status==='overflow'));
 assert.equal(result.issues[0].box.width,300);assert.equal(result.issues[1].engine,'browser');assert.equal(await readFile(file,'utf8'),html);
 const normal=html.replaceAll('height:60px','height:360px').replace('top:150px','top:50px');
 const ok=await measureDocumentText({mode:'check',html:normal});assert.equal(ok.status,'ok');assert.equal(ok.checkedCount,3);assert.deepEqual(ok.issues,[]);
});

test('flex artboard layout is preserved and hidden, unsupported and duplicate-ID text never counts as clean',async()=>{
 const flex=`<html><head><style>[data-artboard]{display:flex;width:700px;height:400px;gap:20px}p{font:30px/40px Arial;width:300px;margin:0;overflow-wrap:break-word}</style></head><body><main data-stage><section data-artboard="p1"><p data-el="a">Left</p><p data-el="b">Right</p></section></main></body></html>`;
 const okay=await measureDocumentText({mode:'check',html:flex});assert.equal(okay.status,'ok');assert.equal(okay.checkedCount,2);
 const varied=flex.replace('data-el="a"','data-el="a" style="display:none"').replace('data-el="b"','data-el="b" style="writing-mode:vertical-rl"');
 const result=await measureDocumentText({mode:'check',html:varied});assert.deepEqual(result.issues.map(i=>i.status),['hidden','unsupported']);assert.equal(result.checkedCount,0);
 const duplicate=await measureDocumentText({mode:'check',html:flex.replace('data-el="b"','data-el="a"')});assert.equal(duplicate.status,'issues');assert.ok(duplicate.issues.every(i=>i.status==='invalid-id'));
});

test('document fonts and relative CSS resolve from the explicit local base; failed resources stay visible',async()=>{
 let ran=0;
 const server=http.createServer((req,res)=>{
  if(req.url==='/templates/type.css'){res.writeHead(200,{'Content-Type':'text/css'});res.end('p{font:30px/40px Arial;width:300px;height:30px;margin:0;overflow-wrap:break-word;overflow:hidden}');}
  else {ran++;res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const baseUrl=`http://127.0.0.1:${server.address().port}/templates/deck.html`;
 try{
  const doc='<html><head><link rel="stylesheet" href="type.css"></head><body><main data-stage><section data-artboard="p1" style="width:700px;height:400px"><p data-el="title">This longer paragraph uses the local template stylesheet and needs several lines.</p></section></main><script>fetch("/BAD")</script></body></html>';
  const result=await measureDocumentText({mode:'check',html:doc,baseUrl});assert.equal(result.issues[0].availableHeight,30);assert.equal(result.resourceErrors.length,0);assert.equal(ran,0);
  const missing=await measureDocumentText({mode:'check',html:doc.replace('type.css','missing.css'),baseUrl});assert.equal(missing.status,'issues');assert.ok(missing.resourceErrors.some(r=>r.status===404));
 }finally{await new Promise(r=>server.close(r));}
});

test('invalid requests fail explicitly, while layout constraints use exit 2 with usable JSON',async()=>{
 for(const value of [{...input,widths:[]},{...input,lineHeight:'42'},{...input,font:'16rem/20px Arial'},{...input,unknown:true}])assert.throws(()=>validateTextRequest(value));
 const invalid=path.join(dir,'invalid.json');await writeFile(invalid,JSON.stringify({...input,widths:[-1]}));const bad=await command(['measure',invalid]);assert.equal(bad.code,1);assert.equal(bad.result.status,'error');
 const small=path.join(dir,'small.json');await writeFile(small,JSON.stringify({...input,maxHeight:0}));const result=await command(['measure',small]);assert.equal(result.code,2);assert.equal(result.result.layouts[0].verticalOverflow,true);
 await assert.rejects(measureDocumentText({mode:'check',html,baseUrl:'https://example.com/'}),/local HTTP/);
 const invalidFont=await measureDocumentText({mode:'measure',input:{...input,font:'32px;bad'}}).then(()=>null,e=>e);assert.ok(invalidFont);
});

test('scan limits explicitly report unchecked content and failed web fonts cannot become a clean pass',async()=>{
 const many='<html><body><main data-stage><section data-artboard="p1" style="width:800px;height:600px">'+Array.from({length:501},(_,i)=>`<p data-el="t${i}" style="display:none">Text</p>`).join('')+'</section></main></body></html>';
 const limited=await measureDocumentText({mode:'check',html:many});assert.equal(limited.status,'issues');assert.equal(limited.textCount,501);assert.equal(limited.truncated,true);assert.equal(limited.issues.length,500);
 const server=http.createServer((req,res)=>{res.writeHead(404);res.end();});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const badFont='<html><head><style>@font-face{font-family:BrokenFont;src:url(missing.woff2)}p{font:30px/40px BrokenFont;width:300px;height:50px;overflow-wrap:break-word}</style></head><body><main data-stage><section data-artboard="p1" style="width:800px;height:600px"><p data-el="title">Missing custom font must be reported.</p></section></main></body></html>';
  const result=await measureDocumentText({mode:'check',html:badFont,baseUrl:`http://127.0.0.1:${server.address().port}/deck.html`});assert.equal(result.status,'issues');assert.ok(result.resourceErrors.some(r=>r.type==='font'));
 }finally{await new Promise(r=>server.close(r));}
});

test('unmarked text and direct text around nested editable nodes are reported, not silently skipped',async()=>{
 const wrap=body=>`<html><body><main data-stage><section data-artboard="p1" style="width:800px;height:500px">${body}</section></main></body></html>`;
 const unmarked=await measureDocumentText({mode:'check',html:wrap('<p style="width:100px;height:20px;overflow:hidden">Unmarked text still needs checking.</p>')});
 assert.equal(unmarked.status,'issues');assert.equal(unmarked.textCount,1);assert.equal(unmarked.issues[0].status,'unmarked');assert.equal(unmarked.issues[0].elementId,null);assert.match(unmarked.issues[0].preview,/Unmarked/);
 const nested=await measureDocumentText({mode:'check',html:wrap('<div data-el="card">Direct parent text<p data-el="label" style="font:20px/30px Arial;width:300px;margin:0;overflow-wrap:break-word">Label</p></div>')});
 assert.equal(nested.textCount,2);assert.ok(nested.issues.some(i=>i.elementId==='card'&&i.code==='NESTED_TEXT_CONTAINER'));assert.equal(nested.checkedCount,1);
});

test('ancestor opacity/display and clipping constraints remain visible in the report',async()=>{
 const wrap=body=>`<html><head><style>p{font:32px/40px Arial;width:400px;height:120px;margin:0;overflow-wrap:break-word}</style></head><body><main data-stage><section data-artboard="p1" style="width:800px;height:500px">${body}</section></main></body></html>`;
 for(const css of ['opacity:0','display:none']){const r=await measureDocumentText({mode:'check',html:wrap(`<div style="${css}"><p data-el="title">Hidden through parent.</p></div>`)});assert.equal(r.status,'issues');assert.equal(r.issues[0].status,'hidden');assert.equal(r.checkedCount,0);}
 const clipped=await measureDocumentText({mode:'check',html:wrap('<div data-el="card" style="width:200px;height:30px;overflow:hidden;padding:10px;border:3px solid"><p data-el="title">This text fits its own box but its parent clips the box.</p></div>')});
 assert.equal(clipped.status,'issues');assert.equal(clipped.issues[0].status,'clipped');assert.equal(clipped.issues[0].overflow,false);assert.deepEqual(clipped.issues[0].clippedBy[0],{elementId:'card',id:null,tag:'div',x:true,y:true});
});

test('meta refresh cannot execute a destination script or attach another page to the source revision',async()=>{
 let targets=0,runs=0;
 const server=http.createServer((req,res)=>{if(req.url==='/ran')runs++;else targets++;res.writeHead(200,{'Content-Type':'text/html'});res.end('<html><body><main data-stage><section data-artboard="other"><p data-el="other-title">Other</p></section></main><script>fetch("/ran")</script></body></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const baseUrl=`http://127.0.0.1:${server.address().port}/destination`;
  const doc=`<html><head><meta http-equiv="refresh" content="0;url=${baseUrl}"></head><body><main data-stage><section data-artboard="source"><p data-el="source-title">Source</p></section></main></body></html>`;
  await assert.rejects(measureDocumentText({mode:'check',html:doc,baseUrl}),/navigation/i);
  assert.equal(targets,0);assert.equal(runs,0);
 }finally{await new Promise(r=>server.close(r));}
});
