import test from "node:test";
import assert from "node:assert/strict";
import { useGame } from "../lib/stores/useGame";

const CHUNK_VOXELS = 16 * 128 * 16;

function freshWorld(keys: string[]) {
  useGame.setState({ chunks: new Map() });
  for (const key of keys) {
    const [x, z] = key.split(",").map(Number);
    useGame.getState().setChunk(x, z, new Uint8Array(CHUNK_VOXELS));
  }
}

test("unloading keeps edited chunks and drops clean ones outside the window", () => {
  freshWorld(["0,0", "1,0", "2,0"]);
  useGame.getState().setBlock(2 * 16 + 3, 10, 3, 1); // edit chunk 2,0
  useGame.getState().unloadCleanChunks(new Set(["1,0"]));
  assert.deepEqual([...useGame.getState().chunks.keys()].sort(), ["1,0", "2,0"]);
  assert.equal(useGame.getState().getBlock(2 * 16 + 3, 10, 3), 1, "edit survives");
});

test("a neighbour of an unloaded chunk remeshes its border", () => {
  freshWorld(["0,0", "1,0"]);
  const before = useGame.getState().chunks.get("1,0")!.revision;
  useGame.getState().unloadCleanChunks(new Set(["1,0"]));
  assert.equal(useGame.getState().chunks.has("0,0"), false);
  assert.ok(useGame.getState().chunks.get("1,0")!.revision > before);
});

test("nothing to unload leaves the chunk map untouched", () => {
  freshWorld(["0,0"]);
  const map = useGame.getState().chunks;
  useGame.getState().unloadCleanChunks(new Set(["0,0"]));
  assert.equal(useGame.getState().chunks, map);
});
