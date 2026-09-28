import { readFileSync, existsSync } from "node:fs";

const failures = [];
const requireFile = (path) => {
  if (!existsSync(path)) {
    failures.push(`Missing required file: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
};

const input = requireFile("client/src/engine/input.ts");
const player = requireFile("client/src/engine/Player.tsx");
const chunk = requireFile("client/src/engine/Chunk.tsx");
const mesher = requireFile("client/src/engine/mesher.ts");

if (player.includes("consumeMousePress") && !input.includes("consumeMousePress")) {
  failures.push(
    "Player consumes queued mouse presses but input.ts does not expose consumeMousePress().",
  );
}

const firstMemo = chunk.indexOf("useMemo(");
const missingDataReturn = chunk.indexOf("if (!voxelData) return null");
if (
  firstMemo >= 0 &&
  missingDataReturn >= 0 &&
  missingDataReturn < firstMemo
) {
  failures.push(
    "Chunk returns before useMemo, which can change hook order when streamed data arrives (React #310).",
  );
}

for (const [block, material] of [
  ["BlockType.CRAFTING_TABLE", "materialIndex = 7"],
  ["BlockType.CHEST", "materialIndex = 8"],
  ["BlockType.FURNACE", "materialIndex = 9"],
]) {
  if (!mesher.includes(block) || !mesher.includes(material)) {
    failures.push(`Utility-block material mapping missing: ${block} -> ${material}`);
  }
}

for (const file of [
  "client/public/textures/crafting_table.png",
  "client/public/textures/chest.png",
  "client/public/textures/furnace.png",
  "client/public/textures/pickaxe.png",
  "client/public/textures/axe.png",
  "client/public/textures/shovel.png",
  "client/public/textures/sword.png",
]) {
  if (!existsSync(file)) failures.push(`Missing gameplay texture: ${file}`);
}

if (failures.length) {
  console.error("\nRELEASE GATE FAILED\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Critical regression guard passed.");
