import test from "node:test";
import assert from "node:assert/strict";
import { isFeatureOn, parseFeatureList, resolveFeature } from "./features";

const defaults = { ores: true, newinventory: false };

test("listed features turn on, case-insensitively", () => {
  assert.equal(resolveFeature("newinventory", parseFeatureList(" NewInventory ,"), defaults), true);
});

test("'none' turns off features that default to on", () => {
  assert.equal(resolveFeature("ores", parseFeatureList("none"), defaults), false);
  assert.equal(resolveFeature("ores", parseFeatureList("none,ores"), defaults), true);
});

test("'-name' turns off one feature and leaves the rest at their defaults", () => {
  assert.equal(resolveFeature("ores", parseFeatureList("-ores"), defaults), false);
  assert.equal(resolveFeature("newinventory", parseFeatureList("-ores,newinventory"), defaults), true);
});

test("with no overrides, defaults apply and unknown features are off", () => {
  assert.equal(resolveFeature("ores", parseFeatureList(null), defaults), true);
  assert.equal(resolveFeature("newinventory", parseFeatureList(""), defaults), false);
  assert.equal(isFeatureOn("definitely-not-a-feature"), false);
});
