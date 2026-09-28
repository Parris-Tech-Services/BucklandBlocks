import { BLOCKS, BlockType } from "./blocks";
import recipesData from "../data/recipes.json";

export interface Recipe {
  id: string;
  result: { type: BlockType; count: number };
  /** Rows of legend characters; a space is an empty cell. */
  pattern: string[];
  legend: Record<string, BlockType>;
}

const isBlockType = (value: unknown): value is BlockType =>
  typeof value === "number" && Object.hasOwn(BLOCKS, value);

/** Validates raw recipe JSON so a bad entry fails loudly instead of crafting junk. */
export function parseRecipes(raw: unknown): Recipe[] {
  if (!Array.isArray(raw)) throw new Error("Recipes must be an array.");
  return raw.map((entry, index) => {
    const { id, result, pattern, legend } = entry ?? {};
    const where = `Recipe ${typeof id === "string" ? id : index}`;
    if (typeof id !== "string") throw new Error(`${where}: missing id.`);
    if (!isBlockType(result?.type) || !Number.isInteger(result?.count) || result.count < 1) {
      throw new Error(`${where}: invalid result.`);
    }
    if (!Array.isArray(pattern) || pattern.length === 0 || !pattern.every((row) => typeof row === "string")) {
      throw new Error(`${where}: invalid pattern.`);
    }
    const typedLegend: Record<string, BlockType> = {};
    for (const [key, value] of Object.entries(legend ?? {})) {
      if (!isBlockType(value)) throw new Error(`${where}: legend ${key} is not a block.`);
      typedLegend[key] = value;
    }
    for (const char of pattern.join("")) {
      if (char !== " " && !(char in typedLegend)) {
        throw new Error(`${where}: pattern uses undefined key ${char}.`);
      }
    }
    return { id, result: { type: result.type, count: result.count }, pattern, legend: typedLegend };
  });
}

export const RECIPES: Recipe[] = parseRecipes(recipesData);

/** Width of a recipe pattern (its longest row). */
export const patternWidth = (recipe: Recipe) =>
  Math.max(...recipe.pattern.map((row) => row.length));
