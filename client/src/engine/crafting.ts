import { BlockType, BLOCKS } from './blocks';
import { type Stack, MAX_STACK } from './inventory';

// The grid selects ingredients, never owns them. Closing/reloading cannot lose items.
export function craftSelection(slots: Stack[], grid: (BlockType | null)[]) {
  const fail = (error: string) => ({ ok: false, slots, error });
  if (grid.length !== 4 || grid.filter(x => x !== null).length !== 1 || !grid.includes(BlockType.WOOD_LOG)) {
    return fail('Place one wood log in any cell. Other recipes are not supported yet.');
  }
  if (slots.some(s => s !== null && (!BLOCKS[s.type] || s.type === BlockType.AIR || !Number.isSafeInteger(s.count) || s.count <= 0))) {
    return fail('Invalid inventory. No items changed.');
  }
  const next = slots.map(s => s ? { ...s } : null);
  const input = next.findIndex(s => s?.type === BlockType.WOOD_LOG);
  if (input < 0) return fail('You need a wood log.');
  if (--next[input]!.count === 0) next[input] = null;
  let remaining = 4;
  for (let i = 0; i < next.length && remaining; i++) {
    const s = next[i];
    if (s?.type === BlockType.WOOD_PLANK && s.count < MAX_STACK) {
      const n = Math.min(remaining, MAX_STACK - s.count);
      s.count += n; remaining -= n;
    }
  }
  for (let i = 0; i < next.length && remaining; i++) {
    if (next[i] === null) { next[i] = { type: BlockType.WOOD_PLANK, count: remaining }; remaining = 0; }
  }
  if (remaining) return fail('Inventory full. No ingredients consumed.');
  return { ok: true, slots: next, error: '' };
}
