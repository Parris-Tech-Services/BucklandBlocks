// Focused tests for player-volume collision (Priority 3 in the Buckland
// Blocks repair brief: real per-axis collision against solid voxels, not a
// same-column highest-block clamp). Run with:
// npx tsx --test client/src/engine/collision.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { collidesAt, moveAxisWithCollision } from './collision';
import { BlockType } from './blocks';

const PLAYER_HEIGHT = 1.8;

// A single solid block at (5, 10, 5), open air everywhere else — enough to
// test collision against a wall/floor without needing a real chunk/world.
function worldWithOneSolidBlock(bx: number, by: number, bz: number) {
  return (x: number, y: number, z: number): BlockType => {
    if (Math.floor(x) === bx && Math.floor(y) === by && Math.floor(z) === bz) {
      return BlockType.STONE;
    }
    return BlockType.AIR;
  };
}

test('collidesAt is false in open air', () => {
  const getBlock = worldWithOneSolidBlock(5, 10, 5);
  const pos = new THREE.Vector3(0, 5, 0);
  assert.equal(collidesAt(pos, PLAYER_HEIGHT, getBlock), false);
});

test('collidesAt is true when the player volume overlaps a solid voxel', () => {
  const getBlock = worldWithOneSolidBlock(5, 10, 5);
  // Feet-to-head vertical range for eye at y is [y - PLAYER_HEIGHT, y + HEAD_ROOM].
  // The block occupies y in [10, 11). Eye y=11 -> feet=9.2, head=11.3, which
  // overlaps [10, 11).
  const overlapping = new THREE.Vector3(5.5, 11, 5.5);
  assert.equal(collidesAt(overlapping, PLAYER_HEIGHT, getBlock), true);
  // Sanity: far away in x is not overlapping.
  const farAway = new THREE.Vector3(50, 11, 5.5);
  assert.equal(collidesAt(farAway, PLAYER_HEIGHT, getBlock), false);
});

test('moveAxisWithCollision stops at a wall and zeroes velocity, does not tunnel through', () => {
  const getBlock = worldWithOneSolidBlock(5, 10, 5);
  // Player standing so that moving +x by a large delta in one step would,
  // without substepping, land past the wall (tunnelling). Eye y=10 puts feet
  // at 8.2, head at 10.3 — inside the block's y-range [10,11).
  const pos = new THREE.Vector3(3, 10, 5.5);
  const vel = new THREE.Vector3(10, 0, 0); // fast — full-frame delta would tunnel if not substepped
  const delta = 1.0; // 10 units/sec * 1s = 10 units of travel, wall is ~2 units away
  const blocked = moveAxisWithCollision(pos, vel, 'x', vel.x * delta, PLAYER_HEIGHT, getBlock);

  assert.equal(blocked, true, 'expected the wall to block movement');
  assert.equal(vel.x, 0, 'expected velocity.x zeroed on collision');
  // Player half-width is 0.3, so the closest the player's edge can get to
  // the block's face at x=5 is pos.x + 0.3 <= 5, i.e. pos.x <= 4.7.
  assert.ok(pos.x <= 4.7, `expected player stopped before the wall, got x=${pos.x}`);
  assert.ok(pos.x > 3, 'expected the player to have moved at all before hitting the wall');
});

test('moveAxisWithCollision completes the full delta when nothing is in the way', () => {
  const getBlock = worldWithOneSolidBlock(5, 10, 5);
  const pos = new THREE.Vector3(0, 5, 0);
  const vel = new THREE.Vector3(0, 0, 3);
  const blocked = moveAxisWithCollision(pos, vel, 'z', 2, PLAYER_HEIGHT, getBlock);
  assert.equal(blocked, false);
  // Substepping accumulates floating-point error over many small additions;
  // assert closeness, not bit-exact equality.
  assert.ok(Math.abs(pos.z - 2) < 1e-9, `expected pos.z ~= 2, got ${pos.z}`);
  assert.equal(vel.z, 3, 'velocity should be untouched when not blocked');
});

test('a zero delta is a no-op', () => {
  const getBlock = worldWithOneSolidBlock(5, 10, 5);
  const pos = new THREE.Vector3(1, 1, 1);
  const vel = new THREE.Vector3(0, -5, 0);
  const blocked = moveAxisWithCollision(pos, vel, 'y', 0, PLAYER_HEIGHT, getBlock);
  assert.equal(blocked, false);
  assert.equal(pos.y, 1);
});
