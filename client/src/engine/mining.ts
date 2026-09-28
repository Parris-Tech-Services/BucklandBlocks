import { BlockType, getBlockData } from "./blocks";

export type ToolKind = "pickaxe" | "axe" | "shovel";

// Blocks at or below this hardness break on the first swing (dirt, sand,
// leaves, glass, torches), like Minecraft's near-instant soft blocks.
export const INSTANT_BREAK_HARDNESS = 0.6;

// Minimum gap between two broken blocks while the button is held, so holding
// the mouse on soft ground doesn't vaporise a whole column in a few frames.
export const BREAK_COOLDOWN_SECONDS = 0.25;

// Minecraft timing: hardness x 1.5s bare-handed, x 5s when the block needs a
// tool you aren't holding, divided by the tool's speed when you are.
const HAND_SECONDS_PER_HARDNESS = 1.5;
const WRONG_TOOL_SECONDS_PER_HARDNESS = 5;
const TOOL_SPEED = 2; // wooden-tier tools

// Which tool speeds up which block, independent of whether it is required.
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

/** The tool the player is effectively holding; plain blocks count as bare hands. */
export function heldTool(item: BlockType | null | undefined): ToolKind | null {
  if (item === null || item === undefined) return null;
  const toolType = getBlockData(item)?.toolType;
  return toolType === "pickaxe" || toolType === "axe" || toolType === "shovel"
    ? toolType
    : null;
}

/** Seconds of held mining needed to break a block; Infinity if it can't be mined. */
export function getBreakSeconds(blockType: BlockType, tool: ToolKind | null): number {
  if (!isMineable(blockType)) return Infinity;

  const { hardness, toolRequired } = getBlockData(blockType);
  if (hardness <= INSTANT_BREAK_HARDNESS) return 0;

  const rightTool = tool !== null && PREFERRED_TOOL[blockType] === tool;
  if (rightTool) return (hardness * HAND_SECONDS_PER_HARDNESS) / TOOL_SPEED;

  return toolRequired
    ? hardness * WRONG_TOOL_SECONDS_PER_HARDNESS
    : hardness * HAND_SECONDS_PER_HARDNESS;
}

export interface MiningState {
  key: string | null;
  progress: number; // 0..1
  cooldown: number; // seconds until the next block may start breaking
}

export const idleMining = (): MiningState => ({ key: null, progress: 0, cooldown: 0 });

/**
 * Advance mining by one frame. Returns true when the target block breaks.
 * Progress resets whenever the button is released or the target changes.
 */
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
