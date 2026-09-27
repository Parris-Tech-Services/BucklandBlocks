// mesher.ts - Efficient greedy meshing for voxel chunks, optimized to only generate visible faces and group geometry by material for improved rendering performance.
import * as THREE from "three";
import { BlockType, isBlockTransparent } from "./blocks";

export function createBlockMesh(
  voxelData: Uint8Array,
  chunkSize: { x: number; y: number; z: number }
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indicesByMaterial: number[][] = Array.from({ length: 6 }, () => []);

  let vertexIndex = 0;

  const faceNormals = [
    [0, 0, 1],   // Front
    [0, 0, -1],  // Back
    [1, 0, 0],   // Right
    [-1, 0, 0],  // Left
    [0, 1, 0],   // Top
    [0, -1, 0],  // Bottom
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
      return BlockType.AIR;
    }
    const index = x + y * chunkSize.x + z * chunkSize.x * chunkSize.y;
    return voxelData[index];
  };

  const addFace = (
    x: number,
    y: number,
    z: number,
    faceIndex: number,
    blockType: BlockType
  ): void => {
    const n = faceNormals[faceIndex];
    const uv = [0, 0, 1, 0, 1, 1, 0, 1];

    // Face vertices
    const faceVerts = [
      // Front
      [
        [x, y, z + 1],
        [x + 1, y, z + 1],
        [x + 1, y + 1, z + 1],
        [x, y + 1, z + 1],
      ],
      // Back
      [
        [x + 1, y, z],
        [x, y, z],
        [x, y + 1, z],
        [x + 1, y + 1, z],
      ],
      // Right
      [
        [x + 1, y, z + 1],
        [x + 1, y, z],
        [x + 1, y + 1, z],
        [x + 1, y + 1, z + 1],
      ],
      // Left
      [
        [x, y, z],
        [x, y, z + 1],
        [x, y + 1, z + 1],
        [x, y + 1, z],
      ],
      // Top
      [
        [x, y + 1, z + 1],
        [x + 1, y + 1, z + 1],
        [x + 1, y + 1, z],
        [x, y + 1, z],
      ],
      // Bottom
      [
        [x, y, z],
        [x + 1, y, z],
        [x + 1, y, z + 1],
        [x, y, z + 1],
      ],
    ][faceIndex];

    for (let i = 0; i < 4; i++) {
      positions.push(...faceVerts[i]);
      normals.push(...n);
      uvs.push(uv[i * 2], uv[i * 2 + 1]);
    }

    const faceIndices = [
      vertexIndex,
      vertexIndex + 1,
      vertexIndex + 2,
      vertexIndex,
      vertexIndex + 2,
      vertexIndex + 3
    ];

    // determine material index by block type (must match Chunk.tsx materials order)
    let materialIndex = 0;
    switch (blockType) {
      case BlockType.DIRT:
        materialIndex = 0; break;
      case BlockType.GRASS:
        materialIndex = 1; break;
      case BlockType.STONE:
      case BlockType.COBBLESTONE:
        materialIndex = 2; break;
      case BlockType.WOOD_LOG:
      case BlockType.WOOD_PLANK:
      case BlockType.WOOD:
        materialIndex = 3; break;
      case BlockType.SAND:
        materialIndex = 4; break;
      case BlockType.SKY:
        materialIndex = 5; break;
      default:
        materialIndex = 0; break;
    }

    indicesByMaterial[materialIndex].push(...faceIndices);

    vertexIndex += 4;
  };

  // Loop through voxels
  for (let x = 0; x < chunkSize.x; x++) {
    for (let y = 0; y < chunkSize.y; y++) {
      for (let z = 0; z < chunkSize.z; z++) {
        const type = getVoxel(x, y, z);
        if (type === BlockType.AIR) continue;

        for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
          const [dx, dy, dz] = faceOffsets[faceIndex];
          const neighbor = getVoxel(x + dx, y + dy, z + dz);
          if (isBlockTransparent(neighbor)) {
            addFace(x, y, z, faceIndex, type);
          }
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const indices: number[] = [];
  let indexStart = 0;
  indicesByMaterial.forEach((materialIndices, materialIndex) => {
    if (materialIndices.length === 0) return;
    indices.push(...materialIndices);
    geo.addGroup(indexStart, materialIndices.length, materialIndex);
    indexStart += materialIndices.length;
  });
  geo.setIndex(indices);

  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}
