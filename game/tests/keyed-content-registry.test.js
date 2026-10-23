import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../../engine/src/core/GameState.js';
import { GameContentRuntime } from '../runtime/GameContentRuntime.js';

test('game runtime accepts array and keyed-object content registries together', () => {
  const state = new GameState();
  const runtime = new GameContentRuntime({
    state,
    contentPackages: [{
      items: {
        tonic: { id: 'keyed-tonic', name: 'Keyed Tonic' }
      },
      shops: [
        { id: 'array-shop', name: 'Array Shop', inventory: [] }
      ],
      waystitches: {
        grove: { id: 'waystitch-keyed-grove', name: 'Keyed Grove' }
      },
      encounterTables: {
        woods: { id: 'keyed-woods', entries: [{ enemyId: 'keyed-frayling', weight: 1 }] }
      },
      enemies: {
        frayling: { id: 'keyed-frayling', name: 'Keyed Frayling', tags: ['frayling'] }
      }
    }]
  });

  assert.equal(runtime.itemDefinition('keyed-tonic')?.name, 'Keyed Tonic');
  assert.equal(runtime.shop('array-shop')?.name, 'Array Shop');
  assert.equal(runtime.activateWaystitch('waystitch-keyed-grove'), true);
  assert.equal(runtime.encounterTable('keyed-woods')?.entries[0].enemyId, 'keyed-frayling');
  assert.equal(runtime.enemyDefinition('keyed-frayling')?.name, 'Keyed Frayling');
});
