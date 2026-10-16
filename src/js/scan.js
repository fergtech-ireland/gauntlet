/* ===================== Barcode scanning (build 76) =====================
   Feargal: a scan button in the food search and on Eat; the camera finds the
   barcode fast on iPhone and Android, with a type-the-number fallback; the
   product comes from Open Food Facts and opens on the food screen with the
   label's serving as a unit; scanned products are kept on the phone so the
   second scan is instant and works offline; not found or missing numbers are
   said plainly, with one screen to add it from the label, saved for next time.

   What the research said (October 2026):
   - MyFitnessPal: the scanner is fast but the entry it lands on is often a
     user-made one with the wrong product or wrong numbers, servings with no
     weight, and the better entries ranked first only for paying members.
     Gauntlet shows where every number came from and the label's serving
     with its weight, and "Wrong? Fix it from the label" replaces a bad
     entry on this phone for good.
   - MacroFactor: scanning from anywhere, then straight to the food screen to
     pick the unit and amount before adding. Gauntlet does the same, using
     the build 75 food screen.
   - Cronometer: "Type Barcode" when the camera cannot read it, and "Create
     New" from the label when the product is not found. Gauntlet has both;
     the label screen keeps the barcode, so the next scan finds it.
   - The thing people complain about most across all of them is a scan that
     does not match the packet, then having to dig to fix it. Hence the
     source on every entry and the fix one tap away.

   How the camera reads it:
   - Android Chrome has a barcode reader built in (BarcodeDetector), used
     when it reads EAN-13.
   - Every browser on an iPhone is Safari underneath, and Safari has no
     BarcodeDetector. There the scanner loads ZXing-C++ compiled to
     WebAssembly (vendor/zxing, about 1MB, 420KB compressed), only when the
     food sheet opens or the scanner is pressed, never on first open. The
     service worker keeps it, so after the first time it is there offline.
   - Frames are cropped to the middle band of the picture and read about ten
     times a second. A code counts when two reads in a row agree and its
     check digit is right (EAN-13, EAN-8, UPC-A, UPC-E), which rules out
     misreads without slowing it down noticeably.
   - The picture never leaves the phone and is never stored.

   Open Food Facts: a free, open database of packaged food (Open Database
   Licence; product data by its contributors). Only the barcode number is
   sent. Its limit is 15 product lookups a minute per person, so the app
   stops itself at 10 a minute and says so. Values are what the label says,
   per 100g or 100ml; carbohydrate is taken as on Irish and EU labels
   (without fibre). US and Canadian products (UPC codes) list carbohydrate
   with fibre in it, so their fibre is taken off: a rule of thumb, labelled. */

const SCAN_FORMATS_NATIVE=['ean_13','ean_8','upc_a','upc_e'];
const SCAN_FORMATS_ZX=['EAN13','EAN8','UPCA','UPCE'];
const OFF_URL='https://world.openfoodfacts.org/api/v2/product/';
const OFF_FIELDS='code,product_name,product_name_en,generic_name,brands,quantity,product_quantity,product_quantity_unit,serving_size,serving_quantity,serving_quantity_unit,nutrition_data_per,nutriments';
const ZX_DIR='vendor/zxing/';
const SCAN_KEEP=500;          /* products kept on the phone, oldest dropped */
const OFF_PER_MIN=10;         /* under Open Food Facts' 15 a minute */

