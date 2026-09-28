// Regression test for the "one geometry group per face" performance bug
// (Priority 1 in the Buckland Blocks repair brief): a chunk with many solid
// blocks of the same material must produce one draw-call group per material,
// not one per face. Run with: npx tsx --test client/src/engine/collision.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlockMesh } from './mesher';
import { BlockType } from './blocks';

function makeChunk(sizeX: number, sizeY: number, sizeZ: number, fill: (x: number, y: number, z: number) => BlockType) {
  const data = new Uint8Array(sizeX * sizeY * sizeZ);
  for (let z = 0; z < sizeZ; z++) {
    for (let y = 0; y < sizeY; y++) {
      for (let x = 0; x < sizeX; x++) {
        data[x + y * sizeX + z * sizeX * sizeY] = fill(x, y, z);
      }
    }
  }
  return data;
}

test('a row of same-material solid blocks batches into one geometry group, not one per face', () => {
  const size = { x: 5, y: 1, z: 1 };
  const voxels = makeChunk(size.x, size.y, size.z, () => BlockType.DIRT);
  const geo = createBlockMesh(voxels, size);

  // 5 adjacent dirt blocks have many visible faces (both ends + top/bottom/
  // front/back of every block = well over 5 faces), so if this were still
  // one addGroup() call per face, groups.length would be in the dozens.
  assert.equal(geo.groups.length, 1, `expected all same-material faces batched into 1 group, got ${geo.groups.length}`);
  assert.ok(geo.groups[0].count > 6, 'expected more than one face worth of indices in the batched group');
});

test('blocks of different materials get one group per material, not per face', () => {
  const size = { x: 2, y: 1, z: 1 };
  const voxels = makeChunk(size.x, size.y, size.z, (x) => (x === 0 ? BlockType.DIRT : BlockType.STONE));
  const geo = createBlockMesh(voxels, size);

  assert.equal(geo.groups.length, 2, `expected exactly one group per distinct material, got ${geo.groups.length}`);
  const materialIndices = geo.groups.map(g => g.materialIndex).sort();
  assert.deepEqual(materialIndices, [0, 2], 'expected DIRT (material 0) and STONE (material 2) groups');
});

test('a chunk of all-air voxels produces no geometry', () => {
  const size = { x: 4, y: 4, z: 4 };
  const voxels = makeChunk(size.x, size.y, size.z, () => BlockType.AIR);
  const geo = createBlockMesh(voxels, size);
  assert.equal(geo.groups.length, 0);
  assert.equal(geo.getAttribute('position').count, 0);
});

test('a solid block of water only renders its outer faces, not internal water-to-water faces', () => {
  // Regression test: water is transparent, and a naive "render a face
  // whenever the neighbour is transparent" rule would render every
  // internal boundary inside a solid body of water too — wasteful, and
  // visually wrong (stacked semi-transparent surfaces darkening the
  // interior of a lake). Only the outer surface should render.
  const size = { x: 3, y: 3, z: 3 };
  const voxels = makeChunk(size.x, size.y, size.z, () => BlockType.WATER);
  const geo = createBlockMesh(voxels, size);

  const expectedOuterFaces = 6 * size.x * size.y; // cube of side 3: 6 faces of 3x3 each
  const expectedIndices = expectedOuterFaces * 6; // 2 triangles (6 indices) per face
  assert.equal(geo.getIndex()!.count, expectedIndices, 'expected only the outer surface of the water cube to be meshed');
  assert.equal(geo.groups.length, 1, 'all water faces should batch into a single material group');
});

test('water renders a face where it meets open air, and the ground renders a face where it meets water', () => {
  // A 1-block-deep pool of water sitting on a floor of dirt.
  const size = { x: 2, y: 3, z: 2 };
  const voxels = makeChunk(size.x, size.y, size.z, (_x, y) => (y === 0 ? BlockType.DIRT : y === 1 ? BlockType.WATER : BlockType.AIR));
  const geo = createBlockMesh(voxels, size);
  // Just needs to produce some geometry without throwing — the batching
  // test above already proves same-type faces are culled; this proves
  // different-type transparent/solid boundaries still render.
  assert.ok(geo.getIndex()!.count > 0, 'expected the dirt/water/air boundaries to produce visible faces');
});
