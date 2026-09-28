import React, { useEffect, useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { BlockType, getBlockData } from '../engine/blocks';
import { useGame } from '../lib/stores/useGame';
import ItemIcon from './ItemIcon';
import recipesData from '../data/recipes.json';

interface CraftingProps {
  onClose: () => void;
}

interface Recipe {
  id: string;
  result: { type: BlockType; count: number };
  pattern: string[];
  legend: Record<string, BlockType>;
}

const recipes = recipesData as unknown as Recipe[];

const Crafting: React.FC<CraftingProps> = ({ onClose }) => {
  const { 
    craftingGrid, craftingCounts, 
    cursorItem, setCursorItem, addToInventory
  } = useGame();
  
  // Find matching recipe
  const craftResult = useMemo(() => {
    // Determine bounds of the items in the 2x2 grid
    let minRow = 2, maxRow = -1, minCol = 2, maxCol = -1;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        if (craftingGrid[r * 2 + c] !== null) {
          minRow = Math.min(minRow, r);
          maxRow = Math.max(maxRow, r);
          minCol = Math.min(minCol, c);
          maxCol = Math.max(maxCol, c);
        }
      }
    }
    
    if (minRow === 2) return null; // empty grid
    
    const gridRows = maxRow - minRow + 1;
    const gridCols = maxCol - minCol + 1;
    
    // Check recipes
    for (const recipe of recipes) {
      if (recipe.pattern.length === 0) continue;
      const patRows = recipe.pattern.length;
      const patCols = Math.max(...recipe.pattern.map(r => r.length));
      
      // Recipe must fit exactly in the bounding box of items
      if (patRows !== gridRows || patCols !== gridCols) continue;
      
      let matches = true;
      for (let r = 0; r < patRows; r++) {
        for (let c = 0; c < patCols; c++) {
          const patChar = recipe.pattern[r][c] || ' ';
          const reqType = patChar === ' ' ? null : recipe.legend[patChar];
          
          const gridItem = craftingGrid[(minRow + r) * 2 + (minCol + c)];
          if (gridItem !== reqType) {
            matches = false;
            break;
          }
        }
        if (!matches) break;
      }
      
      if (matches) return recipe;
    }
    return null;
  }, [craftingGrid, craftingCounts]);

  const handleCraftingSlotClick = (e: React.MouseEvent, slotIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const state = useGame.getState();
    const newGrid = [...state.craftingGrid];
    const newCounts = [...state.craftingCounts];
    let newCursor = state.cursorItem ? { ...state.cursorItem } : null;
    
    const slotType = newGrid[slotIndex];
    const slotCount = newCounts[slotIndex];
    const rightClick = e.type === 'contextmenu' || e.button === 2;
    
    if (newCursor) {
      if (slotType === null) {
        const placeCount = rightClick ? 1 : newCursor.count;
        newGrid[slotIndex] = newCursor.type;
        newCounts[slotIndex] = placeCount;
        newCursor.count -= placeCount;
        if (newCursor.count <= 0) newCursor = null;
      } else if (slotType === newCursor.type) {
        const maxStack = getBlockData(slotType)?.maxStack ?? 64;
        const space = maxStack - slotCount;
        if (space > 0) {
          const placeCount = rightClick ? 1 : Math.min(newCursor.count, space);
          newCounts[slotIndex] += placeCount;
          newCursor.count -= placeCount;
          if (newCursor.count <= 0) newCursor = null;
        }
      } else {
        if (!rightClick) {
          const tempType = slotType;
          const tempCount = slotCount;
          newGrid[slotIndex] = newCursor.type;
          newCounts[slotIndex] = newCursor.count;
          newCursor = { type: tempType, count: tempCount };
        }
      }
    } else {
      if (slotType !== null) {
        if (rightClick && slotCount > 1) {
          const takeCount = Math.floor(slotCount / 2);
          newCursor = { type: slotType, count: takeCount };
          newCounts[slotIndex] -= takeCount;
        } else {
          newCursor = { type: slotType, count: slotCount };
          newGrid[slotIndex] = null;
          newCounts[slotIndex] = 0;
        }
      }
    }
    
    useGame.setState({ craftingGrid: newGrid, craftingCounts: newCounts, cursorItem: newCursor });
  };

  const handleCraftButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!craftResult) return;
    
    const state = useGame.getState();
    const newGrid = [...state.craftingGrid];
    const newCounts = [...state.craftingCounts];
    let newCursor = state.cursorItem ? { ...state.cursorItem } : null;
    
    // Check if we can store the result in cursor
    if (newCursor !== null) {
      if (newCursor.type !== craftResult.result.type) return; // Cannot merge different items
      const maxStack = getBlockData(newCursor.type)?.maxStack ?? 64;
      if (newCursor.count + craftResult.result.count > maxStack) return; // Not enough space
    }
    
    // Consume ingredients
    for (let i = 0; i < 4; i++) {
      if (newGrid[i] !== null) {
        newCounts[i] -= 1;
        if (newCounts[i] <= 0) {
          newGrid[i] = null;
          newCounts[i] = 0;
        }
      }
    }
    
    // Produce output
    if (newCursor === null) {
      newCursor = { type: craftResult.result.type, count: craftResult.result.count };
    } else {
      newCursor.count += craftResult.result.count;
    }
    
    useGame.setState({ craftingGrid: newGrid, craftingCounts: newCounts, cursorItem: newCursor });
  };

  const renderSlot = (slotIndex: number) => {
    const blockType = craftingGrid[slotIndex];
    const count = craftingCounts[slotIndex];
    return (
      <div
        key={slotIndex}
        className="w-12 h-12 border-2 border-gray-500 bg-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600"
        onClick={(e) => handleCraftingSlotClick(e, slotIndex)}
        onContextMenu={(e) => handleCraftingSlotClick(e, slotIndex)}
      >
        {blockType !== null && <ItemIcon type={blockType} count={count} />}
      </div>
    );
  };

  const renderResultSlot = () => {
    if (!craftResult) return <div className="w-12 h-12 border-2 border-gray-500 bg-gray-700 opacity-50" />;
    return (
      <div
        className="w-12 h-12 border-2 border-yellow-400 bg-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600"
        onClick={handleCraftButtonClick}
      >
        <ItemIcon type={craftResult.result.type} count={craftResult.result.count} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-800 border-2 border-gray-400 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-bold">Crafting</h2>
          <button onClick={onClose} className="text-white hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div className="grid grid-cols-2 gap-1">
            {Array.from({ length: 4 }, (_, i) => renderSlot(i))}
          </div>
          <div className="text-white text-2xl">→</div>
          {renderResultSlot()}
        </div>

        <div className="border-t border-gray-600 pt-4">
          <h3 className="text-white font-bold mb-2 text-sm">2x2 Supported Recipes:</h3>
          <div className="text-gray-300 text-xs space-y-1 max-h-32 overflow-y-auto">
            {recipes.filter(r => r.pattern.length <= 2 && Math.max(...r.pattern.map(p => p.length)) <= 2).map((recipe, index) => (
              <div key={index} className="flex justify-between">
                <span>{getBlockData(recipe.result.type)?.name}</span>
                <span>({recipe.result.count}x)</span>
              </div>
            ))}
          </div>
          
          <h3 className="text-gray-500 font-bold mt-2 text-xs">Requires 3x3 Grid (Unsupported):</h3>
          <div className="text-gray-600 text-xs space-y-1 max-h-32 overflow-y-auto">
            {recipes.filter(r => r.pattern.length > 2 || Math.max(...r.pattern.map(p => p.length)) > 2).map((recipe, index) => (
              <div key={index} className="flex justify-between">
                <span>{getBlockData(recipe.result.type)?.name}</span>
                <span>({recipe.result.count}x)</span>
              </div>
            ))}
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
          Left/Right click to arrange items.<br/>
          Click result to craft.<br/>
          Press C or ESC to close.
        </div>
      </div>
    </div>
  );
};

export default Crafting;
