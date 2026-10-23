const $=id=>document.getElementById(id);
let manifest=null;

async function loadManifest(){const response=await fetch(new URL('../../game/assets/asset-manifest.json',location.href));if(!response.ok)throw new Error(`Could not load asset manifest (${response.status})`);manifest=await response.json();return manifest;}

function ensurePanel(){
  let section=$('tilesetPreviewPanel');if(section)return section;
  const palette=$('tilePalette')?.closest('section'),left=document.querySelector('.sidebar.left');if(!left)return null;
  section=document.createElement('section');section.id='tilesetPreviewPanel';
  section.innerHTML='<h2>Tileset Asset</h2><div id="tilesetPreviewMeta" class="meta">Loading tileset contract…</div><div id="tilesetPreviewVisual"></div>';
  palette?.after(section)||left.append(section);return section;
}

function render(){
  const section=ensurePanel(),meta=section?.querySelector('#tilesetPreviewMeta'),visual=section?.querySelector('#tilesetPreviewVisual');if(!section||!meta||!visual)return;
  const pkg=window.PlushboundEditor?.getPackage?.(),mapId=$('mapSelect')?.value,map=pkg?.maps?.find(item=>String(item.id)===String(mapId));
  visual.innerHTML='';if(!map){meta.textContent='Load a map to inspect its tileset asset.';return;}
  const tilesetId=String(map.tileset||'').trim();if(!tilesetId){meta.textContent='This map does not declare a tileset asset.';return;}
  const asset=(manifest?.entries||[]).find(entry=>String(entry.id)===tilesetId);
  if(!asset){meta.textContent=`${tilesetId} • unregistered tileset`;return;}
  const tileSize=Number(pkg?.tileSize||manifest?.tileSize)||0;
  meta.textContent=`${tilesetId} • ${asset.status||'planned'}${tileSize?` • ${tileSize}px source tiles`:''}`;
  const detail=document.createElement('div');detail.className='note';detail.textContent=asset.path||'No asset path declared';visual.append(detail);
  if(asset.status==='ready'&&asset.path){const image=document.createElement('img');image.alt=`${tilesetId} tileset sheet`;image.loading='lazy';image.src=new URL(`../../game/assets/${asset.path}`,location.href).href;image.style.maxWidth='100%';image.style.height='auto';image.style.marginTop='8px';image.style.borderRadius='8px';visual.append(image);}
  else{const note=document.createElement('div');note.className='note';note.textContent='Sheet preview stays disabled until the manifest marks this asset ready. Per-tile thumbnails also require explicit slice metadata; numeric tile IDs remain authoritative until then.';visual.append(note);}
}

async function init(){ensurePanel();try{await loadManifest();render();}catch(error){const meta=ensurePanel()?.querySelector('#tilesetPreviewMeta');if(meta)meta.textContent=`Tileset preview unavailable: ${error.message}`;}}
const mapSelect=$('mapSelect');mapSelect?.addEventListener('change',()=>queueMicrotask(render));
if(mapSelect)new MutationObserver(()=>queueMicrotask(render)).observe(mapSelect,{childList:true,subtree:true});
$('loadElyndor')?.addEventListener('click',()=>setTimeout(render,0));
init();
window.PlushboundTilesetPreview={render};
