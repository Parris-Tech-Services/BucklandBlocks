import { BlockType, getBlockData } from "./blocks";

export type CursorItem = { type: BlockType; count: number } | null;

export interface InventoryInteractionState {
  inventory: (BlockType | null)[];
  counts: number[];
  cursor: CursorItem;
}

export interface SlotInteraction {
  slotIndex: number;
  rightClick: boolean;
  shiftClick: boolean;
}

function cloneState(state: InventoryInteractionState): InventoryInteractionState {
  return {
    inventory: [...state.inventory],
    counts: [...state.counts],
    cursor: state.cursor ? { ...state.cursor } : null,
  };
}

function destinationRange(slotIndex: number): [number, number] {
  return slotIndex < 9 ? [9, 36] : [0, 9];
}

function mergeIntoExisting(
  state: InventoryInteractionState,
  type: BlockType,
  remaining: number,
  start: number,
  end: number,
): number {
  const maxStack = getBlockData(type)?.maxStack ?? 64;
  for (let index = start; index < end && remaining > 0; index += 1) {
    if (state.inventory[index] !== type || state.counts[index] >= maxStack) continue;
    const moved = Math.min(maxStack - state.counts[index], remaining);
    state.counts[index] += moved;
    remaining -= moved;
  }
  return remaining;
}

function moveIntoEmpty(
  state: InventoryInteractionState,
  type: BlockType,
  remaining: number,
  start: number,
  end: number,
): number {
  for (let index = start; index < end; index += 1) {
    if (state.inventory[index] !== null) continue;
    state.inventory[index] = type;
    state.counts[index] = remaining;
    return 0;
  }
  return remaining;
}

function finaliseQuickMove(
  state: InventoryInteractionState,
  slotIndex: number,
  originalCount: number,
  remaining: number,
): InventoryInteractionState | null {
  if (remaining >= originalCount) return null;
  state.counts[slotIndex] = remaining;
  if (remaining === 0) state.inventory[slotIndex] = null;
  return state;
}

function quickMove(
  original: InventoryInteractionState,
  slotIndex: number,
): InventoryInteractionState | null {
  if (original.cursor || original.inventory[slotIndex] === null) return null;
  const state = cloneState(original);
  const type = state.inventory[slotIndex] as BlockType;
  const originalCount = state.counts[slotIndex];
  const [start, end] = destinationRange(slotIndex);
  let remaining = mergeIntoExisting(state, type, originalCount, start, end);
  if (remaining > 0) remaining = moveIntoEmpty(state, type, remaining, start, end);
  return finaliseQuickMove(state, slotIndex, originalCount, remaining);
}

function placeCursorIntoEmpty(
  state: InventoryInteractionState,
  slotIndex: number,
  rightClick: boolean,
): void {
  if (!state.cursor) return;
  const placeCount = rightClick ? 1 : state.cursor.count;
  state.inventory[slotIndex] = state.cursor.type;
  state.counts[slotIndex] = placeCount;
  state.cursor.count -= placeCount;
  if (state.cursor.count <= 0) state.cursor = null;
}

function mergeCursorIntoMatching(
  state: InventoryInteractionState,
  slotIndex: number,
  rightClick: boolean,
): void {
  if (!state.cursor) return;
  const type = state.inventory[slotIndex] as BlockType;
  const space = (getBlockData(type)?.maxStack ?? 64) - state.counts[slotIndex];
  if (space <= 0) return;
  const placeCount = rightClick ? 1 : Math.min(state.cursor.count, space);
  state.counts[slotIndex] += Math.min(placeCount, space);
  state.cursor.count -= Math.min(placeCount, space);
  if (state.cursor.count <= 0) state.cursor = null;
}

function swapCursorWithSlot(
  state: InventoryInteractionState,
  slotIndex: number,
): void {
  if (!state.cursor) return;
  const slotType = state.inventory[slotIndex] as BlockType;
  const slotCount = state.counts[slotIndex];
  state.inventory[slotIndex] = state.cursor.type;
  state.counts[slotIndex] = state.cursor.count;
  state.cursor = { type: slotType, count: slotCount };
}

function applyCursorToSlot(
  original: InventoryInteractionState,
  slotIndex: number,
  rightClick: boolean,
): InventoryInteractionState {
  const state = cloneState(original);
  const slotType = state.inventory[slotIndex];
  if (slotType === null) {
    placeCursorIntoEmpty(state, slotIndex, rightClick);
    return state;
  }
  if (state.cursor?.type === slotType) {
    mergeCursorIntoMatching(state, slotIndex, rightClick);
    return state;
  }
  if (!rightClick) swapCursorWithSlot(state, slotIndex);
  return state;
}

function pickUpFromSlot(
  original: InventoryInteractionState,
  slotIndex: number,
  rightClick: boolean,
): InventoryInteractionState {
  const state = cloneState(original);
  const slotType = state.inventory[slotIndex];
  if (slotType === null) return state;
  const slotCount = state.counts[slotIndex];

  if (rightClick && slotCount > 1) {
    const takeCount = Math.floor(slotCount / 2);
    state.cursor = { type: slotType, count: takeCount };
    state.counts[slotIndex] -= takeCount;
    return state;
  }

  state.cursor = { type: slotType, count: slotCount };
  state.inventory[slotIndex] = null;
  state.counts[slotIndex] = 0;
  return state;
}

export function applySlotInteraction(
  original: InventoryInteractionState,
  interaction: SlotInteraction,
): InventoryInteractionState | null {
  if (interaction.shiftClick) {
    const moved = quickMove(original, interaction.slotIndex);
    if (moved) return moved;
  }
  if (original.cursor) {
    return applyCursorToSlot(original, interaction.slotIndex, interaction.rightClick);
  }
  return pickUpFromSlot(original, interaction.slotIndex, interaction.rightClick);
}
