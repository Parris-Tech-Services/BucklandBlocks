import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { BlockType } from "../../engine/blocks";
import * as THREE from "three";

export type GamePhase = "ready" | "playing" | "ended";
export type MenuState = "none" | "inventory" | "crafting" | "pause";

interface ChunkData {
  voxelData: Uint8Array;
  dirty: boolean;
  revision: number;
}

interface CraftIngredient {
  type: BlockType;
  count: number;
}

interface CraftResult {
  type: BlockType;
  count: number;
}

interface SavedGame {
  version?: number;
  playerPosition?: { x: number; y: number; z: number };
  playerRotation?: { x: number; y: number };
  inventory?: (BlockType | null)[];
  inventoryCounts?: number[];
  selectedSlot?: number;
  gameTime?: number;
  chunks?: Array<{ key: string; voxelData: number[] }>;
}

interface GameState {
  phase: GamePhase;
  activeMenu: MenuState;
  gameplayActive: boolean;
  hasLoadedSave: boolean;

  playerPosition: THREE.Vector3;
  playerRotation: { x: number; y: number };

  inventory: (BlockType | null)[];
  inventoryCounts: number[];
  selectedSlot: number;

  chunks: Map<string, ChunkData>;
  gameTime: number;

  fps: number;
  setFps: (v: number) => void;

  start: () => void;
  restart: () => void;
  end: () => void;

  setMenu: (menu: MenuState) => void;
  toggleMenu: (menu: Exclude<MenuState, "none">) => void;

  setPlayerPosition: (position: THREE.Vector3) => void;
  setPlayerRotation: (rotation: { x: number; y: number }) => void;

  setSelectedSlot: (slot: number) => void;
  addToInventory: (blockType: BlockType, count?: number) => boolean;
  removeFromInventory: (slot: number, count?: number) => boolean;
  moveInventoryItem: (from: number, to: number) => boolean;
  craftRecipe: (ingredients: CraftIngredient[], result: CraftResult) => boolean;

  setBlock: (x: number, y: number, z: number, blockType: BlockType) => void;
  getBlock: (x: number, y: number, z: number) => BlockType;
  setChunk: (chunkX: number, chunkZ: number, voxelData: Uint8Array) => void;
  getChunk: (chunkX: number, chunkZ: number) => Uint8Array | null;
  markChunkDirty: (chunkX: number, chunkZ: number) => void;

  updateGameTime: (delta: number) => void;
}

const INVENTORY_SIZE = 36;
const CHUNK_SIZE = 16;
const WORLD_HEIGHT = 128;

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

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeInventory = (
  slots: unknown,
  counts: unknown,
  fallbackSlots: (BlockType | null)[],
  fallbackCounts: number[],
): [(BlockType | null)[], number[]] => {
  if (!Array.isArray(slots) || !Array.isArray(counts)) {
    return [fallbackSlots, fallbackCounts];
  }

  const nextSlots = new Array<BlockType | null>(INVENTORY_SIZE).fill(null);
  const nextCounts = new Array<number>(INVENTORY_SIZE).fill(0);

  for (let i = 0; i < INVENTORY_SIZE; i += 1) {
    const slot = slots[i];
    const count = counts[i];
    if (
      (slot === null ||
        (typeof slot === "number" &&
          Number.isInteger(slot) &&
          slot >= BlockType.AIR &&
          slot <= BlockType.SKY)) &&
      typeof count === "number" &&
      Number.isInteger(count) &&
      count >= 0
    ) {
      nextSlots[i] = count > 0 ? (slot as BlockType | null) : null;
      nextCounts[i] = count > 0 ? count : 0;
    }
  }

  return [nextSlots, nextCounts];
};

