import * as THREE from "three";
import { BlockType, isBlockTransparent } from "./blocks";

type OutsideVoxelLookup = (x: number, y: number, z: number) => BlockType;

interface MaterialBucket {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

const MATERIAL_COUNT = 6;

const materialIndexFor = (blockType: BlockType): number => {
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
    case BlockType.DOOR_BOTTOM:
    case BlockType.DOOR_TOP:
    case BlockType.TORCH:
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
};

const shouldRenderFace = (
  current: BlockType,
  neighbour: BlockType,
): boolean => {
  if (neighbour === BlockType.AIR) return true;
  if (current === neighbour && isBlockTransparent(current)) return false;
  if (!isBlockTransparent(current) && isBlockTransparent(neighbour)) {
    return true;
  }
  if (isBlockTransparent(current) && !isBlockTransparent(neighbour)) {
    return false;
  }
  return isBlockTransparent(current) && isBlockTransparent(neighbour);
};

export function createBlockMesh(
  voxelData: Uint8Array,
  chunkSize: { x: number; y: number; z: number },
  outsideVoxel?: OutsideVoxelLookup,
): THREE.BufferGeometry {
  const buckets: MaterialBucket[] = Array.from(
    { length: MATERIAL_COUNT },
    () => ({
      positions: [],
      normals: [],
      uvs: [],
      indices: [],
    }),
  );

  const faceNormals = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ];

  const faceOffsets = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ];

  const getVoxel = (x: number, y: number, z: number): BlockType => {
    if (
      x < 0 ||
      x >= chunkSize.x ||
      y < 0 ||
      y >= chunkSize.y ||
      z < 0 ||
      z >= chunkSize.z
    ) {
      return outsideVoxel ? outsideVoxel(x, y, z) : BlockType.AIR;
    }

    const index = x + y * chunkSize.x + z * chunkSize.x * chunkSize.y;
    return (voxelData[index] ?? BlockType.AIR) as BlockType;
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
      [
        [x, y, z + 1],
        [x + 1, y, z + 1],
        [x + 1, y + 1, z + 1],
        [x, y + 1, z + 1],
      ],
      [
        [x + 1, y, z],
        [x, y, z],
        [x, y + 1, z],
        [x + 1, y + 1, z],
      ],
      [
        [x + 1, y, z + 1],
        [x + 1, y, z],
        [x + 1, y + 1, z],
        [x + 1, y + 1, z + 1],
      ],
      [
        [x, y, z],
        [x, y, z + 1],
        [x, y + 1, z + 1],
        [x, y + 1, z],
      ],
      [
        [x, y + 1, z + 1],
        [x + 1, y + 1, z + 1],
        [x + 1, y + 1, z],
        [x, y + 1, z],
      ],
      [
        [x, y, z],
        [x + 1, y, z],
        [x + 1, y, z + 1],
        [x, y, z + 1],
      ],
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
          const neighbour = getVoxel(x + dx, y + dy, z + dz);
          if (shouldRenderFace(type, neighbour)) {
            addFace(x, y, z, faceIndex, type);
          }
        }
      }
    }
  }

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const geometry = new THREE.BufferGeometry();

  let vertexOffset = 0;
  let indexOffset = 0;

  buckets.forEach((bucket, materialIndex) => {
    if (bucket.indices.length === 0) return;

    positions.push(...bucket.positions);
    normals.push(...bucket.normals);
    uvs.push(...bucket.uvs);
    indices.push(
      ...bucket.indices.map((index) => index + vertexOffset),
    );

    geometry.addGroup(
      indexOffset,
      bucket.indices.length,
      materialIndex,
    );
    vertexOffset += bucket.positions.length / 3;
    indexOffset += bucket.indices.length;
  });

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normals, 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uvs, 2),
  );
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
}
