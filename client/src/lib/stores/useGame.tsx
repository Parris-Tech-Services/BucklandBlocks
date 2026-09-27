import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import * as THREE from "three";
import { BlockType } from "../../engine/blocks";

export type GamePhase = "ready" | "playing" | "ended";
export type MenuState = "none" | "inventory" | "crafting" | "pause";

export interface ItemStack {
  type: BlockType;
  count: number;
}

interface ChunkData {
  voxelData: Uint8Array;
  dirty: boolean;
  revision: number;
}

interface GameState {
  phase: GamePhase;
  menu: MenuState;
  playerPosition: THREE.Vector3;
  playerRotation: { x: number; y: number };
  hasSavedGame: boolean;
  inventory: (BlockType | null)[];
  inventoryCounts: number[];
  selectedSlot: number;
  chunks: Map<string, ChunkData>;
  gameTime: number;
  fps: number;
  setFps: (value: number) => void;
  setMenu: (menu: MenuState) => void;
  start: () => void;
  restart: () => void;
  end: () => void;
  setPlayerPosition: (position: THREE.Vector3) => void;
  setPlayerRotation: (rotation: { x: number; y: number }) => void;
  setSelectedSlot: (slot: number) => void;
  addToInventory: (blockType: BlockType, count?: number) => boolean;
  removeFromInventory: (slot: number, count?: number) => void;
  swapInventorySlots: (a: number, b: number) => void;
  craftRecipe: (ingredients: ItemStack[], result: ItemStack) => boolean;
  setBlock: (x: number, y: number, z: number, blockType: BlockType) => void;
  getBlock: (x: number, y: number, z: number) => BlockType;
  setChunk: (chunkX: number, chunkZ: number, voxelData: Uint8Array) => void;
  getChunk: (chunkX: number, chunkZ: number) => Uint8Array | null;
  markChunkDirty: (chunkX: number, chunkZ: number) => void;
  updateGameTime: (delta: number) => void;
  saveGame: () => boolean;
}

const SAVE_KEY = "buckland_blocks_save";
const SAVE_VERSION = 2;
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 128;
const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
const INVENTORY_SIZE = 36;

const initializeInventory = (): [(BlockType | null)[], number[]] => {
  const inventory = new Array<BlockType | null>(INVENTORY_SIZE).fill(null);
  const counts = new Array<number>(INVENTORY_SIZE).fill(0);
  inventory[0] = BlockType.WOOD_PLANK;
  counts[0] = 64;
  inventory[1] = BlockType.DIRT;
  counts[1] = 64;
  inventory[2] = BlockType.COBBLESTONE;
  counts[2] = 64;
  return [inventory, counts];
};

function validBlock(value: unknown): value is BlockType {
  return Number.isInteger(value) && Number(value) >= BlockType.AIR && Number(value) <= BlockType.SKY;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function loadSavedGame() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as any;

    const sourceInventory = Array.isArray(parsed.inventory)
      ? parsed.inventory
      : Array.isArray(parsed.inventory?.slots)
        ? parsed.inventory.slots
        : null;
    const sourceCounts = Array.isArray(parsed.inventoryCounts)
      ? parsed.inventoryCounts
      : Array.isArray(parsed.inventory?.counts)
        ? parsed.inventory.counts
        : null;

    const [fallbackInventory, fallbackCounts] = initializeInventory();
    const inventory = fallbackInventory.map((fallback, index) => {
      const value = sourceInventory?.[index];
      return value === null || validBlock(value) ? value : fallback;
    });
    const inventoryCounts = fallbackCounts.map((fallback, index) => {
      const value = sourceCounts?.[index];
      return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
    });

    const chunks = new Map<string, ChunkData>();
    if (Array.isArray(parsed.chunks)) {
      parsed.chunks.forEach((chunk: any) => {
        const key = typeof chunk?.key === "string"
          ? chunk.key
          : Number.isInteger(chunk?.x) && Number.isInteger(chunk?.z)
            ? `${chunk.x},${chunk.z}`
            : null;
        if (!key || !/^-?\d+,-?\d+$/.test(key) || !Array.isArray(chunk?.voxelData)) return;
        if (chunk.voxelData.length !== CHUNK_VOLUME) return;
        const voxelData = new Uint8Array(CHUNK_VOLUME);
        for (let i = 0; i < CHUNK_VOLUME; i += 1) {
          const value = chunk.voxelData[i];
          voxelData[i] = validBlock(value) ? value : BlockType.AIR;
        }
        chunks.set(key, { voxelData, dirty: false, revision: 0 });
      });
    }

    return {
      playerPosition: new THREE.Vector3(
        finiteNumber(parsed.playerPosition?.x, 0.5),
        finiteNumber(parsed.playerPosition?.y, 70),
        finiteNumber(parsed.playerPosition?.z, 0.5),
      ),
      playerRotation: {
        x: finiteNumber(parsed.playerRotation?.x, 0),
        y: finiteNumber(parsed.playerRotation?.y, 0),
      },
      inventory,
      inventoryCounts,
      selectedSlot: Math.max(0, Math.min(8, Math.floor(finiteNumber(parsed.selectedSlot ?? parsed.inventory?.selectedSlot, 0)))),
      chunks,
      gameTime: Math.max(0, finiteNumber(parsed.gameTime, 0)) % 24000,
    };
  } catch (error) {
    console.error("Saved world could not be loaded; leaving the save untouched.", error);
    return null;
  }
}

