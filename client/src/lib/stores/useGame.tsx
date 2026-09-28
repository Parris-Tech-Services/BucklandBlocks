import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import * as THREE from "three";
import { BlockType, getBlockData } from "../../engine/blocks";
import {
  addItems,
  moveStack,
  type Stack,
} from "../../engine/inventory";
import { readSave } from "../../engine/save";
import { craftFromInventory } from "../../engine/crafting";

export type GamePhase = "ready" | "playing" | "ended";

/** An item stack, e.g. the one held on the mouse cursor while rearranging slots. */
export interface ItemStack {
  type: BlockType;
  count: number;
}

export interface BlockEntity {
  id: string; // x,y,z
  type: BlockType;
  inventory: (BlockType | null)[];
  counts: number[];
  progress: number;
}

export interface DroppedItem {
  id: string;
  type: BlockType;
  count: number;
  position: THREE.Vector3;
}

export const CRAFTING_GRID_SIZE = 4; // 2x2 inventory crafting
export const CRAFTING_TABLE_GRID_SIZE = 9; // 3x3 crafting table

interface ChunkData {
  voxelData: Uint8Array;
  dirty: boolean;
  revision: number;
}

interface GameState {
  phase: GamePhase;
  playerPosition: THREE.Vector3;
  playerRotation: { x: number; y: number };
  inventory: (BlockType | null)[];
  inventoryCounts: number[];
  selectedSlot: number;
  armor: (BlockType | null)[];
  cursorItem: ItemStack | null;
  setCursorItem: (item: ItemStack | null) => void;
  craftingGrid: (BlockType | null)[];
  craftingCounts: number[];
  craftingTableGrid: (BlockType | null)[];
  craftingTableCounts: number[];
  blockEntities: Record<string, BlockEntity>;
  setBlockEntity: (id: string, entity: BlockEntity | null) => void;
  droppedItems: DroppedItem[];
  addDroppedItem: (type: BlockType, count: number, position: THREE.Vector3) => void;
  removeDroppedItem: (id: string) => void;
  chunks: Map<string, ChunkData>;
  gameTime: number;
  fps: number;
  setFps: (value: number) => void;
  start: () => void;
  restart: () => void;
  end: () => void;
  setPlayerPosition: (position: THREE.Vector3) => void;
  setPlayerRotation: (rotation: { x: number; y: number }) => void;
  setSelectedSlot: (slot: number) => void;
  /** Adds items and returns how many did not fit. */
  addToInventory: (blockType: BlockType, count?: number) => number;
  removeFromInventory: (slot: number, count?: number) => void;
  moveInventoryItem: (from: number, to: number, amount?: number) => number;
  craftRecipe: (ingredients: ItemStack[], result: ItemStack) => boolean;
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
const STARTER_TOOLS = [BlockType.PICKAXE, BlockType.AXE, BlockType.SHOVEL, BlockType.SWORD];

const maxStackOf = (type: BlockType) => getBlockData(type)?.maxStack ?? 64;

const initializeInventory = (): [(BlockType | null)[], number[]] => {
  const inventory = new Array<BlockType | null>(INVENTORY_SIZE).fill(null);
  const counts = new Array<number>(INVENTORY_SIZE).fill(0);

  inventory[0] = BlockType.WOOD_PLANK;
  counts[0] = 64;
  inventory[1] = BlockType.DIRT;
  counts[1] = 64;
  inventory[2] = BlockType.COBBLESTONE;
  counts[2] = 64;
  STARTER_TOOLS.forEach((tool, index) => {
    inventory[3 + index] = tool;
    counts[3 + index] = 1;
  });

  return [inventory, counts];
};

/** Saves made before tools existed get any missing starter tool in a free slot. */
export const ensureStarterTools = (
  slots: (BlockType | null)[],
  counts: number[],
): [(BlockType | null)[], number[]] => {
  const nextSlots = [...slots];
  const nextCounts = [...counts];
  for (const tool of STARTER_TOOLS) {
    const owned = nextSlots.some((item, index) => item === tool && (nextCounts[index] ?? 0) > 0);
    if (owned) continue;
    const empty = nextSlots.findIndex((item, index) => item === null || (nextCounts[index] ?? 0) <= 0);
    if (empty === -1) continue;
    nextSlots[empty] = tool;
    nextCounts[empty] = 1;
  }
  return [nextSlots, nextCounts];
};

const toStacks = (
  inventory: (BlockType | null)[],
  counts: number[],
): Stack[] =>
  inventory.map((type, index) =>
    type !== null && counts[index] > 0
      ? { type, count: counts[index] }
      : null,
  );

const fromStacks = (slots: Stack[]) => ({
  inventory: slots.map((stack) => stack?.type ?? null),
  inventoryCounts: slots.map((stack) => stack?.count ?? 0),
});

const bumpChunk = (
  chunks: Map<string, ChunkData>,
  chunkX: number,
  chunkZ: number,
  markDirty = false,
) => {
  const key = `${chunkX},${chunkZ}`;
  const chunk = chunks.get(key);
  if (!chunk) return;

  chunks.set(key, {
    ...chunk,
    dirty: chunk.dirty || markDirty,
    revision: chunk.revision + 1,
  });
};

// A failed read remains visible and never deletes the original save.
export const initialSave =
  typeof window === "undefined"
    ? { data: null, error: null }
    : (() => {
        try {
          return readSave(window.localStorage);
        } catch {
          return {
            data: null,
            error: "Browser storage is unavailable. Saving is disabled.",
          };
        }
      })();

export const useGame = create<GameState>()(
  subscribeWithSelector((set, get) => {
    const savedGame = initialSave.data;
    const [initialInventory, initialCounts] = savedGame?.inventory
      ? ensureStarterTools(savedGame.inventory.slots, savedGame.inventory.counts)
      : initializeInventory();

    const initialChunks = new Map<string, ChunkData>();
    savedGame?.chunks.forEach((chunk) => {
      initialChunks.set(`${chunk.x},${chunk.z}`, {
        voxelData: new Uint8Array(chunk.voxelData),
        // Saved chunks are persistent overrides. Keep them marked dirty so a
        // later save retains prior edits while generated chunks stay transient.
        dirty: true,
        revision: 0,
      });
    });

    return {
      phase: "ready",

      playerPosition: savedGame?.playerPosition
        ? new THREE.Vector3(
            savedGame.playerPosition.x,
            savedGame.playerPosition.y,
            savedGame.playerPosition.z,
          )
        : new THREE.Vector3(0, 70, 0),
      playerRotation: savedGame?.playerRotation ?? { x: 0, y: 0 },

      inventory: initialInventory,
      inventoryCounts: initialCounts,
      selectedSlot: savedGame?.inventory?.selectedSlot ?? 0,

      // Armor, dropped items, block entities and in-progress crafting are
      // not part of the save format yet, so every session starts them empty.
      armor: new Array(4).fill(null),
      cursorItem: null,
      craftingGrid: new Array(CRAFTING_GRID_SIZE).fill(null),
      craftingCounts: new Array(CRAFTING_GRID_SIZE).fill(0),
      craftingTableGrid: new Array(CRAFTING_TABLE_GRID_SIZE).fill(null),
      craftingTableCounts: new Array(CRAFTING_TABLE_GRID_SIZE).fill(0),
      blockEntities: {},
      droppedItems: [],

      chunks: initialChunks,
      gameTime: savedGame?.gameTime ?? 0,

      fps: 0,
      setFps: (value) => set({ fps: value }),

      start: () =>
        set((state) =>
          state.phase === "ready" ? { phase: "playing" } : {},
        ),
      restart: () => set({ phase: "ready" }),
      end: () =>
        set((state) =>
          state.phase === "playing" ? { phase: "ended" } : {},
        ),

      setPlayerPosition: (position) =>
        set({ playerPosition: position.clone() }),
      setPlayerRotation: (rotation) =>
        set({ playerRotation: { ...rotation } }),

      setSelectedSlot: (slot) =>
        set({
          selectedSlot: Math.max(0, Math.min(8, Math.floor(slot))),
        }),

      setCursorItem: (item) => set({ cursorItem: item }),

      setBlockEntity: (id, entity) =>
        set((state) => {
          const blockEntities = { ...state.blockEntities };
          if (entity === null) delete blockEntities[id];
          else blockEntities[id] = entity;
          return { blockEntities };
        }),

      removeDroppedItem: (id) =>
        set((state) => ({
          droppedItems: state.droppedItems.filter((item) => item.id !== id),
        })),

      addDroppedItem: (type, count, position) =>
        set((state) => {
          // Merge into a nearby pile of the same item rather than scattering.
          const existing = state.droppedItems.find(
            (item) => item.type === type && item.position.distanceTo(position) < 2,
          );
          if (existing) {
            return {
              droppedItems: state.droppedItems.map((item) =>
                item.id === existing.id ? { ...item, count: item.count + count } : item,
              ),
            };
          }
          return {
            droppedItems: [
              ...state.droppedItems,
              { id: Math.random().toString(36).substring(7), type, count, position: position.clone() },
            ],
          };
        }),

      addToInventory: (blockType, count = 1) => {
        if (!Number.isInteger(count) || count <= 0) return 0;

        const state = get();
        const result = addItems(
          toStacks(state.inventory, state.inventoryCounts),
          blockType,
          count,
          maxStackOf(blockType),
        );

        if (result.accepted > 0) {
          set(fromStacks(result.slots));
        }

        return result.remainder;
      },

      removeFromInventory: (slot, count = 1) => {
        if (
          slot < 0 ||
          slot >= INVENTORY_SIZE ||
          !Number.isInteger(count) ||
          count <= 0
        ) {
          return;
        }

        set((state) => {
          const inventory = [...state.inventory];
          const inventoryCounts = [...state.inventoryCounts];
          const remaining = Math.max(0, inventoryCounts[slot] - count);

          inventoryCounts[slot] = remaining;
          if (remaining === 0) inventory[slot] = null;

          return { inventory, inventoryCounts };
        });
      },

      moveInventoryItem: (from, to, amount) => {
        const state = get();
        const result = moveStack(
          toStacks(state.inventory, state.inventoryCounts),
          from,
          to,
          amount,
        );

        if (result.moved > 0) {
          set(fromStacks(result.slots));
        }

        return result.moved;
      },

      craftRecipe: (ingredients, result) => {
        const state = get();
        const crafted = craftFromInventory(
          toStacks(state.inventory, state.inventoryCounts),
          ingredients,
          result,
        );

        if (!crafted.ok) return false;
        set(fromStacks(crafted.slots));
        return true;
      },

      setBlock: (x, y, z, blockType) => {
        if (
          !Number.isInteger(y) ||
          y < 0 ||
          y >= WORLD_HEIGHT
        ) {
          return;
        }

        const blockX = Math.floor(x);
        const blockZ = Math.floor(z);
        const chunkX = Math.floor(blockX / CHUNK_SIZE);
        const chunkZ = Math.floor(blockZ / CHUNK_SIZE);
        const localX = blockX - chunkX * CHUNK_SIZE;
        const localZ = blockZ - chunkZ * CHUNK_SIZE;
        const key = `${chunkX},${chunkZ}`;

        set((state) => {
          const chunk = state.chunks.get(key);
          if (!chunk) return {};

          const index =
            localX +
            y * CHUNK_SIZE +
            localZ * CHUNK_SIZE * WORLD_HEIGHT;
          if (chunk.voxelData[index] === blockType) return {};

          const chunks = new Map(state.chunks);
          const voxelData = new Uint8Array(chunk.voxelData);
          voxelData[index] = blockType;

          chunks.set(key, {
            voxelData,
            dirty: true,
            revision: chunk.revision + 1,
          });

          if (localX === 0) bumpChunk(chunks, chunkX - 1, chunkZ);
          if (localX === CHUNK_SIZE - 1) {
            bumpChunk(chunks, chunkX + 1, chunkZ);
          }
          if (localZ === 0) bumpChunk(chunks, chunkX, chunkZ - 1);
          if (localZ === CHUNK_SIZE - 1) {
            bumpChunk(chunks, chunkX, chunkZ + 1);
          }

          return { chunks };
        });
      },

      getBlock: (x, y, z) => {
        const blockX = Math.floor(x);
        const blockY = Math.floor(y);
        const blockZ = Math.floor(z);

        if (blockY < 0 || blockY >= WORLD_HEIGHT) {
          return BlockType.AIR;
        }

        const chunkX = Math.floor(blockX / CHUNK_SIZE);
        const chunkZ = Math.floor(blockZ / CHUNK_SIZE);
        const chunk = get().chunks.get(`${chunkX},${chunkZ}`);
        if (!chunk) return BlockType.AIR;

        const localX = blockX - chunkX * CHUNK_SIZE;
        const localZ = blockZ - chunkZ * CHUNK_SIZE;
        const index =
          localX +
          blockY * CHUNK_SIZE +
          localZ * CHUNK_SIZE * WORLD_HEIGHT;

        return (chunk.voxelData[index] ?? BlockType.AIR) as BlockType;
      },

      setChunk: (chunkX, chunkZ, voxelData) => {
        const key = `${chunkX},${chunkZ}`;

        set((state) => {
          if (state.chunks.has(key)) return {};

          const chunks = new Map(state.chunks);
          chunks.set(key, {
            voxelData,
            dirty: false,
            revision: 0,
          });

          // A newly generated neighbour changes whether seam faces should be
          // visible, so remesh only adjacent existing chunks.
          bumpChunk(chunks, chunkX - 1, chunkZ);
          bumpChunk(chunks, chunkX + 1, chunkZ);
          bumpChunk(chunks, chunkX, chunkZ - 1);
          bumpChunk(chunks, chunkX, chunkZ + 1);

          return { chunks };
        });
      },

      getChunk: (chunkX, chunkZ) =>
        get().chunks.get(`${chunkX},${chunkZ}`)?.voxelData ?? null,

      markChunkDirty: (chunkX, chunkZ) => {
        set((state) => {
          const key = `${chunkX},${chunkZ}`;
          if (!state.chunks.has(key)) return {};

          const chunks = new Map(state.chunks);
          bumpChunk(chunks, chunkX, chunkZ, true);
          return { chunks };
        });
      },

      updateGameTime: (delta) =>
        set((state) => ({
          gameTime: (state.gameTime + delta) % 24000,
        })),
    };
  }),
);
