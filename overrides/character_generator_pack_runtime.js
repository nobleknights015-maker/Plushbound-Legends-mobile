/* Plushbound World Editor Character Generator Pack Runtime v1
 * Imports the approved RPG Maker-style Plushbound generator ZIP directly in-browser,
 * stores its PNG layers in IndexedDB, exposes a deterministic NPC builder UI,
 * and renders TV/FG/TVD/SV outputs without baking clothes into base bodies.
 */
(() => {
  'use strict';

  const EXPECTED_SHA256 = '01e89432b8681206422fba05be6fd9e302afe8e2ee27ee8a7c872c3ede875783';
  const PACK_ID = 'plushbound-character-creator-full-outfits-glasses-only-v1';
  const DB_NAME = 'plushbound-world-editor';
  const DB_VERSION = 1;
  const ASSET_STORE = 'characterGeneratorAssets';
  const META_STORE = 'characterGeneratorMeta';
  const FAMILY_DIMS = { TV:[144,192], Face:[144,144], TVD:[144,48], SV:[576,384] };
  const PREFIX = { TV:'TV', Face:'FG', TVD:'TVD', SV:'SV' };
  const GENDERS = ['Female','Male','Kid'];
  const SELECTORS = ['Clothing','FrontHair','RearHair','Face','Eyes','Eyebrows','Mouth','Nose','Ears','FacialMark','Glasses','Beard'];
  const CATEGORY_ALIASES = {
    Clothing: {TV:['Clothing1','Clothing2'], Face:['Clothing1','Clothing2'], TVD:['Clothing'], SV:['Clothing1','Clothing2']},
    FrontHair: {TV:['FrontHair1','FrontHair2'], Face:['FrontHair'], TVD:['FrontHair'], SV:['FrontHair']},
    RearHair: {TV:['RearHair1','RearHair2'], Face:['RearHair1','RearHair2'], TVD:['RearHair'], SV:['RearHair1','RearHair']},
    Beard: {TV:['Beard1','Beard2'], Face:['Beard'], TVD:['Beard'], SV:['Beard']},
    Face: {Face:['Face']}, Eyes:{Face:['Eyes']}, Eyebrows:{Face:['Eyebrows']}, Mouth:{Face:['Mouth']}, Nose:{Face:['Nose']},
    Ears:{TV:['Ears'],Face:['Ears'],TVD:['Ears'],SV:['Ears']}, FacialMark:{TV:['FacialMark'],Face:['FacialMark'],TVD:['FacialMark'],SV:['FacialMark']},
    Glasses:{TV:['Glasses'],Face:['Glasses'],TVD:['Glasses'],SV:['Glasses']}
  };
  const DRAW_ORDER = ['RearHair','Body','Ears','Face','Eyes','Eyebrows','Nose','Mouth','FacialMark','Beard','Clothing','FrontHair','Glasses'];

  function fail(msg){ throw new Error(`Character Generator rejected: ${msg}`); }
  function hex(buf){ return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join(''); }
  async function sha256(buf){ return hex(await crypto.subtle.digest('SHA-256', buf)); }

  function openDb(){
    return new Promise((resolve,reject)=>{
      const r=indexedDB.open(DB_NAME,DB_VERSION);
      r.onupgradeneeded=()=>{
        const db=r.result;
        if(!db.objectStoreNames.contains(ASSET_STORE)) db.createObjectStore(ASSET_STORE,{keyPath:'path'});
        if(!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE,{keyPath:'key'});
      };
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
    });
  }
  async function idbGet(store,key){ const db=await openDb(); return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly'); const r=tx.objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}); }
  async function idbPutMany(store,rows){
    const db=await openDb();
    for(let i=0;i<rows.length;i+=100){
      const chunk=rows.slice(i,i+100);
      await new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite'); const s=tx.objectStore(store); chunk.forEach(x=>s.put(x)); tx.oncomplete=res;tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});
    }
  }
  async function idbClear(store){ const db=await openDb(); return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite'); const r=tx.objectStore(store).clear();r.onsuccess=res;r.onerror=()=>rej(r.error);}); }

  function findEocd(bytes){
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--) if(bytes[i]===0x50&&bytes[i+1]===0x4b&&bytes[i+2]===0x05&&bytes[i+3]===0x06) return i;
    fail('ZIP end-of-central-directory not found');
  }
  function u16(v,o){ return v.getUint16(o,true); } function u32(v,o){ return v.getUint32(o,true); }
  function parseZip(buffer){
    const bytes=new Uint8Array(buffer), view=new DataView(buffer), e=findEocd(bytes); const count=u16(view,e+10), cdOffset=u32(view,e+16); let p=cdOffset; const dec=new TextDecoder('utf-8'); const out=[];
    for(let i=0;i<count;i++){
      if(u32(view,p)!==0x02014b50) fail(`bad central-directory signature at ${p}`);
      const flags=u16(view,p+8), method=u16(view,p+10), crc=u32(view,p+16), csize=u32(view,p+20), usize=u32(view,p+24), nlen=u16(view,p+28), xlen=u16(view,p+30), clen=u16(view,p+32), local=u32(view,p+42);
      const name=dec.decode(bytes.slice(p+46,p+46+nlen)); out.push({name,flags,method,crc,csize,usize,local}); p+=46+nlen+xlen+clen;
    }
    return out;
  }
  async function inflateEntry(buffer,e){
    const view=new DataView(buffer), bytes=new Uint8Array(buffer); if(u32(view,e.local)!==0x04034b50) fail(`bad local header for ${e.name}`);
    const nlen=u16(view,e.local+26), xlen=u16(view,e.local+28), start=e.local+30+nlen+xlen, raw=bytes.slice(start,start+e.csize);
    if(e.method===0) return raw;
    if(e.method!==8) fail(`${e.name}: unsupported ZIP method ${e.method}`);
    const ds=new DecompressionStream('deflate-raw'); const ab=await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer(); const out=new Uint8Array(ab);
    if(out.byteLength!==e.usize) fail(`${e.name}: decompressed size mismatch`); return out;
  }

  function parseGeneratorName(path){
    const m=path.match(/\/Generator\/(Face|TV|TVD|SV|Variation)\/(Female|Male|Kid)\/([^/]+\.png)$/i); if(!m) return null;
    const family=m[1], gender=m[2], file=m[3];
    if(family==='Variation'){
      const v=file.match(/^icon_([A-Za-z0-9]+)_p(\d+)\.png$/i); return v?{family,gender,file,category:v[1],part:Number(v[2]),icon:true}:null;
    }
    const prefix=PREFIX[family]; const r=file.match(new RegExp(`^${prefix}_([A-Za-z0-9]+)_p(\\d+)(?:_c(\\d*))?(?:_m(\\d+))?\\.png$`,'i')); if(!r) return null;
    return {family,gender,file,category:r[1],part:Number(r[2]),color:r[3]===undefined?null:r[3],mask:r[4]||null,icon:false};
  }
  function buildCatalog(entries){
    const assets={}, options={Female:{},Male:{},Kid:{}}; let pngCount=0;
    for(const e of entries){
      const p=parseGeneratorName(e.name); if(!p) continue; pngCount++; assets[e.name]={...p,path:e.name,usize:e.usize};
      if(p.icon){ (options[p.gender][p.category] ||= []).push({part:p.part,path:e.name}); }
    }
    for(const g of GENDERS) for(const k of Object.keys(options[g])) options[g][k].sort((a,b)=>a.part-b.part);
    return {schema:'plushbound.world_editor.generator_pack_catalog.v1',version:1,packId:PACK_ID,sourceSha256:EXPECTED_SHA256,pngCount,assets,options};
  }

  async function importPack(file,onProgress){
    const buffer=await file.arrayBuffer(); const digest=await sha256(buffer); if(digest!==EXPECTED_SHA256) fail(`unexpected pack SHA-256 ${digest}`);
    const entries=parseZip(buffer).filter(e=>e.name.toLowerCase().endsWith('.png'));
    const catalog=buildCatalog(entries); if(catalog.pngCount!==2050) fail(`expected 2050 generator PNGs, found ${catalog.pngCount}`);
    await idbClear(ASSET_STORE); const rows=[];
    for(let i=0;i<entries.length;i++){
      const e=entries[i]; const data=await inflateEntry(buffer,e); rows.push({path:e.name,blob:new Blob([data],{type:'image/png'}),usize:e.usize});
      if(rows.length>=100){ await idbPutMany(ASSET_STORE,rows.splice(0)); }
      if(onProgress && (i%25===0||i===entries.length-1)) onProgress(i+1,entries.length,e.name);
    }
    if(rows.length) await idbPutMany(ASSET_STORE,rows);
    await idbPutMany(META_STORE,[{key:'pack',packId:PACK_ID,sha256:digest,catalog,importedAt:new Date().toISOString()}]); return catalog;
  }
  async function getCatalog(){ const m=await idbGet(META_STORE,'pack'); return m&&m.catalog||null; }
  async function assetBlob(path){ const r=await idbGet(ASSET_STORE,path); if(!r||!r.blob) fail(`missing imported asset ${path}`); return r.blob; }
  async function drawPath(ctx,path,w,h){ const b=await assetBlob(path); const bmp=await createImageBitmap(b); if(bmp.width!==w||bmp.height!==h){bmp.close();fail(`${path}: ${bmp.width}x${bmp.height} expected ${w}x${h}`);} ctx.drawImage(bmp,0,0);bmp.close(); }

  function categoriesFor(selector,family){ return (CATEGORY_ALIASES[selector]&&CATEGORY_ALIASES[selector][family])||[]; }
  function chooseAssetPaths(catalog,family,gender,category,part){
    const rows=Object.values(catalog.assets).filter(a=>!a.icon&&a.family===family&&a.gender===gender&&a.category.toLowerCase()===category.toLowerCase()&&a.part===Number(part));
    if(family==='Face') return rows.sort((a,b)=>(Number(a.color||0)-Number(b.color||0))||(Number(a.mask||0)-Number(b.mask||0))).map(a=>a.path);
    return rows.filter(a=>a.color===null).sort((a,b)=>a.path.localeCompare(b.path)).map(a=>a.path);
  }
  function recipePaths(catalog,recipe,family){
    const out=[]; const gender=recipe.gender;
    const bodyCats=family==='SV'?['body']:['Body'];
    for(const c of bodyCats) out.push(...chooseAssetPaths(catalog,family,gender,c,1));
    for(const selector of DRAW_ORDER){
      if(selector==='Body') continue; const part=recipe.selections[selector]; if(part===undefined||part===null||part==='') continue;
      for(const cat of categoriesFor(selector,family)) out.push(...chooseAssetPaths(catalog,family,gender,cat,part));
    }
    return out;
  }
  async function renderRecipe(recipe,family,canvas){
    const catalog=await getCatalog(); if(!catalog) fail('generator pack not imported'); if(!GENDERS.includes(recipe.gender)) fail('invalid gender/body set');
    const dims=FAMILY_DIMS[family]; if(!dims) fail('invalid output family'); canvas.width=dims[0];canvas.height=dims[1]; const ctx=canvas.getContext('2d');ctx.clearRect(0,0,...dims);
    const paths=recipePaths(catalog,recipe,family); if(!paths.length) fail(`no ${family} layers resolve for recipe`); for(const p of paths) await drawPath(ctx,p,...dims);
    return {schema:'plushbound.world_editor.character_generator_recipe.v1',version:1,characterId:recipe.characterId,displayName:recipe.displayName||recipe.characterId,gender:recipe.gender,selections:{...recipe.selections},family,orderedSourceLayers:paths,packId:PACK_ID,sourceSha256:EXPECTED_SHA256,deterministic:true,failClosed:true};
  }
  function optionParts(catalog,gender,selector){ return ((catalog.options[gender]||{})[selector]||[]).map(x=>x.part); }
  function randomRecipe(catalog,gender){ const selections={}; for(const s of SELECTORS){const parts=optionParts(catalog,gender,s);if(parts.length&&(!['Glasses','FacialMark','Beard'].includes(s)||Math.random()<0.45))selections[s]=parts[Math.floor(Math.random()*parts.length)];} return {characterId:`npc-${Date.now()}`,displayName:'Generated NPC',gender,selections}; }
  function downloadBlob(blob,name){ const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500); }

  function addUi(){
    if(document.getElementById('pb-npc-generator-button')) return;
    const css=document.createElement('style');css.textContent=`#pb-npc-generator-button{position:fixed;right:14px;bottom:14px;z-index:2147483000;padding:10px 14px;border:0;border-radius:12px;background:#202431;color:#fff;font:600 14px system-ui;box-shadow:0 4px 18px #0006}.pb-npc-modal{position:fixed;inset:0;z-index:2147483001;background:#0009;display:grid;place-items:center;padding:12px}.pb-npc-panel{width:min(980px,96vw);max-height:94vh;overflow:auto;background:#171a22;color:#eee;border:1px solid #ffffff26;border-radius:16px;padding:16px;font:14px system-ui}.pb-npc-grid{display:grid;grid-template-columns:minmax(260px,1fr) minmax(260px,1fr);gap:14px}.pb-npc-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pb-npc-controls label{display:grid;gap:4px}.pb-npc-controls select,.pb-npc-controls input,.pb-npc-panel button{background:#252a36;color:#fff;border:1px solid #ffffff26;border-radius:8px;padding:8px}.pb-npc-preview{display:grid;place-items:center;min-height:320px;background:#0d0f14;border-radius:12px}.pb-npc-preview canvas{image-rendering:pixelated;max-width:100%;max-height:60vh}.pb-npc-status{white-space:pre-wrap;color:#cfd6e6;margin:8px 0}.pb-npc-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}@media(max-width:700px){.pb-npc-grid{grid-template-columns:1fr}.pb-npc-controls{grid-template-columns:1fr 1fr}}`;
    document.head.appendChild(css);
    const btn=document.createElement('button');btn.id='pb-npc-generator-button';btn.textContent='NPC Generator';document.body.appendChild(btn);
    btn.onclick=async()=>{
      const wrap=document.createElement('div');wrap.className='pb-npc-modal';wrap.innerHTML=`<div class="pb-npc-panel"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h2 style="margin:0">World Editor NPC Generator</h2><button data-close>Close</button></div><div class="pb-npc-status">Checking generator pack…</div><div class="pb-npc-grid"><div><input data-pack type="file" accept=".zip,application/zip"><div class="pb-npc-controls" data-controls></div><div class="pb-npc-actions"><button data-random>Randomize NPC</button><button data-render>Render</button><button data-savepng>Save PNG</button><button data-saverecipe>Save Recipe</button></div></div><div class="pb-npc-preview"><canvas></canvas></div></div></div>`;document.body.appendChild(wrap);
      const status=wrap.querySelector('.pb-npc-status'), controls=wrap.querySelector('[data-controls]'), canvas=wrap.querySelector('canvas'); let catalog=await getCatalog();
      const state={gender:'Female',family:'TV',characterId:`npc-${Date.now()}`,displayName:'Generated NPC',selections:{}};
      function rebuild(){ controls.innerHTML='';
        const mk=(name,opts,val,cb)=>{const l=document.createElement('label');l.textContent=name;const s=document.createElement('select');for(const [v,t] of opts){const o=document.createElement('option');o.value=v;o.textContent=t;s.appendChild(o);}s.value=String(val??'');s.onchange=()=>cb(s.value);l.appendChild(s);controls.appendChild(l);};
        mk('Body set',GENDERS.map(x=>[x,x]),state.gender,v=>{state.gender=v;state.selections={};rebuild();});mk('Output',[['TV','Overworld'],['Face','Portrait'],['TVD','Down/Damaged'],['SV','Side-view Battler']],state.family,v=>state.family=v);
        if(!catalog) return; for(const sel of SELECTORS){const parts=optionParts(catalog,state.gender,sel);if(!parts.length)continue;const opts=[['','None'],...parts.map(p=>[p,`${sel} ${String(p).padStart(2,'0')}`])];mk(sel,opts,state.selections[sel]??'',v=>{if(v!=='')state.selections[sel]=Number(v);else delete state.selections[sel];});}
      }
      async function doRender(){try{status.textContent='Rendering…';const m=await renderRecipe(state,state.family,canvas);status.textContent=`PASS • ${m.orderedSourceLayers.length} layers • ${state.family} ${canvas.width}×${canvas.height}`;return m;}catch(e){status.textContent=e.message;throw e;}}
      wrap.querySelector('[data-close]').onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove();};
      wrap.querySelector('[data-pack]').onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{status.textContent='Validating ZIP…';catalog=await importPack(f,(a,b,n)=>status.textContent=`Importing ${a}/${b}\n${n}`);status.textContent=`PASS • ${catalog.pngCount} PNGs imported • pack locked by SHA-256`;rebuild();}catch(err){status.textContent=err.message;}};
      wrap.querySelector('[data-random]').onclick=()=>{if(!catalog){status.textContent='Import the approved creator ZIP first.';return;}Object.assign(state,randomRecipe(catalog,state.gender));rebuild();doRender().catch(()=>{});};
      wrap.querySelector('[data-render]').onclick=()=>doRender().catch(()=>{});
      wrap.querySelector('[data-savepng]').onclick=async()=>{try{await doRender();canvas.toBlob(b=>downloadBlob(b,`${state.characterId}-${state.family}.png`),'image/png');}catch{}};
      wrap.querySelector('[data-saverecipe]').onclick=async()=>{try{const m=await doRender();downloadBlob(new Blob([JSON.stringify(m,null,2)],{type:'application/json'}),`${state.characterId}.character-recipe.json`);}catch{}};
      status.textContent=catalog?`PASS • ${catalog.pngCount} PNGs installed • ${PACK_ID}`:'Generator pack not installed. Select Plushbound_Character_Creator_Full_Outfits_Glasses_Only.zip once; it will be stored locally.';rebuild();
    };
  }

  window.PlushboundCharacterPack = Object.freeze({PACK_ID,EXPECTED_SHA256,importPack,getCatalog,renderRecipe,randomRecipe,optionParts,recipePaths});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addUi,{once:true}); else addUi();
})();
