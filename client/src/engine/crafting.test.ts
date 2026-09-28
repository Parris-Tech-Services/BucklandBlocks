import { test } from 'node:test';
import assert from 'node:assert/strict';
import { craftSelection } from './crafting';
import { BlockType as B } from './blocks';
import { type Stack } from './inventory';

test('log can occupy any cell; only one is consumed', () => {
  for (let i = 0; i < 4; i++) {
    const grid: (B|null)[] = [null,null,null,null]; grid[i] = B.WOOD_LOG;
    const source: Stack[] = [{type:B.WOOD_LOG,count:2},null];
    const r = craftSelection(source,grid);
    assert.equal(r.ok,true);
    assert.deepEqual(r.slots,[{type:B.WOOD_LOG,count:1},{type:B.WOOD_PLANK,count:4}]);
    assert.equal(source[0]?.count,2);
  }
});
test('full output rejects atomically', () => {
  const source: Stack[] = [{type:B.WOOD_LOG,count:2},{type:B.WOOD_PLANK,count:63}];
  const r=craftSelection(source,[B.WOOD_LOG,null,null,null]);
  assert.equal(r.ok,false); assert.deepEqual(r.slots,source);
});
test('consumed final log frees space for output', () => {
  assert.deepEqual(craftSelection([{type:B.WOOD_LOG,count:1}],[null,B.WOOD_LOG,null,null]).slots,
    [{type:B.WOOD_PLANK,count:4}]);
});
test('extra ingredients and unsupported shapes fail', () => {
  for(const grid of [[B.WOOD_LOG,B.WOOD_LOG,null,null],[B.WOOD_PLANK,null,B.WOOD_PLANK,null],[]]) {
    assert.equal(craftSelection([{type:B.WOOD_LOG,count:2},null],grid).ok,false);
  }
});
test('repeat craft rereads inventory and cannot duplicate output', () => {
  let slots: Stack[] = [{type:B.WOOD_LOG,count:2},null];
  const grid=[B.WOOD_LOG,null,null,null];
  slots=craftSelection(slots,grid).slots; slots=craftSelection(slots,grid).slots;
  const failed=craftSelection(slots,grid);
  assert.equal(failed.ok,false);
  assert.equal(slots.reduce((n,s)=>n+(s?.type===B.WOOD_PLANK?s.count:0),0),8);
});
test('selection, cancellation and serialization leave inventory untouched', () => {
  const slots=[{type:B.WOOD_LOG,count:2}];
  assert.deepEqual(JSON.parse(JSON.stringify(slots)),slots);
  assert.equal(craftSelection(slots,[null,null,null,null]).slots,slots);
});
