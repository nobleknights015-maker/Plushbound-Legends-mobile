import test from 'node:test';
import assert from 'node:assert/strict';

import { SceneInteractionController } from '../src/scenes/SceneInteractionController.js';
import { PresentationSceneModel } from '../src/scenes/PresentationSceneModel.js';

test('scene interaction navigation moves selected command and rerenders', () => {
  const presentation = new PresentationSceneModel();
  const scene = presentation.title({ canContinue: true });
  const renders = [];
  const controller = new SceneInteractionController({ render: current => renders.push(current) });
  controller.setScene(scene);

  assert.equal(controller.currentItem().id, 'new-game');
  controller.handle({ type: 'navigate', direction: 'down' });
  assert.equal(controller.currentItem().id, 'continue');
  assert.equal(renders.length, 1);
  assert.equal(controller.currentItem().selected, true);
});

test('scene interaction activation dispatches scene-specific handlers', async () => {
  const presentation = new PresentationSceneModel();
  const scene = presentation.title({ canContinue: true });
  const calls = [];
  const controller = new SceneInteractionController({
    handlers: {
      title: {
        'new-game': ({ id }) => { calls.push(id); return { phase: 'creator' }; },
        continue: ({ id }) => { calls.push(id); return { phase: 'field' }; }
      }
    }
  });
  controller.setScene(scene);

  const result = await controller.handle({ type: 'activate', id: 'new-game' });
  assert.deepEqual(result, { phase: 'creator' });
  assert.deepEqual(calls, ['new-game']);
});

test('scene interaction skips disabled commands and reports unhandled activation safely', async () => {
  const presentation = new PresentationSceneModel();
  const scene = presentation.title({ canContinue: false });
  const controller = new SceneInteractionController();
  controller.setScene(scene);

  controller.handle({ type: 'navigate', direction: 'down' });
  assert.equal(controller.currentItem().id, 'options');
  const result = await controller.handle({ type: 'activate', id: 'options' });
  assert.equal(result.unhandled, true);
  assert.equal(result.id, 'options');
});

test('scene interaction supports back routing for menu-style scenes', async () => {
  const presentation = new PresentationSceneModel();
  const scene = presentation.menu({ commands: [{ id: 'items', text: 'Items' }] });
  let backed = false;
  const controller = new SceneInteractionController({ onBack: () => { backed = true; return 'field'; } });
  controller.setScene(scene);

  const result = await controller.handle({ type: 'back' });
  assert.equal(result, 'field');
  assert.equal(backed, true);
});
