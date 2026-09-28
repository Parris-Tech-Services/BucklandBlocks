import React, { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { BlockType, getBlockData } from "../engine/blocks";
import { useGame } from "../lib/stores/useGame";
import recipesData from "../data/recipes.json";

interface InventoryProps { onClose: () => void; }
interface Recipe {
  id: string;
  result: { type: BlockType; count: number };
  pattern: string[];
  legend: Record<string, BlockType>;
}

const recipes = recipesData as unknown as Recipe[];
const armorSlots = ["helmet", "chestplate", "leggings", "boots"] as const;
const armorNames = ["Helmet", "Chestplate", "Leggings", "Boots"];
const creativeArmor = [BlockType.LEATHER_HELMET, BlockType.LEATHER_CHESTPLATE, BlockType.LEATHER_LEGGINGS, BlockType.LEATHER_BOOTS];

const Inventory: React.FC<InventoryProps> = ({ onClose }) => {
  const { inventory, inventoryCounts, selectedSlot, cursorItem, setCursorItem, armor, craftingGrid, craftingCounts } = useGame();

  const craftResult = useMemo(() => {
    let minRow = 2, maxRow = -1, minCol = 2, maxCol = -1;
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      if (craftingGrid[row * 2 + col] !== null) {
        minRow = Math.min(minRow, row); maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col); maxCol = Math.max(maxCol, col);
      }
    }
    if (maxRow < 0) return null;
    const height = maxRow - minRow + 1;
    const width = maxCol - minCol + 1;
    return recipes.find((recipe) => {
      if (recipe.pattern.length !== height || Math.max(...recipe.pattern.map((row) => row.length)) !== width) return false;
      for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
        const char = recipe.pattern[row][col] || " ";
        const expected = char === " " ? null : recipe.legend[char];
        if (craftingGrid[(minRow + row) * 2 + minCol + col] !== expected) return false;
      }
      return true;
    }) ?? null;
  }, [craftingGrid]);

  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", preventContextMenu);
    return () => document.removeEventListener("contextmenu", preventContextMenu);
  }, []);

  const handleInventorySlot = (event: React.MouseEvent, slotIndex: number) => {
    event.preventDefault(); event.stopPropagation();
    const state = useGame.getState();
    const slots = [...state.inventory]; const counts = [...state.inventoryCounts];
    let nextCursor = state.cursorItem ? { ...state.cursorItem } : null;
    const type = slots[slotIndex]; const count = counts[slotIndex];
    const rightClick = event.button === 2 || event.type === "contextmenu";
    if (nextCursor) {
      if (type === null) {
        const moved = rightClick ? 1 : nextCursor.count;
        slots[slotIndex] = nextCursor.type; counts[slotIndex] = moved; nextCursor.count -= moved;
      } else if (type === nextCursor.type) {
        const space = (getBlockData(type)?.maxStack ?? 64) - count;
        const moved = rightClick ? 1 : Math.min(space, nextCursor.count);
        if (moved > 0) { counts[slotIndex] += moved; nextCursor.count -= moved; }
      } else if (!rightClick) {
        slots[slotIndex] = nextCursor.type; counts[slotIndex] = nextCursor.count; nextCursor = { type, count };
      }
      if (nextCursor && nextCursor.count <= 0) nextCursor = null;
    } else if (type !== null) {
      const moved = rightClick && count > 1 ? Math.ceil(count / 2) : count;
      nextCursor = { type, count: moved }; counts[slotIndex] -= moved;
      if (counts[slotIndex] <= 0) { slots[slotIndex] = null; counts[slotIndex] = 0; }
    }
    useGame.setState({ inventory: slots, inventoryCounts: counts, cursorItem: nextCursor });
  };

  const handleArmorSlot = (event: React.MouseEvent, armorIndex: number) => {
    event.preventDefault(); event.stopPropagation();
    const state = useGame.getState(); const nextArmor = [...state.armor];
    const equipped = nextArmor[armorIndex]; let nextCursor = state.cursorItem ? { ...state.cursorItem } : null;
    const rightClick = event.button === 2 || event.type === "contextmenu";
    const accepts = (type: BlockType | null) => type !== null && getBlockData(type)?.armorSlot === armorSlots[armorIndex];
    if (nextCursor) {
      if (!accepts(nextCursor.type)) return;
      if (equipped !== null && !rightClick) nextCursor = { type: equipped, count: 1 };
      else if (equipped !== null) return;
      nextArmor[armorIndex] = state.cursorItem!.type; nextCursor = equipped !== null ? { type: equipped, count: 1 } : null;
    } else if (equipped !== null) {
      nextCursor = { type: equipped, count: 1 }; nextArmor[armorIndex] = null;
    }
    useGame.setState({ armor: nextArmor, cursorItem: nextCursor });
  };

  const handleCraftingSlot = (event: React.MouseEvent, slotIndex: number) => {
    event.preventDefault(); event.stopPropagation();
    const state = useGame.getState(); const grid = [...state.craftingGrid]; const counts = [...state.craftingCounts];
    let nextCursor = state.cursorItem ? { ...state.cursorItem } : null;
    const type = grid[slotIndex]; const count = counts[slotIndex]; const rightClick = event.button === 2 || event.type === "contextmenu";
    if (nextCursor) {
      if (type === null) { const moved = rightClick ? 1 : nextCursor.count; grid[slotIndex] = nextCursor.type; counts[slotIndex] = moved; nextCursor.count -= moved; }
      else if (type === nextCursor.type) { const space = (getBlockData(type)?.maxStack ?? 64) - count; const moved = rightClick ? 1 : Math.min(space, nextCursor.count); if (moved > 0) { counts[slotIndex] += moved; nextCursor.count -= moved; } }
      else if (!rightClick) { grid[slotIndex] = nextCursor.type; counts[slotIndex] = nextCursor.count; nextCursor = { type, count }; }
      if (nextCursor && nextCursor.count <= 0) nextCursor = null;
    } else if (type !== null) { const moved = rightClick && count > 1 ? Math.ceil(count / 2) : count; nextCursor = { type, count: moved }; counts[slotIndex] -= moved; if (counts[slotIndex] <= 0) { grid[slotIndex] = null; counts[slotIndex] = 0; } }
    useGame.setState({ craftingGrid: grid, craftingCounts: counts, cursorItem: nextCursor });
  };

  const takeCraftResult = () => {
    if (!craftResult) return;
    const state = useGame.getState();
    if (state.cursorItem && state.cursorItem.type !== craftResult.result.type) return;
    if (state.cursorItem && state.cursorItem.count + craftResult.result.count > (getBlockData(craftResult.result.type)?.maxStack ?? 64)) return;
    const grid = [...state.craftingGrid]; const counts = [...state.craftingCounts];
    for (let i = 0; i < grid.length; i++) if (grid[i] !== null) { counts[i]--; if (counts[i] <= 0) { counts[i] = 0; grid[i] = null; } }
    const nextCursor = state.cursorItem ? { ...state.cursorItem, count: state.cursorItem.count + craftResult.result.count } : { type: craftResult.result.type, count: craftResult.result.count };
    useGame.setState({ craftingGrid: grid, craftingCounts: counts, cursorItem: nextCursor });
  };

  const renderItem = (type: BlockType | null, count = 0) => type === null ? null : <><img src={getBlockData(type)?.texture} alt="" className="h-full w-full object-cover p-1 pixelated" />{count > 1 && <span className="absolute bottom-0 right-1 text-xs font-bold text-white" style={{ textShadow: "1px 1px 0 #000" }}>{count}</span>}</>;
  const renderSlot = (slotIndex: number, isHotbar = false) => <div key={slotIndex} title={inventory[slotIndex] !== null ? getBlockData(inventory[slotIndex])?.name : "Empty"} className={`relative h-12 w-12 cursor-pointer border-2 ${isHotbar && slotIndex === selectedSlot ? "border-yellow-400" : "border-gray-500"} bg-gray-700 hover:bg-gray-600`} onClick={(event) => handleInventorySlot(event, slotIndex)} onContextMenu={(event) => handleInventorySlot(event, slotIndex)}>{renderItem(inventory[slotIndex], inventoryCounts[slotIndex])}</div>;
  const renderCraftSlot = (slotIndex: number) => <div key={slotIndex} className="relative h-12 w-12 cursor-pointer border-2 border-gray-500 bg-gray-700 hover:bg-gray-600" onClick={(event) => handleCraftingSlot(event, slotIndex)} onContextMenu={(event) => handleCraftingSlot(event, slotIndex)}>{renderItem(craftingGrid[slotIndex], craftingCounts[slotIndex])}</div>;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 pointer-events-auto" onClick={() => cursorItem && setCursorItem(null)}>
    <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-lg border-2 border-gray-400 bg-gray-800 p-4 text-white shadow-2xl" onClick={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}>
      <div className="mb-3 flex items-center justify-between border-b border-gray-600 pb-2"><div><h2 className="text-xl font-bold">Inventory</h2><p className="text-xs text-gray-400">E: close · Right-click: split or place one</p></div><button type="button" onClick={onClose} className="text-gray-300 hover:text-white" aria-label="Close inventory"><X size={22} /></button></div>
      <div className="mb-4 grid grid-cols-[minmax(150px,1fr)_minmax(220px,1.5fr)] gap-5 rounded border border-gray-600 bg-gray-900/40 p-4">
        <div className="flex flex-col items-center justify-center gap-2"><div className="text-xs uppercase tracking-widest text-gray-400">Player</div><div className="relative flex h-32 w-24 items-center justify-center rounded border border-gray-600 bg-gradient-to-b from-sky-900/60 to-gray-900"><div className="h-12 w-10 rounded-t-full bg-orange-200" /><div className="absolute top-14 h-16 w-16 rounded bg-blue-700" /><div className="absolute top-[4.5rem] h-16 w-5 -translate-x-6 rounded bg-blue-900" /><div className="absolute top-[4.5rem] h-16 w-5 translate-x-6 rounded bg-blue-900" /></div></div>
        <div className="flex items-center justify-center gap-4"><div className="grid gap-1">{armor.map((type, index) => <div key={armorSlots[index]} title={`Armor: ${armorNames[index]}`} onClick={(event) => handleArmorSlot(event, index)} onContextMenu={(event) => handleArmorSlot(event, index)} className="relative flex h-12 w-12 cursor-pointer items-center justify-center border-2 border-gray-500 bg-gray-700 text-[9px] text-gray-400 hover:bg-gray-600">{renderItem(type, 1)}{type === null && armorNames[index]}</div>)}</div><div className="text-3xl text-gray-500">+</div><div className="flex items-center gap-2"><div className="grid grid-cols-2 gap-1">{[0, 1, 2, 3].map(renderCraftSlot)}</div><span className="text-3xl text-gray-500">→</span><div onClick={takeCraftResult} className="relative h-14 w-14 cursor-pointer border-2 border-yellow-500 bg-gray-700 hover:bg-gray-600">{craftResult && renderItem(craftResult.result.type, craftResult.result.count)}</div></div></div>
      </div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Inventory</div><div className="mb-4 grid grid-cols-9 gap-1">{Array.from({ length: 27 }, (_, i) => renderSlot(i + 9))}</div>
      <div className="mb-4 border-t border-gray-600 pt-3"><div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Hotbar</div><div className="grid grid-cols-9 gap-1">{Array.from({ length: 9 }, (_, i) => renderSlot(i, true))}</div></div>
      <details className="rounded border border-gray-700 bg-gray-900/40 p-2 text-xs"><summary className="cursor-pointer font-bold text-gray-300">Creative test items</summary><div className="mt-2 flex flex-wrap gap-2">{creativeArmor.map((type) => <button type="button" key={type} onClick={() => setCursorItem({ type, count: getBlockData(type)?.maxStack ?? 1 })} className="rounded border border-gray-600 bg-gray-700 px-2 py-1 hover:bg-gray-600">Give {getBlockData(type)?.name}</button>)}</div></details>
      {cursorItem && <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded border-2 border-white bg-gray-700 p-1 text-xs">Holding: {getBlockData(cursorItem.type)?.name} × {cursorItem.count}</div>}
    </div>
  </div>;
};

export default Inventory;
