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
  const name=req.url.slice(1);if(!['index.js','panel.js','read.js','send.js','voice.js'].includes(name)){res.writeHead(404);return res.end();}
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
