import test from 'node:test';
import assert from 'node:assert/strict';
import {mvRawCommandSummary} from '../../tools/editor/mv-raw-command-ui.js';

test('describes preserved raw MV command codes and indent levels',()=>{
  assert.equal(mvRawCommandSummary([[{code:111,indent:0,parameters:[0,1,0]},{code:355,indent:2,parameters:['x']}]]),'MV code 111 + 355 • indent 0, 2 • preserved read-only because no proven reversible Plushbound mapping is available.');
});

test('explains malformed or empty raw payloads without guessing',()=>{
  assert.match(mvRawCommandSummary([]),/preserved read-only/);
  assert.match(mvRawCommandSummary([{}]),/no reversible editor mapping/);
});
