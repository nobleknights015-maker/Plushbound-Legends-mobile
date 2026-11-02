/* Plushbound World Editor MV-accurate Character Generator v2
 * Replaces category-flattened assembly with RPG Maker MV's documented per-family layer order.
 * Uses the approved creator ZIP already imported into IndexedDB by v1.
 */
(() => {
  'use strict';

  const PACK_ID = 'plushbound-character-creator-full-outfits-glasses-only-v1';
  const EXPECTED_SHA256 = '01e89432b8681206422fba05be6fd9e302afe8e2ee27ee8a7c872c3ede875783';
  const DB_NAME = 'plushbound-world-editor';
  const DB_VERSION = 1;
  const ASSET_STORE = 'characterGeneratorAssets';
  const META_STORE = 'characterGeneratorMeta';
  const GRADIENT_PATH = 'character creator/Generator/gradients.png';
  const DIMS = { TV:[144,192], Face:[144,144], TVD:[144,48], SV:[576,384] };
  const GENDERS = ['Female','Male','Kid'];

  const TOP_TO_BOTTOM = {
    TV:['Wing1','AccB','FrontHair1','AccA','RearHair1','Glasses','BeastEars','Cloak1','Tail1','Clothing1','Beard1','Clothing2','RearHair2','FacialMark','Body','Beard2','FrontHair2','Tail2','Cloak2','Wing2'],
    TVD:['AccB','FrontHair','AccA','BeastEars','RearHair','Wing','Glasses','Cloak','Tail','Beard','Clothing','FacialMark','Body'],
    SV:['AccB','FrontHair','AccA','Glasses','BeastEars','Cloak1','Clothing1','Beard','Clothing2','RearHair1','FacialMark','Body','Tail','Cloak2','Wing'],
    Face:['AccB:c1','AccB:c2','AccB:c3','AccB:c4','Glasses:c1','Glasses:c2','Glasses:c3','FrontHair:c1','Cloak1:c1','AccA:c1','AccA:c2','AccA:c3','BeastEars:c1','Beard:c1','Clothing1:c1','Clothing1:c2','Ears:c1','RearHair1:c1','RearHair1:c2','Eyebrows:c1','Eyebrows:c2','Eyes:c1','Eyes:c2','FacialMark:c1','Nose:c1','Mouth:c1','Mouth:c2','Mouth:c3','Face:c1','Clothing2:c3','Clothing2:c4','Clothing2:c5','Clothing2:c6','Body:c1','Cloak2:c1','Cloak2:c2','RearHair2:c1']
  };

  const SELECTOR_FOR = {
    Clothing1:'Clothing',Clothing2:'Clothing',Clothing:'Clothing',
    FrontHair1:'FrontHair',FrontHair2:'FrontHair',FrontHair:'FrontHair',
    RearHair1:'RearHair',RearHair2:'RearHair',RearHair:'RearHair',
    Beard1:'Beard',Beard2:'Beard',Beard:'Beard',
    Face:'Face',Eyes:'Eyes',Eyebrows:'Eyebrows',Mouth:'Mouth',Nose:'Nose',Ears:'Ears',
    FacialMark:'FacialMark',Glasses:'Glasses'
  };

  const MASK_REFS = {
    1:'F9C19D',2:'2C80CB',3:'FCCB0A',4:'B892C5',5:'009296',6:'D3CEC7',7:'AE8682',8:'FE9D1E',
    9:'1C76D0',10:'D9A404',11:'D8AC00',12:'A30708',13:'D3CEC2',14:'DA346E',15:'A4C911',
    16:'C78407',17:'C0D3D2',18:'4155B6',19:'BA3B45',20:'999999',21:'CCBAD2',22:'607E4B'
  };

  function fail(msg){ throw new Error(`Character Generator v2 rejected: ${msg}`); }

  function openDb(){
    return new Promise((resolve,reject)=>{
      const r=indexedDB.open(DB_NAME,DB_VERSION);
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
    });
  }
  async function idbGet(store,key){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,'readonly'), r=tx.objectStore(store).get(key);
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
    });
  }
  async function getCatalog(){
    const m=await idbGet(META_STORE,'pack');
    if(!m || !m.catalog) return null;
    if(m.packId!==PACK_ID || m.sha256!==EXPECTED_SHA256) fail('installed generator pack does not match approved fingerprint');
    return m.catalog;
  }
  async function assetBlob(path){
    const row=await idbGet(ASSET_STORE,path);
    if(!row || !row.blob) fail(`missing imported asset ${path}`);
    return row.blob;
  }

  function layerPart(recipe, layer){
    if(layer==='Body' || layer==='body') return 1;
    const selector=SELECTOR_FOR[layer];
    if(!selector) return null;
    const v=recipe.selections && recipe.selections[selector];
    return (v===undefined || v===null || v==='') ? null : Number(v);
  }

  function assetRows(catalog,family,gender,layer,part,child){
    return Object.values(catalog.assets).filter(a=>{
      if(a.icon || a.family!==family || a.gender!==gender) return false;
      if(String(a.category).toLowerCase()!==String(layer).toLowerCase() || Number(a.part)!==Number(part)) return false;
      if(family==='Face') return Number(a.color||0)===Number(child||0);
      return a.color===null;
    }).sort((a,b)=>a.path.localeCompare(b.path));
  }

  function orderedRows(catalog,recipe,family){
    const out=[];
    const order=TOP_TO_BOTTOM[family];
    if(!order) fail(`unsupported family ${family}`);
    for(const spec of [...order].reverse()){
      const [layer,childText]=spec.split(':c');
      const part=layerPart(recipe,layer);
      if(part===null) continue;
      const child=childText ? Number(childText) : null;
      out.push(...assetRows(catalog,family,recipe.gender,layer,part,child));
    }
    return out;
  }

  async function bitmapFromBlob(blob){ return createImageBitmap(blob); }
  function hexRgb(hex){ const n=parseInt(hex,16); return [(n>>16)&255,(n>>8)&255,n&255]; }

  async function gradientInfo(){
    const blob=await assetBlob(GRADIENT_PATH);
    const bmp=await bitmapFromBlob(blob);
    const c=document.createElement('canvas'); c.width=bmp.width; c.height=bmp.height;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0);bmp.close();
    const data=ctx.getImageData(0,0,c.width,c.height);
    const rows={};
    for(const [k,h] of Object.entries(MASK_REFS)){
      const target=hexRgb(h); let bestY=0,best=Infinity;
      for(let y=0;y<c.height;y++){
        for(let x=0;x<c.width;x+=2){
          const i=(y*c.width+x)*4,dr=data.data[i]-target[0],dg=data.data[i+1]-target[1],db=data.data[i+2]-target[2];
          const d=dr*dr+dg*dg+db*db;
          if(d<best){best=d;bestY=y;}
        }
      }
      rows[Number(k)]=bestY;
    }
    return {data,rows,width:c.width,height:c.height};
  }
  let gradientPromise=null;
  function gradients(){ return gradientPromise ||= gradientInfo(); }

  async function recolourFaceLayer(blob,maskNumber,w,h){
    const bmp=await bitmapFromBlob(blob);
    if(bmp.width!==w||bmp.height!==h){bmp.close();fail(`face layer ${bmp.width}x${bmp.height}; expected ${w}x${h}`);}
    const src=document.createElement('canvas');src.width=w;src.height=h;const sctx=src.getContext('2d',{willReadFrequently:true});sctx.drawImage(bmp,0,0);bmp.close();
    if(!maskNumber) return src;
    const im=sctx.getImageData(0,0,w,h), g=await gradients(), row=g.rows[maskNumber];
    if(row===undefined) return src;
    for(let p=0;p<im.data.length;p+=4){
      if(im.data[p+3]===0) continue;
      const gray=im.data[p];
      const x=Math.max(0,Math.min(g.width-1,255-gray));
      const gi=(row*g.width+x)*4;
      im.data[p]=g.data.data[gi];im.data[p+1]=g.data.data[gi+1];im.data[p+2]=g.data.data[gi+2];
    }
    sctx.putImageData(im,0,0);
    return src;
  }

  async function drawRow(ctx,row,w,h){
    const blob=await assetBlob(row.path);
    if(row.family==='Face'){
      const layer=await recolourFaceLayer(blob,row.mask ? Number(row.mask) : null,w,h);
      ctx.drawImage(layer,0,0); return;
    }
    const bmp=await bitmapFromBlob(blob);
    if(bmp.width!==w||bmp.height!==h){bmp.close();fail(`${row.path}: ${bmp.width}x${bmp.height}; expected ${w}x${h}`);}
    ctx.drawImage(bmp,0,0);bmp.close();
  }

  async function renderRecipe(recipe,family,canvas){
    const catalog=await getCatalog();
    if(!catalog) fail('generator pack not imported');
    if(!GENDERS.includes(recipe.gender)) fail(`invalid body set ${recipe.gender}`);
    const dims=DIMS[family]; if(!dims) fail(`invalid output family ${family}`);
    canvas.width=dims[0];canvas.height=dims[1];
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,dims[0],dims[1]);
    const rows=orderedRows(catalog,recipe,family);
    if(!rows.length) fail(`no ${family} layers resolved`);
    for(const row of rows) await drawRow(ctx,row,dims[0],dims[1]);
    return {schema:'plushbound.world_editor.character_generator_recipe.v2',version:2,characterId:recipe.characterId,displayName:recipe.displayName||recipe.characterId,gender:recipe.gender,selections:{...(recipe.selections||{})},family,orderedSourceLayers:rows.map(r=>r.path),packId:PACK_ID,sourceSha256:EXPECTED_SHA256,mvLayerOrder:true,matchingRecipeAcrossFamilies:true,deterministic:true,failClosed:true};
  }

  async function renderBundle(recipe){
    const out={};
    for(const family of ['TV','Face','TVD','SV']){
      const canvas=document.createElement('canvas');
      const manifest=await renderRecipe(recipe,family,canvas);
      out[family]={canvas,manifest};
    }
    return out;
  }

  function installUi(){
    const old=document.getElementById('pb-npc-generator-button'); if(old) old.style.display='none';
    if(document.getElementById('pb-npc-generator-v2-button')) return;
    const btn=document.createElement('button');btn.id='pb-npc-generator-v2-button';btn.textContent='NPC Generator v2';
    btn.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483002;padding:10px 14px;border:0;border-radius:12px;background:#202431;color:#fff;font:600 14px system-ui;box-shadow:0 4px 18px #0006';
    document.body.appendChild(btn);
    btn.onclick=async()=>{
      const base=window.PlushboundCharacterPack;
      const catalog=await getCatalog();
      if(!catalog){ alert('Import the approved Plushbound character creator ZIP with the original generator once, then reopen NPC Generator v2.'); return; }
      const recipe=base.randomRecipe(catalog,'Female');
      const bundle=await renderBundle(recipe);
      const wrap=document.createElement('div');
      wrap.style.cssText='position:fixed;inset:0;z-index:2147483003;background:#000b;overflow:auto;padding:20px;color:white;font:14px system-ui';
      const panel=document.createElement('div');panel.style.cssText='max-width:1000px;margin:auto;background:#171a22;border-radius:16px;padding:16px';
      panel.innerHTML='<div style="display:flex;justify-content:space-between"><h2>World Editor NPC Generator v2 — MV Accurate</h2><button data-close>Close</button></div><p>One recipe rendered to matching TV, Face, TVD and SV outputs.</p>';
      const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px';
      for(const family of ['TV','Face','TVD','SV']){
        const box=document.createElement('div');box.style.cssText='background:#0d0f14;border-radius:12px;padding:10px;text-align:center';
        const h=document.createElement('strong');h.textContent=family;box.appendChild(h);
        const c=bundle[family].canvas;c.style.cssText='display:block;max-width:100%;height:auto;margin:8px auto;image-rendering:pixelated';box.appendChild(c);grid.appendChild(box);
      }
      panel.appendChild(grid);wrap.appendChild(panel);document.body.appendChild(wrap);
      panel.querySelector('[data-close]').onclick=()=>wrap.remove();
    };
  }

  window.PlushboundCharacterPackV2=Object.freeze({PACK_ID,EXPECTED_SHA256,TOP_TO_BOTTOM,getCatalog,orderedRows,renderRecipe,renderBundle});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi,{once:true});else installUi();
})();