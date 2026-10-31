import {mvAutotileSourcePlan} from './mv-autotile-composition.js';

const $=id=>document.getElementById(id);
let manifest=null;
let compatibility=null;
let mvAnimationFrame=0;

async function loadJson(path,label){const response=await fetch(new URL(path,location.href));if(!response.ok)throw new Error(`Could not load ${label} (${response.status})`);return response.json();}
async function loadContracts(){[manifest,compatibility]=await Promise.all([loadJson('../../game/assets/asset-manifest.json','asset manifest'),loadJson('../../game/assets/ASSET_COMPATIBILITY_V1.json','Asset Compatibility V1')]);return {manifest,compatibility};}

function ensurePanel(){
  let section=$('tilesetPreviewPanel');if(section)return section;
  const palette=$('tilePalette')?.closest('section'),left=document.querySelector('.sidebar.left');if(!left)return null;
  section=document.createElement('section');section.id='tilesetPreviewPanel';
  section.innerHTML='<h2>Tileset Asset</h2><div id="tilesetPreviewMeta" class="meta">Loading tileset contract…</div><div id="tilesetPreviewVisual"></div>';
  palette?.after(section)||left.append(section);return section;
}

function mvProject(pkg){return pkg?.format==='plushbound-world-editor-mv-adapter';}
function stripExtension(path){return String(path||'').replace(/\.[^/.]+$/,'');}
function explicitAsset(id){return (manifest?.entries||[]).find(entry=>String(entry.id)===String(id))||null;}
function tilesetChildren(parent){
  const slots=compatibility?.tilesets?.setConvention?.slots||[];
  const root=stripExtension(parent.path);
  return slots.map(slot=>{
    const id=`${parent.id}/${slot}`,explicit=explicitAsset(id),geometry=compatibility?.tilesets?.sheets?.[slot]||{};
    return explicit||{id,type:'tileset-sheet',path:`${root}/${slot}.png`,status:parent.status==='retired'?'retired':'planned',width:geometry.width,height:geometry.height,layout:`mv-${String(slot).toLowerCase()}`,meta:{parentId:parent.id,mvSlot:slot,derivedFromTilesetSet:true}};
  });
}
function appendReadyImage(visual,entry){if(entry.status!=='ready'||!entry.path)return;const image=document.createElement('img');image.alt=`${entry.id} sheet`;image.loading='lazy';image.src=new URL(`../../game/assets/${entry.path}`,location.href).href;image.style.maxWidth='100%';image.style.height='auto';image.style.marginTop='6px';image.style.borderRadius='8px';visual.append(image);}
function renderTilesetSet(parent,meta,visual,tileSize){
  const children=tilesetChildren(parent),ready=children.filter(entry=>entry.status==='ready').length;
  meta.textContent=`${parent.id} • MV-compatible tileset set • ${ready}/${children.length} sheets ready${tileSize?` • ${tileSize}px tiles`:''}`;
  const note=document.createElement('div');note.className='note';note.textContent='Map stores the stable parent ID. Engine v1 derives A1–E child IDs/paths deterministically; explicit child manifest entries override derived descriptors.';visual.append(note);
  for(const entry of children){const row=document.createElement('div');row.className='page-row';row.style.display='flex';row.style.flexDirection='column';const strong=document.createElement('strong');strong.textContent=`${entry.meta?.mvSlot||entry.id.split('/').at(-1)} • ${entry.status||'planned'} • ${entry.width||'?'}×${entry.height||'?'}`;const detail=document.createElement('span');detail.textContent=`${entry.id} → ${entry.path}`;row.append(strong,detail);visual.append(row);appendReadyImage(visual,entry);}
}
function renderMvAutotile(pkg,map,meta,visual){
  const tileId=Math.floor(Number($('tileId')?.value));if(!Number.isInteger(tileId)||tileId<0){meta.textContent='MV project • choose a numeric Tile ID to inspect composition.';return true;}
  let plan;try{plan=mvAutotileSourcePlan(tileId,{animationFrame:mvAnimationFrame,tileSize:Number(pkg?.tileSize)||48});}catch(error){meta.textContent=`MV tile ${tileId} • composition unavailable: ${error.message}`;return true;}
  const tilesets=pkg?.mvSourceFiles?.['Tilesets.json'];const tileset=Array.isArray(tilesets)?tilesets[Number(map?.tilesetId)]:null;const name=tileset?.name||`tileset ${Number(map?.tilesetId)||0}`;
  if(!plan){meta.textContent=`MV ${name} • ${map.tileset||`tileset/mv-import/${String(map.tilesetId||0).padStart(3,'0')}`} • tile ${tileId} is not an A1–A4 autotile`;const note=document.createElement('div');note.className='note';note.textContent='B–E and A5 are direct atlas tiles. Imported MV maps receive a stable runtime tileset identity while retaining their numeric tilesetId for lossless export.';visual.append(note);return true;}
  meta.textContent=`MV ${name} • ${map.tileset||''} • ${plan.slot} kind ${plan.kind} • shape ${plan.shape} • ${plan.family}${plan.animated?` • animated phase ${plan.animationPhase+1}/${plan.frameCount}`:''}`;
  if(plan.animated){const label=document.createElement('label');label.textContent='Preview animation frame';const input=document.createElement('input');input.type='range';input.min='0';input.max=String(Math.max(0,plan.frameCount-1));input.step='1';input.value=String(((mvAnimationFrame%plan.frameCount)+plan.frameCount)%plan.frameCount);input.addEventListener('input',()=>{mvAnimationFrame=Number(input.value)||0;render();});label.append(input);visual.append(label);}
  if(!plan.supported){const warning=document.createElement('div');warning.className='note';warning.textContent=plan.reason||'This MV autotile shape is outside the valid recipe range for its family.';visual.append(warning);return true;}
  const grid=document.createElement('div');grid.setAttribute('aria-label','MV autotile quarter composition');grid.style.display='grid';grid.style.gridTemplateColumns='1fr 1fr';grid.style.gap='4px';grid.style.marginTop='8px';
  for(const q of plan.quadrants){const cell=document.createElement('div');cell.className='page-row';cell.style.minHeight='54px';cell.style.display='flex';cell.style.flexDirection='column';cell.style.justifyContent='center';const strong=document.createElement('strong');strong.textContent=q.name;const detail=document.createElement('span');detail.textContent=`source Q${q.sourceQuarter.x},${q.sourceQuarter.y} • ${q.sourcePixel.x},${q.sourcePixel.y} px`;cell.append(strong,detail);grid.append(cell);}visual.append(grid);
  const origin=document.createElement('div');origin.className='note';origin.textContent=`Exact ${plan.quarterSize}×${plan.quarterSize} quarter recipe • source block Q${plan.sourceBlock.quarterX},${plan.sourceBlock.quarterY}. Reference ZIP image pixels remain unopened; this preview shows deterministic composition geometry only.`;visual.append(origin);return true;
}

