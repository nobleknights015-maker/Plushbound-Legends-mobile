import test from 'node:test';
import assert from 'node:assert/strict';

import { ClassicWindowSystem } from '../src/ui/ClassicWindowSystem.js';
import { lockNativeGameSurface } from '../src/runtime/BrowserRuntimeEntry.js';

test('oversized command menus page inside the viewport instead of extending beyond it', () => {
  const windows = new ClassicWindowSystem({ viewportWidth: 1604, viewportHeight: 720 });
  const commands = Array.from({ length: 30 }, (_, i) => ({ id: `cmd-${i}`, text: `Command ${i}` }));
  const model = windows.commandWindow({ commands, x: 1400, y: 650, width: 500, maxRows: 6, index: 17 });

  assert.equal(model.pagination.pageCount, 5);
  assert.equal(model.pagination.page, 2);
  assert.equal(model.items.length, 6);
  assert.ok(model.rect.x >= 0);
  assert.ok(model.rect.y >= 0);
  assert.ok(model.rect.x + model.rect.width <= 1604);
  assert.ok(model.rect.y + model.rect.height <= 720);
  for (const item of model.items) {
    assert.ok(item.rect.x >= model.rect.x);
    assert.ok(item.rect.y >= model.rect.y);
    assert.ok(item.rect.x + item.rect.width <= model.rect.x + model.rect.width + 0.001);
    assert.ok(item.rect.y + item.rect.height <= model.rect.y + model.rect.height + 0.001);
  }
});

test('classic windows clamp large rectangles to the logical game viewport', () => {
  const windows = new ClassicWindowSystem({ viewportWidth: 1604, viewportHeight: 720 });
  const model = windows.windowModel({ id: 'oversized', rect: { x: -500, y: -200, width: 4000, height: 2200 } });
  assert.ok(model.rect.x >= 0);
  assert.ok(model.rect.y >= 0);
  assert.ok(model.rect.x + model.rect.width <= 1604);
  assert.ok(model.rect.y + model.rect.height <= 720);
});

test('WebView document is locked to a fixed non-scrolling game surface and restores cleanly', () => {
  const html = { style: { overflow: 'auto' } };
  const body = { style: { margin: '8px', overflow: 'auto' } };
  const scrolls = [];
  const scope = {
    document: { documentElement: html, body },
    scrollTo(x, y) { scrolls.push([x, y]); }
  };

  const unlock = lockNativeGameSurface(scope);
  assert.equal(html.style.overflow, 'hidden');
  assert.equal(body.style.overflow, 'hidden');
  assert.equal(html.style.position, 'fixed');
  assert.equal(body.style.position, 'fixed');
  assert.equal(body.style.touchAction, 'none');
  assert.deepEqual(scrolls, [[0, 0]]);

  unlock();
  assert.equal(html.style.overflow, 'auto');
  assert.equal(body.style.overflow, 'auto');
  assert.equal(body.style.margin, '8px');
});
