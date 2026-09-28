import { BlockType } from "./blocks";

export const HOTBAR_SIZE = 9;

export function cycleHotbarSlot(current: number, wheelDeltaY: number): number {
  if (wheelDeltaY === 0) return Math.max(0, Math.min(HOTBAR_SIZE - 1, current));
  const direction = wheelDeltaY > 0 ? 1 : -1;
  return (current + direction + HOTBAR_SIZE) % HOTBAR_SIZE;
}

export interface DropSelection {
  type: BlockType | null;
  remainingCount: number;
  dropCount: number;
}

export function takeFromHotbarSlot(
  type: BlockType | null,
  count: number,
  single: boolean,
): DropSelection {
  if (type === null || count <= 0) {
    return { type: null, remainingCount: 0, dropCount: 0 };
  }

  const dropCount = single ? 1 : count;
  const remainingCount = Math.max(0, count - dropCount);

  return {
    type: remainingCount > 0 ? type : null,
    remainingCount,
    dropCount,
  };
}
