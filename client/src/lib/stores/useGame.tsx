import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import * as THREE from "three";
import { BlockType } from "../../engine/blocks";
import {
  addItems,
  moveStack,
  type Stack,
} from "../../engine/inventory";
import { readSave } from "../../engine/save";

export type GamePhase = "ready" | "playing" | "ended";

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
  playerPosition: THREE.Vector3;
  playerRotation: { x: number; y: number };
  inventory: (BlockType | null)[];
  inventoryCounts: number[];
  selectedSlot: number;
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
  addToInventory: (blockType: BlockType, count?: number) => boolean;
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
    const [initialInventory, initialCounts] = initializeInventory();

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

      inventory: savedGame?.inventory?.slots ?? initialInventory,
      inventoryCounts: savedGame?.inventory?.counts ?? initialCounts,
      selectedSlot: savedGame?.inventory?.selectedSlot ?? 0,

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

      addToInventory: (blockType, count = 1) => {
        if (!Number.isInteger(count) || count <= 0) return false;

        const state = get();
        const result = addItems(
          toStacks(state.inventory, state.inventoryCounts),
          blockType,
          count,
        );

        if (result.accepted > 0) {
          set(fromStacks(result.slots));
        }

        return result.remainder === 0;
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
        if (
          !Number.isInteger(result.count) ||
          result.count <= 0 ||
          ingredients.some(
            (ingredient) =>
              !Number.isInteger(ingredient.count) || ingredient.count <= 0,
          )
        ) {
          return false;
        }

        const state = get();
        const inventory = [...state.inventory];
        const counts = [...state.inventoryCounts];

        const required = new Map<BlockType, number>();
        ingredients.forEach((ingredient) => {
          required.set(
            ingredient.type,
            (required.get(ingredient.type) ?? 0) + ingredient.count,
          );
        });

        for (const [type, needed] of required) {
          let available = 0;
          for (let i = 0; i < INVENTORY_SIZE; i += 1) {
            if (inventory[i] === type) available += counts[i];
          }
          if (available < needed) return false;
        }

        for (const [type, needed] of required) {
          let remaining = needed;
          for (
            let i = 0;
            i < INVENTORY_SIZE && remaining > 0;
            i += 1
          ) {
            if (inventory[i] !== type || counts[i] <= 0) continue;

            const used = Math.min(counts[i], remaining);
            counts[i] -= used;
            remaining -= used;
            if (counts[i] === 0) inventory[i] = null;
          }
        }

        const output = addItems(
          toStacks(inventory, counts),
          result.type,
          result.count,
        );
        if (output.remainder > 0) return false;

        set(fromStacks(output.slots));
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
