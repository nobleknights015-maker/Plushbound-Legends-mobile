import test from 'node:test';
import assert from 'node:assert/strict';
import { importMvProjectData } from '../../tools/editor/mv-editor-adapter.js';
import { GameState } from '../src/core/GameState.js';
import { DataRegistry } from '../src/data/DataRegistry.js';
import { MapRuntime } from '../src/maps/MapRuntime.js';
import {
  WorldEditorCompatibility,
  adaptWorldEditorProject,
  inspectWorldEditorProject,
  installWorldEditorProject
} from '../src/editor/WorldEditorProjectAdapter.js';

function projectFixture({ unsupported = false } = {}) {
  return {
    format: 'plushbound-world-editor-mv-adapter',
    adapterVersion: 1,
    sourceFormat: 'rpg-maker-mv-project-data',
    start: { mapId: '1', x: 0, y: 0, direction: 2 },
    maps: [{
      id: '1', mvMapId: 1, name: 'Compatibility Lab', width: 2, height: 1, tilesetId: 1, tileset:'tileset/test/compatibility-lab',
      layers: [
        { id: 'mv-layer-0', data: [10, 11] },
        { id: 'mv-layer-1', data: [20, 21] },
        { id: 'mv-layer-2', data: [30, 31] },
        { id: 'mv-layer-3', data: [40, 41] }
      ],
      regions: [7, 8], mvShadowBits: [1, 2], encounterList: [],
      events: [{
        id: '1', name: 'Gate', x: 1, y: 0,
        pages: [{
          trigger: 'action', priority: 'same',
          conditions: {
            switch1Valid: true, switch1Id: 1,
            switch2Valid: false, switch2Id: 2,
            variableValid: true, variableId: 3, variableValue: 5,
            selfSwitchValid: true, selfSwitchCh: 'A',
            itemValid: true, itemId: 4,
            actorValid: true, actorId: 5
          },
          commands: unsupported ? [{ code: 'MV_RAW', parameters: [] }] : [{ code: 'WAIT', parameters: [0.25] }],
          mv: { through: false }
        }]
      }]
    }],
    commonEvents: [{ id: '2', name: 'Bell', commands: [{ code: 'SWITCH', parameters: ['9', true] }] }],
    mvDatabase: {
      Actors: [null, { id: 1, name: 'Hero' }],
      Classes: [null], Skills: [null], Items: [null], Weapons: [null], Armors: [null],
      Enemies: [null], Troops: [null], States: [null], Animations: [null], CommonEvents: [null],
      System: { gameTitle: 'Plushbound Test' }
    }
  };
}

function mvFilesFixture() {
  const numbered = ['Actors.json','Animations.json','Armors.json','Classes.json','Enemies.json','Items.json','Skills.json','States.json','Troops.json','Weapons.json'];
  const files = Object.fromEntries(numbered.map(name => [name, [null]]));
  files['Tilesets.json']=[null,{id:1,name:'Compatibility',mode:0,tilesetNames:['A1','A2','A3','A4','A5','B','C','D','E'],flags:new Array(8192).fill(0),note:''}];
  files['MapInfos.json'] = [null, { id: 1, name: 'Compatibility Lab' }];
  files['CommonEvents.json'] = [null, {
    id: 2, name: 'Bell', trigger: 0, switchId: 1,
    list: [{ code: 121, indent: 0, parameters: [9, 9, 0] }, { code: 0, indent: 0, parameters: [] }]
  }];
  files['System.json'] = {
    startMapId: 1, startX: 0, startY: 0,
    switches: [], variables: [], elements: [], skillTypes: [], weaponTypes: [], armorTypes: [], equipTypes: []
  };
  files['Map001.json'] = {
    width: 2, height: 1, tilesetId: 1, displayName: 'Compatibility Lab',
    data: [10,11,20,21,30,31,40,41,1,2,7,8], encounterList: [],
    events: [null, {
      id: 1, name: 'Gate', x: 1, y: 0,
      pages: [{
        conditions: {
          switch1Valid: false, switch1Id: 1, switch2Valid: false, switch2Id: 2,
          variableValid: false, variableId: 3, variableValue: 5,
          selfSwitchValid: false, selfSwitchCh: 'A', itemValid: false, itemId: 4,
          actorValid: false, actorId: 5
        },
        trigger: 0, priorityType: 1, through: false,
        list: [{ code: 230, indent: 0, parameters: [15] }, { code: 0, indent: 0, parameters: [] }]
      }]
    }]
  };
  return files;
}

test('World Editor compatibility contract is explicit and fail-closed', () => {
  assert.equal(WorldEditorCompatibility.format, 'plushbound-world-editor-mv-adapter');
  assert.equal(WorldEditorCompatibility.adapterVersion, 1);
  const bad = inspectWorldEditorProject({ format: 'other', adapterVersion: 1, maps: [], start: {} });
  assert.equal(bad.valid, false);
  assert.throws(() => adaptWorldEditorProject({ format: 'other', adapterVersion: 1, maps: [], start: {} }), /Unsupported editor project format/);
});

