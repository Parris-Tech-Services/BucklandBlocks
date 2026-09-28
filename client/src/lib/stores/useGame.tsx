import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { BlockType, getBlockData } from "../../engine/blocks";
import * as THREE from "three";
import { readSave } from "../../engine/save";

export type GamePhase = "ready" | "playing" | "ended";

interface ChunkData {
  voxelData: Uint8Array;
  dirty: boolean;
}



export interface BlockEntity {
  id: string; // x,y,z
  type: BlockType;
  inventory: (BlockType | null)[];
  counts: number[];
  progress: number;
}

/** An item stack held on the mouse cursor while rearranging slots. */
export interface ItemStack {
  type: BlockType;
  count: number;
}

export const CRAFTING_GRID_SIZE = 4; // 2x2 inventory crafting
export const CRAFTING_TABLE_GRID_SIZE = 9; // 3x3 crafting table

export interface DroppedItem {
  id: string;
  type: BlockType;
  count: number;
  position: THREE.Vector3;
}

interface GameState {
  phase: GamePhase;
  // Player state
  playerPosition: THREE.Vector3;
  playerRotation: { x: number; y: number };
  // Inventory
  inventory: (BlockType | null)[];
  inventoryCounts: number[];
  
  
  blockEntities: Record<string, BlockEntity>;
  setBlockEntity: (id: string, entity: BlockEntity | null) => void;

  armor: (BlockType | null)[];
  cursorItem: ItemStack | null;
  setCursorItem: (item: ItemStack | null) => void;
  craftingGrid: (BlockType | null)[];
  craftingCounts: number[];
  craftingTableGrid: (BlockType | null)[];
  craftingTableCounts: number[];
  droppedItems: DroppedItem[];
  addDroppedItem: (type: BlockType, count: number, position: THREE.Vector3) => void;
  removeDroppedItem: (id: string) => void;
  selectedSlot: number;
  // World
  chunks: Map<string, ChunkData>;
  gameTime: number;
  // FPS
  fps: number;
  setFps: (v: number) => void;
  // Actions
  start: () => void;
  restart: () => void;
  end: () => void;
  // Player actions
  setPlayerPosition: (position: THREE.Vector3) => void;
  setPlayerRotation: (rotation: { x: number; y: number }) => void;
  // Inventory actions
  setSelectedSlot: (slot: number) => void;
  /** Adds items and returns how many did not fit. */
  addToInventory: (blockType: BlockType, count?: number) => number;
  removeFromInventory: (slot: number, count?: number) => void;
  // World actions
  setBlock: (x: number, y: number, z: number, blockType: BlockType) => void;
  getBlock: (x: number, y: number, z: number) => BlockType;
  setChunk: (chunkX: number, chunkZ: number, voxelData: Uint8Array) => void;
  getChunk: (chunkX: number, chunkZ: number) => Uint8Array | null;
  markChunkDirty: (chunkX: number, chunkZ: number) => void;
  // Time
  updateGameTime: (delta: number) => void;
}

const initializeInventory = (): [(BlockType | null)[], number[]] => {
  const inventory = new Array(36).fill(null);
  const counts = new Array(36).fill(0);
  
  inventory[0] = BlockType.WOOD_PLANK;
  counts[0] = 64;
  inventory[1] = BlockType.DIRT;
  counts[1] = 64;
  inventory[2] = BlockType.COBBLESTONE;
  counts[2] = 64;
  inventory[3] = BlockType.PICKAXE;
  counts[3] = 1;
  inventory[4] = BlockType.AXE;
  counts[4] = 1;
  inventory[5] = BlockType.SHOVEL;
  counts[5] = 1;
  inventory[6] = BlockType.SWORD;
  counts[6] = 1;
  
  return [inventory, counts];
};

const ensureStarterTools = (
  savedSlots: (BlockType | null)[] | undefined,
  savedCounts: number[] | undefined,
  fallbackSlots: (BlockType | null)[],
  fallbackCounts: number[],
): [(BlockType | null)[], number[]] => {
  const slots = savedSlots ? [...savedSlots] : [...fallbackSlots];
  const counts = savedCounts ? [...savedCounts] : [...fallbackCounts];
  for (const tool of [BlockType.PICKAXE, BlockType.AXE, BlockType.SHOVEL, BlockType.SWORD]) {
    const existing = slots.findIndex((item, index) => item === tool && (counts[index] ?? 0) > 0);
    if (existing !== -1) continue;
    const empty = slots.findIndex((item, index) => item === null || (counts[index] ?? 0) <= 0);
    if (empty !== -1) {
      slots[empty] = tool;
      counts[empty] = 1;
    }
  }
  return [slots, counts];
};

