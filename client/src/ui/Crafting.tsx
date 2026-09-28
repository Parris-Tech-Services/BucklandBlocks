import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { BlockType, BLOCKS } from "../engine/blocks";
import { useGame } from "../lib/stores/useGame";
import recipes from "../data/recipes.json";

interface CraftingProps {
  onClose: () => void;
}

interface Recipe {
  id: string;
  name?: string;
  result: { type: BlockType; count: number };
  ingredients: Array<{ type: BlockType; count: number }>;
}

const Crafting: React.FC<CraftingProps> = ({ onClose }) => {
  const inventory = useGame((state) => state.inventory);
  const inventoryCounts = useGame((state) => state.inventoryCounts);
  const craftRecipe = useGame((state) => state.craftRecipe);
  const [status, setStatus] = useState("");

  const availableCounts = useMemo(() => {
    const counts = new Map<BlockType, number>();

    inventory.forEach((type, index) => {
      if (type === null || inventoryCounts[index] <= 0) return;
      counts.set(
        type,
        (counts.get(type) ?? 0) + inventoryCounts[index],
      );
    });

    return counts;
  }, [inventory, inventoryCounts]);

  const canCraft = (recipe: Recipe) =>
    recipe.ingredients.every(
      (ingredient) =>
        (availableCounts.get(ingredient.type) ?? 0) >=
        ingredient.count,
    );

  const handleCraft = (recipe: Recipe) => {
    const success = craftRecipe(recipe.ingredients, recipe.result);
    setStatus(
      success
        ? `Crafted ${recipe.result.count} × ${BLOCKS[recipe.result.type].name}.`
        : "Not enough ingredients or inventory space.",
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-lg rounded-lg border-2 border-gray-400 bg-gray-800 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Crafting</h2>
            <p className="text-xs text-gray-400">
              Recipes consume the exact ingredients from inventory in one transaction.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:text-gray-300"
            aria-label="Close crafting"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {(recipes as Recipe[]).map((recipe) => {
            const enabled = canCraft(recipe);

            return (
              <div
                key={recipe.id}
                className="rounded border border-gray-600 bg-gray-700 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">
                      {recipe.result.count} ×{" "}
                      {recipe.name ?? BLOCKS[recipe.result.type].name}
                    </div>
                    <div className="mt-1 text-xs text-gray-300">
                      {recipe.ingredients
                        .map(
                          (ingredient) =>
                            `${ingredient.count} × ${BLOCKS[ingredient.type].name}`,
                        )
                        .join(" + ")}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => handleCraft(recipe)}
                    className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400"
                  >
                    Craft
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {status && (
          <div className="mt-3 text-center text-sm text-cyan-200">
            {status}
          </div>
        )}

        <div className="mt-4 text-center text-xs text-gray-400">
          Press C or ESC to close
        </div>
      </div>
    </div>
  );
};

export default Crafting;
