import React, { useState } from "react";
import { X } from "lucide-react";
import { BlockType, BLOCKS } from "../engine/blocks";
import { useGame } from "../lib/stores/useGame";

interface InventoryProps {
  onClose: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ onClose }) => {
  const inventory = useGame((state) => state.inventory);
  const inventoryCounts = useGame((state) => state.inventoryCounts);
  const moveInventoryItem = useGame((state) => state.moveInventoryItem);
  const [selectedSource, setSelectedSource] = useState<number | null>(null);

  const handleSlotClick = (slotIndex: number) => {
    if (selectedSource === null) {
      if (inventory[slotIndex] !== null && inventoryCounts[slotIndex] > 0) {
        setSelectedSource(slotIndex);
      }
      return;
    }

    if (selectedSource === slotIndex) {
      setSelectedSource(null);
      return;
    }

    moveInventoryItem(selectedSource, slotIndex);
    setSelectedSource(null);
  };

  const renderSlot = (slotIndex: number, isHotbar = false) => {
    const blockType = inventory[slotIndex];
    const count = inventoryCounts[slotIndex];
    const isSelected = selectedSource === slotIndex;

    return (
      <button
        key={slotIndex}
        type="button"
        aria-label={blockType === null ? `Empty slot ${slotIndex + 1}` : BLOCKS[blockType].name}
        className={`relative flex aspect-square min-w-0 flex-col items-center justify-center border-2 bg-gray-700 text-white hover:bg-gray-600 ${
          isHotbar ? "border-yellow-400" : "border-gray-400"
        } ${isSelected ? "ring-2 ring-cyan-300" : ""}`}
        onClick={() => handleSlotClick(slotIndex)}
      >
        {blockType !== null && blockType !== BlockType.AIR && (
          <>
            <div className="text-[7px] font-bold sm:text-[8px]">
              {BLOCKS[blockType].name.slice(0, 4)}
            </div>
            {count > 0 && <div className="text-[9px] sm:text-[10px]">{count}</div>}
          </>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-[520px] rounded-lg border-2 border-gray-400 bg-gray-800 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Inventory</h2>
            <p className="text-xs text-gray-400">Select an item, then select its destination slot.</p>
          </div>
          <button onClick={onClose} className="p-2 text-white hover:text-gray-300" aria-label="Close inventory">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-9 gap-1">
          {Array.from({ length: 27 }, (_, index) => renderSlot(index + 9))}
        </div>

        <div className="border-t border-gray-600 pt-3">
          <div className="grid grid-cols-9 gap-1">
            {Array.from({ length: 9 }, (_, index) => renderSlot(index, true))}
          </div>
        </div>

        <div className="mt-3 text-center text-xs text-gray-400">Press E or ESC to close</div>
      </div>
    </div>
  );
};

export default Inventory;
