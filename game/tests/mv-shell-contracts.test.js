import test from 'node:test';
import assert from 'node:assert/strict';
import {MV_BOOT_SCRIPT_ORDER,validateMvPackageConfig,validateMvPluginList,validateMvBootScripts,classifyMvAssetFile,auditMvAssetPairs} from '../../tools/editor/mv-shell-contracts.js';

test('accepts the observable MV package window contract',()=>{
  const pkg={name:'',main:'index.html','js-flags':'--expose-gc',window:{title:'',toolbar:false,width:816,height:624,icon:'icon/icon.png'}};
  assert.deepEqual(validateMvPackageConfig(pkg),[]);
});

test('validates serialized MV plugin descriptors without executing plugins',()=>{
  const plugins=[{name:'Example',status:true,description:'Example plugin',parameters:{screenWidth:'816',screenHeight:'624'}}];
  assert.deepEqual(validateMvPluginList(plugins),[]);
  assert.ok(validateMvPluginList([{...plugins[0],parameters:{bad:816}}]).some(x=>x.code==='MV_PLUGIN_PARAMETER_VALUE'));
});

test('locks observable MV boot script ordering',()=>{
  assert.deepEqual(validateMvBootScripts([...MV_BOOT_SCRIPT_ORDER]),[]);
  assert.ok(validateMvBootScripts(MV_BOOT_SCRIPT_ORDER.filter(x=>x!=='js/plugins.js')).some(x=>x.code==='MV_BOOT_SCRIPT_MISSING'));
});

test('classifies PNG image banks and paired OGG/M4A audio banks',()=>{
  assert.deepEqual(classifyMvAssetFile('NewData/img/characters/Actor1.png'),{kind:'image',category:'characters',name:'Actor1.png',extension:'.png',supported:true});
  assert.equal(classifyMvAssetFile('audio/bgm/Theme.ogg').supported,true);
  const audit=auditMvAssetPairs(['audio/bgm/Theme.ogg','audio/bgm/Theme.m4a','audio/se/Hit.ogg','audio/se/Hit.m4a','img/faces/Actor1.png']);
  assert.deepEqual(audit,{ok:true,issues:[],imageCount:1,audioStemCount:2,pairedAudioStemCount:2});
  assert.ok(auditMvAssetPairs(['audio/bgm/Theme.ogg']).issues.some(x=>x.code==='MV_AUDIO_PAIR_MISSING'));
});
