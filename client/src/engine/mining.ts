import { BlockType, getBlockData } from "./blocks";

export type ToolKind = "pickaxe" | "axe" | "shovel";

export const INSTANT_BREAK_HARDNESS = 0.6;
export const BREAK_COOLDOWN_SECONDS = 0.25;
const HAND_SECONDS_PER_HARDNESS = 1.5;
const WRONG_TOOL_SECONDS_PER_HARDNESS = 5;
const TOOL_SPEED = 2;

const PREFERRED_TOOL: Partial<Record<BlockType, ToolKind>> = {
  [BlockType.STONE]: "pickaxe",
  [BlockType.COBBLESTONE]: "pickaxe",
  [BlockType.BRICK]: "pickaxe",
  [BlockType.WOOD_LOG]: "axe",
  [BlockType.WOOD_PLANK]: "axe",
  [BlockType.WOOD]: "axe",
  [BlockType.DOOR_BOTTOM]: "axe",
  [BlockType.DOOR_TOP]: "axe",
  [BlockType.DIRT]: "shovel",
  [BlockType.GRASS]: "shovel",
  [BlockType.SAND]: "shovel",
};

export function isMineable(blockType: BlockType): boolean {
  const block = getBlockData(blockType);
  return !!block && blockType !== BlockType.AIR && !block.liquid && blockType !== BlockType.SKY;
}

export function heldTool(item: BlockType | null | undefined): ToolKind | null {
  const toolType = item === null || item === undefined ? undefined : getBlockData(item)?.toolType;
  return toolType === "pickaxe" || toolType === "axe" || toolType === "shovel" ? toolType : null;
}

export function getBreakSeconds(blockType: BlockType, tool: ToolKind | null): number {
  if (!isMineable(blockType)) return Infinity;
  const { hardness, toolRequired } = getBlockData(blockType);
  if (hardness <= INSTANT_BREAK_HARDNESS) return 0;
  if (tool !== null && PREFERRED_TOOL[blockType] === tool) {
    return (hardness * HAND_SECONDS_PER_HARDNESS) / TOOL_SPEED;
  }
  return toolRequired ? hardness * WRONG_TOOL_SECONDS_PER_HARDNESS : hardness * HAND_SECONDS_PER_HARDNESS;
}

export interface MiningState {
  key: string | null;
  progress: number;
  cooldown: number;
}

export const idleMining = (): MiningState => ({ key: null, progress: 0, cooldown: 0 });

export function stepMining(
  state: MiningState,
  target: { key: string; blockType: BlockType } | null,
  holding: boolean,
  tool: ToolKind | null,
  delta: number,
): boolean {
  state.cooldown = Math.max(0, state.cooldown - delta);
  if (!holding || !target || !isMineable(target.blockType)) {
    state.key = null;
    state.progress = 0;
    return false;
  }
  if (state.key !== target.key) {
    state.key = target.key;
    state.progress = 0;
  }
  if (state.cooldown > 0) return false;
  const seconds = getBreakSeconds(target.blockType, tool);
  state.progress = seconds === 0 ? 1 : Math.min(1, state.progress + delta / seconds);
  if (state.progress < 1) return false;
  state.key = null;
  state.progress = 0;
  state.cooldown = BREAK_COOLDOWN_SECONDS;
  return true;
}
