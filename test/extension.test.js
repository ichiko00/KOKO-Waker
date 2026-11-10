import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('native extension lifecycle, settings migration and fixed read adapter',async()=>{
 const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end('<div id="extensionsMenu"></div><textarea id="send_textarea"></textarea><button id="send_but"></button>');}
  const name=req.url.slice(1);if(!['index.js','panel.js','read.js','send.js','voice.js','branches.js'].includes(name)){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(root,name)));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();let heartbeats=0;
  await page.route('http://127.0.0.1:17864/client/**',async route=>{heartbeats++;await route.fulfill({json:{desktopConnected:true,task:null}});});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>{localStorage.setItem('koko-waker-connection',JSON.stringify({url:'http://127.0.0.1:17864',token:'a'.repeat(64)}));localStorage.setItem('koko-waker-enabled','true');window.SillyTavern={getContext:()=>({characterId:1,getCurrentChatId:()=> 'fixture',chat:[{mes:'<think>隐藏分析</think><content>完整正文</content>'}],streamingProcessor:{isFinished:true}})};});
  await page.evaluate(async()=>{window.extension=await import('/index.js');extension.enable();extension.enable();});
  assert.equal(await page.locator('#koko-waker-menu').count(),1);
  assert.equal(await page.locator('#koko-waker').isVisible(),false);
  await page.locator('#koko-waker-menu').click();
  await page.waitForFunction(()=>document.querySelector('#koko-waker > div').shadowRoot.querySelector('.badge').textContent==='已连接');
  assert(heartbeats>0);
  assert.equal(await page.locator('#koko-url').inputValue(),'http://127.0.0.1:17864');
  assert.equal(await page.evaluate(async()=>(await import('/read.js')).read().text),'完整正文');
  await page.evaluate(()=>{window.fixture={characterId:1,getCurrentChatId:()=> 'fixture',chat:[{mes:'<content>正文</content><branches><details><summary>下一杯</summary>\nA.续杯｜选项一\nB.换手｜选项二\n</details></branches>'}],streamingProcessor:{isFinished:true}};window.SillyTavern.getContext=()=>fixture;window.sent=0;document.querySelector('#send_but').onclick=()=>{sent++;fixture.chat.push({is_user:true,mes:document.querySelector('#send_textarea').value});};});
  const result=await page.evaluate(async()=>{
   const {read}=await import('/read.js'),{send}=await import('/send.js'),{branchOptions}=await import('/branches.js');const d=read();
   if(d.branches.join(',')!=='A.续杯｜选项一,B.换手｜选项二'||d.text!=='正文')throw Error('Branch extraction failed');
   if(branchOptions('<think><branches>A.假选项</branches></think>').length)throw Error('Reasoning leaked');
   if(branchOptions('<branches>A.未闭合').length)throw Error('Incomplete branches leaked');
   const req={binding:d.binding,branch:{messageId:d.messageId,version:d.voiceVersion,index:1}};
   const rejects=fn=>{try{fn();return false}catch{return true}};
   if(!rejects(()=>send({...req,branch:{...req.branch,version:'stale'}})))throw Error('Stale version accepted');
   document.querySelector('#send_textarea').value='草稿';if(!rejects(()=>send(req)))throw Error('Draft overwritten');document.querySelector('#send_textarea').value='';
   send(req);if(!rejects(()=>send(req)))throw Error('Repeated branch sent');return {count:sent,text:document.querySelector('#send_textarea').value};
  });assert.deepEqual(result,{count:1,text:'B.换手｜选项二'});
  assert.equal(await page.evaluate(async()=>{
   fixture.chat=fixture.chat.slice(0,1);const f=document.createElement('iframe'),dialog=document.createElement('div');dialog.id='myphone-panel';dialog.append(f);document.body.append(dialog);
   const state={narration:{enabled:true,voice:'role',skip:['status']}};let played=false;
   window.__myPhoneAppPanelBridge={connect:()=>({status:()=>({phase:'idle'}),getState:()=>state,getSnapshot:()=>({state:structuredClone(state),revision:7}),save:(next,revision)=>{if(revision!==7)throw Error('Revision lost');state.narration=next.narration;},play:()=>{if(!state.narration.skip.includes('branches'))throw Error('Options would be narrated');played=true;}})};
   const d=(await import('/read.js')).read();(await import('/voice.js')).voice({binding:d.binding,messageId:d.messageId,version:d.voiceVersion,action:'play'});return played&&state.narration.skip.includes('status');
  }),true);
  assert.equal(await page.evaluate(async()=>{
   let clicks=0;const island=document.createElement('div');island.className='myphone-voice-island';island.innerHTML='<button data-vi="back"></button><button data-vi="forward"></button>';island.querySelectorAll('button').forEach(b=>b.onclick=()=>clicks++);document.body.append(island);
   window.__myPhoneAppPanelBridge={connect:()=>({status:()=>({phase:'playing'}),currentDialogue:()=>({id:0})})};
   const {read}=await import('/read.js'),{voice}=await import('/voice.js');const d=read();if(!d.voice.canSeek)throw Error('Seek capability missing');
   const req={binding:d.binding,messageId:0,version:d.voiceVersion};voice({...req,action:'back'});voice({...req,action:'forward'});
   island.querySelector('[data-vi="back"]').disabled=true;if(read().voice.canSeek)throw Error('Disabled seek advertised');let blocked=false;try{voice({...req,action:'back'})}catch{blocked=true}return clicks===2&&blocked;
  }),true);
  await page.locator('.close').click();assert.equal(await page.locator('#koko-waker').isVisible(),false);
  await page.evaluate(()=>extension.disable());assert.equal(await page.locator('#koko-waker-menu').count(),0);assert.equal(await page.locator('#koko-waker').count(),0);
  await page.evaluate(()=>extension.enable());assert.equal(await page.locator('#koko-waker-menu').count(),1);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('koko-waker-connection')).token.length),64);
  await page.evaluate(()=>extension.dispose());
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('manifest and published source contain no machine credentials',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));assert.equal(manifest.js,'index.js');assert.equal(manifest.auto_update,true);
 for(const name of ['index.js','panel.js','read.js','send.js','voice.js','manifest.json']){const text=fs.readFileSync(path.join(root,name),'utf8');assert(!/[a-f0-9]{64}/.test(text),name);assert(!text.includes('new Function('),name);}
});