function tryAddItem(
  inventory: (BlockType | null)[],
  counts: number[],
  blockType: BlockType,
  count: number,
): boolean {
  if (count <= 0) return true;
  const existing = inventory.findIndex((item) => item === blockType);
  if (existing >= 0) {
    counts[existing] += count;
    return true;
  }
  const empty = inventory.findIndex((item, index) => item === null || counts[index] <= 0);
  if (empty < 0) return false;
  inventory[empty] = blockType;
  counts[empty] = count;
  return true;
}

function bumpChunk(map: Map<string, ChunkData>, chunkX: number, chunkZ: number) {
  const key = `${chunkX},${chunkZ}`;
  const chunk = map.get(key);
  if (!chunk) return;
  map.set(key, { ...chunk, dirty: true, revision: chunk.revision + 1 });
}

export const useGame = create<GameState>()(
  subscribeWithSelector((set, get) => {
    const saved = loadSavedGame();
    const [initialInventory, initialCounts] = initializeInventory();

    return {
      phase: "ready",
      menu: "none",
      playerPosition: saved?.playerPosition ?? new THREE.Vector3(0.5, 70, 0.5),
      playerRotation: saved?.playerRotation ?? { x: 0, y: 0 },
      hasSavedGame: Boolean(saved),
      inventory: saved?.inventory ?? initialInventory,
      inventoryCounts: saved?.inventoryCounts ?? initialCounts,
      selectedSlot: saved?.selectedSlot ?? 0,
      chunks: saved?.chunks ?? new Map<string, ChunkData>(),
      gameTime: saved?.gameTime ?? 0,
      fps: 0,

      setFps: (value) => set({ fps: value }),
      setMenu: (menu) => set({ menu }),
      start: () => set((state) => state.phase === "ready" ? { phase: "playing" } : {}),
      restart: () => set({ phase: "ready" }),
      end: () => set((state) => state.phase === "playing" ? { phase: "ended" } : {}),
      setPlayerPosition: (position) => set({ playerPosition: position.clone() }),
      setPlayerRotation: (rotation) => set({ playerRotation: { ...rotation } }),
      setSelectedSlot: (slot) => set({ selectedSlot: Math.max(0, Math.min(8, Math.floor(slot))) }),

      addToInventory: (blockType, count = 1) => {
        const state = get();
        const inventory = [...state.inventory];
        const counts = [...state.inventoryCounts];
        const added = tryAddItem(inventory, counts, blockType, count);
        if (added) set({ inventory, inventoryCounts: counts });
        return added;
      },

      removeFromInventory: (slot, count = 1) => {
        if (slot < 0 || slot >= INVENTORY_SIZE || count <= 0) return;
        set((state) => {
          const inventory = [...state.inventory];
          const counts = [...state.inventoryCounts];
          const remaining = Math.max(0, counts[slot] - count);
          counts[slot] = remaining;
          if (remaining === 0) inventory[slot] = null;
          return { inventory, inventoryCounts: counts };
        });
      },

      swapInventorySlots: (a, b) => {
        if (a === b || a < 0 || b < 0 || a >= INVENTORY_SIZE || b >= INVENTORY_SIZE) return;
        set((state) => {
          const inventory = [...state.inventory];
          const counts = [...state.inventoryCounts];
          [inventory[a], inventory[b]] = [inventory[b], inventory[a]];
          [counts[a], counts[b]] = [counts[b], counts[a]];
          return { inventory, inventoryCounts: counts };
        });
      },

      craftRecipe: (ingredients, result) => {
        const state = get();
        const available = new Map<BlockType, number>();
        state.inventory.forEach((item, index) => {
          if (item === null) return;
          available.set(item, (available.get(item) ?? 0) + state.inventoryCounts[index]);
        });
        if (ingredients.some((ingredient) => (available.get(ingredient.type) ?? 0) < ingredient.count)) return false;

        const inventory = [...state.inventory];
        const counts = [...state.inventoryCounts];
        for (const ingredient of ingredients) {
          let remaining = ingredient.count;
          for (let i = 0; i < inventory.length && remaining > 0; i += 1) {
            if (inventory[i] !== ingredient.type || counts[i] <= 0) continue;
            const take = Math.min(counts[i], remaining);
            counts[i] -= take;
            remaining -= take;
            if (counts[i] === 0) inventory[i] = null;
          }
        }

        if (!tryAddItem(inventory, counts, result.type, result.count)) return false;
        set({ inventory, inventoryCounts: counts });
        return true;
      },

      setBlock: (x, y, z, blockType) => {
        if (y < 0 || y >= CHUNK_HEIGHT) return;
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const localX = x - chunkX * CHUNK_SIZE;
        const localZ = z - chunkZ * CHUNK_SIZE;
        const key = `${chunkX},${chunkZ}`;
        const state = get();
        const chunk = state.chunks.get(key);
        if (!chunk) return;

        const index = localX + y * CHUNK_SIZE + localZ * CHUNK_SIZE * CHUNK_HEIGHT;
        if (chunk.voxelData[index] === blockType) return;
        const voxelData = new Uint8Array(chunk.voxelData);
        voxelData[index] = blockType;
        const chunks = new Map(state.chunks);
        chunks.set(key, { voxelData, dirty: true, revision: chunk.revision + 1 });
        if (localX === 0) bumpChunk(chunks, chunkX - 1, chunkZ);
        if (localX === CHUNK_SIZE - 1) bumpChunk(chunks, chunkX + 1, chunkZ);
        if (localZ === 0) bumpChunk(chunks, chunkX, chunkZ - 1);
        if (localZ === CHUNK_SIZE - 1) bumpChunk(chunks, chunkX, chunkZ + 1);
        set({ chunks });
      },

      getBlock: (x, y, z) => {
        if (y < 0 || y >= CHUNK_HEIGHT) return BlockType.AIR;
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const chunk = get().chunks.get(`${chunkX},${chunkZ}`);
        if (!chunk) return BlockType.AIR;
        const localX = x - chunkX * CHUNK_SIZE;
        const localZ = z - chunkZ * CHUNK_SIZE;
        const index = localX + y * CHUNK_SIZE + localZ * CHUNK_SIZE * CHUNK_HEIGHT;
        return (chunk.voxelData[index] ?? BlockType.AIR) as BlockType;
      },

      setChunk: (chunkX, chunkZ, voxelData) => {
        set((state) => {
          const chunks = new Map(state.chunks);
          const key = `${chunkX},${chunkZ}`;
          const previous = chunks.get(key);
          chunks.set(key, { voxelData, dirty: previous?.dirty ?? false, revision: (previous?.revision ?? 0) + 1 });
          bumpChunk(chunks, chunkX - 1, chunkZ);
          bumpChunk(chunks, chunkX + 1, chunkZ);
          bumpChunk(chunks, chunkX, chunkZ - 1);
          bumpChunk(chunks, chunkX, chunkZ + 1);
          return { chunks };
        });
      },

      getChunk: (chunkX, chunkZ) => get().chunks.get(`${chunkX},${chunkZ}`)?.voxelData ?? null,

      markChunkDirty: (chunkX, chunkZ) => {
        set((state) => {
          const chunks = new Map(state.chunks);
          bumpChunk(chunks, chunkX, chunkZ);
          return { chunks };
        });
      },

      updateGameTime: (delta) => set((state) => ({ gameTime: (state.gameTime + delta) % 24000 })),

      saveGame: () => {
        if (typeof localStorage === "undefined") return false;
        try {
          const state = get();
          const payload = {
            version: SAVE_VERSION,
            playerPosition: {
              x: state.playerPosition.x,
              y: state.playerPosition.y,
              z: state.playerPosition.z,
            },
            playerRotation: state.playerRotation,
            inventory: state.inventory,
            inventoryCounts: state.inventoryCounts,
            selectedSlot: state.selectedSlot,
            gameTime: state.gameTime,
            chunks: Array.from(state.chunks.entries()).map(([key, chunk]) => ({
              key,
              voxelData: Array.from(chunk.voxelData),
            })),
            timestamp: Date.now(),
          };
          localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
          set({ hasSavedGame: true });
          return true;
        } catch (error) {
          console.error("Failed to save world", error);
          return false;
        }
      },
    };
  }),
);