test('Engine adapter preserves four editor layers, tileset identity, regions, shadows, events and common events', () => {
  const bundle = adaptWorldEditorProject(projectFixture());
  const map = bundle.maps.get('1');
  assert.equal(map.tileset,'tileset/test/compatibility-lab');
  assert.equal(map.tilesetId,1);
  assert.deepEqual(map.layers.ground, [10, 11]);
  assert.deepEqual(map.layers.lower, [20, 21]);
  assert.deepEqual(map.layers.upper, [30, 31]);
  assert.deepEqual(map.layers.overlay, [40, 41]);
  assert.deepEqual(map.regions, [7, 8]);
  assert.deepEqual(map.mvShadowBits, [1, 2]);
  assert.equal(map.events[0].pages[0].commands[0].code, 'WAIT');
  assert.equal(bundle.commonEvents.get('2')[0].code, 'SWITCH');
  assert.equal(bundle.report.runtimeExecutable, true);
});

test('Engine installs editor project into MapRuntime, GameState and DataRegistry', () => {
  const state = new GameState();
  const maps = new MapRuntime({ state });
  const data = new DataRegistry();
  const bundle = installWorldEditorProject({ project: projectFixture(), state, mapRuntime: maps, dataRegistry: data, requireExecutable: true });

  assert.equal(state.map.id, '1');
  assert.equal(state.map.x, 0);
  assert.equal(maps.tileAt(0, 0, 'ground'), 10);
  assert.equal(maps.tileAt(1, 0, 'overlay'), 41);
  assert.equal(maps.regionAt(1, 0), 8);
  assert.equal(data.get('actors', '1').name, 'Hero');
  assert.equal(data.get('system', 'system').gameTitle, 'Plushbound Test');
  assert.equal(maps.commonEvents.get('2')[0].code, 'SWITCH');
  assert.equal(bundle.start.mapId, '1');
});

test('MapRuntime evaluates RPG Maker MV page conditions emitted by the editor adapter', () => {
  const state = new GameState();
  const maps = new MapRuntime({ state });
  installWorldEditorProject({ project: projectFixture(), state, mapRuntime: maps });

  assert.equal(maps.eventsAt(1, 0).length, 0);
  state.setSw(1, true);
  state.setVariable(3, 5);
  state.setSelfSw('1', '1', 'A', true);
  state.gain('items', 4, 1);
  state.party.push('5');
  assert.equal(maps.eventsAt(1, 0).length, 1);
  assert.equal(maps.eventsAt(1, 0)[0].name, 'Gate');
});

test('Unsupported editor commands are reported and can block runtime installation', () => {
  const project = projectFixture({ unsupported: true });
  const report = inspectWorldEditorProject(project);
  assert.equal(report.valid, true);
  assert.equal(report.runtimeExecutable, false);
  assert.deepEqual(report.unsupportedCommands, [{ location: 'map:1/event:1/page:0', code: 'MV_RAW' }]);

  const state = new GameState();
  const maps = new MapRuntime({ state });
  assert.throws(
    () => installWorldEditorProject({ project, state, mapRuntime: maps, requireExecutable: true }),
    error => error?.code === 'EDITOR_PROJECT_UNSUPPORTED_COMMANDS'
  );
});

test('Actual MV JSON can flow through the World Editor importer into Engine v1 with stable tileset identity', () => {
  const editorProject = importMvProjectData(mvFilesFixture(), { strictExtended: false });
  assert.equal(editorProject.format, WorldEditorCompatibility.format);
  assert.equal(editorProject.commonEvents[0].commands[0].code, 'SWITCH');
  assert.equal(editorProject.maps[0].tileset,'tileset/mv-import/001');

  const state = new GameState();
  const maps = new MapRuntime({ state });
  const data = new DataRegistry();
  const bundle = installWorldEditorProject({ project: editorProject, state, mapRuntime: maps, dataRegistry: data, requireExecutable: true });

  assert.equal(bundle.report.runtimeExecutable, true);
  assert.equal(bundle.maps.get('1').tileset,'tileset/mv-import/001');
  assert.equal(state.map.id, '1');
  assert.equal(maps.tileAt(0, 0, 'ground'), 10);
  assert.equal(maps.tileAt(1, 0, 'overlay'), 41);
  assert.equal(maps.regionAt(1, 0), 8);
  assert.equal(maps.eventsAt(1, 0)[0].commands[0].code, 'WAIT');
  assert.equal(maps.commonEvents.get('2')[0].code, 'SWITCH');
});

test('Engine adapter rejects editor maps with no stable runtime tileset asset identity',()=>{
  const project=projectFixture();delete project.maps[0].tileset;
  assert.throws(()=>adaptWorldEditorProject(project),error=>error?.code==='EDITOR_MAP_TILESET_ID_REQUIRED');
});
