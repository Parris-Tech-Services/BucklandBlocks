import * as THREE from "three";
import { BlockType } from "./blocks";

/**
 * Walking over a dropped item picks it up. Items thrown with Q wait a moment
 * first so they fly clear instead of landing straight back in the hotbar.
 */
export const THROWN_PICKUP_DELAY_MS = 1500;
export const SPILLED_PICKUP_DELAY_MS = 500;

/** How far from the player's centre (sideways) an item is collected. */
export const PICKUP_RADIUS = 1.0;
/**
 * How far ahead a Q-thrown item lands. Further than PICKUP_RADIUS, so standing
 * still never re-collects it; one step forward does.
 */
export const THROW_DISTANCE = 1.75;
/** Items this far below the feet or above the head are out of reach. */
export const PICKUP_VERTICAL_MARGIN = 0.75;

/**
 * Dropped items are stored at a block-corner position and drawn offset from
 * it (see DroppedItems.tsx); this is the point the player sees.
 */
export function droppedItemCentre(position: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(position.x + 0.5, position.y + 0.25, position.z + 0.5);
}

/** Inverse of droppedItemCentre: the stored position that draws at `centre`. */
export function droppedItemPositionFor(centre: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(centre.x - 0.5, centre.y - 0.25, centre.z - 0.5);
}

/** True when the item is touching the player whose eyes are at `eye`. */
export function isWithinPickupReach(
  itemPosition: THREE.Vector3,
  eye: THREE.Vector3,
  playerHeight: number,
): boolean {
  const centre = droppedItemCentre(itemPosition);
  const feetY = eye.y - playerHeight;
  if (centre.y < feetY - PICKUP_VERTICAL_MARGIN) return false;
  if (centre.y > eye.y + PICKUP_VERTICAL_MARGIN) return false;
  return Math.hypot(centre.x - eye.x, centre.z - eye.z) <= PICKUP_RADIUS;
}

/** How many of `type` the inventory can still take, without changing it. */
export function inventorySpaceFor(
  items: (BlockType | null)[],
  counts: number[],
  type: BlockType,
  maxStack: number,
): number {
  let space = 0;
  for (let i = 0; i < items.length; i += 1) {
    if (items[i] === null) space += maxStack;
    else if (items[i] === type) space += Math.max(0, maxStack - (counts[i] ?? 0));
  }
  return space;
}
