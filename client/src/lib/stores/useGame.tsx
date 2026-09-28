import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { BlockType } from "../../engine/blocks";
import * as THREE from "three";
import { readSave } from "../../engine/save";

export type GamePhase = "ready" | "playing" | "ended";

interface ChunkData {
  voxelData: Uint8Array;
  dirty: boolean;
}

interface GameState {
  phase: GamePhase;
  // Player state
  playerPosition: THREE.Vector3;
  playerRotation: { x: number; y: number };
  // Inventory
  inventory: (BlockType | null)[];
  inventoryCounts: number[];
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
  addToInventory: (blockType: BlockType, count?: number) => void;
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
  
  return [inventory, counts];
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
      inventory: savedGame?.inventory?.slots || initialInventory,
      inventoryCounts: savedGame?.inventory?.counts || initialCounts,
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
    
    addToInventory: (blockType: BlockType, count: number = 1) => {
      set((state) => {
        const newInventory = [...state.inventory];
        const newCounts = [...state.inventoryCounts];
        
        // Try to stack with existing items first
        for (let i = 0; i < newInventory.length; i++) {
          if (newInventory[i] === blockType) {
            newCounts[i] += count;
            return { inventory: newInventory, inventoryCounts: newCounts };
          }
        }
        
        // Find empty slot
        for (let i = 0; i < newInventory.length; i++) {
          if (newInventory[i] === null) {
            newInventory[i] = blockType;
            newCounts[i] = count;
            return { inventory: newInventory, inventoryCounts: newCounts };
          }
        }
        
        // Inventory full
        console.warn('Inventory full!');
        return {};
      });
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

