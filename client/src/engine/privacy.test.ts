import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// The world is centred on a street, never on a specific house.
// A street number here would publish a real residential address.
const here = dirname(fileURLToPath(import.meta.url));

test("starting location has no house number", () => {
  const src = readFileSync(join(here, "World.tsx"), "utf8");
  const match = src.match(/STARTING_ADDRESS\s*=\s*"([^"]+)"/);
  assert.ok(match, "STARTING_ADDRESS constant should exist");
  assert.doesNotMatch(match[1], /^\s*\d/, "address must not start with a street number");
  assert.match(match[1], /Buckland Street/, "game should still centre on Buckland Street");
});
