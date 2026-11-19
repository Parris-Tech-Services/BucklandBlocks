import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

test("pause menu shows the game name Voxelvale", () => {
  const menu = readFileSync(join(here, "PauseMenu.tsx"), "utf8");
  assert.match(menu, />Voxelvale<\/h2>/);
});
