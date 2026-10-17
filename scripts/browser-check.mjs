import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
await mkdir(new URL('../temp/', import.meta.url), { recursive: true });
const target = targets.find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let seq=0;const waiting=new Map();const errors=[];
ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);if(data.id){const pending=waiting.get(data.id);waiting.delete(data.id);data.error?pending.reject(data.error):pending.resolve(data.result);}});
function cdp(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
await cdp('Runtime.enable');await cdp('Page.enable');
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await cdp('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:false});
await cdp('Page.navigate',{url:process.env.MATHS_TEST_URL || 'http://127.0.0.1:5500/'});
// Wait for the app module and its JSON fetches, without assuming network timing.
for(let i=0;i<100;i++){if(await evaluate("document.querySelector('#next') && document.querySelectorAll('#lessons button').length === 32"))break;await new Promise(r=>setTimeout(r,50));}
await evaluate("import('./js/app.js').then(m=>m.ready)");
assert.equal(await evaluate("document.querySelectorAll('#lessons button').length"),32);
for(const [width,height,label] of [[768,1024,'portrait'],[1024,768,'landscape'],[1180,820,'wide-landscape'],[390,844,'phone']]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
 const geometry=await evaluate(`(()=>{const box=document.querySelector('.controls').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,controls:{left:box.left,right:box.right},sidebar:!document.querySelector('#sidebar').hidden,targets:[...document.querySelectorAll('.controls button')].map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))}})()`);
 assert.ok(geometry.scroll<=width,`${label}: horizontal overflow`);
 assert.ok(geometry.controls.left>=0&&geometry.controls.right<=width);
 assert.ok(geometry.targets.every(b=>b.w>=56&&b.h>=56));
 console.log(label,geometry);
 const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(new URL(`../temp/v2-${label}.png`,import.meta.url),Buffer.from(shot.data,'base64'));
}
for(const [width,height] of [[768,1024],[1024,768]]) {
await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
const result=await evaluate(`(async()=>{
 const pause=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const buttons=[...document.querySelectorAll('#lessons button')];let states=0;
 for(const button of buttons){
  button.click();await pause();
  const length=Number(document.querySelector('#counter').textContent.match(/of (\\d+)/)[1]);
  const before=document.querySelector('.controls').getBoundingClientRect().top;
  const checkNotation=()=>{
   for(const node of document.querySelectorAll('#visual .math-content')){
    if(!node.querySelector('.katex'))throw new Error('Missing KaTeX');
    const math=node.querySelector('.katex-html').getBoundingClientRect();
    const slot=node.parentElement.getBoundingClientRect();
    if(math.left<slot.left-2||math.right>slot.right+2||math.top<slot.top-2||math.bottom>slot.bottom+2)throw new Error('Clipped notation: '+node.dataset.latex);
   }
   const plates=[...document.querySelectorAll('#visual rect')].filter(r=>r.getAttribute('height')==='10');
   if(plates.length)for(const node of document.querySelectorAll('#visual foreignObject[data-term]')){
    if(Number(node.getAttribute('y'))>200)continue;
    const side=Number(node.getAttribute('x'))<400?0:1;
    const math=node.querySelector('.katex-html').getBoundingClientRect();
    if(math.bottom>plates[side].getBoundingClientRect().top-2)throw new Error('Notation overlaps plate');
   }
  };
  checkNotation();
  for(let step=1;step<length;step++){
   document.querySelector('#next').click();document.querySelector('#next').click();await pause();
   if(!document.querySelector('#counter').textContent.startsWith('Step '+(step+1)+' '))throw new Error('Progression failed: '+button.textContent);
   if(Math.abs(document.querySelector('.controls').getBoundingClientRect().top-before)>1)throw new Error('Controls shifted: '+button.textContent);
   if(document.documentElement.scrollWidth>innerWidth)throw new Error('Overflow: '+button.textContent);
   states++;
   checkNotation();
  }
  document.querySelector('#back').click();await pause();document.querySelector('#replay').click();await pause();
  if(!document.querySelector('#counter').textContent.startsWith('Step 1 '))throw new Error('Replay failed');
 }
 return {lessons:buttons.length,transitions:states};
})()`);
console.log(`Browser progression ${width}×${height}`,result);
}
// Keep a visual record of the fraction lesson at iPad sizes.
for(const [width,height,label] of [[768,1024,'fraction-portrait'],[1024,768,'fraction-landscape']]){
 await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await evaluate("document.querySelector('[data-lesson=multiply-four]').click()");
 await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 assert.ok(await evaluate("document.querySelectorAll('#visual .mfrac').length>0"));
 assert.ok(await evaluate("document.querySelector('#visual').getAttribute('aria-label').includes('divided by')"));
 const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(new URL(`../temp/v2-${label}.png`,import.meta.url),Buffer.from(shot.data,'base64'));
}
// Exercise actual Web Animations and beam interpolation, not just reduced motion.
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
await evaluate("document.querySelector('[data-lesson=add-both]').click()");
for(let step=2;step<=5;step++) {
 await evaluate("document.querySelector('#next').click();document.querySelector('#next').click()");
 assert.equal(await evaluate("document.querySelector('#next').disabled"),true);
 for(let attempt=0;attempt<100;attempt++){
  if(await evaluate("document.querySelector('#visual').getAttribute('aria-busy')==='false'"))break;
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 assert.equal(await evaluate("document.querySelector('#counter').textContent"),`Step ${step} of 5`);
 const beam=await evaluate("(()=>{const b=document.querySelector('[data-beam]');return [Number(b.getAttribute('y1')),Number(b.getAttribute('y2'))]})()");
 assert.equal(beam[0]===beam[1],step!==2);
}
console.log('Normal-motion cancellation, beam interpolation and rapid-click checks passed');
// Each new primitive must also animate safely with normal motion enabled.
for(const id of ['share-ratio','straight-line','rectangle-area','probability-scale','mean','median','read-bar-chart']){
 await evaluate(`document.querySelector('[data-lesson="${id}"]').click()`);
 await evaluate("document.querySelector('#next').click();document.querySelector('#next').click()");
 for(let attempt=0;attempt<100;attempt++){
  if(await evaluate("document.querySelector('#visual').getAttribute('aria-busy')==='false'"))break;
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 assert.ok(await evaluate("document.querySelector('#counter').textContent.startsWith('Step 2 ')"),id);
 assert.equal(await evaluate("document.querySelector('#error').hidden"),true);
}
console.log('New diagram primitives: normal-motion transitions passed');
await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await cdp('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:false});
await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
for(const id of ['share-ratio','angles-point','triangle-area','equally-likely','mean','median','read-bar-chart']){
 await evaluate(`(async()=>{document.querySelector('[data-lesson="${id}"]').click();for(let i=0;i<8&&!document.querySelector('#next').disabled;i++){document.querySelector('#next').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}})()`);
 const bounds=await evaluate(`(()=>{const svg=document.querySelector('#visual>svg'),box=svg.getBoundingClientRect();return [...svg.querySelectorAll('text,.katex-html')].every(n=>{const r=n.getBoundingClientRect();return r.left>=box.left-2&&r.right<=box.right+2&&r.top>=box.top-2&&r.bottom<=box.bottom+2;});})()`);
 assert.equal(bounds,true,`Diagram labels outside canvas: ${id}`);
 const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await writeFile(new URL(`../temp/sections-${id}.png`,import.meta.url),Buffer.from(shot.data,'base64'));
}
// Force unsupported/rejected API paths; the browser must retain a visible exit button.
for(const mode of ['unsupported','rejected']){
 await evaluate(`Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:${mode==='unsupported'?'undefined':"()=>Promise.reject(new Error('Rejected test'))"}});document.querySelector('#fullscreen').click()`);
 await evaluate('new Promise(r=>setTimeout(r,10))');
 assert.equal(await evaluate("document.body.classList.contains('presentation')"),true);
 assert.equal(await evaluate("document.querySelector('#fullscreen').textContent"),'Exit full screen');
 assert.equal(await evaluate("getComputedStyle(document.querySelector('#sidebar')).display"),'none');
 await evaluate("document.querySelector('#fullscreen').click()");
 await evaluate('new Promise(r=>setTimeout(r,10))');
 assert.equal(await evaluate("document.body.classList.contains('presentation')"),false);
}
await evaluate("delete document.documentElement.requestFullscreen");
// Native OS fullscreen can stall in headless Windows. Its API success/exit
// contract is covered by the Node tests; verify native interaction on an iPad.
assert.deepEqual(errors,[]);
console.log('Fallback fullscreen and runtime error checks passed');
await cdp('Browser.close');
ws.close();
