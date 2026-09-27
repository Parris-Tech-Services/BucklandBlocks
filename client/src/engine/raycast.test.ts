// Focused tests for raycast edge cases explicitly called out in the Buckland
// Blocks repair brief: zero-direction components, exact voxel boundaries,
// and negative coordinates. Run with:
// npx tsx --test client/src/engine/raycast.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { performRaycast } from './raycast';
import { BlockType } from './blocks';

function worldWithOneSolidBlock(bx: number, by: number, bz: number) {
  return (x: number, y: number, z: number): BlockType => {
    if (x === bx && y === by && z === bz) return BlockType.STONE;
    return BlockType.AIR;
  };
}

test('a zero-length direction vector does not hang and returns a result (possibly null)', () => {
  const getBlock = worldWithOneSolidBlock(5, 5, 5);
  const zeroDir = new THREE.Vector3(0, 0, 0);
  const start = Date.now();
  const result = performRaycast(new THREE.Vector3(0, 0, 0), zeroDir, 10, getBlock);
  const elapsedMs = Date.now() - start;
  assert.ok(elapsedMs < 1000, `expected the raycast to terminate quickly, took ${elapsedMs}ms`);
  // No assertion on hit/miss — a degenerate direction has no well-defined
  // target. The contract under test is termination, not a specific result.
  assert.ok(result === null || typeof result.distance === 'number');
});

test('hits a block exactly one unit away along a single axis', () => {
  const getBlock = worldWithOneSolidBlock(5, 0, 0);
  const hit = performRaycast(new THREE.Vector3(4.5, 0.5, 0.5), new THREE.Vector3(1, 0, 0), 10, getBlock);
  assert.ok(hit, 'expected a hit');
  assert.equal(hit!.position.x, 5);
  assert.equal(hit!.position.y, 0);
  assert.equal(hit!.position.z, 0);
});

test('does not hit a block beyond maxDistance', () => {
  const getBlock = worldWithOneSolidBlock(50, 0, 0);
  const hit = performRaycast(new THREE.Vector3(0, 0.5, 0.5), new THREE.Vector3(1, 0, 0), 5, getBlock);
  assert.equal(hit, null);
});

test('works correctly across negative coordinates', () => {
  const getBlock = worldWithOneSolidBlock(-5, -3, -2);
  // Block (-5,-3,-2) occupies real-world range x:[-5,-4) y:[-3,-2) z:[-2,-1).
  // floor(-2.5) = -3 and floor(-1.5) = -2, which is what puts the origin in
  // that same y/z column (floor rounds toward -infinity, not toward zero).
  const hit = performRaycast(new THREE.Vector3(0, -2.5, -1.5), new THREE.Vector3(-1, 0, 0), 10, getBlock);
  assert.ok(hit, 'expected a hit on the negative-coordinate block');
  assert.equal(hit!.position.x, -5);
  assert.equal(hit!.position.y, -3);
  assert.equal(hit!.position.z, -2);
});

test('starting exactly on a voxel boundary does not skip the adjacent block', () => {
  const getBlock = worldWithOneSolidBlock(1, 0, 0);
  // Origin sits exactly on the boundary between block (0,0,0) and (1,0,0).
  const hit = performRaycast(new THREE.Vector3(1.0, 0.5, 0.5), new THREE.Vector3(1, 0, 0), 10, getBlock);
  assert.ok(hit, 'expected a hit starting from an exact voxel boundary');
  assert.equal(hit!.position.x, 1);
});