function scanIcon(){
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>`;
}

/* ---------- barcodes ---------- */
const digitsOnly=s=>String(s||'').replace(/\D/g,'');
/* the GS1 check digit: weights 3 and 1 from the right, for 8, 12, 13 and 14 digits */
function gtinValid(code){
  const s=digitsOnly(code);
  if(!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(s)) return false;
  let sum=0;
  for(let i=s.length-2, w=3; i>=0; i--, w=w===3? 1 : 3) sum+=(+s[i])*w;
  return (10-sum%10)%10===+s[s.length-1];
}
/* UPC-E, the short US code, written out as the UPC-A it stands for */
function upceToA(e){
  const s=digitsOnly(e); if(s.length!==8) return s;
  const n=s.slice(1,7), last=+n[5];
  let core;
  if(last<=2) core=n.slice(0,2)+n[5]+'0000'+n.slice(2,5);
  else if(last===3) core=n.slice(0,3)+'00000'+n.slice(3,5);
  else if(last===4) core=n.slice(0,4)+'00000'+n[4];
  else core=n.slice(0,5)+'0000'+n[5];
  return s[0]+core+s[7];
}
/* one key per product: UPC-A becomes EAN-13 with a leading 0, as Open Food Facts keeps it */
function normCode(code,fmt){
  let s=digitsOnly(code);
  if(fmt&&/upc_?e/i.test(fmt)&&s.length===8) s=upceToA(s);
  if(s.length===12) s='0'+s;
  if(s.length===14&&s[0]==='0') s=s.slice(1);
  return s;
}
/* UPC codes (US and Canada) start with 0 once written as 13 digits */
const isUPC=code=>{ const s=digitsOnly(code); return s.length===13&&s[0]==='0'; };

/* ---------- Open Food Facts, read into one of Gauntlet's foods ---------- */
const r1=v=>Math.round(v*10)/10;
function offNumber(v){ const n=typeof v==='string'? parseFloat(v.replace(',','.')) : +v; return isFinite(n)&&n>=0? n : null; }
/* "1 bar (45 g)", "2 biscuits (25g)", "30 g", "250ml": the label's serving
   as a unit name and its weight; null when there is no weight to go on */
function parseServing(text,qty,qtyUnit){
  const t=String(text||'').trim();
  let g=offNumber(qty), unit=qtyUnit? String(qtyUnit).toLowerCase() : '';
  const par=t.match(/\(\s*(\d+(?:[.,]\d+)?)\s*(g|ml|cl|l)\s*\)/i);
  const bare=t.match(/^(\d+(?:[.,]\d+)?)\s*(g|ml|cl|l)\b/i);
  const m=par||bare;
  if(!g&&m){ g=offNumber(m[1]); unit=m[2].toLowerCase(); }
  if(unit==='cl'){ g=g*10; unit='ml'; } else if(unit==='l'){ g=g*1000; unit='ml'; }
  if(!g||g<=0||g>3000) return null;
  /* a counted serving: "1 bar", "2 biscuits" (per one), else "serving" */
  let label='serving', per=g;
  const c=t.match(/^(\d+(?:[.,]\d+)?|one|a|an)\s+([a-z][a-z \-]{1,24}?)\s*(\(|$)/i);
  if(c&&!/^(g|ml|cl|l|gram|grams|portion|portions|serving|servings)$/i.test(c[2].trim())){
    const n=/^(one|a|an)$/i.test(c[1])? 1 : offNumber(c[1]);
    if(n&&n>0&&n<=20){ let w=c[2].trim().toLowerCase(); if(n>1) w=/(kies|pies|nies|thies|gies)$/.test(w)? w.slice(0,-1) : w.replace(/ies$/,'y').replace(/(sh|ch|x)es$/,'$1').replace(/s$/,''); label=w; per=g/n; }
  }
  return {label, g:r1(per), tot:g, unit:unit==='ml'? 'ml' : 'g', text:t};
}
/* Turns an Open Food Facts product into {food} when every number needed is
   there, or {partial, missing} saying what is not. */
function offToFood(code,p){
  p=p||{}; const n=p.nutriments||{};
  const name=String(p.product_name||p.product_name_en||p.generic_name||'').trim();
  const brand=String(p.brands||'').split(',')[0].trim();
  const qtyText=String(p.quantity||'');
  const sv=parseServing(p.serving_size,p.serving_quantity,p.serving_quantity_unit);
  const liquid= /^(ml|cl|l)$/i.test(String(p.product_quantity_unit||''))
    || /\d\s*(ml|cl|l)\b/i.test(qtyText) || (sv&&sv.unit==='ml')
    || String(p.nutrition_data_per||'').toLowerCase()==='100ml';
  const per100=k=>{
    let v=offNumber(n[k+'_100g']);
    if(v===null&&sv&&sv.g>0){ const s=offNumber(n[k+'_serving']); if(s!==null) v=s/sv.tot*100; }
    return v;
  };
  let kcal=per100('energy-kcal');
  if(kcal===null){ const kj=per100('energy-kj'); if(kj!==null) kcal=kj/4.184; }
  if(kcal===null&&n.energy_unit&&/kj/i.test(n.energy_unit)){ const e=per100('energy'); if(e!==null) kcal=e/4.184; }
  const prot=per100('proteins'), carb=per100('carbohydrates'), fat=per100('fat'), fib=per100('fiber'), alc=per100('alcohol');
  const vals={kcal, p:prot, c:carb, f:fat, fb:fib};
  /* US and Canadian labels count fibre inside carbohydrate (rule of thumb on the code) */
  if(isUPC(code)&&vals.c!==null&&vals.fb!==null) vals.c=Math.max(0,vals.c-vals.fb);
  const missing=[];
  if(!name) missing.push('name');
  if(vals.kcal===null) missing.push('calories');
  if(vals.p===null) missing.push('protein');
  if(vals.c===null) missing.push('carbs');
  if(vals.f===null) missing.push('fat');
  /* numbers that cannot be per 100: more than 900 kcal, or more grams than there is food */
  const silly= (vals.kcal!==null&&vals.kcal>950) || [vals.p,vals.c,vals.f].some(v=>v!==null&&v>100) || ((vals.p||0)+(vals.c||0)+(vals.f||0)>105);
  const base={code, name, brand, m:liquid? 'ml' : 'g', sv, qty:qtyText,
    vals:{kcal:vals.kcal===null? null : Math.round(vals.kcal), p:vals.p===null? null : r1(vals.p), c:vals.c===null? null : r1(vals.c), f:vals.f===null? null : r1(vals.f), fb:vals.fb===null? null : r1(vals.fb)},
    alc: alc!==null&&alc>0? r1(alc*(liquid? 0.789 : 1)) : 0};
  if(missing.length||silly) return {partial:base, missing, silly};
  return {food:makeScanFood(base,'off')};
}
/* the stored food, from Open Food Facts or from the label */
function makeScanFood(b,src){
  const brand=String(b.brand||'').trim(), name=String(b.name||'').trim();
  const n= brand&&name.toLowerCase().indexOf(brand.toLowerCase())<0? name+', '+brand : name;
  const f={id:'bc'+b.code, code:b.code, n, brand, cat:'scanned', src,
    kcal:Math.round(+b.vals.kcal||0), p:r1(+b.vals.p||0), c:r1(+b.vals.c||0), f:r1(+b.vals.f||0),
    g:100, m:b.m==='ml'? 'ml' : 'g', u:'100'+(b.m==='ml'? 'ml' : 'g'), at:Date.now()};
  if(b.vals.fb!==null&&b.vals.fb!==undefined&&b.vals.fb!==''&&isFinite(+b.vals.fb)) f.fb=r1(+b.vals.fb);
  if(b.sv&&b.sv.g>0){ f.por=[['1 '+b.sv.label, b.sv.g]]; f.srv=b.sv.text||('1 '+b.sv.label+' ('+b.sv.g+(b.m==='ml'? 'ml' : 'g')+')'); }
  if(b.alc) f.alc=b.alc;
  if(b.qty) f.qty=String(b.qty).slice(0,40);
  return f;
}
function keepScanned(f){
  const m=Object.assign({},scannedMap()); m[f.code]=f;
  const codes=Object.keys(m);
  if(codes.length>SCAN_KEEP){ codes.sort((a,b)=>(m[a].at||0)-(m[b].at||0)).slice(0,codes.length-SCAN_KEEP).forEach(c=>{ delete m[c]; }); }
  S.scanned=m; save(); return f;
}

/* ---------- looking a barcode up: the phone first, then Open Food Facts ---------- */
let offTimes=[];
async function lookupBarcode(raw,fmt){
  const code=normCode(raw,fmt);
  if(!gtinValid(code)) return {kind:'bad', code};
  const kept=scannedMap()[code];
  if(kept){ kept.at=Date.now(); save(); return {kind:'found', code, food:kept, from:'phone'}; }
  if(typeof navigator!=='undefined'&&navigator.onLine===false) return {kind:'offline', code};
  const now=Date.now(); offTimes=offTimes.filter(t=>now-t<60000);
  if(offTimes.length>=OFF_PER_MIN) return {kind:'busy', code};
  offTimes.push(now);
  let res, json;
  const ctl=typeof AbortController!=='undefined'? new AbortController() : null;
  const timer=setTimeout(()=>{ if(ctl) ctl.abort(); },9000);
  try{
    /* a plain GET with no custom headers, so the browser sends no preflight */
    res=await fetch(OFF_URL+encodeURIComponent(code)+'.json?fields='+OFF_FIELDS,{signal:ctl? ctl.signal : undefined, credentials:'omit'});
  }catch(e){ clearTimeout(timer); return {kind:'unreachable', code}; }
  clearTimeout(timer);
  if(res.status===404) return {kind:'notfound', code};
  if(!res.ok) return {kind:'unreachable', code};
  try{ json=await res.json(); }catch(e){ return {kind:'unreachable', code}; }
  if(!json||json.status===0||json.status==='failure'||!json.product) return {kind:'notfound', code};
  const r=offToFood(code,json.product);
  if(r.food) return {kind:'found', code, food:keepScanned(r.food), from:'off'};
  return {kind:'partial', code, partial:r.partial, missing:r.missing, silly:r.silly};
}

/* ---------- the camera ---------- */
const SC={on:false, stream:null, track:null, timer:0, engine:null, last:'', lastAt:0, busy:false, typed:false, msg:'', torch:false, slot:null, day:null, gen:0};
let zxReady=null;
function nativeDetector(){
  if(typeof window==='undefined'||!('BarcodeDetector' in window)) return Promise.resolve(null);
  try{
    const BD=window.BarcodeDetector;
    const fmts=typeof BD.getSupportedFormats==='function'? BD.getSupportedFormats() : Promise.resolve(SCAN_FORMATS_NATIVE);
    return Promise.resolve(fmts).then(list=>{
      const want=SCAN_FORMATS_NATIVE.filter(f=>(list||[]).indexOf(f)>=0);
      return want.indexOf('ean_13')>=0? {kind:'native', det:new BD({formats:want})} : null;
    }).catch(()=>null);
  }catch(e){ return Promise.resolve(null); }
}
/* the WebAssembly reader, loaded once and kept */
function loadZx(){
  if(zxReady) return zxReady;
  zxReady=new Promise((ok,bad)=>{
    const done=()=>{ try{
        window.ZXingWASM.prepareZXingModule({overrides:{locateFile:(p,pre)=>p.endsWith('.wasm')? new URL(ZX_DIR+p,document.baseURI).href : pre+p}, fireImmediately:true});
        ok({kind:'zxing', zx:window.ZXingWASM});
      }catch(e){ bad(e); } };
    if(window.ZXingWASM){ done(); return; }
    const sc=document.createElement('script'); sc.src=ZX_DIR+'zxing-reader.js'; sc.async=true;
    sc.onload=done; sc.onerror=()=>bad(new Error('reader did not load'));
    document.head.appendChild(sc);
  });
  zxReady.catch(()=>{ zxReady=null; });
  return zxReady;
}
async function scanEngine(){
  if(SC.engine) return SC.engine;
  SC.engine=(await nativeDetector())||(await loadZx());
  return SC.engine;
}
/* get the iPhone reader ready in the background when the food sheet or Eat
   opens, so the first scan is not a wait (only online, not on data saver) */
function warmScanner(){
  try{
    if(SC.engine||zxReady||('BarcodeDetector' in window)) return;
    if(navigator.onLine===false||(navigator.connection&&navigator.connection.saveData)) return;
    const go2=()=>{ loadZx().catch(()=>{}); };
    if(window.requestIdleCallback) requestIdleCallback(go2,{timeout:4000}); else setTimeout(go2,1500);
  }catch(e){}
}
async function readFrame(video,canvas){
  const eng=SC.engine; if(!eng||!video.videoWidth) return null;
  /* the middle band of the picture, where the frame on screen is */
  const vw=video.videoWidth, vh=video.videoHeight;
  const cw=Math.round(vw*0.86), ch=Math.round(Math.min(vh*0.5,cw*0.6));
  const sx=Math.round((vw-cw)/2), sy=Math.round((vh-ch)/2);
  const scale=Math.min(1,960/cw), ow=Math.round(cw*scale), oh=Math.round(ch*scale);
  canvas.width=ow; canvas.height=oh;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(video,sx,sy,cw,ch,0,0,ow,oh);
  if(eng.kind==='native'){
    const r=await eng.det.detect(canvas);
    const hit=(r||[]).find(x=>x&&x.rawValue);
    return hit? {code:hit.rawValue, fmt:hit.format} : null;
  }
  const img=ctx.getImageData(0,0,ow,oh);
  const r=await eng.zx.readBarcodes(img,{formats:SCAN_FORMATS_ZX, tryHarder:true, maxNumberOfSymbols:1});
  const hit=(r||[]).find(x=>x&&x.isValid&&x.text);
  return hit? {code:hit.text, fmt:hit.format} : null;
}
/* two reads in a row that agree, with a right check digit */
function scanAgree(code,fmt){
  const c=normCode(code,fmt), now=Date.now();
  if(!gtinValid(c)){ SC.last=''; return null; }
  if(SC.last===c&&now-SC.lastAt<1500) return c;
  SC.last=c; SC.lastAt=now; return null;
}
async function scanLoop(gen){
  if(!SC.on||gen!==SC.gen||SC.busy) return;
  const v=document.getElementById('scanVideo'), cv=SC.canvas||(SC.canvas=document.createElement('canvas'));
  let found=null;
  try{ const r=await readFrame(v,cv); if(r) found=scanAgree(r.code,r.fmt); }catch(e){}
  if(!SC.on||gen!==SC.gen) return;
  if(found){ scanGot(found,'camera'); return; }
  SC.timer=setTimeout(()=>scanLoop(gen),90);
}
async function startCamera(){
  const gen=++SC.gen;
  scanStatus('Starting the camera');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    scanTyped('This browser cannot use the camera here. Type the number under the barcode instead.'); return; }
  let stream;
  try{
    const enginePromise=scanEngine();
    stream=await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:{ideal:'environment'}, width:{ideal:1920}, height:{ideal:1080}}});
    if(!SC.on||gen!==SC.gen){ stream.getTracks().forEach(t=>t.stop()); return; }
    SC.stream=stream; SC.track=stream.getVideoTracks()[0];
    const v=document.getElementById('scanVideo');
    v.setAttribute('playsinline',''); v.muted=true; v.srcObject=stream;
    try{ await v.play(); }catch(e){}
    try{ await SC.track.applyConstraints({advanced:[{focusMode:'continuous'}]}); }catch(e){}
    try{ const caps=SC.track.getCapabilities&&SC.track.getCapabilities(); const tb=document.getElementById('scanTorch'); if(tb) tb.hidden=!(caps&&caps.torch); }catch(e){}
    scanStatus(SC.engine? '' : 'Getting the scanner ready');
    await enginePromise;
    if(!SC.on||gen!==SC.gen) return;
    scanStatus('');
    scanLoop(gen);
  }catch(e){
    stopCamera();
    const n=e&&e.name;
    if(n==='NotAllowedError'||n==='SecurityError') scanTyped('The camera is blocked for Gauntlet. Allow it (on an iPhone: Settings, Apps, Safari, Camera), or type the number under the barcode.');
    else if(n==='NotFoundError'||n==='OverconstrainedError') scanTyped('No camera found. Type the number under the barcode instead.');
    else if(!SC.engine) scanTyped('The scanner could not load (it needs a connection the first time). Type the number under the barcode instead.');
    else scanTyped('The camera did not start. Type the number under the barcode instead.');
  }
}
function stopCamera(){
  SC.gen++; clearTimeout(SC.timer);
  if(SC.stream){ try{ SC.stream.getTracks().forEach(t=>t.stop()); }catch(e){} }
  SC.stream=null; SC.track=null; SC.torch=false; SC.last='';
  const v=document.getElementById('scanVideo'); if(v&&v.srcObject){ try{ v.pause(); }catch(e){} v.srcObject=null; }
}

/* ---------- the scanner screen ---------- */
function scanEl(){
  let el=document.getElementById('scan');
  if(!el){ el=document.createElement('div'); el.id='scan'; el.className='scan'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','Scan a barcode'); document.body.appendChild(el); }
  return el;
}
function drawScanner(){
  scanEl().innerHTML=`<div class="scantop">
      <button class="scanx" data-scanclose aria-label="Close the scanner"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <b>Scan a barcode</b>
      <button class="scanx" id="scanTorch" data-scantorch hidden aria-label="Torch" aria-pressed="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg></button></div>
    <div class="scanview${SC.typed? ' typed' : ''}">
      <video id="scanVideo" playsinline muted autoplay></video>
      <div class="scanframe" aria-hidden="true"><i></i></div>
      <div class="scanmsg" id="scanMsg" aria-live="polite">${escHabit(SC.msg)}</div>
    </div>
    <div class="scanfoot">${SC.typed? `<label class="scantype"><span>The number under the barcode</span>
        <input id="scanCode" inputmode="numeric" autocomplete="off" enterkeyhint="search" maxlength="18" placeholder="13 digits" aria-label="Barcode number"></label>
        <button class="sheetcta" id="scanLook">Look it up</button>
        ${navigator.mediaDevices? `<button class="skipbtn" data-scancam>Use the camera</button>` : ''}`
      : `<p class="scanhint">Hold the barcode inside the frame. It reads on its own.</p>
        <button class="skipbtn" data-scantype>Type the number instead</button>`}</div>`;
}
function scanStatus(m){ SC.msg=m||''; const el=document.getElementById('scanMsg'); if(el) el.textContent=SC.msg; }
function scanTyped(why){
  stopCamera(); SC.typed=true; SC.msg=why||''; drawScanner();
  setTimeout(()=>{ const i=document.getElementById('scanCode'); if(i) try{ i.focus({preventScroll:true}); }catch(e){} },40);
}
/* opts: slot, the meal to add to; day, a past day (from Eat) */
function openScanner(opts){
  opts=opts||{};
  SC.slot=opts.slot||(typeof foodSlot!=='undefined'? foodSlot : null);
  SC.day=opts.day||null;
  SC.on=true; SC.typed=!!opts.typed; SC.msg=''; SC.busy=false;
  drawScanner(); scanEl().classList.add('on');
  if(SC.typed) scanTyped(''); else startCamera();
}
function closeScanner(){
  if(!SC.on) return false;
  SC.on=false; stopCamera();
  const el=document.getElementById('scan'); if(el) el.classList.remove('on');
  return true;
}
/* a barcode read or typed: look it up, then the food screen or the label screen */
async function scanGot(code,how){
  if(SC.busy) return;
  SC.busy=true; stopCamera();
  try{ if(how==='camera'&&navigator.vibrate) navigator.vibrate(30); }catch(e){}
  scanStatus('Looking up '+code);
  const tl=document.getElementById('scanLook'); if(tl) tl.disabled=true;
  const r=await lookupBarcode(code);
  SC.busy=false;
  if(!SC.on) return;
  if(r.kind==='bad'){ scanTyped('That number does not check out. Look again: it is usually 13 digits under the bars.'); const i=document.getElementById('scanCode'); if(i) i.value=code; return; }
  if(r.kind==='busy'){ scanTyped('That is a lot of lookups in a minute. Give it a minute, or add this one from the label.'); return; }
  closeScanner();
  scanShowResult(r);
}
/* make sure the food sheet is up, on the right day and meal */
function scanSheet(){
  const sh=document.getElementById('foodSheet');
  if(!sh||!sh.classList.contains('on')) openFood(false,{slot:SC.slot||undefined, day:SC.day||undefined});
  else if(SC.slot) foodSlot=SC.slot;
}
function scanShowResult(r){
  scanSheet();
  if(r.kind==='found'){
    openFoodAmount(r.food.id, foodSlot, false);
    toast(r.from==='phone'? 'Found on your phone: '+r.food.n.split(',')[0] : 'Found: '+r.food.n.split(',')[0]);
    return;
  }
  drawScanLabel(r);
}

/* ---------- not found, or with gaps: add it from the label, one screen ---------- */
let scanForm=null;
function drawScanLabel(r){
  const p=r.partial||{}, v=p.vals||{}, kept=r.edit? scannedMap()[r.code] : null;
  const k=kept||{};
  scanForm={code:r.code, m:p.m||k.m||'g', from:r.kind, edit:!!r.edit};
  foodAdding=true; foodAmt=null;
  const sh=$('foodSheet'); if(sh){ sh.classList.add('amtmode'); sh.scrollTop=0; }
  const why={
    notfound:'Open Food Facts does not have this one yet. Add it from the label once and the next scan finds it, on this phone.',
    partial:'Open Food Facts has this one, but without '+listWords(r.missing||[])+'. Fill in what is missing from the label and it is kept for next time.',
    unreachable:'Open Food Facts could not be reached just now. Add it from the label, or go back and try again in a moment.',
    offline:'No connection, so Open Food Facts cannot be checked. Add it from the label now, or scan it again when you are online.',
    edit:'Change anything that does not match the packet. Your numbers replace these on this phone.'
  }[r.edit? 'edit' : r.kind]||'';
  const silly=r.silly? ' Some of its numbers cannot be right per 100'+(scanForm.m)+', so check them against the packet.' : '';
  const val=(x,y)=>{ const z=x!==null&&x!==undefined&&x!==''? x : y; return z===null||z===undefined? '' : String(z); };
  const svText=p.sv? p.sv : (k.por? {label:String(k.por[0][0]).replace(/^1 /,''), g:k.por[0][1]} : null);
  const fld=(id,label,value,ph,miss)=>`<div class="nf${miss? ' miss' : ''}"><label for="${id}">${label}${miss? ' <span class="needmark">missing</span>' : ''}</label><input id="${id}" type="text" inputmode="decimal" autocomplete="off" value="${escHabit(value)}" placeholder=""></div>`;
  const miss=x=>(r.missing||[]).indexOf(x)>=0;
  $('foodBody').innerHTML=`<div class="scanlabel" role="group" aria-label="Add it from the label">
    <div class="aqtop"><button class="inlinebtn amtback" data-scanback>‹ Back</button>
      ${r.kind==='unreachable'||r.kind==='offline'? `<button class="inlinebtn" data-scanretry="${escHabit(r.code)}">Try again</button>` : ''}</div>
    <div class="famthead"><b>${r.edit? 'Fix it from the label' : 'Add it from the label'}</b><small>Barcode ${escHabit(r.code)}</small></div>
    <div class="note scanwhy">${why}${silly}</div>
    <div class="nf${miss('name')? ' miss' : ''}" style="margin-bottom:10px"><label for="slName">What is it${miss('name')? ' <span class="needmark">missing</span>' : ''}</label>
      <input id="slName" autocomplete="off" value="${escHabit(val(p.name,k.n&&k.brand? k.n.replace(', '+k.brand,'') : k.n))}" placeholder="As on the packet"></div>
    <div class="nf" style="margin-bottom:10px"><label for="slBrand">Brand <small>optional</small></label>
      <input id="slBrand" autocomplete="off" value="${escHabit(val(p.brand,k.brand))}" placeholder=""></div>
    <div class="slper"><span>The label's numbers are per</span>
      <div class="pickchips" role="radiogroup" aria-label="Per">${['g','ml'].map(u=>`<button role="radio" aria-checked="${scanForm.m===u}" class="${scanForm.m===u?'on':''}" data-slper="${u}">100${u}</button>`).join('')}</div></div>
    <div class="slgrid">${fld('slKcal','Calories (kcal)',val(v.kcal,k.kcal),'250',miss('calories'))}${fld('slP','Protein g',val(v.p,k.p),'8',miss('protein'))}</div>
    <div class="slgrid">${fld('slC','Carbohydrate g',val(v.c,k.c),'40',miss('carbs'))}${fld('slF','Fat g',val(v.f,k.f),'3',miss('fat'))}</div>
    <div class="slgrid">${fld('slFb','Fibre g <small>optional</small>',val(v.fb,k.fb),'6',false)}<div></div></div>
    <div class="slsrv"><span>One serving on the label <small>optional</small></span>
      <div class="slgrid"><div class="nf"><label for="slSrvName">Called</label><input id="slSrvName" autocomplete="off" value="${escHabit(svText? svText.label : '')}" placeholder="slice, bar"></div>
        <div class="nf"><label for="slSrvG" id="slSrvU">Weighs ${scanForm.m}</label><input id="slSrvG" type="text" inputmode="decimal" autocomplete="off" value="${escHabit(svText? String(svText.g) : '')}" placeholder=""></div></div></div>
    <div class="note">Use the per 100g (or 100ml) column of the label. Carbohydrate as printed on Irish and EU labels.</div>
    <button class="sheetcta" id="slSave">Save it and choose how much</button>
  </div>`;
}
function listWords(a){ return a.length<2? (a[0]||'some numbers') : a.slice(0,-1).join(', ')+' and '+a[a.length-1]; }
function saveScanLabel(){
  const f0=scanForm; if(!f0) return;
  const v=id=>{ const el=document.getElementById(id); return el? el.value.trim() : ''; };
  const numv=id=>{ const s=v(id).replace(',','.'); if(s==='') return null; const n=parseFloat(s); return isFinite(n)&&n>=0? n : NaN; };
  const name=v('slName'), kcal=numv('slKcal'), p=numv('slP'), c=numv('slC'), fa=numv('slF'), fb=numv('slFb');
  const need=[]; if(!name) need.push('a name');
  [['calories',kcal],['protein',p],['carbohydrate',c],['fat',fa]].forEach(([w,x])=>{ if(x===null||isNaN(x)) need.push(w); });
  if(need.length){ toast('It needs '+listWords(need)+' from the label'); return; }
  if(kcal>950||p>100||c>100||fa>100||p+c+fa>105){ toast('Those cannot all be per 100'+f0.m+'. Check the label'); return; }
  if(fb!==null&&(isNaN(fb)||fb>100)){ toast('Check the fibre'); return; }
  const sg=numv('slSrvG'), sn=v('slSrvName');
  const sv= sg&&sg>0&&sg<=3000? {label:(sn||'serving').toLowerCase().replace(/^(1|one|a|an)\s+/,'').slice(0,24), g:r1(sg)} : null;
  const old=scannedMap()[f0.code];
  const food=makeScanFood({code:f0.code, name, brand:v('slBrand'), m:f0.m, sv,
    vals:{kcal, p, c, f:fa, fb}, alc:old&&old.alc||0, qty:old&&old.qty||''},'label');
  if(sv) food.srv='1 '+sv.label+' ('+amtNum(sv.g)+f0.m+')';
  keepScanned(food);
  /* a fix changes this phone's copy for what comes next; entries already
     logged keep the numbers they were logged with */
  scanForm=null; foodAdding=false;
  openFoodAmount(food.id, foodSlot, false);
  toast(f0.edit? 'Saved. The next scan uses your numbers' : 'Saved. The next scan finds it');
}

/* ---------- wiring ---------- */
document.addEventListener('click',e=>{
  if(e.target.closest('[data-scan]')){ openScanner({slot:foodSlot, day:typeof foodDay!=='undefined'? foodDay : null}); return; }
  if(e.target.closest('[data-eatscan]')){
    const day= typeof eatKey==='function'&&eatKey()!==todayKey()? eatKey() : null;
    openScanner({slot:typeof eatSlot==='function'? eatSlot() : slotNow(), day}); return; }
  if(e.target.closest('[data-scanclose]')){ closeScanner(); return; }
  if(e.target.closest('[data-scantype]')){ scanTyped(''); return; }
  if(e.target.closest('[data-scancam]')){ SC.typed=false; SC.msg=''; drawScanner(); startCamera(); return; }
  if(e.target.closest('[data-scantorch]')){
    if(!SC.track) return; SC.torch=!SC.torch;
    SC.track.applyConstraints({advanced:[{torch:SC.torch}]}).catch(()=>{ SC.torch=false; });
    const b=document.getElementById('scanTorch'); if(b) b.setAttribute('aria-pressed',String(SC.torch)); return; }
  if(e.target.closest('#scanLook')){ const i=document.getElementById('scanCode'); const c=digitsOnly(i&&i.value);
    if(c.length<8){ scanStatus('Type all the digits under the barcode, usually 13.'); return; }
    scanGot(c,'typed'); return; }
  const sp=e.target.closest('[data-slper]');
  if(sp&&scanForm){ scanForm.m=sp.dataset.slper; document.querySelectorAll('[data-slper]').forEach(b=>{ const on=b.dataset.slper===scanForm.m; b.classList.toggle('on',on); b.setAttribute('aria-checked',on); });
    const u=document.getElementById('slSrvU'); if(u) u.textContent='Weighs '+scanForm.m; return; }
  if(e.target.closest('#slSave')){ saveScanLabel(); return; }
  if(e.target.closest('[data-scanback]')){ scanForm=null; foodAdding=false; foodAmt=null; drawFood(); return; }
  const rt=e.target.closest('[data-scanretry]');
  if(rt){ const code=rt.dataset.scanretry; scanForm=null; foodAdding=false;
    lookupBarcode(code).then(r=>{
      if(r.kind==='found'){ openFoodAmount(r.food.id,foodSlot,false); toast('Found: '+r.food.n.split(',')[0]); }
      else drawScanLabel(r); });
    return; }
  const ed=e.target.closest('[data-scanedit]');
  if(ed){ drawScanLabel({kind:'partial', code:ed.dataset.scanedit, edit:true, missing:[]}); return; }
});
document.addEventListener('keydown',e=>{
  if(!SC.on) return;
  if(e.key==='Escape'){ closeScanner(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if(e.key==='Enter'&&e.target&&e.target.id==='scanCode'){ const b=document.getElementById('scanLook'); if(b) b.click(); e.preventDefault(); }
},true);
/* the camera is let go when the app goes to the background, and comes back with it */
document.addEventListener('visibilitychange',()=>{
  if(!SC.on||SC.typed) return;
  if(document.hidden) stopCamera(); else if(!SC.busy) startCamera();
});
document.addEventListener('click',e=>{ if(e.target.closest('[data-eatsearch],[data-eatadd],#foodBtn')) warmScanner(); },true);

if(window.__G){
  Object.assign(window.__G,{gtinValid,normCode,upceToA,isUPC,parseServing,offToFood,makeScanFood,keepScanned,lookupBarcode,
    openScanner,closeScanner,scanGot,scanShowResult,drawScanLabel,saveScanLabel,scannedFoods,scannedMap,scanServing,isScanned,
    scanAgree,warmScanner,loadZx,OFF_URL,OFF_FIELDS,ZX_DIR});
  Object.defineProperty(window.__G,'SC',{get:()=>SC,configurable:true});
  Object.defineProperty(window.__G,'offTimes',{get:()=>offTimes,set:v=>{offTimes=v;},configurable:true});
}
