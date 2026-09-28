import test from "node:test";
import assert from "node:assert/strict";
import { isFeatureOn, parseFeatureList } from "./features";

test("feature lists are parsed case-insensitively and 'none' clears them", () => {
  assert.deepEqual([...parseFeatureList(" NewInventory, ores ,")], ["newinventory", "ores"]);
  assert.deepEqual([...parseFeatureList("none")], []);
  assert.deepEqual([...parseFeatureList(null)], []);
});

test("unknown features are off by default", () => {
  assert.equal(isFeatureOn("definitely-not-a-feature"), false);
});
