'use strict';
const APP_VERSION='v3';
(()=>{const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];const uid=()=>Math.random().toString(36).slice(2,10);
const toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>t.style.display='none',2200)};
const AC=window.AudioContext||window.webkitAudioContext;let ctx=null,master=null;
let badSince=0;
function audio(){if(ctx&&ctx.state!=='running'&&badSince&&performance.now()-badSince>1500&&!document.hidden){try{ctx.close()}catch(e){}ctx=null;badSince=0;}
 if(!ctx){ctx=new AC();master=ctx.createGain();master.gain.value=0.9;master.connect(ctx.destination);ctx.onstatechange=()=>{if(!ctx)return;if(ctx.state==='running')badSince=0;else if(ctx.state!=='closed'){badSince=badSince||performance.now();ctx.resume().catch(()=>{});}};}
 if(ctx.state!=='running'){badSince=badSince||performance.now();ctx.resume().catch(()=>{});}return ctx;}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx)ctx.resume().catch(()=>{});});
document.addEventListener('pointerdown',()=>{if(ctx&&ctx.state!=='running')audio();},{capture:true});
document.addEventListener('pointerdown',()=>{const c=audio();const b=c.createBuffer(1,1,22050),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0);},{once:true,capture:true});
const fresh=()=>({name:'Untitled',bpm:100,recs:[],multi:{tracks:[],clips:[]}});let S=fresh();const samples={};
function decode(ab){audio();return new Promise((res,rej)=>{const p=ctx.decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej);});}
function wavBlob(buf){const ch=buf.numberOfChannels,len=buf.length,sr=buf.sampleRate,ab=new ArrayBuffer(44+len*ch*2),v=new DataView(ab);const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
 ws(0,'RIFF');v.setUint32(4,36+len*ch*2,true);ws(8,'WAVE');ws(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,len*ch*2,true);
 const d=[...Array(ch)].map((_,c)=>buf.getChannelData(c));let o=44;for(let i=0;i<len;i++)for(let c=0;c<ch;c++){const x=Math.max(-1,Math.min(1,d[c][i]));v.setInt16(o,x<0?x*0x8000:x*0x7fff,true);o+=2;}return new Blob([ab],{type:'audio/wav'});}
const i16=a=>{const r=new Int16Array(a.length);for(let i=0;i<a.length;i++){const x=Math.max(-1,Math.min(1,a[i]));r[i]=x<0?x*0x8000:x*0x7fff;}return r;};
function mp3Blob(buf){const enc=new lamejs.Mp3Encoder(2,buf.sampleRate,192),L=i16(buf.getChannelData(0)),R=i16(buf.getChannelData(buf.numberOfChannels>1?1:0)),out=[];
 for(let i=0;i<L.length;i+=1152){const b=enc.encodeBuffer(L.subarray(i,i+1152),R.subarray(i,i+1152));if(b.length)out.push(new Uint8Array(b));}const e=enc.flush();if(e.length)out.push(new Uint8Array(e));return new Blob(out,{type:'audio/mpeg'});}
async function download(blob,name){const f=new File([blob],name,{type:blob.type});
 if(navigator.canShare&&navigator.canShare({files:[f]})&&/iPhone|iPad|Android/i.test(navigator.userAgent)){try{await navigator.share({files:[f],title:name});return;}catch(e){if(e.name==='AbortError')return;}}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);}
window.PN={audio,decode,download,toast,wavBlob,mp3Blob,samples,get S(){return S},get ctx(){return ctx},get master(){return master}};
// recording
async function listInputs(){try{const d=await navigator.mediaDevices.enumerateDevices();const sel=$('#inputSel'),cur=sel.value;sel.innerHTML='<option value="">Default mic</option>';d.filter(x=>x.kind==='audioinput').forEach((x,i)=>{const o=document.createElement('option');o.value=x.deviceId;o.textContent=x.label||('Input '+(i+1));sel.appendChild(o);});sel.value=cur;}catch(e){}}
if(navigator.mediaDevices){listInputs();navigator.mediaDevices.ondevicechange=listInputs;}
let mr=null,stream=null,chunks=[];
$('#rec').onclick=async()=>{const btn=$('#rec');audio();if(mr&&mr.state==='recording'){mr.stop();return;}
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return toast('Mic needs HTTPS + a supporting browser');
 try{const dev=$('#inputSel').value;stream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:dev?{exact:dev}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});}catch(e){return toast('Mic blocked: '+e.message);}
 listInputs();chunks=[];const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg'].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m));
 mr=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);mr.ondataavailable=e=>e.data.size&&chunks.push(e.data);
 mr.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());stream=null;audio();btn.classList.remove('on');btn.textContent='● Rec';
  try{const buf=await decode(await new Blob(chunks,{type:mr.mimeType}).arrayBuffer());const id=uid(),name='Rec '+(S.recs.length+1);samples[id]=buf;S.recs.push({id,name});
   PNWave.setBuf(buf,name);toast('Recorded '+buf.duration.toFixed(1)+'s → opened in Wave');renderRecs();PNWave.refresh();}catch(e){toast('Decode failed: '+e.message);}};
 mr.start(100);btn.classList.add('on');btn.textContent='■ Stop';};
function renderRecs(){const b=$('#recList');b.innerHTML=S.recs.length?'':'<p class="hint">No recordings yet.</p>';S.recs.forEach((r,i)=>{const d=document.createElement('div');d.className='pr';d.style.cssText='display:flex;gap:6px;margin-bottom:6px';
 d.innerHTML='<input style="flex:1"><button>Wave</button><button>WAV</button><button>✕</button>';const inp=d.children[0];inp.value=r.name;inp.onchange=()=>r.name=inp.value;
 d.children[1].onclick=()=>{PNWave.setBuf(samples[r.id],r.name);$('#tabs button[data-v=wave]').click();};d.children[2].onclick=()=>download(wavBlob(samples[r.id]),r.name.replace(/\W+/g,'_')+'.wav');
 d.children[3].onclick=()=>{if(S.multi.clips.some(c=>c.bufId===r.id))return toast('Used by multitrack clips');S.recs.splice(i,1);delete samples[r.id];renderRecs();};b.appendChild(d);});}