const loadSavedGame = (): SavedGame | null => {
  try {
    const raw = localStorage.getItem("buckland_blocks_save");
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SavedGame;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (error) {
    console.error("Failed to load saved game:", error);
    return null;
  }
};

export const useGame = create<GameState>()(
  subscribeWithSelector((set, get) => {
    const savedGame = loadSavedGame();
    const [defaultInventory, defaultCounts] = initializeInventory();
    const [initialInventory, initialCounts] = normalizeInventory(
      savedGame?.inventory,
      savedGame?.inventoryCounts,
      defaultInventory,
      defaultCounts,
    );

    const initialChunks = new Map<string, ChunkData>();
    if (Array.isArray(savedGame?.chunks)) {
      for (const chunk of savedGame.chunks) {
        if (
          chunk &&
          typeof chunk.key === "string" &&
          Array.isArray(chunk.voxelData) &&
          chunk.voxelData.length === CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE
        ) {
          initialChunks.set(chunk.key, {
            voxelData: new Uint8Array(chunk.voxelData),
            dirty: true,
            revision: 0,
          });
        }
      }
    }

    const savedPosition = savedGame?.playerPosition;
    const playerPosition =
      savedPosition &&
      isFiniteNumber(savedPosition.x) &&
      isFiniteNumber(savedPosition.y) &&
      isFiniteNumber(savedPosition.z)
        ? new THREE.Vector3(savedPosition.x, savedPosition.y, savedPosition.z)
        : new THREE.Vector3(0.5, 70, 0.5);

    const savedRotation = savedGame?.playerRotation;
    const playerRotation =
      savedRotation && isFiniteNumber(savedRotation.x) && isFiniteNumber(savedRotation.y)
        ? { x: savedRotation.x, y: savedRotation.y }
        : { x: 0, y: 0 };

    const savedSelectedSlot = savedGame?.selectedSlot;
    const savedGameTime = savedGame?.gameTime;

    return {
      phase: "ready",
      activeMenu: "none",
      gameplayActive: true,
      hasLoadedSave: savedGame !== null,

      playerPosition,
      playerRotation,

      inventory: initialInventory,
      inventoryCounts: initialCounts,
      selectedSlot:
        typeof savedSelectedSlot === "number" &&
        Number.isInteger(savedSelectedSlot) &&
        savedSelectedSlot >= 0 &&
        savedSelectedSlot <= 8
          ? savedSelectedSlot
          : 0,

      chunks: initialChunks,
      gameTime: isFiniteNumber(savedGameTime) ? savedGameTime : 0,

      fps: 0,
      setFps: (v) => set({ fps: Number.isFinite(v) ? v : 0 }),

      start: () => set({ phase: "playing" }),
      restart: () => set({ phase: "ready" }),
      end: () => set({ phase: "ended", gameplayActive: false }),

      setMenu: (menu) => set({ activeMenu: menu, gameplayActive: menu === "none" }),
      toggleMenu: (menu) =>
        set((state) => {
          const next = state.activeMenu === menu ? "none" : menu;
          return { activeMenu: next, gameplayActive: next === "none" };
        }),

      setPlayerPosition: (position) => set({ playerPosition: position.clone() }),
      setPlayerRotation: (rotation) => set({ playerRotation: { ...rotation } }),

      setSelectedSlot: (slot) =>
        set({ selectedSlot: Math.max(0, Math.min(8, Math.trunc(slot))) }),

      addToInventory: (blockType, count = 1) => {
        if (!Number.isInteger(count) || count <= 0 || blockType === BlockType.AIR) return false;

        let success = false;
        set((state) => {
          const inventory = [...state.inventory];
          const counts = [...state.inventoryCounts];

          const existing = inventory.findIndex((item) => item === blockType);
          if (existing >= 0) {
            counts[existing] += count;
            success = true;
            return { inventory, inventoryCounts: counts };
          }

          const empty = inventory.findIndex((item) => item === null);
          if (empty < 0) return {};

          inventory[empty] = blockType;
          counts[empty] = count;
          success = true;
          return { inventory, inventoryCounts: counts };
        });
        return success;
      },

      removeFromInventory: (slot, count = 1) => {
        if (
          !Number.isInteger(slot) ||
          slot < 0 ||
          slot >= INVENTORY_SIZE ||
          !Number.isInteger(count) ||
          count <= 0
        ) {
          return false;
        }

        let success = false;
        set((state) => {
          if (state.inventory[slot] === null || state.inventoryCounts[slot] < count) return {};

          const inventory = [...state.inventory];
          const counts = [...state.inventoryCounts];
          counts[slot] -= count;

          if (counts[slot] <= 0) {
            counts[slot] = 0;
            inventory[slot] = null;
          }

          success = true;
          return { inventory, inventoryCounts: counts };
        });
        return success;
      },

      moveInventoryItem: (from, to) => {
        if (
          !Number.isInteger(from) ||
          !Number.isInteger(to) ||
          from < 0 ||
          to < 0 ||
          from >= INVENTORY_SIZE ||
          to >= INVENTORY_SIZE ||
          from === to
        ) {
          return false;
        }

        let success = false;
        set((state) => {
          if (state.inventory[from] === null) return {};

          const inventory = [...state.inventory];
          const counts = [...state.inventoryCounts];

          [inventory[from], inventory[to]] = [inventory[to], inventory[from]];
          [counts[from], counts[to]] = [counts[to], counts[from]];

          success = true;
          return { inventory, inventoryCounts: counts };
        });
        return success;
      },

      craftRecipe: (ingredients, result) => {
        if (
          !ingredients.length ||
          !Number.isInteger(result.count) ||
          result.count <= 0 ||
          result.type === BlockType.AIR
        ) {
          return false;
        }

        let success = false;
        set((state) => {
          const required = new Map<BlockType, number>();
          for (const ingredient of ingredients) {
            if (!Number.isInteger(ingredient.count) || ingredient.count <= 0) return {};
            required.set(
              ingredient.type,
              (required.get(ingredient.type) ?? 0) + ingredient.count,
            );
          }

          for (const [type, needed] of required) {
            let available = 0;
            for (let i = 0; i < INVENTORY_SIZE; i += 1) {
              if (state.inventory[i] === type) available += state.inventoryCounts[i];
            }
            if (available < needed) return {};
          }

          const inventory = [...state.inventory];
          const counts = [...state.inventoryCounts];

          for (const [type, needed] of required) {
            let remaining = needed;
            for (let i = 0; i < INVENTORY_SIZE && remaining > 0; i += 1) {
              if (inventory[i] !== type || counts[i] <= 0) continue;
              const used = Math.min(counts[i], remaining);
              counts[i] -= used;
              remaining -= used;
              if (counts[i] === 0) inventory[i] = null;
            }
          }

          const existingOutput = inventory.findIndex((item) => item === result.type);
          if (existingOutput >= 0) {
            counts[existingOutput] += result.count;
          } else {
            const empty = inventory.findIndex((item) => item === null);
            if (empty < 0) return {};
            inventory[empty] = result.type;
            counts[empty] = result.count;
          }

          success = true;
          return { inventory, inventoryCounts: counts };
        });

        return success;
      },

      setBlock: (x, y, z, blockType) => {
        if (!Number.isInteger(y) || y < 0 || y >= WORLD_HEIGHT) return;

        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const chunkKey = `${chunkX},${chunkZ}`;

        set((state) => {
          const chunk = state.chunks.get(chunkKey);
          if (!chunk) return {};

          const localX = x - chunkX * CHUNK_SIZE;
          const localZ = z - chunkZ * CHUNK_SIZE;
          if (localX < 0 || localX >= CHUNK_SIZE || localZ < 0 || localZ >= CHUNK_SIZE) return {};

          const index = localX + y * CHUNK_SIZE + localZ * CHUNK_SIZE * WORLD_HEIGHT;
          if (chunk.voxelData[index] === blockType) return {};

          const chunks = new Map(state.chunks);
          const voxelData = new Uint8Array(chunk.voxelData);
          voxelData[index] = blockType;
          chunks.set(chunkKey, {
            voxelData,
            dirty: true,
            revision: chunk.revision + 1,
          });

          const bumpNeighbour = (cx: number, cz: number) => {
            const key = `${cx},${cz}`;
            const neighbour = chunks.get(key);
            if (!neighbour) return;
            chunks.set(key, { ...neighbour, revision: neighbour.revision + 1 });
          };

          if (localX === 0) bumpNeighbour(chunkX - 1, chunkZ);
          if (localX === CHUNK_SIZE - 1) bumpNeighbour(chunkX + 1, chunkZ);
          if (localZ === 0) bumpNeighbour(chunkX, chunkZ - 1);
          if (localZ === CHUNK_SIZE - 1) bumpNeighbour(chunkX, chunkZ + 1);

          return { chunks };
        });
      },

      getBlock: (x, y, z) => {
        if (y < 0 || y >= WORLD_HEIGHT) return BlockType.AIR;

        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const chunk = get().chunks.get(`${chunkX},${chunkZ}`);
        if (!chunk) return BlockType.AIR;

        const localX = x - chunkX * CHUNK_SIZE;
        const localZ = z - chunkZ * CHUNK_SIZE;
        const index = localX + y * CHUNK_SIZE + localZ * CHUNK_SIZE * WORLD_HEIGHT;
        return (chunk.voxelData[index] ?? BlockType.AIR) as BlockType;
      },

      setChunk: (chunkX, chunkZ, voxelData) => {
        const key = `${chunkX},${chunkZ}`;
        set((state) => {
          if (state.chunks.has(key)) return {};
          const chunks = new Map(state.chunks);
          chunks.set(key, { voxelData, dirty: false, revision: 0 });
          return { chunks };
        });
      },

      getChunk: (chunkX, chunkZ) =>
        get().chunks.get(`${chunkX},${chunkZ}`)?.voxelData ?? null,

      markChunkDirty: (chunkX, chunkZ) => {
        const key = `${chunkX},${chunkZ}`;
        set((state) => {
          const chunk = state.chunks.get(key);
          if (!chunk) return {};
          const chunks = new Map(state.chunks);
          chunks.set(key, { ...chunk, revision: chunk.revision + 1 });
          return { chunks };
        });
      },

      updateGameTime: (delta) =>
        set((state) => ({ gameTime: (state.gameTime + delta) % 24000 })),
    };
  }),
);
