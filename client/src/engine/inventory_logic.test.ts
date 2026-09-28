import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { BlockType } from "./blocks";
import { useGame } from "../lib/stores/useGame";

test("addToInventory handles overflow and creates dropped items", () => {
  const state = useGame.getState();
  
  // 1. Fill inventory completely with Dirt
  const newInv = new Array(36).fill(BlockType.DIRT);
  const newCounts = new Array(36).fill(64); // max stack
  
  useGame.setState({ 
    inventory: newInv, 
    inventoryCounts: newCounts,
    droppedItems: [] 
  });
  
  const stateAfterFill = useGame.getState();
  const remaining = stateAfterFill.addToInventory(BlockType.STONE, 10);
  
  // It should reject all 10 stones
  assert.equal(remaining, 10);
  
  // Simulating the Player.tsx logic
  if (remaining > 0) {
    stateAfterFill.addDroppedItem(BlockType.STONE, remaining, new THREE.Vector3(0, 0, 0));
  }
  
  const finalState = useGame.getState();
  assert.equal(finalState.droppedItems.length, 1);
  assert.equal(finalState.droppedItems[0].type, BlockType.STONE);
  assert.equal(finalState.droppedItems[0].count, 10);
});

test("addDroppedItem merges nearby items of same type", () => {
  const state = useGame.getState();
  useGame.setState({ droppedItems: [] });
  
  state.addDroppedItem(BlockType.WOOD_LOG, 5, new THREE.Vector3(10, 10, 10));
  const s1 = useGame.getState();
  assert.equal(s1.droppedItems.length, 1);
  
  // Drop exactly same place
  s1.addDroppedItem(BlockType.WOOD_LOG, 3, new THREE.Vector3(10.5, 10, 10)); // within 2.0 distance
  
  const s2 = useGame.getState();
  assert.equal(s2.droppedItems.length, 1);
  assert.equal(s2.droppedItems[0].count, 8); // 5 + 3 merged
  
  // Drop different type
  s2.addDroppedItem(BlockType.STONE, 1, new THREE.Vector3(10, 10, 10));
  const s3 = useGame.getState();
  assert.equal(s3.droppedItems.length, 2);
  
  // Drop same type but far away
  s3.addDroppedItem(BlockType.WOOD_LOG, 2, new THREE.Vector3(50, 10, 10));
  const s4 = useGame.getState();
  assert.equal(s4.droppedItems.length, 3);
});
