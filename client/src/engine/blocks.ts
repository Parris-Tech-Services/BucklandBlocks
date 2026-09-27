export enum BlockType {
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  WOOD_LOG = 4,
  WOOD_PLANK = 5,
  LEAF = 6,
  GLASS = 7,
  BRICK = 8,
  TORCH = 9,
  WATER = 10,
  SAND = 11,
  COBBLESTONE = 12,
  DOOR_BOTTOM = 13,
  DOOR_TOP = 14,
  WOOD,
  SKY,
}

export interface BlockData {
  id: BlockType;
  name: string;
  texture: string;
  hardness: number;
  transparent: boolean;
  emissive: boolean;
  liquid: boolean;
  solid: boolean;
  toolRequired?: string;
  drops?: { id: BlockType; count: number }[];
}

export const BLOCKS: Record<BlockType, BlockData> = {
  [BlockType.AIR]: {
    id: BlockType.AIR,
    name: "Air",
    texture: "",
    hardness: 0,
    transparent: true,
    emissive: false,
    liquid: false,
    solid: false,
  },
  [BlockType.DIRT]: {
    id: BlockType.DIRT,
    name: "Dirt",
    texture: "./textures/grass.png",
    hardness: 0.5,
    transparent: false,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [{ id: BlockType.DIRT, count: 1 }],
  },
  [BlockType.GRASS]: {
    id: BlockType.GRASS,
    name: "Grass Block",
    texture: "./textures/grass.png",
    hardness: 0.6,
    transparent: false,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [{ id: BlockType.DIRT, count: 1 }],
  },
  [BlockType.STONE]: {
    id: BlockType.STONE,
    name: "Stone",
    texture: "./textures/asphalt.png",
    hardness: 1.5,
    transparent: false,
    emissive: false,
    liquid: false,
    solid: true,
    toolRequired: "pickaxe",
    drops: [{ id: BlockType.COBBLESTONE, count: 1 }],
  },
  [BlockType.WOOD_LOG]: {
    id: BlockType.WOOD_LOG,
    name: "Wood Log",
    texture: "./textures/wood.jpg",
    hardness: 2,
    transparent: false,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [{ id: BlockType.WOOD_LOG, count: 1 }],
  },
  [BlockType.WOOD_PLANK]: {
    id: BlockType.WOOD_PLANK,
    name: "Wood Planks",
    texture: "./textures/wood.jpg",
    hardness: 2,
    transparent: false,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [{ id: BlockType.WOOD_PLANK, count: 1 }],
  },
  [BlockType.LEAF]: {
    id: BlockType.LEAF,
    name: "Leaves",
    texture: "./textures/grass.png",
    hardness: 0.2,
    transparent: true,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [],
  },
  [BlockType.GLASS]: {
    id: BlockType.GLASS,
    name: "Glass",
    texture: "./textures/sky.png",
    hardness: 0.3,
    transparent: true,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [],
  },
  [BlockType.BRICK]: {
    id: BlockType.BRICK,
    name: "Brick",
    texture: "./textures/asphalt.png",
    hardness: 2,
    transparent: false,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [{ id: BlockType.BRICK, count: 1 }],
  },
  [BlockType.TORCH]: {
    id: BlockType.TORCH,
    name: "Torch",
    texture: "./textures/wood.jpg",
    hardness: 0.1,
    transparent: true,
    emissive: true,
    liquid: false,
    solid: false,
    drops: [{ id: BlockType.TORCH, count: 1 }],
  },
  [BlockType.WATER]: {
    id: BlockType.WATER,
    name: "Water",
    texture: "./textures/sky.png",
    hardness: 0,
    transparent: true,
    emissive: false,
    liquid: true,
    solid: false,
  },
  [BlockType.SAND]: {
    id: BlockType.SAND,
    name: "Sand",
    texture: "./textures/sand.jpg",
    hardness: 0.5,
    transparent: false,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [{ id: BlockType.SAND, count: 1 }],
  },
  [BlockType.COBBLESTONE]: {
    id: BlockType.COBBLESTONE,
    name: "Cobblestone",
    texture: "./textures/asphalt.png",
    hardness: 2,
    transparent: false,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [{ id: BlockType.COBBLESTONE, count: 1 }],
  },
  [BlockType.DOOR_BOTTOM]: {
    id: BlockType.DOOR_BOTTOM,
    name: "Door (Bottom)",
    texture: "./textures/wood.jpg",
    hardness: 3,
    transparent: true,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [{ id: BlockType.DOOR_BOTTOM, count: 1 }],
  },
  [BlockType.DOOR_TOP]: {
    id: BlockType.DOOR_TOP,
    name: "Door (Top)",
    texture: "./textures/wood.jpg",
    hardness: 3,
    transparent: true,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [],
  },
  [BlockType.WOOD]: {
    id: BlockType.WOOD,
    name: "Wood",
    texture: "./textures/wood.jpg",
    hardness: 2,
    transparent: false,
    emissive: false,
    liquid: false,
    solid: true,
    drops: [{ id: BlockType.WOOD, count: 1 }],
  },
  [BlockType.SKY]: {
    id: BlockType.SKY,
    name: "Sky",
    texture: "./textures/sky.png",
    hardness: 0,
    transparent: true,
    emissive: false,
    liquid: false,
    solid: false,
    drops: [],
  }
};

export function getBlockData(blockType: BlockType): BlockData {
  return BLOCKS[blockType];
}

export function isBlockSolid(blockType: BlockType): boolean {
  return BLOCKS[blockType].solid;
}

export function isBlockTransparent(blockType: BlockType): boolean {
  return BLOCKS[blockType].transparent;
}

export function getBlockDrops(blockType: BlockType): { id: BlockType; count: number }[] {
  return BLOCKS[blockType].drops || [];
}
