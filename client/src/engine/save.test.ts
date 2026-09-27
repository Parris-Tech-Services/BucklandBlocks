import assert from "node:assert/strict";
import test from "node:test";
import { BlockType } from "./blocks";
import {
  SAVE_KEY,
  loadWorld,
  readSaveStatus,
  saveWorld,
  validateWorldSave,
  type WorldSave,
} from "./save";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});

function createValidSave(): WorldSave {
  const inventory = new Array<BlockType | null>(36).fill(null);
  const inventoryCounts = new Array<number>(36).fill(0);
  inventory[0] = BlockType.WOOD_PLANK;
  inventoryCounts[0] = 12;

  return {
    version: 2,
    seed: "procedural-v1",
    chunks: [],
    inventory,
    inventoryCounts,
    selectedSlot: 0,
    playerPosition: { x: 4, y: 70, z: -2 },
    playerRotation: { x: 0.2, y: -1.1 },
    gameTime: 1234,
    timestamp: 1,
  };
}

test.beforeEach(() => storage.clear());

test("saveWorld and loadWorld round-trip representative persistent state", () => {
  const save = createValidSave();

  assert.deepEqual(saveWorld(save), { ok: true });
  assert.deepEqual(loadWorld(), save);
  assert.deepEqual(readSaveStatus(), { exists: true, valid: true });
});

test("legacy saves without a version migrate without mutating their stored source", () => {
  const save = createValidSave();
  const legacy = {
    chunks: save.chunks,
    inventory: save.inventory,
    inventoryCounts: save.inventoryCounts,
    selectedSlot: save.selectedSlot,
    playerPosition: save.playerPosition,
    playerRotation: save.playerRotation,
    gameTime: save.gameTime,
    timestamp: save.timestamp,
  };

  const migrated = validateWorldSave(legacy);

  assert.equal(migrated.version, 2);
  assert.equal(migrated.seed, "procedural-v1");
  assert.deepEqual(migrated.playerPosition, legacy.playerPosition);
});

test("invalid stored data is rejected and preserved for recovery", () => {
  const invalid = '{"playerPosition":"broken"}';
  storage.setItem(SAVE_KEY, invalid);

  assert.equal(loadWorld(), null);
  assert.equal(storage.getItem(SAVE_KEY), invalid);

  const status = readSaveStatus();
  assert.equal(status.exists, true);
  assert.equal(status.valid, false);
  assert.match(status.message ?? "", /player position is invalid/);
});

test("invalid selected slots are rejected before persistence", () => {
  const save = createValidSave();
  save.selectedSlot = 99;

  const result = saveWorld(save);

  assert.equal(result.ok, false);
  assert.equal(storage.getItem(SAVE_KEY), null);
});
