import { BlockType } from "./blocks";

export const SAVE_KEY = "buckland_blocks_save";
export const SAVE_VERSION = 2;
export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 128;
export const MAX_SAVED_CHUNKS = 256;

export interface SavedChunk {
  key: string;
  voxelData: number[];
}

export interface WorldSave {
  version: typeof SAVE_VERSION;
  seed: "procedural-v1";
  // Only player-modified chunk overrides are persisted. Procedural chunks regenerate from seed.
  chunks: SavedChunk[];
  inventory: (BlockType | null)[];
  inventoryCounts: number[];
  selectedSlot: number;
  playerPosition: { x: number; y: number; z: number };
  playerRotation: { x: number; y: number };
  gameTime: number;
  timestamp: number;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const validPosition = (value: any): value is { x: number; y: number; z: number } =>
  value &&
  finite(value.x) &&
  finite(value.y) &&
  finite(value.z) &&
  Math.abs(value.x) <= 1_000_000 &&
  Math.abs(value.z) <= 1_000_000 &&
  value.y >= -100 &&
  value.y <= CHUNK_HEIGHT + 100;

const validRotation = (value: any): value is { x: number; y: number } =>
  value &&
  finite(value.x) &&
  finite(value.y) &&
  Math.abs(value.x) <= Math.PI / 2 + 0.01 &&
  Math.abs(value.y) <= Math.PI * 1000;

const validInventory = (items: any, counts: any): boolean =>
  Array.isArray(items) &&
  items.length === 36 &&
  Array.isArray(counts) &&
  counts.length === 36 &&
  items.every(
    (item) =>
      item === null ||
      (Number.isInteger(item) && item >= BlockType.AIR && item <= BlockType.SKY),
  ) &&
  counts.every((count) => Number.isInteger(count) && count >= 0 && count <= 9999);

const validChunk = (chunk: any): chunk is SavedChunk =>
  chunk &&
  typeof chunk.key === "string" &&
  /^-?\d+,-?\d+$/.test(chunk.key) &&
  Array.isArray(chunk.voxelData) &&
  chunk.voxelData.length === CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT &&
  chunk.voxelData.every(
    (value: unknown) =>
      Number.isInteger(value) && Number(value) >= BlockType.AIR && Number(value) <= BlockType.SKY,
  );

function migrate(raw: any): WorldSave {
  const chunks = Array.isArray(raw?.chunks)
    ? raw.chunks.map((chunk: any) => ({
        key: chunk.key ?? `${chunk.x},${chunk.z}`,
        voxelData: Array.from(chunk.voxelData ?? []),
      }))
    : [];

  const inventory = Array.isArray(raw?.inventory) ? raw.inventory : raw?.inventory?.slots;
  const inventoryCounts = Array.isArray(raw?.inventoryCounts)
    ? raw.inventoryCounts
    : raw?.inventory?.counts;

  return {
    version: SAVE_VERSION,
    seed: "procedural-v1",
    chunks,
    inventory: inventory ?? new Array(36).fill(null),
    inventoryCounts: inventoryCounts ?? new Array(36).fill(0),
    selectedSlot: raw?.selectedSlot ?? raw?.inventory?.selectedSlot ?? 0,
    playerPosition: raw?.playerPosition,
    playerRotation: raw?.playerRotation,
    gameTime: raw?.gameTime ?? 0,
    timestamp: raw?.timestamp ?? Date.now(),
  };
}

export function validateWorldSave(raw: unknown): WorldSave {
  const save = migrate(raw);

  if (!validPosition(save.playerPosition)) {
    throw new Error("player position is invalid");
  }

  if (!validRotation(save.playerRotation)) {
    throw new Error("player rotation is invalid");
  }

  if (!validInventory(save.inventory, save.inventoryCounts)) {
    throw new Error("inventory is invalid");
  }

  if (!Number.isInteger(save.selectedSlot) || save.selectedSlot < 0 || save.selectedSlot > 8) {
    throw new Error("selected hotbar slot is invalid");
  }

  if (!finite(save.gameTime) || save.gameTime < 0 || save.gameTime >= 24000) {
    throw new Error("game time is invalid");
  }

  if (
    !Array.isArray(save.chunks) ||
    save.chunks.length > MAX_SAVED_CHUNKS ||
    !save.chunks.every(validChunk)
  ) {
    throw new Error("world chunks are invalid or exceed the save limit");
  }

  return save;
}

export function saveWorld(worldData: WorldSave): SaveResult {
  try {
    if (typeof localStorage === "undefined") {
      return { ok: false, error: "browser storage is unavailable" };
    }

    const save = validateWorldSave(worldData);
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "storage write failed";
    console.error("Failed to save world:", error);
    return { ok: false, error: message };
  }
}

export function loadWorld(): WorldSave | null {
  try {
    if (typeof localStorage === "undefined") return null;

    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    return validateWorldSave(JSON.parse(raw));
  } catch (error) {
    // Invalid data is deliberately left in place so recovery/export remains possible.
    console.error("Saved world is invalid and was not loaded:", error);
    return null;
  }
}

export function hasSave(): boolean {
  return typeof localStorage !== "undefined" && localStorage.getItem(SAVE_KEY) !== null;
}

export function readSaveStatus(): { exists: boolean; valid: boolean; message?: string } {
  try {
    if (typeof localStorage === "undefined") return { exists: false, valid: false };

    const raw = localStorage.getItem(SAVE_KEY);
    if (raw === null) return { exists: false, valid: false };

    validateWorldSave(JSON.parse(raw));
    return { exists: true, valid: true };
  } catch (error) {
    return {
      exists: true,
      valid: false,
      message: error instanceof Error ? error.message : "saved world could not be read",
    };
  }
}

export function deleteSave(): SaveResult {
  try {
    if (typeof localStorage === "undefined") {
      return { ok: false, error: "browser storage is unavailable" };
    }

    localStorage.removeItem(SAVE_KEY);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "storage delete failed",
    };
  }
}
