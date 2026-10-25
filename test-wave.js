const {chromium}=require('playwright');const fs=require('fs');const U=process.env.U||'http://localhost:8131/';const srv=process.env.U?null:require('./srv')('/workspace/pocket-wave',8131);
(async()=>{const b=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
for(const vp of [[390,844],[844,390],[1280,800]]){const c=await b.newContext({permissions:['microphone'],viewport:{width:vp[0],height:vp[1]},deviceScaleFactor:2,acceptDownloads:true});
const p=await c.newPage();p.on('dialog',d=>d.accept());const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push('PE '+e.message));const L=(...a)=>console.log(vp.join('x'),...a);
await p.goto(U);await p.click('body');L('tabs',await p.$$eval('#tabs button',x=>x.map(e=>e.textContent).join('|')),'manifest',await p.$eval('link[rel=manifest]',e=>e.href));
await p.click('#rec');await p.waitForTimeout(1500);await p.click('#rec');await p.waitForTimeout(800);L('rec in wave',await p.evaluate(()=>[PNWave.name,PNWave.buf&&PNWave.buf.duration.toFixed(2),PN.S.recs.length]),'src opts',await p.$$eval('#wSrc option',x=>x.length));
await p.setInputFiles('#wFile','/tmp/pt/nb.mp3');await p.waitForTimeout(600);L('mp3 load',await p.evaluate(()=>PNWave.buf.duration.toFixed(2)));
await p.setInputFiles('#wFile','/tmp/pt/out.wav');await p.waitForTimeout(600);
await p.$eval('#wcv',e=>e.scrollIntoView({block:'center'}));const cb=await (await p.$('#wcv')).boundingBox();
await p.mouse.move(cb.x+cb.width*0.2,cb.y+50);await p.mouse.down();await p.mouse.move(cb.x+cb.width*0.4,cb.y+60,{steps:5});await p.mouse.up();
L('sel',await p.evaluate(()=>PNWave.sel.map(x=>(x/PNWave.buf.sampleRate).toFixed(2))));
await p.click('#wZi');await p.click('#wZs');await p.click('#wPlaySel');await p.waitForTimeout(300);await p.click('#wStop');
await p.click('#wSil');L('silenced',await p.evaluate(()=>{const[a,b]=PNWave.sel,d=PNWave.buf.getChannelData(0);let s=0;for(let i=a;i<b;i++)s+=Math.abs(d[i]);return s}));
await p.click('#wUndo');await p.click('#wRedo');await p.click('#wUndo');await p.click('#wAll');await p.click('#wFin');await p.click('#wNorm');await p.fill('#wDb','-6');await p.click('#wGain');
await p.evaluate(()=>PNWave.sel=[44100,44100*3]);const d0=await p.evaluate(()=>PNWave.buf.duration);await p.click('#wDel');L('delete',d0.toFixed(2),'->',(await p.evaluate(()=>PNWave.buf.duration)).toFixed(2));
await p.evaluate(()=>PNWave.sel=[0,44100*4]);await p.click('#wTrim');L('trim',await p.evaluate(()=>PNWave.buf.duration.toFixed(2)));
await p.screenshot({path:`/tmp/pt/pw_wave_${vp[0]}.png`});
for(const [id,ext] of [['#wWav','wav'],['#wMp3','mp3'],['#wRec','webm']]){const [d]=await Promise.all([p.waitForEvent('download',{timeout:30000}),p.click(id)]);await d.saveAs('/tmp/pt/pw.'+ext);L('wave export',d.suggestedFilename(),fs.statSync('/tmp/pt/pw.'+ext).size);}
await p.click('#wToMulti');
await p.click('#tabs button[data-v=multi]');await p.waitForTimeout(200);await p.click('#mAddTrack');await p.selectOption('#mSrc',{index:1});await p.click('#mAdd');
await p.setInputFiles('#mFile','/tmp/pt/w.wav');await p.waitForTimeout(500);L('clips',await p.evaluate(()=>PNMulti.state.clips.length));
for(let i=0;i<3;i++)await p.click('#mZo');
const id0=await p.evaluate(()=>PNMulti.state.clips[0].id);let bb=await (await p.$(`.clip[data-id="${id0}"]`)).boundingBox();
await p.mouse.move(bb.x+bb.width/2,bb.y+40);await p.mouse.down();await p.mouse.move(bb.x+bb.width/2+60,bb.y+40+72,{steps:8});await p.mouse.up();
L('moved',await p.evaluate(()=>{const m=PNMulti.state,c=m.clips[0];return[c.start.toFixed(2),m.tracks.findIndex(t=>t.id===c.track)]}));
await p.evaluate(()=>{const m=PNMulti.state;m.clips.slice(1).forEach((c,i)=>{c.start=20+i*10});PNMulti.render();});
await p.$eval(`.clip[data-id="${id0}"]`,e=>e.scrollIntoView({block:'center',inline:'nearest'}));bb=await (await p.$(`.clip[data-id="${id0}"]`)).boundingBox();await p.mouse.move(bb.x+bb.width-3,bb.y+45);await p.mouse.down();await p.mouse.move(bb.x+bb.width-20,bb.y+45,{steps:4});await p.mouse.up();
bb=await (await p.$(`.clip[data-id="${id0}"]`)).boundingBox();await p.mouse.move(bb.x+2,bb.y+6);await p.mouse.down();await p.mouse.move(bb.x+12,bb.y+6,{steps:4});await p.mouse.up();
L('trim/fade',await p.evaluate(()=>{const c=PNMulti.state.clips[0];return[c.dur.toFixed(2),c.fadeIn.toFixed(2)]}));
await p.click('#mPlay');await p.waitForTimeout(700);L('playhead',await p.$eval('#mPh',e=>e.style.left));await p.click('#mPlay');await p.screenshot({path:`/tmp/pt/pw_multi_${vp[0]}.png`});
L('mix',await p.evaluate(async()=>{const b=await PNMulti.mix();return b.duration.toFixed(2)}));
for(const [id,ext] of [['#mWav','wav'],['#mMp3','mp3']]){const [d]=await Promise.all([p.waitForEvent('download'),p.click(id)]);await d.saveAs('/tmp/pt/pwm.'+ext);L('multi export',ext,fs.statSync('/tmp/pt/pwm.'+ext).size);}
await p.click('#tabs button[data-v=proj]');await p.fill('#projName','S1');await p.click('#projSave');await p.waitForTimeout(400);await p.click('#projNew');
await p.click('#projList .pr button:text("Load")');await p.waitForTimeout(400);L('reloaded',await p.evaluate(()=>[PN.S.recs.length,PN.S.multi.clips.length,PN.S.multi.clips.every(c=>!!PN.samples[c.bufId]),!!PNWave.buf]));
const [d]=await Promise.all([p.waitForEvent('download'),p.click('#projExport')]);await d.saveAs('/tmp/pt/pw.json');await p.click('#projNew');await p.setInputFiles('#projImport','/tmp/pt/pw.json');await p.waitForTimeout(800);
L('imported',await p.evaluate(()=>[PN.S.multi.clips.length,PN.S.multi.clips.every(c=>!!PN.samples[c.bufId]),!!PNWave.buf]));
L('hscroll',await p.evaluate(()=>{const o=[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&!e.closest('#mWrap')).map(e=>e.id||e.className||e.tagName).slice(0,5);return document.documentElement.scrollWidth>innerWidth?o:false}),'sw',await p.evaluate(()=>navigator.serviceWorker.getRegistration().then(r=>!!r)));
L('ERRORS',errs);await c.close();}
await b.close();srv&&srv.close();})();
