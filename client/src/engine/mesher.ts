import * as THREE from "three";
import { BlockType, isBlockTransparent } from "./blocks";

type NeighborLookup = (localX: number, y: number, localZ: number) => BlockType;

type FaceBucket = {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
};

const MATERIAL_COUNT = 6;

function materialIndexFor(blockType: BlockType): number {
  switch (blockType) {
    case BlockType.DIRT:
      return 0;
    case BlockType.GRASS:
    case BlockType.LEAF:
      return 1;
    case BlockType.STONE:
    case BlockType.COBBLESTONE:
    case BlockType.BRICK:
      return 2;
    case BlockType.WOOD_LOG:
    case BlockType.WOOD_PLANK:
    case BlockType.WOOD:
    case BlockType.TORCH:
    case BlockType.DOOR_BOTTOM:
    case BlockType.DOOR_TOP:
      return 3;
    case BlockType.SAND:
      return 4;
    case BlockType.GLASS:
    case BlockType.WATER:
    case BlockType.SKY:
      return 5;
    default:
      return 0;
  }
}

export function createBlockMesh(
  voxelData: Uint8Array,
  chunkSize: { x: number; y: number; z: number },
  lookupOutsideChunk?: NeighborLookup,
): THREE.BufferGeometry {
  const buckets: FaceBucket[] = Array.from({ length: MATERIAL_COUNT }, () => ({
    positions: [],
    normals: [],
    uvs: [],
    indices: [],
  }));

  const faceNormals = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ] as const;

  const faceOffsets = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ] as const;

  const getVoxel = (x: number, y: number, z: number): BlockType => {
    if (y < 0 || y >= chunkSize.y) return BlockType.AIR;
    if (x < 0 || x >= chunkSize.x || z < 0 || z >= chunkSize.z) {
      return lookupOutsideChunk?.(x, y, z) ?? BlockType.AIR;
    }
    const index = x + y * chunkSize.x + z * chunkSize.x * chunkSize.y;
    return voxelData[index] as BlockType;
  };

  const shouldRenderFace = (blockType: BlockType, neighbor: BlockType): boolean => {
    if (neighbor === BlockType.AIR) return true;
    if (!isBlockTransparent(neighbor)) return false;
    return neighbor !== blockType;
  };

  const addFace = (
    x: number,
    y: number,
    z: number,
    faceIndex: number,
    blockType: BlockType,
  ) => {
    const bucket = buckets[materialIndexFor(blockType)];
    const vertexIndex = bucket.positions.length / 3;
    const normal = faceNormals[faceIndex];
    const uv = [0, 0, 1, 0, 1, 1, 0, 1];

    const faceVerts = [
      [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
      [[x + 1, y, z], [x, y, z], [x, y + 1, z], [x + 1, y + 1, z]],
      [[x + 1, y, z + 1], [x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1]],
      [[x, y, z], [x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z]],
      [[x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z], [x, y + 1, z]],
      [[x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1]],
    ][faceIndex];

    for (let i = 0; i < 4; i += 1) {
      bucket.positions.push(...faceVerts[i]);
      bucket.normals.push(...normal);
      bucket.uvs.push(uv[i * 2], uv[i * 2 + 1]);
    }
    bucket.indices.push(
      vertexIndex,
      vertexIndex + 1,
      vertexIndex + 2,
      vertexIndex,
      vertexIndex + 2,
      vertexIndex + 3,
    );
  };

  for (let x = 0; x < chunkSize.x; x += 1) {
    for (let y = 0; y < chunkSize.y; y += 1) {
      for (let z = 0; z < chunkSize.z; z += 1) {
        const type = getVoxel(x, y, z);
        if (type === BlockType.AIR) continue;

        for (let faceIndex = 0; faceIndex < 6; faceIndex += 1) {
          const [dx, dy, dz] = faceOffsets[faceIndex];
          const neighbor = getVoxel(x + dx, y + dy, z + dz);
          if (shouldRenderFace(type, neighbor)) addFace(x, y, z, faceIndex, type);
        }
      }
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const groups: Array<{ start: number; count: number; materialIndex: number }> = [];
  let vertexOffset = 0;

  buckets.forEach((bucket, materialIndex) => {
    if (bucket.indices.length === 0) return;
    const groupStart = indices.length;
    positions.push(...bucket.positions);
    normals.push(...bucket.normals);
    uvs.push(...bucket.uvs);
    indices.push(...bucket.indices.map((index) => index + vertexOffset));
    groups.push({ start: groupStart, count: bucket.indices.length, materialIndex });
    vertexOffset += bucket.positions.length / 3;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  groups.forEach((group) => geometry.addGroup(group.start, group.count, group.materialIndex));
  geometry.computeBoundingSphere();
  return geometry;
}
