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
  const indicesByMaterial: number[][] = Array.from({ length: 10 }, () => []);

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
      case BlockType.LEAF:
        materialIndex = 1; break;
      case BlockType.STONE:
      case BlockType.COBBLESTONE:
      case BlockType.BRICK:
        materialIndex = 2; break;
      case BlockType.WOOD_LOG:
      case BlockType.WOOD_PLANK:
      case BlockType.WOOD:
      case BlockType.DOOR_BOTTOM:
      case BlockType.DOOR_TOP:
      case BlockType.TORCH:
        materialIndex = 3; break;
      case BlockType.SAND:
        materialIndex = 4; break;
      case BlockType.SKY:
      case BlockType.GLASS:
        materialIndex = 5; break;
      case BlockType.WATER:
        materialIndex = 6; break;
      case BlockType.CRAFTING_TABLE:
        materialIndex = 7; break;
      case BlockType.CHEST:
        materialIndex = 8; break;
      case BlockType.FURNACE:
        materialIndex = 9; break;
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
          // Skip faces between two blocks of the *same* type even if that
          // type is transparent (e.g. water-to-water) — otherwise every
          // internal boundary inside a lake renders a face, which is both
          // wasteful and visually wrong (stacked semi-transparent surfaces
          // darkening the interior). A transparent block still gets a face
          // against a different type (open air, or the lakebed as seen
          // from the water side isn't needed either, since that side faces
          // opaque ground — only the reverse, ground-facing-water, needs a
          // face, and it already gets one here since water is transparent).
          if (neighbor !== type && isBlockTransparent(neighbor)) {
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
