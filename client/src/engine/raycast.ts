import * as THREE from "three";
import { BlockType } from "./blocks";

export interface RaycastHit {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  blockType: BlockType;
}

export function performRaycast(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDistance: number,
  getBlock: (x: number, y: number, z: number) => BlockType,
): RaycastHit | null {
  if (maxDistance <= 0 || direction.lengthSq() === 0) return null;

  const dir = direction.clone().normalize();

  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = Math.sign(dir.x);
  const stepY = Math.sign(dir.y);
  const stepZ = Math.sign(dir.z);

  const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
  const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;

  const xDist = stepX > 0 ? x + 1 - origin.x : origin.x - x;
  const yDist = stepY > 0 ? y + 1 - origin.y : origin.y - y;
  const zDist = stepZ > 0 ? z + 1 - origin.z : origin.z - z;

  let tMaxX = stepX !== 0 ? tDeltaX * xDist : Infinity;
  let tMaxY = stepY !== 0 ? tDeltaY * yDist : Infinity;
  let tMaxZ = stepZ !== 0 ? tDeltaZ * zDist : Infinity;

  const hitNormal = new THREE.Vector3();
  let distance = 0;

  while (distance <= maxDistance) {
    const blockType = getBlock(x, y, z);

    if (blockType !== BlockType.AIR && blockType !== undefined) {
      return {
        position: new THREE.Vector3(x, y, z),
        normal: hitNormal.clone(),
        distance,
        blockType,
      };
    }

    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      x += stepX;
      distance = tMaxX;
      tMaxX += tDeltaX;
      hitNormal.set(-stepX, 0, 0);
    } else if (tMaxY <= tMaxZ) {
      y += stepY;
      distance = tMaxY;
      tMaxY += tDeltaY;
      hitNormal.set(0, -stepY, 0);
    } else {
      z += stepZ;
      distance = tMaxZ;
      tMaxZ += tDeltaZ;
      hitNormal.set(0, 0, -stepZ);
    }

    if (!Number.isFinite(distance) || Math.abs(y) > 512) break;
  }

  return null;
}
