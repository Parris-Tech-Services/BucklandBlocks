// Regression guard for a data-loss bug: <Chunk> used to set `chunk.dirty =
// false` after meshing. Save World only persists dirty chunks, so every mined
// or placed block was silently dropped from saves. Rendering must never clear
// the flag; this test fails if any client code outside the store assigns it.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

test("only the game store decides whether a chunk has unsaved edits", () => {
  const offenders = sourceFiles("client/src")
    .filter((path) => !path.endsWith("lib/stores/useGame.tsx"))
    .filter((path) => /\.dirty\s*=[^=]/.test(readFileSync(path, "utf8")));
  assert.deepEqual(offenders, []);
});
