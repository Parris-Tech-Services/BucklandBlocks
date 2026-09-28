import React, { useEffect, useState } from 'react';
import { X, Package, Box } from 'lucide-react';
import { BlockType, getBlockData, BLOCKS } from '../engine/blocks';
import { useGame } from '../lib/stores/useGame';
import { applySlotInteraction } from '../engine/inventoryInteraction';

interface InventoryProps {
  onClose: () => void;
  onOpenCrafting: () => void;
}

const EQUIPMENT_LABELS = ["Head", "Chest", "Legs", "Feet"] as const;

const Inventory: React.FC<InventoryProps> = ({ onClose, onOpenCrafting }) => {
  const [tab, setTab] = useState<'survival' | 'creative'>('survival');
  const { 
    inventory, inventoryCounts, selectedSlot,
    cursorItem, setCursorItem, armor
  } = useGame();

  
  
  
  const handleCreativeClick = (e: React.MouseEvent, type: BlockType) => {
    e.preventDefault();
    e.stopPropagation();
    const data = getBlockData(type);
    if (!data) return;
    
    useGame.setState({ cursorItem: { type, count: data.maxStack ?? 1 } });
  };

  const handleSort = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const state = useGame.getState();
    const newInventory = [...state.inventory];
    const newCounts = [...state.inventoryCounts];
    
    // Sort main inventory (slots 9 to 35)
    // 1. Group identical items
    for (let i = 9; i < 36; i++) {
      const type = newInventory[i];
      if (type === null) continue;
      const maxStack = getBlockData(type)?.maxStack ?? 64;
      for (let j = i + 1; j < 36; j++) {
        if (newInventory[j] === newInventory[i]) {
          const space = maxStack - newCounts[i];
          const toMove = Math.min(space, newCounts[j]);
          if (toMove > 0) {
            newCounts[i] += toMove;
            newCounts[j] -= toMove;
            if (newCounts[j] === 0) newInventory[j] = null;
          }
        }
      }
    }
    
    // 2. Extract and sort non-empty slots by ID
    const items: { type: BlockType; count: number }[] = [];
    for (let i = 9; i < 36; i++) {
      const type = newInventory[i];
      if (type !== null) {
        items.push({ type, count: newCounts[i] });
        newInventory[i] = null;
        newCounts[i] = 0;
      }
    }
    items.sort((a, b) => a.type - b.type);
    
    // 3. Place them back
    for (let i = 0; i < items.length; i++) {
      newInventory[9 + i] = items[i].type;
      newCounts[9 + i] = items[i].count;
    }
    
    useGame.setState({ inventory: newInventory, inventoryCounts: newCounts });
  };

  const handleDropOutside = (e: React.MouseEvent) => {
    e.preventDefault();
    if (cursorItem) {
      // Just delete the item for now (dropping into the world requires entity physics)
      setCursorItem(null);
    }
  };

  const handleSlotClick = (e: React.MouseEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const state = useGame.getState();
    const next = applySlotInteraction(
      {
        inventory: state.inventory,
        counts: state.inventoryCounts,
        cursor: state.cursorItem,
      },
      {
        slotIndex,
        rightClick: e.type === 'contextmenu' || e.button === 2,
        shiftClick: e.shiftKey,
      },
    );

    if (!next) return;
    useGame.setState({
      inventory: next.inventory,
      inventoryCounts: next.counts,
      cursorItem: next.cursor,
    });
  };

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const renderSlot = (slotIndex: number, isHotbar: boolean = false) => {
    const blockType = inventory[slotIndex];
    const count = inventoryCounts[slotIndex];
    const isSelected = isHotbar && slotIndex === selectedSlot;
    
    return (
      <div
          key={slotIndex}
          title={blockType !== null ? getBlockData(blockType)?.name : undefined}
        className={`w-12 h-12 border-2 ${isSelected ? 'border-yellow-400' : 'border-gray-500'} bg-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600`}
        onClick={(e) => handleSlotClick(e, slotIndex)}
        onContextMenu={(e) => handleSlotClick(e, slotIndex)}
      >
        {blockType !== null && blockType !== BlockType.AIR && (
          <>
            <div className="text-white text-[8px] font-bold text-center">
              {getBlockData(blockType)?.name.slice(0, 8) || 'Unknown'}
            </div>
            {count > 0 && (
              <div className="text-white text-[10px] font-mono mt-1">{count}</div>
            )}
          </>
        )}
      </div>
    );
  };

  const creativeItems = Object.values(BLOCKS).filter(
    (block) => block.id !== BlockType.AIR && block.id !== BlockType.SKY,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 pointer-events-auto">
      <div className="w-full max-w-[760px] max-h-[94vh] overflow-y-auto rounded-lg border-2 border-gray-400 bg-gray-800 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Inventory</h2>
            <p className="text-xs text-gray-400">
              Equipment and crafting are available from the survival inventory.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 text-white hover:bg-gray-700 hover:text-gray-200"
            aria-label="Close inventory"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 flex gap-2 border-b border-gray-600 pb-3">
          <button
            type="button"
            onClick={() => setTab('survival')}
            className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold ${
              tab === 'survival'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Package size={16} />
            Survival
          </button>
          <button
            type="button"
            onClick={() => setTab('creative')}
            className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold ${
              tab === 'creative'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Box size={16} />
            Creative
          </button>
        </div>

        {tab === 'survival' ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1.35fr]">
              <section className="rounded border border-gray-600 bg-gray-900/50 p-3">
                <h3 className="mb-2 text-sm font-bold text-white">Equipment</h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-2">
                  {EQUIPMENT_LABELS.map((label, index) => {
                    const equipped = armor[index];
                    return (
                      <div key={label} className="min-w-0">
                        <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">
                          {label}
                        </div>
                        <div className="flex aspect-square min-h-12 items-center justify-center rounded border-2 border-gray-600 bg-gray-700 p-1 text-center text-[9px] text-gray-300">
                          {equipped === null ? 'Empty' : getBlockData(equipped)?.name ?? 'Item'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
                  Equipment slots are restored visually. Equippable armour items are not implemented in the game data yet.
                </p>
              </section>

              <section className="rounded border border-gray-600 bg-gray-900/50 p-3">
                <h3 className="mb-2 text-sm font-bold text-white">Crafting</h3>
                <div className="flex items-center gap-3">
                  <div className="grid grid-cols-2 gap-1" aria-hidden="true">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div
                        key={index}
                        className="h-10 w-10 rounded border-2 border-gray-600 bg-gray-700"
                      />
                    ))}
                  </div>
                  <span className="text-xl text-gray-500">→</span>
                  <div className="h-11 w-11 rounded border-2 border-gray-600 bg-gray-700" />
                  <button
                    type="button"
                    onClick={onOpenCrafting}
                    className="ml-auto rounded bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-500"
                  >
                    Open 2×2 Crafting
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                  Use a placed crafting table for 3×3 recipes.
                </p>
              </section>
            </div>

            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">Backpack</h3>
              <button
                type="button"
                onClick={handleSort}
                className="rounded border border-gray-600 bg-gray-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-600"
              >
                Sort inventory
              </button>
            </div>

            <div className="mb-4 grid grid-cols-9 gap-1">
              {Array.from({ length: 27 }, (_, i) => renderSlot(i + 9))}
            </div>

            <div className="border-t border-gray-600 pt-3">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Hotbar</h3>
              <div className="grid grid-cols-9 gap-1">
                {Array.from({ length: 9 }, (_, i) => renderSlot(i, true))}
              </div>
            </div>
          </>
        ) : (
          <section>
            <h3 className="mb-2 text-sm font-bold text-white">Creative catalogue</h3>
            <p className="mb-3 text-xs text-gray-400">
              Click an item to place a full stack on the cursor.
            </p>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
              {creativeItems.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  title={block.name}
                  onClick={(event) => handleCreativeClick(event, block.id)}
                  className="flex aspect-square min-w-0 flex-col items-center justify-center rounded border-2 border-gray-600 bg-gray-700 p-1 text-white hover:border-gray-400 hover:bg-gray-600"
                >
                  <span className="text-center text-[8px] font-bold leading-tight">
                    {block.name.slice(0, 10)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {cursorItem && (
          <div
            className="fixed pointer-events-none z-[100]"
            style={{ left: '50%', top: '10%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="flex h-12 w-12 flex-col items-center justify-center border-2 border-white bg-gray-700 opacity-90">
              <div className="text-center text-[8px] font-bold text-white">
                {getBlockData(cursorItem.type)?.name.slice(0, 8) || 'Unknown'}
              </div>
              <div className="mt-1 font-mono text-[10px] text-white">{cursorItem.count}</div>
            </div>
          </div>
        )}

        <div className="mt-4 text-center text-xs text-gray-400">
          Left Click: Move Stack | Right Click: Split/Place One<br />
          Press E or ESC to close
        </div>
      </div>
    </div>
  );;
};

export default Inventory;
