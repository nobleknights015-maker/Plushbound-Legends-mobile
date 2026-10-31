const REQUIRED_SHEETS = Object.freeze({
  A1:[768,576], A2:[768,576], A3:[768,384], A4:[768,720], A5:[384,768],
  B:[768,768], C:[768,768], D:[768,768], E:[768,768]
});

function issue(code,message,path=''){return {severity:'error',code,message,path};}
function int(value){return Number.isInteger(Number(value))?Number(value):null;}

export function validateAssetCompatibilityV1(contract={}){
  const issues=[];
  if(contract.schemaVersion!==1) issues.push(issue('ASSET_CONTRACT_SCHEMA','Asset compatibility schemaVersion must be 1','schemaVersion'));
  if(contract.id!=='plushbound-asset-compatibility-v1') issues.push(issue('ASSET_CONTRACT_ID','Unsupported asset compatibility contract id','id'));
  const g=contract.global||{};
  if(g.tileSize!==48) issues.push(issue('ASSET_TILE_SIZE','Runtime tile size must be 48','global.tileSize'));
  if(g.screenWidth!==816||g.screenHeight!==624) issues.push(issue('ASSET_SCREEN_SIZE','Compatibility canvas must be 816x624','global'));
  if(g.visualInferenceForbidden!==true) issues.push(issue('ASSET_VISUAL_INFERENCE','Visual inference must remain forbidden','global.visualInferenceForbidden'));
  if(g.deterministicSlicingRequired!==true) issues.push(issue('ASSET_DETERMINISTIC_SLICING','Deterministic slicing must be required','global.deterministicSlicingRequired'));

  const sheets=contract.tilesets?.sheets||{};
  for(const [name,[width,height]] of Object.entries(REQUIRED_SHEETS)){
    const sheet=sheets[name];
    if(!sheet) issues.push(issue('ASSET_TILESET_SHEET_MISSING',`Missing tileset ${name} contract`,`tilesets.sheets.${name}`));
    else if(sheet.width!==width||sheet.height!==height) issues.push(issue('ASSET_TILESET_GEOMETRY',`Tileset ${name} must be ${width}x${height}`,`tilesets.sheets.${name}`));
  }
  const a5=contract.tilesets?.a5ProductionSheet||{};
  if(a5.width!==384||a5.height!==768||a5.columns!==8||a5.rows!==16||a5.slots!==128||a5.margin!==0||a5.padding!==0) issues.push(issue('ASSET_A5_PRODUCTION_GEOMETRY','A5 production sheet must be 384x768, 8x16, 128 slots, no margin/padding','tilesets.a5ProductionSheet'));
  if(a5.postGenerationScalingAllowed!==false) issues.push(issue('ASSET_A5_SCALING','A5 production sheets may not be arbitrarily rescaled','tilesets.a5ProductionSheet.postGenerationScalingAllowed'));
  const auto=contract.tilesets?.autotiles||{};
  if(auto.quarterSize!==24||auto.floorShapes!==48||auto.wallShapes!==16||auto.waterfallShapes!==4) issues.push(issue('ASSET_AUTOTILE_CONTRACT','MV-compatible autotiles require 24px quarters with 48/16/4 shape tables','tilesets.autotiles'));

  const atlas=contract.characters?.atlasV1||{};
  if(atlas.templateId!=='plushbound-character-atlas-v1'||atlas.version!=='1.0'||atlas.width!==1536||atlas.height!==1024||atlas.format!=='image/png') issues.push(issue('ASSET_CHARACTER_ATLAS','Character Atlas V1 must remain locked to 1536x1024 PNG v1.0','characters.atlasV1'));
  const field=contract.characters?.fieldRuntime||{};
  if(field.frameWidth!==48||field.frameHeight!==48||field.columns!==3||field.rows!==4||field.width!==144||field.height!==192) issues.push(issue('ASSET_FIELD_SPRITE','Runtime field sprites must be 144x192, 3x4 of 48x48 frames','characters.fieldRuntime'));
  if(JSON.stringify(field.directionRows)!==JSON.stringify(['down','left','right','up'])) issues.push(issue('ASSET_FIELD_DIRECTIONS','Field sprite direction rows must be down,left,right,up','characters.fieldRuntime.directionRows'));
  if(field.atlasSourceSlotWidth!==75||field.atlasSourceSlotHeight!==64||field.sourceSafeAreaWidth!==48||field.sourceSafeAreaHeight!==48) issues.push(issue('ASSET_FIELD_SAFE_AREA','Atlas field slots must expose a locked 48x48 runtime safe area inside 75x64 authoring slots','characters.fieldRuntime'));
  if(field.sourceSafeAreaAlignment!=='center-horizontal-bottom'||field.extraction!=='center-horizontal-bottom-aligned-no-scale'||field.resampling!==false) issues.push(issue('ASSET_FIELD_EXTRACTION','Field runtime extraction must be centered horizontally, bottom aligned and never resampled','characters.fieldRuntime'));

  const face=contract.faces?.mvReferenceSheet||{};
  if(face.width!==576||face.height!==288||face.columns!==4||face.rows!==2||face.cellWidth!==144||face.cellHeight!==144) issues.push(issue('ASSET_FACE_GEOMETRY','MV-compatible face sheet must be 576x288 with 144x144 cells','faces.mvReferenceSheet'));
  const battleback=contract.battle?.battleback||{};
  if(battleback.width!==816||battleback.height!==624) issues.push(issue('ASSET_BATTLEBACK_GEOMETRY','Battleback compatibility target must be 816x624','battle.battleback'));
  const icon=contract.ui?.icon?.runtimeNative||{};
  if(icon.width!==32||icon.height!==32||icon.format!=='image/png') issues.push(issue('ASSET_ICON_GEOMETRY','Runtime icons must be 32x32 PNG','ui.icon.runtimeNative'));
  const audio=contract.audio||{};
  if(JSON.stringify(audio.categories)!==JSON.stringify(['bgm','bgs','me','se'])) issues.push(issue('ASSET_AUDIO_CATEGORIES','Audio categories must be bgm,bgs,me,se','audio.categories'));
  if(audio.runtimePreferred!=='.ogg') issues.push(issue('ASSET_AUDIO_RUNTIME_FORMAT','Native runtime preferred audio must be .ogg','audio.runtimePreferred'));

  return {ok:issues.length===0,issues,contractId:contract.id||null,schemaVersion:contract.schemaVersion??null};
}