// tabs
$$('#tabs button').forEach(b=>b.onclick=()=>{$$('#tabs button').forEach(x=>x.classList.toggle('on',x===b));$$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+b.dataset.v));if(b.dataset.v==='proj'){listProjects();renderRecs();}window.dispatchEvent(new CustomEvent('pn-tab',{detail:b.dataset.v}));});
$('#bpm').onchange=e=>{S.bpm=Math.min(240,Math.max(40,+e.target.value||100));e.target.value=S.bpm;window.PNMulti&&PNMulti.render();};
// sessions (own IndexedDB)
const idb=()=>new Promise((res,rej)=>{const r=indexedDB.open('pocketwave',1);r.onupgradeneeded=()=>r.result.createObjectStore('sessions',{keyPath:'name'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
const tx=async(mode,fn)=>{const db=await idb();return new Promise((res,rej)=>{const t=db.transaction('sessions',mode),s=t.objectStore('sessions'),r=fn(s);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error);});};
function snapshot(){const ids=new Set([...S.recs.map(r=>r.id),...S.multi.clips.map(c=>c.bufId)]);const st=JSON.parse(JSON.stringify(S));
 if(PNWave.buf){let wid=Object.keys(samples).find(k=>samples[k]===PNWave.buf);if(!wid){wid='__wave';samples[wid]=PNWave.buf;}st.waveId=wid;st.waveName=PNWave.name;ids.add(wid);}
 const smp={};for(const id of ids)if(samples[id])smp[id]=samples[id];return{st,smp};}
const raw=b=>({sr:b.sampleRate,ch:[...Array(b.numberOfChannels)].map((_,c)=>new Float32Array(b.getChannelData(c)))});
function bufFrom(o){audio();const b=ctx.createBuffer(o.ch.length,o.ch[0].length,o.sr);o.ch.forEach((d,c)=>b.getChannelData(c).set(d));return b;}
function load(st,smp){S=Object.assign(fresh(),st);S.multi=Object.assign({tracks:[],clips:[]},S.multi);for(const k in samples)delete samples[k];Object.assign(samples,smp);
 $('#bpm').value=S.bpm;$('#pname').textContent=S.name;$('#projName').value=S.name;if(S.waveId&&samples[S.waveId])PNWave.setBuf(samples[S.waveId],S.waveName||'edit');else PNWave.setBuf(null,'edit');renderRecs();window.dispatchEvent(new Event('pn-load'));}
$('#projSave').onclick=async()=>{const n=$('#projName').value.trim()||S.name;S.name=n;$('#pname').textContent=n;const {st,smp}=snapshot();st.name=n;const o={};for(const k in smp)o[k]=raw(smp[k]);
 try{await tx('readwrite',s=>s.put({name:n,state:st,samples:o,saved:Date.now()}));toast('Saved "'+n+'"');listProjects();}catch(e){toast('Save failed: '+e.message);}};
$('#projNew').onclick=()=>{if(confirm('Start a new empty session?'))load(fresh(),{});};
async function listProjects(){const box=$('#projList');let all=[];try{all=await tx('readonly',s=>s.getAll());}catch(e){}box.innerHTML=all.length?'':'<p class="hint">No saved sessions yet.</p>';
 all.sort((a,b)=>b.saved-a.saved).forEach(p=>{const r=document.createElement('div');r.className='pr';r.innerHTML='<span></span><button>Load</button><button>✕</button>';r.querySelector('span').textContent=p.name+' · '+new Date(p.saved).toLocaleString();
  r.children[1].onclick=()=>{const smp={};for(const k in p.samples)smp[k]=bufFrom(p.samples[k]);load(p.state,smp);toast('Loaded "'+p.name+'"');};
  r.children[2].onclick=async()=>{if(confirm('Delete session "'+p.name+'"?')){await tx('readwrite',s=>s.delete(p.name));listProjects();}};box.appendChild(r);});}
const b64=async blob=>{const u=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);};
$('#projExport').onclick=async()=>{const {st,smp}=snapshot();const o={};for(const k in smp)o[k]=await b64(wavBlob(smp[k]));await download(new Blob([JSON.stringify({app:'pocket-wave',version:1,state:st,samples:o})],{type:'application/json'}),(S.name||'session').replace(/\W+/g,'_')+'.pocketwave.json');};
$('#projImport').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(j.app!=='pocket-wave')throw new Error('Not a Pocket Wave session');const smp={};for(const k in j.samples){const bin=atob(j.samples[k]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);smp[k]=await decode(u.buffer);}load(j.state,smp);toast('Imported "'+S.name+'"');}catch(err){toast('Import failed: '+err.message);}e.target.value='';};
if('serviceWorker' in navigator&&location.protocol!=='file:'){const hadCtl=!!navigator.serviceWorker.controller;let reloaded=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!hadCtl||reloaded)return;reloaded=true;if(mr&&mr.state==='recording'){toast('Update ready – tap here to reload');$('#toast').onclick=()=>location.reload();$('#toast').style.pointerEvents='auto';clearTimeout(toast.t);}else location.reload();});
 navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{r.update();document.addEventListener('visibilitychange',()=>{if(!document.hidden)r.update();});}).catch(()=>{});}
$('#appVer').textContent='Pocket Wave '+APP_VERSION;
})();
