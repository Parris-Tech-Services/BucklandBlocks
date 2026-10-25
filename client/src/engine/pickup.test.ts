import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { BlockType } from "./blocks";
import { useGame } from "../lib/stores/useGame";
import { inventorySpaceFor, isWithinPickupReach, THROWN_PICKUP_DELAY_MS } from "./pickup";

const PLAYER_HEIGHT = 1.8;
// Eyes at y=65.8 means feet on the ground block top at y=64.
const eye = new THREE.Vector3(10.5, 65.8, 10.5);

function emptyInventory() {
  return { inventory: new Array(36).fill(null), inventoryCounts: new Array(36).fill(0) };
}

test("an item at the player's feet is within reach", () => {
  // Stored at a block corner; drawn at +0.5 sideways, so this sits under the player.
  assert.equal(isWithinPickupReach(new THREE.Vector3(10, 64, 10), eye, PLAYER_HEIGHT), true);
});

test("items too far sideways, below or above are out of reach", () => {
  assert.equal(isWithinPickupReach(new THREE.Vector3(12, 64, 10), eye, PLAYER_HEIGHT), false);
  assert.equal(isWithinPickupReach(new THREE.Vector3(10, 62, 10), eye, PLAYER_HEIGHT), false);
  assert.equal(isWithinPickupReach(new THREE.Vector3(10, 67, 10), eye, PLAYER_HEIGHT), false);
});

test("inventorySpaceFor counts empty slots and room on matching stacks", () => {
  const items = [BlockType.DIRT, BlockType.STONE, null];
  assert.equal(inventorySpaceFor(items, [60, 10, 0], BlockType.DIRT, 64), 4 + 64);
  assert.equal(inventorySpaceFor([BlockType.STONE], [64], BlockType.DIRT, 64), 0);
});

test("a thrown item is not picked up straight away, then is picked up by walking over it", () => {
  useGame.setState({ ...emptyInventory(), selectedSlot: 0, droppedItems: [] });
  useGame.setState((s) => {
    s.inventory[0] = BlockType.DIRT;
    s.inventoryCounts[0] = 5;
    return { inventory: [...s.inventory], inventoryCounts: [...s.inventoryCounts] };
  });

  useGame.getState().dropSelectedItem(true);
  const [dropped] = useGame.getState().droppedItems;
  assert.equal(dropped.count, 1);
  assert.equal(useGame.getState().inventoryCounts[0], 4);

  // Stand exactly where it landed.
  const standingOnIt = new THREE.Vector3(dropped.position.x + 0.5, dropped.position.y + 0.25 + 1, dropped.position.z + 0.5);

  assert.equal(useGame.getState().collectNearbyItems(standingOnIt, PLAYER_HEIGHT, Date.now()), 0);
  assert.equal(useGame.getState().droppedItems.length, 1);

  const later = Date.now() + THROWN_PICKUP_DELAY_MS + 1;
  assert.equal(useGame.getState().collectNearbyItems(standingOnIt, PLAYER_HEIGHT, later), 1);
  assert.equal(useGame.getState().droppedItems.length, 0);
  assert.equal(useGame.getState().inventory[0], BlockType.DIRT);
  assert.equal(useGame.getState().inventoryCounts[0], 5);
});

test("walking over items with a nearly full inventory takes what fits and leaves the rest", () => {
  const inventory = new Array(36).fill(BlockType.STONE);
  const inventoryCounts = new Array(36).fill(64);
  inventory[0] = BlockType.DIRT;
  inventoryCounts[0] = 62;
  useGame.setState({
    inventory,
    inventoryCounts,
    droppedItems: [{ id: "a", type: BlockType.DIRT, count: 5, position: new THREE.Vector3(10, 64, 10), pickupAt: 0 }],
  });

  assert.equal(useGame.getState().collectNearbyItems(eye, PLAYER_HEIGHT, 1), 2);
  assert.equal(useGame.getState().inventoryCounts[0], 64);
  assert.equal(useGame.getState().droppedItems[0].count, 3);

  // Completely full: nothing changes, and the item stays on the ground.
  assert.equal(useGame.getState().collectNearbyItems(eye, PLAYER_HEIGHT, 2), 0);
  assert.equal(useGame.getState().droppedItems[0].count, 3);
});

test("items out of reach stay on the ground", () => {
  useGame.setState({
    ...emptyInventory(),
    droppedItems: [{ id: "far", type: BlockType.DIRT, count: 1, position: new THREE.Vector3(30, 64, 30), pickupAt: 0 }],
  });
  assert.equal(useGame.getState().collectNearbyItems(eye, PLAYER_HEIGHT, 1), 0);
  assert.equal(useGame.getState().droppedItems.length, 1);
});

test("standing still never re-collects a thrown item, whichever way the player faces", () => {
  for (let step = 0; step < 16; step += 1) {
    const yaw = (step / 16) * Math.PI * 2;
    useGame.setState({
      ...emptyInventory(),
      droppedItems: [],
      selectedSlot: 0,
      playerPosition: eye.clone(),
      playerRotation: { x: 0, y: yaw },
    });
    useGame.setState((s) => {
      s.inventory[0] = BlockType.DIRT;
      s.inventoryCounts[0] = 1;
      return { inventory: [...s.inventory], inventoryCounts: [...s.inventoryCounts] };
    });
    useGame.getState().dropSelectedItem(true);
    const [dropped] = useGame.getState().droppedItems;
    assert.equal(isWithinPickupReach(dropped.position, eye, PLAYER_HEIGHT), false, `yaw ${yaw}`);

    // One step towards it is enough.
    const stepForward = eye.clone().add(new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)));
    assert.equal(isWithinPickupReach(dropped.position, stepForward, PLAYER_HEIGHT), true, `yaw ${yaw}`);
  }
});
