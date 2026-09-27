import * as THREE from 'three';
import { isBlockSolid } from './blocks';

// Player collision volume: the reference point is the eye (camera position).
// Matches the volume already used by the place-block self-intersection check
// in Player.tsx, so the same player "occupies" the same voxels for both
// movement and placement.
export const PLAYER_HALF_WIDTH = 0.3;
export const HEAD_ROOM = 0.3;

// Largest distance moved per collision substep, per axis. Must be safely
// below 1 block so a fast-moving or lagging frame can't tunnel through a
// single-thick wall before a collision check ever runs against it.
export const MAX_COLLISION_STEP = 0.2;

export type GetBlockFn = (x: number, y: number, z: number) => number;

/**
 * Whether the player's axis-aligned bounding box, centred on `pos` (the eye),
 * overlaps any solid voxel.
 */
export function collidesAt(
  pos: THREE.Vector3,
  playerHeight: number,
  getBlock: GetBlockFn
): boolean {
  const minX = Math.floor(pos.x - PLAYER_HALF_WIDTH);
  const maxX = Math.floor(pos.x + PLAYER_HALF_WIDTH);
  const minY = Math.floor(pos.y - playerHeight);
  const maxY = Math.floor(pos.y + HEAD_ROOM);
  const minZ = Math.floor(pos.z - PLAYER_HALF_WIDTH);
  const maxZ = Math.floor(pos.z + PLAYER_HALF_WIDTH);
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (isBlockSolid(getBlock(x, y, z))) return true;
      }
    }
  }
  return false;
}

/**
 * Moves `pos` along one axis by `delta`, in small substeps, stopping (and
 * zeroing that axis's velocity) at the first substep that would collide.
 * Substepping — rather than moving the full delta then resolving — is what
 * prevents tunnelling through a thin wall during a slow/lagging frame.
 * Returns true if movement was blocked before the full delta was applied.
 */
export function moveAxisWithCollision(
  pos: THREE.Vector3,
  vel: THREE.Vector3,
  axis: 'x' | 'y' | 'z',
  delta: number,
  playerHeight: number,
  getBlock: GetBlockFn
): boolean {
  if (delta === 0) return false;
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / MAX_COLLISION_STEP));
  const stepDelta = delta / steps;
  for (let i = 0; i < steps; i++) {
    pos[axis] += stepDelta;
    if (collidesAt(pos, playerHeight, getBlock)) {
      pos[axis] -= stepDelta;
      vel[axis] = 0;
      return true;
    }
  }
  return false;
}
