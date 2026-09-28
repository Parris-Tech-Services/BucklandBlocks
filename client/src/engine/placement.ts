import { isBlockSolid } from "./blocks";

export type BlockReader = (x: number, y: number, z: number) => number;

const NEIGHBORS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;

/** A placed block must touch at least one solid block; water is not support. */
export function hasSolidSupport(
  x: number,
  y: number,
  z: number,
  getBlock: BlockReader,
): boolean {
  return NEIGHBORS.some(([dx, dy, dz]) => isBlockSolid(getBlock(x + dx, y + dy, z + dz)));
}
