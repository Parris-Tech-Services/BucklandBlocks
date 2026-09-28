import React, { useEffect, useMemo } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { BlockType, getBlockData } from '../engine/blocks';
import { useGame } from '../lib/stores/useGame';
import { quickMoveSlot } from '../engine/inventory';
import recipesData from '../data/recipes.json';

interface InventoryProps {
  onClose: () => void;
}

interface Recipe {
  id: string;
  result: { type: BlockType; count: number };
  pattern: string[];
  legend: Record<string, BlockType>;
}

type ItemGrid = 'inventory' | 'crafting';
const recipes = recipesData as unknown as Recipe[];
const armorLabels = ['Head', 'Chest', 'Legs', 'Feet'];

const Inventory: React.FC<InventoryProps> = ({ onClose }) => {
  const {
    inventory,
    inventoryCounts,
    selectedSlot,
    cursorItem,
    craftingGrid,
    craftingCounts,
    armor,
  } = useGame();

  const craftResult = useMemo(() => {
    let minRow = 2;
    let maxRow = -1;
    let minCol = 2;
    let maxCol = -1;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        if (craftingGrid[row * 2 + col] !== null) {
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
        }
      }
    }
    if (maxRow < 0) return null;

    const height = maxRow - minRow + 1;
    const width = maxCol - minCol + 1;
    return recipes.find((recipe) => {
      if (recipe.pattern.length !== height) return false;
      if (Math.max(...recipe.pattern.map((row) => row.length)) !== width) return false;
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const symbol = recipe.pattern[row][col] || ' ';
          const expected = symbol === ' ' ? null : recipe.legend[symbol];
          if (craftingGrid[(minRow + row) * 2 + minCol + col] !== expected) return false;
        }
      }
      return true;
    }) ?? null;
  }, [craftingGrid]);

  const getGrid = (state: ReturnType<typeof useGame.getState>, grid: ItemGrid) =>
    grid === 'inventory'
      ? { items: state.inventory, counts: state.inventoryCounts }
      : { items: state.craftingGrid, counts: state.craftingCounts };

  const writeGrid = (
    grid: ItemGrid,
    items: (BlockType | null)[],
    counts: number[],
  ) => grid === 'inventory'
    ? { inventory: items, inventoryCounts: counts }
    : { craftingGrid: items, craftingCounts: counts };

  const handleSlotClick = (event: React.MouseEvent, grid: ItemGrid, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    const state = useGame.getState();
    const current = getGrid(state, grid);
    const items = [...current.items];
    const counts = [...current.counts];
    let nextCursor = state.cursorItem ? { ...state.cursorItem } : null;
    const type = items[index];
    const count = counts[index];
    const rightClick = event.button === 2 || event.type === 'contextmenu';

    // Shift-click with an empty cursor quick-moves the stack between the
    // hotbar and the main inventory.
    if (!nextCursor && event.shiftKey && grid === 'inventory' && type !== null) {
      const moved = quickMoveSlot(items, counts, index, getBlockData(type)?.maxStack ?? 64);
      if (moved.moved > 0) useGame.setState(writeGrid('inventory', moved.items, moved.counts));
      return;
    }

    if (nextCursor) {
      if (type === null) {
        const moved = rightClick ? 1 : nextCursor.count;
        items[index] = nextCursor.type;
        counts[index] = moved;
        nextCursor.count -= moved;
      } else if (type === nextCursor.type) {
        const limit = getBlockData(type)?.maxStack ?? 64;
        const moved = Math.min(rightClick ? 1 : nextCursor.count, limit - count);
        if (moved > 0) {
          counts[index] += moved;
          nextCursor.count -= moved;
        }
      } else if (!rightClick) {
        items[index] = nextCursor.type;
        counts[index] = nextCursor.count;
        nextCursor = { type, count };
      }
      if (nextCursor && nextCursor.count <= 0) nextCursor = null;
    } else if (type !== null) {
      const moved = rightClick && count > 1 ? Math.ceil(count / 2) : count;
      nextCursor = { type, count: moved };
      counts[index] -= moved;
      if (counts[index] <= 0) {
        items[index] = null;
        counts[index] = 0;
      }
    }

    useGame.setState({ ...writeGrid(grid, items, counts), cursorItem: nextCursor });
  };

  const handleDragStart = (event: React.DragEvent, grid: ItemGrid, index: number) => {
    const state = useGame.getState();
    const { items } = getGrid(state, grid);
    if (items[index] === null) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', `${grid}:${index}`);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (event: React.DragEvent, targetGrid: ItemGrid, targetIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    const [sourceGrid, sourceIndexText] = event.dataTransfer.getData('text/plain').split(':');
    const sourceIndex = Number(sourceIndexText);
    if ((sourceGrid !== 'inventory' && sourceGrid !== 'crafting') || !Number.isInteger(sourceIndex)) return;
    if (sourceGrid === targetGrid && sourceIndex === targetIndex) return;

    const state = useGame.getState();
    const source = getGrid(state, sourceGrid);
    const target = getGrid(state, targetGrid);
    const sourceItems = [...source.items];
    const sourceCounts = [...source.counts];
    const targetItems = sourceGrid === targetGrid ? sourceItems : [...target.items];
    const targetCounts = sourceGrid === targetGrid ? sourceCounts : [...target.counts];
    const sourceType = sourceItems[sourceIndex];
    const targetType = targetItems[targetIndex];
    if (sourceType === null) return;

    if (targetType === null) {
      targetItems[targetIndex] = sourceType;
      targetCounts[targetIndex] = sourceCounts[sourceIndex];
      sourceItems[sourceIndex] = null;
      sourceCounts[sourceIndex] = 0;
    } else if (targetType === sourceType) {
      const maxStack = getBlockData(sourceType)?.maxStack ?? 64;
      const moved = Math.min(sourceCounts[sourceIndex], maxStack - targetCounts[targetIndex]);
      if (moved <= 0) return;
      targetCounts[targetIndex] += moved;
      sourceCounts[sourceIndex] -= moved;
      if (sourceCounts[sourceIndex] === 0) sourceItems[sourceIndex] = null;
    } else {
      [sourceItems[sourceIndex], targetItems[targetIndex]] = [targetType, sourceType];
      [sourceCounts[sourceIndex], targetCounts[targetIndex]] = [targetCounts[targetIndex], sourceCounts[sourceIndex]];
    }

    if (sourceGrid === targetGrid) {
      useGame.setState(writeGrid(sourceGrid, sourceItems, sourceCounts));
    } else {
      useGame.setState({
        ...writeGrid(sourceGrid, sourceItems, sourceCounts),
        ...writeGrid(targetGrid, targetItems, targetCounts),
      });
    }
  };

  const takeCraftResult = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!craftResult) return;
    const state = useGame.getState();
    const nextCursor = state.cursorItem ? { ...state.cursorItem } : null;
    if (nextCursor && nextCursor.type !== craftResult.result.type) return;
    const maxStack = getBlockData(craftResult.result.type)?.maxStack ?? 64;
    if (nextCursor && nextCursor.count + craftResult.result.count > maxStack) return;

    const nextGrid = [...state.craftingGrid];
    const nextCounts = [...state.craftingCounts];
    for (let index = 0; index < nextGrid.length; index++) {
      if (nextGrid[index] === null) continue;
      nextCounts[index]--;
      if (nextCounts[index] <= 0) {
        nextGrid[index] = null;
        nextCounts[index] = 0;
      }
    }
    useGame.setState({
      craftingGrid: nextGrid,
      craftingCounts: nextCounts,
      cursorItem: nextCursor
        ? { ...nextCursor, count: nextCursor.count + craftResult.result.count }
        : { type: craftResult.result.type, count: craftResult.result.count },
    });
  };

  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    document.addEventListener('contextmenu', preventContextMenu);
    return () => document.removeEventListener('contextmenu', preventContextMenu);
  }, []);

  const renderSlot = (grid: ItemGrid, index: number, isHotbar = false) => {
    const isInventory = grid === 'inventory';
    const type = isInventory ? inventory[index] : craftingGrid[index];
    const count = isInventory ? inventoryCounts[index] : craftingCounts[index];
    const selected = isHotbar && index === selectedSlot;
    const label = type === null ? 'Empty slot' : `${getBlockData(type)?.name ?? 'Unknown item'} × ${count}`;
    return (
      <button
        type="button"
        key={`${grid}-${index}`}
        aria-label={label}
        aria-grabbed={type !== null}
        draggable={type !== null}
        title={label}
        className={`relative flex h-12 w-12 cursor-pointer flex-col items-center justify-center border-2 ${selected ? 'border-yellow-400' : 'border-gray-500'} bg-gray-700 hover:bg-gray-600`}
        onClick={(event) => handleSlotClick(event, grid, index)}
        onContextMenu={(event) => handleSlotClick(event, grid, index)}
        onDragStart={(event) => handleDragStart(event, grid, index)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, grid, index)}
      >
        {type !== null && type !== BlockType.AIR && <>
          <span className="px-0.5 text-center text-[8px] font-bold leading-tight text-white">{getBlockData(type)?.name.slice(0, 8) ?? 'Unknown'}</span>
          {count > 1 && <span className="absolute bottom-0 right-1 font-mono text-[10px] text-white">{count}</span>}
        </>}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 pointer-events-auto">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-lg border-2 border-gray-400 bg-gray-800 p-4 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="mb-4 flex items-center justify-between border-b border-gray-600 pb-3">
          <h2 className="text-xl font-bold">Inventory</h2>
          <button type="button" onClick={onClose} className="text-gray-300 hover:text-white" aria-label="Close inventory"><X size={22} /></button>
        </header>

        <div className="mb-4 grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <section aria-labelledby="equipment-title" className="rounded border border-gray-600 bg-gray-900/40 p-3">
            <h3 id="equipment-title" className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-300">Equipment</h3>
            <div className="flex items-center justify-center gap-4">
              <div aria-label="Player preview" className="relative h-32 w-24 rounded border border-gray-600 bg-gradient-to-b from-sky-900/60 to-gray-900">
                <div className="absolute left-8 top-3 h-8 w-8 rounded-full bg-orange-200" />
                <div className="absolute left-5 top-11 h-14 w-14 rounded bg-blue-700" />
                <div className="absolute left-2 top-12 h-12 w-3 rounded bg-blue-900" />
                <div className="absolute right-2 top-12 h-12 w-3 rounded bg-blue-900" />
              </div>
              <div className="grid grid-cols-2 gap-1">
                {armorLabels.map((label, index) => (
                  <div key={label} role="img" aria-label={`${label} equipment slot${armor[index] === null ? ', empty' : ''}`} title={`${label} equipment slot${armor[index] === null ? ' (no armor items are available yet)' : ''}`} className="flex h-12 w-12 items-center justify-center border-2 border-gray-500 bg-gray-700 text-[9px] text-gray-400">
                    {armor[index] === null ? label : getBlockData(armor[index]!)?.name.slice(0, 8)}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-500">Armor equipment slots · armor items are not implemented yet</p>
          </section>

          <section aria-labelledby="crafting-title" className="rounded border border-gray-600 bg-gray-900/40 p-3">
            <h3 id="crafting-title" className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-300">Crafting · 2 × 2</h3>
            <div className="flex items-center justify-center gap-3">
              <div className="grid grid-cols-2 gap-1" aria-label="2 by 2 crafting grid">
                {Array.from({ length: 4 }, (_, index) => renderSlot('crafting', index))}
              </div>
              <ArrowRight aria-hidden="true" className="text-gray-400" />
              <button type="button" onClick={takeCraftResult} disabled={!craftResult} aria-label={craftResult ? `Craft ${getBlockData(craftResult.result.type)?.name}` : 'Crafting result'} title={craftResult ? getBlockData(craftResult.result.type)?.name : 'No matching recipe'} className="relative h-12 w-12 border-2 border-yellow-500 bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40">
                {craftResult && <span className="text-[8px] font-bold">{getBlockData(craftResult.result.type)?.name.slice(0, 8)}</span>}
                {craftResult && craftResult.result.count > 1 && <span className="absolute bottom-0 right-1 text-[10px]">{craftResult.result.count}</span>}
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-400">Click a slot or drag items here; take the result to craft.</p>
          </section>
        </div>

        <section aria-labelledby="inventory-slots-title" className="mb-4">
          <h3 id="inventory-slots-title" className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-300">Inventory</h3>
          <div className="grid grid-cols-9 gap-1">{Array.from({ length: 27 }, (_, index) => renderSlot('inventory', index + 9))}</div>
        </section>

        <section aria-labelledby="hotbar-title" className="mb-2 border-t border-gray-600 pt-3">
          <h3 id="hotbar-title" className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-300">Hotbar</h3>
          <div className="grid grid-cols-9 gap-1">{Array.from({ length: 9 }, (_, index) => renderSlot('inventory', index, true))}</div>
        </section>

        {cursorItem && <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded border-2 border-white bg-gray-700 px-3 py-2 text-xs text-white" aria-live="polite">Holding: {getBlockData(cursorItem.type)?.name ?? 'Unknown item'} × {cursorItem.count}</div>}
        <p className="mt-3 text-center text-xs text-gray-400">Click or drag items between slots · Right-click to split · Press E or Esc to close</p>
      </div>
    </div>
  );
};

export default Inventory;