export function validateAssetDescriptorV1(entry={},contract={}){
  const issues=[];
  const id=String(entry.id||'').trim(),path=String(entry.path||'').trim(),type=String(entry.type||'').trim(),status=String(entry.status||'').trim();
  if(!id) issues.push(issue('ASSET_ID_REQUIRED','Asset id is required','id'));
  if(!type) issues.push(issue('ASSET_TYPE_REQUIRED',`Asset ${id||'?'} requires type`,'type'));
  if(!path) issues.push(issue('ASSET_PATH_REQUIRED',`Asset ${id||'?'} requires path`,'path'));
  if(path.startsWith('/')||path.includes('..')) issues.push(issue('ASSET_PATH_UNSAFE',`Asset ${id||'?'} path must be safe and relative`,'path'));
  const statuses=contract.manifestEntry?.statuses||[];
  if(statuses.length&&!statuses.includes(status)) issues.push(issue('ASSET_STATUS_INVALID',`Asset ${id||'?'} has unsupported status ${status}`,'status'));

  const w=int(entry.width),h=int(entry.height),layout=String(entry.layout||'');
  if(type==='character-sprite'&&layout==='single-character-3x4'){
    const f=contract.characters?.fieldRuntime||{};
    if(w!==f.width||h!==f.height) issues.push(issue('ASSET_CHARACTER_RUNTIME_SIZE',`Single-character field sprite ${id} must be ${f.width}x${f.height}`,'width/height'));
  }
  if(type==='icon'&&w!=null&&h!=null){const expected=contract.ui?.icon?.runtimeNative||{};if(w!==expected.width||h!==expected.height) issues.push(issue('ASSET_ICON_RUNTIME_SIZE',`Icon ${id} must be ${expected.width}x${expected.height}`,'width/height'));}
  if(type==='battleback'&&w!=null&&h!=null){const expected=contract.battle?.battleback||{};if(w!==expected.width||h!==expected.height) issues.push(issue('ASSET_BATTLEBACK_RUNTIME_SIZE',`Battleback ${id} must be ${expected.width}x${expected.height}`,'width/height'));}
  return {ok:issues.length===0,issues,id};
}

export function assetCompatibilitySnapshot(contract={}){
  const result=validateAssetCompatibilityV1(contract);
  return {
    ...result,
    tileSize:contract.global?.tileSize??null,
    screen:[contract.global?.screenWidth??null,contract.global?.screenHeight??null],
    fieldSprite:[contract.characters?.fieldRuntime?.width??null,contract.characters?.fieldRuntime?.height??null],
    fieldSafeArea:[contract.characters?.fieldRuntime?.sourceSafeAreaWidth??null,contract.characters?.fieldRuntime?.sourceSafeAreaHeight??null],
    atlas:[contract.characters?.atlasV1?.width??null,contract.characters?.atlasV1?.height??null],
    tilesetSheets:Object.fromEntries(Object.entries(REQUIRED_SHEETS).map(([key])=>[key,[contract.tilesets?.sheets?.[key]?.width??null,contract.tilesets?.sheets?.[key]?.height??null]]))
  };
}
