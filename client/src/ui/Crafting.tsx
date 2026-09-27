import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { BlockType, BLOCKS } from "../engine/blocks";
import { ItemStack, useGame } from "../lib/stores/useGame";
import recipes from "../data/recipes.json";

interface Recipe {
  id: string;
  name: string;
  result: ItemStack;
  ingredients: ItemStack[];
}

const Crafting: React.FC = () => {
  const inventory = useGame((state) => state.inventory);
  const inventoryCounts = useGame((state) => state.inventoryCounts);
  const craftRecipe = useGame((state) => state.craftRecipe);
  const setMenu = useGame((state) => state.setMenu);
  const [message, setMessage] = useState<string | null>(null);

  const available = useMemo(() => {
    const counts = new Map<BlockType, number>();
    inventory.forEach((item, index) => {
      if (item !== null) counts.set(item, (counts.get(item) ?? 0) + inventoryCounts[index]);
    });
    return counts;
  }, [inventory, inventoryCounts]);

  const canCraft = (recipe: Recipe) => recipe.ingredients.every(
    (ingredient) => (available.get(ingredient.type) ?? 0) >= ingredient.count,
  );

  const handleCraft = (recipe: Recipe) => {
    const crafted = craftRecipe(recipe.ingredients, recipe.result);
    setMessage(crafted ? `Crafted ${recipe.result.count} × ${BLOCKS[recipe.result.type].name}.` : "Not enough ingredients, or there is no room for the result.");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-gray-400 p-4 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-bold">Crafting</h2>
          <button onClick={() => setMenu("none")} className="text-white hover:text-gray-300" aria-label="Close crafting"><X size={20} /></button>
        </div>

        <div className="space-y-3">
          {(recipes as Recipe[]).map((recipe) => {
            const enabled = canCraft(recipe);
            return (
              <div key={recipe.id} className="rounded border border-gray-600 bg-gray-900/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold">{recipe.name}</div>
                    <div className="text-xs text-gray-300 mt-1">
                      {recipe.ingredients.map((ingredient) => `${ingredient.count} × ${BLOCKS[ingredient.type].name}`).join(" + ")}
                      {" → "}{recipe.result.count} × {BLOCKS[recipe.result.type].name}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => handleCraft(recipe)}
                    className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white"
                  >
                    Craft
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {message && <div className="mt-4 text-sm text-center text-gray-200">{message}</div>}
        <div className="mt-4 text-center text-gray-400 text-xs">Crafting consumes exact ingredient counts across all inventory slots.</div>
      </div>
    </div>
  );
};

export default Crafting;
