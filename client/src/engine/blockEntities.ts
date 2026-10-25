import { BlockType } from "./blocks";
import type { BlockEntity } from "../lib/stores/useGame";
import type { Menu } from "./session";

/** Blocks that open a screen on right-click instead of having a block placed against them. */
const INTERACTIVE_BLOCKS: Partial<Record<BlockType, Exclude<Menu, null>>> = {
  [BlockType.CRAFTING_TABLE]: "crafting_table",
  [BlockType.FURNACE]: "furnace",
};

export function interactionMenuFor(blockType: BlockType): Exclude<Menu, null> | null {
  return INTERACTIVE_BLOCKS[blockType] ?? null;
}

/** Block entities are keyed by the block's integer world position. */
export function blockEntityKey(x: number, y: number, z: number): string {
  return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
}

/** A fresh entity for an interactive block: three empty slots (furnace input, fuel, output). */
export function newBlockEntity(key: string, type: BlockType): BlockEntity {
  return { id: key, type, inventory: [null, null, null], counts: [0, 0, 0], progress: 0 };
}

/** The items held inside an entity, so breaking its block can hand them back instead of losing them. */
export function blockEntityContents(entity: BlockEntity | undefined): { type: BlockType; count: number }[] {
  if (!entity) return [];
  return entity.inventory.flatMap((type, index) =>
    type !== null && (entity.counts[index] ?? 0) > 0 ? [{ type, count: entity.counts[index] }] : [],
  );
}

export type RightClickAction =
  | { kind: "open"; menu: Exclude<Menu, null>; entityKey: string; createEntity: boolean }
  | { kind: "place" }
  | { kind: "none" };

/**
 * What a right-click on the targeted block should do: open a crafting table
 * or furnace (creating a furnace's entity if it has none yet, e.g. one placed
 * before entities were saved), otherwise place the held block against it.
 */
export function resolveRightClick(
  target: { blockType: BlockType; x: number; y: number; z: number } | null,
  hasEntity: (key: string) => boolean,
): RightClickAction {
  if (!target) return { kind: "none" };
  const menu = interactionMenuFor(target.blockType);
  if (!menu) return { kind: "place" };
  const entityKey = blockEntityKey(target.x, target.y, target.z);
  return { kind: "open", menu, entityKey, createEntity: menu === "furnace" && !hasEntity(entityKey) };
}