function render(){
  const section=ensurePanel(),meta=section?.querySelector('#tilesetPreviewMeta'),visual=section?.querySelector('#tilesetPreviewVisual');if(!section||!meta||!visual)return;
  const pkg=window.PlushboundEditor?.getPackage?.(),mapId=$('mapSelect')?.value,map=pkg?.maps?.find(item=>String(item.id)===String(mapId));
  visual.innerHTML='';if(!map){meta.textContent='Load a map to inspect its tileset asset.';return;}
  if(mvProject(pkg)){renderMvAutotile(pkg,map,meta,visual);return;}
  const tilesetId=String(map.tileset||'').trim();if(!tilesetId){meta.textContent='This map does not declare a stable tileset asset ID.';return;}
  const asset=explicitAsset(tilesetId);
  if(!asset){meta.textContent=`${tilesetId} • unregistered tileset`;return;}
  const tileSize=Number(pkg?.tileSize||manifest?.tileSize||compatibility?.global?.tileSize)||0;
  if(asset.type==='tileset'){renderTilesetSet(asset,meta,visual,tileSize);return;}
  meta.textContent=`${tilesetId} • ${asset.status||'planned'}${tileSize?` • ${tileSize}px source tiles`:''}`;
  const detail=document.createElement('div');detail.className='note';detail.textContent=asset.path||'No asset path declared';visual.append(detail);appendReadyImage(visual,asset);
  if(asset.status!=='ready'){const note=document.createElement('div');note.className='note';note.textContent='Sheet preview stays disabled until the manifest marks this asset ready. Numeric tile IDs remain authoritative.';visual.append(note);}
}

async function init(){ensurePanel();try{await loadContracts();render();}catch(error){const meta=ensurePanel()?.querySelector('#tilesetPreviewMeta');if(meta)meta.textContent=`Tileset preview unavailable: ${error.message}`;}}
const mapSelect=$('mapSelect');mapSelect?.addEventListener('change',()=>queueMicrotask(render));
if(mapSelect)new MutationObserver(()=>queueMicrotask(render)).observe(mapSelect,{childList:true,subtree:true});
$('tileId')?.addEventListener('input',()=>{mvAnimationFrame=0;queueMicrotask(render);});
$('loadElyndor')?.addEventListener('click',()=>setTimeout(render,0));
init();
window.PlushboundTilesetPreview={render,tilesetChildren};
