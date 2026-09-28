import assert from "node:assert/strict";
import { test } from "node:test";
import { BlockType } from "./blocks";
import {
  BACKUP_KEY,
  SAVE_KEY,
  parseSave,
  readSave,
  writeSave,
  type WorldSave,
} from "./save";

class MemoryStorage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function createSave(x = 4): WorldSave {
  const slots = new Array<BlockType | null>(36).fill(null);
  const counts = new Array<number>(36).fill(0);
  slots[0] = BlockType.WOOD_PLANK;
  counts[0] = 12;

  return {
    worldSeed: 12345,
    chunks: [],
    inventory: {
      slots,
      counts,
      selectedSlot: 0,
    },
    playerPosition: { x, y: 70, z: -2 },
    playerRotation: { x: 0.2, y: -1.1 },
    gameTime: 1234,
  };
}

test("writeSave/readSave round-trip representative persistent state", () => {
  const storage = new MemoryStorage() as unknown as Storage;
  const save = createSave();

  writeSave(save, storage);
  const result = readSave(storage);

  assert.equal(result.error, null);
  assert.ok(result.data);
  assert.deepEqual(result.data?.playerPosition, save.playerPosition);
  assert.deepEqual(result.data?.playerRotation, save.playerRotation);
  assert.deepEqual(result.data?.inventory, save.inventory);
  assert.equal(result.data?.gameTime, save.gameTime);
  assert.equal(result.data?.worldSeed, save.worldSeed);
  assert.deepEqual(result.data?.chunks, save.chunks);
});

test("version 1 saves without a seed remain readable for migration", () => {
  const storage = new MemoryStorage() as unknown as Storage;
  const save = createSave();
  const { worldSeed: _legacySeed, ...legacySave } = save;
  const raw = JSON.stringify({ ...legacySave, version: 1, timestamp: Date.now(), chunks: [] });
  storage.setItem(SAVE_KEY, raw);

  const result = readSave(storage);

  assert.equal(result.error, null);
  assert.equal(result.data?.worldSeed, undefined);
});

test("a valid previous save is backed up before replacement", () => {
  const storage = new MemoryStorage() as unknown as Storage;
  const first = createSave(1);
  const second = createSave(2);

  writeSave(first, storage);
  writeSave(second, storage);

  const backup = storage.getItem(BACKUP_KEY);
  assert.ok(backup);
  const backupSave = parseSave(backup);
  const currentSave = readSave(storage).data;
  assert.deepEqual(backupSave.playerPosition, first.playerPosition);
  assert.deepEqual(backupSave.inventory, first.inventory);
  assert.deepEqual(currentSave?.playerPosition, second.playerPosition);
  assert.deepEqual(currentSave?.inventory, second.inventory);
});

test("invalid stored data is rejected without deleting or replacing it", () => {
  const storage = new MemoryStorage() as unknown as Storage;
  const invalid = '{"version":1,"broken":true}';
  storage.setItem(SAVE_KEY, invalid);

  const result = readSave(storage);

  assert.equal(result.data, null);
  assert.equal(result.error, "The saved world could not be read.");
  assert.equal(storage.getItem(SAVE_KEY), invalid);
});

test("writeSave refuses to replace an invalid previous save", () => {
  const storage = new MemoryStorage() as unknown as Storage;
  const invalid = '{"version":1,"broken":true}';
  storage.setItem(SAVE_KEY, invalid);

  assert.throws(() => writeSave(createSave(), storage));
  assert.equal(storage.getItem(SAVE_KEY), invalid);
  assert.equal(storage.getItem(BACKUP_KEY), null);
});
