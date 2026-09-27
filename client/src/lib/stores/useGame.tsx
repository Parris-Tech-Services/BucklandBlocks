import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { BlockType } from "../../engine/blocks";
import * as THREE from "three";
import { clearGameplayInput } from "../input/gameInput";
import { loadWorld, type WorldSave, CHUNK_HEIGHT, CHUNK_SIZE } from "../../engine/save";

export type MenuId = "start" | "none" | "pause" | "inventory" | "crafting";
export type GraphicsStatus = "starting" | "ready" | "lost" | "failed";

export type GamePhase = "ready" | "playing" | "ended";

interface ChunkData {
  voxelData: Uint8Array;
  dirty: boolean;
}

interface GameState {
  phase: GamePhase;
  menu: MenuId;
  gameplayActive: boolean;
  hasUnpersistedCraftingState: boolean;
  graphicsStatus: GraphicsStatus;
  graphicsError: string | null;
  pendingPlayerTransform: WorldSave["playerPosition"] & { rotationX: number; rotationY: number } | null;
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
  setMenu: (menu: MenuId) => void;
  setGraphicsStatus: (status: GraphicsStatus, error?: string | null) => void;
  clearPendingPlayerTransform: () => void;
  restoreWorld: (save: WorldSave) => void;
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

export const useGame = create<GameState>()(
  subscribeWithSelector((set, get) => {
    const savedGame = loadWorld();
    const [initialInventory, initialCounts] = initializeInventory();
    
    const initialChunks = new Map();
    if (savedGame?.chunks) {
      savedGame.chunks.forEach((chunk: any) => {
        initialChunks.set(chunk.key, {
          voxelData: new Uint8Array(chunk.voxelData),
          dirty: true,
        });
      });
    }
    
  return {
      phase: "ready",
      menu: "start",
      gameplayActive: false,
      hasUnpersistedCraftingState: false,
      graphicsStatus: "starting",
      graphicsError: null,
      pendingPlayerTransform: savedGame ? {
        ...savedGame.playerPosition,
        rotationX: savedGame.playerRotation.x,
        rotationY: savedGame.playerRotation.y,
      } : null,
      
      // Initial player state
      playerPosition: savedGame?.playerPosition 
        ? new THREE.Vector3(savedGame.playerPosition.x, savedGame.playerPosition.y, savedGame.playerPosition.z)
        : new THREE.Vector3(0, 70, 0),
      playerRotation: savedGame?.playerRotation || { x: 0, y: 0 },
      
      // Initial inventory (9 hotbar + 27 main = 36 total)
      inventory: savedGame?.inventory || initialInventory,
      inventoryCounts: savedGame?.inventoryCounts || initialCounts,
      selectedSlot: savedGame?.selectedSlot ?? 0,
      
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

      if (localX < 0 || localX >= chunkSize || localY < 0 || localY >= 128 || localZ < 0 || localZ >= chunkSize) {
        return;
      }

      const index = localX + localY * chunkSize + localZ * chunkSize * 128;
      const voxelData = new Uint8Array(chunk.voxelData);
      voxelData[index] = blockType;

      const chunks = new Map(state.chunks);
      chunks.set(chunkKey, { voxelData, dirty: true });
      set({ chunks });
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

      if (localX < 0 || localX >= chunkSize || localY < 0 || localY >= 128 || localZ < 0 || localZ >= chunkSize) {
        return BlockType.AIR;
      }
        
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
      setMenu: (menu: MenuId) => {
        clearGameplayInput();
        set((state) => ({
          menu,
          gameplayActive: menu === "none",
          hasUnpersistedCraftingState: state.hasUnpersistedCraftingState || menu === "crafting",
        }));
      },
      setGraphicsStatus: (status: GraphicsStatus, error: string | null = null) => {
        set({ graphicsStatus: status, graphicsError: error });
      },
      clearPendingPlayerTransform: () => set({ pendingPlayerTransform: null }),
      restoreWorld: (save: WorldSave) => {
        const chunks = new Map<string, ChunkData>();
        save.chunks.forEach((chunk) => chunks.set(chunk.key, {
          voxelData: new Uint8Array(chunk.voxelData),
          dirty: true,
        }));
        clearGameplayInput();
        set({
          chunks,
          inventory: [...save.inventory],
          inventoryCounts: [...save.inventoryCounts],
          selectedSlot: save.selectedSlot,
          gameTime: save.gameTime,
          playerPosition: new THREE.Vector3(save.playerPosition.x, save.playerPosition.y, save.playerPosition.z),
          playerRotation: { x: save.playerRotation.x, y: save.playerRotation.y },
          pendingPlayerTransform: { ...save.playerPosition, rotationX: save.playerRotation.x, rotationY: save.playerRotation.y },
          menu: "none",
          gameplayActive: true,
        });
      },
    };})
);

