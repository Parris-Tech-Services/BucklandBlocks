import { z } from 'zod';
import { BLOCKS, BlockType } from './blocks';

export const SAVE_KEY = 'buckland_blocks_save';
export const BACKUP_KEY = `${SAVE_KEY}_previous`;
const block = z.number().int().refine((value) => Object.hasOwn(BLOCKS, value), 'Unknown block');
const position = z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() });
const saveSchema = z.object({
  version: z.literal(1).optional(), // Original saves had no version.
  playerPosition: position,
  playerRotation: z.object({ x: z.number().finite().min(-Math.PI / 2).max(Math.PI / 2), y: z.number().finite() }),
  inventory: z.array(block.nullable()).length(36),
  inventoryCounts: z.array(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)).length(36),
  selectedSlot: z.number().int().min(0).max(8),
  gameTime: z.number().finite().min(0).max(24000),
  chunks: z.array(z.object({
    key: z.string().regex(/^-?\d+,-?\d+$/).refine((key) => key.split(',').every((v) => Number.isSafeInteger(Number(v)))),
    voxelData: z.array(block).length(16 * 128 * 16),
  })).max(1024),
  timestamp: z.number().finite().optional(),
}).superRefine((save, ctx) => {
  save.inventory.forEach((item, index) => {
    if ((item === null || item === BlockType.AIR) !== (save.inventoryCounts[index] === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Inconsistent inventory stack' });
    }
  });
  if (new Set(save.chunks.map((chunk) => chunk.key)).size !== save.chunks.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate chunks' });
  }
});
export type GameSave = z.infer<typeof saveSchema>;
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type SaveRead = { data: GameSave | null; error: string | null };

export function parseSave(raw: string): GameSave {
  // Bound parsing work before constructing voxel arrays.
  if (raw.length > 16 * 1024 * 1024) throw new Error('Save is too large to load safely.');
  return saveSchema.parse(JSON.parse(raw));
}
export function readSave(storage: StorageAccess = localStorage): SaveRead {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return { data: raw === null ? null : parseSave(raw), error: null };
  } catch {
    return { data: null, error: 'The saved world could not be read. It has not been deleted or overwritten.' };
  }
}
export function writeSave(data: GameSave, storage: StorageAccess = localStorage): void {
  const serialised = JSON.stringify({ ...saveSchema.parse(data), version: 1 });
  if (serialised.length > 16 * 1024 * 1024) throw new Error('World is too large for this save format.');
  const previous = storage.getItem(SAVE_KEY);
  // Fail before replacing the original if validation or backup cannot complete.
  if (previous !== null) {
    parseSave(previous);
    storage.setItem(BACKUP_KEY, previous);
  }
  storage.setItem(SAVE_KEY, serialised);
}
export function deleteSave(storage: StorageAccess = localStorage): void {
  const previous = storage.getItem(SAVE_KEY);
  if (previous !== null) storage.setItem(BACKUP_KEY, previous);
  storage.removeItem(SAVE_KEY);
}

