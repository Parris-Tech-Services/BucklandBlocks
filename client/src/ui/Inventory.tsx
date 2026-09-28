import React, { useEffect, useState } from 'react';
import { X, Package, Box } from 'lucide-react';
import { BlockType, getBlockData, BLOCKS } from '../engine/blocks';
import { useGame } from '../lib/stores/useGame';
import { applySlotInteraction } from '../engine/inventoryInteraction';

interface InventoryProps {
  onClose: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'survival' | 'creative'>('survival');
  const { 
    inventory, inventoryCounts, selectedSlot, setSelectedSlot,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-800 border-2 border-gray-400 p-4 rounded-lg min-w-[400px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-bold">Inventory</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-9 gap-1 mb-2">
            {Array.from({ length: 27 }, (_, i) => renderSlot(i + 9))}
          </div>
        </div>

        <div className="border-t border-gray-600 pt-2 mb-4">
          <div className="grid grid-cols-9 gap-1">
            {Array.from({ length: 9 }, (_, i) => renderSlot(i, true))}
          </div>
        </div>

        {cursorItem && (
          <div className="fixed pointer-events-none z-[100]" style={{ left: '50%', top: '10%', transform: 'translate(-50%, -50%)' }}>
            <div className="w-12 h-12 border-2 border-white bg-gray-700 flex flex-col items-center justify-center opacity-80">
              <div className="text-white text-[8px] font-bold text-center">
                {getBlockData(cursorItem.type)?.name.slice(0, 8) || 'Unknown'}
              </div>
              <div className="text-white text-[10px] font-mono mt-1">{cursorItem.count}</div>
            </div>
          </div>
        )}

        <div className="mt-4 text-center text-gray-400 text-xs">
          Left Click: Move Stack | Right Click: Split/Place One<br/>
          Press E or ESC to close
        </div>
      </div>
    </div>
  );
};

export default Inventory;
