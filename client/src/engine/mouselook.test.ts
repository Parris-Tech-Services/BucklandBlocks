// Regression test for the "pitch inverts depending on which way you're
// facing" bug: reported as correct facing one direction, inverted facing
// the opposite direction, unaffected left/right.
//
// Root cause: three.js's default Euler order ('XYZ') applies pitch (x)
// around the camera's *original* X axis before yaw (y) is applied on top of
// it, so the same pitch update only reads as "up/down" when facing the
// initial direction — turned around, it visually inverts; at 90°/270° it
// does nothing. Player.tsx sets `camera.rotation.order = 'YXZ'` once so yaw
// is applied first (around the fixed world-up axis) and pitch second
// (around the resulting local X axis), which is yaw-independent.
//
// Run with: npx tsx --test client/src/engine/mouselook.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Mirrors the exact update Player.tsx's mousemove handler performs.
function applyMouseUp(order: THREE.EulerOrder, yaw: number, movementY: number) {
  const camera = new THREE.PerspectiveCamera();
  camera.rotation.order = order;
  camera.rotation.y = yaw;
  const sensitivity = 0.002;
  camera.rotation.x -= movementY * sensitivity;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir.y;
}

test('with the default Euler order, pushing the mouse up inverts depending on yaw (documents the bug)', () => {
  const facingNorth = applyMouseUp('XYZ', 0, -50);
  const facingSouth = applyMouseUp('XYZ', Math.PI, -50);
  assert.ok(facingNorth > 0, 'facing the initial direction, mouse-up should read as looking up');
  assert.ok(facingSouth < 0, 'facing the opposite direction, the default order inverts it (this is the bug)');
});

test('with YXZ order, pushing the mouse up always looks up regardless of yaw', () => {
  const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  const results = angles.map((yaw) => applyMouseUp('YXZ', yaw, -50));
  for (const dirY of results) {
    assert.ok(dirY > 0, `expected looking up at every yaw angle, got dir.y=${dirY}`);
  }
  // Not just "positive everywhere" — genuinely yaw-independent magnitude.
  const [first, ...rest] = results;
  for (const dirY of rest) {
    assert.ok(Math.abs(dirY - first) < 1e-9, 'pitch response should not vary with yaw at all under YXZ');
  }
});

test('with YXZ order, pushing the mouse down always looks down regardless of yaw', () => {
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (const yaw of angles) {
    const dirY = applyMouseUp('YXZ', yaw, 50); // movementY positive = mouse moved down
    assert.ok(dirY < 0, `expected looking down at yaw=${yaw}, got dir.y=${dirY}`);
  }
});
