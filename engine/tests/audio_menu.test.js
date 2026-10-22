import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../src/audio/AudioManager.js';
import { MenuModel } from '../src/ui/MenuModel.js';

test('AudioManager tracks channels, volume, mute, fade and restore state', () => {
  const calls = [];
  const adapter = {
    play: (...x) => calls.push(['play', ...x]),
    stop: (...x) => calls.push(['stop', ...x]),
    fade: (...x) => calls.push(['fade', ...x]),
    setVolume: (...x) => calls.push(['volume', ...x]),
  };
  const audio = new AudioManager({ adapter, defaults: { master: 0.5, bgm: 0.8, se: 1 } });
  audio.playBgm('field-theme');
  assert.equal(audio.effectiveVolume('bgm'), 0.4);
  assert.equal(audio.current.bgm.name, 'field-theme');
  audio.playSe('cursor');
  audio.fade('bgm', 1.5, 0);
  const snap = audio.snapshot();
  audio.setMuted(true);
  assert.equal(audio.effectiveVolume('bgm'), 0);
  audio.restore(snap);
  assert.equal(audio.muted, false);
  assert.equal(audio.current.bgm.name, 'field-theme');
  assert.ok(calls.some(call => call[0] === 'play' && call[1] === 'bgm'));
  assert.ok(calls.some(call => call[0] === 'fade' && call[1] === 'bgm' && call[2] === 1.5));
});

test('AudioManager clamps unsafe volume, pitch and pan values', () => {
  const audio = new AudioManager();
  audio.setVolume('master', 5);
  audio.setVolume('se', -3);
  const track = audio.playSe('hit', { pitch: 1.2, pan: 9, position: -8 });
  assert.equal(audio.volumes.master, 1);
  assert.equal(audio.volumes.se, 0);
  assert.equal(track.pan, 1);
  assert.equal(track.position, 0);
  assert.equal(track.pitch, 1.2);
});

test('MenuModel skips disabled commands and supports selection lifecycle', () => {
  const menu = new MenuModel({ commands: [
    { id: 'item', label: 'Items' },
    { id: 'skill', label: 'Skills', enabled: false },
    { id: 'save', label: 'Save' },
  ] });
  assert.equal(menu.open().id, 'item');
  assert.equal(menu.move(1).id, 'save');
  assert.deepEqual(menu.select(), { accepted: true, command: { id: 'save', label: 'Save', enabled: true, symbol: null } });
  menu.close();
  assert.equal(menu.select().accepted, false);
});

test('MenuModel restores enabled state and cursor safely', () => {
  const menu = new MenuModel({ commands: ['item', 'skill', 'save'] });
  menu.open(2);
  menu.setEnabled('save', false);
  const snap = menu.snapshot();
  const restored = new MenuModel({ commands: ['item', 'skill', 'save'] });
  restored.restore(snap);
  assert.equal(restored.commands.find(c => c.id === 'save').enabled, false);
  assert.equal(restored.current().id, 'item');
});