// A failed read remains visible and never deletes the original save.
export const initialSave = typeof window === 'undefined'
  ? { data: null, error: null }
  : (() => { try { return readSave(window.localStorage); } catch {
      return { data: null, error: 'Browser storage is unavailable. Saving is disabled.' };
    } })();

export const useGame = create<GameState>()(
  subscribeWithSelector((set, get) => {
    const savedGame = initialSave.data;
    const [initialInventory, initialCounts] = initializeInventory();
    const [loadedInventory, loadedInventoryCounts] = ensureStarterTools(
      savedGame?.inventory?.slots,
      savedGame?.inventory?.counts,
      initialInventory,
      initialCounts,
    );
    
    const initialChunks = new Map<string, ChunkData>();
    if (savedGame?.chunks) {
      savedGame.chunks.forEach((chunk) => {
        initialChunks.set(`${chunk.x},${chunk.z}`, {
          voxelData: new Uint8Array(chunk.voxelData),
          dirty: false,
        });
      });
    }
    
  return {
      phase: "ready",
      
      // Initial player state
      playerPosition: savedGame?.playerPosition 
        ? new THREE.Vector3(savedGame.playerPosition.x, savedGame.playerPosition.y, savedGame.playerPosition.z)
        : new THREE.Vector3(0, 70, 0),
      playerRotation: savedGame?.playerRotation || { x: 0, y: 0 },
      
      // Initial inventory (9 hotbar + 27 main = 36 total)
      inventory: loadedInventory,
      inventoryCounts: loadedInventoryCounts,
      // Armor, dropped items, block entities and in-progress crafting are
      // not part of the save format yet, so every session starts them empty.
      armor: new Array(4).fill(null),
      droppedItems: [],
      blockEntities: {},
      cursorItem: null,
      craftingGrid: new Array(CRAFTING_GRID_SIZE).fill(null),
      craftingCounts: new Array(CRAFTING_GRID_SIZE).fill(0),
      craftingTableGrid: new Array(CRAFTING_TABLE_GRID_SIZE).fill(null),
      craftingTableCounts: new Array(CRAFTING_TABLE_GRID_SIZE).fill(0),
      selectedSlot: savedGame?.inventory?.selectedSlot || 0,
      
      // Initial world state
      chunks: initialChunks,
      gameTime: savedGame?.gameTime || 0,
      
  fps: 0,
  setFps: (v: number) => set({ fps: v }),
  start: () => {
      set((state) => {
        if (state.phase === "ready") {
          return { phase: "playing" };
        }
        return {};
      });
    },
    
    restart: () => {
      set(() => ({ phase: "ready" }));
    },
    
    end: () => {
      set((state) => {
        if (state.phase === "playing") {
          return { phase: "ended" };
        }
        return {};
      });
    },
    
    // Player actions
    setPlayerPosition: (position: THREE.Vector3) => {
      set({ playerPosition: position });
    },
    
    setPlayerRotation: (rotation: { x: number; y: number }) => {
      set({ playerRotation: rotation });
    },
    
    // Inventory actions
    setSelectedSlot: (slot: number) => {
      set({ selectedSlot: Math.max(0, Math.min(8, slot)) });
    },
    
    
    setCursorItem: (item) => set({ cursorItem: item }),

    setBlockEntity: (id, entity) => set((state) => {
      const newEntities = { ...state.blockEntities };
      if (entity === null) delete newEntities[id];
      else newEntities[id] = entity;
      return { blockEntities: newEntities };
    }),
    removeDroppedItem: (id) => set((state) => ({ 
      droppedItems: state.droppedItems.filter(item => item.id !== id) 
    })),
    addDroppedItem: (type, count, position) => set((state) => {
      // Find nearby items of same type to merge
      const mergeDist = 2.0;
      const existing = state.droppedItems.find(i => 
        i.type === type && i.position.distanceTo(position) < mergeDist
      );
      
      if (existing) {
        return {
          droppedItems: state.droppedItems.map(i => 
            i.id === existing.id ? { ...i, count: i.count + count } : i
          )
        };
      }
      
      return {
        droppedItems: [
          ...state.droppedItems, 
          { id: Math.random().toString(36).substring(7), type, count, position: position.clone() }
        ]
      };
    }),
    
    addToInventory: (blockType: BlockType, count: number = 1) => {
      let remaining = count;
      set((state) => {
        const newInventory = [...state.inventory];
        const newCounts = [...state.inventoryCounts];
        const maxStack = getBlockData(blockType)?.maxStack ?? 64;
        
        for (let i = 0; i < newInventory.length; i++) {
          if (newInventory[i] === blockType && newCounts[i] < maxStack) {
            const space = maxStack - newCounts[i];
            const toAdd = Math.min(space, remaining);
            newCounts[i] += toAdd;
            remaining -= toAdd;
            if (remaining === 0) break;
          }
        }
        
        if (remaining > 0) {
          for (let i = 0; i < newInventory.length; i++) {
            if (newInventory[i] === null) {
              newInventory[i] = blockType;
              const toAdd = Math.min(maxStack, remaining);
              newCounts[i] = toAdd;
              remaining -= toAdd;
              if (remaining === 0) break;
            }
          }
        }
        
        if (remaining > 0) console.warn('Inventory full!');
        return { inventory: newInventory, inventoryCounts: newCounts };
      });
      return remaining;
    },
    
    removeFromInventory: (slot: number, count: number = 1) => {
      set((state) => {
        const newInventory = [...state.inventory];
        const newCounts = [...state.inventoryCounts];
        
        if (newCounts[slot] > count) {
          newCounts[slot] -= count;
        } else {
          newCounts[slot] = 0;
          newInventory[slot] = null;
        }
        
        return { inventory: newInventory, inventoryCounts: newCounts };
      });
    },
    
    // World actions
    setBlock: (x: number, y: number, z: number, blockType: BlockType) => {
      const chunkSize = 16;
      const chunkX = Math.floor(x / chunkSize);
      const chunkZ = Math.floor(z / chunkSize);
      const chunkKey = `${chunkX},${chunkZ}`;
      
      const state = get();
      const chunk = state.chunks.get(chunkKey);
      
      if (chunk) {
        const localX = x - chunkX * chunkSize;
        const localZ = z - chunkZ * chunkSize;
        const localY = y;
        
        const index = localX + localY * chunkSize + localZ * chunkSize * 128;
        const newVoxelData = new Uint8Array(chunk.voxelData);
        newVoxelData[index] = blockType;
        
        const newChunks = new Map(state.chunks);
        newChunks.set(chunkKey, { voxelData: newVoxelData, dirty: true });
        
        set({ chunks: newChunks });
      }
    },
    
    getBlock: (x: number, y: number, z: number): BlockType => {
      const chunkSize = 16;
      const chunkX = Math.floor(x / chunkSize);
      const chunkZ = Math.floor(z / chunkSize);
      const chunkKey = `${chunkX},${chunkZ}`;
      
      const state = get();
      const chunk = state.chunks.get(chunkKey);
      
      if (chunk) {
        const localX = x - chunkX * chunkSize;
        const localZ = z - chunkZ * chunkSize;
        const localY = y;
        
        const index = localX + localY * chunkSize + localZ * chunkSize * 128;
        return chunk.voxelData[index] || BlockType.AIR;
      }
      
      return BlockType.AIR;
    },
    
    setChunk: (chunkX: number, chunkZ: number, voxelData: Uint8Array) => {
      const chunkKey = `${chunkX},${chunkZ}`;
      set((state) => {
        const newChunks = new Map(state.chunks);
        newChunks.set(chunkKey, { voxelData, dirty: false });
        return { chunks: newChunks };
      });
    },
    
    getChunk: (chunkX: number, chunkZ: number): Uint8Array | null => {
      const chunkKey = `${chunkX},${chunkZ}`;
      const state = get();
      return state.chunks.get(chunkKey)?.voxelData || null;
    },
    
    markChunkDirty: (chunkX: number, chunkZ: number) => {
      const chunkKey = `${chunkX},${chunkZ}`;
      const state = get();
      const chunk = state.chunks.get(chunkKey);
      
      if (chunk) {
        chunk.dirty = true;
        set({ chunks: new Map(state.chunks) });
      }
    },
    
    // Time
    updateGameTime: (delta: number) => {
      set((state) => ({
        gameTime: (state.gameTime + delta) % 24000
      }));
    },
  };})
);
