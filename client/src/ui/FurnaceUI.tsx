import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { BlockType, getBlockData } from '../engine/blocks';
import { useGame } from '../lib/stores/useGame';
import { useSession } from '../engine/session';

const FurnaceUI: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentEntityId } = useSession();
  const { blockEntities, cursorItem, setBlockEntity } = useGame();
  const entity = currentEntityId ? blockEntities[currentEntityId] : null;

  // Simple tick loop for furnace smelting
  useEffect(() => {
    if (!currentEntityId) return;
    const interval = setInterval(() => {
      const state = useGame.getState();
      const ent = state.blockEntities[currentEntityId];
      if (!ent) return;
      
      const [input, fuel, output] = ent.inventory;
      const [inCount, fuelCount, outCount] = ent.counts;
      
      // Basic smelting recipe: Sand -> Glass, Wood -> Wood Plank
      let canSmelt = false;
      let resultType = null;
      if (input === BlockType.SAND) resultType = BlockType.GLASS;
      else if (input === BlockType.WOOD_LOG) resultType = BlockType.WOOD_PLANK;
      else if (input === BlockType.COBBLESTONE) resultType = BlockType.STONE;
      
      if (resultType !== null && fuel === BlockType.WOOD_PLANK && fuelCount > 0) {
        if (output === null || (output === resultType && outCount < 64)) {
          canSmelt = true;
        }
      }
      
      if (canSmelt) {
        let newProgress = ent.progress + 10;
        if (newProgress >= 100) {
          newProgress = 0;
          const newInv = [...ent.inventory];
          const newCounts = [...ent.counts];
          // Consume input
          newCounts[0]--;
          if (newCounts[0] <= 0) newInv[0] = null;
          // Consume fuel (chance based or 1 per smelt)
          newCounts[1]--;
          if (newCounts[1] <= 0) newInv[1] = null;
          // Add output
          newInv[2] = resultType;
          newCounts[2]++;
          
          state.setBlockEntity(currentEntityId, { ...ent, progress: newProgress, inventory: newInv, counts: newCounts });
        } else {
          state.setBlockEntity(currentEntityId, { ...ent, progress: newProgress });
        }
      } else {
        if (ent.progress > 0) {
          state.setBlockEntity(currentEntityId, { ...ent, progress: 0 });
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [currentEntityId]);

  if (!entity) return null;

  const handleSlotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const state = useGame.getState();
    let newCursor = state.cursorItem ? { ...state.cursorItem } : null;
    const newInv = [...entity.inventory];
    const newCounts = [...entity.counts];
    const slotType = newInv[index];
    
    if (newCursor) {
      if (slotType === null) {
        newInv[index] = newCursor.type;
        newCounts[index] = 1;
        newCursor.count--;
        if (newCursor.count <= 0) newCursor = null;
      } else if (slotType === newCursor.type) {
        newCounts[index]++;
        newCursor.count--;
        if (newCursor.count <= 0) newCursor = null;
      }
    } else if (slotType !== null) {
      newCursor = { type: slotType, count: newCounts[index] };
      newInv[index] = null;
      newCounts[index] = 0;
    }
    
    setBlockEntity(entity.id, { ...entity, inventory: newInv, counts: newCounts });
    useGame.setState({ cursorItem: newCursor });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border-2 border-gray-400 p-6 rounded-lg w-96 relative">
        <div className="flex justify-between items-center mb-6 border-b border-gray-600 pb-2">
          <h2 className="text-xl font-bold text-white">Furnace</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex justify-between items-center px-4">
          <div className="flex flex-col space-y-4">
            <div onMouseDown={(e) => handleSlotClick(e, 0)} className="w-12 h-12 bg-gray-700 border-2 border-gray-500 rounded relative cursor-pointer">
              {entity.inventory[0] !== null && <img src={getBlockData(entity.inventory[0])?.texture} className="w-full h-full p-1 pixelated" />}
              {entity.counts[0] > 1 && <span className="absolute bottom-0 right-1 text-white text-xs">{entity.counts[0]}</span>}
            </div>
            <div onMouseDown={(e) => handleSlotClick(e, 1)} className="w-12 h-12 bg-gray-700 border-2 border-gray-500 rounded relative cursor-pointer flex items-center justify-center text-xs text-orange-500">
              {entity.inventory[1] !== null ? <img src={getBlockData(entity.inventory[1])?.texture} className="w-full h-full p-1 pixelated" /> : "FUEL"}
              {entity.counts[1] > 1 && <span className="absolute bottom-0 right-1 text-white text-xs">{entity.counts[1]}</span>}
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-16 h-2 bg-gray-900 rounded overflow-hidden">
              <div className="h-full bg-white transition-all duration-500" style={{ width: `${entity.progress}%` }} />
            </div>
          </div>
          
          <div onMouseDown={(e) => handleSlotClick(e, 2)} className="w-16 h-16 bg-gray-700 border-2 border-gray-500 rounded relative cursor-pointer">
            {entity.inventory[2] !== null && <img src={getBlockData(entity.inventory[2])?.texture} className="w-full h-full p-2 pixelated" />}
            {entity.counts[2] > 1 && <span className="absolute bottom-0 right-1 text-white text-sm">{entity.counts[2]}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
export default FurnaceUI;
